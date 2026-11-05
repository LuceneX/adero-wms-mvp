CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS warehouses (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, code)
);

CREATE TABLE IF NOT EXISTS warehouse_memberships (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'operator',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, warehouse_id)
);

ALTER TABLE arrivals ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE arrivals ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);
ALTER TABLE inventory_items ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE inventory_items ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);
ALTER TABLE orders ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE orders ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);
ALTER TABLE activities ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE activities ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);
ALTER TABLE scanner_events ADD COLUMN company_id TEXT REFERENCES companies(id);
ALTER TABLE scanner_events ADD COLUMN warehouse_id TEXT REFERENCES warehouses(id);

INSERT OR IGNORE INTO companies (id, name) VALUES ('co-lucenex-demo', 'LuceneX Warehouse Flow');
INSERT OR IGNORE INTO warehouses (id, company_id, code, name) VALUES ('wh-lucenex-demo', 'co-lucenex-demo', 'RIX-01', 'LuceneX demonstration warehouse');

UPDATE arrivals SET company_id='co-lucenex-demo', warehouse_id='wh-lucenex-demo' WHERE company_id IS NULL;
UPDATE inventory_items SET company_id='co-lucenex-demo', warehouse_id='wh-lucenex-demo' WHERE company_id IS NULL;
UPDATE orders SET company_id='co-lucenex-demo', warehouse_id='wh-lucenex-demo' WHERE company_id IS NULL;
UPDATE activities SET company_id='co-lucenex-demo', warehouse_id='wh-lucenex-demo' WHERE company_id IS NULL;
UPDATE scanner_events SET company_id='co-lucenex-demo', warehouse_id='wh-lucenex-demo' WHERE company_id IS NULL;

INSERT OR IGNORE INTO warehouse_memberships (user_id, company_id, warehouse_id, role)
SELECT id, 'co-lucenex-demo', 'wh-lucenex-demo', CASE WHEN role='admin' THEN 'admin' ELSE 'operator' END FROM users;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  inventory_item_id TEXT NOT NULL REFERENCES inventory_items(id),
  movement_type TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL,
  quantity_before INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  status_before TEXT,
  status_after TEXT,
  location_before TEXT,
  location_after TEXT,
  reason TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES companies(id),
  warehouse_id TEXT NOT NULL REFERENCES warehouses(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before_json TEXT,
  after_json TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_memberships_user ON warehouse_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_tenant ON inventory_items(company_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_arrivals_tenant ON arrivals(company_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(company_id, warehouse_id);
CREATE INDEX IF NOT EXISTS idx_movements_item ON inventory_movements(inventory_item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_events(entity_type, entity_id, created_at);

CREATE TRIGGER IF NOT EXISTS inventory_movements_immutable_update
BEFORE UPDATE ON inventory_movements BEGIN SELECT RAISE(ABORT, 'IMMUTABLE_RECORD'); END;
CREATE TRIGGER IF NOT EXISTS inventory_movements_immutable_delete
BEFORE DELETE ON inventory_movements BEGIN SELECT RAISE(ABORT, 'IMMUTABLE_RECORD'); END;
CREATE TRIGGER IF NOT EXISTS audit_events_immutable_update
BEFORE UPDATE ON audit_events BEGIN SELECT RAISE(ABORT, 'IMMUTABLE_RECORD'); END;
CREATE TRIGGER IF NOT EXISTS audit_events_immutable_delete
BEFORE DELETE ON audit_events BEGIN SELECT RAISE(ABORT, 'IMMUTABLE_RECORD'); END;
