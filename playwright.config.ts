import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// Perfis de tela do docs/08-plano-de-testes.md. Todos usam o Chromium.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'off',
  },
  projects: [
    { name: 'celular', use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tv-hd',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'tv-full-hd',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: `pnpm --filter @senhorio/web build && pnpm --filter @senhorio/web preview --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    // sempre um build novo: reaproveitar um servidor antigo testaria uma versão velha
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
