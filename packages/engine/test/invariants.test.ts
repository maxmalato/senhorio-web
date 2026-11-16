// Invariantes do docs/08 com fast-check: partidas aleatórias de robôs e ações ao acaso.

import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { transition } from '../src/engine';
import { createRandomizer, createSeededRandom, type RandomSource } from '../src/random';
import { loadDefaultRules } from '../src/rules/load';
import { botDecision } from '../src/sim/bot';
import { checkInvariants } from '../src/sim/invariants';
import { createContext, newGame } from '../src/state';
import type { Action, ActionType, GameState, ModeType } from '../src/types';

const MODES: { type: ModeType; limit: number | null }[] = [
  { type: 'classic', limit: null },
  { type: 'rounds', limit: 20 },
  { type: 'time', limit: 45 },
];

function setup(seed: number, players: number, modeIndex: number) {
  const ctx = createContext(loadDefaultRules(), createRandomizer(createSeededRandom(seed)));
  const created = newGame(
    {
      players: Array.from({ length: players }, (_, i) => ({ name: `J${i}`, color: `cor${i}` })),
      mode: MODES[modeIndex % MODES.length]!,
    },
    ctx,
  );
  if (!created.ok) throw new Error(created.reason.code);
  return { ctx, state: created.state };
}

const ACTION_TYPES: ActionType[] = [
  'START_TURN',
  'ROLL_DICE',
  'PAY_BAIL',
  'USE_JAIL_CARD',
  'BUY',
  'DECLINE_PURCHASE',
  'CONFIRM',
  'END_TURN',
  'BUILD',
  'SELL_HOUSE',
  'MORTGAGE',
  'REDEEM',
  'PROPOSE_TRADE',
  'RESPOND_TRADE',
  'DECLARE_BANKRUPTCY',
  'QUIT',
  'TIME_UP',
  'REMOVE_PLAYER',
];

/** Ação qualquer, válida ou não, com parâmetros ao acaso (inclusive fora do tabuleiro). */
function randomAction(random: RandomSource): Action {
  const pick = <T>(list: readonly T[]): T => list[Math.floor(random() * list.length)] as T;
  const type = pick(ACTION_TYPES);
  const position = pick([-1, 0.5, 45, ...Array.from({ length: 40 }, (_, i) => i)]);
  switch (type) {
    case 'BUILD':
    case 'SELL_HOUSE':
    case 'MORTGAGE':
    case 'REDEEM':
      return { type, position };
    case 'PROPOSE_TRADE':
      return {
        type,
        position,
        direction: pick(['buy', 'sell', 'trocar'] as const) as 'buy',
        amount: pick([0, 5, 10, 150, 99999, 12.5]),
        otherPlayer: pick([-1, 0, 1, 2, 3, 4, 5, 7]),
      };
    case 'RESPOND_TRADE':
      return { type, accept: random() < 0.5 };
    case 'REMOVE_PLAYER':
      // raro, para a partida não acabar cedo demais
      return random() < 0.15
        ? { type, player: pick([-1, 0, 1, 2, 3, 4, 5, 9]) }
        : { type: 'CONFIRM' };
    default:
      return { type } as Action;
  }
}

describe('invariantes do motor (fast-check)', () => {
  it('partidas de robôs nunca quebram as invariantes nem têm ação recusada', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 0, max: 2 }),
        (seed, players, mode) => {
          const game = setup(seed, players, mode);
          const ctx = game.ctx;
          let state = game.state;
          const botRandom = createSeededRandom(seed ^ 0x5eed);
          for (let step = 0; step < 600 && state.phase !== 'GAME_OVER'; step++) {
            const action = botDecision(state, ctx, botRandom);
            const result = transition(state, action, ctx);
            if (!result.ok)
              throw new Error(`${action.type} recusada: ${JSON.stringify(result.reason)}`);
            state = result.state;
            const errors = checkInvariants(state, ctx);
            if (errors.length)
              throw new Error(`passo ${step}, ${action.type}: ${errors.join('; ')}`);
          }
        },
      ),
      { numRuns: 60 },
    );
  });

  it('ações ao acaso: recusada não muda nada; aceita mantém as invariantes e o estado vira JSON', () => {
    fc.assert(
      fc.property(
        fc.integer(),
        fc.integer({ min: 2, max: 6 }),
        fc.integer({ min: 0, max: 2 }),
        (seed, players, mode) => {
          const game = setup(seed, players, mode);
          const ctx = game.ctx;
          let state = game.state;
          const random = createSeededRandom(seed ^ 0xc4a05);
          for (let step = 0; step < 400 && state.phase !== 'GAME_OVER'; step++) {
            // metade das ações vem do robô, para a partida andar; a outra metade é ao acaso
            const action = random() < 0.5 ? botDecision(state, ctx, random) : randomAction(random);
            const before = JSON.stringify(state);
            const result = transition(state, action, ctx);
            if (JSON.stringify(state) !== before)
              throw new Error(`${action.type} alterou o estado recebido`);
            if (!result.ok) {
              if (result.state !== state)
                throw new Error(`${action.type} recusada devolveu outro estado`);
              continue;
            }
            state = result.state;
            const errors = checkInvariants(state, ctx);
            if (errors.length)
              throw new Error(`passo ${step}, ${JSON.stringify(action)}: ${errors.join('; ')}`);
            const copy: GameState = JSON.parse(JSON.stringify(state));
            expect(copy).toEqual(state);
          }
        },
      ),
      { numRuns: 60 },
    );
  });
});
