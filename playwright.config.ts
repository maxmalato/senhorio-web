import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;
/** Servidor local da Cloudflare (wrangler dev): site + salas na mesma origem. */
const ROOMS_PORT = 8787;
const ROOMS_SPEC = /(rooms|table)\.spec\.ts/;

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
    { name: 'celular', testIgnore: ROOMS_SPEC, use: { ...devices['Pixel 7'] } },
    {
      name: 'tablet',
      testIgnore: ROOMS_SPEC,
      use: { ...devices['Desktop Chrome'], viewport: { width: 820, height: 1180 }, hasTouch: true },
    },
    {
      name: 'desktop',
      testIgnore: ROOMS_SPEC,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tv-hd',
      testIgnore: ROOMS_SPEC,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } },
    },
    {
      name: 'tv-full-hd',
      testIgnore: ROOMS_SPEC,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      // Etapa 4: dois navegadores na mesma sala, contra o servidor de salas
      name: 'salas',
      testMatch: ROOMS_SPEC,
      use: { ...devices['Desktop Chrome'], baseURL: `http://localhost:${ROOMS_PORT}` },
    },
  ],
  webServer: [
    {
      command: `pnpm --filter @senhorio/web build && pnpm --filter @senhorio/web preview --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      // sempre um build novo: reaproveitar um servidor antigo testaria uma versão velha
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      // serve o mesmo apps/web/dist do build acima; só sobe depois dele
      command: `pnpm --filter @senhorio/server exec wrangler dev --port ${ROOMS_PORT} --ip 127.0.0.1`,
      url: `http://localhost:${ROOMS_PORT}/api/health`,
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
