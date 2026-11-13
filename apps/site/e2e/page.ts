// What the browser tests look for on the page, and the errors it reports.
import type { Locator, Page } from '@playwright/test';
import { stories } from '../src/hero/captions.ts';

/** Collects every script error and every console error the page reports. */
export function scriptErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

export function hero(page: Page) {
  const chapters = page.getByRole('group', { name: 'Chapters of the model' });
  const status = page.getByRole('status');
  return {
    chapters,
    chapter: (n: number): Locator => {
      const story = stories[n];
      if (!story) throw new Error(`The hero has no chapter ${String(n + 1)}`);
      return chapters.getByRole('button', { name: story.title });
    },
    pause: chapters.getByRole('button', { name: /^(Pause|Play) the model$/ }),
    status,
    /** The restore timer beside the status line. */
    timer: status.locator('xpath=following-sibling::span'),
  };
}
