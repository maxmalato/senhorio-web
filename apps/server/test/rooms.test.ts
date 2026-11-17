// Salas do modo de vários aparelhos, no mesmo runtime da produção (workerd).
import { env, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { exports } from 'cloudflare:workers';
import { MESSAGE_LIMIT, TABLE_SEAT, type ServerMessage } from '@senhorio/protocol';
import { describe, expect, it } from 'vitest';
import type { Room } from '../src/room';

const BASE = 'https://senhorio.example';
const BLUE = '#4FC3F7';
const CORAL = '#FF8A65';
const LILAC = '#B39DDB';

async function createRoom(mode: unknown = { type: 'rounds', limit: 20 }): Promise<string> {
  const response = await exports.default.fetch(`${BASE}/api/rooms`, {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
  expect(response.status).toBe(201);
  return ((await response.json()) as { code: string }).code;
}

/** Um aparelho conectado à sala: envia mensagens e espera respostas por tipo. */
async function connect(code: string) {
  const response = await exports.default.fetch(`${BASE}/api/rooms/${code}/ws`, {
    headers: { Upgrade: 'websocket' },
  });
  const ws = response.webSocket;
  if (!ws) throw new Error(`sem WebSocket (${response.status})`);
  ws.accept();
  const inbox: ServerMessage[] = [];
  const waiting: { type: string; resolve: (m: ServerMessage) => void }[] = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data as string) as ServerMessage;
    const i = waiting.findIndex((w) => w.type === message.type);
    if (i >= 0) waiting.splice(i, 1)[0]?.resolve(message);
    else inbox.push(message);
  });
  return {
    ws,
    send: (message: unknown) => ws.send(JSON.stringify(message)),
    next<T extends ServerMessage['type']>(type: T): Promise<Extract<ServerMessage, { type: T }>> {
      const i = inbox.findIndex((m) => m.type === type);
      if (i >= 0)
        return Promise.resolve(inbox.splice(i, 1)[0] as Extract<ServerMessage, { type: T }>);
      return new Promise((resolve) =>
        waiting.push({ type, resolve: resolve as (m: ServerMessage) => void }),
      );
    },
    clear: () => inbox.splice(0),
  };
}

async function join(code: string, name: string, color: string) {
  const device = await connect(code);
  device.send({ type: 'hello', name, color });
  const welcome = await device.next('welcome');
  return { ...device, seat: welcome.seat, token: welcome.token };
}

function stubOf(code: string) {
  return env.ROOMS.get(env.ROOMS.idFromName(code)) as DurableObjectStub<Room>;
}

describe('criar e consultar sala', () => {
  it('cria com código de 6 símbolos sem 0, O, 1 e I', async () => {
    const code = await createRoom();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
    const info = await exports.default.fetch(`${BASE}/api/rooms/${code.toLowerCase()}`);
    expect(await info.json()).toMatchObject({ status: 'lobby', seats: 0, maxSeats: 6 });
  });

  it('recusa modo fora das opções e sala inexistente', async () => {
    const bad = await exports.default.fetch(`${BASE}/api/rooms`, {
      method: 'POST',
      body: '{"mode":{"type":"time","limit":7}}',
    });
    expect(bad.status).toBe(400);
    expect((await exports.default.fetch(`${BASE}/api/rooms/ZZZZZZ`)).status).toBe(404);
    expect((await exports.default.fetch(`${BASE}/api/rooms/abc`)).status).toBe(404);
  });
});

describe('sala de espera', () => {
  it('o primeiro a entrar cria a sala; cor e nome repetidos são recusados', async () => {
    const code = await createRoom();
    const ana = await join(code, 'Ana', BLUE);
    expect(ana.seat).toBe(0);
    expect(ana.token.length).toBeGreaterThan(20);
    const bruno = await join(code, 'Bruno', CORAL);
    expect(bruno.seat).toBe(1);
    const room = await ana.next('room');
    expect(room.room.host).toBe(0);
    // a mensagem nunca leva o token de ninguém
    expect(JSON.stringify(room)).not.toContain(ana.token);

    const copycat = await connect(code);
    copycat.send({ type: 'hello', name: 'Carla', color: BLUE });
    expect((await copycat.next('error')).code).toBe('colorTaken');
    copycat.send({ type: 'hello', name: 'ana', color: LILAC });
    expect((await copycat.next('error')).code).toBe('nameTaken');
  });

  it('só quem criou começa, e com pelo menos 2 jogadores', async () => {
    const code = await createRoom();
    const ana = await join(code, 'Ana', BLUE);
    ana.send({ type: 'start' });
    expect((await ana.next('error')).code).toBe('notEnoughPlayers');
    const bruno = await join(code, 'Bruno', CORAL);
    bruno.send({ type: 'start' });
    expect((await bruno.next('error')).code).toBe('onlyHost');
    ana.send({ type: 'start' });
    const update = await bruno.next('update');
    expect(update.room.status).toBe('playing');
    // o turno começa sozinho: não há "passe o aparelho"
    expect(update.room.game?.phase).toBe('PRE_ROLL');
    expect(update.events.some((e) => e.type === 'OrderDrawn')).toBe(true);

    const late = await connect(code);
    late.send({ type: 'hello', name: 'Carla', color: LILAC });
    expect((await late.next('error')).code).toBe('gameStarted');
  });
});

