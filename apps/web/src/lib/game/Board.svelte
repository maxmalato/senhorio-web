<script lang="ts">
  // Tabuleiro de 40 casas em grade 11 × 11 (mockups): Partida embaixo à direita, sentido horário.
  import type { Snippet } from 'svelte';
  import { brl, rules } from '../rules';
  import Icon from '../ui/Icon.svelte';
  import Logo from '../ui/Logo.svelte';
  import type { View } from './view';

  let {
    view,
    highlight = -1,
    children,
  }: { view: View; highlight?: number; children?: Snippet } = $props();

  const hotel = rules.parameters.maxHouses + 1;

  function cellPos(p: number) {
    if (p <= 10) return { row: 11, col: 11 - p, side: 'bottom' };
    if (p < 20) return { row: 11 - (p - 10), col: 1, side: 'left' };
    if (p <= 30) return { row: 1, col: p - 19, side: 'top' };
    return { row: p - 29, col: 11, side: 'right' };
  }

  const cells = rules.spaces.map((space, p) => {
    const pos = cellPos(p);
    const group = space.type === 'street' ? rules.groups[space.group] : undefined;
    return {
      p,
      ...pos,
      corner: p % 10 === 0,
      type: space.type,
      label: 'label' in space ? space.label : space.name,
      name: space.name,
      price: 'price' in space ? space.price : 0,
      color: group?.color ?? '',
    };
  });

  function pawnsAt(p: number) {
    return view.players
      .map((pl, i) => ({ ...pl, i }))
      .filter((pl) => !pl.bankrupt && pl.position === p);
  }

  function describe(p: number): string {
    const cell = cells[p];
    if (!cell) return '';
    const parts = [cell.name];
    if (cell.price) parts.push(brl(cell.price));
    const property = view.properties[String(p)];
    if (property && property.owner >= 0) {
      parts.push(`de ${view.players[property.owner]?.name ?? ''}`);
      if (property.houses === hotel) parts.push('hotel');
      else if (property.houses > 0) parts.push(`${property.houses} casas`);
      if (property.mortgaged) parts.push('hipotecada');
    }
    const here = pawnsAt(p).map((pl) => pl.name);
    if (here.length) parts.push(`peões: ${here.join(', ')}`);
    return parts.join(', ');
  }
</script>

