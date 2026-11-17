// Recursos de tela para o modo mesa: manter a tela acesa durante a partida (Wake Lock) e
// tela cheia. Onde o navegador não oferece, o jogo segue normalmente sem eles.

/** Tela grande o bastante para servir de mesa (TV, notebook, computador, tablet). */
export const LARGE_SCREEN_QUERY = '(min-width: 600px) and (min-height: 600px)';

export function isLargeScreen(): boolean {
  return typeof matchMedia === 'function' && matchMedia(LARGE_SCREEN_QUERY).matches;
}

/**
 * Mantém a tela acesa enquanto a página estiver à vista; ao voltar para a aba, pede de novo
 * (o navegador solta a trava quando a aba some). Devolve a função que solta de vez.
 */
export function keepScreenAwake(): () => void {
  type Sentinel = { release: () => Promise<void> };
  const wakeLock = (
    navigator as Navigator & {
      wakeLock?: { request: (type: 'screen') => Promise<Sentinel> };
    }
  ).wakeLock;
  if (!wakeLock) return () => {};
  let sentinel: Sentinel | null = null;
  let active = true;
  const request = () => {
    if (!active || document.visibilityState !== 'visible') return;
    wakeLock
      .request('screen')
      .then((s) => {
        if (active) sentinel = s;
        else void s.release();
      })
      .catch(() => {
        // recusado (bateria fraca, política do navegador): a tela pode apagar
      });
  };
  document.addEventListener('visibilitychange', request);
  request();
  return () => {
    active = false;
    document.removeEventListener('visibilitychange', request);
    void sentinel?.release().catch(() => {});
    sentinel = null;
  };
}

/** Tela cheia: disponível? ativa agora? e o botão que liga e desliga. */
class Fullscreen {
  active = $state(false);

  constructor() {
    if (typeof document !== 'undefined')
      document.addEventListener('fullscreenchange', () => {
        this.active = document.fullscreenElement !== null;
      });
  }

  get supported(): boolean {
    return typeof document !== 'undefined' && document.fullscreenEnabled === true;
  }

  toggle(): void {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    else void document.documentElement.requestFullscreen().catch(() => {});
  }
}

export const fullscreen = new Fullscreen();
