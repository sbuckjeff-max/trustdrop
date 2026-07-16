CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('dealer', 'courier', 'admin')),
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id INTEGER NOT NULL,
  courier_id INTEGER,
  pickup_address TEXT NOT NULL,
  dropoff_address TEXT NOT NULL,
  item_description TEXT NOT NULL,
  estimated_value REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'assigned', 'picked_up', 'in_transit', 'delivered')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (dealer_id) REFERENCES users(id),
  FOREIGN KEY (courier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS courier_verifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courier_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
  documents TEXT, -- JSON string or comma-separated list of document URLs/paths
  verified_at DATETIME,
  verified_by INTEGER,
  FOREIGN KEY (courier_id) REFERENCES users(id),
  FOREIGN KEY (verified_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS dealer_courier_approvals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  dealer_id INTEGER NOT NULL,
  courier_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'revoked')),
  approved_at DATETIME,
  FOREIGN KEY (dealer_id) REFERENCES users(id),
  FOREIGN KEY (courier_id) REFERENCES users(id),
  UNIQUE(dealer_id, courier_id)
);

CREATE TABLE IF NOT EXISTS courier_gig_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courier_id INTEGER NOT NULL,
  platform TEXT NOT NULL, -- e.g., 'Uber', 'GrubHub', 'DoorDash'
  platform_profile_url TEXT,
  rating REAL,
  completion_rate REAL,
  verified_at DATETIME,
  FOREIGN KEY (courier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL,
  from_user_id INTEGER NOT NULL,
  to_user_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (from_user_id) REFERENCES users(id),
  FOREIGN KEY (to_user_id) REFERENCES users(id)
);


CREATE TABLE IF NOT EXISTS status_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL,
  status TEXT NOT NULL,
  changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  changed_by INTEGER NOT NULL,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (changed_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS courier_locations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  courier_id INTEGER NOT NULL,
  delivery_id INTEGER NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  accuracy REAL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (courier_id) REFERENCES users(id),
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id)
);

CREATE TABLE IF NOT EXISTS delivery_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL,
  courier_id INTEGER NOT NULL,
  photo_data TEXT NOT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (courier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS delivery_signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  delivery_id INTEGER NOT NULL,
  courier_id INTEGER NOT NULL,
  signature_data TEXT NOT NULL,
  captured_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES deliveries(id),
  FOREIGN KEY (courier_id) REFERENCES users(id)
);
