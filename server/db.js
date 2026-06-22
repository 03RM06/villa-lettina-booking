const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'villa_lettina.db'));
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    amenities TEXT,
    max_guests INTEGER NOT NULL,
    price_per_night REAL NOT NULL,
    image_filename TEXT
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    booking_ref TEXT NOT NULL UNIQUE,
    room_id INTEGER NOT NULL REFERENCES rooms(id),
    guest_name TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    num_guests INTEGER NOT NULL,
    check_in TEXT NOT NULL,
    check_out TEXT NOT NULL,
    nights INTEGER NOT NULL,
    price_per_night REAL NOT NULL,
    total_price REAL NOT NULL,
    special_requests TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS blackout_dates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id INTEGER REFERENCES rooms(id),
    date TEXT NOT NULL,
    reason TEXT
  );
`);

const roomCount = db.prepare('SELECT COUNT(*) AS c FROM rooms').get().c;
if (roomCount === 0) {
  const ins = db.prepare(
    'INSERT INTO rooms (name,type,description,amenities,max_guests,price_per_night,image_filename) VALUES (?,?,?,?,?,?,?)'
  );
  db.exec('BEGIN');
  try {
    ins.run('Garden Room', 'room',
      'A cozy garden-facing retreat perfect for couples, featuring a private patio surrounded by lush tropical foliage.',
      JSON.stringify(['Air conditioning','Private bathroom','Garden view patio','Free WiFi','Breakfast included']),
      2, 3500, 'room-garden.jpg');
    ins.run('Pool View Suite', 'suite',
      'Spacious suite with a private balcony overlooking the resort pool. Ideal for small families or groups seeking extra comfort.',
      JSON.stringify(['Air conditioning','Private bathroom','Pool view balcony','Free WiFi','Breakfast included','Mini-bar','Soaking bathtub']),
      4, 6500, 'room-pool-suite.jpg');
    ins.run('Beachfront Villa', 'villa',
      'Our flagship villa with direct private beach access, a plunge pool, and a full kitchen. The ultimate Villa Lettina experience.',
      JSON.stringify(['Air conditioning','2 Bathrooms','Private beach access','Free WiFi','Breakfast included','Full kitchen','Private plunge pool','Open living area']),
      8, 12000, 'room-beachfront-villa.jpg');
    ins.run('Family Cabin', 'cabin',
      'Nestled in a forested corner of the property, this cabin offers privacy and a charming rustic feel with modern comforts.',
      JSON.stringify(['Air conditioning','2 Bathrooms','Forest & garden view','Free WiFi','Breakfast included','Kitchenette','Living area','Outdoor BBQ area']),
      6, 8500, 'room-family-cabin.jpg');
    db.exec('COMMIT');
    console.log('Database seeded with 4 rooms.');
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

module.exports = db;
