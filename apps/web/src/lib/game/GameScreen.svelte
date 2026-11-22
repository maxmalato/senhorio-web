<script lang="ts">
  // Tela de jogo (T-06): tabuleiro, painel e a decisão no centro. Layout por container query:
  // paisagem (desktop e TV), tablet em pé e celular em pé com abas (variação B dos mockups).
  import { onDestroy, onMount, tick } from 'svelte';
  import { brl, options, t } from '../rules';
  import { focusDefault, focusInside, moveFocus } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import Dice from '../dice/Dice.svelte';
  import { preloadDice3D } from '../dice/load';
  import Logo from '../ui/Logo.svelte';
  import Board from './Board.svelte';
  import Decision from './Decision.svelte';
  import type { Game } from './game.svelte';
  import { formatCode, REMOVE_AFTER_MS, TABLE_SEAT, type RoomView } from '@senhorio/protocol';
  import { fullscreen } from '../ui/screen.svelte';
  import HowToPlay from '../help/HowToPlay.svelte';
  import { menuAvailable } from './menu';
  import PlayerPanel from './PlayerPanel.svelte';
  import Toast from './Toast.svelte';

  let {
    game,
    onend,
    onsaveexit,
    room = null,
    clockOffset = 0,
    onpause,
    onremove,
    onleave,
    onclose,
  }: {
    game: Game;
    onend: () => void;
    onsaveexit?: () => void;
    /** Vários aparelhos: a sala (lugares, conexão, pausa) e ações que passam por ela. */
    room?: RoomView | null;
    clockOffset?: number;
    onpause?: (paused: boolean) => void;
    onremove?: (seat: number) => void;
    onleave?: () => void;
    /** Modo mesa: a mesa encerra a sala (pela tela de pausa). */
    onclose?: () => void;
  } = $props();

  // ---------- vários aparelhos: quem caiu, quem pausou, quem pode remover ----------
  // contra o computador: marca COMPUTADOR no painel
  const bots = $derived(game.state.players.flatMap((p, i) => (game.isBot(i) ? [i] : [])));
  const offline = $derived(
    room ? room.seats.flatMap((seat, i) => (!seat.connected && !seat.out ? [i] : [])) : [],
  );
  const pausedBy = $derived(room?.pausedBy ?? null);
  // relógio do servidor, para contar os 3 minutos igual em todos os aparelhos
  let now = $state(Date.now());
  $effect(() => {
    if (!room) return;
    const tick = setInterval(() => (now = Date.now()), 1000);
    return () => clearInterval(tick);
  });
  const serverNow = $derived(now + clockOffset);
  const iAmHost = $derived(room !== null && game.me === room.host);
  /** Modo mesa: este aparelho é a mesa (mostra a partida, não joga). */
  const isTable = $derived(game.me === TABLE_SEAT);
  const hostAway = $derived(
    room !== null &&
      (room.table
        ? !room.table.connected
        : !room.seats[room.host]?.connected || room.seats[room.host]?.out === true),
  );
  /** Ao abrir o "Como jogar", o foco vai para o texto (setas rolam; Voltar fecha). */
  function focusHelp(node: HTMLElement) {
    node.focus({ preventScroll: true });
  }

  /** Nome do jogador que pausou (a pausa da mesa tem texto próprio, W-82). */
  function pauserName(seat: number): string {
    return room?.seats[seat]?.name ?? '';
  }
  const canRemove = $derived(iAmHost || hostAway);
  function mmss(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  let tab: 'board' | 'players' = $state('board');
  let marked: number[] = $state([]);

  // preferência deste aparelho: ruas com preço ou com nome (guardada só no navegador)
  const NAMES_KEY = 'senhorio:board-names';
  function loadNames(): boolean {
    try {
      return localStorage.getItem(NAMES_KEY) === '1';
    } catch {
      return false;
    }
  }
  let showNames = $state(loadNames());
  function toggleNames() {
    showNames = !showNames;
    try {
      localStorage.setItem(NAMES_KEY, showNames ? '1' : '0');
    } catch {
      // sem armazenamento: vale só até fechar
    }
  }
  let minimized = $state(false);
  let decision: ReturnType<typeof Decision> | undefined = $state();
  let root: HTMLElement | undefined = $state();
  let decisionBox: HTMLElement | undefined = $state();

  // A cada decisão nova (ou quando ela reaparece no fim das animações), a opção padrão
  // volta a ter o foco. Sem isso, um cartão montado enquanto estava escondido ficaria sem
  // foco e o OK do controle remoto pararia de funcionar até alguém tocar na tela.
  $effect(() => {
    void game.state;
    void game.busy;
    if (!showDecision || minimized || !decisionBox) return;
    const box = decisionBox;
    void tick().then(() => {
      const visible = !box.hidden && !minimized;
      const lost = !document.activeElement || document.activeElement === document.body;
      if (visible && (lost || !box.contains(document.activeElement))) {
        if (!root?.querySelector('.restore, .pause-dialog, .help-sheet')) focusInside(box);
      }
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

  onMount(() => {
    game.startClock();
    // dados 3D: baixa com folga, antes da primeira jogada (Etapa 6)
    if (game.timings.dice > 0) preloadDice3D();
  });
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

  /** Foco em lugar nenhum, num elemento escondido ou num botão desabilitado. */
  function focusLost(): boolean {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active === document.body) return true;
    if (!active.isConnected || active.offsetParent === null || active.closest('[hidden]'))
      return true;
    return active instanceof HTMLButtonElement && active.disabled;
  }

  function onkeydown(event: KeyboardEvent) {
    // "Como jogar" aberto: Voltar fecha; as setas rolam o texto (sem mexer no jogo)
    if (game.helpOpen) {
      if (['Escape', 'GoBack', 'BrowserBack', 'Backspace'].includes(event.key)) {
        event.preventDefault();
        game.helpOpen = false;
      }
      return;
    }
    const typing = event.target instanceof HTMLInputElement;
    if (game.toast && ['Enter', ' ', 'Escape', 'Backspace'].includes(event.key)) {
      event.preventDefault();
      game.skipToast();
      return;
    }
    // Rede de segurança do controle remoto: se o foco se perdeu (o botão focado sumiu ou
    // ficou desabilitado durante uma animação), o OK devolve o foco à opção padrão em vez
    // de não fazer nada para sempre.
    if ((event.key === 'Enter' || event.key === ' ') && focusLost()) {
      const area = scope();
      if (area) {
        event.preventDefault();
        focusInside(area);
      }
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
    <header class="brand" class:table={isTable}>
      <Logo />
      <div class="grow">
        <div class="wordmark">{t('I-01')}</div>
        <div class="round">{status}</div>
      </div>
      {#if clock}<span class="timer" aria-label="Tempo restante">{clock}</span>{/if}
      <!-- regras a qualquer momento, inclusive fora da vez -->
      <button
        class="menu-btn help-btn"
        type="button"
        aria-label={t('A-01')}
        title={t('A-01')}
        onclick={() => (game.helpOpen = true)}><Icon name="question" /></button
      >
      {#snippet namesButton()}
        <button
          class="menu-btn"
          type="button"
          aria-pressed={showNames}
          title="Mostrar nomes ou preços das ruas no tabuleiro"
          onclick={toggleNames}
        >
          <Icon name="tag" /><span>{showNames ? 'Preços' : 'Nomes'}</span>
        </button>
      {/snippet}
      {#if isTable && room}
        <!-- modo mesa: os botões ficam juntos numa linha própria, abaixo do nome -->
        <div class="table-actions">
          {@render namesButton()}
          {#if fullscreen.supported}
            <!-- texto fixo (largura fixa): o estado aparece pelo destaque do botão -->
            <button
              class="menu-btn fs"
              type="button"
              aria-pressed={fullscreen.active}
              onclick={() => fullscreen.toggle()}><span>{t('W-77')}</span></button
            >
          {/if}
          <button class="menu-btn" type="button" onclick={() => onpause?.(true)}
            ><Icon name="pause" /><span>{options('D-10')[5]}</span></button
          >
        </div>
      {:else}
        {@render namesButton()}
        <button
          class="menu-btn"
          type="button"
          onclick={() => decision?.openMenu()}
          disabled={!showDecision || !menuAvailable(s)}
        >
          <Icon name="menu" /><span>{t('I-11').charAt(0).toUpperCase() + t('I-11').slice(1)}</span>
        </button>
      {/if}
    </header>

    <section class="players-area" aria-label="Jogadores">
      <PlayerPanel {view} me={game.me} {offline} {bots} />
      {#if isTable && room}
        <!-- modo mesa: o código fica à vista para quem precisar entrar de novo -->
        <p class="table-code">
          <span>{t('W-12')}</span>
          <b aria-label={room.code.split('').join(' ')}>{formatCode(room.code)}</b>
        </p>
      {/if}
    </section>

    <div class="board-wrap">
      <Board {view} highlight={current?.position ?? -1} {marked} {showNames}>
        {#if game.dice && game.busy && !game.toast && !game.interstitial}
          <div class="dice-pill" role="status">
            {#key game.dice}
              <Dice d1={game.dice.d1} d2={game.dice.d2} durationMs={game.timings.dice} />
            {/key}
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
            <Decision
              bind:this={decision}
              bind:marked
              {game}
              onminimize={() => (minimized = true)}
              onpause={onpause ? () => onpause(true) : undefined}
            />
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

    <!-- a mesa não tem decisões nem menu: as dicas de teclado não servem para ela -->
    {#if !isTable}
      <div class="keys" aria-hidden="true">
        <span><kbd>Enter</kbd>{t('I-09')}</span>
        <span><kbd>↑↓</kbd>{t('I-10')}</span>
        <span><kbd>M</kbd>{t('I-11')}</span>
        <span><kbd>Esc</kbd>{t('I-12')}</span>
      </div>
    {/if}

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

  {#if game.helpOpen}
    <div class="overlay help-overlay">
      <div class="help-sheet" role="dialog" aria-modal="true" aria-label={t('A-01')}>
        <button
          class="btn secondary help-close"
          type="button"
          onclick={() => (game.helpOpen = false)}>{t('I-107')}</button
        >
        <!-- a área com o texto recebe o foco: no controle remoto, as setas rolam. Área com
             rolagem precisa ser focável pelo teclado (axe: scrollable-region-focusable) -->
        <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
        <div class="help-scroll" tabindex="0" role="region" aria-label={t('A-01')} use:focusHelp>
          <HowToPlay heading="h2" />
        </div>
      </div>
    </div>
  {:else if room && offline.length > 0}
    {@const who = offline[0] ?? 0}
    {@const since = room.seats[who]?.disconnectedAt ?? serverNow}
    {@const left = REMOVE_AFTER_MS - (serverNow - since)}
    {@const whoName = room.seats[who]?.name ?? ''}
    <!-- queda de conexão: a partida pausa esperando a volta (docs/01) -->
    <div class="overlay">
      <div class="pause-dialog" role="alertdialog" aria-label={t('W-28')} use:focusDefault>
        <h2>{t('W-28')}</h2>
        <div class="who">
          <span class="avatar" style:background={room.seats[who]?.color}
            >{whoName.slice(0, 1).toUpperCase()}</span
          >
          <div>
            <b>{t('W-29', { player: whoName })}</b>
            <div class="clock">{t('W-30', { time: mmss(serverNow - since) })}</div>
          </div>
        </div>
        <p class="small">{t('W-31', { player: whoName })}</p>
        {#if canRemove}
          {#if left > 0}
            <button class="btn secondary" type="button" disabled
              >{t('W-32', { player: whoName, time: mmss(left) })}</button
            >
          {:else}
            <button
              class="btn primary"
              type="button"
              data-default="true"
              onclick={() => onremove?.(who)}
            >
              {t('W-33', { player: whoName })}
            </button>
            <p class="small">{t('W-34', { player: whoName })}</p>
          {/if}
        {:else}
          <p class="small">{t('W-35')}</p>
        {/if}
        {#if !isTable}
          <button class="btn ghost-dark" type="button" onclick={() => onleave?.()}
            >{t('W-22')}</button
          >
        {/if}
      </div>
    </div>
  {:else if room && pausedBy !== null}
    <!-- pausa pelo menu vale para todos os aparelhos; o cronômetro para -->
    <div class="overlay">
      <div class="pause-dialog" role="alertdialog" aria-label={t('D-15')} use:focusDefault>
        <h2>
          {pausedBy === TABLE_SEAT ? t('W-82') : t('W-36', { player: pauserName(pausedBy) })}
        </h2>
        <button
          class="btn primary"
          type="button"
          data-default="true"
          onclick={() => onpause?.(false)}
        >
          {options('D-15')[0]}
        </button>
        {#if isTable}
          <button class="btn secondary" type="button" onclick={() => onclose?.()}
            >{t('W-73')}</button
          >
        {:else}
          <button class="btn secondary" type="button" onclick={() => onleave?.()}
            >{t('W-22')}</button
          >
        {/if}
      </div>
    </div>
  {:else if game.paused}
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
        <!-- a partida já está salva no fim do último turno concluído (docs/03) -->
        <button
          class="btn secondary"
          type="button"
          disabled={!onsaveexit}
          onclick={() => {
            game.paused = false;
            game.stopClock();
            onsaveexit?.();
          }}>{options('D-15')[1]}</button
        >
        <p class="small">{onsaveexit ? t('I-93') : t('I-35')}</p>
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
  .brand .menu-btn {
    white-space: nowrap;
  }
  /* mesa: nome numa linha, os botões juntos na linha de baixo (cabem até em tela estreita) */
  .brand.table {
    flex-wrap: wrap;
    row-gap: 0.6em;
  }
  .table-actions {
    flex-basis: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5em;
  }
  .brand .menu-btn.fs[aria-pressed='true'] {
    background: var(--text);
    border-color: var(--text);
    color: var(--ink);
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
  .table-code {
    margin: 0.6em 0 0;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.6em;
    padding: 0.6em 0.9em;
    border-radius: 0.9em;
    background: var(--panel);
    font-size: 0.8em;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--text-2);
  }
  .table-code b {
    font: 600 1.5em var(--font-display);
    letter-spacing: 0.12em;
    color: var(--text);
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
  /* o cartão divide com a logo a mesma célula do centro do tabuleiro */
  .decision :global(.card) {
    grid-area: 1 / 1;
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
      /* o painel tem largura garantida; o tabuleiro ocupa o resto, limitado pela altura.
         Em telas quase quadradas (1024×768, iPad deitado), o tabuleiro encolhe em vez de
         espremer o painel. */
      grid-template-columns: minmax(0, 1fr) clamp(16em, 30cqw, 26em);
      grid-template-rows: auto auto 1fr auto;
      grid-template-areas: 'board brand' 'board players' 'board events' 'board keys';
    }
    .board-wrap {
      grid-area: board;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .board-wrap :global(.board) {
      width: min(100%, calc((100cqh - 4.8cqh) * 760 / 648));
      height: auto;
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

  .help-btn {
    padding-inline: 0.6em;
  }
  /* duas classes: vence o "place-items: center" das outras sobreposições. A janela fica
     com a altura da tela, e o texto rola por dentro (sem isso, a janela crescia do tamanho
     do texto, passava da tela e não rolava) */
  .overlay.help-overlay {
    z-index: 20;
    grid-template-rows: minmax(0, 1fr);
    align-items: stretch;
  }
  .help-sheet {
    width: min(40em, 100%);
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0.8em;
    background: var(--night);
    border-radius: 1.1em;
    padding: 1em;
    box-shadow: 0 0 0 1px var(--line);
    justify-self: center;
  }
  .help-close {
    justify-self: end;
  }
  .help-scroll {
    overflow-y: auto;
    outline: none;
    padding-right: 0.3em;
  }
  .help-scroll:focus-visible {
    box-shadow: inset 0 0 0 3px var(--focus);
    border-radius: 0.8em;
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
  .who {
    display: flex;
    align-items: center;
    gap: 0.7em;
  }
  .who .avatar {
    position: relative;
  }
  .who .avatar::after {
    content: '';
    position: absolute;
    right: -0.1em;
    bottom: -0.1em;
    width: 0.75em;
    height: 0.75em;
    border-radius: 50%;
    background: var(--danger);
    border: 2px solid var(--card);
  }
  .clock {
    font: 600 1em var(--font-display);
    font-variant-numeric: tabular-nums;
    color: var(--ink-2);
  }
  .ghost-dark {
    background: transparent;
    color: var(--ink);
    border: 1.5px solid var(--card-2);
  }
  .small {
    margin: 0;
    font-size: 0.82em;
    color: var(--ink-2);
  }
</style>
