// Prisão: decisões do jogador preso (RN-071 a RN-074).
// A ida à prisão (RN-070) fica em turn.ts, em goToJail.

import { returnCard } from './cards';
import { chargeItem, startCollection } from './debt';
import { currentPlayerIndex, playerAt } from './state';
import { transfer } from './transfer';
import {
  endTurn,
  lastDiceSum,
  movePawn,
  resolveSpace,
  rollAndMove,
  rollDice,
  setPhase,
} from './turn';
import { BANK, type EngineContext, type GameEvent, type GameState, type Reason } from './types';

/** RN-073/RN-074: tenta a dupla; na última tentativa sem dupla, fiança obrigatória e anda. */
export function tryForDoubles(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  setPhase(state, 'ROLL');
  const index = currentPlayerIndex(state);
  const player = playerAt(state, index);
  const dice = rollDice(ctx);
  state.lastDice = [dice.d1, dice.d2];
  events.push({ type: 'DiceRolled', d1: dice.d1, d2: dice.d2, double: dice.double });
  player.jailTurns++;

  if (dice.double) {
    // sai e anda a soma, mas essa dupla não dá nova jogada
    release(state, events, index, 'doubles');
    state.noExtraRoll = true;
    movePawn(state, ctx, events, dice.sum);
    resolveSpace(state, ctx, events);
  } else if (player.jailTurns >= ctx.rules.parameters.maxJailTurns) {
    const bail = ctx.rules.parameters.bail;
    events.push({ type: 'MandatoryBail', player: index, amount: bail });
    startCollection(
      state,
      ctx,
      events,
      [chargeItem(index, BANK, bail, 'bail')],
      'LEAVE_JAIL_AND_MOVE',
    );
  } else {
    endTurn(state, ctx, events);
  }
}

/** Depois da fiança obrigatória paga: sai e anda a soma da última rolagem. */
export function leaveJailAndMove(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  release(state, events, currentPlayerIndex(state), 'mandatoryBail');
  movePawn(state, ctx, events, lastDiceSum(state));
  resolveSpace(state, ctx, events);
}

/** RN-072: pagando a fiança, sai e rola normalmente no mesmo turno. */
export function payBail(state: GameState, ctx: EngineContext, events: GameEvent[]): Reason | null {
  const index = currentPlayerIndex(state);
  const bail = ctx.rules.parameters.bail;
  const money = playerAt(state, index).money;
  if (money < bail) return { code: 'insufficientFunds', amount: bail - money };
  transfer(state, events, index, BANK, bail, 'bail');
  release(state, events, index, 'bail');
  rollAndMove(state, ctx, events);
  return null;
}

/** RN-072/RN-082: usa a carta guardada, que volta ao fundo do seu baralho. */
export function useJailCard(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
): Reason | null {
  const index = currentPlayerIndex(state);
  const card = playerAt(state, index).jailCards.shift();
  if (card === undefined) return { code: 'noJailCard' };
  returnCard(state, ctx, card);
  release(state, events, index, 'card');
  rollAndMove(state, ctx, events);
  return null;
}

function release(
  state: GameState,
  events: GameEvent[],
  index: number,
  reason: 'doubles' | 'mandatoryBail' | 'bail' | 'card',
): void {
  const player = playerAt(state, index);
  player.inJail = false;
  player.jailTurns = 0;
  events.push({ type: 'ReleasedFromJail', player: index, reason });
}
