// Tipos do estado da partida, das ações (interface → motor) e dos eventos (motor → interface).
// O estado inteiro vira JSON sem perdas: é o que o salvamento grava (docs/07).
// Correspondência com os nomes do Roku no docs/07-arquitetura-tecnica.md.

import type { Randomizer } from './random';
import type { DeckName, Rules, RulesIndex } from './rules/types';

/** O banco nos campos de dono, origem, destino e credor (RN-006: saldo ilimitado). */
export const BANK = -1;

/** As 15 fases do turno (docs/03-fluxo-do-turno.md). */
export type Phase =
  | 'TURN_START'
  | 'PRE_ROLL'
  | 'JAIL_DECISION'
  | 'ROLL'
  | 'MOVE'
  | 'RESOLVE_SPACE'
  | 'PURCHASE_DECISION'
  | 'COLLECTION'
  | 'CARD'
  | 'POST_RESOLUTION'
  | 'TURN_END'
  | 'GO_TO_JAIL'
  | 'RAISE_MONEY'
  | 'BANKRUPTCY'
  | 'GAME_OVER';

export type ModeType = 'classic' | 'time' | 'rounds';

export interface Mode {
  type: ModeType;
  /** Minutos (tempo) ou rodadas (rodadas); null no clássico. */
  limit: number | null;
  /** RN-113: o tempo acabou; a partida termina quando a rodada fechar. */
  timeUp: boolean;
}

export interface Player {
  name: string;
  color: string;
  money: number;
  position: number;
  inJail: boolean;
  jailTurns: number;
  /** Cartas "Saia da prisão" guardadas (RN-082). */
  jailCards: string[];
  bankrupt: boolean;
  /** RN-105: rodada em que faliu ou abandonou (0 = ainda joga). */
  exitRound: number;
}

export interface PropertyState {
  /** Índice do jogador ou BANK. */
  owner: number;
  /** 0 a maxHouses; maxHouses + 1 = hotel. */
  houses: number;
  mortgaged: boolean;
}

/** Motivo de uma transferência de dinheiro, para a interface escolher a mensagem. */
export type TransferReason =
  | 'passStart'
  | 'purchase'
  | 'rent'
  | 'tax'
  | 'card'
  | 'bail'
  | 'building'
  | 'houseSale'
  | 'mortgage'
  | 'redeem'
  | 'trade'
  | 'bankruptcy'
  | 'mortgageInterest';

/** Um item da fila de cobrança. */
export interface ChargeItem {
  debtor: number;
  creditor: number;
  amount: number;
  reason: TransferReason;
  /** Posição da casa que gerou a cobrança (aluguel ou imposto). */
  position?: number;
  /** RN-106: pagamento a vários jogadores tratado como uma dívida só. */
  toEach?: number[];
  amountEach?: number;
  rent?: RentResult;
}

/** RN-100: dívida aberta em RAISE_MONEY. */
export interface Debt {
  debtor: number;
  creditor: number;
  amount: number;
  shortfall: number;
  reason: TransferReason;
  /** RN-102: nem vendendo tudo alcança; só resta a falência. */
  noWayOut: boolean;
}

/** Para onde o fluxo segue quando a cobrança termina. */
export type CollectionReturn = 'POST_RESOLUTION' | 'TURN_END' | 'LEAVE_JAIL_AND_MOVE';

export interface CollectionPending {
  type: 'collection';
  queue: ChargeItem[];
  returnTo: CollectionReturn;
  debt: Debt | null;
  bankruptcy: { player: number; creditor: number; interest: number } | null;
}

export type TradeDirection = 'buy' | 'sell';

export interface TradePending {
  type: 'trade';
  direction: TradeDirection;
  position: number;
  amount: number;
  proposer: number;
  other: number;
}

export type Pending = CollectionPending | TradePending;

export interface RankingEntry {
  player: number;
  netWorth: number;
  money: number;
  properties: number;
  bankrupt: boolean;
  exitRound: number;
}

