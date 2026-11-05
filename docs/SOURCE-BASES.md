# Source bases and ownership

Canonical forks are owned by the LuceneX organization:

| Fork | Upstream | Intended role |
|---|---|---|
| [LuceneX/GreaterWMS](https://github.com/LuceneX/GreaterWMS) | [GreaterWMS/GreaterWMS](https://github.com/GreaterWMS/GreaterWMS) | Primary technical proof-of-concept candidate |
| [LuceneX/ModernWMS](https://github.com/LuceneX/ModernWMS) | [fjykTec/ModernWMS](https://github.com/fjykTec/ModernWMS) | .NET/Vue comparison candidate |
| [LuceneX/openboxes](https://github.com/LuceneX/openboxes) | [openboxes/openboxes](https://github.com/openboxes/openboxes) | Mature inventory/traceability comparison candidate |

The MVP frontend is deliberately separate from the upstream applications. This makes the executive demo safe to iterate without implying that the upstream code has already passed deployment, security, license, integration, or workflow validation.

## Current integration status

The first practical integration is complete in the MVP scanner workspace: its keyboard-wedge and camera flows are native to the Cloudflare SPA, while the optional browser bridge accepts the Zebra/DataWedge payload contract used by GreaterWMS. The inventory adjustment, movement ledger, tenant authorization, and audit model remain LuceneX-owned code so they can run on D1.

See [`docs/FORK-INTEGRATION.md`](FORK-INTEGRATION.md) for the component map, licensing boundary, and next adapter points.
