import { describe, expect, it } from 'vitest';
import { narrate } from './narrate';
import { testGame } from './test-helpers';
import { viewFrom } from './view';

describe('narração dos eventos (H-xx e M-xx do docs/04)', () => {
  const { ctx, state } = testGame();
  const view = viewFrom(state);
  const say = (event: Parameters<typeof narrate>[0], batch = false) =>
    narrate(event, view, state, ctx, batch);

  it('bônus da Partida: histórico H-01 e aviso M-01', () => {
    expect(
      say({ type: 'MoneyTransferred', from: -1, to: 0, amount: 200, reason: 'passStart' }),
    ).toEqual({
      history: 'Ana passou pela Partida (+R$ 200)',
      toast: 'Ana passou pela Partida: +R$ 200. Salário caiu!',
    });
  });

  it('aluguel: M-04 normal e M-05 a partir de R$ 500', () => {
    expect(
      say({ type: 'MoneyTransferred', from: 1, to: 0, amount: 180, reason: 'rent' }).toast,
    ).toBe('Bruno pagou R$ 180 a Ana. Tchau dinheiro!');
    expect(
      say({ type: 'MoneyTransferred', from: 1, to: 0, amount: 1150, reason: 'rent' }).toast,
    ).toBe('Bruno pagou R$ 1.150 a Ana. Doeu no bolso.');
  });

  it('compra e prisão por três duplas', () => {
    expect(say({ type: 'PropertyOwnerChanged', position: 24, from: -1, to: 2 }).history).toBe(
      'Carla comprou Rua das Palmeiras',
    );
    expect(say({ type: 'Jailed', player: 1, from: 12, reason: 'threeDoubles' }).toast).toBe(
      'Três duplas? Suspeito… Bruno vai para a prisão.',
    );
  });

  it('casas: construção avisa; venda na falência não entra uma a uma no histórico', () => {
    const owned = viewFrom(state);
    owned.properties['1'] = { owner: 0, houses: 2, mortgaged: false };
    const built = narrate(
      { type: 'HousesChanged', position: 1, houses: 3 },
      owned,
      state,
      ctx,
      false,
    );
    expect(built.toast).toBe('Travessa do Porto ganhou a 3ª casa. Aluguel agora: R$ 180.');
    expect(
      narrate({ type: 'HousesChanged', position: 1, houses: 0 }, owned, state, ctx, true),
    ).toEqual({});
  });

  it('venda simples recusada: M-16', () => {
    expect(
      say({ type: 'TradeAnswered', accepted: false, position: 5, proposer: 0, other: 1 }).toast,
    ).toBe('Bruno recusou. Quem sabe na próxima rodada.');
  });
});
