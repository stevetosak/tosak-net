import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { statusTypes, typesUrl } from '../scripts/types.ts';
import type { HostAvailability, StatusSnapshot } from './status.ts';
import { createStatusValidator } from './validate.ts';

const example: StatusSnapshot = {
  availability: {
    measuredAt: '2026-11-14T13:14:53Z',
    from: '2026-11-11T13:14:53Z',
    to: '2026-11-14T13:14:53Z',
    checks: 8641,
    failed: 5,
    hosts: [
      { host: 'authos.tosak.net', checks: 4320, failed: 0, passedPercent: 100 },
      { host: 'tosak.net', checks: 4321, failed: 5, passedPercent: 99.88 },
    ],
  },
  offsiteCopy: {
    measuredAt: '2026-11-14T13:14:53Z',
    from: '2026-11-11T13:14:53Z',
    to: '2026-11-14T13:14:53Z',
    maxLagSeconds: 301,
    failedUploads: 0,
  },
  drill: {
    measuredAt: '2026-11-14T13:26:26Z',
    finishedAt: '2026-11-01T09:03:54Z',
    passed: true,
    restoreSeconds: 197,
    databases: 2,
    next: '2026-12-01',
  },
};

describe('the generated types', () => {
  it('match the schema', async () => {
    expect(await readFile(typesUrl, 'utf8')).toBe(await statusTypes());
  });
});

describe('the schema', () => {
  const validate = createStatusValidator();
  const variant = (change: (copy: StatusSnapshot) => void): unknown => {
    const copy = structuredClone(example);
    change(copy);
    return copy;
  };
  const firstHost = (s: StatusSnapshot): HostAvailability => {
    const [host] = s.availability.hosts;
    if (!host) throw new Error('the example has no host');
    return host;
  };

  it('accepts a complete snapshot', () => {
    expect(validate(example), JSON.stringify(validate.errors)).toBe(true);
  });

  it('accepts a failed drill without a restore time', () => {
    const failed = variant((s) => Object.assign(s.drill, { passed: false, restoreSeconds: null }));
    expect(validate(failed)).toBe(true);
  });

  it.each<[string, (s: StatusSnapshot) => void]>([
    ['a missing section', (s) => delete (s as Partial<StatusSnapshot>).drill],
    ['an unknown field', (s) => Object.assign(s.availability, { extra: 1 })],
    ['a share above 100', (s) => (firstHost(s).passedPercent = 100.01)],
    ['a negative count', (s) => (s.offsiteCopy.failedUploads = -1)],
    ['a fractional count', (s) => (s.availability.checks = 1.5)],
    ['a time that is not an instant', (s) => (s.drill.finishedAt = '1 November')],
    ['a next drill that is not a day', (s) => (s.drill.next = '2026-12-01T09:00:00Z')],
    ['a host with a scheme', (s) => (firstHost(s).host = 'https://tosak.net/')],
  ])('rejects %s', (_, change) => {
    expect(validate(variant(change))).toBe(false);
  });
});
