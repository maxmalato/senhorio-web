// Carregamento sob demanda dos dados 3D: o Three.js vai num arquivo separado, baixado só
// quando a partida começa (preload) ou na primeira jogada. Falha vira reserva 2D.

import type { Dice3D } from './dice3d';
import { markUnavailable, use3D } from './preference';

let module: Promise<typeof import('./dice3d')> | null = null;

/** A cena dos dados 3D; rejeita se o arquivo não chegar ou o aparelho não tiver WebGL. */
export async function loadDice3D(): Promise<Dice3D> {
  module ??= import('./dice3d');
  try {
    return (await module).getDice3D();
  } catch (error) {
    markUnavailable();
    module = null;
    throw error;
  }
}

/** Começa a baixar o 3D com folga (início da partida), sem atrapalhar a tela. */
export function preloadDice3D(): void {
  if (!use3D()) return;
  const start = () => void loadDice3D().catch(() => {});
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 2000 });
  else setTimeout(start, 300);
}
