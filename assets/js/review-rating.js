// Google review rating calculator. Runs in the browser: the numbers typed are not stored or sent anywhere, and there is
// no form to submit. The page prints a worked example as plain HTML, so it reads the same without this script; the
// script only recomputes the results as the numbers change.
//
// The formulas, as the page states them in words:
//   total reviews        = the five star counts added up
//   total stars          = 5 x fives + 4 x fours + 3 x threes + 2 x twos + 1 x ones
//   average              = total stars / total reviews
//   five-star reviews needed to reach a target average T (T below 5):
//                          the smallest whole n with (total stars + 5n) / (total reviews + n) >= T,
//                          which is n = ceiling((T x total reviews - total stars) / (5 - T)), or 0 if already there
//   average after them   = (total stars + 5n) / (total reviews + n)
//   one more five-star   = (total stars + 5) / (total reviews + 1)
//   one more one-star    = (total stars + 1) / (total reviews + 1)

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const bad = (error) => ({ ok: false, error });
const whole = (n) => n >= 0 && Math.floor(n) === n;

export const EXAMPLE = { five: 30, four: 8, three: 2, two: 1, one: 3, target: 4.5 };

/** { five, four, three, two, one, target } -> { ok: true, ... } or { ok: false, error }. */
export function rating(input = {}) {
  const five = num(input.five), four = num(input.four), three = num(input.three), two = num(input.two), one = num(input.one);
  const target = num(input.target);
  const counts = [five, four, three, two, one];
  if (!counts.every(whole)) return bad('Enter each star count as a whole number (0 is allowed).');
  const total = five + four + three + two + one;
  if (!(total >= 1)) return bad('Enter at least one review.');
  if (!(target >= 1 && target <= 5)) return bad('Enter a target average between 1 and 5.');
  const stars = 5 * five + 4 * four + 3 * three + 2 * two + 1 * one;
  const average = stars / total;
  let needed;
  if (average >= target) needed = 0;
  else if (target >= 5) needed = null; // only reachable if every review is already five stars
  else needed = Math.max(0, Math.ceil((target * total - stars) / (5 - target) - 1e-9));
  const after = needed == null ? null : (stars + 5 * needed) / (total + needed);
  return {
    ok: true,
    total,
    stars,
    average,
    needed,
    after,
    plusFive: (stars + 5) / (total + 1),
    plusOne: (stars + 1) / (total + 1),
  };
}

export const avg = (x) => (x == null ? 'n/a' : x.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
export const shown = (x) => x.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const count = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** The result as the page shows it: [data-out name, text] pairs. Shared by the build (worked example) and the browser. */
export function cells(r) {
  return [
    ['total', count(r.total)],
    ['average', avg(r.average)],
    ['shown', shown(r.average)],
    ['needed', r.needed == null ? 'not reachable: an average of 5 needs every review to be five stars' : r.needed === 0 ? 'none: you are already there' : count(r.needed)],
    ['after', avg(r.after)],
    ['plus-five', avg(r.plusFive)],
    ['plus-one', avg(r.plusOne)],
  ];
}

function init(root) {
  const fields = root.querySelector('[data-calc-fields]');
  if (!fields) return;
  const field = (name) => fields.querySelector('[name="' + name + '"]');
  const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  const live = root.querySelector('[data-calc-live]');
  let timer = 0;

  const read = () => ({ five: field('five').value, four: field('four').value, three: field('three').value, two: field('two').value, one: field('one').value, target: field('target').value });

  const render = (announce) => {
    const r = rating(read());
    root.classList.toggle('is-invalid', !r.ok);
    clearTimeout(timer);
    if (!r.ok) {
      set('[data-calc-error]', r.error);
      if (live) timer = setTimeout(() => { live.textContent = r.error; }, announce ? 0 : 700);
      return;
    }
    set('[data-calc-error]', '');
    const out = cells(r);
    for (const [name, text] of out) set('[data-out="' + name + '"]', text);
    const say = 'Average ' + avg(r.average) + ' from ' + count(r.total) + ' reviews. Five-star reviews needed: ' + out[3][1] + '.';
    if (live) timer = setTimeout(() => { live.textContent = say; }, announce ? 0 : 700);
  };

  fields.addEventListener('input', () => render(false));
  fields.addEventListener('change', () => render(false));
  fields.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); render(true); } });
  root.classList.add('is-ready');
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-calc="rating"]').forEach(init);
