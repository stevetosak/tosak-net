// The browser tests run against the built page, served the way a visitor gets
// it, on a wide and a narrow screen.
import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env['CI']);
const port = 4321;

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: ci,
  reporter: ci ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${String(port)}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'wide',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'narrow',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: `pnpm preview --port ${String(port)}`,
    port,
    reuseExistingServer: !ci,
    // In an agent session astro preview detaches into the background, and
    // Playwright takes the exit for a failed server. Empty keeps it in front.
    env: { CLAUDECODE: '' },
  },
});
