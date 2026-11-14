// The numbers the page states, measured at build time with their dates. The
// shape is the tosak-status contract, so the page later reads the same fields
// live. Every date is a UTC calendar day and is shown in UTC.
import type { StatusSnapshot } from '@tosak/status-contract';
import snapshot from './snapshot.json' with { type: 'json' };

export const numbers: StatusSnapshot = snapshot;

/**
 * The last timed rebuild, from an empty cloud project to every service running.
 * tosak-status does not serve it: a rehearsal runs by hand, and this value is
 * updated after each one. That run started with a fresh database; the restore
 * of the data is what the monthly drill proves.
 */
export const rebuild = {
  rehearsedOn: '2026-10-25',
  minutes: 18,
  log: 'https://docs.tosak.net/cloud-infra/logs/2026-10-25-kluster-db-create-and-kluster-up-built-and-rehearsed-end-to-end-down-waits-for-the-primary-ip-unassign/',
} as const;

/** The oldest measured time of the sections, so no number reads fresher than it is. */
export const oldestMeasuredAt = ({ availability, offsiteCopy, drill }: StatusSnapshot): string =>
  [availability.measuredAt, offsiteCopy.measuredAt, drill.measuredAt].reduce((oldest, at) =>
    Date.parse(at) < Date.parse(oldest) ? at : oldest,
  );

/** The share of passed checks, rounded down like the service's, so 100 means none failed. */
export const passedPercent = (checks: number, failed: number): number =>
  // Integer arithmetic first: (passed / checks) * 10000 in floating point can land just below a whole number.
  checks === 0 ? 0 : Math.floor(((checks - failed) * 10_000) / checks) / 100;

/** The whole days a window spans. */
export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

const NBSP = '\u00a0';
const utc = { timeZone: 'UTC' } as const;
const dayMonthFormat = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', ...utc });
const instantFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'long',
  timeStyle: 'short',
  ...utc,
});
const countFormat = new Intl.NumberFormat('en-GB');
const percentFormat = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });

/** A day without its year, kept on one line: `5 November`. */
export const dayMonth = (day: string): string =>
  dayMonthFormat.format(new Date(day)).replace(' ', NBSP);

/** An instant in UTC: `8 November 2026 at 10:48 UTC`. */
export const instant = (at: string): string => `${instantFormat.format(new Date(at))}${NBSP}UTC`;

/** A count with thousands separators: `29,643`. */
export const count = (n: number): string => countFormat.format(n);

/** A share in percent, the sign kept with its number: `99.95 %`. */
export const percent = (n: number): string => `${percentFormat.format(n)}${NBSP}%`;

/** A length of time in minutes, kept on one line: `18 min`. */
export const minutes = (n: number): string => `${count(n)}${NBSP}min`;

/** A length of time in minutes and seconds, kept on one line: `3 min 17 s`. */
export const duration = (seconds: number): string => {
  const whole = Math.round(seconds);
  const [m, s] = [Math.floor(whole / 60), whole % 60];
  if (m === 0) return `${String(s)}${NBSP}s`;
  return s === 0 ? minutes(m) : `${minutes(m)}${NBSP}${String(s)}${NBSP}s`;
};

/** A window of whole days: `the last 3 days`, `the last day`. */
export const lastDays = (days: number): string =>
  days === 1 ? 'the last day' : `the last ${String(days)}${NBSP}days`;
