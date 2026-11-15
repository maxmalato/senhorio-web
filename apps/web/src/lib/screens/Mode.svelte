<script lang="ts" module>
  import type { ModeType } from '@senhorio/engine';
  export interface ModeSetup {
    type: ModeType;
    minutes: number;
    rounds: number;
  }
</script>

<script lang="ts">
  // Modo de partida (T-04, D-24): opções prontas do arquivo de regras, sem digitar números.
  import { options, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';

  let {
    mode = $bindable(),
    onback,
    onnext,
  }: { mode: ModeSetup; onback: () => void; onnext: () => void } = $props();

  const modes = rules.modes;
  const labels = options('D-24');
  const types: ModeType[] = ['classic', 'time', 'rounds'];
  const descriptions: Record<ModeType, string> = {
    classic: t('I-69'),
    time: t('I-70'),
    rounds: t('I-71'),
  };

  function cycle(list: number[], value: number, direction: 1 | -1): number {
    const i = list.indexOf(value);
    return list[Math.min(list.length - 1, Math.max(0, (i === -1 ? 0 : i) + direction))] ?? value;
  }
</script>

<div class="full-screen">
  <div class="sheet" use:focusDefault>
    <button class="back" type="button" onclick={onback}><Icon name="back" />{t('I-08')}</button>
    <div>
      <p class="step">{t('I-55', { n: 2, total: 3 })}</p>
      <h1>{t('D-24')}</h1>
    </div>
    <div class="segmented" role="radiogroup" aria-label={t('I-63')}>
      {#each types as type, i (type)}
        <button
          type="button"
          role="radio"
          aria-checked={mode.type === type}
          onclick={() => (mode.type = type)}
        >
          {labels[i]}
        </button>
      {/each}
    </div>
    <p class="lead">{descriptions[mode.type]}</p>
    {#if mode.type !== 'classic'}
      {@const list = mode.type === 'time' ? modes.time.optionsMinutes : modes.rounds.options}
      {@const value = mode.type === 'time' ? mode.minutes : mode.rounds}
      <div class="picker" role="group" aria-label={t('I-64')}>
        <button
          type="button"
          aria-label="Menos"
          disabled={list.indexOf(value) <= 0}
          onclick={() =>
            mode.type === 'time'
              ? (mode.minutes = cycle(list, value, -1))
              : (mode.rounds = cycle(list, value, -1))}><Icon name="left" /></button
        >
        <output aria-live="polite"
          >{mode.type === 'time' ? t('I-73', { n: value }) : t('I-74', { n: value })}</output
        >
        <button
          type="button"
          aria-label="Mais"
          disabled={list.indexOf(value) >= list.length - 1}
          onclick={() =>
            mode.type === 'time'
              ? (mode.minutes = cycle(list, value, 1))
              : (mode.rounds = cycle(list, value, 1))}><Icon name="right" /></button
        >
      </div>
    {:else}
      <p class="callout">
        <Icon name="info" /><span
          >{t('I-72')}. Com muitos jogadores, a partida pode levar horas.</span
        >
      </p>
    {/if}
    <button class="btn gold" type="button" data-default="true" onclick={onnext}>{t('I-62')}</button>
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
  .picker {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    background: var(--panel);
    border-radius: 0.8em;
    padding: 0.3em;
  }
  .picker button {
    width: 2.8em;
    height: 2.8em;
    border: 0;
    border-radius: 0.6em;
    background: var(--panel-2);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .picker button:disabled {
    opacity: 0.4;
  }
  .picker button :global(svg) {
    width: 1.1em;
    height: 1.1em;
  }
  output {
    text-align: center;
    font: 600 1.35em var(--font-display);
  }
  .callout {
    margin: 0;
  }
</style>
