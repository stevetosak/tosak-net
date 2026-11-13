// The running hero model: its chapters play through, and Pause holds it.
import { expect, test } from '@playwright/test';
import { captions, stories } from '../src/hero/captions.ts';
import { hero, scriptErrors } from './page.ts';

test('every chapter plays to its end without a script error', async ({ page }) => {
  test.setTimeout(150_000);
  const errors = scriptErrors(page);
  await page.goto('/');
  const { chapter, status } = hero(page);

  // The sequence starts on its own and plays each chapter in turn.
  for (const [n, story] of stories.entries()) {
    await expect(chapter(n), story.title).toHaveAttribute('aria-current', 'true', {
      timeout: 30_000,
    });
  }
  await expect(status).toHaveText(captions.idle, { timeout: 30_000 });
  for (const n of stories.keys()) await expect(chapter(n)).not.toHaveAttribute('aria-current');
  expect(errors).toEqual([]);
});

test('Pause holds the caption and the restore timer', async ({ page }) => {
  const errors = scriptErrors(page);
  await page.goto('/');
  const { chapters, chapter, pause, status, timer } = hero(page);
  const lose = stories.findIndex(({ title }) => title === 'The data is lost');

  // The model holds while it is off screen, so keep it in view with the buttons,
  // as a reader does; a click alone would centre the button and scroll it away.
  await chapters.evaluate((el) => {
    el.scrollIntoView({ block: 'end' });
  });
  await expect(page.locator('figure svg').first()).toBeInViewport();
  await chapter(lose).click();
  await expect(status).toHaveText(captions.lose.copy, { timeout: 15_000 });
  await expect(timer).not.toHaveText('0:00');

  await pause.click();
  await expect(pause).toHaveAccessibleName('Play the model');
  const held = { caption: await status.textContent(), time: await timer.textContent() };
  await page.waitForTimeout(2_000);
  expect({ caption: await status.textContent(), time: await timer.textContent() }).toEqual(held);
  const running = await page.evaluate(
    () => document.getAnimations().filter((motion) => motion.playState === 'running').length,
  );
  expect(running, 'animations still running while paused').toBe(0);

  await pause.click();
  await expect(pause).toHaveAccessibleName('Pause the model');
  await expect(status).toHaveText(captions.lose.restored, { timeout: 15_000 });
  expect(errors).toEqual([]);
});
