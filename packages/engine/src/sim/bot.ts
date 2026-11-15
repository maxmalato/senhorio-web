// Decisões automáticas de um jogador (porta do DecisaoAutomatica.brs do Roku).
// Servem para a simulação, o balanceamento e os testes de invariantes. Não são uma
// estratégia para jogar contra pessoas: compram tudo o que podem, constroem com folga
// e propõem vendas ao acaso, sem mirar no grupo que falta.

import { buildableStreets, houseCost, streetsWithSellableHouse } from '../building';
import { mortgageableProperties } from '../mortgage';
import type { RandomSource } from '../random';
import { currentPlayer, currentPlayerIndex, priceOf } from '../state';
import { tradableProperties, tradeTargets } from '../trade';
import type { Action, EngineContext, GameState } from '../types';

/** Folga que o robô guarda além do custo da casa antes de construir. */
export const BOT_BUILD_MARGIN = 300;

export function botDecision(state: GameState, ctx: EngineContext, random: RandomSource): Action {
  const phase = state.phase;
  if (phase === 'TURN_START') return { type: 'START_TURN' };
  if (phase === 'CARD' || phase === 'BANKRUPTCY') return { type: 'CONFIRM' };
  if (state.pending?.type === 'trade') return { type: 'RESPOND_TRADE', accept: random() < 0.5 };

  const current = currentPlayerIndex(state);
  const player = currentPlayer(state);
  switch (phase) {
    case 'PRE_ROLL': {
      // constrói se sobrar folga; de vez em quando tenta uma venda simples
      const streets = buildableStreets(state, current, ctx);
      const first = streets[0];
      if (first !== undefined && player.money > houseCost(ctx, first) + BOT_BUILD_MARGIN) {
        return { type: 'BUILD', position: first };
      }
      return botProposal(state, ctx, random) ?? { type: 'ROLL_DICE' };
    }
    case 'JAIL_DECISION':
      if (player.jailCards.length > 0) return { type: 'USE_JAIL_CARD' };
      return { type: 'ROLL_DICE' };
    case 'PURCHASE_DECISION':
      return player.money >= priceOf(ctx, player.position)
        ? { type: 'BUY' }
        : { type: 'DECLINE_PURCHASE' };
    case 'POST_RESOLUTION':
      return state.extraRoll ? { type: 'ROLL_DICE' } : { type: 'END_TURN' };
    case 'RAISE_MONEY': {
      const debt = state.pending?.type === 'collection' ? state.pending.debt : null;
      if (!debt || debt.noWayOut) return { type: 'DECLARE_BANKRUPTCY' };
      const sellable = streetsWithSellableHouse(state, debt.debtor, ctx)[0];
      if (sellable !== undefined) return { type: 'SELL_HOUSE', position: sellable };
      const mortgageable = mortgageableProperties(state, debt.debtor, ctx)[0];
      if (mortgageable !== undefined) return { type: 'MORTGAGE', position: mortgageable };
      return { type: 'DECLARE_BANKRUPTCY' };
    }
    default:
      return { type: 'CONFIRM' };
  }
}

/** Uma proposta de compra a cada ~10 pré-rolagens, se houver o que comprar. */
function botProposal(state: GameState, ctx: EngineContext, random: RandomSource): Action | null {
  if (state.proposalsThisTurn > 0 || random() >= 0.1) return null;
  const money = currentPlayer(state).money;
  for (const other of tradeTargets(state)) {
    const position = tradableProperties(state, other, ctx)[0];
    if (position === undefined) continue;
    const amount = priceOf(ctx, position);
    if (amount <= money) {
      return { type: 'PROPOSE_TRADE', direction: 'buy', position, amount, otherPlayer: other };
    }
  }
  return null;
}
