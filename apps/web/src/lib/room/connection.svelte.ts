// Conexão de um aparelho com a sala (WebSocket). Reconecta sozinha quando a internet cai,
// usando o token guardado no navegador para voltar ao mesmo lugar (docs/07, "Salas").

import type { Action, GameEvent } from '@senhorio/engine';
import {
  TABLE_SEAT,
  type ClientMessage,
  type RoomView,
  type ServerMessage,
} from '@senhorio/protocol';

const STORAGE_KEY = 'senhorio:room';

export interface SavedSeat {
  code: string;
  token: string;
  /** Este aparelho é a mesa da sala (modo mesa). */
  table?: boolean;
}

/** Lugar guardado neste navegador (para "Voltar para a sala"). Só código e token. */
export function savedSeat(): SavedSeat | null {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as SavedSeat | null;
    return value && typeof value.code === 'string' && typeof value.token === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}

function storeSeat(seat: SavedSeat | null): void {
  try {
    if (seat) localStorage.setItem(STORAGE_KEY, JSON.stringify(seat));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // sem armazenamento: a reconexão vale só enquanto a página estiver aberta
  }
}

export function forgetSeat(): void {
  storeSeat(null);
}

export interface RoomListener {
  onRoom?: (room: RoomView) => void;
  onUpdate?: (room: RoomView, events: GameEvent[], by: number) => void;
  onError?: (code: string, detail?: unknown) => void;
}

export class RoomConnection {
  readonly code: string;
  status: 'connecting' | 'open' | 'retrying' | 'closed' = $state('connecting');
  seat: number | null = $state(null);
  room: RoomView | null = $state.raw(null);
  /** Diferença entre o relógio do servidor e o deste aparelho (ms). */
  clockOffset = $state(0);
  error: string | null = $state(null);

  #ws: WebSocket | null = null;
  #token: string | null;
  #hello: { name: string; color: string } | null;
  #listener: RoomListener = {};
  #retries = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #closing = false;

  constructor(code: string, join: { token?: string; name?: string; color?: string }) {
    this.code = code;
    this.#token = join.token ?? null;
    this.#hello = join.name && join.color ? { name: join.name, color: join.color } : null;
    this.#open();
  }

  listen(listener: RoomListener): void {
    this.#listener = listener;
  }

  send(message: ClientMessage): void {
    if (this.#ws?.readyState === WebSocket.OPEN) this.#ws.send(JSON.stringify(message));
  }

  action(action: Action): void {
    this.send({ type: 'action', action });
  }

  /** Sai da sala de vez (na sala de espera, libera o lugar). */
  leave(): void {
    this.send({ type: 'leave' });
    this.close(true);
  }

  close(forget = false): void {
    this.#closing = true;
    if (this.#timer) clearTimeout(this.#timer);
    this.#ws?.close();
    this.status = 'closed';
    if (forget) forgetSeat();
  }

  #open(): void {
    const scheme = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${scheme}://${location.host}/api/rooms/${this.code}/ws`);
    this.#ws = ws;
    ws.addEventListener('open', () => {
      const hello: ClientMessage = this.#token
        ? { type: 'hello', token: this.#token }
        : { type: 'hello', ...(this.#hello ?? {}) };
      ws.send(JSON.stringify(hello));
    });
    ws.addEventListener('message', (event) => this.#message(String(event.data)));
    ws.addEventListener('close', () => this.#lost());
    ws.addEventListener('error', () => ws.close());
  }

  #lost(): void {
    if (this.#closing) return;
    // sem lugar ainda (entrada recusada): não insiste
    if (!this.#token) {
      this.status = 'closed';
      return;
    }
    this.status = 'retrying';
    const delay = Math.min(10_000, 1000 * 2 ** this.#retries++);
    this.#timer = setTimeout(() => this.#open(), delay);
  }

  #message(raw: string): void {
    let message: ServerMessage;
    try {
      message = JSON.parse(raw) as ServerMessage;
    } catch {
      return;
    }
    switch (message.type) {
      case 'welcome':
        this.seat = message.seat;
        // o servidor manda o token vazio quando só muda o número do lugar
        if (message.token) this.#token = message.token;
        if (this.#token)
          storeSeat({
            code: this.code,
            token: this.#token,
            ...(message.seat === TABLE_SEAT ? { table: true } : {}),
          });
        this.status = 'open';
        this.#retries = 0;
        this.error = null;
        break;
      case 'room':
        this.#setRoom(message.room);
        this.#listener.onRoom?.(message.room);
        break;
      case 'update':
        this.#setRoom(message.room);
        this.#listener.onUpdate?.(message.room, message.events, message.by);
        break;
      case 'error':
        this.error = message.code;
        // lugar que não existe mais (sala expirada, removido, encerrada pela mesa): esquece e para
        if (
          message.code === 'unknownToken' ||
          message.code === 'removed' ||
          message.code === 'roomClosed'
        ) {
          this.close(true);
        }
        this.#listener.onError?.(message.code, message.detail);
        break;
    }
  }

  /** Este aparelho é a mesa da sala. */
  get isTable(): boolean {
    return this.seat === TABLE_SEAT;
  }

  #setRoom(room: RoomView): void {
    this.room = room;
    this.clockOffset = room.now - Date.now();
  }
}

/** Mensagem do catálogo (W-xx) para cada recusa da sala. */
export const ROOM_ERROR_TEXT: Record<string, string> = {
  notFound: 'W-50',
  gameStarted: 'W-51',
  roomFull: 'W-52',
  colorTaken: 'W-53',
  nameTaken: 'W-54',
  invalidName: 'W-55',
  invalidColor: 'W-53',
  tooManyRequests: 'W-57',
  removed: 'W-58',
  unknownToken: 'W-58',
  roomClosed: 'W-72',
};
