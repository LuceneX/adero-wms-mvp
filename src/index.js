const APP_HTML = "__APP_HTML__";
const SESSION_COOKIE = "adero_session";
const SESSION_DAYS = 14;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=UTF-8", ...headers } });
const html = () => new Response(APP_HTML, { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-cache" } });
const base64url = bytes => { let binary = ""; for (const byte of bytes) binary += String.fromCharCode(byte); return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const fromBase64url = value => { const normalized = value.replace(/-/g, "+").replace(/_/g, "/"); return Uint8Array.from(atob(normalized + "=".repeat((4 - normalized.length % 4) % 4)), char => char.charCodeAt(0)); };
const randomToken = length => base64url(crypto.getRandomValues(new Uint8Array(length)));
const digest = async value => base64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
const passwordHash = async (password, salt) => base64url(new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2", salt:fromBase64url(salt), iterations:100000, hash:"SHA-256"}, await crypto.subtle.importKey("raw", new TextEncoder().encode(password), {name:"PBKDF2"}, false, ["deriveBits"]), 256)));
const same = (left, right) => { if (left.length !== right.length) return false; let result = 0; for (let i = 0; i < left.length; i++) result |= left.charCodeAt(i) ^ right.charCodeAt(i); return result === 0; };
const cookie = request => Object.fromEntries((request.headers.get("Cookie") || "").split(";").map(part => part.trim().split("=")).filter(part => part.length === 2));
const sessionCookie = token => `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
const clearCookie = `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
const body = async request => { try { return await request.json(); } catch { return {}; } };
const id = prefix => `${prefix}-${crypto.randomUUID()}`;

async function currentUser(request, env) {
  const token = cookie(request)[SESSION_COOKIE];
  if (!token) return null;
  return env.DB.prepare(`SELECT users.id, users.email, users.name, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at > datetime('now')`).bind(await digest(token)).first();
}
async function requireUser(request, env) { const user = await currentUser(request, env); if (!user) throw new Response(JSON.stringify({error:"Sign in required"}), {status:401, headers:{"content-type":"application/json"}}); return user; }
async function activity(env, icon, text, userId = null) { await env.DB.prepare(`INSERT INTO activities (id,icon,text,relative_time,user_id) VALUES (?,?,?,?,?)`).bind(id("act"), icon, text, "Just now", userId).run(); }
async function dashboard(env) {
  const [arrivals, inventory, orders, activities, counts] = await Promise.all([
    env.DB.prepare(`SELECT id,ref,party,goods,expected,status FROM arrivals ORDER BY created_at DESC`).all(),
    env.DB.prepare(`SELECT id,sku,lot,location,storage_class,quantity,status FROM inventory_items ORDER BY created_at DESC`).all(),
    env.DB.prepare(`SELECT id,order_no,destination,lines,due,status FROM orders ORDER BY created_at DESC`).all(),
    env.DB.prepare(`SELECT icon,text,relative_time FROM activities ORDER BY created_at DESC LIMIT 8`).all(),
    env.DB.prepare(`SELECT (SELECT COALESCE(SUM(quantity),0) FROM inventory_items) AS units, (SELECT COUNT(*) FROM arrivals WHERE status != 'Received') AS arrivals, (SELECT COUNT(*) FROM orders WHERE status NOT IN ('Dispatched','Complete')) AS orders, (SELECT COUNT(*) FROM inventory_items WHERE status != 'Available') AS exceptions`).first()
  ]);
  return {arrivals:arrivals.results, inventory:inventory.results, orders:orders.results, activities:activities.results, counts};
}

async function api(request, env, url) {
  if (url.pathname === "/api/health") return json({ok:true, service:"adero-wms-mvp", database:"d1"});
  if (url.pathname === "/api/session" && request.method === "GET") return json({user:await currentUser(request, env)});
  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    const input = await body(request); const email = String(input.email || "").trim().toLowerCase(); const name = String(input.name || "").trim(); const password = String(input.password || "");
    if (!email.includes("@") || !name || password.length < 8) return json({error:"Enter a name, valid email, and password of at least 8 characters."}, 400);
    const salt = randomToken(16); const hash = await passwordHash(password, salt); const userId = id("usr");
    try { await env.DB.prepare(`INSERT INTO users (id,email,name,password_hash,password_salt) VALUES (?,?,?,?,?)`).bind(userId,email,name,hash,salt).run(); } catch { return json({error:"That email is already registered."}, 409); }
    const token = randomToken(32); await env.DB.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+14 days'))`).bind(await digest(token), userId).run();
    return json({user:{id:userId,email,name,role:"operator"}}, 201, {"set-cookie":sessionCookie(token)});
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const input = await body(request); const email = String(input.email || "").trim().toLowerCase(); const password = String(input.password || ""); const user = await env.DB.prepare(`SELECT * FROM users WHERE email=?`).bind(email).first();
    if (!user || !same(await passwordHash(password, user.password_salt), user.password_hash)) return json({error:"Email or password is incorrect."}, 401);
    const token = randomToken(32); await env.DB.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+14 days'))`).bind(await digest(token), user.id).run();
    return json({user:{id:user.id,email:user.email,name:user.name,role:user.role}}, 200, {"set-cookie":sessionCookie(token)});
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") { const token = cookie(request)[SESSION_COOKIE]; if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(await digest(token)).run(); return json({ok:true}, 200, {"set-cookie":clearCookie}); }
  const user = await requireUser(request, env);
  if (url.pathname === "/api/dashboard" && request.method === "GET") return json(await dashboard(env));
  if (url.pathname === "/api/arrivals" && request.method === "POST") {
    const input = await body(request); const ref = String(input.ref || "").trim(); const party = String(input.party || "").trim(); const goodsClass = String(input.goodsClass || "Ambient"); const units = Number(input.units || 0);
    if (!ref || !party || !Number.isFinite(units) || units <= 0) return json({error:"Reference, party, and a positive unit count are required."}, 400);
    const arrivalId = id("arr"); try { await env.DB.prepare(`INSERT INTO arrivals (id,ref,party,goods,expected,status,created_by) VALUES (?,?,?,?,?,?,?)`).bind(arrivalId,ref,party,`${goodsClass} cargo`,`${units.toLocaleString()} units`,"Received",user.id).run(); } catch { return json({error:"That arrival reference already exists."}, 409); }
    await activity(env, "↘", `Arrival ${ref} recorded by ${user.name}`, user.id); return json({ok:true,id:arrivalId}, 201);
  }
  const putaway = url.pathname.match(/^\/api\/arrivals\/([^/]+)\/putaway$/);
  if (putaway && request.method === "POST") { const item = await env.DB.prepare(`SELECT ref FROM arrivals WHERE id=?`).bind(putaway[1]).first(); if (!item) return json({error:"Arrival not found"},404); await env.DB.prepare(`UPDATE arrivals SET status='Put away complete' WHERE id=?`).bind(putaway[1]).run(); await activity(env,"⌖",`Put-away completed for ${item.ref}`,user.id); return json({ok:true}); }
  const pick = url.pathname.match(/^\/api\/orders\/([^/]+)\/start$/);
  if (pick && request.method === "POST") { const item = await env.DB.prepare(`SELECT order_no FROM orders WHERE id=?`).bind(pick[1]).first(); if (!item) return json({error:"Order not found"},404); await env.DB.prepare(`UPDATE orders SET status='Picking' WHERE id=? AND status='Ready to pick'`).bind(pick[1]).run(); await activity(env,"↗",`Pick wave started for ${item.order_no}`,user.id); return json({ok:true}); }
  return json({error:"Not found"},404);
}

export default { async fetch(request, env) { const url = new URL(request.url); if (url.pathname.startsWith("/api/")) { try { return await api(request, env, url); } catch (error) { if (error instanceof Response) return error; return json({error:"Unexpected application error"}, 500); } } return html(); } };
