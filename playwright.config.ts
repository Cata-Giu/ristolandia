import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:3001',
    locale: 'it-IT',
    timezoneId: 'Europe/Rome',
    launchOptions: {
      executablePath:
        process.env.PLAYWRIGHT_USE_BUNDLED === '1'
          ? undefined
          : (process.env.CHROMIUM_PATH ?? '/usr/bin/chromium'),
      args: ['--no-sandbox'],
    },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node server/index.mjs',
    url: 'http://127.0.0.1:3001/api/demo-info',
    reuseExistingServer: !process.env.CI,
  },
  reporter: [['list'], ['html', { open: 'never' }]],
});
