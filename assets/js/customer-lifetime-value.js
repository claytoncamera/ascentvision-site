// Customer lifetime value calculator. Runs in the browser: the numbers typed are not stored or sent anywhere, and there is no
// form to submit. The page prints a worked example as plain HTML, so it reads the same without this script; the script only
// recomputes the results as the numbers change.
//
// The formulas, as the page states them in words:
//   lifetime revenue          = average sale x purchases a year x years a customer stays
//   lifetime margin           = lifetime revenue x margin
//   with referrals            = lifetime margin x (1 + share of customers who send one more customer)   [one round only]
//   most to spend per customer = (lifetime margin, with referrals if given) / target return
//   per inquiry               = most to spend per customer x close rate

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const bad = (error) => ({ ok: false, error });

export const EXAMPLE = { sale: 300, purchases: 4, years: 3, margin: 40, referral: 20, target: 3, close: 25 };

/** { sale, purchases, years, margin (percent), referral (percent, optional), target, close (percent) } -> result or error. */
export function clv(input = {}) {
  const sale = num(input.sale);
  const purchases = num(input.purchases);
  const years = num(input.years);
  const margin = num(input.margin);
  const referral = input.referral === '' || input.referral == null ? 0 : num(input.referral);
  const target = num(input.target);
  const close = num(input.close);
  if (!(sale > 0)) return bad('Enter the average sale, in dollars.');
  if (!(purchases > 0)) return bad('Enter how many times a typical customer buys in a year (above 0).');
  if (!(years > 0)) return bad('Enter how many years a typical customer stays (above 0; a one-off customer is 1).');
  if (!(margin > 0 && margin <= 100)) return bad('Enter your margin as a percent, above 0 and up to 100.');
  if (!(referral >= 0 && referral <= 100)) return bad('Enter the referral share as a percent, 0 to 100, or leave it at 0.');
  if (!(target > 0)) return bad('Enter the target return (margin dollars back for each dollar spent), above 0. 1 is break-even.');
  if (!(close >= 0 && close <= 100)) return bad('Enter your close rate as a percent, 0 to 100.');
  const revenue = sale * purchases * years;
  const lifetimeMargin = (revenue * margin) / 100;
  const withReferrals = lifetimeMargin * (1 + referral / 100);
  const maxSpend = withReferrals / target;
  return {
    ok: true,
    revenue,
    lifetimeMargin,
    referral,
    withReferrals,
    maxSpend,
    perInquiry: (maxSpend * close) / 100,
    target,
    close,
  };
}

export const money = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
export const pct = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%');

/** The result as the page shows it: [data-out name, text] pairs. Shared by the build (worked example) and the browser. */
export function cells(r) {
  return [
    ['revenue', money(r.revenue)],
    ['margin', money(r.lifetimeMargin)],
    ['with-referrals', r.referral > 0 ? money(r.withReferrals) : 'not counted (referral share is 0)'],
    ['max-spend', money(r.maxSpend)],
    ['per-inquiry', money(r.perInquiry)],
    ['target-note', 'at ' + r.target.toLocaleString('en-US', { maximumFractionDigits: 2 }) + (r.target === 1 ? ' dollar' : ' dollars') + ' of margin back per dollar spent'],
    ['close-note', 'at a close rate of ' + pct(r.close)],
  ];
}

function init(root) {
  const fields = root.querySelector('[data-calc-fields]');
  if (!fields) return;
  const field = (name) => fields.querySelector('[name="' + name + '"]');
  const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  const live = root.querySelector('[data-calc-live]');
  let timer = 0;

  const read = () => ({
    sale: field('sale').value, purchases: field('purchases').value, years: field('years').value, margin: field('margin').value,
    referral: field('referral').value, target: field('target').value, close: field('close').value,
  });

  const render = (announce) => {
    const r = clv(read());
    root.classList.toggle('is-invalid', !r.ok);
    clearTimeout(timer);
    if (!r.ok) {
      set('[data-calc-error]', r.error);
      if (live) timer = setTimeout(() => { live.textContent = r.error; }, announce ? 0 : 700);
      return;
    }
    set('[data-calc-error]', '');
    for (const [name, text] of cells(r)) set('[data-out="' + name + '"]', text);
    const say = 'Lifetime margin ' + money(r.lifetimeMargin) + ' dollars' + (r.referral > 0 ? ', ' + money(r.withReferrals) + ' with referrals' : '') + '. Most to spend to win one customer ' + money(r.maxSpend) + '. Per inquiry ' + money(r.perInquiry) + '.';
    if (live) timer = setTimeout(() => { live.textContent = say; }, announce ? 0 : 700);
  };

  fields.addEventListener('input', () => render(false));
  fields.addEventListener('change', () => render(false));
  fields.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); render(true); } });
  root.classList.add('is-ready');
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-calc="clv"]').forEach(init);
