// Helpers for the tests of the motion and of the plant's floor: a fake
// animation, and the fake clock's frames. Not exported from the package.
import type { Clock, Playback } from './clock.ts';

/** A Web Animations stand-in: it ends when the test says so. */
export class FakeAnimation implements Playback {
  playState: AnimationPlayState = 'running';
  readonly finished: Promise<this>;
  #resolve: (animation: this) => void = () => undefined;
  #reject: (reason: unknown) => void = () => undefined;

  constructor() {
    this.finished = new Promise((resolve, reject) => {
      this.#resolve = resolve;
      this.#reject = reject;
    });
  }

  pause(): void {
    this.playState = 'paused';
  }

  play(): void {
    this.playState = 'running';
  }

  /** Like the browser: `finished` rejects with an AbortError. */
  cancel(): void {
    this.playState = 'idle';
    this.#reject(new DOMException('The animation was cancelled', 'AbortError'));
  }

  /** The test ends the animation. */
  end(): void {
    this.playState = 'finished';
    this.#resolve(this);
  }
}

/** One frame of the fake clock, in milliseconds. */
export const FRAME = 16;

/** Lets every promise that is due settle. */
export const flush = (): Promise<void> =>
  new Promise((resolve) => {
    setImmediate(resolve);
  });

/** Advances the clock frame by frame for the given time, and lets due promises settle after each frame. */
export async function run(clock: Clock, ms: number): Promise<void> {
  for (let elapsed = 0; elapsed < ms; elapsed += FRAME) {
    clock.advance(FRAME);
    await flush();
  }
}

/** Advances the clock frame by frame until the test holds, for at most the limit. */
export async function runUntil(clock: Clock, test: () => boolean, limit = 60_000): Promise<void> {
  for (let elapsed = 0; elapsed < limit && !test(); elapsed += FRAME) {
    clock.advance(FRAME);
    await flush();
  }
}

export interface Watched {
  readonly state: 'pending' | 'resolved' | 'rejected';
  readonly reason: unknown;
}

/** Records how a promise settles, so a test can ask without awaiting it. */
export function watch(promise: Promise<unknown>): Watched {
  const seen: { state: Watched['state']; reason: unknown } = {
    state: 'pending',
    reason: undefined,
  };
  promise.then(
    () => {
      seen.state = 'resolved';
    },
    (reason: unknown) => {
      seen.state = 'rejected';
      seen.reason = reason;
    },
  );
  return seen;
}
