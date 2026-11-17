import {
  createContext,
  createFixedRandomizer,
  createSeededRandom,
  createRandomizer,
  decidingPlayer,
  newGame,
} from '@senhorio/engine';
import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RULES_RESULT } from '../rules';
import { Game, INSTANT_TIMINGS } from './game.svelte';
import GameScreen from './GameScreen.svelte';

/** Ana (pessoa) contra Bruno e Carla (computador), com sorteios reproduzíveis. */
function gameAgainstComputer(seed = 3) {
  const ctx = createContext(RULES_RESULT, createRandomizer(createSeededRandom(seed)));
  const created = newGame(
    {
      players: [
        { name: 'Ana', color: 'a' },
        { name: 'Bruno', color: 'b', bot: true },
        { name: 'Carla', color: 'c', bot: true },
      ],
      mode: { type: 'rounds', limit: 20 },
    },
    ctx,
  );
  if (!created.ok) throw new Error(created.reason.code);
  return new Game(created.state, ctx, INSTANT_TIMINGS, { botRandom: createSeededRandom(seed) });
}

const until = async (check: () => boolean, ms = 3000) => {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > ms) throw new Error('tempo esgotado esperando o computador');
    await new Promise((r) => setTimeout(r, 5));
  }
};

describe('jogar contra o computador', () => {
  it('o computador joga a vez dele sozinho e devolve a decisão para a pessoa', async () => {
    const game = gameAgainstComputer();
    game.startClock();
    // começando por quem for, logo a decisão chega à Ana, a única pessoa
    await until(() => !game.busy && decidingPlayer(game.state) === 0);
    expect(game.canAct).toBe(true);
    expect(game.refusal).toBeNull();
    // a Ana joga a vez inteira; depois os dois computadores jogam e a vez volta para ela
    const round = game.state.round;
    while (decidingPlayer(game.state) === 0 && game.state.phase !== 'POST_RESOLUTION') {
      const phase = game.state.phase;
      if (phase === 'TURN_START') await game.act({ type: 'START_TURN' });
      else if (phase === 'PURCHASE_DECISION') await game.act({ type: 'DECLINE_PURCHASE' });
      else if (phase === 'CARD') await game.act({ type: 'CONFIRM' });
      else await game.act({ type: 'ROLL_DICE' });
    }
    if (game.state.phase === 'POST_RESOLUTION' && !game.state.extraRoll)
      await game.act({ type: 'END_TURN' });
    await until(() => !game.busy && decidingPlayer(game.state) === 0 && game.state.round > round);
    game.stopClock();
  });

  it('com a partida pausada, o computador espera', async () => {
    const game = gameAgainstComputer();
    // passa a vez para um computador
    game.state = { ...game.state, turn: game.state.order.indexOf(1) };
    game.paused = true;
    game.startClock();
    const before = game.state;
    await new Promise((r) => setTimeout(r, 400));
    expect(game.state).toBe(before);
    game.paused = false;
    await until(() => game.state !== before);
    game.stopClock();
  });

  it('na vez do computador, a pessoa vê quem está jogando e pode pausar', async () => {
    const user = userEvent.setup();
    const game = gameAgainstComputer();
    game.state = { ...game.state, turn: game.state.order.indexOf(1) };
    game.paused = false;
    render(GameScreen, { game, onend: () => {} });
    game.stopClock(); // segura o computador para ver o cartão de espera
    expect(await screen.findByText('Bruno está decidindo')).toBeInTheDocument();
    expect(screen.getByText('O computador está jogando')).toBeInTheDocument();
    expect(screen.getAllByText('COMPUTADOR')).toHaveLength(2);
    await user.click(screen.getByRole('button', { name: 'Pausar' }));
    expect(game.paused).toBe(true);
  });

  it('sem "Passe o aparelho" quando só uma pessoa joga', () => {
    const game = gameAgainstComputer();
    expect(game.handoff).toBe(false);
    const ctx = createContext(RULES_RESULT, createFixedRandomizer([]));
    const created = newGame(
      {
        players: [
          { name: 'Ana', color: 'a' },
          { name: 'Bruno', color: 'b' },
          { name: 'Carla', color: 'c', bot: true },
        ],
        mode: { type: 'classic' },
      },
      ctx,
    );
    if (!created.ok) throw new Error();
    expect(new Game(created.state, ctx, INSTANT_TIMINGS).handoff).toBe(true);
  });
});
