<script lang="ts">
  // Logo C do Senhorio: casas empilhadas nas cores dos grupos.
  import { rules } from '../rules';

  let { size = '2.3em', decorative = false }: { size?: string; decorative?: boolean } = $props();

  const colors = Object.values(rules.groups).map((g) => g.color);
  const heights = [1, 1, 2, 2, 3, 3, 4, 4];
  const houses = heights.flatMap((h, c) =>
    Array.from({ length: h }, (_, r) => {
      const x = c * 11;
      const y = 40 - (r + 1) * 10;
      return {
        d: `M${x + 4.5} ${y} L${x + 9} ${y + 3.6} V${y + 9} H${x} V${y + 3.6} Z`,
        color: colors[c % colors.length],
      };
    }),
  );
</script>

<svg
  class="logo"
  style:width={size}
  viewBox="0 0 88 40"
  role={decorative ? undefined : 'img'}
  aria-hidden={decorative ? 'true' : undefined}
  aria-label={decorative ? undefined : 'Senhorio'}
>
  {#each houses as house, i (i)}
    <path d={house.d} fill={house.color} />
  {/each}
</svg>

<style>
  .logo {
    height: auto;
    flex: none;
  }
</style>
