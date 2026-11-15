import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('fluxo do modo um aparelho', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/?seed=7&speed=0');
  });

  it('vai do início à primeira jogada', async () => {
    const user = userEvent.setup();
    render(App);
    await user.click(screen.getByRole('button', { name: 'Nova partida' }));
    expect(screen.getByRole('heading', { name: 'Quantos jogadores?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'Como a partida termina?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuar' }));
    expect(screen.getByRole('heading', { name: 'O banco sorteou a ordem' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Começar partida' }));
    const start = await screen.findByRole('button', { name: 'Começar' });
    expect(screen.getByText(/^Passe o aparelho para/)).toBeInTheDocument();
    await user.click(start);
    expect(await screen.findByRole('button', { name: 'Rolar dados' })).toBeInTheDocument();
  });

  it('recusa nome vazio na preparação', async () => {
    const user = userEvent.setup();
    render(App);
    await user.click(screen.getByRole('button', { name: 'Nova partida' }));
    await user.clear(screen.getByLabelText('Nome do jogador 1'));
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeDisabled();
  });
});
