# ADERO and open-source WMS research

Research date: 5 November 2026 (Europe/Riga). This is a decision brief, not legal advice or a production-readiness certification.

## Verified ADERO context

ADERO’s public website describes a Latvian logistics company with more than 15 years of experience coordinating international cargo transportation. It lists full, combined, temperature-controlled, and oversized transport; customs declarations to and from non-EU countries; and warehouse services for storage, sorting, labeling, and assembly of thermal (fresh/frozen) and dry cargo. The site gives an address in Mārupe, Latvia and says it has served more than 5,500 companies and individuals and coordinated more than 80,000 cargo transports. These are public marketing claims, not independently audited operating metrics.

Source: [ADERO cargo transportation](https://adero.lv/en/).

## Shortlist assessment

| Candidate | License signal | What it could fit | Main concern for ADERO | Recommendation |
|---|---|---|---|---|
| [GreaterWMS](https://github.com/GreaterWMS/GreaterWMS) | Repository presents Apache-2.0; confirm exact commit and third-party dependencies | Dedicated WMS, Python/Django, inbound/outbound, locations, inventory | Documentation/version split and deployment path need hands-on validation | First technical proof of concept |
| [ModernWMS](https://github.com/fjykTec/ModernWMS) | GitHub LICENSE file exists; README has historically described MIT while other metadata has differed, so verify the file in the commit used | Simple SMB-oriented WMS, .NET/Vue, QR/scanning direction | Stale/slow maintenance signals and license ambiguity need resolution | Keep as comparison candidate |
| [OpenBoxes](https://github.com/openboxes/openboxes) | Eclipse Public License 1.0 | Strong inventory movements, lots/expiry, multi-facility supply-chain history | Healthcare origin; deeper Java/Grails customization | Operational benchmark / alternative |
| [InvenTree](https://github.com/inventree/InvenTree) | MIT | Inventory, traceability, API and plugins | Inventory-first; receiving/put-away/pick/dispatch may need extensions | Consider if inventory is the real center |
| [OCA WMS](https://github.com/OCA/wms) | Repository AGPL-3.0; individual modules may differ | Barcode, put-away, reservations, release channels, shop-floor modules within Odoo | Odoo dependency and license review; broader ERP complexity | Consider only with ERP scope |
| [ERPNext](https://github.com/frappe/erpnext) | GPL-3.0 | Broad ERP plus stock, purchasing, distribution | Likely larger than a focused WMS; copyleft obligations | Not first choice for this conversation |
| [OpenWMS](https://github.com/openwms/org.openwms) | Verify repository and module licenses before use | Automation/material-flow direction | More engineering-oriented and less immediately useful for a small discovery demo | Watchlist |

## Fit conclusion

For a no-per-user-subscription, self-hosted custom platform, GreaterWMS is the most plausible first technical candidate to test, but not yet a recommendation to deploy. Its Python/Django shape could align with a small custom team and its subject matter is close to the concept. ModernWMS is a useful second comparison if the team prefers .NET, though its maintenance and licensing signals deserve a careful review. OpenBoxes is the strongest operational reference for stock traceability and movement history, but requires more validation against ADERO’s cargo-forwarding and commercial warehouse context.

The safest commercial framing is: the client can own and self-host the resulting deployment; LuceneX can offer implementation, customization, upgrades, backup/security operations, and optional support. “No subscription” does not mean “no operating cost.”

## License notes

Permissive licenses such as MIT and Apache-2.0 are usually easier to integrate into a commercial custom deployment, subject to notice and dependency obligations. EPL-1.0, AGPL-3.0, GPL-3.0, and mixed repositories can also be commercially usable, but their source/distribution obligations and how the software is delivered must be reviewed for the specific architecture. A repository badge is not a substitute for reviewing the actual license files, notices, dependencies, and any dual-licensing terms.

Primary sources: [GreaterWMS license](https://github.com/GreaterWMS/GreaterWMS/blob/master/LICENSE), [ModernWMS license](https://github.com/fjykTec/ModernWMS/blob/master/LICENSE), [OpenBoxes license](https://github.com/openboxes/openboxes/blob/develop/LICENSE.md), [InvenTree organization](https://github.com/inventree), [OCA WMS](https://github.com/OCA/wms), [ERPNext](https://github.com/frappe/erpnext).
