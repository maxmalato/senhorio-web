import { describe, expect, it } from 'vitest';
import { formatCode, normalizeCode, parseClientMessage, parseModeConfig } from '../src/index';

describe('código da sala', () => {
  it('aceita minúsculas, espaços e o ponto do meio; recusa 0, O, 1 e I', () => {
    expect(normalizeCode('k7p·4qx')).toBe('K7P4QX');
    expect(normalizeCode('K7P 4QX')).toBe('K7P4QX');
    expect(normalizeCode('K7P4Q0')).toBeNull();
    expect(normalizeCode('K7P4QO')).toBeNull();
    expect(normalizeCode('K7P4Q')).toBeNull();
    expect(formatCode('K7P4QX')).toBe('K7P·4QX');
  });
});

describe('mensagens do navegador', () => {
  it('aceita mensagens bem formadas', () => {
    expect(parseClientMessage('{"type":"hello","name":"Ana","color":"#4FC3F7"}')).toEqual({
      type: 'hello',
      name: 'Ana',
      color: '#4FC3F7',
    });
    expect(parseClientMessage('{"type":"action","action":{"type":"BUILD","position":1}}')).toEqual({
      type: 'action',
      action: { type: 'BUILD', position: 1 },
    });
    expect(parseClientMessage('{"type":"remove","seat":2}')).toEqual({ type: 'remove', seat: 2 });
  });

  it('descarta JSON quebrado, tipos desconhecidos e campos errados', () => {
    expect(parseClientMessage('{oops')).toBeNull();
    expect(parseClientMessage('{"type":"hack"}')).toBeNull();
    expect(
      parseClientMessage('{"type":"action","action":{"type":"BUILD","position":"1"}}'),
    ).toBeNull();
    expect(
      parseClientMessage(
        '{"type":"action","action":{"type":"PROPOSE_TRADE","position":5,"amount":10,"otherPlayer":1,"direction":"steal"}}',
      ),
    ).toBeNull();
  });

  it('o aparelho não pode pedir ações que só o servidor decide', () => {
    for (const type of ['START_TURN', 'TIME_UP', 'REMOVE_PLAYER']) {
      expect(
        parseClientMessage(JSON.stringify({ type: 'action', action: { type, player: 0 } })),
      ).toBeNull();
    }
  });

  it('descarta mensagem grande demais', () => {
    expect(
      parseClientMessage(JSON.stringify({ type: 'hello', name: 'x'.repeat(5000) })),
    ).toBeNull();
  });
});

describe('modo da sala', () => {
  const options = { time: [30, 45, 60, 90], rounds: [20, 30, 40, 60] };
  it('aceita só as opções do arquivo de regras', () => {
    expect(parseModeConfig({ type: 'time', limit: 45 }, options)).toEqual({
      type: 'time',
      limit: 45,
    });
    expect(parseModeConfig({ type: 'classic' }, options)).toEqual({ type: 'classic', limit: null });
    expect(parseModeConfig({ type: 'time', limit: 5 }, options)).toBeNull();
    expect(parseModeConfig({ type: 'rounds', limit: 999 }, options)).toBeNull();
  });
});
