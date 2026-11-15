// CT-09 a CT-17: aluguel de ruas, estações e companhias.
// Padrão: o jogador 1 (visitante) anda até a propriedade do jogador 0.

import { describe, expect, it } from 'vitest';
import type { EngineContext, GameState } from '../src/types';
import {
  act,
  cardOnTop,
  eventOf,
  setHouses,
  setMortgaged,
  setOwner,
  testContext,
  testState,
} from './helpers';

/** Rola com o jogador 1 a partir de `origin`. */
function visitWithPlayer1(ctx: EngineContext, state: GameState, origin: number) {
  state.turn = 1;
  state.players[1]!.position = origin;
  return act(state, { type: 'ROLL_DICE' }, ctx);
}

describe('CT-09 · RN-043: rua com dono, grupo incompleto', () => {
  it('cobra o aluguel básico', () => {
    const ctx = testContext([2, 3]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    const r = visitWithPlayer1(ctx, state, 36); // 36 + 5 = casa 1, passando pela Partida
    expect(r.state.players[1]!.money).toBe(1500 - 4 + 200);
    expect(r.state.players[0]!.money).toBe(1504);
    expect(r.state.phase).toBe('POST_RESOLUTION');
  });
});

describe('CT-10 · RN-043: grupo completo sem casas', () => {
  it('cobra o básico dobrado', () => {
    const ctx = testContext([2, 3]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    expect(visitWithPlayer1(ctx, state, 36).state.players[0]!.money).toBe(1508);
  });
});

describe('CT-11 · RN-047: grupo completo com uma rua hipotecada', () => {
  it('as outras ruas seguem com o básico dobrado', () => {
    const ctx = testContext([2, 3]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    setMortgaged(state, 3);
    expect(visitWithPlayer1(ctx, state, 36).state.players[0]!.money).toBe(1508);
  });
});

describe('CT-12 · RN-043: Travessa do Porto com 3 casas', () => {
  it('cobra R$ 180', () => {
    const ctx = testContext([3, 2]);
    const state = testState(ctx, { players: 2 });
    for (const position of [1, 3]) {
      setOwner(state, position, 0);
      setHouses(state, position, 3);
    }
    const r = visitWithPlayer1(ctx, state, 36);
    expect(r.state.players[1]!.money).toBe(1500 - 180 + 200);
    expect(r.state.players[0]!.money).toBe(1680);
  });
});

describe('CT-13 · RN-041: propriedade hipotecada', () => {
  it('não cobra aluguel', () => {
    const ctx = testContext([2, 3]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setMortgaged(state, 1);
    const r = visitWithPlayer1(ctx, state, 36);
    expect(r.state.players[1]!.money).toBe(1700); // só o bônus da Partida
    expect(eventOf(r.events, 'RentExempt')?.reason).toBe('mortgaged');
  });
});

describe('CT-14 · RN-042/RP-03: dono preso', () => {
  function jailedOwnerState(ctx: EngineContext) {
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    state.players[0]!.inJail = true;
    state.players[0]!.position = 10;
    return state;
  }

  it('RP-03 ligada: não cobra', () => {
    const ctx = testContext([2, 3]);
    const r = visitWithPlayer1(ctx, jailedOwnerState(ctx), 36);
    expect(r.state.players[0]!.money).toBe(1500);
    expect(eventOf(r.events, 'RentExempt')?.reason).toBe('ownerInJail');
  });

  it('RP-03 desligada: cobra', () => {
    const ctx = testContext([2, 3], {
      adjust: (rules) => {
        rules.houseRules['RP-03']!.active = false;
      },
    });
    expect(visitWithPlayer1(ctx, jailedOwnerState(ctx), 36).state.players[0]!.money).toBe(1504);
  });
});

describe('CT-15 · RN-044: dono com 3 estações', () => {
  it('cobra R$ 120', () => {
    const ctx = testContext([2, 3]);
    const state = testState(ctx, { players: 2 });
    for (const position of [5, 15, 25]) setOwner(state, position, 0);
    expect(visitWithPlayer1(ctx, state, 20).state.players[1]!.money).toBe(1380);
  });
});

describe('CT-16 · RN-045: dados 4 + 3, dono com as 2 companhias', () => {
  it('cobra 7 × 12 = R$ 84', () => {
    const ctx = testContext([4, 3]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 12, 0);
    setOwner(state, 28, 0);
    expect(visitWithPlayer1(ctx, state, 5).state.players[1]!.money).toBe(1416);
  });
});

describe('CT-17 · RN-046: chegar à companhia por carta', () => {
  // S-06 "Visita técnica": da Sorte (17) avança até a Companhia de Energia (12), passando pela Partida
  it('o banco rola os dados só para o aluguel', () => {
    const ctx = testContext([1, 2, 5, 6]);
    const state = testState(ctx, { players: 2 });
    setOwner(state, 12, 0);
    setOwner(state, 28, 0);
    cardOnTop(state, 'chance', 'S-06');
    let r = visitWithPlayer1(ctx, state, 14); // 14 + 3 = Sorte (17)
    expect(r.state.phase).toBe('CARD');
    r = act(r.state, { type: 'CONFIRM' }, ctx);
    expect(r.state.players[1]!.position).toBe(12);
    const roll = eventOf(r.events, 'DiceRolled');
    expect(roll?.rentOnly).toBe(true);
    expect(r.state.players[1]!.money).toBe(1500 + 200 - 132); // Partida e 11 × 12
    expect(r.state.lastDice).toEqual([1, 2]); // a rolagem do aluguel não conta como jogada
  });
});