<div class="board" role="group" aria-label="Tabuleiro">
  {#each cells as cell (cell.p)}
    {@const property = view.properties[String(cell.p)]}
    {@const owner = property && property.owner >= 0 ? view.players[property.owner] : undefined}
    {@const pawns = pawnsAt(cell.p)}
    <div
      class="cell s-{cell.side}"
      class:corner={cell.corner}
      class:here={cell.p === highlight}
      class:mortgaged={property?.mortgaged}
      class:has-pawn={pawns.length > 0}
      style:grid-row={cell.row}
      style:grid-column={cell.col}
      title={describe(cell.p)}
    >
      {#if cell.type === 'street'}
        <span class="band" style:background={cell.color}>
          {#if property && property.houses === hotel}
            <span class="hotel"><Icon name="house" /></span>
          {:else if property}
            {#each Array.from({ length: property.houses }, (_v, h) => h) as h (h)}<Icon
                name="house"
              />{/each}
          {/if}
        </span>
        <span class="price">{brl(cell.price)}</span>
      {:else}
        <span class="lbl">{cell.label}</span>
      {/if}
      {#if owner}<span class="own" style:background={owner.color}></span>{/if}
      {#each pawns as pawn, k (pawn.i)}
        <span
          class="pawn"
          style:background={pawn.color}
          style:translate={pawns.length > 1 ? `${(k - (pawns.length - 1) / 2) * 55}% 0` : undefined}
          aria-hidden="true">{pawn.name.slice(0, 1).toUpperCase()}</span
        >
      {/each}
    </div>
  {/each}
  <div class="center">
    <div class="mark"><Logo size="100%" decorative /></div>
    {@render children?.()}
  </div>
  <p class="visually-hidden" aria-live="polite">
    {#each view.players as pl (pl.name)}{pl.name}: {pl.bankrupt
        ? 'faliu'
        : cells[pl.position]?.name}.
    {/each}
  </p>
</div>

<style>
  .board {
    container: board / inline-size;
    width: 100%;
    aspect-ratio: 1 / 1;
    max-width: 100%;
    background: var(--board);
    border-radius: 10px;
    display: grid;
    grid-template-columns: 1.55fr repeat(9, 1fr) 1.55fr;
    grid-template-rows: 1.55fr repeat(9, 1fr) 1.55fr;
    overflow: hidden;
    color: var(--ink);
    position: relative;
  }
  .cell {
    position: relative;
    border: 0.5px solid var(--board-line);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-weight: 800;
    font-size: 1.65cqw;
    line-height: 1.1;
    min-width: 0;
    min-height: 0;
    padding: 1px;
  }
  .lbl {
    font-size: 0.86em;
    color: #3b4459;
    overflow: hidden;
  }
  .corner {
    background: var(--board-corner);
    font-size: 1.9cqw;
  }
  .corner .lbl {
    color: var(--ink);
    font-size: 1em;
  }
  .band {
    position: absolute;
    display: flex;
    gap: 6%;
    align-items: center;
    justify-content: center;
  }
  .s-bottom .band {
    left: 0;
    right: 0;
    top: 0;
    height: 22%;
  }
  .s-top .band {
    left: 0;
    right: 0;
    bottom: 0;
    height: 22%;
  }
  .s-left .band {
    top: 0;
    bottom: 0;
    right: 0;
    width: 22%;
    flex-direction: column;
  }
  .s-right .band {
    top: 0;
    bottom: 0;
    left: 0;
    width: 22%;
    flex-direction: column;
  }
  .band :global(svg) {
    width: 1.35cqw;
    height: 1.35cqw;
    fill: #fff;
  }
  .hotel :global(svg) {
    width: 2.2cqw;
    height: 2.2cqw;
    fill: #c62f2f;
    stroke: #fff;
    stroke-width: 1;
  }
  .price {
    font-variant-numeric: tabular-nums;
  }
  .s-bottom .price {
    margin-top: 22%;
  }
  .s-top .price {
    margin-bottom: 22%;
  }
  .s-left .price {
    margin-right: 22%;
  }
  .s-right .price {
    margin-left: 22%;
  }
  .mortgaged {
    background: repeating-linear-gradient(
      -45deg,
      var(--board),
      var(--board) 5px,
      #e3dccb 5px,
      #e3dccb 10px
    );
  }
  .mortgaged .price {
    text-decoration: line-through;
    opacity: 0.6;
  }
  .own {
    position: absolute;
    width: 1.15cqw;
    height: 1.15cqw;
    border-radius: 50%;
    border: 1px solid rgba(0, 0, 0, 0.35);
  }
  .s-bottom .own {
    bottom: 6%;
    right: 8%;
  }
  .s-top .own {
    top: 6%;
    right: 8%;
  }
  .s-left .own {
    left: 6%;
    bottom: 10%;
  }
  .s-right .own {
    right: 6%;
    bottom: 10%;
  }
  .here {
    background: #fff3cf;
    box-shadow: inset 0 0 0 2px var(--ink);
  }
  .pawn {
    position: absolute;
    margin: auto;
    width: 3.1cqw;
    height: 3.1cqw;
    border-radius: 50%;
    border: max(1px, 0.25cqw) solid var(--ink);
    display: grid;
    place-items: center;
    font: 700 1.7cqw/1 var(--font-display);
    color: var(--ink);
    z-index: 2;
    transition:
      left 0.12s,
      top 0.12s;
  }
  .s-bottom .pawn {
    top: 23%;
    left: 0;
    right: 0;
  }
  .s-top .pawn {
    bottom: 23%;
    left: 0;
    right: 0;
  }
  .s-left .pawn {
    right: 23%;
    top: 0;
    bottom: 0;
  }
  .s-right .pawn {
    left: 23%;
    top: 0;
    bottom: 0;
  }
  .corner .pawn {
    inset: auto;
    top: 10%;
    right: 10%;
    margin: 0;
  }
  .s-bottom:not(.corner).has-pawn :is(.price, .lbl) {
    margin-top: 0;
    align-self: flex-end;
    margin-bottom: 8%;
  }
  .s-top:not(.corner).has-pawn :is(.price, .lbl) {
    margin-bottom: 0;
    align-self: flex-start;
    margin-top: 8%;
  }
  .s-left.has-pawn :is(.price, .lbl) {
    margin-right: 0;
    margin-inline-end: auto;
    margin-left: 4%;
  }
  .s-right.has-pawn :is(.price, .lbl) {
    margin-left: 0;
    margin-inline-start: auto;
    margin-right: 4%;
  }
  .center {
    grid-column: 2 / 11;
    grid-row: 2 / 11;
    position: relative;
    display: grid;
    place-items: center;
    background: var(--board-center);
    min-width: 0;
    min-height: 0;
  }
  .mark {
    position: absolute;
    width: 34%;
    opacity: 0.16;
    display: grid;
  }

  /* celular: preços maiores, nomes das casas especiais escondidos (o cartão mostra) */
  @container board (max-width: 420px) {
    .cell {
      font-size: 2.15cqw;
    }
    .lbl {
      display: none;
    }
    .corner .lbl {
      display: block;
      font-size: 0.8em;
    }
    .pawn {
      width: 4.6cqw;
      height: 4.6cqw;
      font-size: 2.6cqw;
    }
    .band :global(svg) {
      width: 1.9cqw;
      height: 1.9cqw;
    }
    .own {
      width: 1.7cqw;
      height: 1.7cqw;
    }
  }
</style>
