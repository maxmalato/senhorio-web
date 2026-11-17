// Adversário controlado pelo computador ("jogar contra o computador"). Diferente do robô
// da simulação (sim/bot.ts), que decide ao acaso, este joga para ganhar sem trapacear: só
// usa o que qualquer jogador vê no tabuleiro e só pede ações que o motor aceita.
// Os números abaixo são estratégia do adversário, não regras do jogo (as regras e os
// valores do jogo continuam todos no rules.json).

import { buildableStreets, houseCost, streetsWithSellableHouse } from '../building';
import { mortgageableProperties, redeemCost } from '../mortgage';
import type { RandomSource } from '../random';
import { isGroupComplete } from '../rent';
import {
  activePlayers,
  currentPlayerIndex,
  houseRuleActive,
  playerProperties,
  priceOf,
  propertyAt,
} from '../state';
import { isTradable, tradeTargets } from '../trade';
import type { Action, EngineContext, GameState } from '../types';
import { BANK } from '../types';

export const OPPONENT = {
  /** Reserva mínima de dinheiro depois de comprar, construir ou resgatar. */
  baseReserve: 120,
  /** A reserva cresce com cada casa que os outros têm (aluguéis mais caros por aí). */
  reservePerOpponentHouse: 25,
  maxReserve: 450,
  /** Chance, por pré-rolagem, de tentar comprar a propriedade que falta num grupo. */
  proposalChance: 0.3,
  /** Quanto oferece, sobre o preço, pela propriedade que completa o grupo dele. */
  proposalPremium: 1.6,
  /** Vender barato a peça que completa o grupo de outra pessoa: só por bem mais que o preço. */
  sellCompletingFactor: 2.5,
  sellOwnPairFactor: 2,
  sellFactor: 1.2,
  /** Comprar de outra pessoa: até um pouco acima do preço, ou o dobro se completar o grupo. */
  buyFactor: 1.1,
  buyCompletingFactor: 2,
  /** Com tantas propriedades ainda no banco, vale sair logo da prisão para comprar. */
  earlyGameUnowned: 8,
} as const;

/** Quem decide agora: a vez, a resposta a uma proposta, quem deve ou quem faliu (-1 se ninguém). */
export function decidingPlayer(state: GameState): number {
  if (state.phase === 'GAME_OVER') return -1;
  const pending = state.pending;
  if (pending?.type === 'trade') return pending.other;
  if (state.phase === 'RAISE_MONEY' && pending?.type === 'collection' && pending.debt) {
    return pending.debt.debtor;
  }
  if (state.phase === 'BANKRUPTCY' && pending?.type === 'collection' && pending.bankruptcy) {
    return pending.bankruptcy.player;
  }
  return currentPlayerIndex(state);
}

function groupOf(ctx: EngineContext, position: number): string | null {
  const space = ctx.rules.spaces[position];
  return space?.type === 'street' ? space.group : null;
}

function groupPositions(ctx: EngineContext, group: string): number[] {
  return ctx.rules.groups[group]?.positions ?? [];
}

/** Ficar com `position` completa um grupo de `player` (ele já tem todas as outras ruas). */
export function completesGroup(
  state: GameState,
  ctx: EngineContext,
  position: number,
  player: number,
): boolean {
  const group = groupOf(ctx, position);
  if (!group) return false;
  return groupPositions(ctx, group)
    .filter((p) => p !== position)
    .every((p) => propertyAt(state, p).owner === player);
}

/** Ficar com `position` impede outra pessoa de completar o grupo. */
function blocksOpponent(
  state: GameState,
  ctx: EngineContext,
  position: number,
  player: number,
): boolean {
  return activePlayers(state).some(
    (other) => other !== player && completesGroup(state, ctx, position, other),
  );
}

/** Dinheiro que o adversário guarda para pagar aluguéis sem se enrolar. */
export function reserveFor(state: GameState, ctx: EngineContext, player: number): number {
  let houses = 0;
  for (const position of ctx.index.properties) {
    const property = propertyAt(state, position);
    if (property.owner !== BANK && property.owner !== player) houses += property.houses;
  }
  return Math.min(
    OPPONENT.maxReserve,
    OPPONENT.baseReserve + houses * OPPONENT.reservePerOpponentHouse,
  );
}

