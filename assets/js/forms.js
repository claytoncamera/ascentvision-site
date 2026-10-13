// Forms: attribution (last non-direct touch + first touch) and submit with a no-JS fallback.
// Attribution: the first landing of the visit (UTMs, referrer, page) is kept in sessionStorage and the very first
// visit in localStorage, then copied into the hidden fields of any form on submit.
document.documentElement.classList.add('js');

const KEY = 'av_touch';
const store = (s) => { try { return s(); } catch { return null; } };
const params = new URLSearchParams(location.search);
const touch = {
  utm_source: params.get('utm_source') || '',
  utm_medium: params.get('utm_medium') || '',
  utm_campaign: params.get('utm_campaign') || '',
  utm_term: params.get('utm_term') || '',
  utm_content: params.get('utm_content') || '',
  referrer: document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : '',
  landing: location.pathname,
  at: new Date().toISOString(),
};
// Last non-direct touch wins: a visit that carries UTMs or an outside referrer replaces the stored one; a plain
// internal page view never overwrites a tagged one.
const tagged = (t) => Boolean(t && (t.utm_source || t.utm_medium || t.utm_campaign || t.referrer));
const session = store(() => JSON.parse(sessionStorage.getItem(KEY) || 'null'));
if (!session || tagged(touch)) store(() => sessionStorage.setItem(KEY, JSON.stringify(touch)));
if (!store(() => localStorage.getItem(KEY + '_first'))) store(() => localStorage.setItem(KEY + '_first', JSON.stringify(touch)));

function fillSource(form) {
  const s = store(() => JSON.parse(sessionStorage.getItem(KEY) || 'null')) || touch;
  const first = store(() => localStorage.getItem(KEY + '_first')) || '';
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'referrer', 'landing'])
    if (form.elements[k]) form.elements[k].value = s[k] || '';
  if (form.elements.first_touch) form.elements.first_touch.value = first;
}

// ---- submit ------------------------------------------------------------------
function initSubmit(form) {
  const err = form.querySelector('.form__error');
  form.addEventListener('submit', async (e) => {
    fillSource(form);
    const missing = [...form.querySelectorAll('[required]')].find((el) => !el.value.trim());
    if (missing) {
      e.preventDefault();
      err.textContent = 'Please fill in your ' + (missing.closest('label')?.querySelector('span')?.textContent || 'details').toLowerCase() + '.';
      err.hidden = false;
      missing.focus();
      return;
    }
    e.preventDefault();
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    const body = new URLSearchParams(new FormData(form));
    try {
      const res = await fetch(form.action, { method: 'POST', body, headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      location.href = form.elements.return.value;
    } catch {
      btn.disabled = false;
      err.textContent = 'That did not go through. Check your connection and try again.';
      err.hidden = false;
    }
  });
}

for (const form of document.querySelectorAll('form[data-form]')) {
  initSubmit(form);
}
