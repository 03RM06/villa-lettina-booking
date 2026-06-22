require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

require('./db');

const app = express();
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()}  ${req.method} ${req.url}`);
  next();
});

app.use('/api/rooms', require('./routes/rooms'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api', require('./routes/bookings'));

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) return res.status(404).json({ error: 'Not found' });
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Villa Lettina API → http://localhost:${PORT}`));
