// CT-53 a CT-58: remover jogador desconectado (vários aparelhos, docs/01).

import { describe, expect, it } from 'vitest';
import { transition } from '../src/engine';
import { checkInvariants } from '../src/sim/invariants';
import { BANK } from '../src/types';
import { act, eventOf, setHouses, setOwner, testContext, testState, turnOf } from './helpers';

describe('CT-53 · remover um jogador fora da vez dele', () => {
  it('os bens voltam ao banco e a vez continua com quem jogava', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    setOwner(state, 5, 1);
    const r = act(state, { type: 'REMOVE_PLAYER', player: 1 }, ctx);
    expect(r.state.players[1]).toMatchObject({ bankrupt: true, exitRound: 1 });
    expect(r.state.properties['5']!.owner).toBe(BANK);
    expect(r.state.phase).toBe('PRE_ROLL');
    expect(turnOf(r.state)).toBe(0);
    expect(eventOf(r.events, 'WentBankrupt')).toMatchObject({
      player: 1,
      creditor: BANK,
      quit: true,
    });
  });
});

describe('CT-54 · remover o jogador da vez', () => {
  it('o turno passa para o próximo', () => {
    const ctx = testContext();
    const r = act(testState(ctx, { players: 3 }), { type: 'REMOVE_PLAYER', player: 0 }, ctx);
    expect(r.state.phase).toBe('TURN_START');
    expect(turnOf(r.state)).toBe(1);
  });

  it('na decisão de compra também funciona', () => {
    const ctx = testContext([2, 4]);
    let r = act(testState(ctx, { players: 3 }), { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('PURCHASE_DECISION');
    r = act(r.state, { type: 'REMOVE_PLAYER', player: 0 }, ctx);
    expect(turnOf(r.state)).toBe(1);
  });
});

describe('CT-55 · remover quem está levantando dinheiro', () => {
  it('a dívida termina com os bens indo ao banco e o turno acaba', () => {
    const ctx = testContext([1, 3]);
    const state = testState(ctx, { players: 3, turn: 1, positions: [0, 20] });
    for (const position of [21, 23, 24]) {
      setOwner(state, position, 0);
      setHouses(state, position, 3);
    }
    state.players[1]!.money = 300;
    setOwner(state, 39, 1);
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.phase).toBe('RAISE_MONEY');
    r = act(r.state, { type: 'REMOVE_PLAYER', player: 1 }, ctx);
    expect(r.state.players[1]!.bankrupt).toBe(true);
    expect(r.state.properties['39']!.owner).toBe(BANK);
    expect(r.state.players[0]!.money).toBe(1500); // o credor não recebe: os bens vão ao banco
    expect(r.state.phase).toBe('TURN_START');
    expect(turnOf(r.state)).toBe(2);
  });
});

describe('CT-56 · remover e sobrar um só jogador', () => {
  it('a partida acaba (RN-110)', () => {
    const ctx = testContext();
    const r = act(testState(ctx, { players: 2 }), { type: 'REMOVE_PLAYER', player: 1 }, ctx);
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.ranking?.[0]?.player).toBe(0);
  });
});

describe('CT-57 · remover com venda simples pendente', () => {
  it('a proposta é cancelada', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    setOwner(state, 5, 1);
    let r = act(
      state,
      { type: 'PROPOSE_TRADE', direction: 'buy', position: 5, amount: 150, otherPlayer: 1 },
      ctx,
    );
    r = act(r.state, { type: 'REMOVE_PLAYER', player: 1 }, ctx);
    expect(r.state.pending).toBeNull();
    expect(r.state.properties['5']!.owner).toBe(BANK);
    expect(r.state.players[0]!.money).toBe(1500);
  });

  it('recusa jogador inexistente ou que já saiu', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    expect(transition(state, { type: 'REMOVE_PLAYER', player: 7 }, ctx).reason?.code).toBe(
      'invalidTarget',
    );
    const out = act(state, { type: 'REMOVE_PLAYER', player: 2 }, ctx);
    expect(transition(out.state, { type: 'REMOVE_PLAYER', player: 2 }, ctx).reason?.code).toBe(
      'alreadyOut',
    );
  });
});

describe('CT-58 · remover e sobrar um jogador com uma carta revelada', () => {
  it('a partida acaba e a carta volta ao baralho (nenhuma carta se perde)', () => {
    const ctx = testContext([1, 2]);
    const state = testState(ctx, { players: 2, positions: [4, 10] });
    let r = act(state, { type: 'ROLL_DICE' }, ctx); // 4 + 3 = Revés (casa 7)
    expect(r.state.phase).toBe('CARD');
    const card = r.state.currentCard!;
    r = act(r.state, { type: 'REMOVE_PLAYER', player: 1 }, ctx);
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.currentCard).toBeNull();
    expect(r.state.decks[card.deck]).toContain(card.id);
    expect(checkInvariants(r.state, ctx)).toEqual([]);
  });
});
