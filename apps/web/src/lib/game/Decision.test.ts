import { render, screen, within } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Game, INSTANT_TIMINGS } from './game.svelte';
import GameScreen from './GameScreen.svelte';
import { testGame } from './test-helpers';

function gameWithBrownGroup() {
  const { ctx, state } = testGame();
  // Ana (jogador 0 na ordem sem sorteio) tem o grupo marrom completo, antes de rolar
  state.properties['1']!.owner = 0;
  state.properties['3']!.owner = 0;
  state.phase = 'PRE_ROLL';
  return new Game(state, ctx, INSTANT_TIMINGS);
}

describe('menu e construção (D-10, D-11)', () => {
  it('opções sem item possível ficam desabilitadas com o motivo', async () => {
    const user = userEvent.setup();
    render(GameScreen, { game: gameWithBrownGroup(), onend: () => {} });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Menu/ }));
    const menu = screen.getByRole('listbox');
    expect(within(menu).getByRole('option', { name: /Construir/ })).toBeEnabled();
    expect(within(menu).getByRole('option', { name: /Vender casas/ })).toBeDisabled();
    expect(within(menu).getByText('Sem casas para vender')).toBeInTheDocument();
    expect(within(menu).getByText('Nada hipotecado')).toBeInTheDocument();
  });

  it('constrói uma casa e mostra a escada de aluguel', async () => {
    const user = userEvent.setup();
    const game = gameWithBrownGroup();
    render(GameScreen, { game, onend: () => {} });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Menu/ }));
    await user.click(screen.getByRole('option', { name: /Construir/ }));
    expect(
      screen.getByRole('heading', { name: 'Onde construir? Casa custa R$ 50' }),
    ).toBeInTheDocument();
    // as duas ruas do grupo mostram o aluguel antes e depois da 1ª casa
    expect(screen.getAllByText('Com a 1ª casa, o aluguel vai de R$ 8 para R$ 20')).toHaveLength(2);
    await user.click(screen.getByRole('option', { name: /Travessa do Porto/ }));
    // depois de escolher, o foco vai para o botão de confirmar
    expect(screen.getByRole('button', { name: 'Construir' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Construir' }));
    expect(game.state.properties['1']?.houses).toBe(1);
    expect(game.state.players[0]?.money).toBe(1450);
    // RN-052: a próxima casa só pode ir para a outra rua do grupo
    expect(screen.queryByRole('option', { name: /Travessa do Porto/ })).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Beco das Flores/ })).toBeInTheDocument();
  });

  it('Voltar fecha o menu sem confirmar nada', async () => {
    const user = userEvent.setup();
    render(GameScreen, { game: gameWithBrownGroup(), onend: () => {} });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /Menu/ }));
    await user.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Rolar dados' })).toBeInTheDocument();
  });
});

describe('venda simples (D-17, D-18)', () => {
  it('a resposta abre com Recusar em foco', async () => {
    const user = userEvent.setup();
    const { ctx, state } = testGame();
    state.properties['5']!.owner = 1;
    state.phase = 'PRE_ROLL';
    const game = new Game(state, ctx, INSTANT_TIMINGS);
    render(GameScreen, { game, onend: () => {} });
    await game.act({
      type: 'PROPOSE_TRADE',
      direction: 'buy',
      position: 5,
      amount: 150,
      otherPlayer: 1,
    });
    await screen.findByText('Passe o aparelho para Bruno');
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.getByRole('button', { name: 'Recusar' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Aceitar' }));
    expect(game.state.properties['5']?.owner).toBe(0);
  });
});
