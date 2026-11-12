// The clock of a model that moves: one pausable time base for its chapters, its
// control loop and its animations. Time moves only through advance(). In the
// browser a frame driver calls it (frames.ts); a test calls it by hand, so the
// test runs on a fake clock without timers or a DOM. While the clock is held,
// time stands still: no timer is due, no task runs, and every animation it
// tracks is paused. A chapter jump aborts the chapter's timers and animations.

/** A chapter's timers and animations end with this when the reader jumps to another chapter. */
export class Abort extends Error {
  constructor() {
    super('Aborted by a chapter jump');
    this.name = 'Abort';
  }
}

/** The part of a Web Animations `Animation` the clock uses. */
export interface Playback {
  readonly playState: AnimationPlayState;
  /** Resolves when the animation ends, and rejects when it is cancelled. */
  readonly finished: Promise<unknown>;
  pause(): void;
  play(): void;
  cancel(): void;
}

/** Why the clock is held: the reader paused it, the model is off screen, or the page is hidden. */
export type HoldReason = 'user' | 'offscreen' | 'hidden';

export interface ClockOptions {
  /** The longest step one advance takes, so the first frame after a gap does not jump. */
  readonly maxStep?: number;
  /** The longest a wait() lasts. Reduced motion shortens every wait to this. */
  readonly longestWait?: number;
}

interface Timer {
  readonly at: number;
  readonly test: (() => boolean) | undefined;
  readonly resolve: () => void;
  readonly reject: (reason: Abort) => void;
}

interface Task {
  readonly period: number;
  next: number;
  readonly run: (now: number) => void;
}

const ignore = (): void => undefined;

export class Clock {
  readonly #maxStep: number;
  readonly #longestWait: number;
  readonly #holds = new Set<HoldReason>();
  readonly #tasks: Task[] = [];
  readonly #playbacks = new Set<Playback>();
  #timers: Timer[] = [];
  #now = 0;
  #epoch = 0;

  constructor({ maxStep = 100, longestWait = Number.POSITIVE_INFINITY }: ClockOptions = {}) {
    this.#maxStep = maxStep;
    this.#longestWait = longestWait;
  }

  /** The clock time in milliseconds: the time it has run, without the time it was held. */
  get now(): number {
    return this.#now;
  }

  get halted(): boolean {
    return this.#holds.size > 0;
  }

  /** Holds the clock for a reason, or lets go of that reason. It runs when no reason is left. */
  hold(reason: HoldReason, held = true): void {
    const was = this.halted;
    if (held) this.#holds.add(reason);
    else this.#holds.delete(reason);
    if (this.halted === was) return;
    for (const playback of this.#playbacks) {
      if (this.halted) playback.pause();
      else if (playback.playState === 'paused') playback.play();
    }
  }

  /**
   * Moves the time on by the time since the last frame, up to the longest step,
   * unless the clock is held. Then it runs the tasks that are due, in the order
   * they were added, and settles the timers that are due.
   */
  advance(elapsed: number): void {
    if (this.halted) return;
    this.#now += Math.min(Math.max(elapsed, 0), this.#maxStep);
    for (const task of [...this.#tasks]) {
      if (this.#now < task.next) continue;
      task.next = this.#now + task.period;
      task.run(this.#now);
    }
    for (const timer of [...this.#timers]) {
      if (!this.#timers.includes(timer)) continue;
      if (timer.at > this.#now && !(timer.test?.() ?? false)) continue;
      this.#timers.splice(this.#timers.indexOf(timer), 1);
      timer.resolve();
    }
  }

  /** Resolves after the given clock time; rejects with Abort on a chapter jump. */
  wait(ms: number): Promise<void> {
    return this.#later(this.#now + Math.min(ms, this.#longestWait));
  }

  /**
   * Resolves once the test holds, checked on every advance, or after the limit
   * so that a chapter never waits for ever; rejects with Abort on a chapter jump.
   */
  until(test: () => boolean, limit = 20_000): Promise<void> {
    return this.#later(this.#now + limit, test);
  }

  /**
   * Runs a task on the first advance and then once each period of clock time
   * (0: on every advance). A task stands: a chapter jump does not stop it.
   * Returns the function that stops it.
   */
  every(period: number, run: (now: number) => void): () => void {
    const task: Task = { period, next: this.#now, run };
    this.#tasks.push(task);
    return () => {
      const index = this.#tasks.indexOf(task);
      if (index >= 0) this.#tasks.splice(index, 1);
    };
  }

  /** Pauses and plays an animation with the clock until it ends. It starts paused while the clock is held. */
  track<P extends Playback>(playback: P): P {
    this.#playbacks.add(playback);
    if (this.halted) playback.pause();
    const forget = (): void => {
      this.#playbacks.delete(playback);
    };
    playback.finished.then(forget, forget);
    return playback;
  }

  /** Tracks an animation and resolves when it ends; rejects with Abort if a chapter jump came first. */
  async complete(playback: Playback): Promise<void> {
    const epoch = this.#epoch;
    await this.track(playback).finished.catch(ignore);
    if (epoch !== this.#epoch) throw new Abort();
  }

  /** A chapter jump: every waiting timer rejects with Abort and every tracked animation is cancelled. */
  abort(): void {
    this.#epoch++;
    const timers = this.#timers;
    this.#timers = [];
    for (const timer of timers) timer.reject(new Abort());
    const playbacks = [...this.#playbacks];
    this.#playbacks.clear();
    for (const playback of playbacks) playback.cancel();
  }

  #later(at: number, test?: () => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#timers.push({ at, test, resolve, reject });
    });
  }
}
