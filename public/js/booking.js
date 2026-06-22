/* Booking flow — Villa Lettina */

// ─── State ────────────────────────────────────────────────────────
const state = {
  rooms: [],
  selectedRoomId: null,
  checkIn: null,
  checkOut: null,
  numGuests: 2,
  availabilityConfirmed: false,
  confirmedBooking: null
};

// ─── Elements ─────────────────────────────────────────────────────
const roomSelector     = document.getElementById('room-selector');
const checkInInput     = document.getElementById('check-in');
const checkOutInput    = document.getElementById('check-out');
const guestSelect      = document.getElementById('num-guests');
const availStatus      = document.getElementById('availability-status');
const checkAvailBtn    = document.getElementById('check-availability-btn');
const proceedBtn       = document.getElementById('proceed-to-step2-btn');
const backBtn          = document.getElementById('back-to-step1-btn');
const confirmBtn       = document.getElementById('confirm-booking-btn');
const bookingForm      = document.getElementById('booking-form');
const priceBreakdown   = document.getElementById('price-breakdown');
const confirmedRef     = document.getElementById('confirmed-ref');
const confirmedSummary = document.getElementById('confirmed-summary');
const confirmedNotice  = document.getElementById('confirmed-payment-notice');
const viewConfLink     = document.getElementById('view-confirmation-link');

