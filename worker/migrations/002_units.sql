-- Two apartments (superior, deluxe). Safe to run on a database created from the first schema; existing rows become "superior".
ALTER TABLE bookings ADD COLUMN unit TEXT NOT NULL DEFAULT 'superior';
ALTER TABLE blocks ADD COLUMN unit TEXT NOT NULL DEFAULT 'superior';
CREATE INDEX IF NOT EXISTS bookings_unit_dates ON bookings (unit, status, checkin, checkout);
CREATE INDEX IF NOT EXISTS blocks_unit_dates ON blocks (unit, start, end);
