// Cobranças, dívidas e falência (RN-100 a RN-106, RN-115).
// Toda cobrança passa por uma fila em state.pending (type "collection"). Cada item é pago
// na ordem; se faltar dinheiro, o devedor vai a RAISE_MONEY e, quando a fila esvazia,
// o fluxo segue para returnTo (ver continueAfter).

import { allHousesSaleValue, sellAllHouses } from './building';
import { returnCard } from './cards';
import { mortgageInterest, mortgageValue } from './mortgage';
import { currentPlayerIndex, playerAt, playerProperties, propertyAt } from './state';
import { transfer } from './transfer';
import { continueAfter, endTurn, setPhase } from './turn';
import {
  BANK,
  type ChargeItem,
  type CollectionPending,
  type CollectionReturn,
  type EngineContext,
  type GameEvent,
  type GameState,
  type Reason,
  type TransferReason,
} from './types';

export function chargeItem(
  debtor: number,
  creditor: number,
  amount: number,
  reason: TransferReason,
): ChargeItem {
  return { debtor, creditor, amount, reason };
}

function collection(state: GameState): CollectionPending {
  if (state.pending?.type !== 'collection') throw new Error('nenhuma cobrança em andamento');
  return state.pending;
}

export function startCollection(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  items: ChargeItem[],
  returnTo: CollectionReturn,
): void {
  state.pending = { type: 'collection', queue: items, returnTo, debt: null, bankruptcy: null };
  setPhase(state, 'COLLECTION');
  processCollection(state, ctx, events);
}

function processCollection(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  const pending = collection(state);
  const queue = pending.queue;
  while (queue.length > 0) {
    const item = queue[0] as ChargeItem;
    const debtor = playerAt(state, item.debtor);
    if (debtor.bankrupt) {
      queue.shift(); // quem já faliu não paga mais nada
    } else if (debtor.money >= item.amount) {
      payItem(state, events, item);
      queue.shift();
    } else {
      openDebt(state, ctx, events, item); // RN-100
      return;
    }
  }
  state.pending = null;
  continueAfter(state, ctx, events, pending.returnTo);
}

function payItem(state: GameState, events: GameEvent[], item: ChargeItem): void {
  if (item.toEach) {
    for (const creditor of item.toEach) {
      transfer(state, events, item.debtor, creditor, item.amountEach ?? 0, item.reason);
    }
  } else {
    transfer(state, events, item.debtor, item.creditor, item.amount, item.reason);
  }
}

/** RN-100/RN-102: mostra quanto falta; se nem vendendo tudo alcança, só a falência. */
function openDebt(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  item: ChargeItem,
): void {
  const money = playerAt(state, item.debtor).money;
  const noWayOut = maxRaisable(state, item.debtor, ctx) < item.amount;
  const shortfall = item.amount - money;
  collection(state).debt = {
    debtor: item.debtor,
    creditor: item.creditor,
    amount: item.amount,
    shortfall,
    reason: item.reason,
    noWayOut,
  };
  setPhase(state, 'RAISE_MONEY');
  events.push({
    type: 'DebtOpened',
    debtor: item.debtor,
    creditor: item.creditor,
    amount: item.amount,
    shortfall,
    noWayOut,
  });
}

/** RN-101: a dívida é paga assim que o caixa alcança o valor. */
export function tryToSettleDebt(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  const pending = collection(state);
  const debt = pending.debt;
  if (!debt) return;
  const money = playerAt(state, debt.debtor).money;
  if (money < debt.amount) {
    debt.shortfall = debt.amount - money;
    return;
  }
  pending.debt = null;
  setPhase(state, 'COLLECTION');
  processCollection(state, ctx, events);
}

/** Dinheiro + venda de todas as casas + hipoteca de todas as propriedades livres. */
export function maxRaisable(state: GameState, player: number, ctx: EngineContext): number {
  let total = playerAt(state, player).money + allHousesSaleValue(state, player, ctx);
  for (const position of playerProperties(state, player, ctx)) {
    if (!propertyAt(state, position).mortgaged) total += mortgageValue(ctx, position);
  }
  return total;
}

