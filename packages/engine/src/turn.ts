// Fluxo do turno: rolar, mover, resolver a casa, comprar, ir à prisão e encerrar
// (porta do Motor.brs do Roku; docs/03-fluxo-do-turno.md). As fases automáticas
// encadeiam na mesma chamada até uma fase que espera decisão do jogador.

import { drawCard } from './cards';
import { chargeItem, startCollection } from './debt';
import { leaveJailAndMove } from './jail';
import { ranking } from './net-worth';
import { calculateRent, rentExemption } from './rent';
import {
  activePlayers,
  currentPlayer,
  currentPlayerIndex,
  playerAt,
  propertyAt,
  spaceAt,
} from './state';
import { transfer } from './transfer';
import {
  BANK,
  type CollectionReturn,
  type EngineContext,
  type GameEvent,
  type GameState,
  type Phase,
  type Reason,
} from './types';

export function setPhase(state: GameState, phase: Phase): void {
  state.phase = phase;
}

/** RN-012: dois dados independentes; dupla quando são iguais (RN-015). */
export function rollDice(ctx: EngineContext): {
  d1: number;
  d2: number;
  sum: number;
  double: boolean;
} {
  const faces = ctx.rules.parameters.diceFaces;
  const d1 = ctx.random.die(faces);
  const d2 = ctx.random.die(faces);
  return { d1, d2, sum: d1 + d2, double: d1 === d2 };
}

export function lastDiceSum(state: GameState): number {
  const [d1, d2] = state.lastDice;
  return d1 !== undefined && d2 !== undefined ? d1 + d2 : 0;
}

/** RN-010: início do turno; preso vai direto à decisão da prisão (RN-071). */
export function startTurn(state: GameState): void {
  state.consecutiveDoubles = 0;
  state.extraRoll = false;
  state.noExtraRoll = false;
  state.arrivedByCard = false;
  state.proposalsThisTurn = 0;
  state.lastDice = [];
  setPhase(state, currentPlayer(state).inJail ? 'JAIL_DECISION' : 'PRE_ROLL');
}

/** RN-012, RN-015, RN-016: rola, conta duplas e anda a soma. */
export function rollAndMove(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  setPhase(state, 'ROLL');
  const dice = rollDice(ctx);
  state.lastDice = [dice.d1, dice.d2];
  events.push({ type: 'DiceRolled', d1: dice.d1, d2: dice.d2, double: dice.double });
  if (dice.double) {
    state.consecutiveDoubles++;
    // RN-016: a terceira dupla seguida vai à prisão sem andar a soma
    if (state.consecutiveDoubles >= ctx.rules.parameters.maxConsecutiveDoubles) {
      goToJail(state, ctx, events, 'threeDoubles');
      return;
    }
  }
  movePawn(state, ctx, events, dice.sum);
  resolveSpace(state, ctx, events);
}

/**
 * Anda steps casas (negativo = para trás). RN-013: passar ou parar na Partida
 * indo para a frente rende o bônus; RN-083: para trás nunca rende.
 */
export function movePawn(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  steps: number,
): void {
  setPhase(state, 'MOVE');
  const index = currentPlayerIndex(state);
  const player = playerAt(state, index);
  const total = ctx.index.totalSpaces;
  const from = player.position;
  const to = (((from + steps) % total) + total) % total;
  player.position = to;
  events.push({ type: 'PawnMoved', player: index, from, to, steps });
  if (steps > 0 && from + steps >= total) {
    transfer(state, events, BANK, index, ctx.rules.parameters.passStartBonus, 'passStart');
  }
}

/** Movimento por carta até uma casa; backward = sem passar pela Partida (RN-083). */
export function moveToSpace(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  destination: number,
  backward: boolean,
): void {
  const total = ctx.index.totalSpaces;
  const from = currentPlayer(state).position;
  const steps = backward
    ? -((from - destination + total) % total)
    : (destination - from + total) % total;
  movePawn(state, ctx, events, steps);
}

