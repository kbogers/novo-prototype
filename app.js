(function () {
  /* Landing page: drop persisted intake so the questionnaire always starts blank after returning here. */
  try {
    sessionStorage.removeItem('novo-intake-state');
  } catch (_) {
    /* ignore private mode / quota */
  }

  const tabs = document.querySelectorAll('.role-tab[data-panel]');
  const panels = document.querySelectorAll('.role-panel[data-panel-id]');

  function setPanel(role) {
    tabs.forEach((tab) => {
      const active = tab.dataset.panel === role;
      tab.classList.toggle('role-tab--active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
    });

    panels.forEach((panel) => {
      const match = panel.dataset.panelId === role;
      panel.hidden = !match;
    });
  }

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setPanel(tab.dataset.panel);
    });
  });

  /** Scroll to first matching section inside the visible panel */
  function scrollToSection(key) {
    const visible = document.querySelector('.role-panel:not([hidden])');
    if (!visible) return;
    const target = visible.querySelector(`[data-scroll-section="${key}"]`);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  document.querySelectorAll('[data-scroll-target]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const key = link.getAttribute('data-scroll-target');
      if (key) scrollToSection(key);
    });
  });

  document.querySelectorAll('.trial-card__row').forEach((row) => {
    row.addEventListener('click', (e) => {
      const href = row.getAttribute('href');
      if (!href || href === '#') e.preventDefault();
    });
  });
})();
