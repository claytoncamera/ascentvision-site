// Marketing ROI calculator. Runs in the browser: the numbers typed are not stored or sent anywhere, and there is no form to
// submit. The page prints a worked example as plain HTML, so it reads the same without this script; the script only
// recomputes the results as the numbers change.
//
// The formulas, as the page states them in words:
//   cost per inquiry      = spend / inquiries
//   customers won         = inquiries x close rate
//   cost per customer     = spend / customers won
//   gross return          = customers won x average job value
//   margin earned         = gross return x margin
//   net return            = margin earned - spend
//   per dollar spent      = margin earned / spend
//   net share of spend    = net return / spend
//   break-even close rate = spend / (inquiries x average job value x margin)

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const bad = (error) => ({ ok: false, error });

export const EXAMPLE = { spend: 2000, inquiries: 40, close: 25, job: 800, margin: 40 };

/** { spend, inquiries, close (percent), job, margin (percent) } -> { ok: true, ... } or { ok: false, error }. */
export function roi(input = {}) {
  const spend = num(input.spend);
  const inquiries = num(input.inquiries);
  const close = num(input.close);
  const job = num(input.job);
  const margin = num(input.margin);
  if (!(spend >= 0)) return bad('Enter what you spent, in dollars (0 is allowed).');
  if (!(inquiries >= 1)) return bad('Enter how many inquiries came in (at least 1).');
  if (!(close >= 0 && close <= 100)) return bad('Enter the share that became customers as a percent, 0 to 100.');
  if (!(job > 0)) return bad('Enter the average job value, in dollars.');
  if (!(margin > 0 && margin <= 100)) return bad('Enter your margin as a percent, above 0 and up to 100.');
  const customers = (inquiries * close) / 100;
  const gross = customers * job;
  const marginEarned = (gross * margin) / 100;
  const net = marginEarned - spend;
  return {
    ok: true,
    costPerInquiry: spend / inquiries,
    customers,
    costPerCustomer: customers > 0 ? spend / customers : null,
    gross,
    marginEarned,
    net,
    perDollar: spend > 0 ? marginEarned / spend : null,
    netShare: spend > 0 ? (net / spend) * 100 : null,
    breakEvenClose: (spend / ((inquiries * job * margin) / 100)) * 100,
  };
}

// Plain formatted numbers: the page says "in dollars" once in the heading, never a currency sign.
export const money = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }));
export const count = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
export const pct = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%');
export const ratio = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

/** The result as the page shows it: [data-out name, text] pairs. Shared by the build (worked example) and the browser. */
export function cells(r) {
  return [
    ['cpi', money(r.costPerInquiry)],
    ['customers', count(r.customers)],
    ['cpc', money(r.costPerCustomer)],
    ['gross', money(r.gross)],
    ['margin', money(r.marginEarned)],
    ['net', money(r.net)],
    ['per-dollar', ratio(r.perDollar)],
    ['net-share', pct(r.netShare)],
    ['break-even', r.breakEvenClose > 100 ? 'above 100%' : pct(r.breakEvenClose)],
  ];
}

function init(root) {
  const fields = root.querySelector('[data-calc-fields]');
  if (!fields) return;
  const field = (name) => fields.querySelector('[name="' + name + '"]');
  const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  const live = root.querySelector('[data-calc-live]');
  let timer = 0;

  const read = () => ({ spend: field('spend').value, inquiries: field('inquiries').value, close: field('close').value, job: field('job').value, margin: field('margin').value });

  const render = (announce) => {
    const r = roi(read());
    root.classList.toggle('is-invalid', !r.ok);
    clearTimeout(timer);
    if (!r.ok) {
      set('[data-calc-error]', r.error);
      if (live) timer = setTimeout(() => { live.textContent = r.error; }, announce ? 0 : 700);
      return;
    }
    set('[data-calc-error]', '');
    for (const [name, text] of cells(r)) set('[data-out="' + name + '"]', text);
    const say = 'Cost per inquiry ' + money(r.costPerInquiry) + '. Cost per customer ' + money(r.costPerCustomer) + '. Net return ' + money(r.net) + ' dollars. Break-even close rate ' + (r.breakEvenClose > 100 ? 'above 100%' : pct(r.breakEvenClose)) + '.';
    if (live) timer = setTimeout(() => { live.textContent = say; }, announce ? 0 : 700);
  };

  fields.addEventListener('input', () => render(false));
  fields.addEventListener('change', () => render(false));
  fields.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); render(true); } });
  root.classList.add('is-ready');
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-calc="roi"]').forEach(init);
