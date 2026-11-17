<script lang="ts">
  // QR Code gerado no próprio aparelho (biblioteca uqr): o link da sala nunca vai para um
  // serviço de fora. Desenhado como SVG pelo Svelte, quadradinho por quadradinho.
  import { encode } from 'uqr';

  let { text, label }: { text: string; label: string } = $props();

  const qr = $derived(encode(text, { ecc: 'M', border: 2 }));
  // um único caminho com todos os módulos escuros (leve até numa TV fraca)
  const path = $derived.by(() => {
    let d = '';
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return d;
  });
</script>

<svg
  class="qr"
  viewBox="0 0 {qr.size} {qr.size}"
  role="img"
  aria-label={label}
  shape-rendering="crispEdges"
>
  <rect width={qr.size} height={qr.size} fill="#fff" />
  <path d={path} fill="#1b2436" />
</svg>

<style>
  .qr {
    display: block;
    width: 100%;
    max-width: 14em;
    height: auto;
    border-radius: 0.6em;
  }
</style>
