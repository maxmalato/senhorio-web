<script lang="ts">
  // Painel de jogadores (C-02): dinheiro, propriedades e de quem é a vez, sempre à vista.
  import { brl, propertyColor, t } from '../rules';
  import type { View } from './view';

  let { view }: { view: View } = $props();

  function owned(i: number): number[] {
    return Object.entries(view.properties)
      .filter(([, p]) => p.owner === i)
      .map(([pos]) => Number(pos))
      .sort((a, b) => a - b);
  }
</script>

<ul class="players" aria-label="Jogadores">
  {#each view.players as player, i (i)}
    <li
      class="player"
      class:turn={i === view.current && !player.bankrupt}
      class:out={player.bankrupt}
    >
      <span class="avatar" style:background={player.color} aria-hidden="true"
        >{player.name.slice(0, 1).toUpperCase()}</span
      >
      <div class="who">
        <div class="pname">
          {player.name}
          {#if i === view.current && !player.bankrupt}<span class="tag">{t('I-03')}</span>{/if}
          {#if player.inJail}<span class="tag jail">{t('I-04')}</span>{/if}
          {#if player.bankrupt}<span class="tag off">{t('I-05', { n: player.exitRound })}</span
            >{/if}
        </div>
        <div class="chips" aria-hidden="true">
          {#each owned(i) as pos (pos)}
            <i
              style:background={propertyColor(pos)}
              class:mortgaged={view.properties[String(pos)]?.mortgaged}
            ></i>
          {/each}
        </div>
      </div>
      <span class="money">{player.bankrupt ? t('I-84') : brl(player.money)}</span>
    </li>
  {/each}
</ul>

<style>
  .players {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }
  .player {
    background: var(--panel);
    border-radius: 0.9em;
    padding: 0.6em 0.8em;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 0 0.6em;
    align-items: center;
    border: 2px solid transparent;
    min-width: 0;
  }
  .player.turn {
    border-color: var(--focus);
  }
  .player.out {
    opacity: 0.6;
  }
  .avatar {
    width: 2.3em;
    height: 2.3em;
    border-radius: 50%;
    display: grid;
    place-items: center;
    font: 700 1.05em/1 var(--font-display);
    color: var(--ink);
  }
  .who {
    min-width: 0;
  }
  .pname {
    font: 600 1.05em/1.15 var(--font-display);
    display: flex;
    align-items: center;
    gap: 0.4em;
    flex-wrap: wrap;
  }
  .tag {
    font: 800 0.58em/1 var(--font-body);
    letter-spacing: 0.08em;
    padding: 0.35em 0.5em;
    border-radius: 0.5em;
    background: var(--focus);
    color: var(--ink);
    white-space: nowrap;
  }
  .tag.jail {
    background: #34507e;
    color: var(--text);
  }
  .tag.off {
    background: var(--danger);
    color: #2a0f0d;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25em;
    margin-top: 0.3em;
  }
  .chips i {
    width: 0.9em;
    height: 0.45em;
    border-radius: 0.15em;
  }
  .chips i.mortgaged {
    opacity: 0.35;
  }
  .money {
    font: 600 1.15em var(--font-display);
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
</style>
