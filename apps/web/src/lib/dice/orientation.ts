// Orientação dos dados em 3D (Etapa 6). O resultado vem sempre do motor: a animação só
// gira o dado até a face sorteada ficar para cima. Matemática pura, testável sem WebGL.

import { Quaternion, Vector3 } from 'three';

/** Para cima no mundo: a face voltada para cá é a que vale. */
export const UP = new Vector3(0, 1, 0);

/** Normal (no próprio dado) da face com cada valor; faces opostas somam 7, como num dado real. */
export const FACE_NORMALS: Readonly<Record<number, Vector3>> = {
  1: new Vector3(0, 1, 0),
  6: new Vector3(0, -1, 0),
  2: new Vector3(0, 0, 1),
  5: new Vector3(0, 0, -1),
  3: new Vector3(1, 0, 0),
  4: new Vector3(-1, 0, 0),
};

/** Valor de cada material na ordem das faces do BoxGeometry: +X, −X, +Y, −Y, +Z, −Z. */
export const MATERIAL_VALUES = [3, 4, 1, 6, 2, 5] as const;

/** Orientação de repouso com a face `value` para cima e um giro `twist` (rad) em torno do eixo vertical. */
export function restingQuaternion(value: number, twist = 0): Quaternion {
  const normal = FACE_NORMALS[value];
  if (!normal) throw new Error(`valor de dado inválido: ${value}`);
  const align = new Quaternion().setFromUnitVectors(normal, UP);
  return new Quaternion().setFromAxisAngle(UP, twist).multiply(align);
}

export function easeOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t));
  return 1 - (1 - x) ** 3;
}

/**
 * Orientação no instante t (0 a 1): gira `turns` voltas em torno de `axis`, desacelerando,
 * e termina exatamente em `rest`.
 */
export function tumbleQuaternion(
  rest: Quaternion,
  axis: Vector3,
  turns: number,
  t: number,
  out = new Quaternion(),
): Quaternion {
  const angle = turns * 2 * Math.PI * (1 - easeOutCubic(t));
  return out.setFromAxisAngle(axis, angle).multiply(rest);
}

/** Altura do pulo no instante t: dois quiques que diminuem até parar. */
export function hopHeight(t: number, height: number): number {
  const x = Math.min(1, Math.max(0, t));
  return Math.abs(Math.sin(x * Math.PI * 2)) * height * (1 - x) ** 2;
}

/** Valor da face voltada para cima numa orientação (0 se nenhuma estiver alinhada). */
export function faceUp(q: Quaternion): number {
  for (const [value, normal] of Object.entries(FACE_NORMALS)) {
    if (normal.clone().applyQuaternion(q).dot(UP) > 0.999) return Number(value);
  }
  return 0;
}
