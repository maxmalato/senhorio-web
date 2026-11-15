// Partidas automáticas e medidas de balanceamento (porta do Simulacao.brs e do
// Balanceamento.brs do Roku). Robôs não são pessoas: os números são linha de base,
// não substituem as partidas em família (docs/05, "Plano de balanceamento").

import { transition } from '../engine';
import { createRandomizer, createSeededRandom, type RandomSource } from '../random';
import { isGroupComplete } from '../rent';
import { activePlayers, createContext, newGame, roundMoney } from '../state';
import { loadDefaultRules } from '../rules/load';
import { BANK, type EngineContext, type GameEvent, type GameState, type ModeType } from '../types';
import { botDecision } from './bot';
import { checkInvariants } from './invariants';

/** Teto de rodadas para o modo clássico não girar para sempre com robôs. */
export const ROUND_CAP = 500;

/** Sinais de problema da tabela do docs/05; critérios de medição, não regras do jogo. */
export const BALANCE_SIGNALS = {
  groupAfterRound: 20, // 1º grupo completo depois da rodada 20
  bankruptcyBeforeRound: 10, // 1ª falência antes da rodada 10
  moneyRound: 20, // todos acima de R$ 3.000 depois da rodada 20
  highMoney: 3000,
  unownedRound: 15, // mais de 8 propriedades sem dono na rodada 15
  maxUnowned: 8,
} as const;

/** Medidas de uma partida; 0 = ainda não aconteceu, -1 = a partida não chegou à rodada. */
export interface Measurement {
  rounds: number;
  firstGroup: number;
  firstBankruptcy: number;
  unownedAtRound: number;
  averageAtRound: number;
  lowestAtRound: number;
  finalAverage: number;
  finalHouses: number;
  proposals: number;
  trades: number;
}

export interface SimulationResult {
  state: GameState;
  transitions: number;
  errors: string[];
  measurement: Measurement;
  end: 'winner' | 'limit' | 'cap' | 'error';
}

export interface SimulationConfig {
  players: number;
  mode: ModeType;
  limit?: number;
  seed: number;
  ctx?: EngineContext;
}

/** Joga uma partida até o fim, um erro ou o teto de rodadas, medindo a cada rodada. */
export function simulateGame(config: SimulationConfig): SimulationResult {
  const ctx =
    config.ctx ??
    createContext(loadDefaultRules(), createRandomizer(createSeededRandom(config.seed)));
  const botRandom: RandomSource = createSeededRandom(config.seed ^ 0x5eed);
  const created = newGame(
    {
      players: Array.from({ length: config.players }, (_, i) => ({
        name: `Robô ${i + 1}`,
        color: `cor${i}`,
      })),
      mode: { type: config.mode, limit: config.mode === 'classic' ? null : (config.limit ?? 30) },
    },
    ctx,
  );
  if (!created.ok) throw new Error(`newGame recusou: ${created.reason.code}`);

  let state = created.state;
  const measurement = newMeasurement();
  const errors: string[] = [];
  let transitions = 0;

  while (state.phase !== 'GAME_OVER' && state.round <= ROUND_CAP && errors.length === 0) {
    const roundBefore = state.round;
    const action = botDecision(state, ctx, botRandom);
    const result = transition(state, action, ctx);
    transitions++;
    if (!result.ok) {
      errors.push(`${action.type} recusada em ${state.phase}: ${JSON.stringify(result.reason)}`);
      break;
    }
    state = result.state;
    errors.push(...checkInvariants(state, ctx));
    recordEvents(measurement, result.events, state);
    // a rodada fechou (ou a partida acabou): retrato do tabuleiro
    if (state.round !== roundBefore || state.phase === 'GAME_OVER') {
      closeRound(measurement, snapshot(state, ctx), roundBefore);
    }
  }

  let end: SimulationResult['end'] = 'winner';
  if (errors.length > 0) end = 'error';
  else if (state.phase !== 'GAME_OVER') end = 'cap';
  else if (activePlayers(state).length > 1) end = 'limit';
  return { state, transitions, errors, measurement, end };
}

function newMeasurement(): Measurement {
  return {
    rounds: 0,
    firstGroup: 0,
    firstBankruptcy: 0,
    unownedAtRound: -1,
    averageAtRound: -1,
    lowestAtRound: -1,
    finalAverage: 0,
    finalHouses: 0,
    proposals: 0,
    trades: 0,
  };
}

/** Falências e vendas simples saem dos eventos de cada transição. */
function recordEvents(m: Measurement, events: GameEvent[], state: GameState): void {
  for (const event of events) {
    if (event.type === 'WentBankrupt' && m.firstBankruptcy === 0) {
      m.firstBankruptcy = state.players[event.player]?.exitRound ?? 0;
    } else if (event.type === 'TradeAnswered') {
      m.proposals++;
      if (event.accepted) m.trades++;
    }
  }
}

