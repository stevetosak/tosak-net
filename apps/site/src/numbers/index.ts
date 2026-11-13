// The numbers the page states, measured at build time with their date. The
// shape is the one tosak-status will return, so the page later reads the same
// fields live. Every date is a UTC calendar day and is shown in UTC.
import snapshot from './snapshot.json';

export interface StatusSnapshot {
  /** When the numbers were read, as an ISO 8601 instant. */
  readonly measuredAt: string;
  /** The public-host probes: every check since the day they began, and the ones that failed. */
  readonly checks: { readonly since: string; readonly total: number; readonly failed: number };
  /** The Argo CD Applications that match Git, of all of them. */
  readonly applications: { readonly matchGit: number; readonly total: number };
  readonly releases: { readonly since: string; readonly count: number };
  /** The recorded decisions (ADRs). */
  readonly decisions: number;
  /** The last restore drill, and the next. */
  readonly drill: {
    readonly ranAt: string;
    readonly passed: boolean;
    readonly minutes: number;
    readonly next: string;
  };
  /** The last end-to-end rebuild rehearsal. */
  readonly rehearsedAt: string;
  /** The share of checks each public host passed since checks.since. */
  readonly hosts: readonly { readonly host: string; readonly passedPercent: number }[];
}

export const numbers: StatusSnapshot = snapshot;

const NBSP = ' ';
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

/** A length of time in minutes, kept on one line: `4 min`. */
export const minutes = (n: number): string => `${count(n)}${NBSP}min`;
