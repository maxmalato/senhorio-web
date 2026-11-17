import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    svelte(),
    // PWA (Etapa 3): instalável e offline no modo um aparelho. A versão nova só entra
    // quando o jogador pede (registerType "prompt"), nunca no meio de uma partida.
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png', 'fonts/*.ttf', 'fonts/*.txt'],
      manifest: {
        id: '/',
        name: 'Senhorio',
        short_name: 'Senhorio',
        description:
          'Jogo de tabuleiro imobiliário em que o computador é o banco. De 2 a 6 jogadores.',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#13213a',
        theme_color: '#13213a',
        categories: ['games', 'entertainment'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // tudo o que o jogo precisa fica guardado no aparelho, inclusive as fontes
        globPatterns: ['**/*.{js,css,html,svg,png,ttf,txt,webmanifest}'],
        // menos os dados 3D (Three.js, ~130 KB): baixados só na primeira partida e então
        // guardados para jogar sem internet; sem eles, os dados 2D de sempre
        globIgnores: ['**/assets/dice3d-*.js'],
        runtimeCaching: [
          {
            urlPattern: /\/assets\/dice3d-[\w-]+\.js$/,
            handler: 'CacheFirst',
            options: { cacheName: 'senhorio-dice3d', expiration: { maxEntries: 2 } },
          },
        ],
        navigateFallback: '/index.html',
        // as salas sempre vão ao servidor, nunca ao que está guardado no aparelho
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // O arquivo dos dados 3D (Three.js) passa de 500 KB sem compressão; vem sob demanda
  build: { chunkSizeWarningLimit: 600 },
  // Salas (vários aparelhos): em desenvolvimento, /api vai para o servidor local da
  // Cloudflare (pnpm --filter @senhorio/server dev, porta 8787), inclusive o WebSocket.
  server: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
  preview: { proxy: { '/api': { target: 'http://localhost:8787', ws: true } } },
  // Nos testes, usar a versão de navegador do Svelte (montagem de componentes)
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,svelte}'],
      reporter: ['text', 'html'],
    },
  },
});
