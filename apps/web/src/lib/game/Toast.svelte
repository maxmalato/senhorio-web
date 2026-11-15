<script lang="ts">
  // Aviso de resultado (C-03): uma frase por vez; OK, Enter ou toque pulam a espera.
  let { text, onskip }: { text: string; onskip: () => void } = $props();
</script>

<button class="toast" type="button" onclick={onskip} aria-live="assertive">
  <span class="text">{text}</span>
  <span class="skip" aria-hidden="true">OK</span>
</button>

<style>
  .toast {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    width: min(30em, 88%);
    background: rgba(19, 33, 58, 0.97);
    color: var(--text);
    border: 0;
    border-radius: 0.9em;
    padding: 0.95em 1.2em;
    display: flex;
    gap: 0.8em;
    align-items: center;
    justify-content: space-between;
    font-weight: 700;
    font-size: 1.05em;
    text-align: left;
    z-index: 6;
    box-shadow: 0 0.6em 2em rgba(0, 0, 0, 0.35);
    cursor: pointer;
    animation: enter 0.2s ease-out;
  }
  .skip {
    font: 800 0.75em var(--font-body);
    border: 1px solid #3a5079;
    border-radius: 0.45em;
    padding: 0.2em 0.5em;
    color: var(--text-2);
  }
  @keyframes enter {
    from {
      opacity: 0;
      transform: translate(-50%, -40%);
    }
  }
</style>