/** RN-014: resolve a casa de destino (tabela de resolução do docs/03). */
export function resolveSpace(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  setPhase(state, 'RESOLVE_SPACE');
  const index = currentPlayerIndex(state);
  const position = playerAt(state, index).position;
  const space = spaceAt(ctx, position);
  const byCard = state.arrivedByCard;
  state.arrivedByCard = false;

  switch (space.type) {
    case 'street':
    case 'station':
    case 'utility': {
      const property = propertyAt(state, position);
      if (property.owner === BANK) {
        // RN-032/RN-033: oferece a compra; a tela mostra quanto falta, se faltar
        const shortfall = Math.max(0, space.price - playerAt(state, index).money);
        events.push({ type: 'PurchaseOffered', position, price: space.price, shortfall });
        setPhase(state, 'PURCHASE_DECISION');
      } else if (property.owner === index) {
        goToPostResolution(state); // RN-035
      } else {
        const exemption = rentExemption(state, position, ctx);
        if (exemption) {
          events.push({ type: 'RentExempt', position, reason: exemption, owner: property.owner });
          goToPostResolution(state);
          return;
        }
        let sum = lastDiceSum(state);
        if (space.type === 'utility' && byCard) {
          // RN-046: chegou por carta; o banco rola só para calcular o aluguel
          const dice = rollDice(ctx);
          events.push({
            type: 'DiceRolled',
            d1: dice.d1,
            d2: dice.d2,
            double: dice.double,
            rentOnly: true,
          });
          sum = dice.sum;
        }
        const rent = calculateRent(state, position, sum, ctx);
        const item = chargeItem(index, property.owner, rent.amount, 'rent');
        item.position = position;
        item.rent = rent;
        startCollection(state, ctx, events, [item], 'POST_RESOLUTION'); // RN-040
      }
      return;
    }
    case 'tax': {
      // RN-020: impostos cobrados automaticamente
      const amount = ctx.rules.parameters[space.taxParameter] as number;
      const item = chargeItem(index, BANK, amount, 'tax');
      item.position = position;
      startCollection(state, ctx, events, [item], 'POST_RESOLUTION');
      return;
    }
    case 'chance':
    case 'setback':
      drawCard(state, events, space.type); // RN-080
      return;
    case 'goToJail':
      goToJail(state, ctx, events, 'space'); // RN-070
      return;
    default:
      // Partida (bônus já pago em MOVE), prisão só visitando (RN-076), Descanso
      goToPostResolution(state);
  }
}

/**
 * RN-015/RN-017: depois de resolver a casa, nova jogada só com dupla
 * (e nunca pela dupla que tirou da prisão, RN-073).
 */
export function goToPostResolution(state: GameState): void {
  const player = currentPlayer(state);
  const [d1, d2] = state.lastDice;
  const double = d1 !== undefined && d1 === d2;
  state.extraRoll = double && !state.noExtraRoll && !player.inJail && !player.bankrupt;
  setPhase(state, 'POST_RESOLUTION');
}

/** RN-032: compra pelo preço de tabela. RN-033: sem dinheiro, recusa dizendo quanto falta. */
export function buy(state: GameState, ctx: EngineContext, events: GameEvent[]): Reason | null {
  const index = currentPlayerIndex(state);
  const position = playerAt(state, index).position;
  const space = spaceAt(ctx, position);
  if (space.type !== 'street' && space.type !== 'station' && space.type !== 'utility') {
    return { code: 'invalidPosition' };
  }
  const money = playerAt(state, index).money;
  if (money < space.price) return { code: 'insufficientFunds', amount: space.price - money };
  transfer(state, events, index, BANK, space.price, 'purchase');
  propertyAt(state, position).owner = index;
  events.push({ type: 'PropertyOwnerChanged', position, from: BANK, to: index });
  goToPostResolution(state);
  return null;
}

/** RN-070: direto para a prisão, sem passar pela Partida; o turno acaba. */
export function goToJail(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  reason: 'threeDoubles' | 'space' | 'card',
): void {
  setPhase(state, 'GO_TO_JAIL');
  const index = currentPlayerIndex(state);
  const player = playerAt(state, index);
  const from = player.position;
  player.position = ctx.index.jailPosition;
  player.inJail = true;
  player.jailTurns = 0;
  state.consecutiveDoubles = 0;
  events.push({ type: 'Jailed', player: index, from, reason });
  endTurn(state, ctx, events);
}

/**
 * RN-017, RN-018, RN-110, RN-113: fecha o turno, escolhe o próximo ativo e verifica o fim.
 * É o ponto de salvamento: o evento TurnEnded avisa a interface para gravar.
 */
export function endTurn(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  setPhase(state, 'TURN_END');
  state.consecutiveDoubles = 0;
  state.extraRoll = false;
  state.noExtraRoll = false;
  state.arrivedByCard = false;
  state.proposalsThisTurn = 0;
  state.currentCard = null;
  state.pending = null;

  const n = state.order.length;
  let i = state.turn;
  let roundClosed = false;
  for (let k = 0; k < n; k++) {
    i++;
    if (i >= n) {
      i = 0;
      roundClosed = true;
    }
    if (!playerAt(state, state.order[i] as number).bankrupt) break;
  }

  let over = activePlayers(state).length <= 1;
  if (!over && roundClosed) {
    // a rodada que acabou de fechar era a última?
    if (state.mode.type === 'rounds' && state.round >= (state.mode.limit as number)) over = true;
    if (state.mode.type === 'time' && state.mode.timeUp) over = true;
  }

  if (over) {
    finishGame(state, ctx, events);
    return;
  }
  if (roundClosed) state.round++;
  state.turn = i;
  events.push({ type: 'TurnEnded', next: state.order[i] as number, round: state.round });
  setPhase(state, 'TURN_START');
}

/** Para onde o fluxo volta depois que uma cobrança termina. */
export function continueAfter(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  returnTo: CollectionReturn,
): void {
  if (returnTo === 'LEAVE_JAIL_AND_MOVE') leaveJailAndMove(state, ctx, events);
  else if (returnTo === 'TURN_END') endTurn(state, ctx, events);
  else goToPostResolution(state);
}

export function finishGame(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  state.ranking = ranking(state, ctx);
  setPhase(state, 'GAME_OVER');
  events.push({ type: 'GameOver', ranking: state.ranking });
}