function inCompleteGroup(state: GameState, ctx: EngineContext, position: number): boolean {
  const group = groupOf(ctx, position);
  const owner = propertyAt(state, position).owner;
  return group !== null && owner !== BANK && isGroupComplete(state, group, owner, ctx);
}

export function opponentDecision(
  state: GameState,
  ctx: EngineContext,
  random: RandomSource,
): Action {
  const me = decidingPlayer(state);
  const player = state.players[me];
  if (!player) return { type: 'CONFIRM' };
  const reserve = reserveFor(state, ctx, me);

  if (state.pending?.type === 'trade') return respondToTrade(state, ctx, me, reserve);

  switch (state.phase) {
    case 'TURN_START':
      return { type: 'START_TURN' };
    case 'CARD':
    case 'BANKRUPTCY':
      return { type: 'CONFIRM' };
    case 'JAIL_DECISION': {
      const unowned = ctx.index.properties.filter((p) => propertyAt(state, p).owner === BANK);
      // com a RP-03, o dono preso não cobra aluguel: quem tem propriedade rendendo sai logo
      const losesRent =
        houseRuleActive(ctx, 'RP-03') &&
        playerProperties(state, me, ctx).some((p) => !propertyAt(state, p).mortgaged);
      if (unowned.length >= OPPONENT.earlyGameUnowned || losesRent) {
        if (player.jailCards.length > 0) return { type: 'USE_JAIL_CARD' };
        if (player.money - ctx.rules.parameters.bail >= reserve) return { type: 'PAY_BAIL' };
      }
      // sem nada para alugar e com o tabuleiro já comprado: preso não cai nas casas dos
      // outros, então tenta a dupla
      return improve(state, ctx, me, reserve) ?? { type: 'ROLL_DICE' };
    }
    case 'PURCHASE_DECISION': {
      const position = player.position;
      const price = priceOf(ctx, position);
      const strategic =
        completesGroup(state, ctx, position, me) || blocksOpponent(state, ctx, position, me);
      const affordable = strategic ? player.money >= price : player.money - price >= reserve;
      return affordable ? { type: 'BUY' } : { type: 'DECLINE_PURCHASE' };
    }
    case 'PRE_ROLL':
      return (
        improve(state, ctx, me, reserve) ??
        proposal(state, ctx, me, reserve, random) ?? { type: 'ROLL_DICE' }
      );
    case 'POST_RESOLUTION':
      if (state.extraRoll) return { type: 'ROLL_DICE' };
      return improve(state, ctx, me, reserve) ?? { type: 'END_TURN' };
    case 'RAISE_MONEY':
      return raiseMoney(state, ctx, me);
    default:
      return { type: 'CONFIRM' };
  }
}

/** Resgata hipotecas e constrói, sempre guardando a reserva. */
function improve(state: GameState, ctx: EngineContext, me: number, reserve: number): Action | null {
  const money = state.players[me]?.money ?? 0;
  // primeiro o que rende mais: ruas de grupo completo hipotecadas
  const mortgaged = playerProperties(state, me, ctx)
    .filter((p) => propertyAt(state, p).mortgaged)
    .sort(
      (a, b) => Number(inCompleteGroup(state, ctx, b)) - Number(inCompleteGroup(state, ctx, a)),
    );
  for (const position of mortgaged) {
    if (money - redeemCost(ctx, position) >= reserve + 100) return { type: 'REDEEM', position };
  }
  // a rua com menos casas primeiro (o motor exige construção uniforme no grupo)
  const streets = buildableStreets(state, me, ctx).sort(
    (a, b) => propertyAt(state, a).houses - propertyAt(state, b).houses,
  );
  const street = streets[0];
  if (street !== undefined && money - houseCost(ctx, street) >= reserve) {
    return { type: 'BUILD', position: street };
  }
  return null;
}

