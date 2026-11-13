// An axe scan of the whole page, with the model running and at rest.
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const reducedMotion of ['no-preference', 'reduce'] as const) {
  test(`axe finds no violation (motion: ${reducedMotion})`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion });
    await page.goto('/');
    const chapters = page.getByRole('group', { name: 'Chapters of the model' });
    await (reducedMotion === 'reduce'
      ? expect(chapters).toBeHidden()
      : expect(chapters).toBeVisible());

    const { violations } = await new AxeBuilder({ page }).analyze();
    const found = violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target.join(' ')),
    }));
    expect(found).toEqual([]);
  });
}
