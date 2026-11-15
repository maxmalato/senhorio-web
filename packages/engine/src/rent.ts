// Aluguel: quanto o visitante paga ao dono (RN-040 a RN-047). Funções puras.

import { houseRuleActive, playerAt, propertyAt, spaceAt } from './state';
import type { EngineContext, GameState, RentResult } from './types';

/** Motivo para não cobrar aluguel, ou null quando cobra. */
export function rentExemption(
  state: GameState,
  position: number,
  ctx: EngineContext,
): 'mortgaged' | 'ownerInJail' | null {
  const property = propertyAt(state, position);
  if (property.mortgaged) return 'mortgaged'; // RN-041
  // RN-042 com RP-03 ligada: dono preso não cobra
  if (playerAt(state, property.owner).inJail && houseRuleActive(ctx, 'RP-03')) return 'ownerInJail';
  return null;
}

/**
 * Valor do aluguel e o porquê (para a tela mostrar "R$ 180 — 3 casas").
 * diceSum só importa para companhias (RN-045).
 */
export function calculateRent(
  state: GameState,
  position: number,
  diceSum: number,
  ctx: EngineContext,
): RentResult {
  const exemption = rentExemption(state, position, ctx);
  if (exemption) return { amount: 0, reason: exemption };

  const space = spaceAt(ctx, position);
  const property = propertyAt(state, position);

  if (space.type === 'street') {
    // RN-043: escada com casas ou hotel; sem casas, básico (dobrado com o grupo completo)
    if (property.houses > 0) {
      return {
        amount: space.rent[property.houses] as number,
        reason: 'houses',
        houses: property.houses,
      };
    }
    const basic = space.rent[0] as number;
    // RN-047: rua hipotecada não desfaz o grupo completo
    if (isGroupComplete(state, space.group, property.owner, ctx)) {
      return { amount: basic * ctx.rules.parameters.fullGroupMultiplier, reason: 'fullGroup' };
    }
    return { amount: basic, reason: 'basic' };
  }

  if (space.type === 'station') {
    // RN-044: conforme quantas estações o dono tem
    const count = countOwned(state, ctx.index.stations, property.owner);
    return {
      amount: ctx.rules.parameters.stationRent[count - 1] as number,
      reason: 'stations',
      count,
    };
  }

  // RN-045: companhia = soma dos dados × multiplicador pela quantidade do dono
  const count = countOwned(state, ctx.index.utilities, property.owner);
  const multiplier = ctx.rules.parameters.utilityMultiplier[count - 1] as number;
  return { amount: diceSum * multiplier, reason: 'utilities', count, diceSum, multiplier };
}

/** Grupo completo: todas as ruas do grupo com o mesmo dono (hipotecadas contam, RN-047). */
export function isGroupComplete(
  state: GameState,
  group: string,
  owner: number,
  ctx: EngineContext,
): boolean {
  const positions = ctx.rules.groups[group]?.positions ?? [];
  return positions.every((position) => propertyAt(state, position).owner === owner);
}

export function countOwned(state: GameState, positions: number[], owner: number): number {
  return positions.filter((position) => propertyAt(state, position).owner === owner).length;
}
