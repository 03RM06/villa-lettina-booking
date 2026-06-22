/* Confirmation page — Villa Lettina */

const card = document.getElementById('confirmation-card');
const params = new URLSearchParams(window.location.search);
const ref = params.get('ref');

function renderNotFound() {
  card.innerHTML = `
    <div class="conf-not-found">
      <div class="icon">🔍</div>
      <h2>Booking Not Found</h2>
      <p>We couldn't find a booking with that reference number.<br>Please check your reference and try again.</p>
      <a href="index.html" class="btn btn-primary">Back to Home</a>
    </div>
  `;
}

async function loadBooking() {
  if (!ref) { renderNotFound(); return; }

  try {
    const b = await apiFetch(`/api/bookings/${encodeURIComponent(ref)}`);
    renderBooking(b);
  } catch (e) {
    if (e.status === 404) renderNotFound();
    else {
      card.innerHTML = `
        <div class="conf-not-found">
          <div class="icon">⚠️</div>
          <h2>Something went wrong</h2>
          <p>${e.message || 'Could not load booking details. Please try again.'}</p>
          <a href="index.html" class="btn btn-outline">Back to Home</a>
        </div>
      `;
    }
  }
}

function renderBooking(b) {
  const specialRow = b.specialRequests
    ? `<tr><td>Special Requests</td><td class="conf-special">${b.specialRequests}</td></tr>`
    : '';

  card.innerHTML = `
    <div class="conf-header">
      <div class="checkmark-wrap" aria-hidden="true">
        <svg class="checkmark" viewBox="0 0 52 52" aria-hidden="true">
          <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
          <path class="checkmark-check" fill="none" d="M14 27l8 8 16-16"/>
        </svg>
      </div>
      <h1>Your Booking is Confirmed</h1>
      <p>Thank you, ${b.guestName}. We look forward to welcoming you.</p>
      <div class="conf-ref" aria-label="Booking reference: ${b.bookingRef}">${b.bookingRef}</div>
    </div>

    <div class="conf-body">

      <section class="conf-section" aria-label="Stay details">
        <h2>Stay Details</h2>
        <table class="conf-table">
          <tr><td>Guest</td><td>${b.guestName}</td></tr>
          <tr><td>Email</td><td>${b.guestEmail}</td></tr>
          ${b.guestPhone ? `<tr><td>Phone</td><td>${b.guestPhone}</td></tr>` : ''}
          <tr><td>Room</td><td>${b.roomName} <span class="badge badge-${b.roomType}">${b.roomType}</span></td></tr>
          <tr><td>Check-in</td><td>${formatDate(b.checkIn)}</td></tr>
          <tr><td>Check-out</td><td>${formatDate(b.checkOut)}</td></tr>
          <tr><td>Duration</td><td>${b.nights} night${b.nights !== 1 ? 's' : ''}</td></tr>
          <tr><td>Guests</td><td>${b.numGuests}</td></tr>
          ${specialRow}
        </table>
      </section>

      <section class="conf-section" aria-label="Price breakdown">
        <h2>Price Breakdown</h2>
        <table class="conf-table">
          <tr><td>Nightly rate</td><td>${formatPrice(b.pricePerNight)}</td></tr>
          <tr><td>Nights</td><td>${b.nights}</td></tr>
          <tr class="total-row">
            <td>Estimated Total</td>
            <td>${formatPrice(b.totalPrice)}</td>
          </tr>
        </table>
      </section>

      <div class="notice-payment lg" role="note">
        💳 <strong>Payment Due on Arrival</strong> — No deposit is required. Please bring <strong>${formatPrice(b.totalPrice)}</strong> (estimated) and present your booking reference <strong>${b.bookingRef}</strong> at check-in.
      </div>

    </div>

    <div class="conf-actions no-print">
      <button type="button" class="btn btn-outline" onclick="window.print()" aria-label="Print this confirmation">
        🖨️ Print Confirmation
      </button>
      <a href="index.html" class="btn btn-primary">← Back to Home</a>
    </div>
  `;

  document.title = `Booking ${b.bookingRef} — Villa Lettina`;
}

loadBooking();
