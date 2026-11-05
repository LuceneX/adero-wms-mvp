# Architecture and production boundary

## Prototype

The public MVP is a static `index.html` served by a Cloudflare Worker, with a small Worker API and a dedicated Cloudflare D1 database. It has seeded operational records plus real demo user registration and expiring cookie sessions. It is intentionally small enough to use in a meeting while exercising real persistence.

## Recommended production foundation

Start with a modular monolith, not microservices:

```text
Web + scanner-friendly mobile UI
          |
API / application service layer
          |
Operational modules: master data · inbound · inventory ledger · locations
                     outbound · quality/temperature · documents · audit
          |
PostgreSQL + object storage + background jobs
          |
ERP/accounting · customs · carriers · label printers · scanners/sensors
```

### Core domain records

- `Item`: SKU, description, unit of measure, barcode, storage class.
- `HandlingUnit`: pallet/carton/container identity and parent-child relationships.
- `Lot`: lot number, expiry, ownership, quality state, temperature history link.
- `Location`: site, zone, aisle, rack, position, capacity, temperature rules.
- `InboundShipment` and `Receipt`: expected vs received quantities, exceptions, documents.
- `InventoryTransaction`: immutable movement ledger; never “edit” a stock balance without a compensating event.
- `OutboundOrder`, `PickTask`, `Pack`, and `Dispatch`: reservation, execution, carrier hand-off.
- `User`, `Role`, and `AuditEvent`: who did what, when, and from which device.

## Candidate open-source starting points

The prototype is intentionally independent of any candidate repository. After discovery, run a time-boxed proof of concept against one candidate and compare its real code path with this domain model.

- GreaterWMS: strongest first technical candidate for a Python/Django team; confirm version, deployment, database migration, and documentation before adoption.
- ModernWMS: easy-looking SMB-oriented .NET/Vue candidate; verify the license file and maintenance health before committing.
- OpenBoxes: more operationally mature inventory/supply-chain reference, with EPL-1.0 obligations and a healthcare-originated model that must be tested against ADERO.
- InvenTree: strong inventory/API/plugin baseline, but likely needs meaningful WMS workflow extensions.
- OCA WMS: powerful modules around Odoo, best if ADERO also needs a broader ERP; review per-module licenses.
- OpenWMS: worth inspecting for automation-heavy operations, but likely more engineering than this first demo needs.

## Production gates before any client deployment

1. Confirm workflows, data ownership, service levels, and integration boundaries with ADERO.
2. Run a representative end-to-end pilot with real anonymized records.
3. Perform license and dependency review; have counsel confirm distribution obligations.
4. Define security, backups, restore drills, monitoring, upgrade policy, and incident response.
5. Validate scanner, label, scale, temperature, and network behavior on the warehouse floor.
6. Establish acceptance criteria, migration plan, support model, and a clear distinction between software ownership and optional maintenance.
