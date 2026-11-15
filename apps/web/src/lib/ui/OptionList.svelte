<script lang="ts" module>
  import type { IconName } from './icons';
  export interface Option {
    id: string | number;
    name: string;
    sub?: string;
    value?: string;
    color?: string;
    icon?: IconName;
    disabled?: boolean;
    danger?: boolean;
  }
</script>

<script lang="ts">
  import Icon from './Icon.svelte';
  // Lista selecionável (C-04): opção em foco com contorno dourado; desabilitada esmaecida,
  // com o motivo na linha de baixo (docs/04).
  let {
    items,
    selected = null,
    label,
    onselect,
  }: {
    items: Option[];
    selected?: string | number | null;
    label: string;
    onselect: (item: Option) => void;
  } = $props();
</script>

<div class="opts" role="listbox" aria-label={label}>
  {#each items as item (item.id)}
    <button
      class="opt"
      class:icon={!!item.icon}
      class:danger={item.danger}
      class:selected={selected === item.id}
      type="button"
      role="option"
      aria-selected={selected === item.id}
      disabled={item.disabled}
      data-default={selected === item.id ? 'true' : undefined}
      onclick={() => onselect(item)}
    >
      <span class="sw" style:background={item.color || undefined}>
        {#if item.icon}<Icon name={item.icon} />{/if}
      </span>
      <b>{item.name}</b>
      <span class="val">{item.value ?? ''}</span>
      {#if item.sub}<small>{item.sub}</small>{/if}
    </button>
  {/each}
</div>

<style>
  .opts {
    display: grid;
    gap: 0.3em;
  }
  .opt {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0.05em 0.7em;
    align-items: center;
    text-align: left;
    background: var(--card-3);
    border: 2px solid transparent;
    border-radius: 0.7em;
    padding: 0.45em 0.7em;
    cursor: pointer;
    color: var(--ink);
    line-height: 1.25;
    min-height: 2.9em;
  }
  .sw {
    width: 0.8em;
    height: 1.9em;
    border-radius: 0.25em;
    grid-row: span 2;
    background: #9aa6bb;
  }
  .icon .sw {
    display: grid;
    place-items: center;
    width: 1.9em;
    background: var(--night);
    color: #fff;
    border-radius: 0.5em;
  }
  .icon .sw :global(svg) {
    width: 1.05em;
    height: 1.05em;
  }
  b {
    font-weight: 800;
  }
  .danger b {
    color: #a8322a;
  }
  .val {
    font: 600 1em var(--font-display);
    font-variant-numeric: tabular-nums;
  }
  small {
    grid-column: 2 / 4;
    color: var(--ink-2);
    font-size: 0.82em;
  }
  .selected {
    border-color: var(--ink);
    background: #fff;
  }
  .opt:focus-visible {
    outline: 0.2em solid var(--focus);
    outline-offset: 0.1em;
  }
  .opt:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
