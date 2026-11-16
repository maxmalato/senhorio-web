// Onde a partida fica guardada: IndexedDB do navegador, só neste aparelho (docs/07).
// Nada sai do aparelho; a única informação pessoal é o apelido dos jogadores (LGPD).

export interface SaveStore {
  get(): Promise<unknown>;
  put(value: unknown): Promise<void>;
  remove(): Promise<void>;
}

const DB_NAME = 'senhorio';
const STORE = 'saves';
const KEY = 'current';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function run<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const request = action(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(request.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
        tx.onabort = () => {
          db.close();
          reject(tx.error);
        };
      }),
  );
}

/** Armazenamento do jogo. Sem IndexedDB (alguns modos privados), toda operação falha. */
export function createIndexedDbStore(): SaveStore {
  return {
    get: () => run('readonly', (s) => s.get(KEY)),
    put: (value) => run('readwrite', (s) => s.put(value, KEY)).then(() => undefined),
    remove: () => run('readwrite', (s) => s.delete(KEY)).then(() => undefined),
  };
}

/** Armazenamento em memória, para testes. */
export function createMemoryStore(initial?: unknown): SaveStore {
  let value: unknown = initial === undefined ? undefined : structuredClone(initial);
  return {
    get: async () => (value === undefined ? undefined : structuredClone(value)),
    put: async (next) => {
      value = structuredClone(next);
    },
    remove: async () => {
      value = undefined;
    },
  };
}
