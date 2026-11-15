// Ponto de entrada do motor de regras (docs/07-arquitetura-tecnica.md).
export { createSeededRandom, rollDie, type RandomSource } from './random';
export { loadDefaultRules, parseRules } from './rules/load';
export { validateRules } from './rules/validate';
export type * from './rules/types';
