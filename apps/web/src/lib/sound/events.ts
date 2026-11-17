// Qual som cada evento do motor toca (Etapa 6). Função pura, testável sem áudio.

import { BANK, type GameEvent } from '@senhorio/engine';

export type SoundName =
  'dice' | 'coin' | 'pay' | 'buy' | 'build' | 'card' | 'jail' | 'bankrupt' | 'win' | 'turn';

/**
 * Som de um evento, ou null. `me` é o lugar deste aparelho no modo de vários aparelhos
 * (null no modo um aparelho): dinheiro só soa no aparelho de quem recebe ou paga.
 */
export function soundFor(event: GameEvent, me: number | null): SoundName | null {
  const mine = (player: number) => me === null || player === me;
  switch (event.type) {
    case 'DiceRolled':
      return 'dice';
    case 'MoneyTransferred':
      // a compra tem som próprio; na falência, os bens vão de uma vez (o som é o da falência)
      if (event.reason === 'purchase' || event.reason === 'bankruptcy') return null;
      if (event.to !== BANK && mine(event.to)) return 'coin';
      if (event.from !== BANK && mine(event.from)) return 'pay';
      return null;
    case 'PropertyOwnerChanged':
      return event.from === BANK && event.to !== BANK ? 'buy' : null;
    case 'HousesChanged':
      return 'build';
    case 'CardRevealed':
      return 'card';
    case 'Jailed':
      return 'jail';
    case 'WentBankrupt':
      return 'bankrupt';
    case 'GameOver':
      return 'win';
    default:
      return null;
  }
}
