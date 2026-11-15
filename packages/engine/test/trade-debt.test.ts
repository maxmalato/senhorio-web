// CT-27 e CT-32 a CT-34: venda simples. CT-35 a CT-38 e CT-45: dívidas e falência.

import { describe, expect, it } from 'vitest';
import { transition } from '../src/engine';
import { tradableProperties, tradeTargets } from '../src/trade';
import { BANK, type Action, type EngineContext } from '../src/types';
import {
  act,
  eventOf,
  refusalCode,
  setHouses,
  setMortgaged,
  setOwner,
  testContext,
  testState,
  turnOf,
} from './helpers';

const buyStation5From = (other: number, amount = 100): Action => ({
  type: 'PROPOSE_TRADE',
  direction: 'buy',
  position: 5,
  amount,
  otherPlayer: other,
});

describe('CT-27 · RN-075: venda simples com um jogador preso', () => {
  it('preso não aparece como alvo nem propõe', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    setOwner(state, 5, 1);
    state.players[1]!.inJail = true;
    expect(tradeTargets(state)).toEqual([2]);
    expect(refusalCode(state, buyStation5From(1), ctx)).toBe('invalidTarget');

    state.players[0]!.inJail = true;
    expect(tradeTargets(state)).toEqual([]);
    expect(refusalCode(state, buyStation5From(2), ctx)).toBe('jailedCannotTrade');

    // na decisão da prisão, o menu funciona, menos a venda simples
    state.phase = 'JAIL_DECISION';
    setOwner(state, 6, 0);
    expect(refusalCode(state, buyStation5From(2), ctx)).toBe('invalidActionForPhase');
    const r = act(state, { type: 'MORTGAGE', position: 6 }, ctx);
    expect(r.state.players[0]!.money).toBe(1550);
    expect(r.state.phase).toBe('JAIL_DECISION');
  });
});

describe('CT-32 · RN-092: vender rua com casas no grupo', () => {
  it('não é elegível', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    for (const position of [1, 3, 5]) setOwner(state, position, 0);
    setHouses(state, 3, 1);
    expect(tradableProperties(state, 0, ctx)).toEqual([5]);
    const sell: Action = {
      type: 'PROPOSE_TRADE',
      direction: 'sell',
      position: 1,
      amount: 100,
      otherPlayer: 1,
    };
    expect(refusalCode(state, sell, ctx)).toBe('propertyNotTradable');
  });
});

describe('CT-33 · RN-095: proposta aceita', () => {
  it('transfere dinheiro e dono na hora', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 5, 1);
    let r = act(state, buyStation5From(1, 150), ctx);
    expect(r.state.pending?.type).toBe('trade');
    expect(refusalCode(r.state, { type: 'ROLL_DICE' }, ctx)).toBe('tradePending');
    r = act(r.state, { type: 'RESPOND_TRADE', accept: true }, ctx);
    expect(r.state.properties['5']!.owner).toBe(0);
    expect(r.state.players[0]!.money).toBe(1350);
    expect(r.state.players[1]!.money).toBe(1650);
    expect(r.state.pending).toBeNull();
    expect(r.state.phase).toBe('PRE_ROLL');
  });

  it('RN-093: recusa valor abaixo do passo ou acima do dinheiro de quem paga', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 5, 1);
    const result = transition(state, buyStation5From(1, 1600), ctx);
    expect(result.reason).toEqual({ code: 'invalidAmount', min: 10, max: 1500 });
    expect(refusalCode(state, buyStation5From(1, 5), ctx)).toBe('invalidAmount');
  });
});

describe('CT-34 · RN-096: terceira proposta no turno', () => {
  it('é recusada', () => {
    const ctx = testContext();
    let state = testState(ctx, { players: 2 });
    setOwner(state, 5, 1);
    for (let i = 0; i < 2; i++) {
      const r = act(state, buyStation5From(1), ctx);
      state = act(r.state, { type: 'RESPOND_TRADE', accept: false }, ctx).state;
    }
    expect(state.properties['5']!.owner).toBe(1);
    expect(refusalCode(state, buyStation5From(1), ctx)).toBe('proposalLimit');
  });
});

/** Jogador 1 cai na Rua das Palmeiras (24) com 3 casas do jogador 0: aluguel R$ 460. */
function landOnPalmeiras(ctx: EngineContext, players: number, money: number) {
  const state = testState(ctx, { players, turn: 1, positions: [0, 20] });
  for (const position of [21, 23, 24]) {
    setOwner(state, position, 0);
    setHouses(state, position, 3);
  }
  state.players[1]!.money = money;
  return state;
}

function debtOf(state: { pending: unknown }) {
  const pending = state.pending as {
    type: string;
    debt: { shortfall: number; noWayOut: boolean; creditor: number };
  };
  expect(pending.type).toBe('collection');
  return pending.debt;
}

