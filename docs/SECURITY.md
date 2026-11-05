# Tenant security and immutable records

The MVP runs on Cloudflare D1 (SQLite). D1 does not provide PostgreSQL-style `CREATE POLICY` row-level security. The equivalent boundary is enforced in the Worker:

- Every authenticated user resolves to an active `warehouse_memberships` row.
- Operational reads and writes include both `company_id` and `warehouse_id` from that membership.
- Inventory adjustments require an allowed role (`admin`, `manager`, `supervisor`, or `forklift`).
- Requests outside a user's tenant return a not-found or permission response instead of leaking another tenant's records.
- `inventory_movements` and `audit_events` are append-only. Database triggers reject updates and deletes with `IMMUTABLE_RECORD`.

The current demo seeds one LuceneX company and warehouse. Creating additional companies and warehouses should always create the membership relationship before users can access them.

The scanner and adjustment APIs return structured errors:

```json
{
  "ok": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to adjust inventory.",
    "details": {}
  }
}
```

This is an MVP authorization boundary, not a completed production security review. Before production use, add formal permission records, tenant-management workflows, rate limiting, security headers, secret rotation, backups, and an external penetration test.
