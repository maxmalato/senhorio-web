// Mede o balanceamento nos três cenários da linha de base do Roku (docs/05) e imprime a
// tabela no mesmo formato, para comparar e registrar. Sementes fixas: o resultado se repete.

import { it } from 'vitest';
import { simulateGame, summarize, type BalanceSummary } from '../src/sim/simulate';

const GAMES = Number(process.env.BALANCE_GAMES ?? 50);
const SCENARIOS = [
  { label: '4 jogadores, 30 rodadas', players: 4, mode: 'rounds' as const, limit: 30 },
  { label: '6 jogadores, 30 rodadas', players: 6, mode: 'rounds' as const, limit: 30 },
  { label: '4 jogadores, clássico', players: 4, mode: 'classic' as const },
];

const fmt = (r: BalanceSummary['rounds'], money = false) => {
  if (!r) return '—';
  const f = (n: number) => (money ? 'R$ ' + n.toLocaleString('pt-BR') : String(n));
  return `${f(r.median)} (${f(r.min)}–${f(r.max)})`;
};

it('linha de base de balanceamento', () => {
  const rows: Record<string, string[]> = {
    'Rodadas jogadas': [],
    '1º grupo completo': [],
    '1ª falência': [],
    'Dinheiro médio na rodada 20': [],
    'Sem dono na rodada 15': [],
    'Vendas simples aceitas': [],
    'Erros do motor': [],
  };
  const started = Date.now();
  SCENARIOS.forEach((scenario, si) => {
    const results = Array.from({ length: GAMES }, (_, i) =>
      simulateGame({
        players: scenario.players,
        mode: scenario.mode,
        limit: scenario.limit,
        seed: 10_000 * (si + 1) + i,
      }),
    );
    const s = summarize(results);
    const n = s.games;
    rows['Rodadas jogadas']!.push(
      fmt(s.rounds) + (s.capped ? `; ${s.capped} bateram o teto de 500` : ''),
    );
    rows['1º grupo completo']!.push(
      `Rodada ${fmt(s.firstGroup)}; nenhum grupo em ${s.noGroup}. Sinal: ${s.groupSignal}/${n}`,
    );
    rows['1ª falência']!.push(
      s.firstBankruptcy
        ? `Rodada ${fmt(s.firstBankruptcy)}; sem falência em ${s.noBankruptcy}. Sinal: ${s.bankruptcySignal}/${n}`
        : `Nenhuma. Sinal: 0/${n}`,
    );
    rows['Dinheiro médio na rodada 20']!.push(
      `${fmt(s.averageMoney, true)}. Sinal: ${s.moneySignal}/${s.moneyMeasured}`,
    );
    rows['Sem dono na rodada 15']!.push(
      `${fmt(s.unowned)}. Sinal: ${s.unownedSignal}/${s.unownedMeasured}`,
    );
    rows['Vendas simples aceitas']!.push(`${fmt(s.trades)}. Sinal: ${s.tradeSignal}/${n}`);
    rows['Erros do motor']!.push(String(s.errors));
  });
  const lines = [
    `| Medida | ${SCENARIOS.map((s) => s.label).join(' | ')} |`,
    `| --- | ${SCENARIOS.map(() => '---').join(' | ')} |`,
    ...Object.entries(rows).map(([k, v]) => `| ${k} | ${v.join(' | ')} |`),
  ];
  process.stdout.write(
    `\n${GAMES} partidas por cenário, ${((Date.now() - started) / 1000).toFixed(1)} s\n\n${lines.join('\n')}\n\n`,
  );
});
