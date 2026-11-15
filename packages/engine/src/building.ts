// Construção e venda de casas e hotéis (RN-050 a RN-055).
// houses: 0 a maxHouses; maxHouses + 1 = hotel.

import { isGroupComplete } from './rent';
import { isProperty, playerAt, playerProperties, propertyAt, roundMoney, spaceAt } from './state';
import { transfer } from './transfer';
import { BANK, type EngineContext, type GameEvent, type GameState, type Reason } from './types';

export function hotelLevel(ctx: EngineContext): number {
  return ctx.rules.parameters.maxHouses + 1;
}

/** Custo de uma casa na rua (o do grupo); 0 para o que não é rua. */
export function houseCost(ctx: EngineContext, position: number): number {
  const space = spaceAt(ctx, position);
  if (space.type !== 'street') return 0;
  return ctx.rules.groups[space.group]?.houseCost ?? 0;
}

/** RN-054: vender devolve uma fração do custo pago. */
export function houseSaleValue(ctx: EngineContext, position: number): number {
  return roundMoney(houseCost(ctx, position) * ctx.rules.parameters.houseSaleFactor);
}

/** Casas de cada rua do grupo da rua em position. */
function groupHouses(state: GameState, position: number, ctx: EngineContext): number[] {
  const space = spaceAt(ctx, position);
  if (space.type !== 'street') return [];
  const positions = ctx.rules.groups[space.group]?.positions ?? [];
  return positions.map((p) => propertyAt(state, p).houses);
}

export function anyHouseInGroup(state: GameState, position: number, ctx: EngineContext): boolean {
  return groupHouses(state, position, ctx).some((houses) => houses > 0);
}

/**
 * Motivo para não construir em position, ou null se pode.
 * checkMoney = false serve para listar as ruas permitidas (a tela desabilita pela falta de dinheiro).
 */
export function cannotBuildReason(
  state: GameState,
  position: unknown,
  player: number,
  ctx: EngineContext,
  checkMoney: boolean,
): Reason | null {
  if (!isProperty(state, position)) return { code: 'invalidPosition' };
  const space = spaceAt(ctx, position);
  const property = propertyAt(state, position);
  if (space.type !== 'street') return { code: 'notStreet' };
  if (property.owner !== player) return { code: 'notOwner' };
  // RN-050: grupo completo e sem ruas hipotecadas
  if (!isGroupComplete(state, space.group, player, ctx)) return { code: 'incompleteGroup' };
  const positions = ctx.rules.groups[space.group]?.positions ?? [];
  if (positions.some((p) => propertyAt(state, p).mortgaged)) return { code: 'mortgagedGroup' };
  if (property.houses >= hotelLevel(ctx)) return { code: 'hasHotel' };
  // RN-052: construção uniforme; só constrói onde há menos casas no grupo
  if (groupHouses(state, position, ctx).some((houses) => houses < property.houses)) {
    return { code: 'unevenBuilding' };
  }
  if (checkMoney) {
    const cost = houseCost(ctx, position);
    const money = playerAt(state, player).money;
    if (money < cost) return { code: 'insufficientFunds', amount: cost - money };
  }
  return null;
}

/** RN-052: ruas onde a próxima casa é permitida (as que a tela oferece). */
export function buildableStreets(state: GameState, player: number, ctx: EngineContext): number[] {
  return playerProperties(state, player, ctx).filter(
    (position) => cannotBuildReason(state, position, player, ctx, false) === null,
  );
}

/** RN-053: a casa seguinte às maxHouses vira hotel, pelo custo de mais uma casa. */
export function build(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  player: number,
  position: unknown,
): Reason | null {
  const reason = cannotBuildReason(state, position, player, ctx, true);
  if (reason) return reason;
  const pos = position as number;
  transfer(state, events, player, BANK, houseCost(ctx, pos), 'building');
  const property = propertyAt(state, pos);
  property.houses++;
  events.push({ type: 'HousesChanged', position: pos, houses: property.houses });
  return null;
}

/** RN-054: venda uniforme; só vende onde há mais casas no grupo. */
export function cannotSellHouseReason(
  state: GameState,
  position: unknown,
  player: number,
  ctx: EngineContext,
): Reason | null {
  if (!isProperty(state, position)) return { code: 'invalidPosition' };
  const property = propertyAt(state, position);
  if (property.owner !== player) return { code: 'notOwner' };
  if (property.houses === 0) return { code: 'noHouses' };
  if (groupHouses(state, position, ctx).some((houses) => houses > property.houses)) {
    return { code: 'unevenSale' };
  }
  return null;
}

export function streetsWithSellableHouse(
  state: GameState,
  player: number,
  ctx: EngineContext,
): number[] {
  return playerProperties(state, player, ctx).filter(
    (position) => cannotSellHouseReason(state, position, player, ctx) === null,
  );
}

/** Vende uma casa (ou o hotel, que volta a maxHouses casas) ao banco. */
export function sellHouse(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  player: number,
  position: unknown,
): Reason | null {
  const reason = cannotSellHouseReason(state, position, player, ctx);
  if (reason) return reason;
  const pos = position as number;
  const property = propertyAt(state, pos);
  property.houses--;
  transfer(state, events, BANK, player, houseSaleValue(ctx, pos), 'houseSale');
  events.push({ type: 'HousesChanged', position: pos, houses: property.houses });
  return null;
}

/** Quanto o jogador receberia vendendo todas as casas e hotéis ao banco. */
export function allHousesSaleValue(state: GameState, player: number, ctx: EngineContext): number {
  return playerProperties(state, player, ctx).reduce(
    (total, position) => total + propertyAt(state, position).houses * houseSaleValue(ctx, position),
    0,
  );
}

/** Vende tudo de uma vez (falência, RN-103/RN-104); devolve o valor recebido. */
export function sellAllHouses(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  player: number,
): number {
  const total = allHousesSaleValue(state, player, ctx);
  for (const position of playerProperties(state, player, ctx)) {
    const property = propertyAt(state, position);
    if (property.houses > 0) {
      property.houses = 0;
      events.push({ type: 'HousesChanged', position, houses: 0 });
    }
  }
  transfer(state, events, BANK, player, total, 'houseSale');
  return total;
}
