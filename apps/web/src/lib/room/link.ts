// Link de convite para uma sala (QR Code e "Compartilhar"). O código da sala é o único
// segredo da sala: o link vale só enquanto a sala existe, e o jogo tira o código da barra
// de endereço assim que o lê.

import { normalizeCode } from '@senhorio/protocol';

const PARAM = 'sala';

/** Link que abre "Entrar na sala" com o código preenchido. */
export function roomLink(code: string, origin = location.origin): string {
  return `${origin}/?${PARAM}=${code}`;
}

/** Código de sala no endereço (?sala=ABC234), ou null. */
export function codeFromUrl(search = location.search): string | null {
  const raw = new URLSearchParams(search).get(PARAM);
  return raw ? normalizeCode(raw) : null;
}

/** Tira o código da barra de endereço (sem recarregar), mantendo os outros parâmetros. */
export function clearCodeFromUrl(): void {
  const url = new URL(location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
}
