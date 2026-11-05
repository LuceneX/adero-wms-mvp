# Source bases and ownership

Canonical forks are owned by the LuceneX organization:

| Fork | Upstream | Intended role |
|---|---|---|
| [LuceneX/GreaterWMS](https://github.com/LuceneX/GreaterWMS) | [GreaterWMS/GreaterWMS](https://github.com/GreaterWMS/GreaterWMS) | Primary technical proof-of-concept candidate |
| [LuceneX/ModernWMS](https://github.com/LuceneX/ModernWMS) | [fjykTec/ModernWMS](https://github.com/fjykTec/ModernWMS) | .NET/Vue comparison candidate |
| [LuceneX/openboxes](https://github.com/LuceneX/openboxes) | [openboxes/openboxes](https://github.com/openboxes/openboxes) | Mature inventory/traceability comparison candidate |

The MVP frontend is deliberately separate from the upstream applications. This makes the executive demo safe to iterate without implying that the upstream code has already passed deployment, security, license, integration, or workflow validation.

## Proposed next integration step

After ADERO confirms the first real workflow, create a proof-of-concept branch in `LuceneX/GreaterWMS` that implements one vertical slice against anonymized data. Compare that slice against the same domain contract in the other two forks before selecting the production base.
