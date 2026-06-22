const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const rooms = db.prepare('SELECT * FROM rooms ORDER BY price_per_night ASC').all();
  res.json(rooms.map(r => ({ ...r, amenities: JSON.parse(r.amenities || '[]') })));
});

module.exports = router;
