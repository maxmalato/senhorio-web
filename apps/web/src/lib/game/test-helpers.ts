// Utilitários dos testes da interface: partida pronta, com sorteios fixos.

import {
  createContext,
  createFixedRandomizer,
  newGame,
  type EngineContext,
  type GameState,
} from '@senhorio/engine';
import { RULES_RESULT } from '../rules';

export function testGame(
  dice: number[] = [],
  players = ['Ana', 'Bruno', 'Carla'],
): { ctx: EngineContext; state: GameState } {
  const ctx = createContext(RULES_RESULT, createFixedRandomizer(dice));
  const created = newGame(
    { players: players.map((name, i) => ({ name, color: `cor${i}` })), mode: { type: 'classic' } },
    ctx,
  );
  if (!created.ok) throw new Error(created.reason.code);
  return { ctx, state: created.state };
}
