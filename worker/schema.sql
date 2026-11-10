CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  checkin TEXT NOT NULL,           -- YYYY-MM-DD (first night)
  checkout TEXT NOT NULL,          -- YYYY-MM-DD (departure day, exclusive)
  guests INTEGER NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'de',
  nights INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  quote_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | confirmed | paid | declined | expired | cancelled
  stripe_session_id TEXT,
  pay_url TEXT,
  pay_expires_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bookings_dates ON bookings (status, checkin, checkout);

CREATE TABLE IF NOT EXISTS blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,            -- booking | airbnb | manual
  uid TEXT NOT NULL DEFAULT '',
  start TEXT NOT NULL,
  end TEXT NOT NULL,               -- exclusive
  note TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS blocks_dates ON blocks (start, end);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
