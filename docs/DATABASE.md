# Database and user accounts

## Current live resources

- Cloudflare D1 database: `adero-wms-mvp-prod`
- Region: EU / EEUR
- Binding: `DB`
- Database ID: `83bd9840-1ac5-45cd-a6cc-5aa858bc67c5`
- Worker: `adero-wms-mvp`

The database is initialized and seeded with illustrative arrivals, inventory, outbound orders, storage activity, and quality-hold data.

## Tables

- `users` — registered operator accounts and roles
- `sessions` — hashed, expiring login sessions
- `arrivals` — inbound records and receiving status
- `inventory_items` — stock, lot, location, storage class, quantity, and status
- `orders` — outbound order status and due date
- `activities` — operational activity feed and user attribution
- `app_meta` — schema/seed metadata

## What works now

- User registration with password hashing using PBKDF2-SHA-256
- Sign-in and sign-out with secure, HTTP-only, same-site cookies
- Database-backed dashboard reads
- Database-backed arrival creation
- Database-backed put-away status changes
- Database-backed pick-wave status changes
- User attribution for created records and activity events

## Prototype hardening still required

This is suitable for a client demo, not yet for sensitive operational use. Before production, add email verification, password reset, invitation and role administration, CSRF protection, login rate limiting, stronger session rotation/revocation, audit event immutability, automated backups and restore tests, migration CI, monitoring, privacy controls, and formal security review.
