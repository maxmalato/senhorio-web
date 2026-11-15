<script lang="ts">
  // Fim de partida (T-22, D-26): classificação por patrimônio (RN-111, RN-112, RN-114).
  import { netWorth, type EngineContext, type GameState } from '@senhorio/engine';
  import { brl, options, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';

  let {
    state,
    ctx,
    onagain,
    onexit,
  }: { state: GameState; ctx: EngineContext; onagain: () => void; onexit: () => void } = $props();

  const ranking = $derived(state.ranking ?? []);
  const winner = $derived(state.players[ranking[0]?.player ?? 0]);
  const modeLabel = $derived(
    (state.mode.type === 'classic'
      ? t('I-89')
      : state.mode.type === 'time'
        ? t('I-90')
        : t('I-91')
    ).toUpperCase(),
  );
</script>

<div class="full-screen">
  <div class="sheet split" use:focusDefault>
    <div class="span title">
      <span class="crown"><Icon name="crown" /></span>
      <span class="eyebrow">{t('I-81', { mode: modeLabel, n: state.round })}</span>
      <h1>{t('D-26', { winner: winner?.name ?? '' })}</h1>
    </div>
    <ol class="rank">
      {#each ranking as entry, k (entry.player)}
        {@const player = state.players[entry.player]}
        {@const parts = netWorth(state, entry.player, ctx)}
        {#if player}
          <li class:first={k === 0} class:out={entry.bankrupt}>
            <span class="pos">{t('I-76', { n: k + 1 })}</span>
            <span class="avatar" style:background={player.color} aria-hidden="true"
              >{player.name.slice(0, 1).toUpperCase()}</span
            >
            <span class="nm">{player.name}</span>
            <span class="total">{entry.bankrupt ? t('I-84') : brl(entry.netWorth)}</span>
            <span class="parts">
              {#if entry.bankrupt}
                {t('I-83', { n: entry.exitRound })}
              {:else}
                {t('I-82', {
                  money: brl(parts.money),
                  properties: brl(parts.properties),
                  houses: parts.houses ? brl(parts.houses) : t('I-84'),
                })}
              {/if}
            </span>
          </li>
        {/if}
      {/each}
    </ol>
    <div class="actions">
      <button class="btn gold" type="button" data-default="true" onclick={onagain}
        >{options('D-26')[0]}</button
      >
      <button class="btn ghost" type="button" onclick={onexit}>{options('D-26')[1]}</button>
    </div>
  </div>
</div>

<style>
  .title {
    display: grid;
    justify-items: center;
    gap: 0.4em;
    text-align: center;
  }
  .crown :global(svg) {
    width: 2.6em;
    height: 2.6em;
    color: var(--focus);
  }
  .eyebrow {
    font-size: 0.75em;
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--text-2);
  }
  .rank {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.55em;
  }
  li {
    display: grid;
    grid-template-columns: 2.2em auto 1fr auto;
    gap: 0.2em 0.8em;
    align-items: center;
    background: var(--panel);
    border-radius: 1em;
    padding: 0.75em 1em;
  }
  li.first {
    background: var(--panel-2);
    box-shadow: inset 0 0 0 2px var(--focus);
  }
  li.out {
    opacity: 0.65;
  }
  .pos {
    font: 600 1.4em var(--font-display);
    color: var(--text-2);
    text-align: center;
  }
  li.first .pos {
    color: var(--focus);
  }
  .nm {
    font: 600 1.15em var(--font-display);
  }
  .total {
    font: 600 1.25em var(--font-display);
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .parts {
    grid-column: 3 / 5;
    color: var(--text-2);
    font-size: 0.82em;
  }
  .actions {
    display: grid;
    gap: 0.7em;
    align-content: start;
  }
</style>
