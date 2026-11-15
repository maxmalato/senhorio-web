<script lang="ts" module>
  export interface PlayerSetup {
    name: string;
    color: string;
  }
</script>

<script lang="ts">
  // Jogadores (T-03, D-23): quantidade, nome e cor de cada um. Cores já escolhidas ficam
  // desabilitadas (RN-002).
  import { defaultNames, PAWN_COLORS, rules, t } from '../rules';
  import { focusDefault } from '../ui/focus';
  import Icon from '../ui/Icon.svelte';
  import Stepper from '../ui/Stepper.svelte';

  let {
    players = $bindable(),
    onback,
    onnext,
  }: { players: PlayerSetup[]; onback: () => void; onnext: () => void } = $props();

  const p = rules.parameters;
  let count = $state(players.length);

  // ajusta a lista quando a quantidade muda, mantendo o que já foi digitado
  $effect(() => {
    if (count === players.length) return;
    const next = players.slice(0, count);
    for (let i = next.length; i < count; i++) {
      const used = new Set(next.map((pl) => pl.color));
      next.push({
        name: defaultNames[i] ?? t('I-57', { n: i + 1 }),
        color:
          PAWN_COLORS.find((c) => !used.has(c)) ?? PAWN_COLORS[i % PAWN_COLORS.length] ?? '#fff',
      });
    }
    players = next;
  });

  const valid = $derived(
    players.every((pl) => pl.name.trim().length > 0 && pl.name.trim().length <= p.maxNameLength) &&
      new Set(players.map((pl) => pl.color)).size === players.length,
  );
</script>

<div class="full-screen">
  <div class="sheet" use:focusDefault>
    <button class="back" type="button" onclick={onback}><Icon name="back" />{t('I-08')}</button>
    <div>
      <p class="step">{t('I-55', { n: 1, total: 3 })}</p>
      <h1>{t('D-23')}</h1>
    </div>
    <Stepper
      bind:value={count}
      min={p.minPlayers}
      max={p.maxPlayers}
      step={1}
      format={(n) => `${n} ${t('I-66')}`}
      label={t('I-58')}
    />
    <ol class="list">
      {#each players as player, i (i)}
        <li class="row">
          <span class="avatar" style:background={player.color} aria-hidden="true"
            >{player.name.trim().slice(0, 1).toUpperCase() || i + 1}</span
          >
          <div class="fields">
            <label class="visually-hidden" for="player-name-{i}">{t('I-88', { n: i + 1 })}</label>
            <input
              id="player-name-{i}"
              class="input"
              bind:value={player.name}
              maxlength={p.maxNameLength}
              placeholder={t('I-57', { n: i + 1 })}
              autocomplete="off"
            />
            <div
              class="swatches"
              role="radiogroup"
              aria-label="{t('I-56')} de {player.name || t('I-57', { n: i + 1 })}"
            >
              {#each PAWN_COLORS as color, c (color)}
                {@const takenBy = players.findIndex((other, j) => j !== i && other.color === color)}
                <button
                  class="swatch"
                  type="button"
                  role="radio"
                  aria-checked={player.color === color}
                  aria-label="{t('I-56')} {c + 1}"
                  disabled={takenBy !== -1}
                  style:background={color}
                  onclick={() => (player.color = color)}
                ></button>
              {/each}
            </div>
          </div>
        </li>
      {/each}
    </ol>
    <button class="btn gold" type="button" data-default="true" disabled={!valid} onclick={onnext}
      >{t('I-62')}</button
    >
    <p class="footnote">Até {p.maxNameLength} letras por nome. O jogo guarda só os apelidos.</p>
  </div>
</div>

<style>
  .step {
    margin: 0 0 0.3em;
    font-size: 0.78em;
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--text-2);
    text-transform: uppercase;
  }
  .list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.6em;
  }
  .row {
    display: flex;
    gap: 0.8em;
    align-items: flex-start;
    background: var(--panel);
    border-radius: 1em;
    padding: 0.7em 0.8em;
  }
  .row .avatar {
    margin-top: 0.3em;
  }
  .fields {
    display: grid;
    gap: 0.5em;
    flex: 1;
    min-width: 0;
  }
  .swatch {
    width: 2.1em;
    height: 2.1em;
  }
</style>
