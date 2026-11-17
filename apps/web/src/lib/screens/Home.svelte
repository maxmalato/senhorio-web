<script lang="ts">
  // Tela inicial (T-01, D-21, D-22). "Cada um no seu" chega com as salas (Etapa 4).
  import { formatCode } from '@senhorio/protocol';
  import { canUse3D, setUse3D, use3D } from '../dice/preference';
  import { setSoundOn, soundOn } from '../sound/preference';
  import { isLargeScreen, LARGE_SCREEN_QUERY } from '../ui/screen.svelte';
  import type { SaveRecord } from '../save/save';
  import { options, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import Logo from '../ui/Logo.svelte';

  let {
    saved = null,
    incompatible = false,
    updateReady = false,
    offlineReady = false,
    onnew,
    onresume,
    onupdate,
    roomCode = null,
    roomIsTable = false,
    roomError = '',
    oncreateroom,
    oncreatetable,
    onhelp,
    onjoinroom,
    onrejoin,
  }: {
    /** Sala em que este aparelho estava (para voltar a ela). */
    roomCode?: string | null;
    /** O lugar guardado é a mesa da sala (modo mesa). */
    roomIsTable?: boolean;
    roomError?: string;
    oncreateroom: () => void;
    /** Modo mesa: só em tela grande (TV, notebook, computador, tablet). */
    oncreatetable?: () => void;
    /** "Como jogar": as regras principais. */
    onhelp?: () => void;
    onjoinroom: () => void;
    onrejoin: () => void;
    saved?: SaveRecord | null;
    incompatible?: boolean;
    updateReady?: boolean;
    offlineReady?: boolean;
    onnew: () => void;
    onresume: () => void;
    onupdate: () => void;
  } = $props();

  const p = rules.parameters;
  let confirming = $state(false);
  const show3DChoice = canUse3D();
  let dice3D = $state(use3D());
  let sound = $state(soundOn());
  // "Criar mesa" só em tela grande; acompanha a janela (ex.: notebook redimensionado)
  let largeScreen = $state(isLargeScreen());
  $effect(() => {
    if (typeof matchMedia !== 'function') return;
    const query = matchMedia(LARGE_SCREEN_QUERY);
    const update = () => (largeScreen = query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  });

  function ago(when: number): string {
    const minutes = Math.round((when - Date.now()) / 60000);
    const format = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
    if (Math.abs(minutes) < 60) return format.format(minutes, 'minute');
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 48) return format.format(hours, 'hour');
    return format.format(Math.round(hours / 24), 'day');
  }

  const summary = $derived.by(() => {
    if (!saved) return '';
    const s = saved.state;
    const mode =
      s.mode.type === 'classic' ? t('I-89') : s.mode.type === 'time' ? t('I-90') : t('I-91');
    return t('I-53', { n: s.round, players: s.players.filter((pl) => !pl.bankrupt).length, mode });
  });

  function startNew() {
    // D-22: com uma partida salva, pede confirmação antes de apagar
    if (saved) confirming = true;
    else onnew();
  }
</script>

<div class="full-screen">
  {#key confirming}
    <div class="sheet wide" use:focusDefault>
      <div class="hero">
        <Logo size="5.2em" />
        <h1 class="wordmark">{t('I-01')}</h1>
        <p class="lead">
          O banco faz as contas. Vocês só decidem. De {p.minPlayers} a {p.maxPlayers} jogadores.
        </p>
      </div>

      {#if updateReady}
        <div class="banner" role="status">
          <span>{t('I-94')}</span>
          <button class="btn gold" type="button" onclick={onupdate}>{t('I-95')}</button>
        </div>
      {:else if offlineReady}
        <p class="footnote" role="status">{t('I-96')}</p>
      {/if}

      {#if confirming}
        <div class="confirm" role="alertdialog" aria-label={t('D-22')}>
          <h2>{t('D-22')}</h2>
          <div class="row">
            <button
              class="btn gold"
              type="button"
              data-default="true"
              onclick={() => (confirming = false)}>{options('D-22')[0]}</button
            >
            <button class="btn ghost" type="button" onclick={onnew}>{options('D-22')[1]}</button>
          </div>
        </div>
      {:else}
        {#if roomError}
          <p class="callout" role="alert"><Icon name="info" /><span>{roomError}</span></p>
        {/if}
        {#if roomCode}
          <div class="resume">
            <div class="grow">
              <b
                >{roomIsTable
                  ? t('W-79', { code: formatCode(roomCode) })
                  : t('W-42', { code: formatCode(roomCode) })}</b
              >
              <span>{t('W-44')}</span>
            </div>
            <button
              class="btn gold"
              type="button"
              data-default={saved ? undefined : 'true'}
              onclick={onrejoin}>{t('I-62')}</button
            >
          </div>
        {/if}
        {#if saved}
          <div class="resume">
            <div class="grow">
              <b>{options('D-21')[0]}</b>
              <span>{summary} · {saved.state.players.map((pl) => pl.name).join(', ')}</span>
              <span>{t('I-92', { when: ago(saved.savedAt) })}</span>
            </div>
            <button class="btn gold" type="button" data-default="true" onclick={onresume}
              >{t('I-62')}</button
            >
          </div>
        {:else if incompatible}
          <p class="callout" role="status"><Icon name="info" /><span>{t('I-54')}</span></p>
        {/if}

        <div class="choices">
          <section class="choice">
            <h2><Icon name="device" />Neste aparelho</h2>
            <p>
              Um aparelho só, passado de mão em mão ou contra o computador. Funciona sem internet.
            </p>
            <button
              class="btn {saved ? 'secondary' : 'gold'}"
              type="button"
              data-default={saved ? undefined : 'true'}
              onclick={startNew}>{options('D-21')[1]}</button
            >
          </section>
          <section class="choice">
            <h2><Icon name="devices" />{t('W-43')}</h2>
            <p>{t('W-44')}</p>
            <div class="row">
              <button class="btn secondary" type="button" onclick={oncreateroom}>{t('W-01')}</button
              >
              <button class="btn ghost" type="button" onclick={onjoinroom}>{t('W-02')}</button>
            </div>
            {#if oncreatetable && largeScreen}
              <!-- modo mesa: esta tela mostra o tabuleiro e cada um joga pelo celular -->
              <p class="table-hint">{t('W-70')}</p>
              <button class="btn secondary" type="button" onclick={oncreatetable}
                ><Icon name="board" />{t('W-69')}</button
              >
            {/if}
          </section>
        </div>
      {/if}
      <div class="legal">
        {#if onhelp}
          <button class="link" type="button" onclick={onhelp}>{t('A-01')}</button>
          <span aria-hidden="true">·</span>
        {/if}
        <button
          class="link"
          type="button"
          aria-pressed={sound}
          onclick={() => {
            sound = !sound;
            setSoundOn(sound);
          }}>{t('I-100', { state: sound ? t('I-98') : t('I-99') })}</button
        >
        <span aria-hidden="true">·</span>
        {#if show3DChoice}
          <!-- Etapa 6: o jogador pode desligar os dados 3D neste aparelho (TV lenta, bateria) -->
          <button
            class="link"
            type="button"
            aria-pressed={dice3D}
            onclick={() => {
              dice3D = !dice3D;
              setUse3D(dice3D);
            }}>{t('I-97', { state: dice3D ? t('I-98') : t('I-99') })}</button
          >
          <span aria-hidden="true">·</span>
        {/if}
        <a href="/privacidade.html">{t('W-61')}</a>
      </div>
    </div>
  {/key}
</div>

<style>
  .table-hint {
    margin: 0.3em 0 0;
    font-size: 0.9em;
    color: var(--text-2);
  }
  .legal {
    margin: 0.4em 0 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    gap: 0.3em 0.6em;
    font-size: 0.85em;
    color: var(--text-2);
  }
  .legal a,
  .legal .link {
    color: var(--text-2);
  }
  .legal .link {
    background: none;
    border: 0;
    padding: 0.2em 0;
    font: inherit;
    text-decoration: underline;
    cursor: pointer;
  }
  .legal .link:focus-visible,
  .legal a:focus-visible {
    outline: 3px solid var(--focus);
    outline-offset: 3px;
    border-radius: 0.3em;
  }
  .hero {
    display: grid;
    justify-items: center;
    gap: 0.5em;
    text-align: center;
    padding: 0.8em 0 0.4em;
  }
  .wordmark {
    font: 600 2.6em/1 var(--font-display);
    margin: 0;
  }
  /* numa linha só quando cabe; em tela estreita, quebra em linhas equilibradas */
  .hero .lead {
    text-wrap: balance;
  }
  .choices {
    display: grid;
    gap: 0.9em;
  }
  .choice,
  .confirm {
    background: var(--panel);
    border-radius: 1.1em;
    padding: 1.1em 1.2em;
    display: grid;
    gap: 0.6em;
  }
  .choice h2,
  .confirm h2 {
    margin: 0;
    font: 600 1.3em var(--font-display);
    display: flex;
    align-items: center;
    gap: 0.5em;
  }
  .choice h2 :global(svg) {
    width: 1.3em;
    height: 1.3em;
    color: var(--focus);
  }
  .choice p {
    margin: 0;
    color: var(--text-2);
  }
  .row {
    display: flex;
    gap: 0.6em;
    flex-wrap: wrap;
  }
  .row .btn {
    flex: 1 1 9em;
  }
  .resume,
  .banner {
    display: flex;
    align-items: center;
    gap: 0.9em;
    background: var(--panel-2);
    border-radius: 1.1em;
    padding: 0.9em 1.1em;
    flex-wrap: wrap;
  }
  .resume .grow {
    flex: 1 1 14em;
    min-width: 0;
    display: grid;
    gap: 0.15em;
  }
  .resume b {
    font: 600 1.15em var(--font-display);
  }
  .resume span {
    color: var(--text-2);
    font-size: 0.9em;
  }
  .banner span {
    flex: 1 1 12em;
    font-weight: 700;
  }
  .callout {
    margin: 0;
  }
  @container screen (min-width: 760px) {
    .choices {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
