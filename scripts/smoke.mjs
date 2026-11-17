// Teste de fumaça no endereço publicado (Etapa 5): confere que o site, as salas e a página
// de privacidade respondem. Não cria salas nem guarda nada.
// Uso: SITE_URL=https://exemplo.workers.dev [WAIT_SECONDS=300] node scripts/smoke.mjs
const base = (process.env.SITE_URL ?? '').replace(/\/$/, '');
if (!/^https?:\/\/[^/]+$/.test(base)) {
  console.error(
    'Defina SITE_URL com o endereço do jogo, sem caminho (ex.: https://exemplo.workers.dev).',
  );
  process.exit(2);
}

const checks = [
  ['saúde da API', '/api/health', 200, (body) => body.includes('"ok"')],
  ['tela inicial', '/', 200, (body) => body.includes('<div id="app"')],
  ['manifesto do aplicativo', '/manifest.webmanifest', 200, (body) => body.includes('Senhorio')],
  ['privacidade e termos', '/privacidade.html', 200, (body) => body.includes('LGPD')],
  ['sala inexistente', '/api/rooms/ZZZZZZ', 404, (body) => body.includes('notFound')],
];

// a CDN pode levar alguns segundos para servir a versão nova
async function fetchWithRetry(url, tries = 5) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'senhorio-smoke' } });
    } catch (error) {
      if (i >= tries) throw error;
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
}

// Na primeira publicação (ou depois de trocar o subdomínio), o endereço workers.dev leva
// alguns minutos para responder. WAIT_SECONDS espera a API ficar de pé antes de conferir.
const waitSeconds = Number(process.env.WAIT_SECONDS ?? 0);
const deadline = Date.now() + waitSeconds * 1000;
for (;;) {
  const ready = await fetch(base + '/api/health')
    .then((r) => r.status === 200)
    .catch(() => false);
  if (ready || Date.now() >= deadline) break;
  console.log('Esperando o endereço publicado responder…');
  await new Promise((r) => setTimeout(r, 15_000));
}

let failed = 0;
for (const [name, path, status, ok] of checks) {
  const response = await fetchWithRetry(base + path);
  const body = await response.text();
  const passed = response.status === status && ok(body);
  if (!passed) failed++;
  console.log(`${passed ? 'ok ' : 'ERRO'} ${name}: ${path} → ${response.status}`);
}
if (failed > 0) {
  console.error(`${failed} verificação(ões) falharam.`);
  process.exit(1);
}
console.log('Fumaça ok.');
