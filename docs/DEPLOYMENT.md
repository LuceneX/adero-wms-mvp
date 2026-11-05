# Deployment handoff

## Current public deployment

- URL: https://adero-wms-mvp.smalikisernests.workers.dev/
- Cloudflare Worker: `adero-wms-mvp`
- Account: LuceneX
- Workers subdomain: `smalikisernests.workers.dev`
- Deployed: 5 November 2026
- Public access: enabled

The public page is a client-safe demo with illustrative records only. It does not contain credentials, customer data, integrations, or persistent warehouse data.

## Source and future deployments

The source of truth is `public/index.html`, with the Worker entry point in `src/index.js` and configuration in `wrangler.jsonc`. The current deployment was uploaded directly to Workers so the executive demo could be available immediately. The next engineering step should be to pin Wrangler in the repository and move deployment to GitHub Actions / Workers Builds, then add preview environments for review before production.

## Before adding real data

Add authentication and authorization, a persistent database, immutable inventory transactions, audit logging, backups and restore tests, secrets management, monitoring, rate limits, and a formal acceptance test with ADERO. Keep the public demo dataset separate from any operational environment.
