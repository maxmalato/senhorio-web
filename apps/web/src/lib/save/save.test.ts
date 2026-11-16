import { describe, expect, it } from 'vitest';
import { testGame } from '../game/test-helpers';
import { deleteGame, loadGame, saveGame, SAVE_FORMAT } from './save';
import { createMemoryStore, type SaveStore } from './store';

describe('salvamento da partida', () => {
  it('CT-42: salvar e ler devolve o mesmo estado e o tempo restante', async () => {
    const { state } = testGame();
    const store = createMemoryStore();
    expect(await saveGame(store, state, 1234, 1_700_000_000_000)).toBe(true);
    const loaded = await loadGame(store, state.rulesVersion);
    expect(loaded.status).toBe('ok');
    if (loaded.status !== 'ok') return;
    expect(loaded.record.state).toEqual(state);
    expect(loaded.record.secondsLeft).toBe(1234);
    expect(loaded.record.savedAt).toBe(1_700_000_000_000);
  });

  it('CT-43: partida de outra versão das regras é recusada', async () => {
    const { state } = testGame();
    const store = createMemoryStore();
    await saveGame(store, { ...state, rulesVersion: state.rulesVersion + 1 }, null);
    const loaded = await loadGame(store, state.rulesVersion);
    expect(loaded.status).toBe('incompatible');
  });

  it('registro estranho não é aberto', async () => {
    const store = createMemoryStore({ format: SAVE_FORMAT, qualquer: 'coisa' });
    expect((await loadGame(store, 1)).status).toBe('incompatible');
  });

  it('sem partida salva e depois de apagar: nada para continuar', async () => {
    const { state } = testGame();
    const store = createMemoryStore();
    expect((await loadGame(store, 1)).status).toBe('none');
    await saveGame(store, state, null);
    await deleteGame(store);
    expect((await loadGame(store, 1)).status).toBe('none');
  });

  it('falha na gravação devolve false, sem quebrar o jogo', async () => {
    const broken: SaveStore = {
      get: async () => undefined,
      put: async () => {
        throw new Error('cota cheia');
      },
      remove: async () => undefined,
    };
    const { state } = testGame();
    expect(await saveGame(broken, state, null)).toBe(false);
  });
});
