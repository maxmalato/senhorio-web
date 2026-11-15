import { describe, expect, it } from 'vitest';
import { Game, INSTANT_TIMINGS } from './game.svelte';
import { testGame } from './test-helpers';

describe('controlador da partida', () => {
  it('aplica a ação no motor e atualiza a vista ao fim dos eventos', async () => {
    const { ctx, state } = testGame([2, 4]);
    const game = new Game(state, ctx, INSTANT_TIMINGS);
    expect(await game.act({ type: 'START_TURN' })).toBeNull();
    expect(game.state.phase).toBe('PRE_ROLL');
    await game.act({ type: 'ROLL_DICE' });
    expect(game.state.phase).toBe('PURCHASE_DECISION');
    expect(game.view.players[0]?.position).toBe(6);
    expect(game.busy).toBe(false);
  });

  it('ação recusada não muda nada e guarda o motivo', async () => {
    const { ctx, state } = testGame();
    const game = new Game(state, ctx, INSTANT_TIMINGS);
    const reason = await game.act({ type: 'BUY' });
    expect(reason?.code).toBe('invalidActionForPhase');
    expect(game.state).toBe(state);
    expect(game.refusal?.code).toBe('invalidActionForPhase');
  });

  it('o histórico guarda só as 3 últimas linhas, a mais nova primeiro', async () => {
    const { ctx, state } = testGame([2, 4, 1, 2, 1, 3, 2, 2]);
    const game = new Game(state, ctx, INSTANT_TIMINGS);
    for (let turn = 0; turn < 3; turn++) {
      await game.act({ type: 'START_TURN' });
      await game.act({ type: 'ROLL_DICE' });
      if (game.state.phase === 'PURCHASE_DECISION') await game.act({ type: 'DECLINE_PURCHASE' });
      if (game.state.phase === 'POST_RESOLUTION' && !game.state.extraRoll)
        await game.act({ type: 'END_TURN' });
    }
    expect(game.history.length).toBeLessThanOrEqual(3);
    expect(game.history[0]).toMatch(/não comprou|pagou|tirou/);
  });

  it('modo tempo: começa com o limite em segundos', () => {
    const { ctx, state } = testGame();
    const timed = { ...state, mode: { type: 'time' as const, limit: 30, timeUp: false } };
    expect(new Game(timed, ctx, INSTANT_TIMINGS).secondsLeft).toBe(1800);
  });
});
