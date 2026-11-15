<script lang="ts">
  // Tela de jogo (T-06): tabuleiro, painel e a decisão no centro. Layout por container query:
  // paisagem (desktop e TV), tablet em pé e celular em pé com abas (variação B dos mockups).
  import { onDestroy, onMount, tick } from 'svelte';
  import { brl, options, t } from '../rules';
  import { focusDefault, focusInside, moveFocus } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import Die from '../ui/Die.svelte';
  import Logo from '../ui/Logo.svelte';
  import Board from './Board.svelte';
  import Decision from './Decision.svelte';
  import type { Game } from './game.svelte';
  import PlayerPanel from './PlayerPanel.svelte';
  import Toast from './Toast.svelte';

  let { game, onend }: { game: Game; onend: () => void } = $props();

  let tab: 'board' | 'players' = $state('board');
  let minimized = $state(false);
  let decision: ReturnType<typeof Decision> | undefined = $state();
  let root: HTMLElement | undefined = $state();
  let decisionBox: HTMLElement | undefined = $state();

  // quando a decisão reaparece (fim das animações), a opção padrão volta a ter o foco
  $effect(() => {
    if (!showDecision || minimized || !decisionBox) return;
    const box = decisionBox;
    void tick().then(() => {
      if (!box.contains(document.activeElement)) focusInside(box);
    });
  });

  const s = $derived(game.state);
  const view = $derived(game.view);
  const current = $derived(view.players[view.current]);

  const status = $derived.by(() => {
    if (s.mode.type === 'rounds') return t('I-86', { n: view.round, total: s.mode.limit ?? 0 });
    return t('I-02', { n: view.round });
  });
  const clock = $derived.by(() => {
    if (game.secondsLeft === null) return '';
    const m = Math.floor(game.secondsLeft / 60);
    const sec = String(game.secondsLeft % 60).padStart(2, '0');
    return `${m}:${sec}`;
  });

  // ao fim dos eventos da última jogada, abre a tela de fim de partida
  $effect(() => {
    if (game.over && !game.busy) onend();
  });
  // decisão nova sempre aparece aberta
  $effect(() => {
    void s;
    minimized = false;
  });

  onMount(() => game.startClock());
  onDestroy(() => game.stopClock());

  const showDecision = $derived((!game.busy || game.interstitial !== null) && !game.over);

  function scope(): HTMLElement | null {
    return (
      root?.querySelector<HTMLElement>('.pause-dialog') ??
      root?.querySelector<HTMLElement>('.decision [role="dialog"]') ??
      root?.querySelector<HTMLElement>('.restore') ??
      null
    );
  }

  function onkeydown(event: KeyboardEvent) {
    const typing = event.target instanceof HTMLInputElement;
    if (game.toast && ['Enter', ' ', 'Escape', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      game.skipToast();
      return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key) && !typing) {
      const area = scope();
      if (!area) return;
      event.preventDefault();
      moveFocus(area, event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 1);
      return;
    }
    // Voltar nunca confirma nada: fecha o passo atual ou esconde o cartão (docs/04)
    if (
      ['Escape', 'GoBack', 'BrowserBack'].includes(event.key) ||
      (event.key === 'Backspace' && !typing)
    ) {
      if (game.paused) return;
      event.preventDefault();
      if (decision?.goBack()) return;
      if (showDecision) minimized = !minimized;
      return;
    }
    if ((event.key === 'm' || event.key === 'M') && !typing && !game.paused) {
      decision?.openMenu();
    }
  }
</script>

<svelte:window {onkeydown} />

