// CT-39 a CT-41: fim da partida. CT-42: estado serializável (salvamento).

import { describe, expect, it } from 'vitest';
import { netWorth, ranking } from '../src/net-worth';
import {
  act,
  hasEvent,
  refusalCode,
  setHouses,
  setMortgaged,
  setOwner,
  testContext,
  testState,
  turnOf,
} from './helpers';

describe('CT-39 · RN-111: cálculo de patrimônio', () => {
  it('dinheiro + preços + casas − hipotecas', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    state.players[0]!.money = 1000;
    for (const position of [1, 3, 5, 39]) setOwner(state, position, 0);
    setHouses(state, 1, 2);
    setHouses(state, 3, 2);
    setMortgaged(state, 39);
    // 1000 + (60 + 60 + 200 + 400 − 200) + 4 casas × 50
    expect(netWorth(state, 0, ctx)).toEqual({
      money: 1000,
      properties: 520,
      houses: 200,
      total: 1720,
    });
  });
});

describe('CT-40 · RN-112: empate de patrimônio', () => {
  it('vence quem tem mais dinheiro; falido por último', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3 });
    state.players[0]!.money = 1300;
    setOwner(state, 5, 0); // 1300 + 200 = 1500
    state.players[2]!.bankrupt = true;
    const result = ranking(state, ctx);
    expect(result[0]!.netWorth).toBe(result[1]!.netWorth);
    expect(result[0]!.player).toBe(1);
    expect(result[2]!.player).toBe(2);
  });
});

describe('CT-41 · RN-113: tempo zera no meio da rodada', () => {
  it('a rodada termina antes do resultado', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 3, turn: 1, mode: { type: 'time', limit: 45 } });
    state.phase = 'POST_RESOLUTION';
    let r = act(state, { type: 'TIME_UP' }, ctx);
    expect(r.state.phase).toBe('POST_RESOLUTION'); // o turno segue
    r = act(r.state, { type: 'END_TURN' }, ctx);
    expect(r.state.phase).toBe('TURN_START'); // a rodada continua
    expect(turnOf(r.state)).toBe(2);
    const last = r.state;
    last.phase = 'POST_RESOLUTION';
    r = act(last, { type: 'END_TURN' }, ctx);
    expect(r.state.phase).toBe('GAME_OVER');
    expect(hasEvent(r.events, 'GameOver')).toBe(true);
    expect(r.state.ranking).toHaveLength(3);
    expect(refusalCode(r.state, { type: 'ROLL_DICE' }, ctx)).toBe('gameOver');
  });

  it('modo rodadas: termina ao fechar a última rodada, sem passar do limite', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2, turn: 1, mode: { type: 'rounds', limit: 1 } });
    state.phase = 'POST_RESOLUTION';
    const r = act(state, { type: 'END_TURN' }, ctx);
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.round).toBe(1);
  });

  it('recusa TIME_UP fora do modo tempo', () => {
    const ctx = testContext();
    expect(refusalCode(testState(ctx, { players: 2 }), { type: 'TIME_UP' }, ctx)).toBe(
      'modeWithoutTimer',
    );
  });

  it('RN-110/RN-115: quem abandona sai e, sobrando um, a partida acaba', () => {
    const ctx = testContext();
    const state = testState(ctx, { players: 2 });
    setOwner(state, 5, 0);
    const r = act(state, { type: 'QUIT' }, ctx);
    expect(r.state.players[0]!.bankrupt).toBe(true);
    expect(r.state.properties['5']!.owner).toBe(-1);
    expect(r.state.phase).toBe('GAME_OVER');
    expect(r.state.ranking?.[0]?.player).toBe(1);
  });
});

describe('CT-42 · salvamento: o estado vira JSON e volta igual', () => {
  it('estado no meio da partida, com casas, hipoteca e 6 jogadores', () => {
    const ctx = testContext([3, 4]);
    const state = testState(ctx, { players: 6 });
    setOwner(state, 1, 2);
    setHouses(state, 1, 3);
    setMortgaged(state, 39);
    const r = act(state, { type: 'ROLL_DICE' }, ctx);
    const text = JSON.stringify(r.state);
    expect(JSON.parse(text)).toEqual(r.state);
    // o salvamento fica pequeno (o Roku mediu cerca de 2,8 KB no pior caso)
    expect(text.length).toBeLessThan(4096);
  });
});
