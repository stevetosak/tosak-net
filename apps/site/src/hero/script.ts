// The six chapters of the hero model, and the visitors' requests that run under
// them. A chapter changes the floor through the floor's functions and waits on
// the clock; the control loop does the rest, as it does on the real cluster.
// The steps and their timing follow the prototype's script (reference/page.html).
import { tokens } from '@tosak/design';
import {
  anchors,
  blackout,
  endRelease,
  failJob,
  fixed,
  inStep,
  jobsOn,
  lightUp,
  loseJob,
  release,
  requestTargets,
  restartJob,
  restoreData,
  slotOrigin,
  startMachine,
  stopMachine,
  workerIds,
  type ControlLoop,
  type Floor,
  type Place,
} from '@tosak/design/model';
import type { Chapter, Clock } from '@tosak/design/motion';
import { numbers } from '../numbers/index.ts';
import { captions } from './captions.ts';
import type { Stage } from './stage.ts';

/** What a chapter works with. */
export interface Scene {
  readonly clock: Clock;
  readonly floor: Floor;
  readonly loop: ControlLoop;
  readonly stage: Stage;
  readonly svg: SVGSVGElement;
  /** Applies a change to the stores and draws it at once, so the next line finds its elements. */
  readonly commit: (change: () => void) => void;
}

export const ease = {
  out: tokens['ease-out'],
  in: tokens['ease-in'],
  inOut: tokens['ease-in-out'],
} as const;

const ignore = (): void => undefined;
const translate = (x: number, y: number): string => `translate(${fixed(x, 1)}px, ${fixed(y, 1)}px)`;

/** The element a selector finds in the model; a missing part is a fault of the page. */
function find(root: ParentNode, selector: string): Element {
  const found = root.querySelector(selector);
  if (!found) throw new Error(`The hero model has no ${selector}`);
  return found;
}

/** The inner group of a piece, which the motion moves. */
export const pieceOf = (root: ParentNode): Element => find(root, '[data-piece]');

/** A jump along a parabola: dx and dy, lifted by `lift` at the middle. */
function arc(dx: number, dy: number, lift: number, steps: number): Keyframe[] {
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return { transform: translate(dx * t, dy * t - 4 * lift * t * (1 - t)) };
  });
}

/** The restore timer: the drill's real length, played over the copy's flight. */
function drillTime(progress: number): string {
  const seconds = Math.round(Math.min(1, Math.max(0, progress)) * numbers.drill.minutes * 60);
  return `${String(Math.floor(seconds / 60))}:${String(seconds % 60).padStart(2, '0')}`;
}

const FALL: Keyframe[] = [
  { transform: translate(0, 0), opacity: 1 },
  { transform: translate(0, 26), opacity: 0 },
];
const RISE: Keyframe[] = [...FALL].reverse();

