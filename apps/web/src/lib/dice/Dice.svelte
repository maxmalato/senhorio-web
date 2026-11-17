<script lang="ts">
  // Os dois dados da jogada (Etapa 6): em 3D quando o aparelho pode, em 2D como reserva.
  // Enquanto o Three.js chega (ou se falhar), aparecem os dados 2D de sempre.
  import Die from '../ui/Die.svelte';
  import { loadDice3D } from './load';
  import { markUnavailable, reportSlow, SLOW_FRAME_MS, use3D } from './preference';

  let { d1, d2, durationMs }: { d1: number; d2: number; durationMs: number } = $props();

  let host: HTMLDivElement | undefined = $state();
  let ready = $state(false);

  $effect(() => {
    const a = d1;
    const b = d2;
    const box = host;
    if (!box || !use3D()) return;
    const started = performance.now();
    let cancelled = false;
    let canvas: HTMLCanvasElement | null = null;

    loadDice3D()
      .then((dice) => {
        if (cancelled) return;
        canvas = dice.canvas;
        box.appendChild(canvas);
        dice.resize(box.clientWidth, box.clientHeight);
        ready = true;
        // na primeira jogada o arquivo pode chegar atrasado: anima só o tempo que sobrou
        const left = durationMs - (performance.now() - started);
        if (left < 200) {
          dice.show(a, b);
          return;
        }
        void dice.roll(a, b, left).then((stats) => {
          if (stats.frames >= 6 && stats.averageFrameMs > SLOW_FRAME_MS) reportSlow();
        });
      })
      .catch(() => {
        markUnavailable();
        ready = false;
      });

    return () => {
      cancelled = true;
      canvas?.remove();
    };
  });
</script>

<div class="dice" class:three={ready} bind:this={host}>
  {#if !ready}
    <Die value={d1} rolling />
    <Die value={d2} rolling />
  {/if}
</div>

<style>
  .dice {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    flex: none;
    width: 4.5em;
    height: 2.4em;
  }
  .dice.three {
    width: 6.4em;
    height: 3.2em;
    margin: -0.4em -0.3em;
  }
  .dice :global(canvas.dice-3d) {
    width: 100%;
    height: 100%;
    display: block;
  }
</style>
