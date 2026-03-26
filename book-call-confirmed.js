(function () {
  const BOOKING_KEY = 'novo-book-call-booking';
  const INTAKE_KEY = 'novo-intake-state';

  const MONTH_NAMES = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  function formatDate(y, m, d) {
    return `${MONTH_NAMES[m]} ${d}, ${y}`;
  }

  function getPhoneFromIntake() {
    try {
      const raw = sessionStorage.getItem(INTAKE_KEY);
      if (!raw) return '';
      const s = JSON.parse(raw);
      const phone = s.answers && s.answers.contact && s.answers.contact.phone;
      return typeof phone === 'string' ? phone.trim() : '';
    } catch (_) {
      return '';
    }
  }

  function createAccountHref(baseHref) {
    try {
      const u = new URL(baseHref, window.location.href);
      const raw = sessionStorage.getItem(INTAKE_KEY);
      if (!raw) return baseHref;
      const s = JSON.parse(raw);
      const contact = s.answers && s.answers.contact;
      if (contact && typeof contact === 'object' && typeof contact.name === 'string') {
        const rawName = contact.name.trim();
        if (rawName) {
          const first = rawName.split(/\s+/)[0];
          u.searchParams.set('first', first);
          u.searchParams.set('name', rawName);
        }
      }
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return baseHref;
    }
  }

  function parseBooking(raw) {
    if (!raw) return null;
    const b = JSON.parse(raw);
    if (
      typeof b.y !== 'number' ||
      typeof b.m !== 'number' ||
      typeof b.d !== 'number' ||
      typeof b.time !== 'string'
    ) {
      return null;
    }
    return b;
  }

  function loadBooking() {
    try {
      const fromSession = parseBooking(sessionStorage.getItem(BOOKING_KEY));
      if (fromSession) return fromSession;
      return parseBooking(localStorage.getItem(BOOKING_KEY));
    } catch (_) {
      return null;
    }
  }

  const dateEl = document.getElementById('book-confirm-date');
  const timeEl = document.getElementById('book-confirm-time');
  const phoneEl = document.getElementById('book-confirm-phone');
  const cta = document.getElementById('book-confirm-create-account');

  const booking = loadBooking();
  if (!booking) {
    window.location.replace('book-a-call.html');
    return;
  }

  const phone = getPhoneFromIntake();
  const phoneDisplay = phone || 'the phone number you provided';

  if (dateEl) dateEl.textContent = formatDate(booking.y, booking.m, booking.d);
  if (timeEl) timeEl.textContent = booking.time;
  if (phoneEl) phoneEl.textContent = phoneDisplay;

  if (cta) {
    cta.href = createAccountHref('patient-home.html');
  }
})();