// ─── Utilities ────────────────────────────────────────────────────
function setStep(num) {
  document.querySelectorAll('.booking-step').forEach((s, i) => {
    const n = i + 1;
    s.classList.toggle('active', n === num);
    s.hidden = n !== num;
  });
  document.querySelectorAll('.progress-step').forEach((el, i) => {
    const n = i + 1;
    el.classList.remove('active', 'done');
    el.removeAttribute('aria-current');
    if (n < num)  el.classList.add('done');
    if (n === num) { el.classList.add('active'); el.setAttribute('aria-current', 'step'); }
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function getSelectedRoom() {
  return state.rooms.find(r => r.id === state.selectedRoomId);
}

// ─── Room Selector ────────────────────────────────────────────────
async function loadRooms() {
  try {
    state.rooms = await apiFetch('/api/rooms');
  } catch {
    roomSelector.innerHTML = '<p class="text-muted" style="padding:24px">Unable to load rooms. Please refresh.</p>';
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const preSelected = params.get('roomId') ? Number(params.get('roomId')) : null;

  roomSelector.innerHTML = '';
  state.rooms.forEach(room => {
    const div = document.createElement('label');
    div.className = 'room-option';
    div.setAttribute('tabindex', '0');
    div.innerHTML = `
      <input type="radio" name="room" value="${room.id}" ${room.id === preSelected ? 'checked' : ''} aria-label="${room.name} — ${formatPrice(room.price_per_night)} per night">
      <div class="check-icon" aria-hidden="true">✓</div>
      <div class="room-option-thumb" style="background:${amenityGradient(room.type)}">${room.name}</div>
      <div class="room-option-name">${room.name}</div>
      <span class="${badgeClass(room.type)}">${room.type}</span>
      <div class="room-option-meta">
        <span class="room-option-price">${formatPrice(room.price_per_night)}/night</span>
        <span class="room-option-guests">👥 max ${room.max_guests}</span>
      </div>
    `;

    const radio = div.querySelector('input');
    const updateSelected = () => {
      document.querySelectorAll('.room-option').forEach(o => o.classList.remove('selected'));
      if (radio.checked) {
        div.classList.add('selected');
        state.selectedRoomId = room.id;
        // Clamp guest count to room max
        updateGuestOptions(room.max_guests);
        resetAvailability();
      }
    };

    radio.addEventListener('change', updateSelected);
    div.addEventListener('keydown', e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); radio.checked = true; updateSelected(); } });

    if (room.id === preSelected) {
      state.selectedRoomId = room.id;
      div.classList.add('selected');
    }
    roomSelector.appendChild(div);
  });

  if (preSelected && state.selectedRoomId) {
    const room = getSelectedRoom();
    if (room) updateGuestOptions(room.max_guests);
  }
}

function updateGuestOptions(max) {
  const current = Number(guestSelect.value);
  Array.from(guestSelect.options).forEach(opt => {
    opt.disabled = Number(opt.value) > max;
  });
  if (current > max) guestSelect.value = String(max);
}

function resetAvailability() {
  state.availabilityConfirmed = false;
  availStatus.innerHTML = '';
  proceedBtn.style.display = 'none';
}

// ─── Date inputs ──────────────────────────────────────────────────
checkInInput.min = todayISO();
checkOutInput.min = tomorrowISO();

checkInInput.addEventListener('change', () => {
  state.checkIn = checkInInput.value;
  const nextDay = new Date(state.checkIn + 'T00:00:00');
  nextDay.setDate(nextDay.getDate() + 1);
  const nextIso = nextDay.toISOString().slice(0, 10);
  checkOutInput.min = nextIso;
  if (state.checkOut && state.checkOut <= state.checkIn) {
    checkOutInput.value = nextIso;
    state.checkOut = nextIso;
  }
  resetAvailability();
});

checkOutInput.addEventListener('change', () => {
  state.checkOut = checkOutInput.value;
  resetAvailability();
});

guestSelect.addEventListener('change', () => {
  state.numGuests = Number(guestSelect.value);
  resetAvailability();
});

// ─── Availability Check ───────────────────────────────────────────
checkAvailBtn.addEventListener('click', async () => {
  if (!state.selectedRoomId) return showToast('Please select a room first.', 'error');
  if (!checkInInput.value)   return showToast('Please select a check-in date.', 'error');
  if (!checkOutInput.value)  return showToast('Please select a check-out date.', 'error');
  if (checkInInput.value >= checkOutInput.value) return showToast('Check-out must be after check-in.', 'error');

  state.checkIn  = checkInInput.value;
  state.checkOut = checkOutInput.value;
  state.numGuests = Number(guestSelect.value);

  setLoading(checkAvailBtn, true);
  availStatus.innerHTML = '';

  try {
    const result = await apiFetch(
      `/api/availability?roomId=${state.selectedRoomId}&start=${state.checkIn}&end=${state.checkOut}`
    );

    if (result.available) {
      const nights = getDaysBetween(state.checkIn, state.checkOut);
      state.availabilityConfirmed = true;
      availStatus.innerHTML = `<div class="avail-ok">✅ Available for your dates — ${nights} night${nights !== 1 ? 's' : ''}</div>`;
      proceedBtn.style.display = '';
    } else {
      const datesStr = result.unavailable_dates.map(formatDateShort).join(', ');
      availStatus.innerHTML = `<div class="avail-err">❌ Not available — conflicts on: ${datesStr}.<br>Please choose different dates or a different room.</div>`;
      proceedBtn.style.display = 'none';
    }
  } catch (e) {
    showToast(e.message || 'Could not check availability. Please try again.', 'error');
  } finally {
    setLoading(checkAvailBtn, false);
  }
});

// ─── Step 1 → Step 2 ──────────────────────────────────────────────
proceedBtn.addEventListener('click', () => {
  if (!state.availabilityConfirmed) return;
  renderPriceBreakdown();
  setStep(2);
});

function renderPriceBreakdown() {
  const room   = getSelectedRoom();
  const nights = getDaysBetween(state.checkIn, state.checkOut);
  const total  = nights * room.price_per_night;

  priceBreakdown.innerHTML = `
    <div class="price-row"><span class="label">Room</span><span class="value">${room.name}</span></div>
    <div class="price-row"><span class="label">Check-in</span><span class="value">${formatDate(state.checkIn)}</span></div>
    <div class="price-row"><span class="label">Check-out</span><span class="value">${formatDate(state.checkOut)}</span></div>
    <div class="price-row"><span class="label">Duration</span><span class="value">${nights} night${nights !== 1 ? 's' : ''}</span></div>
    <div class="price-row"><span class="label">Guests</span><span class="value">${state.numGuests}</span></div>
    <div class="price-row"><span class="label">Rate</span><span class="value">${formatPrice(room.price_per_night)} / night</span></div>
    <div class="price-row total">
      <span class="label">Estimated Total</span>
      <span class="value">${formatPrice(total)}</span>
    </div>
  `;
}

// ─── Step 2 → Step 1 ──────────────────────────────────────────────
backBtn.addEventListener('click', () => setStep(1));

// ─── Form Validation ──────────────────────────────────────────────
function validateForm() {
  clearAllErrors(bookingForm);
  let ok = true;

  const nameEl  = document.getElementById('guest-name');
  const emailEl = document.getElementById('guest-email');

  if (!nameEl.value.trim()) {
    showFieldError(nameEl, 'Please enter your full name.'); ok = false;
  }
  if (!emailEl.value.trim()) {
    showFieldError(emailEl, 'Please enter your email address.'); ok = false;
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
    showFieldError(emailEl, 'Please enter a valid email address.'); ok = false;
  }
  return ok;
}

// ─── Confirm Booking ──────────────────────────────────────────────
confirmBtn.addEventListener('click', async () => {
  if (!validateForm()) return;

  const guestName     = document.getElementById('guest-name').value.trim();
  const guestEmail    = document.getElementById('guest-email').value.trim();
  const guestPhone    = document.getElementById('guest-phone').value.trim() || null;
  const specialReqs   = document.getElementById('special-requests').value.trim() || null;

  setLoading(confirmBtn, true);

  try {
    const booking = await apiFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        roomId:          state.selectedRoomId,
        guestName, guestEmail, guestPhone,
        numGuests:       state.numGuests,
        checkIn:         state.checkIn,
        checkOut:        state.checkOut,
        specialRequests: specialReqs
      })
    });

    state.confirmedBooking = booking;
    renderConfirmed(booking);
    setStep(3);

  } catch (e) {
    if (e.status === 409) {
      showToast('That room was just booked by another guest. Please go back and choose different dates.', 'error');
      state.availabilityConfirmed = false;
      proceedBtn.style.display = 'none';
      setStep(1);
    } else {
      showToast(e.message || 'Booking failed. Please try again.', 'error');
    }
  } finally {
    setLoading(confirmBtn, false);
  }
});

// ─── Render Confirmed Step ────────────────────────────────────────
function renderConfirmed(b) {
  confirmedRef.textContent = b.bookingRef;

  confirmedSummary.innerHTML = `
    <table>
      <tr><td>Guest</td><td>${b.guestName}</td></tr>
      <tr><td>Room</td><td>${b.roomName}</td></tr>
      <tr><td>Check-in</td><td>${formatDate(b.checkIn)}</td></tr>
      <tr><td>Check-out</td><td>${formatDate(b.checkOut)}</td></tr>
      <tr><td>Duration</td><td>${b.nights} night${b.nights !== 1 ? 's' : ''}</td></tr>
      <tr><td>Guests</td><td>${b.numGuests}</td></tr>
      <tr><td>Est. Total</td><td>${formatPrice(b.totalPrice)}</td></tr>
    </table>
  `;

  confirmedNotice.innerHTML = `
    💳 <strong>Payment Due on Arrival</strong> — Please bring <strong>${formatPrice(b.totalPrice)}</strong> (estimated) and present your booking reference at check-in. No deposit required.
  `;

  viewConfLink.href = `confirmation.html?ref=${b.bookingRef}`;
}

// ─── Init ─────────────────────────────────────────────────────────
loadRooms();
