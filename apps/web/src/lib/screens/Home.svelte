<script lang="ts">
  // Tela inicial (T-01, D-21). "Continuar partida" chega com o salvamento (Etapa 3) e
  // "Cada um no seu" com as salas (Etapa 4).
  import { options, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import Logo from '../ui/Logo.svelte';

  let { onnew }: { onnew: () => void } = $props();
  const p = rules.parameters;
</script>

<div class="full-screen">
  <div class="sheet wide" use:focusDefault>
    <div class="hero">
      <Logo size="5.2em" />
      <h1 class="wordmark">{t('I-01')}</h1>
      <p class="lead">
        O banco faz as contas. Vocês só decidem. De {p.minPlayers} a {p.maxPlayers} jogadores.
      </p>
    </div>
    <div class="choices">
      <section class="choice">
        <h2><Icon name="device" />Neste aparelho</h2>
        <p>Um aparelho só, passado de mão em mão na vez de cada um.</p>
        <button class="btn gold" type="button" data-default="true" onclick={onnew}
          >{options('D-21')[1]}</button
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
  </div>
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
  .hero .lead {
    max-width: 24em;
  }
  .choices {
    display: grid;
    gap: 0.9em;
  }
  .choice {
    background: var(--panel);
    border-radius: 1.1em;
    padding: 1.1em 1.2em;
    display: grid;
    gap: 0.6em;
  }
  .choice h2 {
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
  @container screen (min-width: 760px) {
    .choices {
      grid-template-columns: 1fr 1fr;
    }
  }
</style>
