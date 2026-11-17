import { BANK } from '@senhorio/engine';
import { TABLE_SEAT } from '@senhorio/protocol';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { playSound } from '../sound/synth';
import { Game, INSTANT_TIMINGS } from './game.svelte';
import { testGame } from './test-helpers';

vi.mock('../sound/synth', () => ({ playSound: vi.fn(), unlockAudioOnFirstGesture: vi.fn() }));

const dice = { type: 'DiceRolled', d1: 2, d2: 3, double: false } as const;
const rent = (from: number, to: number) =>
  ({ type: 'MoneyTransferred', from, to, amount: 20, reason: 'rent' }) as const;

describe('modo mesa: quem toca cada som', () => {
  beforeEach(() => vi.mocked(playSound).mockClear());

  it('a mesa toca tudo, inclusive o dinheiro de qualquer jogador', async () => {
    const { ctx, state } = testGame();
    const table = new Game(state, ctx, INSTANT_TIMINGS, {
      send: () => {},
      me: TABLE_SEAT,
      table: true,
    });
    await table.receive(state, [dice, rent(0, 1)]);
    expect(vi.mocked(playSound).mock.calls.map((c) => c[0])).toEqual(['dice', 'coin']);
  });

  it('com mesa, o celular toca só o próprio dinheiro', async () => {
    const { ctx, state } = testGame();
    const phone = new Game(state, ctx, INSTANT_TIMINGS, { send: () => {}, me: 1, quiet: true });
    await phone.receive(state, [dice, rent(0, 2), rent(BANK, 1)]);
    expect(vi.mocked(playSound).mock.calls.map((c) => c[0])).toEqual(['coin']);
  });

  it('sem mesa, o celular continua tocando os sons gerais', async () => {
    const { ctx, state } = testGame();
    const phone = new Game(state, ctx, INSTANT_TIMINGS, { send: () => {}, me: 1 });
    await phone.receive(state, [dice]);
    expect(vi.mocked(playSound)).toHaveBeenCalledWith('dice');
  });
});
