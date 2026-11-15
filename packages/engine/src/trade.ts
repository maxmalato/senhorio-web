// Venda simples entre jogadores (RN-090 a RN-097).
// A proposta fica em state.pending até a outra parte responder; a fase não muda.

import { anyHouseInGroup } from './building';
import {
  activePlayers,
  currentPlayerIndex,
  isProperty,
  playerAt,
  playerProperties,
  propertyAt,
} from './state';
import { transfer } from './transfer';
import type { Action, EngineContext, GameEvent, GameState, Reason, TradePending } from './types';

/** RN-075/RN-090: quem pode receber proposta do jogador da vez (nunca presos ou falidos). */
export function tradeTargets(state: GameState): number[] {
  const current = currentPlayerIndex(state);
  if (playerAt(state, current).inJail) return [];
  return activePlayers(state).filter((i) => i !== current && !playerAt(state, i).inJail);
}

/** RN-092/RN-065: sem hipoteca e sem casas em nenhuma rua do grupo. */
export function isTradable(state: GameState, position: number, ctx: EngineContext): boolean {
  if (propertyAt(state, position).mortgaged) return false;
  return !anyHouseInGroup(state, position, ctx);
}

export function tradableProperties(state: GameState, player: number, ctx: EngineContext): number[] {
  return playerProperties(state, player, ctx).filter((position) =>
    isTradable(state, position, ctx),
  );
}

export function proposeTrade(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  action: Extract<Action, { type: 'PROPOSE_TRADE' }>,
): Reason | null {
  const current = currentPlayerIndex(state);
  // RN-096: limite de propostas por turno
  if (state.proposalsThisTurn >= ctx.rules.parameters.maxProposalsPerTurn) {
    return { code: 'proposalLimit' };
  }
  if (playerAt(state, current).inJail) return { code: 'jailedCannotTrade' }; // RN-075

  const other = action.otherPlayer;
  if (!tradeTargets(state).includes(other)) return { code: 'invalidTarget' };

  // RN-091: "comprar de" o outro ou "vender para" o outro
  if (!isProperty(state, action.position)) return { code: 'invalidPosition' };
  let owner: number;
  let payer: number;
  if (action.direction === 'buy') {
    owner = other;
    payer = current;
  } else if (action.direction === 'sell') {
    owner = current;
    payer = other;
  } else {
    return { code: 'invalidDirection' };
  }
  if (propertyAt(state, action.position).owner !== owner) return { code: 'notOwner' };
  if (!isTradable(state, action.position, ctx)) return { code: 'propertyNotTradable' };

  // RN-093: valor mínimo de um passo, no máximo o dinheiro de quem paga
  const min = ctx.rules.parameters.tradeStep;
  const max = playerAt(state, payer).money;
  if (!Number.isInteger(action.amount) || action.amount < min || action.amount > max) {
    return { code: 'invalidAmount', min, max };
  }

  state.proposalsThisTurn++;
  const pending: TradePending = {
    type: 'trade',
    direction: action.direction,
    position: action.position,
    amount: action.amount,
    proposer: current,
    other,
  };
  state.pending = pending;
  events.push({
    type: 'TradeProposed',
    direction: pending.direction,
    position: pending.position,
    amount: pending.amount,
    proposer: pending.proposer,
    other: pending.other,
  });
  return null;
}

/** RN-095: aceita, transfere dinheiro e propriedade na hora; recusada, nada muda. */
export function respondTrade(state: GameState, events: GameEvent[], accept: boolean): void {
  const proposal = state.pending as TradePending;
  state.pending = null;
  if (accept) {
    const buyer = proposal.direction === 'buy' ? proposal.proposer : proposal.other;
    const seller = proposal.direction === 'buy' ? proposal.other : proposal.proposer;
    transfer(state, events, buyer, seller, proposal.amount, 'trade');
    propertyAt(state, proposal.position).owner = buyer;
    events.push({
      type: 'PropertyOwnerChanged',
      position: proposal.position,
      from: seller,
      to: buyer,
    });
  }
  events.push({
    type: 'TradeAnswered',
    accepted: accept,
    position: proposal.position,
    proposer: proposal.proposer,
    other: proposal.other,
  });
}
