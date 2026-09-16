import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev',
      cwd: '..',
      url: 'http://127.0.0.1:3100/api/docs',
      env: { PORT: '3100', FRONTEND_URL: 'http://127.0.0.1:5173' },
      reuseExistingServer: true,
      timeout: 120_000,
    },
    {
      command: 'npm run dev -- --host 127.0.0.1',
      cwd: '.',
      url: 'http://127.0.0.1:5173',
      env: { VITE_API_URL: 'http://127.0.0.1:3100/api' },
      reuseExistingServer: true,
      timeout: 120_000,
    },
  ],
});
