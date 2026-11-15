import { exports } from 'cloudflare:workers';
import { describe, expect, it } from 'vitest';

describe('Worker', () => {
  it('responde ao teste de saúde em /api/health', async () => {
    const response = await exports.default.fetch('https://senhorio.example/api/health');
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('devolve 404 para rota de API desconhecida', async () => {
    const response = await exports.default.fetch('https://senhorio.example/api/inexistente');
    expect(response.status).toBe(404);
  });
});
