import { describe, expect, it } from 'vitest';
import {
  floorAtRest,
  freeSlots,
  inStep,
  jobsOf,
  loseJob,
  reconcile,
  release,
  restoreData,
  startJob,
  stopMachine,
} from './floor.ts';
import { readout } from './readout.ts';

describe('floorAtRest', () => {
  it('orders the copies that stand on the floor, all ready on the first version', () => {
    const state = floorAtRest();
    expect([...state.order]).toEqual([
      ['A', { copies: 3, version: 1, fresh: false }],
      ['B', { copies: 2, version: 1, fresh: false }],
      ['C', { copies: 2, version: 1, fresh: false }],
    ]);
    expect(state.jobs).toHaveLength(8);
    expect(inStep(state)).toBe(true);
  });
});

describe('the control room', () => {
  it('starts a job on the running machine with the most free slots, the first one on a tie', () => {
    const state = floorAtRest();
    expect([freeSlots(state, 'w1'), freeSlots(state, 'w2'), freeSlots(state, 'w3')]).toEqual([
      [2, 3],
      [1],
      [0],
    ]);
    const next = startJob(stopMachine(state, 'w1'), 'A', 10);
    expect(next.jobs.at(-1)).toMatchObject({
      kind: 'A',
      worker: 'w2',
      slot: 1,
      status: 'starting',
      since: 10,
    });
  });

  it('starts every missing copy in one pass', () => {
    const next = reconcile(stopMachine(floorAtRest(), 'w2'), 0);
    expect(next.jobs.filter((job) => job.status === 'starting')).toHaveLength(3);
  });

  it('returns the same state when there is nothing to correct', () => {
    const state = floorAtRest();
    expect(reconcile(state, 0)).toBe(state);
  });

  it('starts nothing where a copy of the database is on its way', () => {
    const data = floorAtRest().jobs.find((job) => job.kind === 'data');
    const lost = loseJob(floorAtRest(), data?.id ?? -1);
    expect(freeSlots(lost, 'w3')).toEqual([0]);
    const back = restoreData(lost, { worker: 'w3', slot: 3 }, 0);
    expect(back.reserved).toEqual([]);
    expect(back.jobs.at(-1)).toMatchObject({
      kind: 'data',
      worker: 'w3',
      slot: 3,
      status: 'ready',
    });
  });
});

describe('readout', () => {
  it('shows every pip ready, the loop in step and every lamp lit at rest', () => {
    expect(readout(floorAtRest())).toEqual({
      order: [
        ['ready', 'ready', 'ready'],
        ['ready', 'ready'],
        ['ready', 'ready'],
      ],
      floor: [
        ['ready', 'ready', 'ready'],
        ['ready', 'ready'],
        ['ready', 'ready'],
      ],
      loop: 'ok',
      lamps: { w1: 'ok', w2: 'ok', w3: 'ok', control: 'ok' },
    });
  });

  it('shows a release as new pips in the order, and its starting job as unhealthy on the floor', () => {
    const state = reconcile(release(floorAtRest(), 'A'), 0);
    const shown = readout(state);
    expect(shown.order[0]).toEqual(['new', 'new', 'new']);
    expect(shown.floor[0]).toEqual(['ready', 'ready', 'ready', 'unhealthy']);
    const surge = jobsOf(state, 'A').find((job) => job.version === 2);
    expect(surge?.worker).toBe('w1');
    expect(shown).toMatchObject({ loop: 'warn', lamps: { w1: 'warn', w2: 'ok', control: 'warn' } });
  });
});
