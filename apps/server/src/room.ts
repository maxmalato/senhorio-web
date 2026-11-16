import { DurableObject } from 'cloudflare:workers';
import {
  createContext,
  createRandomizer,
  loadDefaultRules,
  newGame,
  transition,
  type Action,
  type EngineContext,
  type GameEvent,
  type GameState,
} from '@senhorio/engine';
import {
  actorsOf,
  MESSAGE_LIMIT,
  PAWN_COLORS,
  REMOVE_AFTER_MS,
  ROOM_TTL_MS,
  parseClientMessage,
  type ClientMessage,
  type ModeConfig,
  type RoomStatus,
  type RoomView,
  type ServerMessage,
} from '@senhorio/protocol';
import type { Env } from './env';

/**
 * Uma sala do modo de vários aparelhos (docs/07, "Salas"). Guarda os lugares, a partida e o
 * cronômetro; roda o mesmo motor do navegador e sorteia os dados aqui, sem trapaça possível
 * pelo aparelho. Cada ação é validada contra quem enviou. WebSocket com hibernação: sala
 * ociosa não consome tempo de execução, e o estado vive no armazenamento do Durable Object.
 */

const RULES = loadDefaultRules();
if (!RULES.ok) throw new Error(`regras inválidas: ${RULES.errors[0] ?? ''}`);
const PARAMS = RULES.rules.parameters;

interface Seat {
  name: string;
  color: string;
  /** SHA-256 do token do aparelho; o token em si nunca é guardado. */
  tokenHash: string;
  connected: boolean;
  disconnectedAt: number | null;
}

export interface RoomRecord {
  code: string;
  status: RoomStatus;
  host: number;
  seats: Seat[];
  mode: ModeConfig;
  pausedBy: number | null;
  game: GameState | null;
  /** Modo tempo: segundos restantes e desde quando está correndo (null = parado). */
  timer: { secondsLeft: number; runningSince: number | null } | null;
  createdAt: number;
  lastActivity: number;
}

interface Attachment {
  seat: number;
}

export interface RoomInfo {
  status: RoomStatus;
  seats: number;
  maxSeats: number;
  takenColors: string[];
  mode: ModeConfig;
}