export interface GameState {
  rulesVersion: number;
  phase: Phase;
  mode: Mode;
  round: number;
  /** Índice dentro de order. */
  turn: number;
  /** Índices de players, na ordem sorteada (RN-004). */
  order: number[];
  consecutiveDoubles: number;
  lastDice: number[];
  /** RN-015: dupla pendente de nova jogada. */
  extraRoll: boolean;
  /** RN-073: saiu da prisão por dupla; essa dupla não dá nova jogada. */
  noExtraRoll: boolean;
  /** RN-046: chegou à casa por carta. */
  arrivedByCard: boolean;
  proposalsThisTurn: number;
  players: Player[];
  /** Estado de cada propriedade, pela posição no tabuleiro. */
  properties: Record<string, PropertyState>;
  /** Ordem atual de cada baralho; o topo é o primeiro. */
  decks: Record<DeckName, string[]>;
  currentCard: { id: string; deck: DeckName } | null;
  pending: Pending | null;
  /** Preenchida em GAME_OVER. */
  ranking: RankingEntry[] | null;
}

/** Contexto do motor: regras carregadas e sorteador (injetável nos testes). */
export interface EngineContext {
  rules: Rules;
  index: RulesIndex;
  random: Randomizer;
}

export interface NewGameConfig {
  players: { name: string; color: string }[];
  mode: { type: ModeType; limit?: number | null };
}

export type Action =
  | { type: 'START_TURN' }
  | { type: 'ROLL_DICE' }
  | { type: 'PAY_BAIL' }
  | { type: 'USE_JAIL_CARD' }
  | { type: 'BUY' }
  | { type: 'DECLINE_PURCHASE' }
  | { type: 'CONFIRM' }
  | { type: 'END_TURN' }
  | { type: 'BUILD'; position: number }
  | { type: 'SELL_HOUSE'; position: number }
  | { type: 'MORTGAGE'; position: number }
  | { type: 'REDEEM'; position: number }
  | {
      type: 'PROPOSE_TRADE';
      direction: TradeDirection;
      position: number;
      amount: number;
      otherPlayer: number;
    }
  | { type: 'RESPOND_TRADE'; accept: boolean }
  | { type: 'DECLARE_BANKRUPTCY' }
  | { type: 'QUIT' }
  | { type: 'TIME_UP' }
  /** Vários aparelhos: quem criou a sala tira da partida um jogador que perdeu a conexão. */
  | { type: 'REMOVE_PLAYER'; player: number };

export type ActionType = Action['type'];

/** Motivo de recusa; o texto mostrado sai de texts do rules.json. */
export interface Reason {
  code: string;
  [detail: string]: unknown;
}

export interface RentResult {
  amount: number;
  reason: 'mortgaged' | 'ownerInJail' | 'houses' | 'fullGroup' | 'basic' | 'stations' | 'utilities';
  houses?: number;
  count?: number;
  diceSum?: number;
  multiplier?: number;
}

export type GameEvent =
  | { type: 'OrderDrawn'; order: number[] }
  | { type: 'DiceRolled'; d1: number; d2: number; double: boolean; rentOnly?: boolean }
  | { type: 'PawnMoved'; player: number; from: number; to: number; steps: number }
  | { type: 'MoneyTransferred'; from: number; to: number; amount: number; reason: TransferReason }
  | { type: 'PropertyOwnerChanged'; position: number; from: number; to: number }
  | { type: 'HousesChanged'; position: number; houses: number }
  | { type: 'MortgageChanged'; position: number; mortgaged: boolean }
  | { type: 'CardRevealed'; id: string; deck: DeckName }
  | { type: 'Jailed'; player: number; from: number; reason: 'threeDoubles' | 'space' | 'card' }
  | {
      type: 'ReleasedFromJail';
      player: number;
      reason: 'doubles' | 'mandatoryBail' | 'bail' | 'card';
    }
  | { type: 'WentBankrupt'; player: number; creditor: number; quit: boolean }
  | { type: 'GameOver'; ranking: RankingEntry[] }
  | { type: 'PurchaseOffered'; position: number; price: number; shortfall: number }
  | { type: 'PurchaseDeclined'; position: number }
  | { type: 'RentExempt'; position: number; reason: 'mortgaged' | 'ownerInJail'; owner: number }
  | { type: 'MandatoryBail'; player: number; amount: number }
  | {
      type: 'DebtOpened';
      debtor: number;
      creditor: number;
      amount: number;
      shortfall: number;
      noWayOut: boolean;
    }
  | {
      type: 'TradeProposed';
      direction: TradeDirection;
      position: number;
      amount: number;
      proposer: number;
      other: number;
    }
  | { type: 'TradeAnswered'; accepted: boolean; position: number; proposer: number; other: number }
  | { type: 'TimeUp' }
  | { type: 'TurnEnded'; next: number; round: number };

export type TransitionResult =
  | { ok: true; state: GameState; events: GameEvent[]; reason: null }
  | { ok: false; state: GameState; events: []; reason: Reason };
