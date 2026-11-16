// Salvamento da partida (docs/03, "Salvamento e retomada"): grava em FIM_TURNO, depois de
// todas as transferências, e retoma em TURN_START de quem tinha a vez. Nada é gravado no
// meio do turno: se o jogo fechar, o turno em andamento é refeito do início.

import type { GameState } from '@senhorio/engine';
import type { SaveStore } from './store';

/** Formato do registro gravado; muda só se a estrutura do registro mudar. */
export const SAVE_FORMAT = 1;

export interface SaveRecord {
  format: number;
  /** Versão do arquivo de regras com que a partida foi criada (CT-43). */
  rulesVersion: number;
  savedAt: number;
  state: GameState;
  /** Modo tempo: segundos restantes (o cronômetro fica na interface, fora do motor). */
  secondsLeft: number | null;
}

export type LoadResult =
  | { status: 'none' }
  | { status: 'incompatible'; record: SaveRecord | null }
  | { status: 'ok'; record: SaveRecord };

export async function saveGame(
  store: SaveStore,
  state: GameState,
  secondsLeft: number | null,
  now = Date.now(),
): Promise<boolean> {
  const record: SaveRecord = {
    format: SAVE_FORMAT,
    rulesVersion: state.rulesVersion,
    savedAt: now,
    state,
    secondsLeft,
  };
  try {
    await store.put(record);
    return true;
  } catch {
    return false;
  }
}

function looksLikeRecord(value: unknown): value is SaveRecord {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Partial<SaveRecord>;
  return (
    typeof r.format === 'number' &&
    typeof r.rulesVersion === 'number' &&
    typeof r.savedAt === 'number' &&
    typeof r.state === 'object' &&
    r.state !== null &&
    Array.isArray(r.state.players)
  );
}

/** Lê a partida salva; outra versão das regras ou registro estranho não é aberto (CT-43). */
export async function loadGame(store: SaveStore, rulesVersion: number): Promise<LoadResult> {
  let value: unknown;
  try {
    value = await store.get();
  } catch {
    return { status: 'none' };
  }
  if (value === undefined || value === null) return { status: 'none' };
  if (!looksLikeRecord(value)) return { status: 'incompatible', record: null };
  if (
    value.format !== SAVE_FORMAT ||
    value.rulesVersion !== rulesVersion ||
    value.state.rulesVersion !== rulesVersion
  ) {
    return { status: 'incompatible', record: value };
  }
  return { status: 'ok', record: value };
}

export async function deleteGame(store: SaveStore): Promise<void> {
  try {
    await store.remove();
  } catch {
    // sem armazenamento: não há o que apagar
  }
}
