import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import {
  FACE_NORMALS,
  faceUp,
  hopHeight,
  MATERIAL_VALUES,
  restingQuaternion,
  tumbleQuaternion,
} from './orientation';

describe('dados 3D: orientação', () => {
  it('a face sorteada fica para cima, qualquer que seja o giro', () => {
    for (let value = 1; value <= 6; value++) {
      for (const twist of [0, 0.4, -1.2, Math.PI]) {
        expect(faceUp(restingQuaternion(value, twist))).toBe(value);
      }
    }
  });

  it('a animação termina exatamente na face sorteada', () => {
    const axis = new Vector3(0.3, 0.2, -0.9).normalize();
    for (let value = 1; value <= 6; value++) {
      const rest = restingQuaternion(value, 0.3);
      expect(faceUp(tumbleQuaternion(rest, axis, 2.3, 1))).toBe(value);
      // no começo o dado ainda está girando, fora do repouso
      expect(tumbleQuaternion(rest, axis, 2.3, 0).angleTo(rest)).toBeGreaterThan(0.1);
    }
  });

  it('faces opostas somam 7, como num dado de verdade', () => {
    for (let value = 1; value <= 6; value++) {
      const opposite = FACE_NORMALS[7 - value]!;
      expect(FACE_NORMALS[value]!.dot(opposite)).toBeCloseTo(-1);
    }
  });

  it('cada material da caixa mostra o valor da face com a mesma normal', () => {
    const boxNormals = [
      new Vector3(1, 0, 0),
      new Vector3(-1, 0, 0),
      new Vector3(0, 1, 0),
      new Vector3(0, -1, 0),
      new Vector3(0, 0, 1),
      new Vector3(0, 0, -1),
    ];
    MATERIAL_VALUES.forEach((value, i) => {
      expect(FACE_NORMALS[value]!.equals(boxNormals[i]!)).toBe(true);
    });
  });

  it('o pulo começa e termina no chão', () => {
    expect(hopHeight(0, 0.6)).toBeCloseTo(0);
    expect(hopHeight(1, 0.6)).toBeCloseTo(0);
    expect(hopHeight(0.25, 0.6)).toBeGreaterThan(0.1);
  });

  it('recusa valor fora de 1 a 6', () => {
    expect(() => restingQuaternion(7)).toThrow();
  });
});
