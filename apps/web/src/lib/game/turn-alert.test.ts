import { describe, expect, it, vi } from 'vitest';
import { notifyTurn } from '../sound/alert';
import { Game, INSTANT_TIMINGS } from './game.svelte';
import { testGame } from './test-helpers';

vi.mock('../sound/alert', () => ({ notifyTurn: vi.fn(), clearTurnNotice: vi.fn() }));

describe('vários aparelhos: aviso de "sua vez"', () => {
  it('avisa só quando a decisão passa a ser deste aparelho', async () => {
    const { ctx, state } = testGame();
    const me = state.order[1]!;
    const game = new Game(state, ctx, INSTANT_TIMINGS, { send: () => {}, me });
    const at = (turn: number) => ({ ...state, turn });

    await game.receive(at(0), []); // vez de outra pessoa
    expect(notifyTurn).not.toHaveBeenCalled();

    await game.receive(at(1), []); // passou para mim
    expect(notifyTurn).toHaveBeenCalledTimes(1);
    expect(notifyTurn).toHaveBeenCalledWith('Sua vez!');

    await game.receive(at(1), []); // continua comigo: sem repetir
    expect(notifyTurn).toHaveBeenCalledTimes(1);

    await game.receive(at(2), []);
    await game.receive(at(1), []); // voltou para mim
    expect(notifyTurn).toHaveBeenCalledTimes(2);
  });

  it('no modo um aparelho, nunca avisa', async () => {
    vi.mocked(notifyTurn).mockClear();
    const { ctx, state } = testGame();
    const game = new Game(state, ctx, INSTANT_TIMINGS);
    await game.receive({ ...state, turn: 1 }, []);
    expect(notifyTurn).not.toHaveBeenCalled();
  });
});
