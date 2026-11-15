// Cartas de Sorte e Revés (RN-080 a RN-084).
// O topo do baralho é o primeiro da lista; a carta lida volta para o fundo.

import { hotelLevel } from './building';
import { chargeItem, startCollection } from './debt';
import {
  currentPlayerIndex,
  otherActivePlayers,
  playerAt,
  playerProperties,
  propertyAt,
} from './state';
import { transfer } from './transfer';
import {
  goToJail,
  goToPostResolution,
  movePawn,
  moveToSpace,
  resolveSpace,
  setPhase,
} from './turn';
import type { Card, CardAction, DeckName } from './rules/types';
import { BANK, type EngineContext, type GameEvent, type GameState } from './types';

/** RN-080: mostra a carta do topo; o efeito só vale depois do OK (CONFIRM). */
export function drawCard(state: GameState, events: GameEvent[], deck: DeckName): void {
  const id = state.decks[deck].shift();
  if (id === undefined) throw new Error(`baralho vazio: ${deck}`);
  state.currentCard = { id, deck };
  setPhase(state, 'CARD');
  events.push({ type: 'CardRevealed', id, deck });
}

export function cardById(ctx: EngineContext, id: string): Card {
  const deck = ctx.index.cardDeck[id];
  const card = deck ? ctx.rules.cards[deck].find((c) => c.id === id) : undefined;
  if (!card) throw new Error(`carta inexistente: ${id}`);
  return card;
}

export function returnCard(state: GameState, ctx: EngineContext, id: string): void {
  const deck = ctx.index.cardDeck[id];
  if (!deck) throw new Error(`carta inexistente: ${id}`);
  state.decks[deck].push(id);
}

/** Aplica o efeito da carta revelada, conforme action.type do rules.json. */
export function applyCurrentCard(state: GameState, ctx: EngineContext, events: GameEvent[]): void {
  const current = state.currentCard;
  if (!current) throw new Error('nenhuma carta revelada');
  state.currentCard = null;
  const action = cardById(ctx, current.id).action;
  const index = currentPlayerIndex(state);
  const player = playerAt(state, index);

  // RN-082: "Saia da prisão" fica com o jogador até ser usada; as outras voltam ao fundo
  if (action.type === 'getOutOfJailFree') player.jailCards.push(current.id);
  else returnCard(state, ctx, current.id);

  switch (action.type) {
    case 'receiveFromBank':
      transfer(state, events, BANK, index, action.amount, 'card');
      goToPostResolution(state);
      break;
    case 'payToBank':
      startCollection(
        state,
        ctx,
        events,
        [chargeItem(index, BANK, action.amount, 'card')],
        'POST_RESOLUTION',
      );
      break;
    case 'collectFromEachPlayer':
      startCollection(
        state,
        ctx,
        events,
        otherActivePlayers(state, index).map((other) =>
          chargeItem(other, index, action.amount, 'card'),
        ),
        'POST_RESOLUTION',
      );
      break;
    case 'payEachPlayer': {
      // RN-106: várias dívidas tratadas como uma só; na falência, o credor é o banco
      const others = otherActivePlayers(state, index);
      const item = chargeItem(index, BANK, action.amount * others.length, 'card');
      item.toEach = others;
      item.amountEach = action.amount;
      startCollection(state, ctx, events, [item], 'POST_RESOLUTION');
      break;
    }
    case 'goTo':
      // RN-083/RN-084: anda até a casa e resolve de novo
      state.arrivedByCard = true;
      moveToSpace(state, ctx, events, action.destination, action.backward);
      resolveSpace(state, ctx, events);
      break;
    case 'nearestStation':
      state.arrivedByCard = true;
      moveToSpace(state, ctx, events, stationAhead(player.position, ctx), false);
      resolveSpace(state, ctx, events);
      break;
    case 'move':
      state.arrivedByCard = true;
      movePawn(state, ctx, events, action.spaces);
      resolveSpace(state, ctx, events);
      break;
    case 'goToJail':
      goToJail(state, ctx, events, 'card');
      break;
    case 'repairs':
      startCollection(
        state,
        ctx,
        events,
        [chargeItem(index, BANK, repairsCost(state, index, action, ctx), 'card')],
        'POST_RESOLUTION',
      );
      break;
    case 'getOutOfJailFree':
      goToPostResolution(state); // só guarda
      break;
  }
}

/** Primeira estação à frente da posição (dando a volta no tabuleiro se preciso). */
export function stationAhead(position: number, ctx: EngineContext): number {
  const stations = ctx.index.stations;
  return stations.find((s) => s > position) ?? (stations[0] as number);
}

/** Reparos: valor por casa e por hotel em todas as ruas do jogador. */
export function repairsCost(
  state: GameState,
  player: number,
  action: Extract<CardAction, { type: 'repairs' }>,
  ctx: EngineContext,
): number {
  const hotel = hotelLevel(ctx);
  return playerProperties(state, player, ctx).reduce((total, position) => {
    const houses = propertyAt(state, position).houses;
    return total + (houses === hotel ? action.perHotel : houses * action.perHouse);
  }, 0);
}
