<script lang="ts">
  // Criar sala (mockups, rodada 1): apelido, cor e modo; o código vem na sala de espera.
  import type { ModeType } from '@senhorio/engine';
  import type { ModeConfig } from '@senhorio/protocol';
  import { defaultNames, options, PAWN_COLORS, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import ColorPicker from './ColorPicker.svelte';

  let {
    busy = false,
    error = '',
    onback,
    oncreate,
  }: {
    busy?: boolean;
    error?: string;
    onback: () => void;
    oncreate: (setup: { name: string; color: string; mode: ModeConfig }) => void;
  } = $props();

  const p = rules.parameters;
  let name = $state(defaultNames[0] ?? '');
  let color = $state(PAWN_COLORS[0] ?? '');
  let type: ModeType = $state('rounds');
  let minutes = $state(rules.modes.time.defaultMinutes);
  let rounds = $state(rules.modes.rounds.default);
  const labels = options('D-24');
  const types: ModeType[] = ['classic', 'time', 'rounds'];
  const valid = $derived(name.trim().length > 0 && name.trim().length <= p.maxNameLength);

  function step(list: number[], value: number, direction: 1 | -1): number {
    const i = list.indexOf(value);
    return list[Math.min(list.length - 1, Math.max(0, i + direction))] ?? value;
  }
  function submit() {
    const limit = type === 'time' ? minutes : type === 'rounds' ? rounds : null;
    oncreate({ name: name.trim(), color, mode: { type, limit } });
  }
</script>

<div class="full-screen">
  <div class="sheet" use:focusDefault>
    <button class="back" type="button" onclick={onback}><Icon name="back" />{t('I-08')}</button>
    <div>
      <h1>{t('W-01')}</h1>
      <p class="lead">{t('W-03')}</p>
    </div>
    <div class="field">
      <label for="room-name">{t('W-04')}</label>
      <input
        id="room-name"
        class="input"
        bind:value={name}
        maxlength={p.maxNameLength}
        autocomplete="off"
      />
    </div>
    <div class="field">
      <span class="lab">{t('W-05')}</span>
      <ColorPicker bind:value={color} label={t('W-05')} />
    </div>
    <div class="field">
      <span class="lab">{t('I-63')}</span>
      <div class="segmented" role="radiogroup" aria-label={t('I-63')}>
        {#each types as option, i (option)}
          <button
            type="button"
            role="radio"
            aria-checked={type === option}
            onclick={() => (type = option)}
          >
            {labels[i]}
          </button>
        {/each}
      </div>
      {#if type !== 'classic'}
        {@const list =
          type === 'time' ? rules.modes.time.optionsMinutes : rules.modes.rounds.options}
        {@const value = type === 'time' ? minutes : rounds}
        <div class="picker" role="group" aria-label={t('I-64')}>
          <button
            type="button"
            aria-label="Menos"
            disabled={list.indexOf(value) <= 0}
            onclick={() =>
              type === 'time'
                ? (minutes = step(list, value, -1))
                : (rounds = step(list, value, -1))}><Icon name="left" /></button
          >
          <output aria-live="polite"
            >{type === 'time' ? t('I-73', { n: value }) : t('I-74', { n: value })}</output
          >
          <button
            type="button"
            aria-label="Mais"
            disabled={list.indexOf(value) >= list.length - 1}
            onclick={() =>
              type === 'time' ? (minutes = step(list, value, 1)) : (rounds = step(list, value, 1))}
            ><Icon name="right" /></button
          >
        </div>
      {/if}
    </div>
    <p class="callout"><Icon name="info" /><span>{t('W-06')}</span></p>
    {#if error}<p class="error" role="alert">{error}</p>{/if}
    <button
      class="btn gold"
      type="button"
      data-default="true"
      disabled={!valid || busy}
      onclick={submit}
    >
      {busy ? t('W-40') : t('W-01')}
    </button>
  </div>
</div>

<style>
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
    font: 600 1.25em var(--font-display);
  }
  .callout {
    margin: 0;
  }
  .error {
    margin: 0;
    color: #ffb3ab;
    font-weight: 700;
  }
</style>
