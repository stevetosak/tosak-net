import { defineConfig } from 'vitest/config';

// Unit tests only; the browser tests under e2e/ run with Playwright.
export default defineConfig({
  test: { include: ['src/**/*.test.ts'] },
});
