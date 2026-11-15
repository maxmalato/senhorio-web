<script lang="ts">
  // Ordem sorteada (T-05, D-25): o banco sorteia a ordem, que não muda durante a partida (RN-004).
  import type { GameState } from '@senhorio/engine';
  import { brl, options, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';

  let { state, onback, onstart }: { state: GameState; onback: () => void; onstart: () => void } =
    $props();

  const modeText = $derived(
    state.mode.type === 'classic'
      ? t('I-78')
      : state.mode.type === 'time'
        ? t('I-79', { n: state.mode.limit ?? 0 })
        : t('I-80', { n: state.mode.limit ?? 0 }),
  );
</script>

<div class="full-screen">
  <div class="sheet" use:focusDefault>
    <button class="back" type="button" onclick={onback}><Icon name="back" />{t('I-08')}</button>
    <div>
      <p class="step">{t('I-55', { n: 3, total: 3 })}</p>
      <h1>{t('D-25')}</h1>
      <p class="lead">
        {t('I-77', { amount: brl(rules.parameters.startingMoney), mode: modeText })}
      </p>
    </div>
    <ol class="order">
      {#each state.order as i, k (i)}
        {@const player = state.players[i]}
        {#if player}
          <li>
            <span class="pos">{t('I-76', { n: k + 1 })}</span>
            <span class="avatar" style:background={player.color} aria-hidden="true"
              >{player.name.slice(0, 1).toUpperCase()}</span
            >
            <b>{player.name}</b>
            <span class="money">{brl(player.money)}</span>
          </li>
        {/if}
      {/each}
    </ol>
    <button class="btn gold" type="button" data-default="true" onclick={onstart}
      >{options('D-25')[0]}</button
    >
  </div>
</div>

<style>
  .step {
    margin: 0 0 0.3em;
    font-size: 0.78em;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--text-2);
    text-transform: uppercase;
  }
  .lead {
    margin-top: 0.4em;
  }
  .order {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5em;
  }
  li {
    display: grid;
    grid-template-columns: 2.4em auto 1fr auto;
    gap: 0.8em;
    align-items: center;
    background: var(--panel);
    border-radius: 1em;
    padding: 0.65em 0.9em;
  }
  li:first-child {
    box-shadow: inset 0 0 0 2px var(--focus);
  }
  .pos {
    font: 600 1.3em var(--font-display);
    color: var(--text-2);
    text-align: center;
  }
  li:first-child .pos {
    color: var(--focus);
  }
  b {
    font: 600 1.1em var(--font-display);
  }
  .money {
    color: var(--text-2);
    font-variant-numeric: tabular-nums;
  }
</style>
