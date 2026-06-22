const express = require('express');
const router = express.Router();
const db = require('../db');

router.use((req, res, next) => {
  const secret = process.env.ADMIN_SECRET || 'villalettinaadmin2024';
  if (req.headers['x-admin-key'] !== secret)
    return res.status(401).json({ error: 'Unauthorized. Provide valid x-admin-key header.' });
  next();
});

// GET /api/admin/bookings
router.get('/bookings', (req, res) => {
  const { status, page = 1, limit = 20, search } = req.query;
  const pageNum  = Math.max(1, parseInt(page)  || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
  const offset   = (pageNum - 1) * limitNum;

  const conditions = ['1=1'];
  const params = [];

  if (status && ['confirmed', 'cancelled'].includes(status)) {
    conditions.push('b.status=?');
    params.push(status);
  }
  if (search) {
    conditions.push('(b.guest_name LIKE ? OR b.booking_ref LIKE ? OR b.guest_email LIKE ?)');
    const s = `%${search}%`;
    params.push(s, s, s);
  }

  const where = conditions.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS c FROM bookings b WHERE ${where}`).get(...params).c;
  const rows  = db.prepare(
    `SELECT b.*, r.name AS room_name, r.type AS room_type
     FROM bookings b JOIN rooms r ON b.room_id=r.id
     WHERE ${where} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`
  ).all(...params, limitNum, offset);

  res.json({
    bookings: rows.map(b => ({
      bookingRef:      b.booking_ref,
      roomId:          b.room_id,
      roomName:        b.room_name,
      roomType:        b.room_type,
      guestName:       b.guest_name,
      guestEmail:      b.guest_email,
      guestPhone:      b.guest_phone,
      numGuests:       b.num_guests,
      checkIn:         b.check_in,
      checkOut:        b.check_out,
      nights:          b.nights,
      pricePerNight:   b.price_per_night,
      totalPrice:      b.total_price,
      specialRequests: b.special_requests,
      status:          b.status,
      createdAt:       b.created_at
    })),
    total, page: pageNum, limit: limitNum, total_pages: Math.ceil(total / limitNum)
  });
});

// PATCH /api/admin/bookings/:bookingRef/cancel
router.patch('/bookings/:bookingRef/cancel', (req, res) => {
  const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref=?').get(req.params.bookingRef);
  if (!booking) return res.status(404).json({ error: 'Booking not found' });
  if (booking.status === 'cancelled') return res.status(400).json({ error: 'Booking already cancelled' });

  db.prepare("UPDATE bookings SET status='cancelled' WHERE booking_ref=?").run(req.params.bookingRef);
  const room = db.prepare('SELECT name FROM rooms WHERE id=?').get(booking.room_id);

  res.json({ bookingRef: booking.booking_ref, roomName: room.name, guestName: booking.guest_name, status: 'cancelled' });
});

module.exports = router;
