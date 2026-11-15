// Hipoteca e resgate (RN-060 a RN-065).

import { anyHouseInGroup } from './building';
import { isProperty, playerAt, playerProperties, priceOf, propertyAt, roundMoney } from './state';
import { transfer } from './transfer';
import { BANK, type EngineContext, type GameEvent, type GameState, type Reason } from './types';

/** RN-060: o jogador recebe uma fração do preço de compra. */
export function mortgageValue(ctx: EngineContext, position: number): number {
  return roundMoney(priceOf(ctx, position) * ctx.rules.parameters.mortgageFactor);
}

/** Juros sobre o valor da hipoteca (resgate RN-063 e falência RN-103). */
export function mortgageInterest(ctx: EngineContext, position: number): number {
  return roundMoney(mortgageValue(ctx, position) * ctx.rules.parameters.mortgageInterest);
}

/** RN-063: resgate = valor recebido + juros (ex.: 120 → 132). */
export function redeemCost(ctx: EngineContext, position: number): number {
  return mortgageValue(ctx, position) + mortgageInterest(ctx, position);
}

export function cannotMortgageReason(
  state: GameState,
  position: unknown,
  player: number,
  ctx: EngineContext,
): Reason | null {
  if (!isProperty(state, position)) return { code: 'invalidPosition' };
  const property = propertyAt(state, position);
  if (property.owner !== player) return { code: 'notOwner' };
  if (property.mortgaged) return { code: 'alreadyMortgaged' };
  // RN-061: nenhuma casa nem hotel no grupo; a tela oferece vender antes
  if (anyHouseInGroup(state, position, ctx)) return { code: 'groupHasHouses' };
  return null;
}

export function mortgageableProperties(
  state: GameState,
  player: number,
  ctx: EngineContext,
): number[] {
  return playerProperties(state, player, ctx).filter(
    (position) => cannotMortgageReason(state, position, player, ctx) === null,
  );
}

export function mortgage(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  player: number,
  position: unknown,
): Reason | null {
  const reason = cannotMortgageReason(state, position, player, ctx);
  if (reason) return reason;
  const pos = position as number;
  propertyAt(state, pos).mortgaged = true;
  transfer(state, events, BANK, player, mortgageValue(ctx, pos), 'mortgage');
  events.push({ type: 'MortgageChanged', position: pos, mortgaged: true });
  return null;
}

/** RN-064: sem prazo; resgata quando quiser, pagando o valor com juros. */
export function redeem(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  player: number,
  position: unknown,
): Reason | null {
  if (!isProperty(state, position)) return { code: 'invalidPosition' };
  const property = propertyAt(state, position);
  if (property.owner !== player) return { code: 'notOwner' };
  if (!property.mortgaged) return { code: 'notMortgaged' };
  const cost = redeemCost(ctx, position);
  const money = playerAt(state, player).money;
  if (money < cost) return { code: 'insufficientFunds', amount: cost - money };
  transfer(state, events, player, BANK, cost, 'redeem');
  property.mortgaged = false;
  events.push({ type: 'MortgageChanged', position, mortgaged: false });
  return null;
}
