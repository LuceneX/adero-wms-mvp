const APP_HTML = "__APP_HTML__";
const ADMIN_HTML = "__ADMIN_HTML__";
const SESSION_COOKIE = "adero_session";
const ACTIVE_WAREHOUSE_COOKIE = "wms_warehouse";
const SESSION_DAYS = 14;

const json = (value, status = 200, headers = {}) => new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json; charset=UTF-8", ...headers } });
const scannerError = (code, message, status = 400, details = {}) => json({ok:false, error:{code, message, details}}, status);
const html = request => new Response(new URL(request.url).pathname.startsWith('/admin') ? ADMIN_HTML : APP_HTML, { headers: { "content-type": "text/html; charset=UTF-8", "cache-control": "no-cache" } });
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
  const user = await env.DB.prepare(`SELECT users.id, users.email, users.name, users.role FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token_hash=? AND sessions.expires_at > datetime('now') LIMIT 1`).bind(await digest(token)).first();
  if (!user) return null;
  const memberships = await env.DB.prepare(`SELECT company_id, warehouse_id, role, status FROM warehouse_memberships WHERE user_id=? AND status='active' ORDER BY created_at`).bind(user.id).all();
  const selected = memberships.results.find(item => item.warehouse_id === cookie(request)[ACTIVE_WAREHOUSE_COOKIE]) || memberships.results[0];
  return selected ? {...user, role:selected.role, company_id:selected.company_id, warehouse_id:selected.warehouse_id} : null;
}
async function requireUser(request, env) { const user = await currentUser(request, env); if (!user) throw new Response(JSON.stringify({error:"Sign in required"}), {status:401, headers:{"content-type":"application/json"}}); return user; }
async function requireAdmin(request, env) { const user = await requireUser(request, env); if (user.role !== 'admin') throw new Response(JSON.stringify({ok:false,error:{code:'PERMISSION_DENIED',message:'Administrator permission required.',details:{requiredRole:'admin'}}}), {status:403, headers:{"content-type":"application/json"}}); return user; }
async function activity(env, icon, text, userId = null, companyId = "co-lucenex-demo", warehouseId = "wh-lucenex-demo") { await env.DB.prepare(`INSERT INTO activities (id,icon,text,relative_time,user_id,company_id,warehouse_id) VALUES (?,?,?,?,?,?,?)`).bind(id("act"), icon, text, "Just now", userId, companyId, warehouseId).run(); }
async function dashboard(env, user) {
  const [arrivals, inventory, orders, activities, counts] = await Promise.all([
    env.DB.prepare(`SELECT id,ref,party,goods,expected,status FROM arrivals WHERE company_id=? AND warehouse_id=? ORDER BY created_at DESC`).bind(user.company_id,user.warehouse_id).all(),
    env.DB.prepare(`SELECT id,sku,barcode,lot,location,storage_class,quantity,status FROM inventory_items WHERE company_id=? AND warehouse_id=? ORDER BY created_at DESC`).bind(user.company_id,user.warehouse_id).all(),
    env.DB.prepare(`SELECT id,order_no,destination,lines,due,status FROM orders WHERE company_id=? AND warehouse_id=? ORDER BY created_at DESC`).bind(user.company_id,user.warehouse_id).all(),
    env.DB.prepare(`SELECT icon,text,relative_time FROM activities WHERE company_id=? AND warehouse_id=? ORDER BY created_at DESC LIMIT 8`).bind(user.company_id,user.warehouse_id).all(),
    env.DB.prepare(`SELECT (SELECT COALESCE(SUM(quantity),0) FROM inventory_items WHERE company_id=? AND warehouse_id=?) AS units, (SELECT COUNT(*) FROM arrivals WHERE company_id=? AND warehouse_id=? AND status != 'Received') AS arrivals, (SELECT COUNT(*) FROM orders WHERE company_id=? AND warehouse_id=? AND status NOT IN ('Dispatched','Complete')) AS orders, (SELECT COUNT(*) FROM inventory_items WHERE company_id=? AND warehouse_id=? AND status != 'Available') AS exceptions`).bind(user.company_id,user.warehouse_id,user.company_id,user.warehouse_id,user.company_id,user.warehouse_id,user.company_id,user.warehouse_id).first()
  ]);
  return {arrivals:arrivals.results, inventory:inventory.results, orders:orders.results, activities:activities.results, counts};
}