<div class="app" bind:this={root} data-tab={tab}>
  <div class="game">
    <header class="brand">
      <Logo />
      <div class="grow">
        <div class="wordmark">{t('I-01')}</div>
        <div class="round">{status}</div>
      </div>
      {#if clock}<span class="timer" aria-label="Tempo restante">{clock}</span>{/if}
      <button
        class="menu-btn"
        type="button"
        onclick={() => decision?.openMenu()}
        disabled={!showDecision}
      >
        <Icon name="menu" /><span>{t('I-11').charAt(0).toUpperCase() + t('I-11').slice(1)}</span>
      </button>
    </header>

    <section class="players-area" aria-label="Jogadores">
      <PlayerPanel {view} />
    </section>

    <div class="board-wrap">
      <Board {view} highlight={current?.position ?? -1}>
        {#if game.dice && game.busy && !game.toast && !game.interstitial}
          <div class="dice-pill" role="status">
            <Die value={game.dice.d1} rolling />
            <Die value={game.dice.d2} rolling />
            <span
              >{t('I-21', {
                player: game.dice.rentOnly ? t('I-22') : (current?.name ?? ''),
                d1: game.dice.d1,
                d2: game.dice.d2,
                sum: game.dice.d1 + game.dice.d2,
              })}</span
            >
          </div>
        {/if}
        {#if game.toast}
          <Toast text={game.toast} onskip={() => game.skipToast()} />
        {/if}
        <!-- sempre montado (só escondido durante as animações), para não perder o passo do menu -->
        <div class="decision" hidden={!showDecision || minimized} bind:this={decisionBox}>
          {#if !game.over}
            <Decision bind:this={decision} {game} onminimize={() => (minimized = true)} />
          {/if}
        </div>
        {#if showDecision && minimized}
          <div class="restore" use:focusDefault>
            <button
              class="btn primary"
              type="button"
              data-default="true"
              onclick={() => (minimized = false)}
            >
              Voltar à decisão
            </button>
          </div>
        {/if}
      </Board>
    </div>

    <section class="events" aria-label={t('I-06')}>
      <h3>{t('I-06')}</h3>
      {#each game.history as line, i (i + line)}
        <p>{line}</p>
      {/each}
    </section>

    <div class="keys" aria-hidden="true">
      <span><kbd>Enter</kbd>{t('I-09')}</span>
      <span><kbd>↑↓</kbd>{t('I-10')}</span>
      <span><kbd>M</kbd>{t('I-11')}</span>
      <span><kbd>Esc</kbd>{t('I-12')}</span>
    </div>

    <nav class="tabs" aria-label="Seções">
      <button
        class="tab"
        type="button"
        aria-pressed={tab === 'board'}
        onclick={() => (tab = 'board')}
      >
        <Icon name="board" />Tabuleiro
      </button>
      <button
        class="tab"
        type="button"
        aria-pressed={tab === 'players'}
        onclick={() => (tab = 'players')}
      >
        <Icon name="people" />Jogadores
      </button>
    </nav>
  </div>

  {#if game.paused}
    <!-- D-15: pausa; o cronômetro para -->
    <div class="overlay">
      <div class="pause-dialog" role="alertdialog" aria-label={t('D-15')} use:focusDefault>
        <h2>{t('D-15')}</h2>
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => (game.paused = false)}
        >
          {options('D-15')[0]}
        </button>
        <button class="btn secondary" type="button" disabled>{options('D-15')[1]}</button>
        <p class="small">{t('I-35')}</p>
      </div>
    </div>
  {/if}

  <p class="visually-hidden" aria-live="polite">
    {#if current}{current.name}: {brl(current.money)}{/if}
  </p>
</div>

<style>
  .app {
    position: relative;
    height: 100%;
    container: app / size;
    overflow: hidden;
    background: var(--night);
  }
  .game {
    height: 100%;
    display: grid;
    gap: 12px;
    padding: 12px;
    padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    grid-template-areas: 'brand' 'main' 'tabs';
    font-size: 15px;
  }
  .brand {
    grid-area: brand;
    display: flex;
    align-items: center;
    gap: 0.6em;
    min-width: 0;
  }
  .grow {
    flex: 1;
    min-width: 0;
  }
  .wordmark {
    font: 600 1.45em/1 var(--font-display);
  }
  .round {
    color: var(--text-2);
    font-size: 0.82em;
    line-height: 1.25;
  }
  .timer {
    font: 600 0.95em var(--font-display);
    background: var(--panel);
    border-radius: 0.6em;
    padding: 0.35em 0.6em;
    font-variant-numeric: tabular-nums;
  }
  .menu-btn {
    border: 1px solid #3a5079;
    background: var(--panel);
    border-radius: 0.7em;
    padding: 0.5em 0.85em;
    cursor: pointer;
    font-weight: 800;
    font-size: 0.85em;
    display: inline-flex;
    align-items: center;
    gap: 0.45em;
  }
  .menu-btn:disabled {
    opacity: 0.5;
  }
  .menu-btn :global(svg) {
    width: 1.1em;
    height: 1.1em;
  }
  .players-area {
    grid-area: main;
    display: none;
    overflow: auto;
    min-height: 0;
  }
  .board-wrap {
    grid-area: main;
    display: grid;
    align-items: start;
    justify-items: center;
    min-height: 0;
    min-width: 0;
  }
  .decision {
    display: contents;
  }
  .decision[hidden] {
    display: none;
  }
  .restore {
    position: absolute;
    left: 50%;
    bottom: 1em;
    transform: translateX(-50%);
    z-index: 6;
  }
  .restore .btn {
    box-shadow: 0 0 0 0.2em var(--focus);
  }
  .dice-pill {
    display: flex;
    align-items: center;
    gap: 0.6em;
    background: rgba(19, 33, 58, 0.95);
    color: var(--text);
    border-radius: 1em;
    padding: 0.7em 1em;
    font-weight: 700;
    z-index: 4;
  }
  .events {
    grid-area: events;
    display: none;
    background: var(--panel);
    border-radius: 0.9em;
    padding: 0.8em 1em;
    min-width: 0;
  }
  .events h3 {
    margin: 0 0 0.5em;
    font-size: 0.7em;
    letter-spacing: 0.12em;
    color: var(--text-2);
    font-weight: 800;
  }
  .events p {
    margin: 0.35em 0;
    font-size: 0.92em;
  }
  .keys {
    grid-area: keys;
    display: none;
    flex-wrap: wrap;
    gap: 0.6em 1em;
    align-items: center;
    color: var(--text-2);
    font-size: 0.82em;
  }
  kbd {
    font: 800 0.9em var(--font-body);
    color: var(--text);
    border: 1px solid #3a5079;
    border-radius: 0.45em;
    padding: 0.2em 0.5em;
    margin-right: 0.35em;
  }
  .tabs {
    grid-area: tabs;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin: 0 -12px -12px;
    padding: 6px 12px calc(10px + env(safe-area-inset-bottom, 0px));
    background: var(--night-deep);
    border-top: 1px solid #23365a;
  }
  .tab {
    border: 0;
    background: transparent;
    border-radius: 0.7em;
    padding: 0.65em;
    font-weight: 800;
    color: var(--text-2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45em;
  }
  .tab :global(svg) {
    width: 1.2em;
    height: 1.2em;
  }
  .tab[aria-pressed='true'] {
    background: var(--panel);
    color: var(--text);
  }

  /* celular, aba Jogadores: lista e acontecimentos; a decisão continua por cima */
  .app[data-tab='players'] .players-area {
    display: grid;
    gap: 12px;
    align-content: start;
  }
  .app[data-tab='players'] .board-wrap :global(.board) {
    visibility: hidden;
  }

  /* celular em pé (variação B): cartão sobe de baixo, acima das abas */
  @container app (max-width: 599px) {
    .board-wrap :global(.center),
    .board-wrap :global(.board) {
      position: static;
    }
    .board-wrap :global(.card) {
      position: absolute;
      left: 0;
      right: 0;
      bottom: calc(62px + env(safe-area-inset-bottom, 0px));
      width: auto;
      max-height: 72%;
      border-radius: 1.2em 1.2em 0 0;
      box-shadow: 0 -0.6em 2em rgba(0, 0, 0, 0.4);
      font-size: 14px;
    }
    .app[data-tab='players'] .players-area {
      padding-bottom: 46%;
    }
    .restore {
      bottom: calc(74px + env(safe-area-inset-bottom, 0px));
    }
    .board-wrap :global(.toast),
    .board-wrap :global(.dice-pill) {
      position: absolute;
      left: 50%;
      top: auto;
      bottom: calc(80px + env(safe-area-inset-bottom, 0px));
      transform: translateX(-50%);
      width: calc(100% - 24px);
    }
  }

  /* tablet em pé: tabuleiro em cima, jogadores e acontecimentos embaixo */
  @container app (min-width: 600px) and (max-aspect-ratio: 6/5) {
    .game {
      font-size: 16px;
      padding: 20px;
      gap: 16px;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: auto auto 1fr;
      grid-template-areas: 'brand brand' 'board board' 'players events';
    }
    .board-wrap {
      grid-area: board;
    }
    .players-area {
      grid-area: players;
      display: block;
    }
    .events {
      display: block;
    }
    .tabs {
      display: none;
    }
    .app[data-tab='players'] .board-wrap :global(.board) {
      visibility: visible;
    }
    .board-wrap :global(.card) {
      font-size: max(14px, 2.15cqw);
    }
  }

  /* paisagem (desktop e TV): tabuleiro à esquerda, painel à direita, como no Roku */
  @container app (min-width: 880px) and (min-aspect-ratio: 6/5) {
    .game {
      font-size: clamp(13px, min(1.12cqw, 2.05cqh), 28px);
      padding: 2.4cqh 2.6cqw;
      gap: 1.1em 1.6em;
      grid-template-columns: auto minmax(0, 1fr);
      grid-template-rows: auto auto 1fr auto;
      grid-template-areas: 'board brand' 'board players' 'board events' 'board keys';
    }
    .board-wrap {
      grid-area: board;
      height: 100%;
    }
    .board-wrap :global(.board) {
      height: 100%;
      width: auto;
      aspect-ratio: 760 / 648;
      grid-template-rows: 1.45fr repeat(9, 1fr) 1.45fr;
    }
    .players-area {
      grid-area: players;
      display: block;
      overflow: visible;
    }
    .events {
      display: block;
      align-self: start;
    }
    .keys {
      display: flex;
    }
    .tabs {
      display: none;
    }
    .app[data-tab='players'] .board-wrap :global(.board) {
      visibility: visible;
    }
    .board-wrap :global(.card) {
      font-size: max(12px, 1.95cqw);
    }
  }

  .overlay {
    position: absolute;
    inset: 0;
    background: rgba(8, 14, 26, 0.72);
    display: grid;
    place-items: center;
    z-index: 10;
    padding: 16px;
  }
  .pause-dialog {
    background: var(--card);
    color: var(--ink);
    border-radius: 1.1em;
    width: min(24em, 100%);
    padding: 1.3em 1.4em 1.2em;
    display: grid;
    gap: 0.7em;
  }
  .pause-dialog h2 {
    margin: 0;
    font: 600 1.5em/1.1 var(--font-display);
  }
  .small {
    margin: 0;
    font-size: 0.82em;
    color: var(--ink-2);
  }
</style>
