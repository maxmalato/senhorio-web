// Protocolo entre o navegador e a sala (modo de vários aparelhos, docs/07 "Salas").
// Mesmos tipos e validações dos dois lados. Mensagens são JSON por WebSocket; o servidor
// nunca confia no que chega: tudo passa por parseClientMessage antes de ser usado.

import type { Action, GameEvent, GameState, ModeType } from '@senhorio/engine';

/** 32 símbolos sem 0/O e 1/I, para ninguém confundir ao ditar o código. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const ROOM_CODE_LENGTH = 6;
/** Depois de quanto tempo sem conexão um jogador pode ser removido (docs/01). */
export const REMOVE_AFTER_MS = 3 * 60 * 1000;
/** Sala apagada depois de tanto tempo sem atividade (docs/01). */
export const ROOM_TTL_MS = 12 * 60 * 60 * 1000;
/** Mensagem maior que isso é descartada. */
export const MAX_MESSAGE_BYTES = 4096;
/**
 * Mensagens por aparelho numa janela de tempo. Uma pessoa jogando manda poucas por segundo;
 * acima disso a mensagem é descartada com o erro tooManyRequests.
 */
export const MESSAGE_LIMIT = { count: 40, windowMs: 10_000 };
/**
 * Lugar da mesa (modo mesa): uma TV, notebook ou tablet que mostra a partida sem jogar.
 * Nas mensagens, `seat: TABLE_SEAT` é a mesa; numa sala com mesa, `host` também é a mesa.
 */
export const TABLE_SEAT = -2;
/** Cores dos peões (docs/06 do Roku), sempre com a inicial do nome. */
export const PAWN_COLORS = ['#4FC3F7', '#FF8A65', '#B39DDB', '#81C784', '#F48FB1', '#4DB6AC'];

/** Código em maiúsculas e sem espaços, traços ou pontos; null se não for um código válido. */
export function normalizeCode(input: string): string | null {
  const code = input.toUpperCase().replace(/[\s.·-]/g, '');
  if (code.length !== ROOM_CODE_LENGTH) return null;
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return null;
  return code;
}

/** "K7P4QX" → "K7P·4QX", para ler em voz alta. */
export function formatCode(code: string): string {
  return `${code.slice(0, 3)}·${code.slice(3)}`;
}

export interface ModeConfig {
  type: ModeType;
  limit: number | null;
}

export interface SeatView {
  name: string;
  color: string;
  connected: boolean;
  /** Momento (relógio do servidor) em que perdeu a conexão; null se conectado. */
  disconnectedAt: number | null;
  /** Saiu da partida (falência, abandono ou removido). */
  out: boolean;
}

export type RoomStatus = 'lobby' | 'playing' | 'over';

/** O que todos os aparelhos da sala veem. Nunca inclui os tokens. */
export interface RoomView {
  code: string;
  status: RoomStatus;
  /** Lugar de quem criou a sala, ou TABLE_SEAT quando a mesa criou. */
  host: number;
  /** Modo mesa: a mesa está conectada? (null numa sala sem mesa) */
  table: { connected: boolean } | null;
  seats: SeatView[];
  mode: ModeConfig;
  /** Quem pausou pelo menu (null se ninguém). */
  pausedBy: number | null;
  /** Modo tempo: segundos restantes e se o cronômetro está correndo agora. */
  timer: { secondsLeft: number; running: boolean } | null;
  /** Relógio do servidor no momento da mensagem (para contar os 3 minutos). */
  now: number;
  game: GameState | null;
}

export type ClientMessage =
  | { type: 'hello'; token?: string; name?: string; color?: string }
  | { type: 'start' }
  | { type: 'action'; action: Action }
  | { type: 'pause'; paused: boolean }
  | { type: 'remove'; seat: number }
  | { type: 'again' }
  | { type: 'leave' }
  /** Modo mesa: a mesa encerra a sala para todos. */
  | { type: 'close' };

export type ServerMessage =
  | { type: 'welcome'; seat: number; token: string }
  | { type: 'room'; room: RoomView }
  | { type: 'update'; room: RoomView; events: GameEvent[]; by: number }
  | { type: 'error'; code: string; detail?: unknown };

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const shortText = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length <= max;

