// Tipos do arquivo de regras (rules.json). Valores, cartas e textos vêm do arquivo;
// aqui só se descreve o formato (docs/07, diretriz 6). Correspondência com os nomes do
// Roku no docs/07-arquitetura-tecnica.md.

export type SpaceType =
  | 'start'
  | 'street'
  | 'station'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'setback'
  | 'jail'
  | 'rest'
  | 'goToJail';

export type DeckName = 'chance' | 'setback';

export interface Parameters {
  startingMoney: number;
  passStartBonus: number;
  bail: number;
  maxJailTurns: number;
  incomeTax: number;
  luxuryTax: number;
  /** RN-044: aluguel por quantidade de estações do dono (1, 2, 3, 4). */
  stationRent: number[];
  /** RN-045: multiplicador dos dados por quantidade de companhias do dono (1, 2). */
  utilityMultiplier: number[];
  maxHouses: number;
  fullGroupMultiplier: number;
  houseSaleFactor: number;
  mortgageFactor: number;
  mortgageInterest: number;
  tradeStep: number;
  tradeStepFast: number;
  maxProposalsPerTurn: number;
  maxConsecutiveDoubles: number;
  diceFaces: number;
  cardsPerDeck: number;
  highRentThreshold: number;
  messageDurationMs: number;
  minPlayers: number;
  maxPlayers: number;
  maxNameLength: number;
}

export interface Modes {
  classic: Record<string, never>;
  time: { optionsMinutes: number[]; defaultMinutes: number };
  rounds: { options: number[]; default: number };
}

export interface HouseRule {
  active: boolean;
  description: string;
}

export interface Group {
  name: string;
  color: string;
  houseCost: number;
  positions: number[];
}

interface BaseSpace {
  position: number;
  name: string;
}

export interface StreetSpace extends BaseSpace {
  type: 'street';
  group: string;
  price: number;
  /** Básico, 1 a maxHouses casas e hotel (RN-043). */
  rent: number[];
}

export interface StationSpace extends BaseSpace {
  type: 'station';
  price: number;
  label: string;
}

export interface UtilitySpace extends BaseSpace {
  type: 'utility';
  price: number;
  label: string;
}

export interface TaxSpace extends BaseSpace {
  type: 'tax';
  /** Nome do parâmetro com o valor do imposto (ex.: "incomeTax"). */
  taxParameter: keyof Parameters;
  label: string;
}

export interface SimpleSpace extends BaseSpace {
  type: 'start' | 'chance' | 'setback' | 'jail' | 'rest' | 'goToJail';
  label: string;
}

export type Space = StreetSpace | StationSpace | UtilitySpace | TaxSpace | SimpleSpace;
export type PropertySpace = StreetSpace | StationSpace | UtilitySpace;

export type CardAction =
  | { type: 'receiveFromBank'; amount: number }
  | { type: 'payToBank'; amount: number }
  | { type: 'collectFromEachPlayer'; amount: number }
  | { type: 'payEachPlayer'; amount: number }
  | { type: 'goTo'; destination: number; backward: boolean }
  | { type: 'nearestStation' }
  | { type: 'move'; spaces: number }
  | { type: 'goToJail' }
  | { type: 'repairs'; perHouse: number; perHotel: number }
  | { type: 'getOutOfJailFree' };

export type CardActionType = CardAction['type'];

export interface Card {
  id: string;
  title: string;
  effect: string;
  action: CardAction;
}

/** Texto do catálogo (docs/04): frase simples ou texto com opções e complementos. */
export type TextEntry =
  | string
  | {
      text: string;
      options?: string[];
      subtitle?: string;
      hint?: string;
      disabledReason?: string;
      sellText?: string;
      after?: string;
      limit?: string;
    };

export interface Texts {
  defaultNames: string[];
  [code: string]: TextEntry | string[];
}

export interface Rules {
  version: number;
  parameters: Parameters;
  modes: Modes;
  houseRules: Record<string, HouseRule>;
  groups: Record<string, Group>;
  spaces: Space[];
  cards: Record<DeckName, Card[]>;
  texts: Texts;
}

/** Índices montados na carga, para o motor não percorrer o tabuleiro a cada ação. */
export interface RulesIndex {
  totalSpaces: number;
  startPosition: number;
  jailPosition: number;
  properties: number[];
  stations: number[];
  utilities: number[];
  /** Baralho de cada carta, pelo id. */
  cardDeck: Record<string, DeckName>;
}

export type RulesResult =
  { ok: true; rules: Rules; index: RulesIndex; errors: [] } | { ok: false; errors: string[] };
