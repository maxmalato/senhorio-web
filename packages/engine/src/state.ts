// Estado da partida: criação, cópia e consultas simples (porta do Estado.brs do Roku).

import type { RulesResult, Space } from './rules/types';
import type { Randomizer } from './random';
import {
  BANK,
  type EngineContext,
  type GameEvent,
  type GameState,
  type NewGameConfig,
  type Player,
  type PropertyState,
  type Reason,
} from './types';

/** Contexto do motor a partir das regras já validadas. */
export function createContext(rules: RulesResult, random: Randomizer): EngineContext {
  if (!rules.ok) throw new Error(`regras inválidas: ${rules.errors[0] ?? ''}`);
  return { rules: rules.rules, index: rules.index, random };
}

export type NewGameResult =
  { ok: true; state: GameState; events: GameEvent[] } | { ok: false; reason: Reason };

/** RN-001 a RN-005: cria a partida em TURN_START do primeiro da ordem sorteada. */
export function newGame(config: NewGameConfig, ctx: EngineContext): NewGameResult {
  const p = ctx.rules.parameters;
  const list = config.players;
  if (list.length < p.minPlayers || list.length > p.maxPlayers) {
    return { ok: false, reason: { code: 'invalidPlayerCount', count: list.length } };
  }
  const colors = new Set<string>();
  for (const player of list) {
    // RN-002: nome curto e cor única
    const name = player.name.trim();
    if (name.length === 0 || name.length > p.maxNameLength) {
      return { ok: false, reason: { code: 'invalidName', name: player.name } };
    }
    if (colors.has(player.color)) {
      return { ok: false, reason: { code: 'duplicateColor', color: player.color } };
    }
    colors.add(player.color);
  }

  const { type } = config.mode;
  const limit = config.mode.limit ?? null;
  const limitOk =
    type === 'classic'
      ? limit === null
      : (type === 'time' || type === 'rounds') && Number.isInteger(limit) && (limit as number) > 0;
  if (!limitOk) return { ok: false, reason: { code: 'invalidMode', mode: type, limit } };

  const players: Player[] = list.map((player) => ({
    name: player.name.trim(),
    color: player.color,
    // RN-003 e RN-005: dinheiro inicial na Partida, sem bônus
    money: p.startingMoney,
    position: ctx.index.startPosition,
    inJail: false,
    jailTurns: 0,
    jailCards: [],
    bankrupt: false,
    exitRound: 0,
    ...(player.bot ? { bot: true as const } : {}),
  }));

  const properties: Record<string, PropertyState> = {};
  for (const position of ctx.index.properties) {
    properties[String(position)] = { owner: BANK, houses: 0, mortgaged: false };
  }

  const state: GameState = {
    rulesVersion: ctx.rules.version,
    phase: 'TURN_START',
    mode: { type, limit, timeUp: false },
    round: 1,
    turn: 0,
    // RN-004: o banco sorteia a ordem, que não muda durante a partida
    order: shuffle(
      players.map((_, i) => i),
      ctx,
    ),
    consecutiveDoubles: 0,
    lastDice: [],
    extraRoll: false,
    noExtraRoll: false,
    arrivedByCard: false,
    proposalsThisTurn: 0,
    players,
    properties,
    // RN-080: baralhos embaralhados no início; o topo é o primeiro da lista
    decks: {
      chance: shuffle(
        ctx.rules.cards.chance.map((card) => card.id),
        ctx,
      ),
      setback: shuffle(
        ctx.rules.cards.setback.map((card) => card.id),
        ctx,
      ),
    },
    currentCard: null,
    pending: null,
    ranking: null,
  };

  return { ok: true, state, events: [{ type: 'OrderDrawn', order: state.order }] };
}

/** Fisher-Yates com o sorteador do contexto; devolve uma lista nova. */
export function shuffle<T>(list: readonly T[], ctx: EngineContext): T[] {
  const copy = [...list];
  for (let i = copy.length - 1; i >= 1; i--) {
    const j = ctx.random.int(i + 1) - 1;
    [copy[i], copy[j]] = [copy[j] as T, copy[i] as T];
  }
  return copy;
}

/** Cópia profunda: a transição nunca altera o estado recebido. */
export function cloneState(state: GameState): GameState {
  return structuredClone(state);
}

export function currentPlayerIndex(state: GameState): number {
  return state.order[state.turn] as number;
}

export function currentPlayer(state: GameState): Player {
  return state.players[currentPlayerIndex(state)] as Player;
}

export function playerAt(state: GameState, index: number): Player {
  const player = state.players[index];
  if (!player) throw new Error(`jogador inexistente: ${index}`);
  return player;
}

/** Estado de uma propriedade; erro se a casa não for propriedade. */
export function propertyAt(state: GameState, position: number): PropertyState {
  const property = state.properties[String(position)];
  if (!property) throw new Error(`a casa ${position} não é uma propriedade`);
  return property;
}

export function isProperty(state: GameState, position: unknown): position is number {
  return Number.isInteger(position) && state.properties[String(position)] !== undefined;
}

/** Dados fixos da casa no rules.json. */
export function spaceAt(ctx: EngineContext, position: number): Space {
  const space = ctx.rules.spaces[position];
  if (!space) throw new Error(`casa inexistente: ${position}`);
  return space;
}

export function priceOf(ctx: EngineContext, position: number): number {
  const space = spaceAt(ctx, position);
  if (space.type !== 'street' && space.type !== 'station' && space.type !== 'utility') {
    throw new Error(`a casa ${position} não tem preço`);
  }
  return space.price;
}

export function houseRuleActive(ctx: EngineContext, code: string): boolean {
  return ctx.rules.houseRules[code]?.active === true;
}

/** RN-008: valores em R$ inteiros; frações arredondam ao mais próximo, 0,5 para cima. */
export function roundMoney(value: number): number {
  return Math.floor(value + 0.5);
}

export function activePlayers(state: GameState): number[] {
  return state.players.flatMap((player, i) => (player.bankrupt ? [] : [i]));
}

export function otherActivePlayers(state: GameState, player: number): number[] {
  return activePlayers(state).filter((i) => i !== player);
}

/** Posições das propriedades de um jogador, em ordem de tabuleiro. */
export function playerProperties(state: GameState, player: number, ctx: EngineContext): number[] {
  return ctx.index.properties.filter((position) => propertyAt(state, position).owner === player);
}
