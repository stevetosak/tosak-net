import { describe, expect, it } from 'vitest';
import { Clock } from './clock.ts';
import { Player, type Chapter, type Position } from './player.ts';
import { FakeAnimation, flush, run, watch } from './test-support.ts';

const LENGTH = 1_000;
const GAP = 900;

/** A player over four chapters that each run an animation and wait a second; it records what happens. */
function setUp() {
  const clock = new Clock();
  const log: string[] = [];
  const positions: (Position | null)[] = [];
  const animations: FakeAnimation[] = [];
  const chapters: Chapter[] = [0, 1, 2, 3].map((n) => async () => {
    log.push(`start ${n}`);
    animations[n] = clock.track(new FakeAnimation());
    await clock.wait(LENGTH);
    log.push(`end ${n}`);
  });
  const player = new Player({
    clock,
    chapters,
    gap: GAP,
    reset: () => {
      const cancelled = animations.every((animation) => animation.playState === 'idle');
      log.push(cancelled ? 'reset' : 'reset before the abort');
    },
    onChange: (position) => positions.push(position),
  });
  return { clock, log, positions, player };
}

describe('Player', () => {
  it('plays the sequence in order, with a gap between chapters, then goes idle', async () => {
    const { clock, log, positions, player } = setUp();
    const played = watch(player.play(0, true));
    await run(clock, LENGTH + GAP - 32);
    expect(log).toEqual(['start 0', 'end 0']);
    await run(clock, 4 * LENGTH + 3 * GAP);
    expect(log).toEqual([
      'start 0',
      'end 0',
      'start 1',
      'end 1',
      'start 2',
      'end 2',
      'start 3',
      'end 3',
    ]);
    expect(positions).toEqual([
      { chapter: 0, sequence: true },
      { chapter: 1, sequence: true },
      { chapter: 2, sequence: true },
      { chapter: 3, sequence: true },
      null,
    ]);
    expect(played.state).toBe('resolved');
    expect(player.running).toBe(false);
  });

  it('plays one chapter alone', async () => {
    const { clock, log, positions, player } = setUp();
    await Promise.all([player.play(1, false), run(clock, 2 * LENGTH)]);
    expect(log).toEqual(['start 1', 'end 1']);
    expect(positions).toEqual([{ chapter: 1, sequence: false }, null]);
  });

  it('aborts the running chapter on a jump and resets the model before the next one starts', async () => {
    const { clock, log, positions, player } = setUp();
    const first = watch(player.play(0, true));
    await run(clock, LENGTH / 2);
    void player.jump(2);
    await flush();
    expect(log).toEqual(['start 0', 'reset', 'start 2']);
    expect(first.state).toBe('resolved');

    await run(clock, 3 * LENGTH + GAP);
    expect(log).toEqual(['start 0', 'reset', 'start 2', 'end 2', 'start 3', 'end 3']);
    expect(positions).toEqual([
      { chapter: 0, sequence: true },
      { chapter: 2, sequence: true },
      { chapter: 3, sequence: true },
      null,
    ]);
  });

  it('plays a chapter picked while nothing runs alone, without a reset', async () => {
    const { clock, log, player } = setUp();
    void player.jump(1);
    await run(clock, 3 * LENGTH);
    expect(log).toEqual(['start 1', 'end 1']);
  });

  it('starts the sequence after the autoplay delay of clock time', async () => {
    const { clock, log, player } = setUp();
    player.autoplay(1_400);
    clock.hold('offscreen');
    await run(clock, 5_000);
    expect(log).toEqual([]);
    clock.hold('offscreen', false);
    await run(clock, 1_400);
    expect(log).toEqual(['start 0']);
  });

  it('does not autoplay once the reader has started a chapter', async () => {
    const { clock, log, player } = setUp();
    player.autoplay(1_400);
    void player.jump(2);
    await run(clock, 3 * LENGTH);
    expect(log).toEqual(['start 2', 'end 2']);
  });

  it('passes on an error that is not an abort', async () => {
    const clock = new Clock();
    const player = new Player({
      clock,
      chapters: [() => Promise.reject(new Error('broken chapter'))],
      reset: () => undefined,
    });
    await expect(player.play(0, false)).rejects.toThrow('broken chapter');
  });
});