describe('partida', () => {
  async function startedRoom() {
    const code = await createRoom();
    const ana = await join(code, 'Ana', BLUE);
    const bruno = await join(code, 'Bruno', CORAL);
    ana.send({ type: 'start' });
    const update = await ana.next('update');
    await bruno.next('update');
    const game = update.room.game!;
    const current = game.order[game.turn]!;
    const [mine, other] = current === 0 ? [ana, bruno] : [bruno, ana];
    return { code, ana, bruno, mine, other };
  }

  it('só o jogador da vez age; a ação chega a todos os aparelhos', async () => {
    const { mine, other } = await startedRoom();
    other.clear();
    other.send({ type: 'action', action: { type: 'ROLL_DICE' } });
    expect((await other.next('error')).code).toBe('notYourTurn');
    mine.send({ type: 'action', action: { type: 'ROLL_DICE' } });
    const seen = await other.next('update');
    expect(seen.events.some((e) => e.type === 'DiceRolled')).toBe(true);
    expect(seen.by).toBe(mine.seat);
  });

  it('o aparelho não pode pedir ações do servidor', async () => {
    const { mine } = await startedRoom();
    mine.send({ type: 'action', action: { type: 'REMOVE_PLAYER', player: 1 } });
    expect((await mine.next('error')).code).toBe('badMessage');
  });

  it('queda de conexão pausa a partida; o mesmo aparelho volta pelo token', async () => {
    const { code, mine, other } = await startedRoom();
    mine.clear();
    other.ws.close();
    const paused = await mine.next('room');
    expect(paused.room.seats[other.seat]).toMatchObject({ connected: false });
    mine.send({ type: 'action', action: { type: 'ROLL_DICE' } });
    expect((await mine.next('error')).code).toBe('paused');

    const back = await connect(code);
    back.send({ type: 'hello', token: other.token });
    expect((await back.next('welcome')).seat).toBe(other.seat);
    const stranger = await connect(code);
    stranger.send({ type: 'hello', token: 'token-inventado' });
    expect((await stranger.next('error')).code).toBe('unknownToken');
  });

  it('remover só depois de 3 minutos sem conexão, e só por quem criou a sala', async () => {
    const code = await createRoom();
    const ana = await join(code, 'Ana', BLUE);
    const bruno = await join(code, 'Bruno', CORAL);
    const carla = await join(code, 'Carla', LILAC);
    ana.send({ type: 'start' });
    await ana.next('update');
    carla.ws.close();
    await ana.next('room');
    ana.send({ type: 'remove', seat: 2 });
    expect((await ana.next('error')).code).toBe('tooSoon');
    bruno.send({ type: 'remove', seat: 2 });
    expect((await bruno.next('error')).code).toBe('onlyHost');

    // o relógio da sala anda 3 minutos
    await runInDurableObject(stubOf(code), (room) => {
      room.room!.seats[2]!.disconnectedAt = Date.now() - 3 * 60 * 1000 - 1;
    });
    ana.clear();
    ana.send({ type: 'remove', seat: 2 });
    const update = await ana.next('update');
    expect(update.room.game?.players[2]?.bankrupt).toBe(true);
    expect(update.room.seats[2]?.out).toBe(true);
    expect(update.events.some((e) => e.type === 'WentBankrupt')).toBe(true);
  });

  it('modo tempo: o cronômetro do servidor marca o tempo esgotado', async () => {
    const code = await createRoom({ type: 'time', limit: 30 });
    const ana = await join(code, 'Ana', BLUE);
    await join(code, 'Bruno', CORAL);
    ana.send({ type: 'start' });
    const started = await ana.next('update');
    expect(started.room.timer).toMatchObject({ secondsLeft: 1800, running: true });
    await runInDurableObject(stubOf(code), (room) => {
      room.room!.timer = { secondsLeft: 1, runningSince: Date.now() - 2000 };
    });
    ana.clear();
    expect(await runDurableObjectAlarm(stubOf(code))).toBe(true);
    const update = await ana.next('update');
    expect(update.room.game?.mode.timeUp).toBe(true);
    expect(update.events.some((e) => e.type === 'TimeUp')).toBe(true);
  });
});

