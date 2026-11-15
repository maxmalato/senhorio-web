<script lang="ts">
  // Ícone decorativo (o texto ao lado diz o que é).
  import { ICONS, type IconDef, type IconName } from './icons';

  let { name }: { name: IconName } = $props();
  const icon: IconDef = $derived(ICONS[name]);
</script>

<svg
  viewBox={icon.viewBox ?? '0 0 24 24'}
  fill={icon.fill ? 'currentColor' : 'none'}
  stroke={icon.fill ? undefined : 'currentColor'}
  stroke-width={icon.fill ? undefined : (icon.width ?? 2.2)}
  stroke-linecap="round"
  stroke-linejoin="round"
  aria-hidden="true"
>
  {#each icon.nodes as node, i (i)}
    <svelte:element this={node.tag} {...node.attrs} />
  {/each}
</svg>
