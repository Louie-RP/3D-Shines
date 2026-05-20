CREATE TABLE IF NOT EXISTS orders (
  session_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  payment_intent_id TEXT,
  customer_email TEXT,
  amount_total INTEGER,
  currency TEXT,
  shipping_name TEXT,
  shipping_address_json TEXT,
  status TEXT NOT NULL DEFAULT 'paid',
  raw_event_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(customer_email);
