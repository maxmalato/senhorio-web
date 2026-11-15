// Validação do rules.json (porta do Regras.brs do Roku). Arquivo inválido nunca chega ao
// motor: a carga devolve a lista de erros, em português, citando o item com problema (CT-44).
// Nenhum valor de jogo fica aqui; só se confere o formato do arquivo.

import type {
  CardActionType,
  DeckName,
  Parameters,
  Rules,
  RulesIndex,
  RulesResult,
  SpaceType,
} from './types';

type Obj = Record<string, unknown>;

const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isObject = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v !== '';
const isNumberList = (v: unknown, size = 0): v is number[] =>
  Array.isArray(v) && v.length > 0 && (size === 0 || v.length === size) && v.every(isNumber);

/** Parâmetros que o motor lê; todos precisam existir e ser números. */
export const REQUIRED_PARAMETERS = [
  'startingMoney',
  'passStartBonus',
  'bail',
  'maxJailTurns',
  'incomeTax',
  'luxuryTax',
  'maxHouses',
  'fullGroupMultiplier',
  'houseSaleFactor',
  'mortgageFactor',
  'mortgageInterest',
  'tradeStep',
  'maxProposalsPerTurn',
  'maxConsecutiveDoubles',
  'cardsPerDeck',
  'diceFaces',
  'minPlayers',
  'maxPlayers',
  'maxNameLength',
] as const satisfies readonly (keyof Parameters)[];

/** Regras próprias que o motor já sabe aplicar; ligar outra no arquivo é erro. */
export const SUPPORTED_HOUSE_RULES: readonly string[] = ['RP-03'];

const SPACE_TYPES: readonly SpaceType[] = [
  'start',
  'street',
  'station',
  'utility',
  'tax',
  'chance',
  'setback',
  'jail',
  'rest',
  'goToJail',
];

/** Campos numéricos obrigatórios de cada tipo de carta. */
const CARD_ACTION_FIELDS: Record<CardActionType, readonly string[]> = {
  receiveFromBank: ['amount'],
  payToBank: ['amount'],
  collectFromEachPlayer: ['amount'],
  payEachPlayer: ['amount'],
  goTo: ['destination'],
  nearestStation: [],
  move: ['spaces'],
  goToJail: [],
  repairs: ['perHouse', 'perHotel'],
  getOutOfJailFree: [],
};

const DECKS: readonly DeckName[] = ['chance', 'setback'];

/** Códigos de texto que a interface usa (catálogo do docs/04); faltar algum é erro. */
export function requiredTextCodes(): string[] {
  const codes: string[] = [];
  const series = [
    { prefix: 'D-', total: 26 },
    { prefix: 'M-', total: 18 },
    { prefix: 'H-', total: 26 },
    { prefix: 'I-', total: 91 },
  ];
  for (const { prefix, total } of series) {
    for (let i = 1; i <= total; i++) {
      const code = prefix + String(i).padStart(2, '0');
      if (code !== 'D-17') codes.push(code); // a D-17 tem as letras a, b e c
    }
  }
  codes.push('D-17a', 'D-17b', 'D-17c', 'D-19b');
  return codes;
}

