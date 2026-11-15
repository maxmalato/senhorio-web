// CT-24 a CT-26: prisão. CT-28 a CT-31: cartas de Sorte e Revés.

import { describe, expect, it } from 'vitest';
import type { EngineContext } from '../src/types';
import {
  act,
  cardOnTop,
  eventOf,
  hasEvent,
  refusalCode,
  setHouses,
  setOwner,
  testContext,
  testState,
  turnOf,
} from './helpers';

describe('CT-24 · RN-070: parar na casa 30', () => {
  it('vai à casa 10 sem bônus; o turno acaba', () => {
    const ctx = testContext([2, 3]);
    const r = act(testState(ctx, { players: 2, positions: [25, 0] }), { type: 'ROLL_DICE' }, ctx);
    const player = r.state.players[0]!;
    expect(player.position).toBe(10);
    expect(player.inJail).toBe(true);
    expect(player.money).toBe(1500);
    expect(r.state.phase).toBe('TURN_START');
    expect(turnOf(r.state)).toBe(1);
    expect(eventOf(r.events, 'Jailed')?.reason).toBe('space');
  });
});

/** Jogador 0 preso na casa 10, no início do seu turno. */
function jailedState(ctx: EngineContext, jailTurns: number) {
  const state = testState(ctx, { players: 2, positions: [10, 0] });
  state.players[0]!.inJail = true;
  state.players[0]!.jailTurns = jailTurns;
  state.phase = 'TURN_START';
  return state;
}

describe('CT-25 · RN-073: preso tira dupla', () => {
  it('sai e anda, sem nova jogada', () => {
    const ctx = testContext([2, 2]);
    let r = act(jailedState(ctx, 0), { type: 'START_TURN' }, ctx);
    expect(r.state.phase).toBe('JAIL_DECISION');
    expect(refusalCode(r.state, { type: 'USE_JAIL_CARD' }, ctx)).toBe('noJailCard');
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.players[0]!.inJail).toBe(false);
    expect(r.state.players[0]!.position).toBe(14);
    r = act(r.state, { type: 'DECLINE_PURCHASE' }, ctx);
    expect(r.state.extraRoll).toBe(false);
  });
});

describe('CT-26 · RN-074: terceira tentativa sem dupla', () => {
  it('na segunda tentativa continua preso e o turno acaba', () => {
    const ctx = testContext([1, 2]);
    let r = act(jailedState(ctx, 1), { type: 'START_TURN' }, ctx);
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    expect(r.state.players[0]!.inJail).toBe(true);
    expect(r.state.phase).toBe('TURN_START');
  });

  it('na terceira paga R$ 50 e anda a soma', () => {
    const ctx = testContext([1, 2]);
    let r = act(jailedState(ctx, 2), { type: 'START_TURN' }, ctx);
    r = act(r.state, { type: 'ROLL_DICE' }, ctx);
    const player = r.state.players[0]!;
    expect(player.inJail).toBe(false);
    expect(player.money).toBe(1450);
    expect(player.position).toBe(13);
    expect(hasEvent(r.events, 'MandatoryBail')).toBe(true);
  });

  it('RN-072: pagando a fiança, sai e rola no mesmo turno', () => {
    const ctx = testContext([1, 2]);
    let r = act(jailedState(ctx, 0), { type: 'START_TURN' }, ctx);
    r = act(r.state, { type: 'PAY_BAIL' }, ctx);
    expect(r.state.players[0]!.inJail).toBe(false);
    expect(r.state.players[0]!.money).toBe(1450);
    expect(r.state.players[0]!.position).toBe(13);
  });
});

/** Jogador 0 rola de `origin` até cair numa carta com `id` no topo e confirma. */
function drawTestCard(ctx: EngineContext, origin: number, deck: 'chance' | 'setback', id: string) {
  const state = testState(ctx, { players: 2, positions: [origin, 0] });
  cardOnTop(state, deck, id);
  const r = act(state, { type: 'ROLL_DICE' }, ctx);
  expect(r.state.phase).toBe('CARD');
  expect(eventOf(r.events, 'CardRevealed')?.id).toBe(id);
  return act(r.state, { type: 'CONFIRM' }, ctx);
}

describe('CT-28 · RN-083: carta S-01 a partir da casa 33', () => {
  it('vai à Partida e recebe R$ 200', () => {
    const ctx = testContext([1, 3]);
    const r = drawTestCard(ctx, 29, 'chance', 'S-01');
    expect(r.state.players[0]!.position).toBe(0);
    expect(r.state.players[0]!.money).toBe(1700);
    expect(r.state.phase).toBe('POST_RESOLUTION');
    expect(r.state.decks.chance.at(-1)).toBe('S-01'); // volta ao fundo
  });
});

describe('CT-29 · RN-083: carta R-12 a partir da casa 22', () => {
  it('volta à casa 1 sem bônus', () => {
    const ctx = testContext([1, 3]);
    const r = drawTestCard(ctx, 18, 'setback', 'R-12');
    expect(r.state.players[0]!.position).toBe(1);
    expect(r.state.players[0]!.money).toBe(1500);
    expect(r.state.phase).toBe('PURCHASE_DECISION'); // resolve a nova casa (RN-084)
  });
});

describe('CT-30 · RN-082: carta Saia da prisão', () => {
  it('sai do baralho até ser usada', () => {
    const ctx = testContext([1, 2, 1, 2]);
    const r = drawTestCard(ctx, 14, 'chance', 'S-13');
    const state = r.state;
    expect(state.players[0]!.jailCards).toEqual(['S-13']);
    expect(state.decks.chance).toHaveLength(15);
    expect(state.decks.chance).not.toContain('S-13');

    // depois, preso, usa a carta: sai, rola normalmente e a carta volta ao fundo
    state.players[0]!.inJail = true;
    state.players[0]!.position = 10;
    state.phase = 'JAIL_DECISION';
    const used = act(state, { type: 'USE_JAIL_CARD' }, ctx);
    expect(used.state.players[0]!.inJail).toBe(false);
    expect(used.state.players[0]!.jailCards).toEqual([]);
    expect(used.state.decks.chance.at(-1)).toBe('S-13');
    expect(used.state.players[0]!.position).toBe(13);
  });
});

describe('CT-31 · RN-080: carta R-07 com 3 casas e 1 hotel', () => {
  it('paga 3 × 25 + 100 = R$ 175', () => {
    const ctx = testContext([1, 3]);
    const state = testState(ctx, { players: 2, positions: [18, 0] });
    for (const position of [1, 6, 8, 9]) setOwner(state, position, 0);
    setHouses(state, 1, 5);
    for (const position of [6, 8, 9]) setHouses(state, position, 1);
    cardOnTop(state, 'setback', 'R-07');
    let r = act(state, { type: 'ROLL_DICE' }, ctx);
    r = act(r.state, { type: 'CONFIRM' }, ctx);
    expect(r.state.players[0]!.money).toBe(1500 - 175);
    expect(r.state.phase).toBe('POST_RESOLUTION');
  });
});
