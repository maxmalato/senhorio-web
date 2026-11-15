// CT-01 a CT-08: preparação, dados, movimento, duplas e compra.
// Valores esperados escritos aqui de propósito: se o balanceamento mudar, o teste aponta.

import { describe, expect, it } from 'vitest';
import { newGame } from '../src/state';
import { BANK } from '../src/types';
import {
  act,
  eventOf,
  hasEvent,
  refusalCode,
  setOwner,
  testContext,
  testState,
  turnOf,
} from './helpers';

describe('CT-01 · RN-003/RN-004/RN-005: nova partida com 4 jogadores', () => {
  // sorteios 1, 1, 1 no Fisher-Yates de [0, 1, 2, 3] dão a ordem [1, 2, 3, 0]
  const ctx = testContext([], { draws: [1, 1, 1] });
  const players = [
    { name: 'Ana', color: 'a' },
    { name: 'Bruno', color: 'b' },
    { name: 'Carla', color: 'c' },
    { name: 'Diego', color: 'd' },
  ];

  it('cria a partida com R$ 1.500 na Partida e a ordem sorteada', () => {
    const result = newGame({ players, mode: { type: 'classic' } }, ctx);
    if (!result.ok) throw new Error(result.reason.code);
    const { state } = result;
    for (const player of state.players) {
      expect(player.money).toBe(1500);
      expect(player.position).toBe(0);
    }
    expect(state.order).toEqual([1, 2, 3, 0]);
    expect(state.phase).toBe('TURN_START');
    expect(Object.keys(state.properties)).toHaveLength(28);
    expect(state.decks.chance).toHaveLength(16);
    expect(state.decks.setback).toHaveLength(16);
    expect(result.events).toEqual([{ type: 'OrderDrawn', order: [1, 2, 3, 0] }]);
  });

  it('RN-002: recusa cor repetida', () => {
    const repeated = players.map((p, i) => (i === 1 ? { ...p, color: 'a' } : p));
    const result = newGame({ players: repeated, mode: { type: 'classic' } }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason.code).toBe('duplicateColor');
  });

  it('RN-001/RN-002: recusa quantidade de jogadores, nome e modo inválidos', () => {
    const one = newGame({ players: players.slice(0, 1), mode: { type: 'classic' } }, ctx);
    const longName = newGame(
      {
        players: [{ name: 'Nome comprido demais', color: 'x' }, players[1]!],
        mode: { type: 'classic' },
      },
      ctx,
    );
    const noLimit = newGame({ players, mode: { type: 'rounds' } }, ctx);
    expect(one.ok || one.reason.code).toBe('invalidPlayerCount');
    expect(longName.ok || longName.reason.code).toBe('invalidName');
    expect(noLimit.ok || noLimit.reason.code).toBe('invalidMode');
  });
});

describe('CT-02 · RN-013: dados 6 + 5 a partir da casa 35', () => {
  it('passa pela Partida (+R$ 200) e para na casa 6', () => {
    const ctx = testContext([6, 5]);
    const state = testState(ctx, { players: 2, positions: [35, 0] });
    const r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.players[0]!.position).toBe(6);
    expect(r.state.players[0]!.money).toBe(1700);
    expect(r.state.phase).toBe('PURCHASE_DECISION'); // Rua da Fonte sem dono
    expect(hasEvent(r.events, 'PawnMoved')).toBe(true);
    expect(state.players[0]!.position).toBe(35); // estado original intacto
  });
});

describe('CT-03 · RN-015: dupla 3 + 3', () => {
  it('resolve a casa e oferece nova jogada', () => {
    const ctx = testContext([3, 3, 1, 2]);
    let r = act(testState(ctx, { players: 2 }), { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('PURCHASE_DECISION'); // resolve a casa 6 antes
    r = act(r.state, { type: 'DECLINE_PURCHASE' }, ctx);
    expect(r.state.phase).toBe('POST_RESOLUTION');
    expect(r.state.extraRoll).toBe(true);
    expect(refusalCode(r.state, { type: 'END_TURN' }, ctx)).toBe('hasExtraRoll');
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.players[0]!.position).toBe(9); // anda de novo (6 + 3)
  });
});

describe('CT-04 · RN-016: terceira dupla seguida', () => {
  it('vai à prisão sem andar a soma e sem bônus', () => {
    const ctx = testContext([1, 1, 2, 2, 3, 3]);
    const state = testState(ctx, { players: 2, positions: [10, 0] });
    setOwner(state, 12, 0); // as duas primeiras paradas são do próprio jogador
    setOwner(state, 16, 0);
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.consecutiveDoubles).toBe(2);
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    const player = r.state.players[0]!;
    expect(player.position).toBe(10);
    expect(player.inJail).toBe(true);
    expect(player.money).toBe(1500);
    expect(r.state.phase).toBe('TURN_START');
    expect(turnOf(r.state)).toBe(1);
  });
});

describe('CT-05 · RN-018: vez de um jogador falido', () => {
  it('é pulado; joga o próximo ativo', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    state.players[1]!.bankrupt = true;
    state.phase = 'POST_RESOLUTION';
    const r = act(state, { type: 'END_TURN' }, ctx);
    expect(turnOf(r.state)).toBe(2);
    expect(r.state.phase).toBe('TURN_START');
    expect(hasEvent(r.events, 'TurnEnded')).toBe(true); // ponto de salvamento
  });
});

describe('CT-06 · RN-032: comprar rua sem dono com dinheiro', () => {
  it('desconta o preço e define o dono', () => {
    const ctx = testContext([2, 4]);
    let r = act(testState(ctx, { players: 2 }), { type: 'ROLL_DICE' }, ctx);
    r = act(r.state, { type: 'BUY' }, ctx);
    expect(r.state.players[0]!.money).toBe(1400);
    expect(r.state.properties['6']!.owner).toBe(0);
    expect(r.state.phase).toBe('POST_RESOLUTION');
  });
});

describe('CT-07 · RN-033: comprar sem dinheiro suficiente', () => {
  it('recusa com o motivo "Faltam R$ X"', () => {
    const ctx = testContext([2, 4]);
    const state = testState(ctx, { players: 2 });
    state.players[0]!.money = 60;
    const r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(eventOf(r.events, 'PurchaseOffered')?.shortfall).toBe(40);
    expect(refusalCode(r.state, { type: 'BUY' }, ctx)).toBe('insufficientFunds');
    expect(ctx.rules.texts['D-08']).toMatchObject({ disabledReason: 'Faltam {amount}' });
  });
});

describe('CT-08 · RN-034: não comprar', () => {
  it('a propriedade continua com o banco', () => {
    const ctx = testContext([2, 4]);
    let r = act(testState(ctx, { players: 2 }), { type: 'ROLL_DICE' }, ctx);
    r = act(r.state, { type: 'DECLINE_PURCHASE' }, ctx);
    expect(r.state.properties['6']!.owner).toBe(BANK);
    expect(r.state.players[0]!.money).toBe(1500);
    expect(r.state.phase).toBe('POST_RESOLUTION');
    expect(eventOf(r.events, 'PurchaseDeclined')?.position).toBe(6);
  });
});
