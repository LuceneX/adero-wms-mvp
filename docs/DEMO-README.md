# ADERO WMS conversation starter

This is a deliberately small, dependency-free prototype for an initial conversation with SIA ADERO. It is not a production warehouse-management system and it does not connect to ADERO, GitHub projects, carriers, scanners, accounting, customs, or a database.

## Run it

1. Open `index.html` directly in a modern browser, or serve this folder with any static web server.
2. If you want a local server, run `python3 -m http.server 8080` from this folder and open `http://localhost:8080`.
3. Walk through Overview → Inbound → Inventory → Outbound → Locations → Discovery.
4. Use **Record arrival**, **Simulate receiving next arrival**, **Start pick wave**, and **Scan item** to show the prototype responding.

## Suggested 10-minute demo

1. Start with the verified-context banner: ADERO publicly describes cargo transportation, customs declarations, and warehouse services for storage, sorting, labeling, and assembly of thermal and dry cargo.
2. Show the end-to-end flow, explicitly calling it an illustrative path.
3. Record a chilled arrival, then complete the pending put-away task.
4. Search `CHL-210` to show a quality hold and explain that rules still need to be defined.
5. Start a pick wave and discuss what “dispatch” means in ADERO’s real process.
6. End on Discovery and ask the questions out loud. The goal is to learn, not to sell the mock data as a finished solution.

## What is implemented

- Responsive operational dashboard
- Seeded arrival, stock, location, order, exception, and activity records
- Local-only arrival creation and simulated status transitions
- Inventory search and a scan-to-search interaction
- Discovery questions embedded in the product flow
- Clear prototype / verified-context boundary in the interface

## What is intentionally not implemented

Authentication, roles, audit-safe persistence, barcode hardware, label printing, temperature telemetry, customs documents, carrier integrations, customer portals, billing, accounting, ERP integration, multi-site controls, offline mobile operation, concurrency, backups, monitoring, security hardening, and legal/compliance controls.

See `RESEARCH.md`, `ARCHITECTURE.md`, and `DISCOVERY.md` in this folder.
