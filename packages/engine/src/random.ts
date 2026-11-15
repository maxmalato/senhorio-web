// Aleatoriedade injetável (docs/07, diretriz 5): o motor nunca chama Math.random direto.
// Nos testes, um sorteador com resultados fixos reproduz qualquer cenário.

/** Fonte de números aleatórios no intervalo [0, 1). */
export type RandomSource = () => number;

/** O que o motor usa para sortear (porta do gerador do Sorteio.brs do Roku). */
export interface Randomizer {
  /** Face de um dado, de 1 a faces. */
  die(faces: number): number;
  /** Inteiro de 1 a n, usado no embaralhamento. */
  int(n: number): number;
}

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

/** Sorteador a partir de uma fonte aleatória (no jogo, crypto ou a semente de uma partida). */
export function createRandomizer(source: RandomSource): Randomizer {
  return {
    die: (faces) => rollDie(source, faces),
    int: (n) => rollDie(source, n),
  };
}

/**
 * Sorteador com resultados fixos, para testes e reprodução de bugs.
 * dice: faces na ordem em que serão roladas (de duas em duas por rolagem).
 * draws: valores para o embaralhamento; esgotados, devolve n (mantém a ordem original).
 */
export function createFixedRandomizer(dice: number[], draws: number[] = []): Randomizer {
  let nextDie = 0;
  let nextDraw = 0;
  return {
    die: () => {
      const value = dice[nextDie];
      if (value === undefined) throw new Error('o teste rolou mais dados do que a sequência fixa');
      nextDie++;
      return value;
    },
    int: (n) => {
      const value = draws[nextDraw];
      if (value === undefined) return n;
      nextDraw++;
      return value;
    },
  };
}
