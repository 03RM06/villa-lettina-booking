const express = require('express');
const router = express.Router();
const db = require('../db');

function datesToRange(start, end) {
  const dates = [];
  const cur = new Date(start + 'T00:00:00Z');
  const stop = new Date(end + 'T00:00:00Z');
  while (cur < stop) {
    dates.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return dates;
}

function conflictsForRoom(roomId, dates) {
  const out = [];
  const bookedStmt = db.prepare(
    `SELECT id FROM bookings WHERE room_id=? AND status='confirmed' AND check_in<=? AND check_out>?`
  );
  const blackoutStmt = db.prepare(
    `SELECT id FROM blackout_dates WHERE (room_id=? OR room_id IS NULL) AND date=?`
  );
  for (const date of dates) {
    if (bookedStmt.get(roomId, date, date) || blackoutStmt.get(roomId, date)) {
      out.push(date);
    }
  }
  return out;
}

function withTransaction(fn) {
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}

// GET /api/availability
router.get('/availability', (req, res) => {
  const { roomId, start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: 'start and end are required' });

  const s = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z');
  if (isNaN(s) || isNaN(e)) return res.status(400).json({ error: 'Invalid date format' });
  if (s >= e) return res.status(400).json({ error: 'start must be before end' });

  const dates = datesToRange(start, end);
  const rooms = roomId
    ? db.prepare('SELECT id FROM rooms WHERE id=?').all(Number(roomId))
    : db.prepare('SELECT id FROM rooms').all();

  if (roomId && rooms.length === 0) return res.status(404).json({ error: 'Room not found' });

  const unavailSet = new Set();
  const roomsAvailable = [];

  for (const room of rooms) {
    const conflicts = conflictsForRoom(room.id, dates);
    conflicts.forEach(d => unavailSet.add(d));
    if (conflicts.length === 0) roomsAvailable.push(room.id);
  }

  res.json({
    available: roomId ? roomsAvailable.includes(Number(roomId)) : roomsAvailable.length > 0,
    unavailable_dates: [...unavailSet].sort(),
    rooms_available: roomsAvailable
  });
});

// POST /api/bookings
router.post('/bookings', (req, res) => {
  const { roomId, guestName, guestEmail, guestPhone, numGuests, checkIn, checkOut, specialRequests } = req.body;

  if (!roomId || !guestName || !guestEmail || !numGuests || !checkIn || !checkOut)
    return res.status(400).json({ error: 'Missing required fields: roomId, guestName, guestEmail, numGuests, checkIn, checkOut' });

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guestEmail))
    return res.status(400).json({ error: 'Invalid email address' });

  const checkInDate  = new Date(checkIn  + 'T00:00:00Z');
  const checkOutDate = new Date(checkOut + 'T00:00:00Z');
  if (isNaN(checkInDate) || isNaN(checkOutDate)) return res.status(400).json({ error: 'Invalid date format' });
  if (checkInDate >= checkOutDate) return res.status(400).json({ error: 'Check-out must be after check-in' });

  const room = db.prepare('SELECT * FROM rooms WHERE id=?').get(Number(roomId));
  if (!room) return res.status(404).json({ error: 'Room not found' });

  const guests = Number(numGuests);
  if (guests < 1 || guests > room.max_guests)
    return res.status(400).json({ error: `Guest count must be 1–${room.max_guests} for this room` });

  const nights = Math.round((checkOutDate - checkInDate) / 86400000);
  if (nights < 1) return res.status(400).json({ error: 'Minimum stay is 1 night' });

  const totalPrice  = nights * room.price_per_night;
  const bookingRef  = `VL-${new Date().getFullYear()}-${String(Math.floor(100000 + Math.random() * 900000))}`;
  const dates       = datesToRange(checkIn, checkOut);

  let bookingResult;
  try {
    bookingResult = withTransaction(() => {
      const conflicts = conflictsForRoom(room.id, dates);
      if (conflicts.length > 0) return { conflict: true, conflicting_dates: conflicts };

      db.prepare(
        `INSERT INTO bookings (booking_ref,room_id,guest_name,guest_email,guest_phone,num_guests,check_in,check_out,nights,price_per_night,total_price,special_requests,status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'confirmed')`
      ).run(bookingRef, room.id, guestName, guestEmail, guestPhone || null, guests,
            checkIn, checkOut, nights, room.price_per_night, totalPrice, specialRequests || null);

      return { conflict: false };
    });
  } catch (e) {
    console.error('Booking error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }

  if (bookingResult.conflict)
    return res.status(409).json({ error: 'Room is not available for selected dates', conflicting_dates: bookingResult.conflicting_dates });

  res.status(201).json({
    bookingRef, roomId: room.id, roomName: room.name, roomType: room.type,
    guestName, guestEmail, guestPhone: guestPhone || null, numGuests: guests,
    checkIn, checkOut, nights, pricePerNight: room.price_per_night,
    totalPrice, specialRequests: specialRequests || null,
    status: 'confirmed', createdAt: new Date().toISOString()
  });
});

// GET /api/bookings/:bookingRef
router.get('/bookings/:bookingRef', (req, res) => {
  const row = db.prepare(
    `SELECT b.*, r.name AS room_name, r.type AS room_type
     FROM bookings b JOIN rooms r ON b.room_id=r.id
     WHERE b.booking_ref=?`
  ).get(req.params.bookingRef);

  if (!row) return res.status(404).json({ error: 'Booking not found' });

  res.json({
    bookingRef:      row.booking_ref,
    roomId:          row.room_id,
    roomName:        row.room_name,
    roomType:        row.room_type,
    guestName:       row.guest_name,
    guestEmail:      row.guest_email,
    guestPhone:      row.guest_phone,
    numGuests:       row.num_guests,
    checkIn:         row.check_in,
    checkOut:        row.check_out,
    nights:          row.nights,
    pricePerNight:   row.price_per_night,
    totalPrice:      row.total_price,
    specialRequests: row.special_requests,
    status:          row.status,
    createdAt:       row.created_at
  });
});

module.exports = router;
