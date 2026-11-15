// CT-46 a CT-52: tipos de carta que não tinham cenário no Roku (RN-080 a RN-084, RN-106).
// Sorte nas casas 2, 17 e 33; Revés nas casas 7, 22 e 36. Dados 1 + 3 = 4 casas.

import { describe, expect, it } from 'vitest';
import { BANK, type EngineContext } from '../src/types';
import { act, cardOnTop, eventOf, testContext, testState, turnOf } from './helpers';

/** Jogador 0 sai de `origin`, cai na carta `id` e confirma. */
function drawCard(
  ctx: EngineContext,
  options: { origin: number; deck: 'chance' | 'setback'; id: string; players?: number },
  prepare?: (state: ReturnType<typeof testState>) => void,
) {
  const state = testState(ctx, { players: options.players ?? 3, positions: [options.origin] });
  cardOnTop(state, options.deck, options.id);
  prepare?.(state);
  const r = act(state, { type: 'ROLL_DICE' }, ctx);
  expect(r.state.phase).toBe('CARD');
  return act(r.state, { type: 'CONFIRM' }, ctx);
}

describe('CT-46 · carta de receber do banco (S-07)', () => {
  it('recebe R$ 150 e segue para depois da resolução', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 29, deck: 'chance', id: 'S-07' });
    expect(r.state.players[0]!.money).toBe(1650);
    expect(r.state.phase).toBe('POST_RESOLUTION');
  });
});

describe('CT-47 · carta de pagar ao banco (R-05)', () => {
  it('paga R$ 50', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 3, deck: 'setback', id: 'R-05' });
    expect(r.state.players[0]!.money).toBe(1450);
    expect(r.state.phase).toBe('POST_RESOLUTION');
  });
});

describe('CT-48 · carta de receber de cada jogador (S-12)', () => {
  it('cada jogador ativo paga R$ 20; falidos ficam de fora', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 29, deck: 'chance', id: 'S-12', players: 4 }, (state) => {
      state.players[3]!.bankrupt = true;
    });
    expect(r.state.players.map((p) => p.money)).toEqual([1540, 1480, 1480, 1500]);
  });
});

describe('CT-49 · carta de pagar a cada jogador (R-09)', () => {
  it('paga R$ 25 a cada jogador ativo', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 3, deck: 'setback', id: 'R-09' });
    expect(r.state.players.map((p) => p.money)).toEqual([1450, 1525, 1525]);
  });

  it('RN-106: sem dinheiro, as dívidas viram uma só, com o banco como credor', () => {
    const ctx = testContext([1, 3]);
    const state = testState(ctx, { players: 3, positions: [3] });
    state.players[0]!.money = 30;
    cardOnTop(state, 'setback', 'R-09');
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    r = act(r.state, { type: 'CONFIRM' }, ctx);
    expect(r.state.phase).toBe('RAISE_MONEY');
    expect(eventOf(r.events, 'DebtOpened')).toMatchObject({
      creditor: BANK,
      amount: 50,
      shortfall: 20,
      noWayOut: true,
    });
    r = act(r.state, { type: 'DECLARE_BANKRUPTCY' }, ctx);
    r = act(r.state, { type: 'CONFIRM' }, ctx);
    expect(r.state.players[0]!.bankrupt).toBe(true);
    expect(r.state.players[1]!.money).toBe(1500); // ninguém recebe parte da dívida
    expect(turnOf(r.state)).toBe(1);
  });
});

describe('CT-50 · carta da estação mais próxima (S-05)', () => {
  it('da Sorte da casa 33 vai à Estação Leste (35) e resolve a compra', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 29, deck: 'chance', id: 'S-05' });
    expect(r.state.players[0]!.position).toBe(35);
    expect(r.state.phase).toBe('PURCHASE_DECISION');
  });
});

describe('CT-51 · carta de andar casas (S-14)', () => {
  it('volta 3 casas, sem bônus, e resolve a nova casa', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 13, deck: 'chance', id: 'S-14' });
    expect(r.state.players[0]!.position).toBe(14);
    expect(r.state.players[0]!.money).toBe(1500);
    expect(r.state.phase).toBe('PURCHASE_DECISION');
  });
});

describe('CT-52 · carta de ir para a prisão (R-01)', () => {
  it('vai à casa 10 sem bônus e o turno acaba', () => {
    const ctx = testContext([1, 3]);
    const r = drawCard(ctx, { origin: 3, deck: 'setback', id: 'R-01' });
    expect(r.state.players[0]).toMatchObject({ position: 10, inJail: true, money: 1500 });
    expect(eventOf(r.events, 'Jailed')?.reason).toBe('card');
    expect(r.state.phase).toBe('TURN_START');
  });
});
