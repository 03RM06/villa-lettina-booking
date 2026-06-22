/* Admin dashboard — Villa Lettina */

// ─── State ────────────────────────────────────────────────────────
const state = {
  adminKey: sessionStorage.getItem('vlAdminKey') || '',
  page: 1, limit: 20,
  status: '', search: '',
  allBookings: []
};

// ─── Elements ─────────────────────────────────────────────────────
const loginSection  = document.getElementById('login-section');
const dashSection   = document.getElementById('dashboard-section');
const loginForm     = document.getElementById('login-form');
const keyInput      = document.getElementById('admin-key-input');
const loginError    = document.getElementById('login-error');
const loginBtn      = document.getElementById('login-btn');
const logoutBtn     = document.getElementById('logout-btn');
const searchInput   = document.getElementById('search-input');
const statusFilter  = document.getElementById('status-filter');
const searchBtn     = document.getElementById('search-btn');
const resetBtn      = document.getElementById('reset-btn');
const tbody         = document.getElementById('bookings-tbody');
const pagination    = document.getElementById('pagination');

// ─── Auth ─────────────────────────────────────────────────────────
function showDashboard() {
  loginSection.style.display = 'none';
  dashSection.style.display = '';
  logoutBtn.style.display = '';
  loadBookings();
  loadStats();
}

function showLogin(errorMsg) {
  loginSection.style.display = '';
  dashSection.style.display = 'none';
  logoutBtn.style.display = 'none';
  if (errorMsg) loginError.textContent = errorMsg;
}

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem('vlAdminKey');
  state.adminKey = '';
  showLogin();
});

loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  loginError.textContent = '';
  const key = keyInput.value.trim();
  if (!key) { loginError.textContent = 'Please enter the admin key.'; return; }

  setLoading(loginBtn, true);
  try {
    await apiFetch('/api/admin/bookings?limit=1', { headers: { 'x-admin-key': key } });
    state.adminKey = key;
    sessionStorage.setItem('vlAdminKey', key);
    showDashboard();
  } catch (err) {
    if (err.status === 401) loginError.textContent = 'Invalid admin key. Please try again.';
    else loginError.textContent = err.message || 'Connection error. Is the server running?';
  } finally {
    setLoading(loginBtn, false);
  }
});

// ─── Stats ────────────────────────────────────────────────────────
async function loadStats() {
  try {
    const all = await apiFetch('/api/admin/bookings?limit=1000', { headers: { 'x-admin-key': state.adminKey } });
    const bookings = all.bookings;
    const confirmed  = bookings.filter(b => b.status === 'confirmed');
    const cancelled  = bookings.filter(b => b.status === 'cancelled');
    const revenue    = confirmed.reduce((s, b) => s + b.totalPrice, 0);

    document.getElementById('stat-total').textContent     = all.total;
    document.getElementById('stat-confirmed').textContent = confirmed.length;
    document.getElementById('stat-cancelled').textContent = cancelled.length;
    document.getElementById('stat-revenue').textContent   = formatPrice(revenue);
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// ─── Bookings Table ───────────────────────────────────────────────
async function loadBookings() {
  tbody.innerHTML = '<tr><td colspan="10" class="table-loading"><span class="spinner" aria-label="Loading"></span> Loading bookings…</td></tr>';
  pagination.innerHTML = '';

  try {
    const params = new URLSearchParams({
      page:  state.page,
      limit: state.limit,
      ...(state.status ? { status: state.status } : {}),
      ...(state.search ? { search: state.search } : {})
    });
    const data = await apiFetch(`/api/admin/bookings?${params}`, { headers: { 'x-admin-key': state.adminKey } });
    renderTable(data.bookings);
    renderPagination(data.total, data.page, data.total_pages);
  } catch (e) {
    if (e.status === 401) { showLogin('Session expired. Please log in again.'); return; }
    tbody.innerHTML = `<tr><td colspan="10" class="table-empty"><div class="empty-icon">⚠️</div><div>${e.message || 'Failed to load bookings.'}</div></td></tr>`;
  }
}

function renderTable(bookings) {
  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="table-empty"><div class="empty-icon">📋</div><div>No bookings found.</div></td></tr>';
    return;
  }

  tbody.innerHTML = bookings.map(b => `
    <tr>
      <td><span class="ref-code">${b.bookingRef}</span></td>
      <td>
        <div class="guest-info">
          <div class="name">${b.guestName}</div>
          <div class="email">${b.guestEmail}</div>
        </div>
      </td>
      <td>${b.roomName}</td>
      <td class="date-cell">${formatDateShort(b.checkIn)}</td>
      <td class="date-cell">${formatDateShort(b.checkOut)}</td>
      <td>${b.nights}</td>
      <td>${b.numGuests}</td>
      <td class="money-cell">${formatPrice(b.totalPrice)}</td>
      <td><span class="badge badge-${b.status}">${b.status}</span></td>
      <td>
        ${b.status === 'confirmed'
          ? `<button type="button" class="btn btn-danger btn-sm" onclick="cancelBooking('${b.bookingRef}', '${b.guestName}')" aria-label="Cancel booking ${b.bookingRef}">Cancel</button>`
          : '<span style="color:var(--color-text-light);font-size:.85rem">—</span>'}
      </td>
    </tr>
  `).join('');
}

function renderPagination(total, page, totalPages) {
  if (totalPages <= 1) { pagination.innerHTML = ''; return; }

  pagination.innerHTML = `
    <button type="button" class="btn btn-outline btn-sm" id="prev-page" ${page <= 1 ? 'disabled' : ''} aria-label="Previous page">← Prev</button>
    <span class="page-info">Page ${page} of ${totalPages} — ${total} booking${total !== 1 ? 's' : ''}</span>
    <button type="button" class="btn btn-outline btn-sm" id="next-page" ${page >= totalPages ? 'disabled' : ''} aria-label="Next page">Next →</button>
  `;

  document.getElementById('prev-page').addEventListener('click', () => { state.page--; loadBookings(); });
  document.getElementById('next-page').addEventListener('click', () => { state.page++; loadBookings(); });
}

// ─── Cancel Action ────────────────────────────────────────────────
async function cancelBooking(ref, guestName) {
  if (!confirm(`Cancel booking ${ref} for ${guestName}?\n\nThis cannot be undone.`)) return;

  try {
    await apiFetch(`/api/admin/bookings/${ref}/cancel`, {
      method: 'PATCH',
      headers: { 'x-admin-key': state.adminKey }
    });
    showToast(`Booking ${ref} cancelled.`, 'success');
    loadBookings();
    loadStats();
  } catch (e) {
    showToast(e.message || 'Could not cancel booking.', 'error');
  }
}

// Expose for inline onclick
window.cancelBooking = cancelBooking;

// ─── Filters ──────────────────────────────────────────────────────
searchBtn.addEventListener('click', () => {
  state.search = searchInput.value.trim();
  state.status = statusFilter.value;
  state.page   = 1;
  loadBookings();
});

resetBtn.addEventListener('click', () => {
  searchInput.value   = '';
  statusFilter.value  = '';
  state.search = '';
  state.status = '';
  state.page   = 1;
  loadBookings();
});

searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchBtn.click(); });

// ─── Init ─────────────────────────────────────────────────────────
if (state.adminKey) showDashboard();
else showLogin();