describe('mensagens inválidas', () => {
  it('são descartadas com erro, sem derrubar a sala', async () => {
    const code = await createRoom();
    const device = await connect(code);
    device.ws.send('isto não é json');
    expect((await device.next('error')).code).toBe('badMessage');
    device.send({ type: 'start' });
    expect((await device.next('error')).code).toBe('notJoined');
  });

  it('mensagens demais em pouco tempo são descartadas', async () => {
    // direto no Durable Object: a criação pela API tem seu próprio limite por minuto
    const code = 'RAPDZ2';
    await stubOf(code).init(code, { type: 'rounds', limit: 20 });
    const device = await connect(code);
    for (let i = 0; i < MESSAGE_LIMIT.count; i++) device.send({ type: 'start' });
    for (let i = 0; i < MESSAGE_LIMIT.count; i++)
      expect((await device.next('error')).code).toBe('notJoined');
    device.send({ type: 'start' });
    expect((await device.next('error')).code).toBe('tooManyRequests');
  });
});

describe('modo mesa', () => {
  /** Sala criada por uma mesa (direto no Durable Object: a criação pela API tem limite). */
  async function tableRoom(code: string) {
    const created = await stubOf(code).init(code, { type: 'rounds', limit: 20 }, true);
    if (!created?.tableToken) throw new Error('sem token da mesa');
    const table = await connect(code);
    table.send({ type: 'hello', token: created.tableToken });
    const welcome = await table.next('welcome');
    return { table, token: created.tableToken, welcome };
  }

  it('a mesa entra sem lugar de jogador e é quem comanda a sala', async () => {
    const { table, welcome } = await tableRoom('MESA22');
    expect(welcome.seat).toBe(TABLE_SEAT);
    const view = (await table.next('room')).room;
    expect(view.host).toBe(TABLE_SEAT);
    expect(view.table).toEqual({ connected: true });
    expect(view.seats).toEqual([]);

    const ana = await join('MESA22', 'Ana', BLUE);
    const bruno = await join('MESA22', 'Bruno', CORAL);
    ana.send({ type: 'start' });
    expect((await ana.next('error')).code).toBe('onlyHost');
    table.clear();
    table.send({ type: 'start' });
    const update = await table.next('update');
    expect(update.room.status).toBe('playing');
    expect(update.room.game?.players.map((p) => p.name)).toEqual(['Ana', 'Bruno']);
    await bruno.next('update');

    // a mesa não joga
    table.send({ type: 'action', action: { type: 'ROLL_DICE' } });
    expect((await table.next('error')).code).toBe('tableCannotPlay');
  });

  it('se a mesa cai, a partida segue e os jogadores passam a comandar', async () => {
    const { table } = await tableRoom('MESA23');
    const ana = await join('MESA23', 'Ana', BLUE);
    const bruno = await join('MESA23', 'Bruno', CORAL);
    table.ws.close();
    // pula os retratos da sala de antes (entradas da Ana e do Bruno)
    let view = (await ana.next('room')).room;
    while (view.table?.connected !== false) view = (await ana.next('room')).room;
    expect(view.table).toEqual({ connected: false });
    ana.clear();
    ana.send({ type: 'start' });
    const update = await ana.next('update');
    expect(update.room.status).toBe('playing');
    await bruno.next('update');
    // sem pausa: o jogador da vez joga normalmente
    const game = update.room.game!;
    const current = game.order[game.turn]!;
    const mine = current === 0 ? ana : bruno;
    mine.clear();
    mine.send({ type: 'action', action: { type: 'ROLL_DICE' } });
    expect((await mine.next('update')).events.some((e) => e.type === 'DiceRolled')).toBe(true);
  });

  it('a mesa volta pelo mesmo token depois de recarregar', async () => {
    const { table, token } = await tableRoom('MESA24');
    table.ws.close();
    const again = await connect('MESA24');
    again.send({ type: 'hello', token });
    expect((await again.next('welcome')).seat).toBe(TABLE_SEAT);
    expect((await again.next('room')).room.table).toEqual({ connected: true });
  });

  it('só a mesa encerra a sala; todos saem e a sala deixa de existir', async () => {
    const { table } = await tableRoom('MESA25');
    const ana = await join('MESA25', 'Ana', BLUE);
    ana.send({ type: 'close' });
    expect((await ana.next('error')).code).toBe('onlyTable');
    table.send({ type: 'close' });
    expect((await ana.next('error')).code).toBe('roomClosed');
    expect(await stubOf('MESA25').info()).toBeNull();
  });
});
