import { render, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Dice from './Dice.svelte';
import { resetForTests, use3D } from './preference';

describe('dados da jogada', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    resetForTests();
  });

  it('sem WebGL, mostra os dois dados em 2D', () => {
    const { container } = render(Dice, { d1: 3, d2: 5, durationMs: 650 });
    expect(container.querySelectorAll('svg.die')).toHaveLength(2);
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('se o 3D falhar ao montar a cena, continua em 2D e não tenta de novo', async () => {
    // finge WebGL para passar da checagem; a cena do Three.js então falha de verdade
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
      kind.startsWith('webgl') ? ({} as RenderingContext) : null) as never);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(use3D()).toBe(true);
    const { container } = render(Dice, { d1: 6, d2: 6, durationMs: 650 });
    await waitFor(() => expect(use3D()).toBe(false));
    expect(container.querySelectorAll('svg.die')).toHaveLength(2);
    expect(container.querySelector('canvas')).toBeNull();
  });
});
