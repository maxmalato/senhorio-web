// CT-18 a CT-23: construção, venda de casas e hipoteca (menu em PRE_ROLL).

import { describe, expect, it } from 'vitest';
import { buildableStreets } from '../src/building';
import { redeemCost } from '../src/mortgage';
import { act, refusalCode, setHouses, setOwner, testContext, testState } from './helpers';

describe('CT-18 · RN-050: construir sem grupo completo', () => {
  it('recusa e não oferece nenhuma rua', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 1);
    expect(refusalCode(state, { type: 'BUILD', position: 1 }, ctx)).toBe('incompleteGroup');
    expect(buildableStreets(state, 0, ctx)).toEqual([]);
  });
});

describe('CT-19 · RN-052: construir fora da ordem uniforme', () => {
  it('recusa e só oferece as ruas permitidas', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    setHouses(state, 1, 1);
    expect(refusalCode(state, { type: 'BUILD', position: 1 }, ctx)).toBe('unevenBuilding');
    expect(buildableStreets(state, 0, ctx)).toEqual([3]);
    const r = act(state, { type: 'BUILD', position: 3 }, ctx);
    expect(r.state.properties['3']!.houses).toBe(1);
    expect(r.state.players[0]!.money).toBe(1450);
    expect(r.state.phase).toBe('PRE_ROLL'); // volta ao mesmo estado
  });

  it('recusa grupo com rua hipotecada (RN-050)', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    state.properties['3']!.mortgaged = true;
    expect(refusalCode(state, { type: 'BUILD', position: 1 }, ctx)).toBe('mortgagedGroup');
  });
});

describe('CT-20 · RN-053: construir com 4 casas em todo o grupo', () => {
  it('a rua passa a ter hotel (casas = 5)', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    for (const position of [6, 8, 9]) {
      setOwner(state, position, 0);
      setHouses(state, position, 4);
    }
    const r = act(state, { type: 'BUILD', position: 6 }, ctx);
    expect(r.state.properties['6']!.houses).toBe(5);
    expect(r.state.players[0]!.money).toBe(1450);
    expect(refusalCode(r.state, { type: 'BUILD', position: 6 }, ctx)).toBe('hasHotel');
  });
});

describe('CT-21 · RN-054: vender casa e vender hotel', () => {
  it('recebe 50% do custo; hotel volta a 4 casas', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    for (const position of [6, 8, 9]) {
      setOwner(state, position, 0);
      setHouses(state, position, 4);
    }
    setHouses(state, 6, 5);
    expect(refusalCode(state, { type: 'SELL_HOUSE', position: 8 }, ctx)).toBe('unevenSale');
    let r = act(state, { type: 'SELL_HOUSE', position: 6 }, ctx);
    expect(r.state.properties['6']!.houses).toBe(4);
    expect(r.state.players[0]!.money).toBe(1525);
    r = act(r.state, { type: 'SELL_HOUSE', position: 8 }, ctx);
    expect(r.state.properties['8']!.houses).toBe(3);
    expect(r.state.players[0]!.money).toBe(1550);
  });
});

describe('CT-22 · RN-061: hipotecar rua com casas no grupo', () => {
  it('recusa', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 1, 0);
    setOwner(state, 3, 0);
    setHouses(state, 3, 1);
    expect(refusalCode(state, { type: 'MORTGAGE', position: 1 }, ctx)).toBe('groupHasHouses');
    expect(refusalCode(state, { type: 'MORTGAGE', position: 5 }, ctx)).toBe('notOwner');
    expect(refusalCode(state, { type: 'MORTGAGE', position: 2 }, ctx)).toBe('invalidPosition');
  });
});

describe('CT-23 · RN-063: resgatar hipoteca de R$ 120', () => {
  it('custa R$ 132', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 24, 0);
    let r = act(state, { type: 'MORTGAGE', position: 24 }, ctx);
    expect(r.state.players[0]!.money).toBe(1620);
    expect(redeemCost(ctx, 24)).toBe(132);
    r = act(r.state, { type: 'REDEEM', position: 24 }, ctx);
    expect(r.state.players[0]!.money).toBe(1620 - 132);
    expect(r.state.properties['24']!.mortgaged).toBe(false);
  });

  it('RN-008: hipoteca de R$ 75 tem juros de R$ 8 (resgate R$ 83)', () => {
    expect(redeemCost(testContext(), 12)).toBe(83);
  });
});
