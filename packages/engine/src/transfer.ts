// Movimento de dinheiro entre jogadores e banco (RN-006: o banco nunca fica sem saldo).

import { playerAt } from './state';
import { BANK, type GameEvent, type GameState, type TransferReason } from './types';

export function transfer(
  state: GameState,
  events: GameEvent[],
  from: number,
  to: number,
  amount: number,
  reason: TransferReason,
): void {
  if (amount <= 0) return;
  if (from !== BANK) playerAt(state, from).money -= amount;
  if (to !== BANK) playerAt(state, to).money += amount;
  events.push({ type: 'MoneyTransferred', from, to, amount, reason });
}
