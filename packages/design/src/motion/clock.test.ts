import { describe, expect, it } from 'vitest';
import { Abort, Clock } from './clock.ts';
import { FakeAnimation, FRAME, flush, run, watch } from './test-support.ts';

describe('Clock', () => {
  it('moves only when advanced, and by at most the longest step', () => {
    const clock = new Clock();
    clock.advance(FRAME);
    expect(clock.now).toBe(16);
    clock.advance(5_000);
    expect(clock.now).toBe(116);
    clock.advance(-5);
    expect(clock.now).toBe(116);
  });

  it('resolves a wait once its clock time has passed', async () => {
    const clock = new Clock();
    const waited = watch(clock.wait(500));
    await run(clock, 480);
    expect(waited.state).toBe('pending');
    await run(clock, 32);
    expect(waited.state).toBe('resolved');
  });

  it('shortens every wait to the longest wait', async () => {
    const clock = new Clock({ longestWait: 300 });
    const waited = watch(clock.wait(2_000));
    await run(clock, 304);
    expect(waited.state).toBe('resolved');
  });

  it('resolves until() when its test holds, or at its limit', async () => {
    const clock = new Clock();
    let open = false;
    const opened = watch(clock.until(() => open));
    const gaveUp = watch(clock.until(() => false, 500));
    await run(clock, 480);
    expect([opened.state, gaveUp.state]).toEqual(['pending', 'pending']);
    open = true;
    await run(clock, 32);
    expect([opened.state, gaveUp.state]).toEqual(['resolved', 'resolved']);
  });

  it('runs a task on the first advance and then once a period, until it is stopped', async () => {
    const clock = new Clock();
    const runs: number[] = [];
    const stop = clock.every(100, (now) => runs.push(now));
    await run(clock, 256);
    expect(runs).toEqual([16, 128, 240]);
    stop();
    await run(clock, 256);
    expect(runs).toHaveLength(3);
  });

  describe('held', () => {
    it('holds every timer, task and tracked animation while paused, and lets them go on after', async () => {
      const clock = new Clock();
      const ticks: number[] = [];
      clock.every(0, (now) => ticks.push(now));
      const animation = clock.track(new FakeAnimation());
      const waited = watch(clock.wait(200));
      const tested = watch(clock.until(() => true));

      clock.hold('user');
      expect(animation.playState).toBe('paused');
      await run(clock, 10_000);
      expect(clock.now).toBe(0);
      expect(ticks).toEqual([]);
      expect([waited.state, tested.state]).toEqual(['pending', 'pending']);

      clock.hold('user', false);
      expect(animation.playState).toBe('running');
      await run(clock, FRAME);
      expect(tested.state).toBe('resolved');
      expect(waited.state).toBe('pending');
      await run(clock, 192);
      expect(waited.state).toBe('resolved');
      expect(clock.now).toBe(208);
    });

    it('runs only when no reason holds it', () => {
      const clock = new Clock();
      clock.hold('user');
      clock.hold('offscreen');
      clock.hold('user', false);
      clock.advance(FRAME);
      expect(clock.now).toBe(0);
      clock.hold('offscreen', false);
      clock.advance(FRAME);
      expect(clock.now).toBe(16);
    });

    it('starts an animation paused while the clock is held', () => {
      const clock = new Clock();
      clock.hold('hidden');
      const animation = clock.track(new FakeAnimation());
      expect(animation.playState).toBe('paused');
      clock.hold('hidden', false);
      expect(animation.playState).toBe('running');
    });

    it('lets an animation go once it has ended', async () => {
      const clock = new Clock();
      const animation = clock.track(new FakeAnimation());
      animation.end();
      await flush();
      clock.hold('user');
      expect(animation.playState).toBe('finished');
    });
  });

  describe('abort', () => {
    it('rejects every waiting timer with Abort and cancels every tracked animation; tasks go on', async () => {
      const clock = new Clock();
      const ticks: number[] = [];
      clock.every(0, (now) => ticks.push(now));
      const waited = watch(clock.wait(500));
      const tested = watch(clock.until(() => false));
      const animation = clock.track(new FakeAnimation());

      clock.abort();
      await flush();
      expect([waited.state, tested.state]).toEqual(['rejected', 'rejected']);
      expect(waited.reason).toBeInstanceOf(Abort);
      expect(animation.playState).toBe('idle');
      await run(clock, 2 * FRAME);
      expect(ticks).toEqual([16, 32]);
    });

    it('leaves the timers and animations that start after it alone', async () => {
      const clock = new Clock();
      clock.abort();
      const waited = watch(clock.wait(100));
      const animation = clock.track(new FakeAnimation());
      await run(clock, 112);
      expect(waited.state).toBe('resolved');
      expect(animation.playState).toBe('running');
    });
  });

  describe('complete', () => {
    it('resolves when the animation ends', async () => {
      const clock = new Clock();
      const animation = new FakeAnimation();
      const completed = watch(clock.complete(animation));
      await flush();
      expect(completed.state).toBe('pending');
      animation.end();
      await flush();
      expect(completed.state).toBe('resolved');
    });

    it('rejects with Abort when a chapter jump cancels the animation', async () => {
      const clock = new Clock();
      const animation = new FakeAnimation();
      const completed = watch(clock.complete(animation));
      clock.abort();
      await flush();
      expect(animation.playState).toBe('idle');
      expect(completed.state).toBe('rejected');
      expect(completed.reason).toBeInstanceOf(Abort);
    });
  });
});
