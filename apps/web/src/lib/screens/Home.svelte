<script lang="ts">
  // Tela inicial (T-01, D-21, D-22). "Cada um no seu" chega com as salas (Etapa 4).
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
  }: {
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
            <p>Um aparelho só, passado de mão em mão na vez de cada um. Funciona sem internet.</p>
            <button
              class="btn {saved ? 'secondary' : 'gold'}"
              type="button"
              data-default={saved ? undefined : 'true'}
              onclick={startNew}>{options('D-21')[1]}</button
            >
          </section>
          <section class="choice soon">
            <h2><Icon name="devices" />Cada um no seu <span class="badge">Em breve</span></h2>
            <p>Crie uma sala e passe o código. Cada jogador entra pelo próprio aparelho.</p>
            <div class="row">
              <button class="btn secondary" type="button" disabled>Criar sala</button>
              <button class="btn ghost" type="button" disabled>Entrar com código</button>
            </div>
            <p class="small">Chega numa próxima versão.</p>
          </section>
        </div>
      {/if}
    </div>
  {/key}
</div>

<style>
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
  .badge {
    font: 800 0.5em var(--font-body);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: var(--panel-2);
    color: var(--text);
    border-radius: 0.5em;
    padding: 0.35em 0.55em;
  }
  .small {
    font-size: 0.85em;
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
