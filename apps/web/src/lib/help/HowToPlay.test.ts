import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import HowToPlay from './HowToPlay.svelte';

describe('Como jogar', () => {
  it('mostra as oito seções com os valores do arquivo de regras', () => {
    const { container } = render(HowToPlay);
    expect(screen.getByRole('heading', { level: 1, name: 'Como jogar' })).toBeInTheDocument();
    for (const title of [
      'Objetivo',
      'Sua vez',
      'Propriedades e aluguel',
      'Casas e hotéis',
      'Prisão',
      'Sorte, Revés e impostos',
      'Hipoteca e venda simples',
      'Dívidas e falência',
    ])
      expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    const text = (container.textContent ?? '').replace(/\u00a0/g, ' ');
    expect(text).toContain('R$ 1.500'); // dinheiro inicial
    expect(text).toContain('pague R$ 50'); // fiança
    expect(text).toContain('receba R$ 200'); // passagem pela Partida
    expect(text).toContain('de R$ 30 a R$ 240'); // estações
    expect(text).toContain('× 5'); // companhia
    expect(text).not.toMatch(/\{\w+\}/); // nenhum marcador sem valor
  });

  it('dentro da partida, o título vira h2', () => {
    render(HowToPlay, { heading: 'h2' });
    expect(screen.getByRole('heading', { level: 2, name: 'Como jogar' })).toBeInTheDocument();
  });
});
