<script lang="ts">
  // Modo mesa: confirmação antes de encerrar a sala para todos. "Não, voltar" vem em foco,
  // para um OK sem querer no controle remoto não derrubar a partida.
  import { t } from '../rules';
  import { focusDefault } from '../ui/focus';

  let { onconfirm, oncancel }: { onconfirm: () => void; oncancel: () => void } = $props();
</script>

<div class="overlay">
  <div class="pause-dialog" role="alertdialog" aria-label={t('W-74')} use:focusDefault>
    <h2>{t('W-74')}</h2>
    <button class="btn primary" type="button" data-default="true" onclick={oncancel}
      >{t('W-75')}</button
    >
    <button class="btn secondary" type="button" onclick={onconfirm}>{t('W-76')}</button>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(8, 14, 26, 0.72);
    display: grid;
    place-items: center;
    z-index: 40;
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
</style>
