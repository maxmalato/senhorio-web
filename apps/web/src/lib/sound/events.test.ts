import { BANK, type GameEvent } from '@senhorio/engine';
import { describe, expect, it } from 'vitest';
import { soundFor } from './events';

const money = (from: number, to: number, reason = 'rent'): GameEvent =>
  ({ type: 'MoneyTransferred', from, to, amount: 50, reason }) as GameEvent;

describe('som de cada evento', () => {
  it('dados, carta, prisão, falência e fim têm som próprio', () => {
    expect(soundFor({ type: 'DiceRolled', d1: 3, d2: 4, double: false }, null)).toBe('dice');
    expect(soundFor({ type: 'CardRevealed', id: 'S-01', deck: 'chance' } as GameEvent, null)).toBe(
      'card',
    );
    expect(soundFor({ type: 'Jailed', player: 0, from: 30, reason: 'space' }, null)).toBe('jail');
    expect(soundFor({ type: 'WentBankrupt', player: 1, creditor: 0, quit: false }, null)).toBe(
      'bankrupt',
    );
    expect(soundFor({ type: 'GameOver', ranking: [] }, null)).toBe('win');
    expect(soundFor({ type: 'TurnEnded', next: 1, round: 1 }, null)).toBeNull();
  });

  it('compra do banco soa como compra, sem som de pagamento junto', () => {
    expect(soundFor({ type: 'PropertyOwnerChanged', position: 1, from: BANK, to: 0 }, null)).toBe(
      'buy',
    );
    expect(soundFor(money(0, BANK, 'purchase'), null)).toBeNull();
    // venda simples entre jogadores: o dinheiro soa, a troca de dono não
    expect(
      soundFor({ type: 'PropertyOwnerChanged', position: 1, from: 1, to: 0 }, null),
    ).toBeNull();
  });

  it('um aparelho: quem recebe soa como moeda; pagar ao banco soa como pagamento', () => {
    expect(soundFor(money(BANK, 0, 'passStart'), null)).toBe('coin');
    expect(soundFor(money(0, 1), null)).toBe('coin');
    expect(soundFor(money(0, BANK, 'tax'), null)).toBe('pay');
  });

  it('vários aparelhos: dinheiro só soa no aparelho de quem recebe ou paga', () => {
    expect(soundFor(money(0, 1), 1)).toBe('coin');
    expect(soundFor(money(0, 1), 0)).toBe('pay');
    expect(soundFor(money(0, 1), 2)).toBeNull();
  });

  it('na falência, os bens transferidos não soam um por um', () => {
    expect(soundFor(money(1, 0, 'bankruptcy'), null)).toBeNull();
  });
});
