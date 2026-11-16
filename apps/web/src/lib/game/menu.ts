// Quando o menu do turno pode abrir (docs/03, "Interrupções"): só para o jogador da vez,
// antes de rolar, na decisão da prisão, depois de resolver a casa e na compra.
import type { GameState } from '@senhorio/engine';

const MENU_PHASES = ['PRE_ROLL', 'JAIL_DECISION', 'POST_RESOLUTION', 'PURCHASE_DECISION'];

export function menuAvailable(state: GameState): boolean {
  return MENU_PHASES.includes(state.phase) && state.pending === null;
}