export function validateRules(raw: unknown): RulesResult {
  const errors: string[] = [];
  if (!isObject(raw)) return { ok: false, errors: ['o arquivo de regras não é um objeto JSON'] };

  if (!isNumber(raw.version)) errors.push('falta "version" (número)');

  // --- parâmetros ---
  const p = raw.parameters;
  if (!isObject(p)) {
    errors.push('falta o bloco "parameters"');
    return { ok: false, errors };
  }
  for (const name of REQUIRED_PARAMETERS) {
    if (!isNumber(p[name])) errors.push(`parameters.${name} ausente ou não numérico`);
  }

  // --- regras próprias ---
  const houseRules = raw.houseRules;
  if (!isObject(houseRules)) {
    errors.push('falta o bloco "houseRules"');
  } else {
    for (const [code, rule] of Object.entries(houseRules)) {
      const active = isObject(rule) ? rule.active : undefined;
      if (typeof active !== 'boolean') {
        errors.push(`houseRules.${code}.active deve ser true ou false`);
      } else if (active && !SUPPORTED_HOUSE_RULES.includes(code)) {
        errors.push(`${code} está ligada, mas ainda não é suportada pelo motor`);
      }
    }
  }

  // --- grupos ---
  let groups: Obj = {};
  if (!isObject(raw.groups) || Object.keys(raw.groups).length === 0) {
    errors.push('falta o bloco "groups"');
  } else {
    groups = raw.groups;
  }
  for (const [key, group] of Object.entries(groups)) {
    const g = isObject(group) ? group : {};
    if (!isNumber(g.houseCost)) errors.push(`groups.${key}.houseCost ausente ou não numérico`);
    if (!isNumberList(g.positions))
      errors.push(`groups.${key}.positions deve ser uma lista de posições`);
  }

  // --- casas do tabuleiro ---
  let spaces: unknown[] = [];
  if (!Array.isArray(raw.spaces) || raw.spaces.length === 0) {
    errors.push('falta a lista "spaces"');
  } else {
    spaces = raw.spaces;
  }
  const index: RulesIndex = {
    totalSpaces: spaces.length,
    startPosition: -1,
    jailPosition: -1,
    properties: [],
    stations: [],
    utilities: [],
    cardDeck: {},
  };
  // básico, 1 a maxHouses casas e hotel
  const rentSize = isNumber(p.maxHouses) ? p.maxHouses + 2 : -1;

  spaces.forEach((space, i) => {
    const label = isObject(space) && isText(space.name) ? `casa ${i} (${space.name})` : `casa ${i}`;
    if (!isObject(space)) {
      errors.push(`${label}: formato inválido`);
      return;
    }
    if (space.position !== i) {
      errors.push(`${label}: "position" deve ser ${i} (casas em ordem, a partir de 0)`);
      return;
    }
    const type = space.type;
    if (typeof type !== 'string' || !SPACE_TYPES.includes(type as SpaceType)) {
      errors.push(`${label}: tipo desconhecido "${String(type)}"`);
      return;
    }

    if (type === 'street' || type === 'station' || type === 'utility') {
      index.properties.push(i);
      if (!isNumber(space.price) || space.price <= 0) errors.push(`${label}: falta o preço`);
    }
    // o tabuleiro mostra o preço das ruas e o rótulo curto das outras casas
    if (type !== 'street' && !isText(space.label)) {
      errors.push(`${label}: falta o "label" curto do tabuleiro`);
    }

    switch (type) {
      case 'street': {
        const groupKey = typeof space.group === 'string' ? space.group : '';
        const group = groups[groupKey];
        if (!isObject(group)) {
          errors.push(`${label}: grupo "${groupKey}" não existe em groups`);
        } else if (!isNumberList(group.positions) || !group.positions.includes(i)) {
          errors.push(`${label}: não aparece em groups.${groupKey}.positions`);
        }
        if (!isNumberList(space.rent, rentSize)) {
          errors.push(
            `${label}: rua sem aluguel válido (lista de ${rentSize} valores: básico, 1 a ${rentSize - 2} casas e hotel)`,
          );
        }
        break;
      }
      case 'station':
        index.stations.push(i);
        break;
      case 'utility':
        index.utilities.push(i);
        break;
      case 'tax': {
        const param = typeof space.taxParameter === 'string' ? space.taxParameter : '';
        if (!isNumber(p[param])) {
          errors.push(`${label}: parâmetro de imposto "${param}" não existe`);
        }
        break;
      }
      case 'start':
        index.startPosition = i;
        break;
      case 'jail':
        index.jailPosition = i;
        break;
    }
  });

  // RN-005/RN-013: a Partida é a casa 0, onde todos começam
  if (spaces.length > 0 && index.startPosition !== 0)
    errors.push('a casa 0 deve ser do tipo "start"');
  if (spaces.length > 0 && index.jailPosition < 0) errors.push('falta uma casa do tipo "jail"');

  // toda posição de grupo precisa ser uma rua daquele grupo
  for (const [key, group] of Object.entries(groups)) {
    if (!isObject(group) || !Array.isArray(group.positions)) continue;
    for (const position of group.positions) {
      const space = isNumber(position) ? spaces[position] : undefined;
      if (!isNumber(position) || position < 0 || position >= spaces.length) {
        errors.push(`groups.${key}: posição inválida`);
      } else if (!isObject(space) || space.type !== 'street' || space.group !== key) {
        errors.push(`groups.${key}: a casa ${position} não é rua deste grupo`);
      }
    }
  }

  // RN-044/RN-045: uma tabela de aluguel por quantidade de estações e companhias
  if (!isNumberList(p.stationRent, index.stations.length)) {
    errors.push(
      `parameters.stationRent deve ter ${index.stations.length} valores (um por estação)`,
    );
  }
  if (!isNumberList(p.utilityMultiplier, index.utilities.length)) {
    errors.push(
      `parameters.utilityMultiplier deve ter ${index.utilities.length} valores (um por companhia)`,
    );
  }

  // --- modos de partida: opções em lista e um padrão que está na lista ---
  const modes = raw.modes;
  if (!isObject(modes) || !isObject(modes.time) || !isObject(modes.rounds)) {
    errors.push('falta o bloco "modes" com time e rounds');
  } else {
    const { time, rounds } = modes;
    if (
      !isNumberList(time.optionsMinutes) ||
      !time.optionsMinutes.includes(time.defaultMinutes as number)
    ) {
      errors.push('modes.time: optionsMinutes e defaultMinutes inválidos');
    }
    if (!isNumberList(rounds.options) || !rounds.options.includes(rounds.default as number)) {
      errors.push('modes.rounds: options e default inválidos');
    }
  }

  // --- textos da interface (catálogo D-xx, M-xx, H-xx e I-xx do docs/04) ---
  const texts = raw.texts;
  if (!isObject(texts)) {
    errors.push('falta o bloco "texts"');
  } else {
    for (const code of requiredTextCodes()) {
      const entry = texts[code];
      const text = isObject(entry) ? entry.text : entry;
      if (!isText(text)) errors.push(`falta o texto ${code}`);
    }
    if (!Array.isArray(texts.defaultNames) || !texts.defaultNames.every(isText)) {
      errors.push('texts.defaultNames deve ser uma lista de nomes');
    }
  }

  // --- cartas ---
  const cards = isObject(raw.cards) ? raw.cards : undefined;
  if (!cards) errors.push('falta o bloco "cards"');
  for (const deck of DECKS) {
    const list = cards?.[deck];
    if (!cards) break;
    if (!Array.isArray(list)) {
      errors.push(`falta o baralho cards.${deck}`);
      continue;
    }
    if (isNumber(p.cardsPerDeck) && list.length !== p.cardsPerDeck) {
      errors.push(`cards.${deck} deve ter ${p.cardsPerDeck} cartas`);
    }
    for (const card of list) validateCard(card, deck, index, errors);
  }

  if (errors.length > 0) return { ok: false, errors };
  // Formato conferido acima: a partir daqui o objeto pode ser tratado como Rules.
  return { ok: true, rules: raw as unknown as Rules, index, errors: [] };
}

function validateCard(card: unknown, deck: DeckName, index: RulesIndex, errors: string[]): void {
  if (!isObject(card) || !isText(card.id)) {
    errors.push(`cards.${deck}: carta sem "id"`);
    return;
  }
  const label = `carta ${card.id}`;
  if (index.cardDeck[card.id]) errors.push(`${label}: id repetido`);
  index.cardDeck[card.id] = deck;

  const action = card.action;
  const type = isObject(action) ? action.type : undefined;
  if (!isObject(action) || typeof type !== 'string' || !(type in CARD_ACTION_FIELDS)) {
    errors.push(`${label}: action.type desconhecido "${String(type)}"`);
    return;
  }
  for (const field of CARD_ACTION_FIELDS[type as CardActionType]) {
    if (!isNumber(action[field])) errors.push(`${label}: falta action.${field}`);
  }
  if (type === 'goTo' && isNumber(action.destination)) {
    if (action.destination < 0 || action.destination >= index.totalSpaces) {
      errors.push(`${label}: destino fora do tabuleiro`);
    }
  }
}