/** Tenta comprar de outra pessoa a rua que falta para completar um grupo. */
function proposal(
  state: GameState,
  ctx: EngineContext,
  me: number,
  reserve: number,
  random: RandomSource,
): Action | null {
  if (state.proposalsThisTurn > 0 || random() >= OPPONENT.proposalChance) return null;
  const money = state.players[me]?.money ?? 0;
  const targets = tradeTargets(state); // RN-075/RN-090: nunca presos ou falidos
  for (const position of ctx.index.properties) {
    const owner = propertyAt(state, position).owner;
    if (!targets.includes(owner)) continue;
    if (!completesGroup(state, ctx, position, me) || !isTradable(state, position, ctx)) continue;
    const amount = Math.round(priceOf(ctx, position) * OPPONENT.proposalPremium);
    if (money - amount < reserve) continue;
    return { type: 'PROPOSE_TRADE', direction: 'buy', position, amount, otherPlayer: owner };
  }
  return null;
}

/** Resposta a uma venda simples dirigida ao adversário. */
function respondToTrade(state: GameState, ctx: EngineContext, me: number, reserve: number): Action {
  const pending = state.pending;
  if (pending?.type !== 'trade') return { type: 'CONFIRM' };
  const price = priceOf(ctx, pending.position);
  const money = state.players[me]?.money ?? 0;
  let accept: boolean;
  if (pending.direction === 'buy') {
    // a outra pessoa quer comprar uma propriedade do adversário
    const group = groupOf(ctx, pending.position);
    const ownPair =
      group !== null &&
      groupPositions(ctx, group).filter((p) => propertyAt(state, p).owner === me).length >= 2;
    const factor = completesGroup(state, ctx, pending.position, pending.proposer)
      ? OPPONENT.sellCompletingFactor
      : ownPair
        ? OPPONENT.sellOwnPairFactor
        : OPPONENT.sellFactor;
    accept = pending.amount >= price * factor || (money < reserve && pending.amount >= price);
  } else {
    // a outra pessoa quer vender uma propriedade ao adversário
    const factor = completesGroup(state, ctx, pending.position, me)
      ? OPPONENT.buyCompletingFactor
      : OPPONENT.buyFactor;
    accept = pending.amount <= price * factor && money - pending.amount >= reserve;
  }
  return { type: 'RESPOND_TRADE', accept };
}

/** Levanta dinheiro preservando o que rende: hipoteca avulsas, vende casas, hipoteca o resto. */
function raiseMoney(state: GameState, ctx: EngineContext, me: number): Action {
  const debt = state.pending?.type === 'collection' ? state.pending.debt : null;
  if (!debt || debt.noWayOut) return { type: 'DECLARE_BANKRUPTCY' };
  const mortgageable = mortgageableProperties(state, me, ctx);
  const loose = mortgageable
    .filter((p) => !inCompleteGroup(state, ctx, p))
    .sort((a, b) => priceOf(ctx, a) - priceOf(ctx, b));
  if (loose[0] !== undefined) return { type: 'MORTGAGE', position: loose[0] };
  const withHouses = streetsWithSellableHouse(state, me, ctx).sort(
    (a, b) => propertyAt(state, b).houses - propertyAt(state, a).houses,
  );
  if (withHouses[0] !== undefined) return { type: 'SELL_HOUSE', position: withHouses[0] };
  const rest = [...mortgageable].sort((a, b) => priceOf(ctx, a) - priceOf(ctx, b));
  if (rest[0] !== undefined) return { type: 'MORTGAGE', position: rest[0] };
  return { type: 'DECLARE_BANKRUPTCY' };
}

/**
 * Ações seguras para a fase, na ordem de tentativa, se a decisão do adversário for recusada
 * (nunca deveria acontecer; garante que a partida não pare esperando o computador).
 */
export function fallbackActions(state: GameState): Action[] {
  if (state.pending?.type === 'trade') return [{ type: 'RESPOND_TRADE', accept: false }];
  switch (state.phase) {
    case 'TURN_START':
      return [{ type: 'START_TURN' }];
    case 'PRE_ROLL':
    case 'JAIL_DECISION':
      return [{ type: 'ROLL_DICE' }];
    case 'PURCHASE_DECISION':
      return [{ type: 'DECLINE_PURCHASE' }];
    case 'POST_RESOLUTION':
      return [{ type: 'ROLL_DICE' }, { type: 'END_TURN' }];
    case 'RAISE_MONEY':
      return [{ type: 'DECLARE_BANKRUPTCY' }];
    default:
      return [{ type: 'CONFIRM' }];
  }
}
