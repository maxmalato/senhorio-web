// Partidas automáticas completas (teste de resistência do Roku, simular=N).

import { describe, expect, it } from 'vitest';
import { ROUND_CAP, simulateGame, summarize } from '../src/sim/simulate';

describe('simulação de partidas com robôs', () => {
  it('10 partidas de 4 jogadores no modo rodadas terminam sem erro, na rodada 30 ou antes', () => {
    const results = Array.from({ length: 10 }, (_, i) =>
      simulateGame({ players: 4, mode: 'rounds', limit: 30, seed: 1000 + i }),
    );
    for (const r of results) {
      expect(r.errors).toEqual([]);
      expect(['limit', 'winner']).toContain(r.end);
      expect(r.state.round).toBeLessThanOrEqual(30);
      expect(r.state.ranking).toHaveLength(4);
    }
    const summary = summarize(results);
    expect(summary.errors).toBe(0);
    expect(summary.rounds?.max).toBeLessThanOrEqual(30);
  });

  it('6 jogadores e 60 rodadas: partida longa sem erro', () => {
    const r = simulateGame({ players: 6, mode: 'rounds', limit: 60, seed: 7 });
    expect(r.errors).toEqual([]);
    expect(r.state.phase).toBe('GAME_OVER');
  });

  it('modo clássico termina com um vencedor ou no teto de rodadas', () => {
    for (const seed of [1, 2, 3]) {
      const r = simulateGame({ players: 3, mode: 'classic', seed });
      expect(r.errors).toEqual([]);
      expect(['winner', 'cap']).toContain(r.end);
      if (r.end === 'cap') expect(r.state.round).toBeGreaterThan(ROUND_CAP);
    }
  });

  it('a mesma semente reproduz a mesma partida', () => {
    const a = simulateGame({ players: 4, mode: 'rounds', limit: 20, seed: 42 });
    const b = simulateGame({ players: 4, mode: 'rounds', limit: 20, seed: 42 });
    expect(b.state).toEqual(a.state);
    expect(b.transitions).toBe(a.transitions);
  });
});
