ALTER TABLE inventory_items ADD COLUMN barcode TEXT;

UPDATE inventory_items SET barcode = '590000000204' WHERE sku = 'FRZ-204';
UPDATE inventory_items SET barcode = '590000000118' WHERE sku = 'CHL-118';
UPDATE inventory_items SET barcode = '590000000091' WHERE sku = 'DRY-091';
UPDATE inventory_items SET barcode = '590000000210' WHERE sku = 'CHL-210';

CREATE TABLE IF NOT EXISTS scanner_events (
  id TEXT PRIMARY KEY,
  barcode TEXT NOT NULL,
  mode TEXT NOT NULL,
  outcome TEXT NOT NULL,
  message TEXT NOT NULL,
  item_id TEXT REFERENCES inventory_items(id),
  user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_scanner_events_created ON scanner_events(created_at);
CREATE INDEX IF NOT EXISTS idx_scanner_events_barcode ON scanner_events(barcode);
