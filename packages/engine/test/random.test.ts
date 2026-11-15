import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { createSeededRandom, rollDie } from '../src/random';

describe('createSeededRandom', () => {
  it('gera a mesma sequência para a mesma semente', () => {
    const a = createSeededRandom(42);
    const b = createSeededRandom(42);
    const seqA = Array.from({ length: 10 }, () => a());
    const seqB = Array.from({ length: 10 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('gera sequências diferentes para sementes diferentes', () => {
    const a = createSeededRandom(1);
    const b = createSeededRandom(2);
    expect(a()).not.toBe(b());
  });

  it('sempre fica no intervalo [0, 1)', () => {
    fc.assert(
      fc.property(fc.integer(), (seed) => {
        const random = createSeededRandom(seed);
        for (let i = 0; i < 100; i++) {
          const value = random();
          if (value < 0 || value >= 1) return false;
        }
        return true;
      }),
    );
  });
});

describe('rollDie', () => {
  it('sempre devolve um inteiro entre 1 e a quantidade de faces', () => {
    fc.assert(
      fc.property(fc.integer(), fc.integer({ min: 1, max: 100 }), (seed, faces) => {
        const value = rollDie(createSeededRandom(seed), faces);
        return Number.isInteger(value) && value >= 1 && value <= faces;
      }),
    );
  });

  it('recusa quantidade de faces inválida', () => {
    const random = createSeededRandom(1);
    expect(() => rollDie(random, 0)).toThrow(RangeError);
    expect(() => rollDie(random, 2.5)).toThrow(RangeError);
  });
});
