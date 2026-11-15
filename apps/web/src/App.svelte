<script lang="ts">
  // Tela provisória da Etapa 0: confirma que interface e motor estão ligados.
  import { createSeededRandom, rollDie } from '@senhorio/engine';

  const random = createSeededRandom(Date.now());
  let dice = $state<[number, number] | null>(null);

  function roll() {
    dice = [rollDie(random, 6), rollDie(random, 6)];
  }
</script>

<main>
  <h1>Senhorio</h1>
  <p class="status">Em construção: Etapa 0 (fundação).</p>
  <button type="button" onclick={roll}>Rolar dados de teste</button>
  {#if dice}
    <p aria-live="polite">Resultado: {dice[0]} + {dice[1]} = {dice[0] + dice[1]}</p>
  {/if}
</main>

<style>
  main {
    display: grid;
    gap: 1rem;
    justify-items: center;
    padding: 4rem 1rem;
    text-align: center;
  }

  h1 {
    margin: 0;
    font-size: clamp(2.5rem, 8vw, 4rem);
  }

  .status {
    color: var(--color-text-muted);
  }

  button {
    font: inherit;
    font-weight: 600;
    padding: 0.75rem 1.5rem;
    border: none;
    border-radius: 12px;
    background: var(--color-accent);
    color: var(--color-background);
    cursor: pointer;
  }

  button:focus-visible {
    outline: 3px solid var(--color-text);
    outline-offset: 3px;
  }
</style>
