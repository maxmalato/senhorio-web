// O que a tela mostra agora. Começa igual ao estado anterior e anda junto com os eventos,
// para dinheiro, peões e casas mudarem na hora certa da animação (como o "m.vista" do Roku).
// Ao fim dos eventos, volta a ser uma cópia do estado do motor.

import type { GameState } from '@senhorio/engine';

export interface ViewPlayer {
  name: string;
  color: string;
  money: number;
  position: number;
  inJail: boolean;
  bankrupt: boolean;
  exitRound: number;
}

export interface ViewProperty {
  owner: number;
  houses: number;
  mortgaged: boolean;
}

export interface View {
  players: ViewPlayer[];
  properties: Record<string, ViewProperty>;
  current: number;
  round: number;
}

export function viewFrom(state: GameState): View {
  return {
    players: state.players.map((p) => ({
      name: p.name,
      color: p.color,
      money: p.money,
      position: p.position,
      inJail: p.inJail,
      bankrupt: p.bankrupt,
      exitRound: p.exitRound,
    })),
    properties: structuredClone(state.properties),
    current: state.order[state.turn] ?? 0,
    round: state.round,
  };
}
