// How many inquiries do you need. Runs in the browser: the numbers typed are not stored or sent anywhere, and there is no
// form to submit. The page prints a worked example as plain HTML, so it reads the same without this script; the script only
// recomputes the results as the numbers change.
//
// The formulas, as the page states them in words (with the show rate at 100: inquiries needed = jobs wanted / share of
// inquiries won):
//   jobs needed                  = revenue goal / average job value   (or the jobs goal itself)
//   appointments that must happen = jobs needed / close rate
//   inquiries needed a month     = appointments / show rate
//   inquiries needed a week      = a month x 12 / 52
//   gap                          = inquiries needed - inquiries arriving now (the eight channels added up)

const num = (v) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return Number.isFinite(n) ? n : NaN;
};
const bad = (error) => ({ ok: false, error });

// The lead channels as the site defines them (what-is-lead-attribution), in that order.
export const CHANNELS = [
  ['search', 'Search'],
  ['ai', 'AI answer'],
  ['social', 'Social'],
  ['referral', 'Referral'],
  ['paid', 'Paid'],
  ['email', 'Email'],
  ['campaign', 'Campaign'],
  ['direct', 'Direct'],
];

export const EXAMPLE = {
  goalType: 'revenue', goal: 20000, job: 800, close: 25, show: 80,
  channels: { search: 30, ai: 5, social: 10, referral: 25, paid: 0, email: 5, campaign: 5, direct: 20 },
};

/** { goalType: 'revenue' | 'jobs', goal, job, close (percent), show (percent), channels: { search, ai, ... } } -> result or error. */
export function inquiries(input = {}) {
  const goalType = input.goalType === 'jobs' ? 'jobs' : 'revenue';
  const goal = num(input.goal);
  const job = goalType === 'revenue' ? num(input.job) : null;
  const close = num(input.close);
  const show = input.show === '' || input.show == null ? 100 : num(input.show);
  if (!(goal > 0)) return bad(goalType === 'jobs' ? 'Enter the jobs you want each month (above 0).' : 'Enter the revenue you want each month, in dollars (above 0).');
  if (goalType === 'revenue' && !(job > 0)) return bad('Enter the average job value, in dollars.');
  if (!(close > 0 && close <= 100)) return bad('Enter your close rate as a percent, above 0 and up to 100.');
  if (!(show > 0 && show <= 100)) return bad('Enter your show rate as a percent, above 0 and up to 100 (100 if your close rate already counts every inquiry).');
  const channels = {};
  let now = 0;
  for (const [key] of CHANNELS) {
    const raw = input.channels && input.channels[key];
    const v = raw === '' || raw == null ? 0 : num(raw);
    if (!(v >= 0)) return bad('Each channel is a number of inquiries a month, 0 or more.');
    channels[key] = v;
    now += v;
  }
  const jobs = goalType === 'revenue' ? goal / job : goal;
  const appointments = jobs / (close / 100);
  const needed = appointments / (show / 100);
  return {
    ok: true,
    goalType,
    jobs,
    appointments,
    needed,
    neededRounded: Math.ceil(needed - 1e-9),
    perWeek: (needed * 12) / 52,
    perWeekRounded: Math.ceil((needed * 12) / 52 - 1e-9),
    now,
    gap: needed - now,
    channels,
  };
}

export const count = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 1 });
export const whole = (x) => x.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** The result as the page shows it: [data-out name, text] pairs. Shared by the build (worked example) and the browser. */
export function cells(r) {
  return [
    ['jobs', count(r.jobs)],
    ['appointments', count(r.appointments)],
    ['needed', 'about ' + whole(r.neededRounded) + (count(r.needed) === whole(r.neededRounded) ? '' : ' (' + count(r.needed) + ')')],
    ['per-week', 'about ' + whole(r.perWeekRounded) + (count(r.perWeek) === whole(r.perWeekRounded) ? '' : ' (' + count(r.perWeek) + ')')],
    ['now', count(r.now)],
    ['gap', r.gap > 0 ? 'about ' + whole(Math.ceil(r.gap - 1e-9)) + ' more a month' : 'none: you already get enough'],
  ];
}

function init(root) {
  const fields = root.querySelector('[data-calc-fields]');
  if (!fields) return;
  const field = (name) => fields.querySelector('[name="' + name + '"]');
  const set = (sel, text) => { const el = root.querySelector(sel); if (el) el.textContent = text; };
  const live = root.querySelector('[data-calc-live]');
  const jobField = root.querySelector('[data-calc-job]');
  let timer = 0;

  const read = () => {
    const channels = {};
    for (const [key] of CHANNELS) channels[key] = field('ch-' + key) ? field('ch-' + key).value : 0;
    return { goalType: field('goalType').value, goal: field('goal').value, job: field('job').value, close: field('close').value, show: field('show').value, channels };
  };

  const render = (announce) => {
    const input = read();
    if (jobField) jobField.hidden = input.goalType === 'jobs';
    const goalLabel = root.querySelector('[data-calc-goal-label]');
    if (goalLabel) goalLabel.textContent = input.goalType === 'jobs' ? 'Jobs you want each month' : 'Revenue you want each month, in dollars';
    const r = inquiries(input);
    root.classList.toggle('is-invalid', !r.ok);
    clearTimeout(timer);
    if (!r.ok) {
      set('[data-calc-error]', r.error);
      if (live) timer = setTimeout(() => { live.textContent = r.error; }, announce ? 0 : 700);
      return;
    }
    set('[data-calc-error]', '');
    for (const [name, text] of cells(r)) set('[data-out="' + name + '"]', text);
    const say = 'Inquiries needed: about ' + whole(r.neededRounded) + ' a month, about ' + whole(r.perWeekRounded) + ' a week. ' + (r.gap > 0 ? 'Gap: about ' + whole(Math.ceil(r.gap - 1e-9)) + ' more a month.' : 'No gap: you already get enough.');
    if (live) timer = setTimeout(() => { live.textContent = say; }, announce ? 0 : 700);
  };

  fields.addEventListener('input', () => render(false));
  fields.addEventListener('change', () => render(false));
  fields.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); render(true); } });
  root.classList.add('is-ready');
}

if (typeof document !== 'undefined') document.querySelectorAll('[data-calc="inquiries"]').forEach(init);
