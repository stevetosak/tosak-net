// The floor as a store, and the control loop that keeps it in step with the
// order on a clock. The store has the shape React's useSyncExternalStore takes:
// `subscribe` and a snapshot that changes only when the floor does.
import type { Clock } from '../motion/clock.ts';
import { floorAtRest, promote, reconcile, type FloorState } from './floor.ts';

/** Holds the floor's current state and tells its listeners when it changes. */
export class Floor {
  readonly #listeners = new Set<() => void>();
  #state: FloorState;

  constructor(state: FloorState = floorAtRest()) {
    this.#state = state;
  }

  get state(): FloorState {
    return this.#state;
  }

  /** Applies a change; listeners hear of it only if the state is a new one. */
  apply(change: (state: FloorState) => FloorState): void {
    const next = change(this.#state);
    if (next === this.#state) return;
    this.#state = next;
    for (const listener of this.#listeners) listener();
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
}

export interface ControlLoopOptions {
  /** The clock time between two passes of the control room. */
  readonly tickMs?: number;
  /** The clock time a new job takes before its health check passes. */
  readonly startMs?: number;
}

/**
 * Runs the control room on the clock: on every advance, starting jobs that are
 * due become ready; once a tick, the control room corrects the floor one step,
 * unless a chapter holds it so the reader sees what changed first.
 */
export class ControlLoop {
  readonly #clock: Clock;
  readonly #stops: readonly (() => void)[];
  #heldUntil = 0;

  constructor(
    clock: Clock,
    floor: Floor,
    { tickMs = 650, startMs = 1500 }: ControlLoopOptions = {},
  ) {
    this.#clock = clock;
    this.#stops = [
      clock.every(0, (now) => {
        floor.apply((state) => promote(state, now, startMs));
      }),
      clock.every(tickMs, (now) => {
        if (now >= this.#heldUntil) floor.apply((state) => reconcile(state, now));
      }),
    ];
  }

  /** The control room corrects nothing for this much clock time; 0 lets it go at once. */
  holdFor(ms: number): void {
    this.#heldUntil = this.#clock.now + ms;
  }

  stop(): void {
    for (const stop of this.#stops) stop();
  }
}
