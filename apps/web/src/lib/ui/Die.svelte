<script lang="ts">
  // Face de um dado (decorativa: o texto ao lado diz o resultado).
  let { value, rolling = false }: { value: number; rolling?: boolean } = $props();

  const PIPS: Record<number, [number, number][]> = {
    1: [[12, 12]],
    2: [
      [7, 7],
      [17, 17],
    ],
    3: [
      [7, 7],
      [12, 12],
      [17, 17],
    ],
    4: [
      [7, 7],
      [17, 7],
      [7, 17],
      [17, 17],
    ],
    5: [
      [7, 7],
      [17, 7],
      [12, 12],
      [7, 17],
      [17, 17],
    ],
    6: [
      [7, 6.5],
      [17, 6.5],
      [7, 12],
      [17, 12],
      [7, 17.5],
      [17, 17.5],
    ],
  };
</script>

<svg class="die" class:rolling viewBox="0 0 24 24" aria-hidden="true">
  <rect
    x="1.5"
    y="1.5"
    width="21"
    height="21"
    rx="4.5"
    fill="#fff"
    stroke="#1b2436"
    stroke-width="2"
  />
  {#each PIPS[value] ?? [] as [x, y], i (i)}
    <circle cx={x} cy={y} r="2.1" fill="#1b2436" />
  {/each}
</svg>

<style>
  .die {
    width: 2em;
    height: 2em;
    flex: none;
  }
  .rolling {
    animation: roll 0.5s ease-out;
  }
  @keyframes roll {
    0% {
      transform: rotate(-200deg) scale(0.6);
    }
    100% {
      transform: rotate(0) scale(1);
    }
  }
</style>