async function api(request, env, url) {
  if (url.pathname === "/api/health") return json({ok:true, service:"lucenex-warehouse-flow", database:"d1"});
  if (url.pathname === "/api/session" && request.method === "GET") return json({user:await currentUser(request, env)});
  if (url.pathname === "/api/auth/register" && request.method === "POST") {
    const input = await body(request); const email = String(input.email || "").trim().toLowerCase(); const name = String(input.name || "").trim(); const password = String(input.password || "");
    if (!email.includes("@") || !name || password.length < 8) return json({error:"Enter a name, valid email, and password of at least 8 characters."}, 400);
    const salt = randomToken(16); const hash = await passwordHash(password, salt); const userId = id("usr"); const assignedRole = email === "ernests@lucenex.lv" ? "admin" : "operator";
    try { await env.DB.prepare(`INSERT INTO users (id,email,name,password_hash,password_salt,role) VALUES (?,?,?,?,?,?)`).bind(userId,email,name,hash,salt,assignedRole).run(); await env.DB.prepare(`INSERT INTO warehouse_memberships (user_id,company_id,warehouse_id,role) VALUES (?,?,?,?)`).bind(userId,"co-lucenex-demo","wh-lucenex-demo",assignedRole).run(); } catch { return json({error:"That email is already registered."}, 409); }
    const token = randomToken(32); await env.DB.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+14 days'))`).bind(await digest(token), userId).run();
    return json({user:{id:userId,email,name,role:assignedRole}}, 201, {"set-cookie":sessionCookie(token)});
  }
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const input = await body(request); const email = String(input.email || "").trim().toLowerCase(); const password = String(input.password || ""); const user = await env.DB.prepare(`SELECT * FROM users WHERE email=?`).bind(email).first();
    if (!user || !same(await passwordHash(password, user.password_salt), user.password_hash)) return json({error:"Email or password is incorrect."}, 401);
    const token = randomToken(32); await env.DB.prepare(`INSERT INTO sessions (token_hash,user_id,expires_at) VALUES (?,?,datetime('now','+14 days'))`).bind(await digest(token), user.id).run();
    return json({user:{id:user.id,email:user.email,name:user.name,role:user.role}}, 200, {"set-cookie":sessionCookie(token)});
  }
  if (url.pathname === "/api/auth/logout" && request.method === "POST") { const token = cookie(request)[SESSION_COOKIE]; if (token) await env.DB.prepare(`DELETE FROM sessions WHERE token_hash=?`).bind(await digest(token)).run(); return json({ok:true}, 200, {"set-cookie":clearCookie}); }
  const user = await requireUser(request, env);
  if (url.pathname === "/api/dashboard" && request.method === "GET") return json(await dashboard(env, user));
  if (url.pathname === "/api/admin/overview" && request.method === "GET") {
    await requireAdmin(request, env);
    const [company, warehouses, users] = await Promise.all([
      env.DB.prepare(`SELECT id,name,created_at FROM companies WHERE id=?`).bind(user.company_id).first(),
      env.DB.prepare(`SELECT id,code,name,created_at FROM warehouses WHERE company_id=? ORDER BY created_at`).bind(user.company_id).all(),
      env.DB.prepare(`SELECT users.id,users.email,users.name,users.role,warehouse_memberships.warehouse_id,warehouse_memberships.role AS membership_role,warehouse_memberships.status FROM users JOIN warehouse_memberships ON warehouse_memberships.user_id=users.id WHERE warehouse_memberships.company_id=? ORDER BY users.name`).bind(user.company_id).all()
    ]);
    return json({company,warehouses:warehouses.results,users:users.results,activeWarehouseId:user.warehouse_id});
  }
  if (url.pathname === "/api/admin/companies" && request.method === "POST") {
    const admin = await requireAdmin(request, env); const input = await body(request); const name = String(input.name || '').trim();
    if (!name) return scannerError('COMPANY_NAME_REQUIRED','Company name is required.',400,{field:'name'});
    const companyId=id('co'), warehouseId=id('wh');
    await env.DB.prepare(`INSERT INTO companies (id,name) VALUES (?,?)`).bind(companyId,name).run();
    await env.DB.prepare(`INSERT INTO warehouses (id,company_id,code,name) VALUES (?,?,?,?)`).bind(warehouseId,companyId,'MAIN','Main warehouse').run();
    await env.DB.prepare(`INSERT INTO warehouse_memberships (user_id,company_id,warehouse_id,role) VALUES (?,?,?,?)`).bind(admin.id,companyId,warehouseId,'admin').run();
    return json({ok:true,code:'COMPANY_CREATED',company:{id:companyId,name},warehouse:{id:warehouseId,code:'MAIN',name:'Main warehouse'}},201);
  }
  if (url.pathname === "/api/admin/warehouses" && request.method === "POST") {
    const admin = await requireAdmin(request, env); const input = await body(request); const code = String(input.code || '').trim().toUpperCase(); const name = String(input.name || '').trim();
    if (!code || !name) return scannerError('WAREHOUSE_FIELDS_REQUIRED','Warehouse code and name are required.',400,{fields:['code','name']});
    try { const warehouseId=id('wh'); await env.DB.prepare(`INSERT INTO warehouses (id,company_id,code,name) VALUES (?,?,?,?)`).bind(warehouseId,admin.company_id,code,name).run(); return json({ok:true,code:'WAREHOUSE_CREATED',warehouse:{id:warehouseId,code,name}},201); } catch { return scannerError('WAREHOUSE_CODE_EXISTS','That warehouse code already exists for this company.',409,{code}); }
  }
  if (url.pathname === "/api/admin/memberships" && request.method === "POST") {
    const admin = await requireAdmin(request, env); const input = await body(request); const email = String(input.email || '').trim().toLowerCase(); const warehouseId = String(input.warehouse_id || '').trim(); const role = String(input.role || 'operator').trim();
    if (!email || !warehouseId || !['admin','manager','supervisor','forklift','operator'].includes(role)) return scannerError('MEMBERSHIP_FIELDS_INVALID','Email, warehouse, and a valid role are required.',400);
    const target = await env.DB.prepare(`SELECT id,name,email FROM users WHERE email=?`).bind(email).first(); const warehouse = await env.DB.prepare(`SELECT id FROM warehouses WHERE id=? AND company_id=?`).bind(warehouseId,admin.company_id).first();
    if (!target) return scannerError('USER_NOT_FOUND','The user must register before they can be assigned.',404,{email});
    if (!warehouse) return scannerError('WAREHOUSE_NOT_FOUND','Warehouse not found in your company.',404,{warehouseId});
    await env.DB.prepare(`INSERT INTO warehouse_memberships (user_id,company_id,warehouse_id,role,status) VALUES (?,?,?,?,?) ON CONFLICT(user_id,warehouse_id) DO UPDATE SET role=excluded.role,status='active'`).bind(target.id,admin.company_id,warehouseId,role,'active').run();
    return json({ok:true,code:'MEMBERSHIP_SAVED',message:'User membership saved.'});
  }
  const membership = url.pathname.match(/^\/api\/admin\/memberships\/([^/]+)\/([^/]+)$/);
  if (membership && request.method === 'PATCH') {
    const admin = await requireAdmin(request, env); const input = await body(request); const role = input.role === undefined ? null : String(input.role); const status = input.status === undefined ? null : String(input.status); if (role && !['admin','manager','supervisor','forklift','operator'].includes(role)) return scannerError('ROLE_INVALID','Unsupported role.',400); if (status && !['active','disabled'].includes(status)) return scannerError('MEMBERSHIP_STATUS_INVALID','Unsupported membership status.',400);
    const result = await env.DB.prepare(`UPDATE warehouse_memberships SET role=COALESCE(?,role),status=COALESCE(?,status) WHERE user_id=? AND warehouse_id=? AND company_id=?`).bind(role,status,membership[1],membership[2],admin.company_id).run(); if (!result.meta?.changes) return scannerError('MEMBERSHIP_NOT_FOUND','Membership not found.',404); return json({ok:true,code:'MEMBERSHIP_UPDATED'});
  }
  if (url.pathname === "/api/admin/switch-warehouse" && request.method === 'POST') {
    const admin = await requireAdmin(request, env); const input = await body(request); const warehouseId=String(input.warehouse_id || ''); const allowed=await env.DB.prepare(`SELECT warehouse_id FROM warehouse_memberships WHERE user_id=? AND warehouse_id=? AND status='active'`).bind(admin.id,warehouseId).first(); if (!allowed) return scannerError('WAREHOUSE_ACCESS_DENIED','You are not assigned to that warehouse.',403,{warehouseId}); return json({ok:true,code:'WAREHOUSE_SWITCHED'},200,{"set-cookie":`${ACTIVE_WAREHOUSE_COOKIE}=${warehouseId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`});
  }
  if (url.pathname === "/api/scans" && request.method === "POST") {
    const input = await body(request);
    const barcode = String(input.barcode || "").trim();
    const mode = String(input.mode || "lookup").trim().toLowerCase();
    const allowedModes = new Set(["lookup", "receive", "putaway", "pick", "count"]);
    if (!barcode) return scannerError("BARCODE_REQUIRED", "Scan or enter a barcode before submitting.", 400, {field:"barcode"});
    if (!allowedModes.has(mode)) return scannerError("SCAN_MODE_INVALID", "Choose a valid scanner action.", 400, {allowed:[...allowedModes]});
    const item = await env.DB.prepare(`SELECT id,sku,barcode,lot,location,storage_class,quantity,status FROM inventory_items WHERE company_id=? AND warehouse_id=? AND (barcode=? OR sku=?) LIMIT 1`).bind(user.company_id,user.warehouse_id,barcode, barcode).first();
    if (!item) {
      await env.DB.prepare(`INSERT INTO scanner_events (id,barcode,mode,outcome,message,user_id,company_id,warehouse_id) VALUES (?,?,?,?,?,?,?,?)`).bind(id("scan"),barcode,mode,"rejected","Barcode was not found in inventory",user.id,user.company_id,user.warehouse_id).run();
      return scannerError("BARCODE_NOT_FOUND", "No inventory item matches this barcode.", 404, {barcode, mode});
    }
    const messages = {lookup:"Item verified.",receive:"Item accepted for receiving review.",putaway:"Item accepted for put-away review.",pick:"Item accepted for picking review.",count:"Item counted for cycle-count review."};
    await env.DB.prepare(`INSERT INTO scanner_events (id,barcode,mode,outcome,message,user_id,item_id,company_id,warehouse_id) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id("scan"),barcode,mode,"accepted",messages[mode],user.id,item.id,user.company_id,user.warehouse_id).run();
    await activity(env,"⌁",`Barcode ${barcode} scanned for ${mode}`,user.id,user.company_id,user.warehouse_id);
    return json({ok:true, code:"SCAN_ACCEPTED", message:messages[mode], item, mode}, 200);
  }
  if (url.pathname === "/api/arrivals" && request.method === "POST") {
    const input = await body(request); const ref = String(input.ref || "").trim(); const party = String(input.party || "").trim(); const goodsClass = String(input.goodsClass || "Ambient"); const units = Number(input.units || 0);
    if (!ref || !party || !Number.isFinite(units) || units <= 0) return json({error:"Reference, party, and a positive unit count are required."}, 400);
    const arrivalId = id("arr"); try { await env.DB.prepare(`INSERT INTO arrivals (id,ref,party,goods,expected,status,created_by,company_id,warehouse_id) VALUES (?,?,?,?,?,?,?,?,?)`).bind(arrivalId,ref,party,`${goodsClass} cargo`,`${units.toLocaleString()} units`,"Received",user.id,user.company_id,user.warehouse_id).run(); } catch { return json({error:"That arrival reference already exists."}, 409); }
    await activity(env, "↘", `Arrival ${ref} recorded by ${user.name}`, user.id,user.company_id,user.warehouse_id); return json({ok:true,id:arrivalId}, 201);
  }
  const putaway = url.pathname.match(/^\/api\/arrivals\/([^/]+)\/putaway$/);
  if (putaway && request.method === "POST") { const item = await env.DB.prepare(`SELECT ref FROM arrivals WHERE id=? AND company_id=? AND warehouse_id=?`).bind(putaway[1],user.company_id,user.warehouse_id).first(); if (!item) return json({error:"Arrival not found"},404); await env.DB.prepare(`UPDATE arrivals SET status='Put away complete' WHERE id=? AND company_id=? AND warehouse_id=?`).bind(putaway[1],user.company_id,user.warehouse_id).run(); await activity(env,"⌖",`Put-away completed for ${item.ref}`,user.id,user.company_id,user.warehouse_id); return json({ok:true}); }
  const pick = url.pathname.match(/^\/api\/orders\/([^/]+)\/start$/);
  if (pick && request.method === "POST") { const item = await env.DB.prepare(`SELECT order_no FROM orders WHERE id=? AND company_id=? AND warehouse_id=?`).bind(pick[1],user.company_id,user.warehouse_id).first(); if (!item) return json({error:"Order not found"},404); await env.DB.prepare(`UPDATE orders SET status='Picking' WHERE id=? AND company_id=? AND warehouse_id=? AND status='Ready to pick'`).bind(pick[1],user.company_id,user.warehouse_id).run(); await activity(env,"↗",`Pick wave started for ${item.order_no}`,user.id,user.company_id,user.warehouse_id); return json({ok:true}); }
  const adjust = url.pathname.match(/^\/api\/inventory\/([^/]+)\/adjust$/);
  if (adjust && request.method === "POST") {
    if (!['admin','manager','supervisor','forklift'].includes(user.role)) return scannerError("PERMISSION_DENIED", "You do not have permission to adjust inventory.", 403, {requiredRoles:['admin','manager','supervisor','forklift']});
    const input = await body(request); const delta = Number(input.delta || 0); const nextStatus = input.status === undefined ? null : String(input.status).trim(); const nextLocation = input.location === undefined ? null : String(input.location).trim(); const reason = String(input.reason || '').trim();
    if (!Number.isInteger(delta) || delta === 0 || !reason) return scannerError("INVENTORY_ADJUSTMENT_INVALID", "Provide a non-zero whole-unit adjustment and a reason.", 400, {fields:['delta','reason']});
    const item = await env.DB.prepare(`SELECT id,sku,quantity,status,location FROM inventory_items WHERE (id=? OR sku=?) AND company_id=? AND warehouse_id=?`).bind(adjust[1],adjust[1],user.company_id,user.warehouse_id).first();
    if (!item) return scannerError("INVENTORY_ITEM_NOT_FOUND", "Inventory item not found in your warehouse.", 404, {itemId:adjust[1]});
    const nextQuantity = item.quantity + delta; if (nextQuantity < 0) return scannerError("INSUFFICIENT_STOCK", "The adjustment would make inventory negative.", 409, {available:item.quantity, requested:delta});
    const finalStatus = nextStatus || item.status; const finalLocation = nextLocation || item.location;
    await env.DB.prepare(`UPDATE inventory_items SET quantity=?,status=?,location=? WHERE id=? AND company_id=? AND warehouse_id=?`).bind(nextQuantity,finalStatus,finalLocation,item.id,user.company_id,user.warehouse_id).run();
    await env.DB.prepare(`INSERT INTO inventory_movements (id,company_id,warehouse_id,inventory_item_id,movement_type,quantity_delta,quantity_before,quantity_after,status_before,status_after,location_before,location_after,reason,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).bind(id('mov'),user.company_id,user.warehouse_id,item.id,'manual_adjustment',delta,item.quantity,nextQuantity,item.status,finalStatus,item.location,finalLocation,reason,user.id).run();
    await env.DB.prepare(`INSERT INTO audit_events (id,company_id,warehouse_id,entity_type,entity_id,action,before_json,after_json,created_by) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id('audit'),user.company_id,user.warehouse_id,'inventory_item',item.id,'adjustment',JSON.stringify(item),JSON.stringify({...item,quantity:nextQuantity,status:finalStatus,location:finalLocation}),user.id).run();
    await activity(env,'⇄',`Inventory ${item.sku} adjusted by ${delta} unit(s)`,user.id,user.company_id,user.warehouse_id);
    return json({ok:true,code:'INVENTORY_ADJUSTED',message:'Inventory adjustment recorded.',item:{...item,quantity:nextQuantity,status:finalStatus,location:finalLocation}});
  }
  return json({error:"Not found"},404);
}

export default { async fetch(request, env) { const url = new URL(request.url); if (url.pathname.startsWith("/api/")) { try { return await api(request, env, url); } catch (error) { if (error instanceof Response) return error; return json({error:"Unexpected application error"}, 500); } } return html(request); } };
