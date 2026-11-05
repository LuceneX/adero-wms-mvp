# ADERO WMS MVP

Conversation-ready warehouse operations MVP for SIA ADERO, deployed as a Cloudflare Worker with static assets.

This MVP is an original client-specific layer informed by three organization-owned upstream forks:

- [LuceneX/GreaterWMS](https://github.com/LuceneX/GreaterWMS) — primary WMS reference
- [LuceneX/ModernWMS](https://github.com/LuceneX/ModernWMS) — comparison foundation
- [LuceneX/openboxes](https://github.com/LuceneX/openboxes) — inventory and traceability benchmark

The MVP does not yet embed or modify upstream application code. It keeps the forks as separately maintainable evaluation bases while the discovery demo validates the client workflow and the domain model before deeper adoption.

## Run locally

Open `public/index.html`, or run:

```bash
python3 -m http.server 8080 --directory public
```

## Deploy

The public demo is deployed to Cloudflare Workers. The repository includes `wrangler.jsonc` and `src/index.js` so the deployment can later move to a normal CI/CD path with a pinned Wrangler version.

## Important boundary

This is a conversation/demo MVP. It uses illustrative data and browser-local interactions. It is not approved for real stock records, customer data, warehouse execution, or production operations until authentication, persistence, auditability, backups, integrations, security, and acceptance testing are implemented.
