import { defineConfig } from 'vitest/config';

// Balanceamento completo (docs/05): fora do pnpm test para não deixar o CI lento.
// Uso: pnpm --filter @senhorio/engine balance   (BALANCE_GAMES=50 por padrão)
export default defineConfig({
  test: {
    include: ['balance/**/*.balance.ts'],
    testTimeout: 600_000,
  },
});
