import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import type { GameState } from '@senhorio/engine';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App.svelte';
import { Game, INSTANT_TIMINGS } from '../game/game.svelte';
import { testGame } from '../game/test-helpers';
import { loadGame, saveGame } from './save';
import { createMemoryStore } from './store';

describe('controlador: ponto de salvamento', () => {
  it('grava no fim do turno e apaga quando a partida termina', async () => {
    const { ctx, state } = testGame([2, 4]);
    const persist = vi.fn<(state: GameState, seconds: number | null) => Promise<boolean>>(
      async () => true,
    );
    const forget = vi.fn(async () => {});
    const game = new Game(state, ctx, INSTANT_TIMINGS, { persist, forget });
    await game.act({ type: 'START_TURN' });
    await game.act({ type: 'ROLL_DICE' });
    expect(persist).not.toHaveBeenCalled(); // nada no meio do turno
    await game.act({ type: 'DECLINE_PURCHASE' });
    await game.act({ type: 'END_TURN' });
    expect(persist).toHaveBeenCalledTimes(1);
    expect(persist.mock.calls[0]?.[0]).toMatchObject({ phase: 'TURN_START', turn: 1 });

    // dois jogadores: quem abandona encerra a partida
    const two = testGame([], ['Ana', 'Bruno']);
    const ending = new Game(two.state, two.ctx, INSTANT_TIMINGS, { persist, forget });
    await ending.act({ type: 'START_TURN' });
    await ending.act({ type: 'QUIT' });
    expect(ending.over).toBe(true);
    expect(forget).toHaveBeenCalledTimes(1);
  });

  it('se a gravação falhar, avisa uma vez (I-87) e o jogo segue', async () => {
    const { ctx, state } = testGame([1, 2, 1, 2]);
    const game = new Game(state, ctx, INSTANT_TIMINGS, { persist: async () => false });
    for (let i = 0; i < 2; i++) {
      await game.act({ type: 'START_TURN' });
      await game.act({ type: 'ROLL_DICE' });
      if (game.state.phase === 'PURCHASE_DECISION') await game.act({ type: 'DECLINE_PURCHASE' });
      await game.act({ type: 'END_TURN' });
    }
    expect(game.history.filter((line) => line === 'Não foi possível salvar')).toHaveLength(1);
  });
});

describe('tela inicial com partida salva', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/?seed=7&speed=0');
  });

  it('D-21: continua a partida salva do ponto em que parou', async () => {
    const user = userEvent.setup();
    const { state } = testGame([], ['Ana', 'Bruno']);
    const store = createMemoryStore();
    await saveGame(store, { ...state, round: 4 }, null);
    render(App, { store });
    expect(await screen.findByText('Continuar partida')).toBeInTheDocument();
    expect(screen.getByText(/Rodada 4 · 2 jogadores/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('heading', { name: 'Vez de Ana' })).toBeInTheDocument();
  });

  it('D-22: nova partida pede confirmação e só então apaga a salva', async () => {
    const user = userEvent.setup();
    const { state } = testGame();
    const store = createMemoryStore();
    await saveGame(store, state, null);
    render(App, { store });
    await user.click(await screen.findByRole('button', { name: 'Nova partida' }));
    expect(
      screen.getByRole('heading', { name: 'Começar outra partida? A atual será apagada' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Não, voltar' }));
    expect((await loadGame(store, state.rulesVersion)).status).toBe('ok');
    await user.click(screen.getByRole('button', { name: 'Nova partida' }));
    await user.click(screen.getByRole('button', { name: 'Sim, começar' }));
    expect(await screen.findByRole('heading', { name: 'Quantos jogadores?' })).toBeInTheDocument();
    expect((await loadGame(store, state.rulesVersion)).status).toBe('none');
  });

  it('CT-43: partida de outra versão das regras não é oferecida', async () => {
    const { state } = testGame();
    const store = createMemoryStore();
    await saveGame(store, { ...state, rulesVersion: state.rulesVersion + 1 }, null);
    render(App, { store });
    expect(
      await screen.findByText(
        'A partida salva é de outra versão das regras e não pode ser continuada',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Continuar partida')).not.toBeInTheDocument();
  });
});
