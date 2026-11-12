// The player runs a model's chapters on its clock: one chapter, or the whole
// sequence from a chapter on. A jump to another chapter while one runs aborts
// the clock, so the running chapter's timers reject and its animations are
// cancelled, then puts the model back at rest before the new chapter starts.
import { Abort, type Clock } from './clock.ts';

/** A chapter: a script that changes the model and waits on its clock. */
export type Chapter = () => Promise<void>;

/** The chapter that runs, and whether the sequence goes on after it. */
export interface Position {
  readonly chapter: number;
  readonly sequence: boolean;
}

export interface PlayerOptions {
  readonly clock: Clock;
  readonly chapters: readonly Chapter[];
  /** Puts the model back at rest after a jump; the clock is already aborted. */
  readonly reset: () => void;
  /** Called when a chapter starts, and with null when the player goes idle. */
  readonly onChange?: (position: Position | null) => void;
  /** The clock time between two chapters of a sequence. */
  readonly gap?: number;
}

export class Player {
  readonly #clock: Clock;
  readonly #chapters: readonly Chapter[];
  readonly #reset: () => void;
  readonly #onChange: (position: Position | null) => void;
  readonly #gap: number;
  #session = 0;
  #running = false;
  #sequence = false;
  #started = false;

  constructor({ clock, chapters, reset, onChange = () => undefined, gap = 900 }: PlayerOptions) {
    this.#clock = clock;
    this.#chapters = chapters;
    this.#reset = reset;
    this.#onChange = onChange;
    this.#gap = gap;
  }

  get running(): boolean {
    return this.#running;
  }

  /**
   * Plays one chapter, or the sequence from it to the end. Resolves when it
   * ends, or at once when a later play takes over.
   */
  async play(first: number, sequence: boolean): Promise<void> {
    const session = ++this.#session;
    this.#started = true;
    if (this.#running) {
      this.#clock.abort();
      this.#reset();
    }
    this.#running = true;
    this.#sequence = sequence;
    for (let index = first; index < this.#chapters.length; index++) {
      const chapter = this.#chapters[index];
      if (!chapter) break;
      this.#onChange({ chapter: index, sequence });
      try {
        await chapter();
        if (sequence && index < this.#chapters.length - 1) await this.#clock.wait(this.#gap);
      } catch (error) {
        if (error instanceof Abort) return;
        throw error;
      }
      if (session !== this.#session) return;
      if (!sequence) break;
    }
    this.#running = false;
    this.#sequence = false;
    this.#onChange(null);
  }

  /** The reader picks a chapter: within a running sequence, the sequence goes on from it. */
  jump(chapter: number): Promise<void> {
    return this.play(chapter, this.#sequence);
  }

  /** Starts the sequence after the given clock time, unless the reader started a chapter first. */
  autoplay(delay: number): void {
    this.#clock.wait(delay).then(
      () => {
        if (!this.#started) void this.play(0, true);
      },
      () => undefined,
    );
  }
}
