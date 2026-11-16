<script lang="ts">
  // Cor do peão: as já escolhidas por outros ficam desabilitadas (RN-002).
  import { PAWN_COLORS, t } from '../rules';

  let {
    value = $bindable(),
    taken = [],
    label,
  }: { value: string; taken?: string[]; label: string } = $props();
</script>

<div class="swatches" role="radiogroup" aria-label={label}>
  {#each PAWN_COLORS as color, i (color)}
    <button
      class="swatch"
      type="button"
      role="radio"
      aria-checked={value === color}
      aria-label="{t('I-56')} {i + 1}"
      disabled={taken.includes(color)}
      style:background={color}
      onclick={() => (value = color)}
    ></button>
  {/each}
</div>
