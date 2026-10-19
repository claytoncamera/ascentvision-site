// The application on /work-with-us/: one question at a time, Back/Next/Skip, number keys pick chips, and the answers
// survive a refresh (sessionStorage, cleared on send). forms.js owns attribution and the final POST to HQ; this file only
// decides which step is visible. Without JavaScript every step is visible and the form posts the ordinary way.
const form = document.querySelector('form[data-apply]');

if (form) {
  const $ = (sel) => form.querySelector(sel);
  const $$ = (sel) => [...form.querySelectorAll(sel)];
  const KEY = 'av_apply';
  const steps = $$('[data-step]');
  const top = $('[data-apply-top]');
  const bar = $$('[data-apply-bar] li');
  const count = $('[data-apply-count]');
  const nav = $('[data-apply-nav]');
  const back = $('[data-apply-back]');
  const next = $('[data-apply-next]');
  const nextLabel = $('[data-apply-next-label]');
  const need = $('[data-apply-need]');
  const send = $('.apply__send');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0;

  const fields = (step) => [...step.querySelectorAll('input:not([type=hidden]), textarea')];
  const answered = (step) =>
    fields(step).some((el) => (el.type === 'checkbox' || el.type === 'radio' ? el.checked : el.value.trim()));
  const requiredDone = (step) =>
    step.hasAttribute('data-required') &&
    fields(step).every((el) => {
      if (!el.required) return true;
      if (el.type === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(el.value.trim());
      return Boolean(el.value.trim());
    }) &&
    (step.dataset.step !== 'needs' || answered(step));
  const ready = (step) => (step.hasAttribute('data-required') ? requiredDone(step) : true);

  // ---- remember answers across a refresh (this tab only) ------------------------------------------------------
  const save = () => {
    try {
      const data = {};
      for (const el of $$('input:not([type=hidden]), textarea')) {
        if (el.name === 'company') continue; // honeypot
        if (el.type === 'checkbox' || el.type === 'radio') { if (el.checked) (data[el.name] ||= []).push(el.value); }
        else if (el.value) data[el.name] = el.value;
      }
      sessionStorage.setItem(KEY, JSON.stringify({ idx, data }));
    } catch {}
  };
  const restore = () => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) || 'null');
      if (!saved) return;
      for (const el of $$('input:not([type=hidden]), textarea')) {
        const v = saved.data[el.name];
        if (v === undefined) continue;
        if (el.type === 'checkbox' || el.type === 'radio') el.checked = v.includes(el.value);
        else el.value = v;
      }
      idx = Math.min(Number(saved.idx) || 0, steps.length - 1);
    } catch {}
  };
  const forget = () => { try { sessionStorage.removeItem(KEY); } catch {} };

  // ---- showing one step ---------------------------------------------------------------------------------------
  const show = (i, focus = true) => {
    idx = Math.max(0, Math.min(i, steps.length - 1));
    const last = idx === steps.length - 1;
    steps.forEach((s, j) => {
      s.hidden = j !== idx;
      s.classList.toggle('is-active', j === idx);
    });
    bar.forEach((li, j) => { li.classList.toggle('is-done', j < idx); li.classList.toggle('is-now', j === idx); });
    count.textContent = `Question ${idx + 1} of ${steps.length}`;
    top.hidden = false;
    nav.hidden = last;
    send.hidden = !last;
    back.hidden = idx === 0;
    updateNext();
    if (focus) {
      const h = steps[idx].querySelector('.aq');
      h?.focus({ preventScroll: true });
      if (!reduced) steps[idx].scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
    save();
  };
  const updateNext = () => {
    const s = steps[idx];
    const required = s.hasAttribute('data-required');
    const ok = ready(s);
    const has = answered(s);
    next.disabled = required && !ok;
    nextLabel.textContent = required || has ? 'Next' : 'Skip';
    next.classList.toggle('btn--primary', required || has);
    next.classList.toggle('btn--ghost', !(required || has));
    need.textContent = required && !ok ? (s.dataset.step === 'needs' ? 'Pick at least one to continue.' : 'This one is required.') : '';
  };

  // ---- wiring -------------------------------------------------------------------------------------------------
  next.addEventListener('click', () => show(idx + 1));
  back.addEventListener('click', () => show(idx - 1));
  form.addEventListener('input', () => { updateNext(); save(); });
  form.addEventListener('change', (e) => {
    updateNext();
    save();
    // A single-choice question moves on by itself after a short beat.
    if (steps[idx].hasAttribute('data-auto') && e.target.type === 'radio') setTimeout(() => show(idx + 1), reduced ? 0 : 260);
  });
  form.addEventListener('keydown', (e) => {
    const t = e.target;
    const typing = t.matches('input[type=text], input[type=email], input[type=tel], input[type=url], textarea');
    if (e.key === 'Enter' && typing && !t.matches('textarea') && idx < steps.length - 1) {
      e.preventDefault();
      if (!next.disabled) show(idx + 1);
      return;
    }
    if (!typing && /^[1-9]$/.test(e.key)) {
      const chip = steps[idx].querySelectorAll('.achip input')[Number(e.key) - 1];
      if (chip) { chip.checked = chip.type === 'radio' ? true : !chip.checked; chip.dispatchEvent(new Event('change', { bubbles: true })); }
    }
  });
  // forms.js validates and posts; when it sends the visitor to the thanks page, the saved answers go with it.
  form.addEventListener('submit', () => {
    // If a required step was skipped by editing the DOM, go there instead of posting a half application.
    const bad = steps.findIndex((s) => s.hasAttribute('data-required') && !requiredDone(s));
    if (bad >= 0 && bad !== idx) show(bad);
  });
  form.addEventListener('av:sent', forget);

  restore();
  show(idx, false);
}
