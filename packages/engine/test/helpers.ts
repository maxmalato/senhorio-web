// Utilitários dos testes do motor (porta do Executor.brs do Roku).

import { expect } from 'vitest';
import { transition } from '../src/engine';
import { createFixedRandomizer } from '../src/random';
import { loadDefaultRules } from '../src/rules/load';
import type { Rules } from '../src/rules/types';
import { validateRules } from '../src/rules/validate';
import { createContext, currentPlayerIndex, newGame, propertyAt } from '../src/state';
import type {
  Action,
  EngineContext,
  GameEvent,
  GameState,
  Mode,
  TransitionResult,
} from '../src/types';

/**
 * Contexto com dados fixos (de dois em dois por rolagem, ex.: [3, 2, 6, 6]).
 * adjust permite alterar uma cópia das regras (ex.: desligar a RP-03).
 */
export function testContext(
  dice: number[] = [],
  options: { draws?: number[]; adjust?: (rules: Rules) => void } = {},
): EngineContext {
  const random = createFixedRandomizer(dice, options.draws ?? []);
  const loaded = loadDefaultRules();
  if (!options.adjust) return createContext(loaded, random);
  if (!loaded.ok) throw new Error('regras padrão inválidas');
  const rules = structuredClone(loaded.rules);
  options.adjust(rules);
  const checked = validateRules(rules);
  if (!checked.ok) throw new Error(`regras de teste inválidas: ${checked.errors[0]}`);
  return createContext(checked, random);
}

/** Partida em PRE_ROLL, ordem = [0, 1, ...], vez do jogador `turn` (padrão 0). */
export function testState(
  ctx: EngineContext,
  options: {
    players: number;
    turn?: number;
    positions?: number[];
    mode?: { type: Mode['type']; limit?: number | null };
  },
): GameState {
  const players = Array.from({ length: options.players }, (_, i) => ({
    name: `J${i}`,
    color: `cor${i}`,
  }));
  const created = newGame({ players, mode: options.mode ?? { type: 'classic' } }, ctx);
  if (!created.ok) throw new Error(`newGame recusou: ${created.reason.code}`);
  const state = created.state;
  // sem sorteios fixos, o embaralhamento mantém a ordem original
  state.turn = options.turn ?? 0;
  options.positions?.forEach((position, i) => {
    const player = state.players[i];
    if (player) player.position = position;
  });
  state.phase = 'PRE_ROLL';
  return state;
}

export function setOwner(state: GameState, position: number, player: number): void {
  propertyAt(state, position).owner = player;
}

export function setHouses(state: GameState, position: number, houses: number): void {
  propertyAt(state, position).houses = houses;
}

export function setMortgaged(state: GameState, position: number): void {
  propertyAt(state, position).mortgaged = true;
}

/** Coloca a carta `id` no topo do baralho. */
export function cardOnTop(state: GameState, deck: 'chance' | 'setback', id: string): void {
  state.decks[deck] = [id, ...state.decks[deck].filter((c) => c !== id)];
}

/** Aplica a ação esperando que seja aceita; falha o teste com o motivo, se recusada. */
export function act(
  state: GameState,
  action: Action,
  ctx: EngineContext,
): Extract<TransitionResult, { ok: true }> {
  const result = transition(state, action, ctx);
  if (!result.ok) {
    expect.fail(`${action.type} recusada: ${JSON.stringify(result.reason)}`);
  }
  return result;
}

/** Aplica a ação esperando recusa; devolve o código do motivo. */
export function refusalCode(state: GameState, action: Action, ctx: EngineContext): string {
  const result = transition(state, action, ctx);
  expect(result.ok).toBe(false);
  expect(result.state).toBe(state); // ação recusada não muda nada
  return result.reason?.code ?? '';
}

export function eventOf<T extends GameEvent['type']>(
  events: GameEvent[],
  type: T,
): Extract<GameEvent, { type: T }> | undefined {
  return events.find((event): event is Extract<GameEvent, { type: T }> => event.type === type);
}

export function hasEvent(events: GameEvent[], type: GameEvent['type']): boolean {
  return events.some((event) => event.type === type);
}

export function turnOf(state: GameState): number {
  return currentPlayerIndex(state);
}
