// Ponto de entrada do motor de regras (docs/07-arquitetura-tecnica.md).
export { allowedActions, transition } from './engine';
export { createContext, newGame, type NewGameResult } from './state';
export {
  createFixedRandomizer,
  createRandomizer,
  createSeededRandom,
  rollDie,
  type RandomSource,
  type Randomizer,
} from './random';
export { loadDefaultRules, parseRules } from './rules/load';
export { validateRules } from './rules/validate';
export type * from './rules/types';
export * from './types';

// Consultas para a interface (listas do menu, valores e patrimônio)
export { calculateRent, rentExemption } from './rent';
export {
  buildableStreets,
  cannotBuildReason,
  houseCost,
  houseSaleValue,
  streetsWithSellableHouse,
} from './building';
export { mortgageableProperties, mortgageValue, redeemCost } from './mortgage';
export { tradableProperties, tradeTargets } from './trade';
export { maxRaisable } from './debt';
export { netWorth, ranking, type NetWorth } from './net-worth';
export {
  decidingPlayer,
  fallbackActions,
  OPPONENT,
  opponentDecision,
  reserveFor,
} from './ai/opponent';
