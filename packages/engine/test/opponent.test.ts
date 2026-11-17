// CT-59 a CT-66: adversário controlado pelo computador ("jogar contra o computador").

import { describe, expect, it } from 'vitest';
import {
  decidingPlayer,
  fallbackActions,
  OPPONENT,
  opponentDecision,
  reserveFor,
} from '../src/ai/opponent';
import { transition } from '../src/engine';
import { createRandomizer, createSeededRandom } from '../src/random';
import { loadDefaultRules } from '../src/rules/load';
import { checkInvariants } from '../src/sim/invariants';
import { createContext, newGame } from '../src/state';
import { BANK, type GameState } from '../src/types';
import { setHouses, setOwner, testContext, testState } from './helpers';

const never = () => 0.99; // nunca sorteia a proposta
const always = () => 0; // sempre sorteia a proposta

function purchaseAt(state: GameState, position: number, money: number): GameState {
  state.phase = 'PURCHASE_DECISION';
  state.players[0]!.position = position;
  state.players[0]!.money = money;
  return state;
}

describe('CT-59 · comprar guardando a reserva', () => {
  it('compra quando sobra a reserva e recusa quando não sobra', () => {
    const ctx = testContext();
    const reserve = reserveFor(testState(ctx, { players: 2 }), ctx, 0);
    // Estação Sul (casa 5) custa 200
    let state = purchaseAt(testState(ctx, { players: 2 }), 5, 200 + reserve);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'BUY' });
    state = purchaseAt(testState(ctx, { players: 2 }), 5, 200 + reserve - 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'DECLINE_PURCHASE' });
  });

  it('a reserva cresce com as casas dos outros', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    const before = reserveFor(state, ctx, 0);
    setOwner(state, 1, 1);
    setOwner(state, 3, 1);
    setHouses(state, 1, 2);
    expect(reserveFor(state, ctx, 0)).toBe(before + 2 * OPPONENT.reservePerOpponentHouse);
  });
});

describe('CT-60 · comprar o que completa ou bloqueia um grupo', () => {
  it('compra mesmo sem reserva quando completa o próprio grupo', () => {
    const ctx = testContext();
    const state = purchaseAt(testState(ctx, { players: 2 }), 3, 60);
    setOwner(state, 1, 0);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'BUY' });
  });

  it('compra mesmo sem reserva quando impede outra pessoa de completar', () => {
    const ctx = testContext();
    const state = purchaseAt(testState(ctx, { players: 2 }), 3, 60);
    setOwner(state, 1, 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'BUY' });
  });
});

describe('CT-61 · construir e resgatar', () => {
  it('constrói no grupo completo enquanto sobra a reserva', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    state.players[0]!.money = 1000;
    expect(opponentDecision(state, ctx, never)).toMatchObject({ type: 'BUILD' });
    state.players[0]!.money = reserveFor(state, ctx, 0); // sem folga para a casa
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'ROLL_DICE' });
  });

  it('resgata hipoteca quando tem folga', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 5, 0);
    state.properties['5']!.mortgaged = true;
    state.players[0]!.money = 1500;
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'REDEEM', position: 5 });
  });
});

describe('CT-62 · responder a uma venda simples', () => {
  function proposal(direction: 'buy' | 'sell', position: number, amount: number) {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    state.pending = { type: 'trade', direction, position, amount, proposer: 0, other: 1 };
    return { ctx, state };
  }

  it('não vende barato a rua que completaria o grupo de quem propõe', () => {
    const { ctx, state } = proposal('buy', 3, 120);
    setOwner(state, 1, 0);
    setOwner(state, 3, 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: false });
    state.pending = { ...state.pending!, amount: 60 * OPPONENT.sellCompletingFactor } as never;
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: true });
  });

  it('vende uma estação avulsa por um pouco acima do preço', () => {
    const { ctx, state } = proposal('buy', 5, 240);
    setOwner(state, 5, 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: true });
  });

  it('compra pelo preço justo, e paga mais se completar o grupo dele', () => {
    let { ctx, state } = proposal('sell', 5, 200);
    setOwner(state, 5, 0);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: true });
    ({ ctx, state } = proposal('sell', 3, 110));
    setOwner(state, 3, 0);
    setOwner(state, 1, 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: true });
    ({ ctx, state } = proposal('sell', 5, 400));
    setOwner(state, 5, 0);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'RESPOND_TRADE', accept: false });
  });
});

