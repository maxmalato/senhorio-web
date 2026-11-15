import { render, screen } from '@testing-library/svelte';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import App from './App.svelte';

describe('App', () => {
  it('mostra o nome do jogo', () => {
    render(App);
    expect(screen.getByRole('heading', { name: 'Senhorio' })).toBeInTheDocument();
  });

  it('rola dois dados pelo motor ao clicar no botão', async () => {
    const user = userEvent.setup();
    render(App);
    await user.click(screen.getByRole('button', { name: 'Rolar dados de teste' }));
    expect(screen.getByText(/^Resultado: [1-6] \+ [1-6] = \d+$/)).toBeInTheDocument();
  });
});
