import { loadDefaultRules } from '@senhorio/engine';
import { normalizeCode, parseModeConfig } from '@senhorio/protocol';
import { newRoomCode } from './codes';
import type { Env } from './env';
import { allow } from './rate-limit';

export { Room } from './room';

const RULES = loadDefaultRules();
if (!RULES.ok) throw new Error('regras inválidas');
const MODE_OPTIONS = {
  time: RULES.rules.modes.time.optionsMinutes,
  rounds: RULES.rules.modes.rounds.options,
};

/** Tentativas por minuto e por endereço. */
const LIMITS = { create: 10, lookup: 60 };

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

function clientKey(request: Request): string {
  return request.headers.get('CF-Connecting-IP') ?? 'local';
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/api/health') return json({ status: 'ok' });

    // criar sala: POST /api/rooms { mode }
    if (path === '/api/rooms') {
      if (request.method !== 'POST') return json({ error: 'methodNotAllowed' }, 405);
      if (!allow(`create:${clientKey(request)}`, LIMITS.create))
        return json({ error: 'tooManyRequests' }, 429);
      const body = await request.json().catch(() => null);
      const mode = parseModeConfig((body as { mode?: unknown } | null)?.mode, MODE_OPTIONS);
      if (!mode) return json({ error: 'invalidMode' }, 400);
      for (let attempt = 0; attempt < 5; attempt++) {
        const code = newRoomCode();
        const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
        if (await stub.init(code, mode)) return json({ code }, 201);
      }
      return json({ error: 'tryAgain' }, 503);
    }

    // sala existente: GET /api/rooms/CODIGO (resumo) e /api/rooms/CODIGO/ws (conexão)
    const match = /^\/api\/rooms\/([^/]+)(\/ws)?$/.exec(path);
    if (match) {
      const code = normalizeCode(decodeURIComponent(match[1] ?? ''));
      if (!allow(`lookup:${clientKey(request)}`, LIMITS.lookup))
        return json({ error: 'tooManyRequests' }, 429);
      if (!code) return json({ error: 'notFound' }, 404);
      const stub = env.ROOMS.get(env.ROOMS.idFromName(code));
      if (match[2]) return stub.fetch(request);
      const info = await stub.info();
      return info ? json(info) : json({ error: 'notFound' }, 404);
    }

    if (path.startsWith('/api/')) return json({ error: 'notFound' }, 404);
    return json({ error: 'notFound' }, 404);
  },
} satisfies ExportedHandler<Env>;
