# Villa Lettina Booking Site

A complete resort booking website replacing the Google Apps Script / Google Sheets flow.

## Tech Stack

- **Backend:** Node.js 22+ · Express 4 · `node:sqlite` (built-in, no installation required)
- **Frontend:** Plain HTML · CSS custom properties · Vanilla JavaScript (no frameworks)
- **Database:** SQLite file (`data/villa_lettina.db`) — created and seeded automatically on first start

## Prerequisites

- Node.js v22.5.0 or higher (Node.js v24 recommended — already installed)
- No Python, no MSVC, no native module compilation needed

## Local Setup

```bash
# 1. Install dependencies (fast — no native modules)
cd C:\Users\USER\Documents\GitHub\villa-lettina-booking
npm install

# 2. Copy env file
copy .env.example .env

# 3. Start the server
npm start
# or for auto-reload during development:
npm run dev
```

Open **http://localhost:3001** in your browser.

The server seeds 4 rooms automatically on first run.

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page — room showcase, amenities, about |
| `/booking.html` | Multi-step booking flow |
| `/confirmation.html?ref=VL-XXXX-XXXXXX` | Booking confirmation |
| `/admin.html` | Admin dashboard (key required) |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/rooms` | List all rooms with pricing |
| GET | `/api/availability?roomId=&start=&end=` | Check availability |
| POST | `/api/bookings` | Create a booking |
| GET | `/api/bookings/:ref` | Get booking by reference |
| GET | `/api/admin/bookings` | List all bookings (admin) |
| PATCH | `/api/admin/bookings/:ref/cancel` | Cancel a booking (admin) |

## Admin Access

Default admin key: `villalettinaadmin2024`

Set `ADMIN_SECRET` in `.env` to change it. Send it as the `x-admin-key` request header, or enter it on the admin login page.

## Adding Room Photos

Drop photos into `public/images/` with these filenames:
- `room-garden.jpg`
- `room-pool-suite.jpg`
- `room-beachfront-villa.jpg`
- `room-family-cabin.jpg`

Until photos are present, CSS gradient placeholders are shown.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `ADMIN_SECRET` | `villalettinaadmin2024` | Admin dashboard key |

## Payments

Pay on arrival only — no online payment is processed. The booking flow shows a price estimate (nightly rate × nights). Confirmation pages state clearly: **Payment Due on Arrival**.

## Deployment (Render)

1. Push this repo to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Build command: `npm install`
4. Start command: `npm start`
5. Add environment variables: `PORT=10000`, `ADMIN_SECRET=your-secret-here`
6. Add a **persistent disk** mounted at `/data` (so the SQLite file survives deploys).
7. Update `server/db.js` data directory to use `/data/villa_lettina.db` in production.

## Resetting the Database

Delete `data/villa_lettina.db` and restart the server — it will re-seed with the 4 default rooms.
