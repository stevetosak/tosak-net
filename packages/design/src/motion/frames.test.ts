import { describe, expect, it } from 'vitest';
import { Clock } from './clock.ts';
import { driveClock, type FrameSource } from './frames.ts';

/** Frames that come when the test calls frame(). */
class TestFrames implements FrameSource {
  time = 1_000;
  readonly #waiting = new Map<number, (time: number) => void>();
  #next = 1;

  now(): number {
    return this.time;
  }

  request(callback: (time: number) => void): number {
    const handle = this.#next++;
    this.#waiting.set(handle, callback);
    return handle;
  }

  cancel(handle: number): void {
    this.#waiting.delete(handle);
  }

  get waiting(): number {
    return this.#waiting.size;
  }

  frame(after: number): void {
    this.time += after;
    const due = [...this.#waiting.values()];
    this.#waiting.clear();
    for (const callback of due) callback(this.time);
  }
}

describe('driveClock', () => {
  it('advances the clock by the time between frames, at most the longest step', () => {
    const clock = new Clock();
    const frames = new TestFrames();
    driveClock(clock, { frames });
    frames.frame(16);
    frames.frame(17);
    expect(clock.now).toBe(33);
    frames.frame(5_000);
    expect(clock.now).toBe(133);
  });

  it('draws on every frame, held or not', () => {
    const clock = new Clock();
    const frames = new TestFrames();
    let drawn = 0;
    driveClock(clock, { frames, onFrame: () => drawn++ });
    frames.frame(16);
    clock.hold('user');
    frames.frame(16);
    expect(drawn).toBe(2);
    expect(clock.now).toBe(16);
  });

  it('stops asking for frames once stopped', () => {
    const clock = new Clock();
    const frames = new TestFrames();
    const stop = driveClock(clock, { frames });
    frames.frame(16);
    stop();
    expect(frames.waiting).toBe(0);
    frames.frame(16);
    expect(clock.now).toBe(16);
  });
});
