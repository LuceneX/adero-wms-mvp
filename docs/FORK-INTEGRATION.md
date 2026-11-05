# Fork component integration

The Cloudflare MVP is intentionally a small Worker + D1 application, so the full upstream applications are not embedded as runtime dependencies. Their stacks are incompatible with the current edge deployment:

| Fork | Components used in the MVP | Runtime decision |
|---|---|---|
| [LuceneX/GreaterWMS](https://github.com/LuceneX/GreaterWMS) | Scanner workspace behavior, Zebra/DataWedge barcode contract, ASN/receiving, picking, and hand-count concepts | Primary operational reference; the browser adapter accepts the same DataWedge barcode payload shape and also supports keyboard-wedge scanners. Apache-2.0 notices remain in the fork. |
| [LuceneX/ModernWMS](https://github.com/LuceneX/ModernWMS) | Barcode/QR, printing, table, and warehouse-screen patterns | Comparison/reference source; its Vue/Vuetify build is not bundled into the Worker yet. |
| [LuceneX/openboxes](https://github.com/LuceneX/openboxes) | Inventory traceability and stock-domain concepts | Domain reference only; its Grails application and EPL-1.0 licensing require a separate deployment and license review before code reuse. |

The current implementation keeps the fork boundary explicit. Scanner events, inventory movements, tenant authorization, and audit records are implemented in the LuceneX MVP's own D1 domain model. This avoids silently mixing ORM models, authentication systems, or database assumptions from the upstream applications.

## Scanner bridge

The SPA accepts:

1. Keyboard-wedge USB/Bluetooth scanners.
2. Browser camera scanning when `BarcodeDetector` is available.
3. A browser event bridge for a future Zebra/DataWedge wrapper:

```js
window.LucenexScannerAdapter.receiveIntent(intent)
```

The adapter reads `com.symbol.datawedge.data_string`, matching the payload contract used by the GreaterWMS scanner component, and routes the value through the same authenticated `/api/scans` workflow.
