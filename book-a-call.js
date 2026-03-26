(function () {
  const BOOKING_KEY = 'novo-book-call-booking';

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

  /** Mock slots — prototype only */
  const SLOTS = [
    '7:00 am',
    '7:30 am',
    '8:00 am',
    '8:30 am',
    '9:00 am',
    '9:30 am',
    '10:00 am',
    '10:30 am',
    '11:00 am',
    '11:30 am',
    '12:00 pm',
    '12:30 pm',
    '1:00 pm',
    '1:30 pm',
    '2:00 pm',
    '2:30 pm',
    '3:00 pm',
    '3:30 pm',
    '4:00 pm',
  ];

  let viewYear;
  let viewMonthIndex;
  let selectedY;
  let selectedM;
  let selectedD;
  /** @type {string | null} */
  let selectedSlot = null;

  const grid = document.getElementById('book-cal-grid');
  const monthLabel = document.getElementById('book-month-label');
  const prevBtn = document.getElementById('book-prev-month');
  const nextBtn = document.getElementById('book-next-month');
  const showingEl = document.getElementById('book-showing-times');
  const slotsRoot = document.getElementById('book-slots');
  const live = document.getElementById('book-selection-live');
  const tzToggle = document.getElementById('book-tz-toggle');
  const tzNote = document.getElementById('book-tz-note');
  const cancelBtn = document.getElementById('book-cancel');
  const submitBtn = document.getElementById('book-submit');

  function formatShowing(y, m, d) {
    return `Showing times for ${MONTH_NAMES[m]} ${d}, ${y}`;
  }

  function sameDay(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function updateSubmitEnabled() {
    if (submitBtn) submitBtn.disabled = !selectedSlot;
  }

  function renderSlots() {
    slotsRoot.innerHTML = '';
    SLOTS.forEach((label) => {
      const li = document.createElement('li');
      li.className = 'book-scheduler__slots-item';
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'book-scheduler__slot';
      btn.textContent = label;
      if (selectedSlot === label) {
        btn.classList.add('book-scheduler__slot--selected');
      }
      btn.addEventListener('click', () => {
        slotsRoot.querySelectorAll('.book-scheduler__slot').forEach((b) => b.classList.remove('book-scheduler__slot--selected'));
        btn.classList.add('book-scheduler__slot--selected');
        selectedSlot = label;
        updateSubmitEnabled();
        const when = `${MONTH_NAMES[selectedM]} ${selectedD}, ${selectedY} at ${label}`;
        if (live) live.textContent = `Selected ${when}.`;
      });
      li.appendChild(btn);
      slotsRoot.appendChild(li);
    });
    updateSubmitEnabled();
  }

  function renderCalendar() {
    grid.innerHTML = '';
    const first = new Date(viewYear, viewMonthIndex, 1);
    const last = new Date(viewYear, viewMonthIndex + 1, 0);
    const startPad = first.getDay();
    const daysInMonth = last.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < startPad; i++) {
      const cell = document.createElement('div');
      cell.className = 'book-scheduler__cell book-scheduler__cell--empty';
      cell.setAttribute('aria-hidden', 'true');
      grid.appendChild(cell);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'book-scheduler__day';
      cell.textContent = String(d);
      cell.setAttribute('role', 'gridcell');
      const thisDate = new Date(viewYear, viewMonthIndex, d);
      if (sameDay(thisDate, new Date(selectedY, selectedM, selectedD))) {
        cell.classList.add('book-scheduler__day--selected');
        cell.setAttribute('aria-selected', 'true');
      } else {
        cell.setAttribute('aria-selected', 'false');
      }
      if (thisDate < today) {
        cell.disabled = true;
        cell.classList.add('book-scheduler__day--past');
      }
      cell.addEventListener('click', () => {
        selectedY = viewYear;
        selectedM = viewMonthIndex;
        selectedD = d;
        selectedSlot = null;
        if (showingEl) showingEl.textContent = formatShowing(selectedY, selectedM, selectedD);
        renderCalendar();
        renderSlots();
        if (live) live.textContent = '';
      });
      grid.appendChild(cell);
    }

    if (monthLabel) monthLabel.textContent = `${MONTH_NAMES[viewMonthIndex]} ${viewYear}`;
    if (showingEl) showingEl.textContent = formatShowing(selectedY, selectedM, selectedD);
  }

  function persistBookingAndGo() {
    if (!selectedSlot) return;
    try {
      sessionStorage.setItem(
        BOOKING_KEY,
        JSON.stringify({
          y: selectedY,
          m: selectedM,
          d: selectedD,
          time: selectedSlot,
        })
      );
    } catch (_) {
      /* ignore */
    }
    window.location.href = 'book-call-confirmed.html';
  }

  function init() {
    const now = new Date();
    viewYear = now.getFullYear();
    viewMonthIndex = now.getMonth();
    selectedY = viewYear;
    selectedM = viewMonthIndex;
    selectedD = now.getDate();

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        viewMonthIndex -= 1;
        if (viewMonthIndex < 0) {
          viewMonthIndex = 11;
          viewYear -= 1;
        }
        renderCalendar();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        viewMonthIndex += 1;
        if (viewMonthIndex > 11) {
          viewMonthIndex = 0;
          viewYear += 1;
        }
        renderCalendar();
      });
    }

    if (tzToggle && tzNote) {
      tzToggle.addEventListener('click', () => {
        const open = tzNote.hidden;
        tzNote.hidden = !open;
        tzToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        window.location.href = 'questionnaire.html';
      });
    }

    if (submitBtn) {
      submitBtn.addEventListener('click', persistBookingAndGo);
    }

    renderSlots();
    renderCalendar();
  }

  if (grid && monthLabel) init();
})();