describe('CT-63 · levantar dinheiro preservando o que rende', () => {
  it('hipoteca a avulsa antes de vender casas do grupo completo', () => {
    const ctx = testContext([1, 3]);
    const state = testState(ctx, { players: 2, turn: 1, positions: [0, 35] });
    // jogador 1 tem o marrom com casas e uma estação; cai no aluguel caro do jogador 0
    setOwner(state, 1, 1);
    setOwner(state, 3, 1);
    setHouses(state, 1, 1);
    setHouses(state, 3, 1);
    setOwner(state, 15, 1);
    setOwner(state, 37, 0);
    setOwner(state, 39, 0);
    setHouses(state, 39, 1); // aluguel de 120
    state.players[1]!.money = 50;
    const r = transition(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.ok && r.state.phase).toBe('RAISE_MONEY');
    if (!r.ok) return;
    expect(decidingPlayer(r.state)).toBe(1);
    expect(opponentDecision(r.state, ctx, never)).toEqual({ type: 'MORTGAGE', position: 15 });
  });
});

describe('CT-64 · prisão', () => {
  it('no começo sai logo; no fim fica tentando a dupla', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    state.phase = 'JAIL_DECISION';
    state.players[0]!.inJail = true;
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'PAY_BAIL' });
    for (const position of ctx.index.properties) setOwner(state, position, 1);
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'ROLL_DICE' });
  });
});

describe('CT-65 · propor a compra da rua que falta', () => {
  it('oferece acima do preço pela rua que completa o grupo dele', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 1);
    expect(opponentDecision(state, ctx, always)).toEqual({
      type: 'PROPOSE_TRADE',
      direction: 'buy',
      position: 3,
      amount: Math.round(60 * OPPONENT.proposalPremium),
      otherPlayer: 1,
    });
    expect(opponentDecision(state, ctx, never)).toEqual({ type: 'ROLL_DICE' });
  });
});

describe('CT-66 · partidas inteiras só com o computador', () => {
  it('toda decisão é aceita pelo motor, as invariantes valem e a partida termina', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const ctx = createContext(loadDefaultRules(), createRandomizer(createSeededRandom(seed)));
      const players = 2 + (seed % 5);
      const created = newGame(
        {
          players: Array.from({ length: players }, (_, i) => ({
            name: `P${i}`,
            color: `c${i}`,
            bot: true,
          })),
          mode: { type: 'rounds', limit: 40 },
        },
        ctx,
      );
      if (!created.ok) throw new Error(created.reason.code);
      let state = created.state;
      expect(state.players.every((p) => p.bot)).toBe(true);
      const random = createSeededRandom(seed * 7);
      let steps = 0;
      while (state.phase !== 'GAME_OVER' && steps < 20_000) {
        const action = opponentDecision(state, ctx, random);
        const result = transition(state, action, ctx);
        if (!result.ok)
          throw new Error(
            `semente ${seed}: ${JSON.stringify(action)} recusada (${result.reason.code})`,
          );
        state = result.state;
        const errors = checkInvariants(state, ctx);
        if (errors.length) throw new Error(`semente ${seed}: ${errors.join('; ')}`);
        steps++;
      }
      expect(state.phase).toBe('GAME_OVER');
    }
  });

  it('há sempre uma ação segura para cada fase', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    expect(fallbackActions(state)).toEqual([{ type: 'ROLL_DICE' }]);
    expect(BANK).toBe(-1);
  });
});
