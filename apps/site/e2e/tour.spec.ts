// The tour camera frames the part of the step in the middle of the screen.
import { expect, test } from '@playwright/test';
import { scriptErrors } from './page.ts';

test('the tour camera follows the steps', async ({ page }) => {
  const errors = scriptErrors(page);
  await page.goto('/');
  const camera = page.locator('figure[data-focus]');
  const steps = page.locator('[data-tour-step]');
  await expect(steps).toHaveCount(5);

  for (const step of await steps.all()) {
    const focus = await step.getAttribute('data-tour-step');
    await step.evaluate((el) => {
      el.scrollIntoView({ block: 'center' });
    });
    await expect(camera, `step "${String(focus)}"`).toHaveAttribute('data-focus', focus ?? '');
  }

  // Back above the tour, the camera shows the whole plant again.
  await steps.first().evaluate((el) => {
    el.scrollIntoView({ block: 'center' });
  });
  await expect(camera).toHaveAttribute('data-focus', 'machines');
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await expect(camera).toHaveAttribute('data-focus', 'all');
  expect(errors).toEqual([]);
});
