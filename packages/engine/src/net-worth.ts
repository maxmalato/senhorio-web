// Patrimônio e classificação final (RN-111 e RN-112).

import { houseCost } from './building';
import { mortgageValue } from './mortgage';
import { playerAt, playerProperties, priceOf, propertyAt } from './state';
import type { EngineContext, GameState, RankingEntry } from './types';

export interface NetWorth {
  money: number;
  /** Preço das propriedades menos o valor das hipotecas. */
  properties: number;
  /** Custo pago por casas e hotéis. */
  houses: number;
  total: number;
}

/**
 * RN-111: dinheiro + preço das propriedades + custo pago por casas e hotéis;
 * hipotecada conta pelo preço menos o valor da hipoteca. As três partes vão para a tela final.
 */
export function netWorth(state: GameState, player: number, ctx: EngineContext): NetWorth {
  const result = { money: playerAt(state, player).money, properties: 0, houses: 0, total: 0 };
  for (const position of playerProperties(state, player, ctx)) {
    const property = propertyAt(state, position);
    result.properties += priceOf(ctx, position);
    if (property.mortgaged) result.properties -= mortgageValue(ctx, position);
    result.houses += property.houses * houseCost(ctx, position);
  }
  result.total = result.money + result.properties + result.houses;
  return result;
}

/**
 * RN-112: maior patrimônio; desempate por dinheiro e depois por propriedades.
 * Falidos ficam no fim, de quem saiu por último para quem saiu primeiro (RN-105).
 */
export function ranking(state: GameState, ctx: EngineContext): RankingEntry[] {
  const entries = state.players.map((player, i) => ({
    player: i,
    netWorth: netWorth(state, i, ctx).total,
    money: player.money,
    properties: playerProperties(state, i, ctx).length,
    bankrupt: player.bankrupt,
    exitRound: player.exitRound,
  }));
  // Ordenação estável: em empate total, mantém a ordem dos jogadores
  return entries.sort((a, b) => {
    if (a.bankrupt !== b.bankrupt) return a.bankrupt ? 1 : -1;
    if (a.bankrupt) return b.exitRound - a.exitRound;
    if (a.netWorth !== b.netWorth) return b.netWorth - a.netWorth;
    if (a.money !== b.money) return b.money - a.money;
    return b.properties - a.properties;
  });
}