const ACTION_TYPES = new Set([
  'ROLL_DICE',
  'PAY_BAIL',
  'USE_JAIL_CARD',
  'BUY',
  'DECLINE_PURCHASE',
  'CONFIRM',
  'END_TURN',
  'BUILD',
  'SELL_HOUSE',
  'MORTGAGE',
  'REDEEM',
  'PROPOSE_TRADE',
  'RESPOND_TRADE',
  'DECLARE_BANKRUPTCY',
  'QUIT',
]);

/**
 * Ação vinda de um aparelho. Só as ações que um jogador pode pedir: começar o turno, tempo
 * esgotado e remover jogador são decididos pelo servidor. O motor ainda valida a regra.
 */
function parseAction(v: unknown): Action | null {
  if (!isObj(v) || typeof v.type !== 'string' || !ACTION_TYPES.has(v.type)) return null;
  const int = (x: unknown) => typeof x === 'number' && Number.isInteger(x);
  switch (v.type) {
    case 'BUILD':
    case 'SELL_HOUSE':
    case 'MORTGAGE':
    case 'REDEEM':
      return int(v.position) ? ({ type: v.type, position: v.position } as Action) : null;
    case 'PROPOSE_TRADE':
      if (!int(v.position) || !int(v.amount) || !int(v.otherPlayer)) return null;
      if (v.direction !== 'buy' && v.direction !== 'sell') return null;
      return {
        type: 'PROPOSE_TRADE',
        direction: v.direction,
        position: v.position as number,
        amount: v.amount as number,
        otherPlayer: v.otherPlayer as number,
      };
    case 'RESPOND_TRADE':
      return typeof v.accept === 'boolean' ? { type: 'RESPOND_TRADE', accept: v.accept } : null;
    default:
      return { type: v.type } as Action;
  }
}

/** Valida uma mensagem recebida; null se for inválida (é descartada). */
export function parseClientMessage(raw: string): ClientMessage | null {
  if (raw.length > MAX_MESSAGE_BYTES) return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isObj(v)) return null;
  switch (v.type) {
    case 'hello': {
      if (v.token !== undefined && !shortText(v.token, 128)) return null;
      if (v.name !== undefined && !shortText(v.name, 64)) return null;
      if (v.color !== undefined && !shortText(v.color, 16)) return null;
      return {
        type: 'hello',
        ...(v.token !== undefined ? { token: v.token as string } : {}),
        ...(v.name !== undefined ? { name: v.name as string } : {}),
        ...(v.color !== undefined ? { color: v.color as string } : {}),
      };
    }
    case 'start':
    case 'again':
    case 'leave':
    case 'close':
      return { type: v.type };
    case 'action': {
      const action = parseAction(v.action);
      return action ? { type: 'action', action } : null;
    }
    case 'pause':
      return typeof v.paused === 'boolean' ? { type: 'pause', paused: v.paused } : null;
    case 'remove':
      return typeof v.seat === 'number' && Number.isInteger(v.seat)
        ? { type: 'remove', seat: v.seat }
        : null;
    default:
      return null;
  }
}

/** Valida a configuração de modo pedida ao criar a sala. */
export function parseModeConfig(
  v: unknown,
  options: { time: number[]; rounds: number[] },
): ModeConfig | null {
  if (!isObj(v)) return null;
  if (v.type === 'classic') return { type: 'classic', limit: null };
  if (v.type === 'time' && typeof v.limit === 'number' && options.time.includes(v.limit)) {
    return { type: 'time', limit: v.limit };
  }
  if (v.type === 'rounds' && typeof v.limit === 'number' && options.rounds.includes(v.limit)) {
    return { type: 'rounds', limit: v.limit };
  }
  return null;
}

/**
 * Quem pode agir agora (o servidor recusa ação de qualquer outro aparelho): a outra parte da
 * venda simples, o devedor que levanta dinheiro ou o jogador da vez. O OK da falência pode
 * vir de qualquer aparelho, para a partida não travar.
 */
export function actorsOf(state: GameState): number[] {
  if (state.phase === 'GAME_OVER') return [];
  if (state.pending?.type === 'trade') return [state.pending.other];
  if (state.phase === 'RAISE_MONEY' && state.pending?.type === 'collection' && state.pending.debt) {
    return [state.pending.debt.debtor];
  }
  if (state.phase === 'BANKRUPTCY') return state.players.map((_, i) => i);
  return [state.order[state.turn] ?? -1];
}
