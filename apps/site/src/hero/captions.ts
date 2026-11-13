// What the hero model says: the caption of each moment of each chapter. The
// moving model shows them one at a time under the plant; without motion the
// page shows each chapter's story as text. Both read them from here, so the
// two never say different things.
import { dayMonth, numbers } from '../numbers/index.ts';

const { drill } = numbers;
const about = 'A small factory that keeps itself in step with Git.';

export const captions = {
  /** What the model is, for the page without motion too. */
  about,
  intro: `${about} Each dot is a visitor’s request.`,
  idle: 'In step with Git. Each dot is a visitor’s request.',
  order: {
    order: 'Git holds the order: what must run, and how many copies.',
    compare: 'The control room compares it with the floor, again and again.',
    match: 'They match, so there is nothing to do.',
    differ: 'They differ, so it corrects the floor.',
  },
  release: {
    merged: 'A release is merged in Git, and the order changes.',
    starts: 'The floor no longer matches, so the control room starts the new release.',
    outline: 'A new job starts as an outline. It gets requests when its health check passes.',
    live: 'The new release is live. Nothing went down on the way.',
  },
  fail: {
    fails: 'A job stops answering its health check.',
    restarts: 'It gets no more requests, and it restarts where it is.',
    answers: 'It answers again. Nobody touched it.',
  },
  stop: {
    stops: 'A machine stops, and its jobs stop with it.',
    moves: 'The control room sees the gap and starts them again on the other machines.',
    back: 'The machine is back, empty. New jobs can land on it.',
  },
  lose: {
    gone: 'The database is gone. Unlike a job, it cannot be started again from the order.',
    copy: 'It comes back from the offsite copy.',
    restored: `Restored. The monthly drill does this for real: ${String(drill.minutes)} minutes on ${dayMonth(drill.ranAt)}.`,
  },
  rebuild: {
    gone: 'Everything is gone. Only the offsite copy is left.',
    machines: 'One command, kluster, builds the machines again.',
    jobs: 'The control room reads Git and starts every job.',
    data: 'Then the data, from the offsite copy.',
    done: 'Rebuilt from scratch with kluster, the Go CLI I wrote.',
  },
} as const;

/** A chapter as text: its name, and what happens in it, in order. */
export interface Story {
  readonly title: string;
  readonly lines: readonly string[];
}

/** The six chapters, in the order they play. */
export const stories: readonly Story[] = [
  {
    title: 'The order',
    lines: [
      captions.order.order,
      captions.order.compare,
      'When they differ, it corrects the floor.',
    ],
  },
  {
    title: 'A release',
    lines: [
      captions.release.merged,
      captions.release.starts,
      captions.release.outline,
      captions.release.live,
    ],
  },
  {
    title: 'A job fails',
    lines: [captions.fail.fails, captions.fail.restarts, captions.fail.answers],
  },
  {
    title: 'A machine stops',
    lines: [captions.stop.stops, captions.stop.moves, captions.stop.back],
  },
  {
    title: 'The data is lost',
    lines: [captions.lose.gone, captions.lose.copy, captions.lose.restored],
  },
  {
    title: 'Everything is lost',
    lines: [
      captions.rebuild.gone,
      captions.rebuild.machines,
      captions.rebuild.jobs,
      captions.rebuild.data,
      captions.rebuild.done,
    ],
  },
];
