// Drives a clock from the browser's animation frames. The frame source is a
// parameter, so a test gives its own frames and the module loads without a DOM.
import type { Clock } from './clock.ts';

/** Where the frames come from: the browser's, or a test's. */
export interface FrameSource {
  now(): number;
  request(callback: (time: number) => void): number;
  cancel(handle: number): void;
}

/** The browser's animation frames. */
export const browserFrames: FrameSource = {
  now: () => performance.now(),
  request: (callback) => requestAnimationFrame(callback),
  cancel: (handle) => {
    cancelAnimationFrame(handle);
  },
};

export interface DriveOptions {
  /** Runs after the clock moved, on every frame, held or not: the place to draw. */
  readonly onFrame?: () => void;
  readonly frames?: FrameSource;
}

/** Advances the clock by the time between frames until the returned function stops it. */
export function driveClock(
  clock: Clock,
  { onFrame, frames = browserFrames }: DriveOptions = {},
): () => void {
  let last = frames.now();
  let handle = 0;
  const step = (time: number): void => {
    clock.advance(time - last);
    last = time;
    onFrame?.();
    handle = frames.request(step);
  };
  handle = frames.request(step);
  return () => {
    frames.cancel(handle);
  };
}
