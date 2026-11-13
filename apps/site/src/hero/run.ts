// Starts the hero model in the browser: the control loop, the requests and the
// chapters on one clock that frames drive. The clock holds while the model is
// off screen, while the page is hidden, and while the reader has paused it.
import { ControlLoop, floorAtRest, type Floor } from '@tosak/design/model';
import { driveClock, Player, type Clock } from '@tosak/design/motion';
import { flushSync } from 'react-dom';
import { chapters, requests, type Scene } from './script.ts';
import type { Stage } from './stage.ts';

/** The clock time a new job takes before its health check passes, and between two passes of the control room. */
const START_MS = 1500;
const TICK_MS = 650;
/** The clock time before the chapters start on their own, and between two of them. */
const AUTOPLAY_MS = 1400;
const GAP_MS = 900;

export interface HeroParts {
  readonly clock: Clock;
  readonly floor: Floor;
  readonly stage: Stage;
  readonly svg: SVGSVGElement;
}

/** What the reader's controls do to a running model. */
export interface HeroControls {
  /** Plays a chapter; within a running sequence, the sequence goes on from it. */
  jump(chapter: number): void;
  togglePause(): void;
  stop(): void;
}

export function runHero({ clock, floor, stage, svg }: HeroParts): HeroControls {
  const loop = new ControlLoop(clock, floor, { tickMs: TICK_MS, startMs: START_MS });
  const scene: Scene = {
    clock,
    floor,
    loop,
    stage,
    svg,
    commit: (change) => {
      flushSync(change);
    },
  };
  const player = new Player({
    clock,
    chapters: chapters(scene),
    reset: () => {
      stage.rest(floor, () => floorAtRest());
      loop.holdFor(0);
    },
    onChange: (position) => {
      stage.play(position);
    },
    gap: GAP_MS,
  });
  const stopWatching = stage.watch(floor);
  const stopRequests = requests(scene, [...svg.querySelectorAll('[data-dot]')]);
  const stopFrames = driveClock(clock);

  const seen = new IntersectionObserver(([entry]) => {
    if (entry) clock.hold('offscreen', !entry.isIntersecting);
  });
  seen.observe(svg);
  const onVisibility = (): void => {
    clock.hold('hidden', document.hidden);
  };
  document.addEventListener('visibilitychange', onVisibility);
  onVisibility();
  player.autoplay(AUTOPLAY_MS);

  const setPaused = (paused: boolean): void => {
    clock.hold('user', paused);
    stage.pause(paused);
  };

  return {
    jump(chapter) {
      setPaused(false);
      void player.jump(chapter);
    },
    togglePause() {
      setPaused(!stage.state.paused);
    },
    stop() {
      clock.abort();
      stopFrames();
      stopRequests();
      stopWatching();
      loop.stop();
      seen.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    },
  };
}
