(function () {
  const STORAGE_KEY = 'novo-intake-state';

  const el = {
    sidebarTitle: document.getElementById('intake-sidebar-title'),
    sidebarSubtitle: document.getElementById('intake-sidebar-subtitle'),
    stepLabel: document.getElementById('intake-step-label'),
    title: document.getElementById('intake-title'),
    subtitle: document.getElementById('intake-subtitle'),
    why: document.getElementById('intake-why'),
    whyText: document.getElementById('intake-why-text'),
    inputRoot: document.getElementById('intake-input-root'),
    back: document.getElementById('intake-back'),
    skip: document.getElementById('intake-skip'),
    continueBtn: document.getElementById('intake-continue'),
    secureNote: document.getElementById('intake-secure-note'),
    progress: document.getElementById('intake-progress'),
    progressFill: document.getElementById('intake-progress-fill'),
    activePanel: document.getElementById('intake-active-panel'),
    completePanel: document.getElementById('intake-complete'),
    completeTitle: document.getElementById('intake-complete-title'),
    completeBody: document.getElementById('intake-complete-body'),
  };

  let flow = null;
  let stepIndex = 0;
  let answers = {};
  let completed = false;

  function saveState() {
    if (!flow) return;
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          flowId: flow.flowId,
          stepIndex,
          answers,
          completed,
        })
      );
    } catch (_) {
      /* ignore quota / private mode */
    }
  }

  function loadStoredState(flowData) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s.flowId !== flowData.flowId) return;
      answers = s.answers && typeof s.answers === 'object' ? { ...s.answers } : {};
      if (typeof s.stepIndex === 'number' && s.stepIndex >= 0) stepIndex = s.stepIndex;
      if (s.completed === true) completed = true;
    } catch (_) {
      answers = {};
    }
  }

  function validateStep(step) {
    if (!step.required) return true;
    const v = answers[step.id];
    switch (step.type) {
      case 'textarea':
      case 'text':
        return typeof v === 'string' && v.trim().length > 0;
      case 'radio':
      case 'select':
        return typeof v === 'string' && v.length > 0;
      case 'checkbox':
        return Array.isArray(v) && v.length > 0;
      case 'contact': {
        const o = answers[step.id];
        if (!step.required) return true;
        if (!o || typeof o !== 'object') return false;
        return (step.fields || []).every(
          (f) => typeof o[f.id] === 'string' && o[f.id].trim().length > 0
        );
      }
      default:
        return true;
    }
  }

  function updateContinueEnabled() {
    if (!flow) return;
    const step = flow.steps[stepIndex];
    if (!step) return;
    el.continueBtn.disabled = !validateStep(step);
  }

  function mountInputs(step) {
    el.inputRoot.innerHTML = '';
    const val = answers[step.id];

    function onChange() {
      saveState();
      updateContinueEnabled();
    }

    function ensureContactAnswers() {
      let o = answers[step.id];
      if (!o || typeof o !== 'object' || Array.isArray(o)) o = {};
      (step.fields || []).forEach((f) => {
        if (typeof o[f.id] !== 'string') o[f.id] = '';
      });
      answers[step.id] = o;
      return o;
    }

    if (step.type === 'contact') {
      const contact = ensureContactAnswers();
      const wrap = document.createElement('div');
      wrap.className = 'intake-contact';
      (step.fields || []).forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'intake-contact__field';
        const fieldId = i === 0 ? 'intake-control' : `${step.id}-${f.id}`;
        const lab = document.createElement('label');
        lab.className = 'intake-contact__label';
        lab.htmlFor = fieldId;
        lab.textContent = f.label;
        const input = document.createElement('input');
        input.className = 'intake-input';
        input.id = fieldId;
        input.type = f.inputType || 'text';
        input.placeholder = f.placeholder || '';
        input.value = contact[f.id] || '';
        if (f.inputMode) input.inputMode = f.inputMode;
        if (f.autocomplete) input.autocomplete = f.autocomplete;
        input.addEventListener('input', () => {
          contact[f.id] = input.value;
          onChange();
        });
        row.appendChild(lab);
        row.appendChild(input);
        wrap.appendChild(row);
      });
      el.inputRoot.appendChild(wrap);
      return;
    }

    if (step.type === 'textarea') {
      const ta = document.createElement('textarea');
      ta.className = 'intake-input intake-input--textarea';
      ta.id = 'intake-control';
      ta.rows = step.rows || 5;
      ta.placeholder = step.placeholder || '';
      ta.value = typeof val === 'string' ? val : '';
      ta.addEventListener('input', () => {
        answers[step.id] = ta.value;
        onChange();
      });
      el.inputRoot.appendChild(ta);
      return;
    }

    if (step.type === 'text') {
      const input = document.createElement('input');
      input.className = 'intake-input';
      input.id = 'intake-control';
      input.type = 'text';
      input.placeholder = step.placeholder || '';
      input.value = typeof val === 'string' ? val : '';
      if (step.inputMode) input.inputMode = step.inputMode;
      if (step.pattern) input.pattern = step.pattern;
      input.addEventListener('input', () => {
        answers[step.id] = input.value;
        onChange();
      });
      el.inputRoot.appendChild(input);
      return;
    }

    if (step.type === 'select') {
      const opts = step.options || [];
      const validValues = new Set(opts.map((o) => o.value));
      const initial =
        typeof val === 'string' && validValues.has(val) ? val : '';
      const select = document.createElement('select');
      select.className = 'intake-input intake-input--select';
      select.id = 'intake-control';
      const placeholder = step.placeholder || 'Select…';
      const opt0 = document.createElement('option');
      opt0.value = '';
      opt0.textContent = placeholder;
      select.appendChild(opt0);
      opts.forEach((opt) => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.label;
        if (initial === opt.value) o.selected = true;
        select.appendChild(o);
      });
      if (!initial) select.selectedIndex = 0;
      select.addEventListener('change', () => {
        answers[step.id] = select.value;
        onChange();
      });
      el.inputRoot.appendChild(select);
      return;
    }

    if (step.type === 'radio') {
      const fs = document.createElement('fieldset');
      fs.className = 'intake-fieldset';
      const leg = document.createElement('legend');
      leg.className = 'visually-hidden';
      leg.textContent = step.title;
      fs.appendChild(leg);
      const list = document.createElement('div');
      list.className = 'intake-options';
      (step.options || []).forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'intake-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = step.id;
        radio.value = opt.value;
        radio.checked = val === opt.value;
        radio.addEventListener('change', () => {
          answers[step.id] = radio.value;
          onChange();
        });
        const span = document.createElement('span');
        span.textContent = opt.label;
        label.appendChild(radio);
        label.appendChild(span);
        list.appendChild(label);
      });
      fs.appendChild(list);
      el.inputRoot.appendChild(fs);
      return;
    }

    if (step.type === 'checkbox') {
      const selected = Array.isArray(val) ? new Set(val) : new Set();
      const fs = document.createElement('fieldset');
      fs.className = 'intake-fieldset';
      const leg = document.createElement('legend');
      leg.className = 'visually-hidden';
      leg.textContent = step.title;
      fs.appendChild(leg);
      const list = document.createElement('div');
      list.className = 'intake-options';
      (step.options || []).forEach((opt) => {
        const label = document.createElement('label');
        label.className = 'intake-option';
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.value = opt.value;
        box.checked = selected.has(opt.value);
        box.addEventListener('change', () => {
          const next = new Set(
            Array.isArray(answers[step.id]) ? answers[step.id] : []
          );
          if (box.checked) next.add(opt.value);
          else next.delete(opt.value);
          answers[step.id] = Array.from(next);
          onChange();
        });
        const span = document.createElement('span');
        span.textContent = opt.label;
        label.appendChild(box);
        label.appendChild(span);
        list.appendChild(label);
      });
      fs.appendChild(list);
      el.inputRoot.appendChild(fs);
      return;
    }
  }

  function renderStep() {
    if (!flow || completed) return;
    const steps = flow.steps;
    const step = steps[stepIndex];
    if (!step) return;

    el.activePanel.hidden = false;
    el.completePanel.hidden = true;

    el.stepLabel.textContent = `Question ${stepIndex + 1} of ${steps.length}`;
    el.title.textContent = step.title;

    if (step.subtitle) {
      el.subtitle.textContent = step.subtitle;
      el.subtitle.hidden = false;
    } else {
      el.subtitle.textContent = '';
      el.subtitle.hidden = true;
    }

    if (step.whyAsk) {
      el.why.hidden = false;
      el.whyText.textContent = step.whyAsk;
      el.why.open = false;
    } else {
      el.why.hidden = true;
    }

    el.skip.hidden = !step.showSkip;
    el.back.disabled = stepIndex === 0;

    const pct = ((stepIndex + 1) / steps.length) * 100;
    el.progressFill.style.width = pct + '%';
    el.progress.setAttribute('aria-valuenow', String(stepIndex + 1));
    el.progress.setAttribute('aria-valuemax', String(steps.length));
    el.progress.setAttribute('aria-label', `Question ${stepIndex + 1} of ${steps.length}`);

    mountInputs(step);
    updateContinueEnabled();
  }

  function showComplete() {
    completed = true;
    saveState();
    el.activePanel.hidden = true;
    el.completePanel.hidden = false;
    el.completeTitle.textContent = flow.completionTitle || 'Thank you';
    el.completeBody.textContent = flow.completionBody || '';
    if (flow && flow.steps && flow.steps.length > 0) {
      el.progressFill.style.width = '100%';
      el.progress.setAttribute('aria-valuenow', String(flow.steps.length));
      el.progress.setAttribute('aria-valuemax', String(flow.steps.length));
    }
  }

  function bindFlow(data) {
    flow = data;
    el.sidebarTitle.textContent = flow.sidebarTitle || '';
    el.sidebarSubtitle.textContent = flow.sidebarSubtitle || '';
    el.secureNote.textContent = flow.secureNote || '';

    loadStoredState(flow);

    if (completed) {
      showComplete();
      return;
    }

    if (stepIndex < 0 || stepIndex >= flow.steps.length) stepIndex = 0;

    renderStep();
  }

  function init() {
    fetch('questionnaire.json')
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(bindFlow)
      .catch(() => {
        el.title.textContent = 'Unable to load questionnaire';
        el.subtitle.textContent =
          'Open this page through a local web server (so questionnaire.json can load), or check the file path.';
        el.subtitle.hidden = false;
        el.inputRoot.innerHTML = '';
        el.continueBtn.disabled = true;
      });

    el.back.addEventListener('click', () => {
      if (!flow || completed || stepIndex <= 0) return;
      stepIndex -= 1;
      saveState();
      renderStep();
    });

    el.skip.addEventListener('click', () => {
      if (!flow || completed) return;
      const step = flow.steps[stepIndex];
      if (!step || !step.showSkip) return;
      if (step.skipClearsAnswer) delete answers[step.id];
      if (stepIndex < flow.steps.length - 1) {
        stepIndex += 1;
        saveState();
        renderStep();
      } else {
        showComplete();
      }
    });

    el.continueBtn.addEventListener('click', () => {
      if (!flow || completed) return;
      const step = flow.steps[stepIndex];
      if (!step || !validateStep(step)) return;
      if (stepIndex < flow.steps.length - 1) {
        stepIndex += 1;
        saveState();
        renderStep();
      } else {
        showComplete();
      }
    });
  }

  init();
})();
