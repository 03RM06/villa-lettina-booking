/* Landing page — Villa Lettina */

const nav = document.getElementById('site-nav');
const navToggle = document.getElementById('nav-toggle');
const navLinks  = document.getElementById('nav-links');

// Sticky nav
window.addEventListener('scroll', () => {
  nav.classList.toggle('scrolled', window.scrollY > 60);
}, { passive: true });

// Mobile menu
navToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', open);
});

// Close mobile menu when a link is clicked
navLinks.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// ─── Room Cards ──────────────────────────────────────────────────
const roomsGrid = document.getElementById('rooms-grid');

function buildRoomCard(room) {
  const amenities = room.amenities || [];
  const shown = amenities.slice(0, 4);
  const extra = amenities.length - shown.length;
  const pillsHtml = shown.map(a => `<span class="amenity-pill">${a}</span>`).join('') +
    (extra > 0 ? `<span class="amenity-more">+${extra} more</span>` : '');

  const card = document.createElement('article');
  card.className = 'card room-card fade-hidden';
  card.setAttribute('aria-label', room.name);
  card.innerHTML = `
    <div class="room-image" aria-hidden="true">
      <div class="room-image-placeholder" style="background:${amenityGradient(room.type)}">${room.name}</div>
    </div>
    <div class="room-body">
      <div class="room-header">
        <h3>${room.name}</h3>
        <span class="${badgeClass(room.type)}">${room.type}</span>
      </div>
      <p class="room-desc">${room.description || ''}</p>
      <div class="room-amenities">${pillsHtml}</div>
      <div class="room-footer">
        <div>
          <div class="price-tag">${formatPrice(room.price_per_night)} <small>/ night</small></div>
          <div class="room-guests">👥 Up to ${room.max_guests} guests</div>
        </div>
        <a href="booking.html?roomId=${room.id}" class="btn btn-primary btn-sm">Book This Room</a>
      </div>
    </div>
  `;
  return card;
}

async function loadRooms() {
  try {
    const rooms = await apiFetch('/api/rooms');
    roomsGrid.innerHTML = '';

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.replace('fade-hidden', 'fade-visible'), i * 100);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });

    rooms.forEach(room => {
      const card = buildRoomCard(room);
      roomsGrid.appendChild(card);
      observer.observe(card);
    });

    if (rooms.length === 0) {
      roomsGrid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;padding:48px 0">No accommodations available at this time. Please contact us directly.</p>';
    }
  } catch (e) {
    console.error('Failed to load rooms:', e);
    roomsGrid.innerHTML = '<p class="text-center text-muted" style="grid-column:1/-1;padding:48px 0">Unable to load rooms. Please refresh the page or contact us directly.</p>';
  }
}

loadRooms();