/** Quem decide agora: o devedor em RAISE_MONEY; nos demais casos, o jogador da vez. */
export function actingPlayer(state: GameState): number {
  if (state.phase === 'RAISE_MONEY' && state.pending?.type === 'collection' && state.pending.debt) {
    return state.pending.debt.debtor;
  }
  return currentPlayerIndex(state);
}

/**
 * RN-102/D-19: só se declara falência quando nem vendendo casas e hipotecando tudo
 * a dívida seria paga; antes disso, recusa para ninguém falir por engano.
 */
export function declareBankruptcy(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
): Reason | null {
  const pending = collection(state);
  const debt = pending.debt;
  if (!debt) return { code: 'noDebt' };
  const max = maxRaisable(state, debt.debtor, ctx);
  if (max >= debt.amount) return { code: 'debtCoverable', max };
  const interest = transferBankruptAssets(state, ctx, events, debt.debtor, debt.creditor, false);
  pending.queue.shift();
  pending.debt = null;
  pending.bankruptcy = { player: debt.debtor, creditor: debt.creditor, interest };
  setPhase(state, 'BANKRUPTCY');
  return null;
}

/**
 * OK na tela de falência: o credor paga os juros das hipotecas recebidas (RN-103)
 * e o fluxo continua; se quem faliu era o jogador da vez, o turno acaba.
 */
export function concludeBankruptcy(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
): void {
  const pending = collection(state);
  const bankruptcy = pending.bankruptcy;
  if (!bankruptcy) throw new Error('nenhuma falência em andamento');
  pending.bankruptcy = null;
  if (bankruptcy.player === currentPlayerIndex(state)) pending.returnTo = 'TURN_END';
  if (bankruptcy.interest > 0) {
    pending.queue.unshift(
      chargeItem(bankruptcy.creditor, BANK, bankruptcy.interest, 'mortgageInterest'),
    );
  }
  setPhase(state, 'COLLECTION');
  processCollection(state, ctx, events);
}

/**
 * Entrega os bens do falido. Devolve os juros que o credor deve pelas hipotecas recebidas.
 * RN-103 credor jogador: casas vendidas ao banco antes, o dinheiro e as propriedades
 * passam ao credor, e as hipotecadas continuam hipotecadas.
 * RN-104 credor banco (e RN-115 abandono): propriedades voltam livres e sem casas.
 */
export function transferBankruptAssets(
  state: GameState,
  ctx: EngineContext,
  events: GameEvent[],
  bankrupt: number,
  creditor: number,
  quit: boolean,
): number {
  const player = playerAt(state, bankrupt);
  sellAllHouses(state, ctx, events, bankrupt);
  let interest = 0;
  for (const position of playerProperties(state, bankrupt, ctx)) {
    const property = propertyAt(state, position);
    property.owner = creditor;
    if (creditor !== BANK) {
      if (property.mortgaged) interest += mortgageInterest(ctx, position);
    } else if (property.mortgaged) {
      property.mortgaged = false;
      events.push({ type: 'MortgageChanged', position, mortgaged: false });
    }
    events.push({ type: 'PropertyOwnerChanged', position, from: bankrupt, to: creditor });
  }
  transfer(state, events, bankrupt, creditor, player.money, 'bankruptcy');

  // cartas "Saia da prisão" guardadas voltam ao fundo dos baralhos
  for (const id of player.jailCards) returnCard(state, ctx, id);
  player.jailCards = [];

  // RN-105: sai da partida, registrando a rodada
  player.bankrupt = true;
  player.inJail = false;
  player.exitRound = state.round;
  events.push({ type: 'WentBankrupt', player: bankrupt, creditor, quit });
  return interest;
}

/** RN-115: abandonar devolve tudo ao banco, como na falência para o banco. */
export function quit(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  transferBankruptAssets(state, ctx, events, currentPlayerIndex(state), BANK, true);
  endTurn(state, ctx, events);
}
