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
    completeHeadline: document.getElementById('intake-complete-headline'),
    completeLead: document.getElementById('intake-complete-lead'),
    completeNextHeading: document.getElementById('intake-complete-next-heading'),
    completeStep1Title: document.getElementById('intake-complete-step1-title'),
    completeStep1Desc: document.getElementById('intake-complete-step1-desc'),
    completeCreateAccount: document.getElementById('intake-complete-create-account'),
    completeBookCall: document.getElementById('intake-complete-book-call'),
    completeStep2Title: document.getElementById('intake-complete-step2-title'),
    completeStep2P1: document.getElementById('intake-complete-step2-p1'),
    completeStep2P2: document.getElementById('intake-complete-step2-p2'),
    completeHelpTitle: document.getElementById('intake-complete-help-title'),
    completeHelpIntro: document.getElementById('intake-complete-help-intro'),
    completeFaqTitle: document.getElementById('intake-complete-faq-title'),
    completeFaqDesc: document.getElementById('intake-complete-faq-desc'),
    completeFaqLink: document.getElementById('intake-complete-faq-link'),
    completeFaqLinkLabel: document.getElementById('intake-complete-faq-link-label'),
    completeContactTitle: document.getElementById('intake-complete-contact-title'),
    completeContactIntro: document.getElementById('intake-complete-contact-intro'),
    completeContactEmail: document.getElementById('intake-complete-contact-email'),
    completeChange: document.getElementById('intake-complete-change'),
    completeChangeLabel: document.getElementById('intake-complete-change-label'),
    intakeCard: document.getElementById('intake-card'),
    reviewPanel: document.getElementById('intake-review'),
    reviewList: document.getElementById('intake-review-list'),
    reviewEyebrow: document.getElementById('intake-review-eyebrow'),
    reviewTitle: document.getElementById('intake-review-title'),
    reviewBack: document.getElementById('intake-review-back'),
    reviewSubmit: document.getElementById('intake-review-submit'),
  };

  let flow = null;
  let stepIndex = 0;
  let answers = {};
  let completed = false;
  let reviewing = false;

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
          reviewing,
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
      if (s.reviewing === true) reviewing = true;
    } catch (_) {
      answers = {};
    }
  }

  function respondentIsCaregiver() {
    return answers['respondent-role'] === 'caregiver';
  }

  /** Merge optional step.caregiverCopy when the respondent is a caregiver (after step 1). */
  function resolveStepCopy(step) {
    const base = {
      title: step.title || '',
      subtitle: step.subtitle,
      whyAsk: step.whyAsk,
      placeholder: step.placeholder,
    };
    if (!respondentIsCaregiver()) return base;
    const c = step.caregiverCopy;
    if (!c || typeof c !== 'object') return base;
    const out = { ...base };
    if (c.title != null && String(c.title).length) out.title = c.title;
    if ('subtitle' in c) out.subtitle = c.subtitle;
    if ('whyAsk' in c) out.whyAsk = c.whyAsk;
    if (c.placeholder != null) out.placeholder = c.placeholder;
    return out;
  }

  function optionLabel(step, value) {
    if (!value) return '';
    const opt = (step.options || []).find((o) => o.value === value);
    return opt ? opt.label : value;
  }

  function formatAnswerForReview(step, answer) {
    switch (step.type) {
      case 'radio':
      case 'select': {
        const t = optionLabel(step, answer);
        let out = t || '—';
        if (
          step.type === 'radio' &&
          step.consent &&
          step.consent.id &&
          answers[step.consent.id] === true
        ) {
          const line = (step.consent.reviewLine || 'Data processing consent: Yes').trim();
          out = `${out}\n\n${line}`;
        }
        return out;
      }
      case 'text':
      case 'textarea': {
        if (typeof answer !== 'string' || !answer.trim()) return '—';
        return answer.trim();
      }
      case 'checkbox': {
        if (!Array.isArray(answer) || answer.length === 0) return '—';
        return answer
          .map((v) => optionLabel(step, v) || v)
          .filter(Boolean)
          .join(', ');
      }
      case 'contact': {
        const o = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
        const lines = [];
        (step.fields || []).forEach((f) => {
          const v = typeof o[f.id] === 'string' ? o[f.id].trim() : '';
          if (v) lines.push(`${f.label}: ${v}`);
        });
        return lines.length ? lines.join('\n') : '—';
      }
      default:
        return answer != null && String(answer).trim() ? String(answer).trim() : '—';
    }
  }

  function reviewCopy() {
    const r = flow && flow.review && typeof flow.review === 'object' ? flow.review : {};
    return {
      eyebrow: (r.eyebrow || 'Summary').trim(),
      title: (r.title || 'Review and confirm your answers').trim(),
      submitLabel: (r.submitLabel || 'Submit questionnaire').trim(),
    };
  }

  function applyReviewCopy() {
    if (!flow) return;
    const { eyebrow, title, submitLabel } = reviewCopy();
    if (el.reviewEyebrow) el.reviewEyebrow.textContent = eyebrow;
    if (el.reviewTitle) el.reviewTitle.textContent = title;
    if (el.reviewSubmit) el.reviewSubmit.textContent = submitLabel;
  }

  function renderReviewList() {
    if (!flow || !el.reviewList) return;
    const steps = flow.steps || [];
    el.reviewList.innerHTML = '';
    steps.forEach((step, i) => {
      const li = document.createElement('li');
      li.className = 'intake-review-item';
      const answerText = formatAnswerForReview(step, answers[step.id]);
      const row = document.createElement('div');
      row.className = 'intake-review-item__row';
      const heading = document.createElement('div');
      heading.className = 'intake-review-item__heading';
      const badge = document.createElement('span');
      badge.className = 'intake-review-item__badge';
      badge.setAttribute('aria-hidden', 'true');
      badge.textContent = String(i + 1);
      const copy = resolveStepCopy(step);
      const q = document.createElement('p');
      q.className = 'intake-review-item__question';
      q.textContent = copy.title || '';
      heading.appendChild(badge);
      heading.appendChild(q);
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'intake-review-item__edit';
      const editLabel = `Edit: ${(copy.title || 'Question').replace(/"/g, '')}`;
      editBtn.setAttribute('aria-label', editLabel);
      const icon = document.createElement('span');
      icon.className = 'material-symbols-outlined';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = 'edit';
      editBtn.appendChild(icon);
      editBtn.addEventListener('click', () => {
        if (!flow) return;
        reviewing = false;
        stepIndex = i;
        saveState();
        el.reviewPanel.hidden = true;
        el.activePanel.hidden = false;
        if (el.intakeCard) {
          el.intakeCard.hidden = false;
          el.intakeCard.classList.remove('intake-card--review');
        }
        el.stepLabel.hidden = false;
        renderStep();
        requestAnimationFrame(() => {
          const focusEl = document.getElementById('intake-control');
          if (focusEl && typeof focusEl.focus === 'function') focusEl.focus();
        });
      });
      row.appendChild(heading);
      row.appendChild(editBtn);
      const answer = document.createElement('div');
      answer.className = 'intake-review-item__answer';
      answer.textContent = answerText;
      li.appendChild(row);
      li.appendChild(answer);
      el.reviewList.appendChild(li);
    });
  }

  function showReview() {
    if (!flow) return;
    reviewing = true;
    saveState();
    el.activePanel.hidden = true;
    el.completePanel.hidden = true;
    if (el.reviewPanel) el.reviewPanel.hidden = false;
    if (el.intakeCard) {
      el.intakeCard.hidden = false;
      el.intakeCard.classList.add('intake-card--review');
    }
    el.stepLabel.hidden = true;
    if (flow.steps && flow.steps.length > 0) {
      el.progressFill.style.width = '100%';
      el.progress.setAttribute('aria-valuenow', String(flow.steps.length));
      el.progress.setAttribute('aria-valuemax', String(flow.steps.length));
      el.progress.setAttribute('aria-label', 'Review your answers before submitting');
    }
    applyReviewCopy();
    renderReviewList();
  }

  function validateStep(step) {
    if (!step.required) return true;
    const v = answers[step.id];
    switch (step.type) {
      case 'textarea':
      case 'text':
        return typeof v === 'string' && v.trim().length > 0;
      case 'radio':
      case 'select': {
        const ok = typeof v === 'string' && v.length > 0;
        if (!ok) return false;
        if (
          step.type === 'radio' &&
          step.consent &&
          step.consent.id &&
          step.consent.required !== false
        ) {
          return answers[step.consent.id] === true;
        }
        return true;
      }
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

  function mountInputs(step, copy) {
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
      ta.placeholder = (copy && copy.placeholder) || step.placeholder || '';
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
      if (step.inputWidth) input.classList.add(`intake-input--${step.inputWidth}`);
      input.id = 'intake-control';
      input.type = 'text';
      input.placeholder = (copy && copy.placeholder) || step.placeholder || '';
      input.value = typeof val === 'string' ? val : '';
      if (step.inputMode) input.inputMode = step.inputMode;
      if (typeof step.maxLength === 'number') input.maxLength = step.maxLength;
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
      const placeholder = (copy && copy.placeholder) || step.placeholder || 'Select…';
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
      leg.textContent = (copy && copy.title) || step.title;
      fs.appendChild(leg);
      const list = document.createElement('div');
      list.className = 'intake-options';
      (step.options || []).forEach((opt, optIndex) => {
        const label = document.createElement('label');
        label.className = 'intake-option';
        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = step.id;
        radio.value = opt.value;
        if (optIndex === 0) radio.id = 'intake-control';
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

      const consentCfg = step.consent;
      if (consentCfg && consentCfg.id && consentCfg.label) {
        const cid = consentCfg.id;
        const consentWrap = document.createElement('div');
        consentWrap.className = 'intake-consent';
        const consentLabel = document.createElement('label');
        consentLabel.className = 'intake-consent__label';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'intake-consent__input';
        cb.id = `${step.id}-${cid}`;
        cb.name = cid;
        cb.checked = answers[cid] === true;
        if (consentCfg.required !== false) cb.setAttribute('aria-required', 'true');
        cb.addEventListener('change', () => {
          if (cb.checked) answers[cid] = true;
          else delete answers[cid];
          onChange();
        });
        const consentText = document.createElement('span');
        consentText.className = 'intake-consent__text';
        consentText.textContent = consentCfg.label;
        consentLabel.appendChild(cb);
        consentLabel.appendChild(consentText);
        consentWrap.appendChild(consentLabel);
        el.inputRoot.appendChild(consentWrap);
      }
      return;
    }

    if (step.type === 'checkbox') {
      const selected = Array.isArray(val) ? new Set(val) : new Set();
      const fs = document.createElement('fieldset');
      fs.className = 'intake-fieldset';
      const leg = document.createElement('legend');
      leg.className = 'visually-hidden';
      leg.textContent = (copy && copy.title) || step.title;
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
    if (el.reviewPanel) el.reviewPanel.hidden = true;
    if (el.intakeCard) {
      el.intakeCard.hidden = false;
      el.intakeCard.classList.remove('intake-card--review');
    }
    el.stepLabel.hidden = false;

    el.stepLabel.textContent = `Question ${stepIndex + 1} of ${steps.length}`;
    const copy = resolveStepCopy(step);
    el.title.textContent = copy.title;

    if (copy.subtitle) {
      el.subtitle.textContent = copy.subtitle;
      el.subtitle.hidden = false;
    } else {
      el.subtitle.textContent = '';
      el.subtitle.hidden = true;
    }

    if (copy.whyAsk) {
      el.why.hidden = false;
      el.whyText.textContent = copy.whyAsk;
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

    mountInputs(step, copy);
    updateContinueEnabled();
  }

  function completionContent() {
    const c = flow && flow.completion ? flow.completion : {};
    const step1In = c.step1 && typeof c.step1 === 'object' ? c.step1 : {};
    const step2In = c.step2 && typeof c.step2 === 'object' ? c.step2 : {};
    const helpIn = c.help && typeof c.help === 'object' ? c.help : {};
    const faqIn = helpIn.faqCard && typeof helpIn.faqCard === 'object' ? helpIn.faqCard : {};
    const contactIn = helpIn.contactCard && typeof helpIn.contactCard === 'object' ? helpIn.contactCard : {};
    const ctaIn = step1In.cta && typeof step1In.cta === 'object' ? step1In.cta : {};
    const secondaryCtaRaw = step1In.secondaryCta;
    let secondaryCta = null;
    if (secondaryCtaRaw !== false && secondaryCtaRaw != null && typeof secondaryCtaRaw === 'object') {
      const href = typeof secondaryCtaRaw.href === 'string' ? secondaryCtaRaw.href.trim() : '';
      if (href) {
        secondaryCta = {
          label: (secondaryCtaRaw.label || 'Create account').trim(),
          href,
        };
      }
    }

    const defaultP2 =
      'If we need more information before creating your overview, we will contact you by email within one week.';
    const defaultP1 =
      'We will review your medical information and look for clinical trial options that match your medical situation. Within one week, we will let you know when your trial search overview is ready for download in your account.';

    const paragraphs =
      Array.isArray(step2In.paragraphs) && step2In.paragraphs.length > 0
        ? step2In.paragraphs
        : [defaultP1, defaultP2];

    return {
      headline: c.headline ?? c.title ?? 'Thank you!',
      lead: c.lead ?? 'We received your medical information',
      nextStepsHeading: c.nextStepsHeading ?? 'Next steps:',
      step1: {
        title: step1In.title ?? 'Create your myTomorrows account',
        description:
          step1In.description ??
          'Create your account to check your status, stay on top of your next steps, view and edit your medical information.',
        cta: {
          label: ctaIn.label ?? 'Book a call',
          href: ctaIn.href ?? 'book-a-call.html',
        },
        secondaryCta,
      },
      step2: {
        title: step2In.title ?? 'Receive overview of clinical trial options',
        paragraphs,
      },
      help: {
        title: helpIn.title ?? 'Need help?',
        intro:
          helpIn.intro ?? 'Find answers in our FAQs or reach out to us directly.',
        faqCard: {
          title: faqIn.title ?? 'FAQs',
          description:
            faqIn.description ??
            "We've combined some of our most asked questions to help you.",
          linkLabel: faqIn.linkLabel ?? 'Read FAQs',
          href: faqIn.href ?? 'https://www.mytomorrows.com/',
        },
        contactCard: {
          title: contactIn.title ?? 'Contact us',
          intro:
            contactIn.intro ??
            'If you have any questions or need more information, send an email to:',
          email: contactIn.email ?? 'patientnavigation@mytomorrows.com',
        },
      },
      changeResponses: c.changeResponses,
    };
  }

  function createAccountHref(baseHref) {
    try {
      const u = new URL(baseHref, window.location.href);
      const contact = answers.contact;
      if (contact && typeof contact === 'object' && typeof contact.name === 'string') {
        const raw = contact.name.trim();
        if (raw) {
          const first = raw.split(/\s+/)[0];
          u.searchParams.set('first', first);
          u.searchParams.set('name', raw);
        }
      }
      return u.pathname + u.search + u.hash;
    } catch (_) {
      return baseHref;
    }
  }

  function applyCompletionContent() {
    if (!flow) return;
    const x = completionContent();
    if (el.completeHeadline) el.completeHeadline.textContent = x.headline;
    if (el.completeLead) el.completeLead.textContent = x.lead;
    if (el.completeNextHeading) el.completeNextHeading.textContent = x.nextStepsHeading;
    if (el.completeStep1Title) el.completeStep1Title.textContent = x.step1.title;
    if (el.completeStep1Desc) el.completeStep1Desc.textContent = x.step1.description;
    if (el.completeBookCall) {
      el.completeBookCall.href = createAccountHref(x.step1.cta.href);
      el.completeBookCall.textContent = x.step1.cta.label;
    }
    if (el.completeCreateAccount) {
      const sec = x.step1.secondaryCta;
      if (sec && sec.href) {
        el.completeCreateAccount.hidden = false;
        el.completeCreateAccount.href = createAccountHref(sec.href);
        el.completeCreateAccount.textContent = sec.label;
      } else {
        el.completeCreateAccount.hidden = true;
      }
    }
    if (el.completeStep2Title) el.completeStep2Title.textContent = x.step2.title;
    if (el.completeStep2P1) {
      el.completeStep2P1.textContent = x.step2.paragraphs[0] || '';
      el.completeStep2P1.hidden = !x.step2.paragraphs[0];
    }
    if (el.completeStep2P2) {
      const p2 = x.step2.paragraphs[1];
      el.completeStep2P2.textContent = p2 || '';
      el.completeStep2P2.hidden = !p2;
    }
    if (el.completeHelpTitle) el.completeHelpTitle.textContent = x.help.title;
    if (el.completeHelpIntro) el.completeHelpIntro.textContent = x.help.intro;
    if (el.completeFaqTitle) el.completeFaqTitle.textContent = x.help.faqCard.title;
    if (el.completeFaqDesc) el.completeFaqDesc.textContent = x.help.faqCard.description;
    if (el.completeFaqLink) el.completeFaqLink.href = x.help.faqCard.href;
    if (el.completeFaqLinkLabel) el.completeFaqLinkLabel.textContent = x.help.faqCard.linkLabel;
    if (el.completeContactTitle) el.completeContactTitle.textContent = x.help.contactCard.title;
    if (el.completeContactIntro) el.completeContactIntro.textContent = x.help.contactCard.intro;
    const email = x.help.contactCard.email;
    if (el.completeContactEmail) {
      el.completeContactEmail.textContent = email;
      el.completeContactEmail.href = `mailto:${email}`;
    }
    if (el.completeChange) {
      const cr =
        x.changeResponses && typeof x.changeResponses === 'object' ? x.changeResponses : {};
      const showChange = x.changeResponses !== false;
      el.completeChange.hidden = !showChange;
      if (el.completeChangeLabel) {
        el.completeChangeLabel.textContent = (cr.label || 'Change your responses').trim();
      }
    }
  }

  function leaveCompletionAndEdit() {
    if (!flow) return;
    completed = false;
    reviewing = false;
    stepIndex = 0;
    saveState();
    el.completePanel.hidden = true;
    if (el.intakeCard) el.intakeCard.hidden = false;
    el.activePanel.hidden = false;
    if (el.reviewPanel) el.reviewPanel.hidden = true;
    if (el.intakeCard) el.intakeCard.classList.remove('intake-card--review');
    renderStep();
    requestAnimationFrame(() => {
      const focusEl = document.getElementById('intake-control');
      if (focusEl && typeof focusEl.focus === 'function') focusEl.focus();
    });
  }

  function showComplete() {
    completed = true;
    reviewing = false;
    saveState();
    el.activePanel.hidden = true;
    el.completePanel.hidden = false;
    if (el.reviewPanel) el.reviewPanel.hidden = true;
    if (el.intakeCard) {
      el.intakeCard.hidden = true;
      el.intakeCard.classList.remove('intake-card--review');
    }
    applyCompletionContent();
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

    if (reviewing) {
      if (stepIndex !== flow.steps.length - 1) {
        reviewing = false;
        saveState();
      } else {
        showReview();
        return;
      }
    }

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
        showReview();
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
        showReview();
      }
    });

    if (el.reviewBack) {
      el.reviewBack.addEventListener('click', () => {
        if (!flow || completed || !reviewing) return;
        reviewing = false;
        stepIndex = Math.max(0, flow.steps.length - 1);
        saveState();
        renderStep();
      });
    }

    if (el.reviewSubmit) {
      el.reviewSubmit.addEventListener('click', () => {
        if (!flow || completed || !reviewing) return;
        showComplete();
      });
    }

    if (el.completeChange) {
      el.completeChange.addEventListener('click', () => {
        leaveCompletionAndEdit();
      });
    }
  }

  init();
})();
