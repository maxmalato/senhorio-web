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

  it('modo mesa: criar com table devolve o código e o token da mesa', async () => {
    const response = await exports.default.fetch('https://senhorio.example/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ mode: { type: 'classic' }, table: true }),
    });
    expect(response.status).toBe(201);
    const body = (await response.json()) as { code: string; tableToken: string };
    expect(body.code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    expect(body.tableToken.length).toBeGreaterThan(20);
  });
});
