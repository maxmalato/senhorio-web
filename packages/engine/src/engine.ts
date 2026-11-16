// Motor de regras: transition(state, action, ctx) → { ok, state, events, reason }.
// TypeScript puro, sem APIs de navegador ou da Cloudflare. O estado recebido nunca é
// alterado: o motor trabalha numa cópia e, se a ação for recusada, devolve o original
// com o motivo. Fases automáticas (ROLL, MOVE, RESOLVE_SPACE, COLLECTION, GO_TO_JAIL,
// TURN_END) encadeiam na mesma chamada até uma fase que espera decisão do jogador.

import { build, sellHouse } from './building';
import { applyCurrentCard } from './cards';
import {
  actingPlayer,
  concludeBankruptcy,
  declareBankruptcy,
  quit,
  removePlayer,
  tryToSettleDebt,
} from './debt';
import { payBail, tryForDoubles, useJailCard } from './jail';
import { mortgage, redeem } from './mortgage';
import { cloneState, currentPlayer } from './state';
import { proposeTrade, respondTrade } from './trade';
import { buy, endTurn, goToPostResolution, rollAndMove, startTurn } from './turn';
import type {
  Action,
  ActionType,
  EngineContext,
  GameEvent,
  GameState,
  Phase,
  Reason,
  TransitionResult,
} from './types';

const PROPERTY_MENU: ActionType[] = ['BUILD', 'SELL_HOUSE', 'MORTGAGE', 'REDEEM'];

/**
 * Ações aceitas em cada fase que espera decisão (tabela de ações do docs/07).
 * RN-075: preso usa o menu em JAIL_DECISION, menos a venda simples.
 * RN-033: na compra, pode vender casas e hipotecar para alcançar o preço.
 */
const ACTIONS_BY_PHASE: Partial<Record<Phase, readonly ActionType[]>> = {
  TURN_START: ['START_TURN'],
  PRE_ROLL: ['ROLL_DICE', 'PROPOSE_TRADE', 'QUIT', ...PROPERTY_MENU],
  JAIL_DECISION: ['ROLL_DICE', 'PAY_BAIL', 'USE_JAIL_CARD', 'QUIT', ...PROPERTY_MENU],
  PURCHASE_DECISION: ['BUY', 'DECLINE_PURCHASE', 'SELL_HOUSE', 'MORTGAGE'],
  CARD: ['CONFIRM'],
  POST_RESOLUTION: ['ROLL_DICE', 'END_TURN', 'PROPOSE_TRADE', 'QUIT', ...PROPERTY_MENU],
  RAISE_MONEY: ['SELL_HOUSE', 'MORTGAGE', 'DECLARE_BANKRUPTCY'],
  BANKRUPTCY: ['CONFIRM'],
  GAME_OVER: [],
};

/** Ações válidas agora (a interface usa para habilitar botões). */
export function allowedActions(state: GameState): readonly ActionType[] {
  if (state.phase === 'GAME_OVER') return [];
  if (state.pending?.type === 'trade') return ['RESPOND_TRADE'];
  return ACTIONS_BY_PHASE[state.phase] ?? [];
}

export function transition(state: GameState, action: Action, ctx: EngineContext): TransitionResult {
  const next = cloneState(state);
  const events: GameEvent[] = [];
  const reason = validateAction(next, action) ?? applyAction(next, action, ctx, events);
  if (reason) return { ok: false, state, events: [], reason };
  return { ok: true, state: next, events, reason: null };
}

/** null se a ação pode ser tentada na fase atual, ou o motivo da recusa. */
function validateAction(state: GameState, action: unknown): Reason | null {
  const type =
    typeof action === 'object' && action !== null ? (action as { type?: unknown }).type : undefined;
  if (state.phase === 'GAME_OVER') return { code: 'gameOver' };
  if (type === 'TIME_UP' || type === 'REMOVE_PLAYER') return null;

  // venda simples pendente: só a resposta da outra parte (RN-094)
  if (state.pending?.type === 'trade') {
    return type === 'RESPOND_TRADE' ? null : { code: 'tradePending' };
  }
  if (type === 'RESPOND_TRADE') return { code: 'noTrade' };

  const allowed = ACTIONS_BY_PHASE[state.phase] ?? [];
  if (typeof type !== 'string' || !allowed.includes(type as ActionType)) {
    return { code: 'invalidActionForPhase', phase: state.phase, action: String(type) };
  }

  if (state.phase === 'POST_RESOLUTION') {
    // RN-015/RN-017: com dupla, rola de novo; sem dupla, encerra
    if (type === 'ROLL_DICE' && !state.extraRoll) return { code: 'noExtraRoll' };
    if (type === 'END_TURN' && state.extraRoll) return { code: 'hasExtraRoll' };
  } else if (state.phase === 'RAISE_MONEY') {
    // RN-102: se nem vendendo tudo alcança, só resta a falência
    const debt = state.pending?.type === 'collection' ? state.pending.debt : null;
    if (debt?.noWayOut && type !== 'DECLARE_BANKRUPTCY') return { code: 'noWayOut' };
  }
  return null;
}

function applyAction(
  state: GameState,
  action: Action,
  ctx: EngineContext,
  events: GameEvent[],
): Reason | null {
  switch (action.type) {
    case 'START_TURN':
      startTurn(state);
      return null;
    case 'ROLL_DICE':
      if (state.phase === 'JAIL_DECISION') tryForDoubles(state, ctx, events);
      else rollAndMove(state, ctx, events);
      return null;
    case 'PAY_BAIL':
      return payBail(state, ctx, events);
    case 'USE_JAIL_CARD':
      return useJailCard(state, ctx, events);
    case 'BUY':
      return buy(state, ctx, events);
    case 'DECLINE_PURCHASE':
      events.push({ type: 'PurchaseDeclined', position: currentPlayer(state).position }); // RN-034
      goToPostResolution(state);
      return null;
    case 'CONFIRM':
      if (state.phase === 'CARD') applyCurrentCard(state, ctx, events);
      else concludeBankruptcy(state, ctx, events);
      return null;
    case 'END_TURN':
      endTurn(state, ctx, events);
      return null;
    case 'BUILD':
      return build(state, ctx, events, actingPlayer(state), action.position);
    case 'SELL_HOUSE': {
      const reason = sellHouse(state, ctx, events, actingPlayer(state), action.position);
      if (!reason && state.phase === 'RAISE_MONEY') tryToSettleDebt(state, ctx, events);
      return reason;
    }
    case 'MORTGAGE': {
      const reason = mortgage(state, ctx, events, actingPlayer(state), action.position);
      if (!reason && state.phase === 'RAISE_MONEY') tryToSettleDebt(state, ctx, events);
      return reason;
    }
    case 'REDEEM':
      return redeem(state, ctx, events, actingPlayer(state), action.position);
    case 'PROPOSE_TRADE':
      return proposeTrade(state, ctx, events, action);
    case 'RESPOND_TRADE':
      respondTrade(state, events, action.accept === true);
      return null;
    case 'DECLARE_BANKRUPTCY':
      return declareBankruptcy(state, ctx, events);
    case 'QUIT':
      quit(state, ctx, events);
      return null;
    case 'REMOVE_PLAYER':
      return removePlayer(state, ctx, events, action.player);
    case 'TIME_UP':
      // RN-113: só marca; a partida acaba em TURN_END, quando a rodada fecha
      if (state.mode.type !== 'time') return { code: 'modeWithoutTimer' };
      state.mode.timeUp = true;
      events.push({ type: 'TimeUp' });
      return null;
  }
}
