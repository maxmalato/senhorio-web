// Aviso de "sua vez" no modo de vários aparelhos (Etapa 6): som, vibração (celulares que
// permitem) e, se a pessoa estiver em outra aba, o título da aba piscando até ela voltar.
// Não usa notificações do sistema: nada a autorizar.

import { soundOn } from './preference';
import { playSound } from './synth';

let blink: ReturnType<typeof setInterval> | null = null;
let baseTitle = '';

function stopBlink(): void {
  if (blink) clearInterval(blink);
  blink = null;
  if (baseTitle) document.title = baseTitle;
  document.removeEventListener('visibilitychange', onVisible);
}

function onVisible(): void {
  if (!document.hidden) stopBlink();
}

export function notifyTurn(text: string): void {
  playSound('turn');
  if (soundOn()) navigator.vibrate?.([120, 80, 120]);
  if (typeof document === 'undefined' || !document.hidden || blink) return;
  baseTitle = document.title;
  let on = false;
  const flip = () => {
    on = !on;
    document.title = on ? `${text} · ${baseTitle}` : baseTitle;
  };
  flip();
  blink = setInterval(flip, 1000);
  document.addEventListener('visibilitychange', onVisible);
}

/** Para o aviso (saiu da sala, fim de partida). */
export function clearTurnNotice(): void {
  if (blink) stopBlink();
}
