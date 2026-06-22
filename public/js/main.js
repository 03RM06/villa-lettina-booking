/* Shared utilities for Villa Lettina booking site */

async function apiFetch(path, options = {}) {
  const res = await fetch(API_BASE + path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || `HTTP ${res.status}`), { data, status: res.status });
  return data;
}

function formatPrice(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateShort(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDaysBetween(start, end) {
  const a = new Date(start), b = new Date(end);
  return Math.round((b - a) / 86400000);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function setLoading(btn, loading) {
  if (loading) {
    btn._originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Loading…';
    btn.disabled = true;
  } else {
    btn.innerHTML = btn._originalText || btn.innerHTML;
    btn.disabled = false;
  }
}

function showToast(message, type = 'success') {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'polite');
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('out');
    setTimeout(() => toast.remove(), 320);
  }, 4000);
}

function showFieldError(inputEl, message) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.add('error');
  let err = group.querySelector('.field-error');
  if (!err) {
    err = document.createElement('span');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    group.appendChild(err);
    inputEl.setAttribute('aria-describedby', err.id = 'err-' + inputEl.id);
  }
  err.textContent = message;
}

function clearFieldError(inputEl) {
  const group = inputEl.closest('.form-group');
  if (!group) return;
  group.classList.remove('error');
  const err = group.querySelector('.field-error');
  if (err) err.textContent = '';
}

function clearAllErrors(form) {
  form.querySelectorAll('.form-group.error').forEach(g => g.classList.remove('error'));
  form.querySelectorAll('.field-error').forEach(e => e.textContent = '');
}

function badgeClass(type) {
  return `badge badge-${(type || 'room').toLowerCase()}`;
}

function amenityGradient(type) {
  const g = {
    room:  'linear-gradient(135deg,#1A3A4A 0%,#8B7355 100%)',
    suite: 'linear-gradient(135deg,#1A3A4A 0%,#C4963A 100%)',
    villa: 'linear-gradient(135deg,#102530 0%,#1A3A4A 60%,#27AE60 100%)',
    cabin: 'linear-gradient(135deg,#5c3d1e 0%,#8B7355 100%)'
  };
  return g[type] || g.room;
}
