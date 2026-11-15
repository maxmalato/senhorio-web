<script lang="ts">
  // Seletor de valor (C-05): ◀ ▶ ajustam um passo; segurando, depois de ~1 s, o passo rápido.
  import Icon from './Icon.svelte';

  let {
    value = $bindable(),
    min,
    max,
    step,
    fastStep = step,
    format = (v: number) => String(v),
    label,
    light = false,
  }: {
    value: number;
    min: number;
    max: number;
    step: number;
    fastStep?: number;
    format?: (v: number) => string;
    label: string;
    light?: boolean;
  } = $props();

  let holdTimer: ReturnType<typeof setTimeout> | null = null;
  let repeatTimer: ReturnType<typeof setInterval> | null = null;

  function change(direction: 1 | -1, amount = step) {
    value = Math.min(max, Math.max(min, value + direction * amount));
  }
  function startHold(direction: 1 | -1) {
    stopHold();
    holdTimer = setTimeout(() => {
      repeatTimer = setInterval(() => change(direction, fastStep), 180);
    }, 1000);
  }
  function stopHold() {
    if (holdTimer) clearTimeout(holdTimer);
    if (repeatTimer) clearInterval(repeatTimer);
    holdTimer = repeatTimer = null;
  }
  function onkeydown(event: KeyboardEvent) {
    // ◀ ▶ mudam o valor; ▲ ▼ seguem para as outras opções
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      event.stopPropagation();
      change(event.key === 'ArrowRight' ? 1 : -1, event.repeat ? fastStep : step);
    }
  }
</script>

<div class="stepper" class:light role="group" aria-label={label}>
  <button
    type="button"
    aria-label="Diminuir"
    disabled={value <= min}
    data-skip-arrows="true"
    onclick={() => change(-1)}
    onpointerdown={() => startHold(-1)}
    onpointerup={stopHold}
    onpointerleave={stopHold}
  >
    <Icon name="left" />
  </button>
  <div
    class="value"
    role="spinbutton"
    tabindex="0"
    aria-label={label}
    aria-valuenow={value}
    aria-valuemin={min}
    aria-valuemax={max}
    aria-valuetext={format(value)}
    {onkeydown}
  >
    {format(value)}
  </div>
  <button
    type="button"
    aria-label="Aumentar"
    disabled={value >= max}
    data-skip-arrows="true"
    onclick={() => change(1)}
    onpointerdown={() => startHold(1)}
    onpointerup={stopHold}
    onpointerleave={stopHold}
  >
    <Icon name="right" />
  </button>
</div>

<style>
  .stepper {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    background: var(--panel);
    border-radius: 0.8em;
    padding: 0.3em;
    gap: 0.3em;
  }
  .stepper.light {
    background: var(--card-3);
    color: var(--ink);
  }
  button {
    width: 2.8em;
    height: 2.8em;
    border: 0;
    border-radius: 0.6em;
    background: var(--panel-2);
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .light button {
    background: #fff;
    color: var(--ink);
  }
  button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  button :global(svg) {
    width: 1.1em;
    height: 1.1em;
  }
  .value {
    text-align: center;
    font: 600 1.35em var(--font-display);
    font-variant-numeric: tabular-nums;
    border-radius: 0.5em;
    padding: 0.2em;
  }
  .value:focus-visible {
    outline: 3px solid var(--focus);
  }
</style>
