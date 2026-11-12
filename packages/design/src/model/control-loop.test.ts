import { describe, expect, it } from 'vitest';
import { Clock } from '../motion/clock.ts';
import { run, runUntil } from '../motion/test-support.ts';
import { ControlLoop, Floor, type ControlLoopOptions } from './control-loop.ts';
import {
  blackout,
  failJob,
  inStep,
  jobsOf,
  jobsOn,
  lightUp,
  release,
  requestTargets,
  restartJob,
  restoreData,
  startMachine,
  stopMachine,
  type FloorJob,
  type FloorState,
} from './floor.ts';
import { readout } from './readout.ts';

const START_MS = 1_500;

/** A floor at rest with its control loop on a fake clock; it records every state the floor passes. */
function setUp(options: ControlLoopOptions = {}) {
  const clock = new Clock();
  const floor = new Floor();
  const loop = new ControlLoop(clock, floor, { startMs: START_MS, ...options });
  const states: FloorState[] = [floor.state];
  floor.subscribe(() => states.push(floor.state));
  return { clock, floor, loop, states };
}

const ids = (jobs: readonly FloorJob[]): number[] => jobs.map((job) => job.id);
const ready = (jobs: readonly FloorJob[]): FloorJob[] =>
  jobs.filter((job) => job.status === 'ready');

describe('ControlLoop', () => {
  it('leaves a floor that matches the order as it is', async () => {
    const { clock, states } = setUp();
    await run(clock, 5_000);
    expect(states).toHaveLength(1);
  });

  it('on a release, starts one new job at a time and retires an old one only once the new one is ready', async () => {
    const { clock, floor, states } = setUp();
    const others = [...jobsOf(floor.state, 'B'), ...jobsOf(floor.state, 'C')];
    floor.apply((state) => release(state, 'A'));
    await runUntil(clock, () => inStep(floor.state));

    const after = jobsOf(floor.state, 'A');
    expect(after).toHaveLength(3);
    expect(after.every((job) => job.version === 2 && job.status === 'ready')).toBe(true);
    expect([...jobsOf(floor.state, 'B'), ...jobsOf(floor.state, 'C')]).toEqual(others);

    let started = 0;
    let retired = 0;
    for (const [n, state] of states.slice(2).entries()) {
      const before = jobsOf(states[n + 1] ?? state, 'A');
      const now = jobsOf(state, 'A');
      const came = now.filter((job) => !ids(before).includes(job.id));
      const went = before.filter((job) => !ids(now).includes(job.id));
      started += came.length;
      retired += went.length;
      // One surge job at most, and the ordered copies stay ready all the way.
      expect(came.length).toBeLessThanOrEqual(1);
      expect(now.length).toBeLessThanOrEqual(4);
      expect(ready(now).length).toBeGreaterThanOrEqual(3);
      // A job is retired only from a full floor whose new job is ready, and it is an old one.
      for (const job of went) {
        expect(job.version).toBe(1);
        expect(ready(before)).toHaveLength(4);
      }
    }
    expect([started, retired]).toEqual([3, 3]);
  });

  it("starts a stopped machine's jobs again on the other machines", async () => {
    const { clock, floor, states } = setUp();
    expect(jobsOn(floor.state, 'w2').map((job) => job.kind)).toEqual(['A', 'B', 'C']);
    floor.apply((state) => stopMachine(state, 'w2'));
    const stoppedAt = states.length - 1;
    await runUntil(clock, () => inStep(floor.state));

    for (const state of states.slice(stoppedAt)) expect(jobsOn(state, 'w2')).toEqual([]);
    const moved = floor.state.jobs.filter((job) => job.since > 0);
    expect(moved.map(({ kind, worker, slot }) => [kind, worker, slot])).toEqual([
      ['A', 'w1', 2],
      ['B', 'w1', 3],
      ['C', 'w3', 0],
    ]);
    expect(readout(floor.state).lamps.w2).toBe('stop');

    floor.apply((state) => startMachine(state, 'w2'));
    await run(clock, 3_000);
    expect(jobsOn(floor.state, 'w2')).toEqual([]);
    expect(inStep(floor.state)).toBe(true);
    expect(readout(floor.state).lamps.w2).toBe('ok');
  });

  it('holds every job while the clock is paused, and counts start time only while it runs', async () => {
    const { clock, floor } = setUp();
    floor.apply((state) => release(state, 'A'));
    await run(clock, 700);
    const surge = jobsOf(floor.state, 'A').find((job) => job.version === 2);
    expect(surge?.status).toBe('starting');

    clock.hold('user');
    const held = floor.state;
    await run(clock, 60_000);
    expect(floor.state).toBe(held);

    clock.hold('user', false);
    const readyAt = (surge?.since ?? 0) + START_MS;
    await runUntil(clock, () => clock.now >= readyAt - 16);
    expect(jobsOf(floor.state, 'A').find((job) => job.id === surge?.id)?.status).toBe('starting');
    await run(clock, 32);
    expect(jobsOf(floor.state, 'A').find((job) => job.id === surge?.id)?.status).toBe('ready');
  });

  it('corrects nothing while a chapter holds the control room', async () => {
    const { clock, floor, loop } = setUp();
    loop.holdFor(1_800);
    floor.apply((state) => stopMachine(state, 'w1'));
    const held = floor.state;
    await run(clock, 1_780);
    expect(floor.state).toBe(held);
    await run(clock, 700);
    expect(floor.state.jobs.length).toBeGreaterThan(held.jobs.length);
  });

  it('sends no requests to a failing job, and does not replace it; it restarts where it stands', async () => {
    const { clock, floor } = setUp();
    const job = requestTargets(floor.state)[3];
    if (!job) throw new Error('no job to fail');
    floor.apply((state) => failJob(state, job.id));
    expect(ids(requestTargets(floor.state))).not.toContain(job.id);
    expect(readout(floor.state).lamps[job.worker]).toBe('warn');
    await run(clock, 2_400);
    expect(floor.state.jobs).toHaveLength(8);

    floor.apply((state) => restartJob(state, job.id, clock.now));
    await runUntil(clock, () => inStep(floor.state));
    const back = floor.state.jobs.find((one) => one.id === job.id);
    expect(back && [back.status, back.worker, back.slot]).toEqual(['ready', job.worker, job.slot]);
  });

  it('corrects nothing in the dark; once the machines are back it starts every job, and the data slot waits for its copy', async () => {
    const { clock, floor } = setUp();
    floor.apply(blackout);
    await run(clock, 5_000);
    expect(floor.state.jobs).toEqual([]);
    expect(readout(floor.state)).toMatchObject({
      loop: 'down',
      lamps: { w1: 'off', w2: 'off', w3: 'off', control: 'off' },
    });

    floor.apply(lightUp);
    await runUntil(clock, () => inStep(floor.state));
    expect(floor.state.jobs).toHaveLength(7);
    expect(jobsOn(floor.state, 'w3').some((job) => job.slot === 3)).toBe(false);

    floor.apply((state) => restoreData(state, { worker: 'w3', slot: 3 }, clock.now));
    expect(floor.state.reserved).toEqual([]);
    expect(jobsOn(floor.state, 'w3').find((job) => job.slot === 3)?.kind).toBe('data');
  });
});
