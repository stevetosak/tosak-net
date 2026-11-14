import { createStatusValidator } from '@tosak/status-contract/validate';
import { describe, expect, it } from 'vitest';
import { daysBetween, duration, oldestMeasuredAt, passedPercent } from './index.ts';
import snapshot from './snapshot.json' with { type: 'json' };

describe('the build-time snapshot', () => {
  it('follows the tosak-status contract', () => {
    const validate = createStatusValidator();
    expect(validate(snapshot), JSON.stringify(validate.errors)).toBe(true);
  });

  it('states totals that are the sum of its hosts', () => {
    const { checks, failed, hosts } = snapshot.availability;
    expect(hosts.reduce((sum, host) => sum + host.checks, 0)).toBe(checks);
    expect(hosts.reduce((sum, host) => sum + host.failed, 0)).toBe(failed);
  });

  it('rounds each host share the way the service does', () => {
    for (const host of snapshot.availability.hosts) {
      expect(host.passedPercent).toBe(passedPercent(host.checks, host.failed));
    }
  });
});

describe('the number helpers', () => {
  it('round a share down, so 100 % means no check failed', () => {
    expect(passedPercent(100_000, 1)).toBe(99.99);
    expect(passedPercent(1_000_000, 1)).toBe(99.99);
    expect(passedPercent(4321, 0)).toBe(100);
    expect(passedPercent(10_000, 1)).toBe(99.99);
    expect(passedPercent(0, 0)).toBe(0);
  });

  it('take the oldest section time', () => {
    const at = (availability: string, offsiteCopy: string, drill: string) => ({
      availability: { ...snapshot.availability, measuredAt: availability },
      offsiteCopy: { ...snapshot.offsiteCopy, measuredAt: offsiteCopy },
      drill: { ...snapshot.drill, measuredAt: drill },
    });
    expect(
      oldestMeasuredAt(at('2026-11-14T10:00:00Z', '2026-11-14T09:00:00Z', '2026-11-14T11:00:00Z')),
    ).toBe('2026-11-14T09:00:00Z');
  });

  it('count whole days and write durations on one line', () => {
    const nbsp = (text: string) => text.replaceAll(' ', '\u00a0');
    expect(daysBetween('2026-11-11T13:14:53Z', '2026-11-14T13:14:53Z')).toBe(3);
    expect(duration(197)).toBe(nbsp('3 min 17 s'));
    expect(duration(240)).toBe(nbsp('4 min'));
    expect(duration(45)).toBe(nbsp('45 s'));
  });
});
