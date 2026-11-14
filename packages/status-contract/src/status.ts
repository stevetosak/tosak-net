// Generated from schema/status.schema.json by `pnpm types`. Do not edit it by
// hand: a test fails while this file and the schema differ.

/**
 * An instant in UTC, ISO 8601.
 */
export type Instant = string;
export type Count = number;
/**
 * A UTC calendar day.
 */
export type Day = string;

/**
 * What GET /api/status returns, and the shape of the page's build-time snapshot. Every section carries the time it was measured: a section whose source failed keeps its last good values with their old time, and the page falls back for that section alone.
 */
export interface StatusSnapshot {
  availability: Availability;
  offsiteCopy: OffsiteCopy;
  drill: Drill;
}
/**
 * The public-host probes over the window [from, to]: up to 30 days, shorter while the history is younger.
 */
export interface Availability {
  measuredAt: Instant;
  from: Instant;
  to: Instant;
  /**
   * Every check of every host in the window.
   */
  checks: number;
  /**
   * The checks that failed.
   */
  failed: number;
  /**
   * Every probed host, in name order. The page chooses which it shows.
   */
  hosts: HostAvailability[];
}
export interface HostAvailability {
  host: string;
  checks: Count;
  failed: Count;
  /**
   * The share of passed checks, rounded down to two decimals, so 100 means no check failed.
   */
  passedPercent: number;
}
/**
 * How far the offsite copy of the database (the WAL archive) fell behind over the window [from, to].
 */
export interface OffsiteCopy {
  measuredAt: Instant;
  from: Instant;
  to: Instant;
  /**
   * The longest time since the last archived segment, rounded up to whole seconds.
   */
  maxLagSeconds: number;
  failedUploads: Count;
}
/**
 * The newest restore drill: the offsite backup restored into a throw-away database and every database checked.
 */
export interface Drill {
  measuredAt: Instant;
  finishedAt: Instant;
  passed: boolean;
  /**
   * From the start of the restore until the restored database was ready; null when a failed drill never got there.
   */
  restoreSeconds: number | null;
  /**
   * The databases restored and checked.
   */
  databases: number;
  next: Day;
}
