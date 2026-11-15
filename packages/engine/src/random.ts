// Aleatoriedade injetável (docs/07, diretriz 5): o motor nunca chama Math.random direto.
// Nos testes, um gerador com semente fixa reproduz qualquer cenário.

/** Fonte de números aleatórios no intervalo [0, 1). */
export type RandomSource = () => number;

/**
 * Gerador determinístico (mulberry32): a mesma semente sempre gera a mesma sequência.
 * Serve para testes e para reproduzir partidas; não é criptográfico.
 */
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** RN-012: rola um dado com a quantidade de faces vinda do arquivo de regras. */
export function rollDie(random: RandomSource, faces: number): number {
  if (!Number.isInteger(faces) || faces < 1) {
    throw new RangeError(`Quantidade de faces inválida: ${faces}`);
  }
  return Math.floor(random() * faces) + 1;
}
