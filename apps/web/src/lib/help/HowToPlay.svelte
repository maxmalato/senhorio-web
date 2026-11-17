<script lang="ts">
  // "Como jogar": as regras principais em poucas linhas (docs/02). Textos e valores vêm do
  // arquivo de regras, então o resumo acompanha qualquer mudança de valor.
  import { brl, extra, options, rules, t } from '../rules';

  let { heading = 'h1' }: { heading?: 'h1' | 'h2' } = $props();

  const p = rules.parameters;
  const percent = (value: number) => Math.round(value * 100);
  // espaço que não quebra entre "R$" e o número (o valor nunca fica partido em duas linhas)
  const money = (amount: number) => brl(amount).replace(' ', '\u00a0');
  const vars = {
    startingMoney: money(p.startingMoney),
    passStartBonus: money(p.passStartBonus),
    station1: money(p.stationRent[0] ?? 0),
    station4: money(p.stationRent[p.stationRent.length - 1] ?? 0),
    utility1: p.utilityMultiplier[0] ?? 0,
    utility2: p.utilityMultiplier[1] ?? 0,
    maxHouses: p.maxHouses,
    salePercent: percent(p.houseSaleFactor),
    bail: money(p.bail),
    maxJailTurns: p.maxJailTurns,
    incomeTax: money(p.incomeTax),
    luxuryTax: money(p.luxuryTax),
    mortgagePercent: percent(p.mortgageFactor),
    interestPercent: percent(p.mortgageInterest),
    maxProposals: p.maxProposalsPerTurn,
  };
  // seções sempre um nível abaixo do título (ordem dos títulos para leitores de tela)
  const sectionHeading = $derived(heading === 'h1' ? 'h2' : 'h3');
  const SECTIONS = ['A-02', 'A-03', 'A-04', 'A-05', 'A-06', 'A-07', 'A-08', 'A-09'];
</script>

<div class="how">
  <svelte:element this={heading} class="title">{t('A-01')}</svelte:element>
  <p class="lead">{extra('A-01', 'subtitle')}</p>
  {#each SECTIONS as code (code)}
    <section>
      <svelte:element this={sectionHeading} class="section-title">{t(code)}</svelte:element>
      <ul>
        {#each options(code, vars) as line, i (i)}
          <li>{line}</li>
        {/each}
      </ul>
    </section>
  {/each}
</div>

<style>
  .how {
    display: grid;
    gap: 1em;
  }
  .title {
    margin: 0;
    font: 600 1.9em/1.1 var(--font-display);
  }
  .lead {
    margin: -0.4em 0 0;
    color: var(--text-2);
  }
  section {
    background: var(--panel);
    border-radius: 1em;
    padding: 0.9em 1.1em;
  }
  .section-title {
    margin: 0 0 0.4em;
    font: 600 1.15em var(--font-display);
    color: var(--focus);
  }
  ul {
    margin: 0;
    padding-left: 1.1em;
    display: grid;
    gap: 0.35em;
    line-height: 1.45;
  }
</style>