describe('CT-35 · RN-100/RN-101: aluguel maior que o caixa', () => {
  it('vai a RAISE_MONEY com o valor que falta e paga ao alcançar', () => {
    const ctx = testContext([1, 3]);
    const state = landOnPalmeiras(ctx, 2, 300);
    setOwner(state, 39, 1);
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('RAISE_MONEY');
    expect(debtOf(r.state).shortfall).toBe(160);
    expect(debtOf(r.state).noWayOut).toBe(false);
    r = act(r.state, { type: 'MORTGAGE', position: 39 }, ctx);
    expect(r.state.phase).toBe('POST_RESOLUTION');
    expect(r.state.players[1]!.money).toBe(300 + 200 - 460);
    expect(r.state.players[0]!.money).toBe(1960);
  });
});

describe('CT-36 · RN-102: bens não cobrem a dívida', () => {
  it('falência oferecida direto', () => {
    const ctx = testContext([1, 3]);
    const state = landOnPalmeiras(ctx, 2, 300);
    setOwner(state, 12, 1); // hipoteca R$ 75: 300 + 75 < 460
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('RAISE_MONEY');
    expect(debtOf(r.state).noWayOut).toBe(true);
    expect(refusalCode(r.state, { type: 'MORTGAGE', position: 12 }, ctx)).toBe('noWayOut');
    r = act(r.state, { type: 'DECLARE_BANKRUPTCY' }, ctx);
    expect(r.state.phase).toBe('BANKRUPTCY');
    expect(eventOf(r.events, 'WentBankrupt')?.creditor).toBe(0);
  });
});

describe('CT-37 · RN-103: falência para outro jogador', () => {
  it('casas vendidas; hipotecadas passam; credor paga 10%', () => {
    const ctx = testContext([1, 3]);
    const state = landOnPalmeiras(ctx, 3, 10);
    for (const position of [5, 6, 8, 9, 39]) setOwner(state, position, 1);
    for (const position of [6, 8, 9]) setHouses(state, position, 1);
    setMortgaged(state, 39);
    // máximo: 10 + 3 casas × 25 + hipotecas 100 + 50 + 50 + 60 = 345 < 460
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(debtOf(r.state).noWayOut).toBe(true);
    r = act(r.state, { type: 'DECLARE_BANKRUPTCY' }, ctx);
    const s = r.state;
    expect(s.properties['6']).toMatchObject({ houses: 0, owner: 0 });
    expect(s.properties['39']).toMatchObject({ owner: 0, mortgaged: true });
    expect(s.players[0]!.money).toBe(1500 + 10 + 75);
    expect(s.players[1]!.bankrupt).toBe(true);
    expect(s.players[1]!.exitRound).toBe(1);
    r = act(s, { type: 'CONFIRM' }, ctx);
    expect(r.state.players[0]!.money).toBe(1585 - 20); // 10% da hipoteca recebida
    expect(r.state.phase).toBe('TURN_START');
    expect(turnOf(r.state)).toBe(2);
  });
});

describe('CT-38 · RN-104: falência para o banco', () => {
  it('propriedades voltam livres e sem casas', () => {
    const ctx = testContext([1, 3]);
    const state = testState(ctx, { players: 3, turn: 1, positions: [0, 0] });
    state.players[1]!.money = 0;
    for (const position of [1, 3, 12, 39]) setOwner(state, position, 1);
    setHouses(state, 1, 1);
    setHouses(state, 3, 1);
    setMortgaged(state, 39);
    // Imposto de Renda R$ 200; máximo: 2 × 25 + hipotecas 30 + 30 + 75 = 185
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(debtOf(r.state).noWayOut).toBe(true);
    expect(debtOf(r.state).creditor).toBe(BANK);
    r = act(r.state, { type: 'DECLARE_BANKRUPTCY' }, ctx);
    for (const position of [1, 3, 12, 39]) {
      expect(r.state.properties[String(position)]).toEqual({
        owner: BANK,
        houses: 0,
        mortgaged: false,
      });
    }
    r = act(r.state, { type: 'CONFIRM' }, ctx);
    expect(turnOf(r.state)).toBe(2);
  });
});

describe('CT-45 · RN-102/D-19: declarar falência quando ainda há saída', () => {
  it('recusa com o valor que ainda dá para levantar; hipotecando, a dívida é paga', () => {
    const ctx = testContext([1, 3]);
    const state = landOnPalmeiras(ctx, 2, 300);
    setOwner(state, 39, 1); // hipoteca R$ 200: 300 + 200 >= 460
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('RAISE_MONEY');
    const refused = transition(r.state, { type: 'DECLARE_BANKRUPTCY' }, ctx);
    expect(refused.reason).toEqual({ code: 'debtCoverable', max: 500 });
    r = act(r.state, { type: 'MORTGAGE', position: 39 }, ctx);
    expect(r.state.phase).toBe('POST_RESOLUTION');
    expect(r.state.players[1]!.bankrupt).toBe(false);
  });
});
