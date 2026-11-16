<script lang="ts">
  // Tabuleiro de 40 casas em grade 11 × 11 (mockups): Partida embaixo à direita, sentido horário.
  import type { Snippet } from 'svelte';
  import { brl, rules } from '../rules';
  import Icon from '../ui/Icon.svelte';
  import type { IconName } from '../ui/icons';
  import Logo from '../ui/Logo.svelte';
  import type { View } from './view';

  let {
    view,
    highlight = -1,
    marked = [],
    showNames = false,
    children,
  }: {
    view: View;
    highlight?: number;
    /** Propriedades em destaque (a escolhida na lista de construir, hipotecar, vender...). */
    marked?: number[];
    /** true: as ruas mostram o nome em vez do preço. */
    showNames?: boolean;
    children?: Snippet;
  } = $props();

  const hotel = rules.parameters.maxHouses + 1;

  function cellPos(p: number) {
    if (p <= 10) return { row: 11, col: 11 - p, side: 'bottom' };
    if (p < 20) return { row: 11 - (p - 10), col: 1, side: 'left' };
    if (p <= 30) return { row: 1, col: p - 19, side: 'top' };
    return { row: p - 29, col: 11, side: 'right' };
  }

  /** Nome curto para tabuleiro pequeno: "Rua das Palmeiras" → "Palmeiras". */
  function shortName(name: string): string {
    const short = name.replace(
      /^(Rua|Travessa|Beco|Avenida|Alameda|Estação|Companhia)( (da|de|do|das|dos))?\s+/i,
      '',
    );
    return short.charAt(0).toUpperCase() + short.slice(1);
  }

  /** Ícone das casas especiais (no celular, no lugar do rótulo). */
  function iconFor(type: string, name: string): IconName | null {
    switch (type) {
      case 'station':
        return 'station';
      case 'utility':
        return /água/i.test(name) ? 'drop' : 'bolt';
      case 'tax':
        return 'receipt';
      case 'chance':
        return 'question';
      case 'setback':
        return 'exclaim';
      default:
        return null;
    }
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
      short: shortName(space.name),
      icon: iconFor(space.type, space.name),
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

<div class="board" class:names={showNames} role="group" aria-label="Tabuleiro">
  {#each cells as cell (cell.p)}
    {@const property = view.properties[String(cell.p)]}
    {@const owner = property && property.owner >= 0 ? view.players[property.owner] : undefined}
    {@const pawns = pawnsAt(cell.p)}
    <div
      class="cell s-{cell.side}"
      class:corner={cell.corner}
      class:here={cell.p === highlight}
      class:marked={marked.includes(cell.p)}
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
      {/if}
      <span class="text">
        {#if cell.type === 'street' && !showNames}
          <span class="price">{brl(cell.price)}</span>
        {:else if cell.type === 'street' || ((cell.type === 'station' || cell.type === 'utility') && showNames)}
          <span class="name full">{cell.name}</span>
          <span class="name short">{cell.short}</span>
        {:else}
          <span class="lbl">{cell.label}</span>
          {#if cell.icon}<span class="ico"><Icon name={cell.icon} /></span>{/if}
        {/if}
      </span>
      {#if owner}<span class="own" style:background={owner.color}></span>{/if}
      {#if pawns.length}
        <span class="pawns n{Math.min(pawns.length, 6)}" aria-hidden="true">
          {#each pawns as pawn (pawn.i)}
            <span class="pawn" style:background={pawn.color}
              >{pawn.name.slice(0, 1).toUpperCase()}</span
            >
          {/each}
        </span>
      {/if}
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
    overflow: hidden;
  }
  .corner {
    background: var(--board-corner);
    font-size: 1.9cqw;
  }

  /* texto da casa: fica do lado oposto à faixa de cor; com peões, encosta na borda */
  .text {
    display: grid;
    justify-items: center;
    gap: 0.15em;
    min-width: 0;
    max-width: 100%;
  }
  .s-bottom .text {
    margin-top: 22%;
  }
  .s-top .text {
    margin-bottom: 22%;
  }
  .s-left .text {
    margin-right: 22%;
  }
  .s-right .text {
    margin-left: 22%;
  }
  .lbl {
    font-size: 0.86em;
    color: #3b4459;
  }
  .corner .lbl {
    color: var(--ink);
    font-size: 1em;
  }
  .ico {
    display: none;
    color: #3b4459;
  }
  .ico :global(svg) {
    width: 3.2cqw;
    height: 3.2cqw;
  }
  .price {
    font-variant-numeric: tabular-nums;
  }
  .name {
    font-size: 0.78em;
    line-height: 1.05;
    overflow-wrap: anywhere;
    hyphens: auto;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .name.short {
    display: none;
  }
  .s-bottom:not(.corner).has-pawn .text {
    margin-top: 0;
    align-self: flex-end;
    margin-bottom: 6%;
  }
  .s-top:not(.corner).has-pawn .text {
    margin-bottom: 0;
    align-self: flex-start;
    margin-top: 6%;
  }
  .s-left:not(.corner).has-pawn .text {
    margin-right: 0;
    margin-inline-end: auto;
    margin-left: 4%;
  }
  .s-right:not(.corner).has-pawn .text {
    margin-left: 0;
    margin-inline-start: auto;
    margin-right: 4%;
  }
  .corner.has-pawn .text {
    align-self: flex-end;
    margin-bottom: 10%;
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
  .mortgaged {
    background: repeating-linear-gradient(
      -45deg,
      var(--board),
      var(--board) 5px,
      #e3dccb 5px,
      #e3dccb 10px
    );
  }
  .mortgaged .price,
  .mortgaged .name {
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
  .marked {
    z-index: 3;
    box-shadow:
      inset 0 0 0 0.45cqw var(--focus),
      0 0 0 0.3cqw var(--ink);
    animation: mark 1.1s ease-in-out infinite alternate;
  }
  @keyframes mark {
    to {
      box-shadow:
        inset 0 0 0 0.25cqw var(--focus),
        0 0 0 0.3cqw var(--ink);
    }
  }

  /* peões: agrupados em grade dentro da casa; ficam menores quando são muitos */
  .pawns {
    position: absolute;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-content: center;
    gap: 0.25cqw;
    z-index: 2;
    --size: 3.1cqw;
  }
  .pawns.n3,
  .pawns.n4 {
    --size: 2.5cqw;
  }
  .pawns.n5,
  .pawns.n6 {
    --size: 2.05cqw;
  }
  .s-bottom .pawns {
    left: 4%;
    right: 4%;
    top: 24%;
    height: 46%;
  }
  .s-top .pawns {
    left: 4%;
    right: 4%;
    bottom: 24%;
    height: 46%;
  }
  .s-left .pawns {
    top: 6%;
    bottom: 6%;
    right: 24%;
    width: 46%;
  }
  .s-right .pawns {
    top: 6%;
    bottom: 6%;
    left: 24%;
    width: 46%;
  }
  .corner .pawns {
    left: 6%;
    right: 6%;
    top: 6%;
    height: 56%;
  }
  .pawn {
    width: var(--size);
    height: var(--size);
    border-radius: 50%;
    border: max(1px, 0.22cqw) solid var(--ink);
    display: grid;
    place-items: center;
    font: 700 calc(var(--size) * 0.55) / 1 var(--font-display);
    color: var(--ink);
    flex: none;
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
  /* logo e cartão dividem a mesma célula da grade, os dois centralizados
     (sem posição absoluta: no celular o cartão sai do tabuleiro e a logo fica) */
  .center > :global(*) {
    grid-area: 1 / 1;
  }
  .mark {
    width: 34%;
    opacity: 0.16;
    display: grid;
    pointer-events: none;
  }

  /* tabuleiro grande (tablet, desktop e TV): nome completo da rua */
  @container board (min-width: 600px) {
    .names .name {
      font-size: 0.72em;
    }
  }

  /* celular: preços maiores, ícones no lugar dos rótulos e nomes curtos */
  @container board (max-width: 599px) {
    .name.full {
      display: none;
    }
    .name.short {
      display: -webkit-box;
      font-size: 0.82em;
      -webkit-line-clamp: 2;
      line-clamp: 2;
    }
  }
  @container board (max-width: 420px) {
    .cell {
      font-size: 2.15cqw;
    }
    .cell:not(.corner) .lbl {
      display: none;
    }
    .cell:not(.corner) .ico {
      display: grid;
    }
    .ico :global(svg) {
      width: 4.4cqw;
      height: 4.4cqw;
    }
    .corner .lbl {
      font-size: 0.8em;
    }
    .name.short {
      font-size: 0.86em;
    }
    .pawns {
      --size: 4.4cqw;
    }
    .pawns.n3,
    .pawns.n4 {
      --size: 3.5cqw;
    }
    .pawns.n5,
    .pawns.n6 {
      --size: 2.9cqw;
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
  @media (prefers-reduced-motion: reduce) {
    .marked {
      animation: none;
    }
  }
</style>