export function chapters(scene: Scene): Chapter[] {
  const { clock, floor, loop, stage, svg, commit } = scene;
  const settled = (): boolean => inStep(floor.state);
  const animation = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) =>
    el.animate(frames, { fill: 'both', easing: ease.out, ...options });
  const play = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) =>
    clock.complete(animation(el, frames, options));
  const airPiece = (id: number): Element => pieceOf(find(svg, `[data-air="${String(id)}"]`));
  let shipped = 0;

  /** The database's copy flies from the store to its held slot and lands there. */
  async function restore(place: Place, ms: number, timed: boolean): Promise<void> {
    const from = anchors.vaultTop;
    const [x, y] = slotOrigin(place.worker, place.slot);
    let id = 0;
    commit(() => {
      id = stage.lift('data', from);
    });
    const startedAt = clock.now;
    const stopTimer = timed
      ? clock.every(0, (now) => {
          stage.showTimer(drillTime((now - startedAt) / ms));
        })
      : ignore;
    try {
      await play(airPiece(id), arc(x - from[0], y - from[1], 100, 16), {
        duration: ms,
        easing: ease.inOut,
      });
    } finally {
      stopTimer();
    }
    if (timed) stage.showTimer(drillTime(1));
    commit(() => {
      stage.land(id);
      floor.apply((state) => restoreData(state, place, clock.now));
    });
  }

  async function theOrder(): Promise<void> {
    stage.say(captions.order.order);
    stage.focusOn('order');
    await clock.wait(2800);
    stage.say(captions.order.compare);
    stage.focusOn('floor');
    await clock.wait(2800);
    stage.focusOn(null);
    stage.say(settled() ? captions.order.match : captions.order.differ);
    await clock.until(settled);
    await clock.wait(2200);
  }

  async function aRelease(): Promise<void> {
    const apps = [...floor.state.order.keys()];
    const app = apps[shipped++ % apps.length];
    if (app === undefined) return;
    let id = 0;
    commit(() => {
      id = stage.lift('ticket', anchors.towerTop);
    });
    stage.say(captions.release.merged);
    const ticket = airPiece(id);
    await play(
      ticket,
      [
        { transform: translate(0, -90), opacity: 0 },
        { transform: translate(0, 0), opacity: 1 },
      ],
      { duration: 600 },
    );
    floor.apply((state) => release(state, app));
    loop.holdFor(1800);
    await clock.wait(1800);
    play(ticket, [{ opacity: 1 }, { opacity: 0 }], { duration: 500 }).then(() => {
      stage.land(id);
    }, ignore);
    stage.say(captions.release.starts);
    await clock.wait(2400);
    stage.say(captions.release.outline);
    await clock.until(settled);
    stage.say(captions.release.live);
    await clock.wait(2400);
    floor.apply((state) => endRelease(state, app));
    await clock.wait(600);
  }

  async function aJobFails(): Promise<void> {
    const pool = requestTargets(floor.state);
    const job = pool[Math.floor(pool.length / 2)];
    if (!job) return;
    stage.say(captions.fail.fails);
    floor.apply((state) => failJob(state, job.id));
    await clock.wait(2400);
    stage.say(captions.fail.restarts);
    floor.apply((state) => restartJob(state, job.id, clock.now));
    await clock.until(settled);
    stage.say(captions.fail.answers);
    await clock.wait(2400);
  }

  async function aMachineStops(): Promise<void> {
    const state = floor.state;
    const worker = workerIds
      .filter((id) => !state.down.has(id) && !jobsOn(state, id).some((job) => job.kind === 'data'))
      .toSorted((a, b) => jobsOn(state, b).length - jobsOn(state, a).length)[0];
    if (worker === undefined) return;
    loop.holdFor(1800);
    floor.apply((next) => stopMachine(next, worker));
    stage.say(captions.stop.stops);
    await clock.wait(1800);
    stage.say(captions.stop.moves);
    await clock.until(settled);
    await clock.wait(1400);
    floor.apply((next) => startMachine(next, worker));
    stage.say(captions.stop.back);
    await clock.wait(2400);
  }

  async function theDataIsLost(): Promise<void> {
    const data = floor.state.jobs.find((job) => job.kind === 'data');
    if (!data) return;
    stage.say(captions.lose.gone);
    const plates = [...pieceOf(find(svg, `[data-id="${String(data.id)}"]`)).children].reverse();
    await Promise.all(
      plates.map((plate, i) =>
        play(
          plate,
          [
            { transform: translate(0, 0), opacity: 1 },
            { transform: translate((i - 1) * 16, 22 + i * 6), opacity: 0 },
          ],
          { duration: 520, delay: i * 90, easing: ease.in },
        ),
      ),
    );
    floor.apply((state) => loseJob(state, data.id));
    await clock.wait(1200);
    stage.say(captions.lose.copy);
    await restore({ worker: data.worker, slot: data.slot }, 2600, true);
    stage.say(captions.lose.restored);
    await clock.wait(2800);
    stage.showTimer(null);
  }

  async function everythingIsLost(): Promise<void> {
    // The plant falls column by column, left to right, and rises the same way.
    const columns: Element[][] = [
      [find(svg, '[data-part="door"]')],
      ...workerIds.map((id) => [
        find(svg, `[data-machine="${id}"]:not([data-job])`),
        find(svg, `[data-layer="${id}"]`),
        find(svg, `[data-lamp="${id}"]`),
      ]),
      [find(svg, '[data-machine="control"]'), find(svg, '[data-lamp="control"]')],
    ];
    const moved: Animation[] = [];
    const move = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
      const motion = animation(el, frames, options);
      moved.push(motion);
      return clock.complete(motion);
    };
    stage.say(captions.rebuild.gone);
    await Promise.all(
      columns.flatMap((column, i) =>
        column.map((el) => move(el, FALL, { duration: 520, delay: i * 110, easing: ease.in })),
      ),
    );
    floor.apply(blackout);
    const place = floor.state.reserved[0];
    await clock.wait(1000);
    stage.say(captions.rebuild.machines);
    await Promise.all(
      columns.flatMap((column, i) =>
        column
          .filter((el) => !el.matches('[data-layer]'))
          .map((el) => move(el, RISE, { duration: 560, delay: i * 150 })),
      ),
    );
    for (const motion of moved) motion.cancel();
    floor.apply(lightUp);
    stage.say(captions.rebuild.jobs);
    await clock.until(settled);
    await clock.wait(500);
    if (place) {
      stage.say(captions.rebuild.data);
      await restore(place, 2000, false);
    }
    stage.say(captions.rebuild.done);
    await clock.wait(2800);
  }

  return [theOrder, aRelease, aJobFails, aMachineStops, theDataIsLost, everythingIsLost];
}

/** How often a visitor's request comes in, and how long it takes to reach its job. */
const DOT_MS = 340;
const DOT_TRIP_MS = 2000;

/**
 * The visitors' requests: one each DOT_MS while a dot is free. A request comes
 * in at the loading dock and goes only to a job whose health check passes.
 * Returns the function that stops them.
 */
export function requests({ clock, floor }: Scene, dots: readonly Element[]): () => void {
  const busy = new Set<Element>();
  const [sx, sy] = anchors.arrival;
  const [gx, gy] = anchors.doorThrough;
  return clock.every(DOT_MS, () => {
    if (floor.state.dark) return;
    const dot = dots.find((candidate) => !busy.has(candidate));
    const targets = requestTargets(floor.state);
    const job = targets[Math.floor(Math.random() * targets.length)];
    if (!dot || !job) return;
    const [bx, by] = slotOrigin(job.worker, job.slot);
    const tx = bx + anchors.blockTip[0];
    const ty = by + anchors.blockTip[1];
    busy.add(dot);
    const trip = dot.animate(
      [
        { transform: translate(sx, sy), opacity: 0 },
        { transform: translate((sx + gx) / 2, (sy + gy) / 2), opacity: 1, offset: 0.18 },
        { transform: translate(gx, gy), opacity: 1, offset: 0.4 },
        { transform: translate(tx, ty), opacity: 1, offset: 0.92 },
        { transform: translate(tx, ty), opacity: 0 },
      ],
      { duration: DOT_TRIP_MS, easing: 'linear' },
    );
    clock
      .track(trip)
      .finished.catch(ignore)
      .finally(() => busy.delete(dot));
  });
}
