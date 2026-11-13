// What the hero shows beside the floor: the jobs on their way out, the pieces in
// the air, the caption, the readout row in focus, the restore timer and the
// player's position. The chapters change it only through these methods; the
// island reads it with useSyncExternalStore, like the floor.
import type { Floor, FloorJob, FloorState, Point } from '@tosak/design/model';
import type { Position } from '@tosak/design/motion';
import { captions } from './captions.ts';

/** How a job leaves: it lifts off when the control room retires it, or sinks with its machine. */
export type Exit = 'rise' | 'sink';

export interface LeavingJob {
  readonly job: FloorJob;
  readonly exit: Exit;
}

/** A piece on its way: a release from the control room, or the database's copy from the store. */
export interface AirPiece {
  readonly id: number;
  readonly shape: 'ticket' | 'data';
  readonly at: Point;
}

/** The readout row a chapter points at. */
export type Focus = 'order' | 'floor';

export interface StageState {
  readonly leaving: readonly LeavingJob[];
  readonly air: readonly AirPiece[];
  readonly caption: string;
  readonly focus: Focus | null;
  /** The restore timer as shown, or null while it is hidden. */
  readonly timer: string | null;
  readonly position: Position | null;
  readonly paused: boolean;
}

const initial: StageState = {
  leaving: [],
  air: [],
  caption: captions.intro,
  focus: null,
  timer: null,
  position: null,
  paused: false,
};

/** How a job that left the floor goes: none for the database or when the whole plant goes. */
function exitOf(job: FloorJob, next: FloorState): Exit | null {
  if (next.dark || job.kind === 'data') return null;
  return next.down.has(job.worker) ? 'sink' : 'rise';
}

export class Stage {
  readonly #listeners = new Set<() => void>();
  #state: StageState = initial;
  #nextAir = 0;
  #resting = false;

  get state(): StageState {
    return this.#state;
  }

  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };

  /** Follows the floor: each job that leaves it stays on the stage until its exit has played. */
  watch(floor: Floor): () => void {
    let last = floor.state;
    return floor.subscribe(() => {
      const next = floor.state;
      const kept = new Set(next.jobs.map((job) => job.id));
      const left = this.#resting
        ? []
        : last.jobs.flatMap((job): LeavingJob[] => {
            const exit = kept.has(job.id) ? null : exitOf(job, next);
            return exit ? [{ job, exit }] : [];
          });
      last = next;
      if (left.length > 0) this.#set({ leaving: [...this.#state.leaving, ...left] });
    });
  }

  /** The exit of a job has played. */
  forget(id: number): void {
    if (!this.#state.leaving.some(({ job }) => job.id === id)) return;
    this.#set({ leaving: this.#state.leaving.filter(({ job }) => job.id !== id) });
  }

  /** Puts a piece in the air and returns its id. */
  lift(shape: AirPiece['shape'], at: Point): number {
    const id = this.#nextAir++;
    this.#set({ air: [...this.#state.air, { id, shape, at }] });
    return id;
  }

  land(id: number): void {
    this.#set({ air: this.#state.air.filter((piece) => piece.id !== id) });
  }

  say(caption: string): void {
    this.#set({ caption });
  }

  focusOn(focus: Focus | null): void {
    this.#set({ focus });
  }

  showTimer(timer: string | null): void {
    if (timer !== this.#state.timer) this.#set({ timer });
  }

  play(position: Position | null): void {
    this.#set(position ? { position } : { position, caption: captions.idle });
  }

  pause(paused: boolean): void {
    this.#set({ paused });
  }

  /**
   * Puts the floor back at rest after a chapter jump: the jobs it drops do not
   * play an exit, and nothing stays in the air.
   */
  rest(floor: Floor, atRest: () => FloorState): void {
    this.#resting = true;
    try {
      floor.apply(atRest);
    } finally {
      this.#resting = false;
    }
    this.#set({ leaving: [], air: [], focus: null, timer: null });
  }

  #set(change: Partial<StageState>): void {
    this.#state = { ...this.#state, ...change };
    for (const listener of this.#listeners) listener();
  }
}