interface Snapshot {
  groups: number;
  houses: number;
  unowned: number;
  balances: number[];
}

/** Grupos completos, casas (hotel = 5), propriedades sem dono e saldos dos ativos. */
function snapshot(state: GameState, ctx: EngineContext): Snapshot {
  let groups = 0;
  for (const [name, group] of Object.entries(ctx.rules.groups)) {
    const owner = state.properties[String(group.positions[0])]?.owner ?? BANK;
    if (owner !== BANK && isGroupComplete(state, name, owner, ctx)) groups++;
  }
  let houses = 0;
  let unowned = 0;
  for (const position of ctx.index.properties) {
    const property = state.properties[String(position)];
    if (!property) continue;
    if (property.owner === BANK) unowned++;
    houses += property.houses;
  }
  const balances = activePlayers(state).map((i) => state.players[i]?.money ?? 0);
  return { groups, houses, unowned, balances };
}

function closeRound(m: Measurement, snap: Snapshot, round: number): void {
  m.rounds = round;
  if (snap.groups > 0 && m.firstGroup === 0) m.firstGroup = round;
  if (round === BALANCE_SIGNALS.unownedRound) m.unownedAtRound = snap.unowned;
  const average = snap.balances.length
    ? roundMoney(snap.balances.reduce((a, b) => a + b, 0) / snap.balances.length)
    : 0;
  if (round === BALANCE_SIGNALS.moneyRound) {
    m.averageAtRound = average;
    m.lowestAtRound = snap.balances.length ? Math.min(...snap.balances) : 0;
  }
  m.finalAverage = average;
  m.finalHouses = snap.houses;
}

/** Mediana, menor e maior; null para lista vazia. */
export function range(values: number[]): { median: number; min: number; max: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const median =
    n % 2 === 1
      ? (sorted[(n - 1) / 2] as number)
      : roundMoney(((sorted[n / 2 - 1] as number) + (sorted[n / 2] as number)) / 2);
  return { median, min: sorted[0] as number, max: sorted[n - 1] as number };
}

export interface BalanceSummary {
  games: number;
  rounds: ReturnType<typeof range>;
  capped: number;
  firstGroup: ReturnType<typeof range>;
  noGroup: number;
  groupSignal: number;
  firstBankruptcy: ReturnType<typeof range>;
  noBankruptcy: number;
  bankruptcySignal: number;
  averageMoney: ReturnType<typeof range>;
  moneySignal: number;
  moneyMeasured: number;
  unowned: ReturnType<typeof range>;
  unownedSignal: number;
  unownedMeasured: number;
  trades: ReturnType<typeof range>;
  tradeSignal: number;
  errors: number;
}

/** Resumo de várias partidas: mediana, faixa e quantas acenderam cada sinal do docs/05. */
export function summarize(results: SimulationResult[]): BalanceSummary {
  const s = BALANCE_SIGNALS;
  const m = results.map((r) => r.measurement);
  const groups = m.filter((x) => x.firstGroup > 0).map((x) => x.firstGroup);
  const bankruptcies = m.filter((x) => x.firstBankruptcy > 0).map((x) => x.firstBankruptcy);
  const money = m.filter((x) => x.averageAtRound >= 0);
  const unowned = m.filter((x) => x.unownedAtRound >= 0);
  return {
    games: results.length,
    rounds: range(m.map((x) => x.rounds)),
    capped: results.filter((r) => r.end === 'cap').length,
    firstGroup: range(groups),
    noGroup: m.length - groups.length,
    // passou da rodada do sinal sem nenhum grupo também é sinal
    groupSignal: m.filter((x) =>
      x.firstGroup > 0 ? x.firstGroup > s.groupAfterRound : x.rounds > s.groupAfterRound,
    ).length,
    firstBankruptcy: range(bankruptcies),
    noBankruptcy: m.length - bankruptcies.length,
    bankruptcySignal: bankruptcies.filter((r) => r < s.bankruptcyBeforeRound).length,
    averageMoney: range(money.map((x) => x.averageAtRound)),
    moneySignal: money.filter((x) => x.lowestAtRound > s.highMoney).length,
    moneyMeasured: money.length,
    unowned: range(unowned.map((x) => x.unownedAtRound)),
    unownedSignal: unowned.filter((x) => x.unownedAtRound > s.maxUnowned).length,
    unownedMeasured: unowned.length,
    trades: range(m.map((x) => x.trades)),
    tradeSignal: m.filter((x) => x.trades === 0).length,
    errors: results.filter((r) => r.end === 'error').length,
  };
}