function cryptoRandom(): () => number {
  return () => (crypto.getRandomValues(new Uint32Array(1))[0] ?? 0) / 2 ** 32;
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function hashToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export class Room extends DurableObject<Env> {
  room: RoomRecord | null = null;
  private readonly engine: EngineContext;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.engine = createContext(RULES, createRandomizer(cryptoRandom()));
    void ctx.blockConcurrencyWhile(async () => {
      this.room = (await ctx.storage.get<RoomRecord>('room')) ?? null;
    });
  }

  // ---------- chamadas do Worker ----------

  /** Cria a sala; false se o código já está em uso. */
  async init(code: string, mode: ModeConfig): Promise<boolean> {
    if (this.room) return false;
    const now = Date.now();
    this.room = {
      code,
      status: 'lobby',
      host: 0,
      seats: [],
      mode,
      pausedBy: null,
      game: null,
      timer: null,
      createdAt: now,
      lastActivity: now,
    };
    await this.persist();
    return true;
  }

  /** Resumo para a tela "Entrar com código"; null se a sala não existe. */
  async info(): Promise<RoomInfo | null> {
    const room = this.room;
    if (!room) return null;
    return {
      status: room.status,
      seats: room.seats.length,
      maxSeats: PARAMS.maxPlayers,
      takenColors: room.seats.map((s) => s.color),
      mode: room.mode,
    };
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket')
      return new Response('esperado WebSocket', { status: 426 });
    if (!this.room) return Response.json({ error: 'notFound' }, { status: 404 });
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ seat: -1 } satisfies Attachment);
    return new Response(null, { status: 101, webSocket: client });
  }

  // ---------- WebSocket ----------

  override async webSocketMessage(ws: WebSocket, data: string | ArrayBuffer): Promise<void> {
    if (!this.room) {
      ws.close(1000, 'sala encerrada');
      return;
    }
    if (!this.#withinLimit(ws)) {
      this.send(ws, { type: 'error', code: 'tooManyRequests' });
      return;
    }
    const message = typeof data === 'string' ? parseClientMessage(data) : null;
    if (!message) {
      this.send(ws, { type: 'error', code: 'badMessage' });
      return;
    }
    this.room.lastActivity = Date.now();
    await this.handle(ws, message);
  }

  /** Contagem de mensagens por aparelho (só em memória: zera se a sala hibernar). */
  #messageCount = new WeakMap<WebSocket, { start: number; count: number }>();

  #withinLimit(ws: WebSocket, now = Date.now()): boolean {
    const entry = this.#messageCount.get(ws);
    if (!entry || now - entry.start >= MESSAGE_LIMIT.windowMs) {
      this.#messageCount.set(ws, { start: now, count: 1 });
      return true;
    }
    entry.count++;
    return entry.count <= MESSAGE_LIMIT.count;
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    await this.disconnected(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.disconnected(ws);
  }

  override async alarm(): Promise<void> {
    const room = this.room;
    if (!room) return;
    const now = Date.now();
    // sala esquecida: apaga tudo (docs/01)
    if (now >= room.lastActivity + ROOM_TTL_MS) {
      for (const ws of this.ctx.getWebSockets()) ws.close(1000, 'sala expirada');
      await this.ctx.storage.deleteAll();
      this.room = null;
      return;
    }
    const events = this.syncTimer(now);
    await this.persist();
    if (events.length) this.broadcastUpdate(events, -1);
  }

  // ---------- mensagens ----------

  private async handle(ws: WebSocket, message: ClientMessage): Promise<void> {
    const seat = this.seatOf(ws);
    if (message.type === 'hello') {
      await this.hello(ws, seat, message);
      return;
    }
    if (seat < 0) {
      this.send(ws, { type: 'error', code: 'notJoined' });
      return;
    }
    switch (message.type) {
      case 'start':
        return this.start(ws, seat);
      case 'action':
        return this.action(ws, seat, message.action);
      case 'pause':
        return this.pause(ws, seat, message.paused);
      case 'remove':
        return this.remove(ws, seat, message.seat);
      case 'again':
        return this.again(ws, seat);
      case 'leave':
        return this.leave(ws, seat);
    }
  }

  private async hello(
    ws: WebSocket,
    current: number,
    message: Extract<ClientMessage, { type: 'hello' }>,
  ): Promise<void> {
    const room = this.room as RoomRecord;
    if (current >= 0) return; // já está na sala
    const now = Date.now();

    // reconexão: o token prova que é o mesmo aparelho
    if (message.token) {
      const hash = await hashToken(message.token);
      const seat = room.seats.findIndex((s) => s.tokenHash === hash);
      if (seat < 0) {
        this.send(ws, { type: 'error', code: 'unknownToken' });
        return;
      }
      const record = room.seats[seat] as Seat;
      record.connected = true;
      record.disconnectedAt = null;
      ws.serializeAttachment({ seat } satisfies Attachment);
      this.send(ws, { type: 'welcome', seat, token: message.token });
      this.syncTimer(now);
      await this.persist();
      this.broadcastRoom();
      return;
    }

    // jogador novo: só antes de a partida começar (docs/07)
    if (room.status !== 'lobby') return this.refuse(ws, 'gameStarted');
    if (room.seats.length >= PARAMS.maxPlayers) return this.refuse(ws, 'roomFull');
    const name = (message.name ?? '').trim();
    if (name.length === 0 || name.length > PARAMS.maxNameLength)
      return this.refuse(ws, 'invalidName');
    const color = message.color ?? '';
    if (!PAWN_COLORS.includes(color)) return this.refuse(ws, 'invalidColor');
    if (room.seats.some((s) => s.color === color)) return this.refuse(ws, 'colorTaken');
    if (room.seats.some((s) => s.name.toLowerCase() === name.toLowerCase()))
      return this.refuse(ws, 'nameTaken');

    const token = newToken();
    room.seats.push({
      name,
      color,
      tokenHash: await hashToken(token),
      connected: true,
      disconnectedAt: null,
    });
    const seat = room.seats.length - 1;
    if (room.seats.length === 1) room.host = 0;
    ws.serializeAttachment({ seat } satisfies Attachment);
    this.send(ws, { type: 'welcome', seat, token });
    await this.persist();
    this.broadcastRoom();
  }

  private async start(ws: WebSocket, seat: number): Promise<void> {
    const room = this.room as RoomRecord;
    if (room.status !== 'lobby') return this.refuse(ws, 'gameStarted');
    if (seat !== room.host) return this.refuse(ws, 'onlyHost');
    if (room.seats.length < PARAMS.minPlayers) return this.refuse(ws, 'notEnoughPlayers');
    if (room.seats.some((s) => !s.connected)) return this.refuse(ws, 'someoneDisconnected');

    const created = newGame(
      { players: room.seats.map((s) => ({ name: s.name, color: s.color })), mode: room.mode },
      this.engine,
    );
    if (!created.ok) return this.refuse(ws, 'refused', created.reason);
    const events: GameEvent[] = [...created.events];
    room.game = this.autoStartTurn(created.state, events);
    room.status = 'playing';
    room.pausedBy = null;
    room.timer =
      room.mode.type === 'time' && room.mode.limit
        ? { secondsLeft: room.mode.limit * 60, runningSince: null }
        : null;
    this.syncTimer(Date.now());
    await this.persist();
    this.broadcastUpdate(events, seat);
  }

  private async action(ws: WebSocket, seat: number, action: Action): Promise<void> {
    const room = this.room as RoomRecord;
    const game = room.game;
    if (room.status !== 'playing' || !game) return this.refuse(ws, 'notPlaying');
    if (this.isPaused()) return this.refuse(ws, 'paused');
    if (!actorsOf(game).includes(seat)) return this.refuse(ws, 'notYourTurn');
    await this.apply(action, seat, ws);
  }

  /** Aplica uma ação no motor e avisa todos os aparelhos. */
  private async apply(action: Action, by: number, ws?: WebSocket): Promise<void> {
    const room = this.room as RoomRecord;
    const result = transition(room.game as GameState, action, this.engine);
    if (!result.ok) {
      if (ws) this.refuse(ws, 'refused', result.reason);
      return;
    }
    const events = [...result.events];
    room.game = this.autoStartTurn(result.state, events);
    if (room.game.phase === 'GAME_OVER') room.status = 'over';
    events.push(...this.syncTimer(Date.now()));
    await this.persist();
    this.broadcastUpdate(events, by);
  }

  /** Com um aparelho por jogador não há "passe o aparelho": o turno começa sozinho. */
  private autoStartTurn(state: GameState, events: GameEvent[]): GameState {
    let current = state;
    while (current.phase === 'TURN_START') {
      const result = transition(current, { type: 'START_TURN' }, this.engine);
      if (!result.ok) break;
      events.push(...result.events);
      current = result.state;
    }
    return current;
  }

  private async pause(ws: WebSocket, seat: number, paused: boolean): Promise<void> {
    const room = this.room as RoomRecord;
    if (room.status !== 'playing') return this.refuse(ws, 'notPlaying');
    room.pausedBy = paused ? seat : null;
    const events = this.syncTimer(Date.now());
    await this.persist();
    if (events.length) this.broadcastUpdate(events, -1);
    else this.broadcastRoom();
  }

  /** Quem pode remover: quem criou a sala; se essa pessoa também caiu, qualquer conectado. */
  private canRemove(seat: number): boolean {
    const room = this.room as RoomRecord;
    const host = room.seats[room.host];
    const hostOut = room.game?.players[room.host]?.bankrupt ?? false;
    if (seat === room.host) return true;
    return !host?.connected || hostOut;
  }

  private async remove(ws: WebSocket, seat: number, target: number): Promise<void> {
    const room = this.room as RoomRecord;
    const victim = room.seats[target];
    if (!victim || target === seat) return this.refuse(ws, 'invalidTarget');
    if (!this.canRemove(seat)) return this.refuse(ws, 'onlyHost');
    if (victim.connected) return this.refuse(ws, 'stillConnected');

    if (room.status === 'lobby') {
      // antes de começar, sai na hora (os lugares seguintes andam uma posição)
      this.dropSeat(target);
      await this.persist();
      this.broadcastRoom();
      return;
    }
    if (room.status !== 'playing') return this.refuse(ws, 'notPlaying');
    if (Date.now() - (victim.disconnectedAt ?? Date.now()) < REMOVE_AFTER_MS)
      return this.refuse(ws, 'tooSoon');
    await this.apply({ type: 'REMOVE_PLAYER', player: target }, seat, ws);
    this.moveHostIfOut();
    await this.persist();
    this.broadcastRoom();
  }

  private async again(ws: WebSocket, seat: number): Promise<void> {
    const room = this.room as RoomRecord;
    if (room.status !== 'over') return this.refuse(ws, 'notOver');
    if (!this.canRemove(seat)) return this.refuse(ws, 'onlyHost');
    // nova partida com a mesma sala; quem não está conectado sai da lista
    for (let i = room.seats.length - 1; i >= 0; i--)
      if (!room.seats[i]?.connected) this.dropSeat(i);
    room.status = 'lobby';
    room.game = null;
    room.timer = null;
    room.pausedBy = null;
    await this.persist();
    this.broadcastRoom();
  }

  private async leave(ws: WebSocket, seat: number): Promise<void> {
    const room = this.room as RoomRecord;
    if (room.status === 'lobby') {
      this.dropSeat(seat);
      ws.serializeAttachment({ seat: -1 } satisfies Attachment);
      await this.persist();
      this.broadcastRoom();
    }
    ws.close(1000, 'saiu da sala');
  }

  private async disconnected(ws: WebSocket): Promise<void> {
    const room = this.room;
    const seat = this.seatOf(ws);
    if (!room || seat < 0) return;
    // outro aparelho do mesmo jogador ainda conectado (duas abas): continua conectado
    const others = this.ctx
      .getWebSockets()
      .filter((other) => other !== ws && this.seatOf(other) === seat);
    if (others.length > 0) return;
    const record = room.seats[seat];
    if (!record) return;
    record.connected = false;
    record.disconnectedAt = Date.now();
    const events = this.syncTimer(Date.now());
    await this.persist();
    if (events.length) this.broadcastUpdate(events, -1);
    else this.broadcastRoom();
  }

  // ---------- auxiliares ----------

  /** Partida parada: alguém pausou ou um jogador ainda na partida perdeu a conexão. */
  private isPaused(): boolean {
    const room = this.room as RoomRecord;
    if (room.pausedBy !== null) return true;
    return room.seats.some((s, i) => !s.connected && !(room.game?.players[i]?.bankrupt ?? false));
  }

  /**
   * Atualiza o cronômetro do modo tempo (RN-113): para com a pausa ou com alguém
   * desconectado, volta quando a partida segue. Ao zerar, marca TIME_UP no motor.
   */
  private syncTimer(now: number): GameEvent[] {
    const room = this.room as RoomRecord;
    const timer = room.timer;
    const game = room.game;
    if (!timer || !game) return [];
    if (timer.runningSince !== null) {
      timer.secondsLeft = Math.max(0, timer.secondsLeft - (now - timer.runningSince) / 1000);
    }
    const events: GameEvent[] = [];
    if (timer.secondsLeft <= 0 && !game.mode.timeUp && game.phase !== 'GAME_OVER') {
      const result = transition(game, { type: 'TIME_UP' }, this.engine);
      if (result.ok) {
        room.game = result.state;
        events.push(...result.events);
      }
    }
    const running = room.status === 'playing' && !this.isPaused() && timer.secondsLeft > 0;
    timer.runningSince = running ? now : null;
    return events;
  }

  private dropSeat(index: number): void {
    const room = this.room as RoomRecord;
    room.seats.splice(index, 1);
    if (room.host === index) room.host = 0;
    else if (room.host > index) room.host--;
    for (const ws of this.ctx.getWebSockets()) {
      const seat = this.seatOf(ws);
      if (seat === index) {
        ws.serializeAttachment({ seat: -1 } satisfies Attachment);
        this.send(ws, { type: 'error', code: 'removed' });
        ws.close(1000, 'removido da sala');
      } else if (seat > index) {
        ws.serializeAttachment({ seat: seat - 1 } satisfies Attachment);
        this.send(ws, { type: 'welcome', seat: seat - 1, token: '' });
      }
    }
  }

  private moveHostIfOut(): void {
    const room = this.room as RoomRecord;
    const out = (i: number) => room.game?.players[i]?.bankrupt ?? false;
    if (!out(room.host)) return;
    const next = room.seats.findIndex((s, i) => s.connected && !out(i));
    if (next >= 0) room.host = next;
  }

  private seatOf(ws: WebSocket): number {
    const attachment = ws.deserializeAttachment() as Attachment | null;
    return attachment?.seat ?? -1;
  }

  view(now = Date.now()): RoomView {
    const room = this.room as RoomRecord;
    const timer = room.timer;
    let secondsLeft = timer?.secondsLeft ?? 0;
    if (timer?.runningSince != null)
      secondsLeft = Math.max(0, secondsLeft - (now - timer.runningSince) / 1000);
    return {
      code: room.code,
      status: room.status,
      host: room.host,
      seats: room.seats.map((s, i) => ({
        name: s.name,
        color: s.color,
        connected: s.connected,
        disconnectedAt: s.disconnectedAt,
        out: room.game?.players[i]?.bankrupt ?? false,
      })),
      mode: room.mode,
      pausedBy: room.pausedBy,
      timer: timer
        ? { secondsLeft: Math.ceil(secondsLeft), running: timer.runningSince !== null }
        : null,
      now,
      game: room.game,
    };
  }

  private send(ws: WebSocket, message: ServerMessage): void {
    try {
      ws.send(JSON.stringify(message));
    } catch {
      // aparelho já desconectado: a próxima conexão recebe o estado completo
    }
  }

  private refuse(ws: WebSocket, code: string, detail?: unknown): void {
    this.send(ws, { type: 'error', code, ...(detail !== undefined ? { detail } : {}) });
  }

  private broadcastRoom(): void {
    const message: ServerMessage = { type: 'room', room: this.view() };
    for (const ws of this.ctx.getWebSockets()) if (this.seatOf(ws) >= 0) this.send(ws, message);
  }

  private broadcastUpdate(events: GameEvent[], by: number): void {
    const message: ServerMessage = { type: 'update', room: this.view(), events, by };
    for (const ws of this.ctx.getWebSockets()) if (this.seatOf(ws) >= 0) this.send(ws, message);
  }

  /** Grava a sala e agenda o próximo alarme: fim do tempo ou expiração. */
  private async persist(): Promise<void> {
    const room = this.room as RoomRecord;
    await this.ctx.storage.put('room', room);
    let next = room.lastActivity + ROOM_TTL_MS;
    if (room.timer?.runningSince != null) {
      next = Math.min(next, room.timer.runningSince + room.timer.secondsLeft * 1000);
    }
    await this.ctx.storage.setAlarm(next);
  }
}
