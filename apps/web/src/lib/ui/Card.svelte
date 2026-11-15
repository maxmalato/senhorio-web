<script lang="ts">
  // Cartão central (C-01): toda decisão do turno aparece aqui.
  import type { Snippet } from 'svelte';
  import { focusDefault } from './focus';
  import Icon from './Icon.svelte';

  let {
    eyebrow = '',
    title,
    tone = 'dark',
    color = '',
    label = '',
    onminimize,
    children,
  }: {
    eyebrow?: string;
    title: string;
    tone?: 'dark' | 'chance' | 'setback';
    color?: string;
    label?: string;
    onminimize?: () => void;
    children: Snippet;
  } = $props();
</script>

<div class="card" role="dialog" aria-label={label || title} use:focusDefault>
  <div class="head {tone}" style:background={color || undefined}>
    {#if eyebrow}<div class="eyebrow">{eyebrow}</div>{/if}
    <h2>{title}</h2>
    {#if onminimize}
      <button
        class="mini"
        type="button"
        aria-label="Minimizar e ver o tabuleiro"
        data-skip-arrows="true"
        onclick={onminimize}
      >
        <Icon name="minimize" />
      </button>
    {/if}
  </div>
  <div class="body">
    {@render children()}
  </div>
</div>

<style>
  .card {
    width: min(27em, 92%);
    max-height: calc(100% - 1.2em);
    display: flex;
    flex-direction: column;
    background: var(--card);
    color: var(--ink);
    border-radius: 1em;
    box-shadow: 0 0.8em 2.4em rgba(10, 20, 40, 0.35);
    overflow: hidden;
    z-index: 5;
  }
  .head {
    padding: 0.85em 3em 0.9em 1.1em;
    color: #fff;
    position: relative;
    background: var(--panel);
    flex: none;
  }
  .head.chance {
    background: var(--chance);
  }
  .head.setback {
    background: var(--setback);
  }
  .eyebrow {
    font-size: 0.68em;
    font-weight: 800;
    letter-spacing: 0.1em;
    opacity: 0.9;
    text-transform: uppercase;
  }
  h2 {
    margin: 0.12em 0 0;
    font: 600 1.4em/1.12 var(--font-display);
    text-wrap: balance;
  }
  .mini {
    position: absolute;
    top: 0.6em;
    right: 0.6em;
    width: 2.2em;
    height: 2.2em;
    border-radius: 0.6em;
    border: 0;
    background: rgba(255, 255, 255, 0.18);
    color: #fff;
    cursor: pointer;
    display: grid;
    place-items: center;
  }
  .mini :global(svg) {
    width: 1.05em;
    height: 1.05em;
  }
  .body {
    padding: 0.9em 1.1em 1em;
    display: grid;
    gap: 0.7em;
    overflow: auto;
    min-height: 0;
  }
  .body :global(.actions) {
    display: grid;
    gap: 0.55em;
  }
  .body :global(.sub) {
    margin: 0;
    color: var(--ink-2);
    font-size: 0.9em;
  }
  .body :global(.big) {
    margin: 0;
    font: 600 1.2em/1.25 var(--font-display);
    text-wrap: balance;
  }
  .body :global(.question) {
    margin: 0.1em 0 0;
    font-weight: 800;
    font-size: 1.05em;
    text-wrap: balance;
  }
  .body :global(.hint) {
    font-size: 0.78em;
    color: var(--ink-2);
    text-align: center;
    margin: 0;
  }
  .body :global(.reason) {
    font-size: 0.8em;
    color: #a8322a;
    font-weight: 700;
    margin: -0.3em 0 0;
    text-align: center;
  }
</style>
