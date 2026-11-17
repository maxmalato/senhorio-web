// Dados em 3D com Three.js (Etapa 6). Carregado sob demanda (import dinâmico), só quando a
// partida começa e o aparelho pode usar 3D. Uma cena só, reaproveitada em todas as jogadas:
// cada jogada só move a tela para o lugar dos dados e anima. Sem laço de desenho contínuo:
// fora da animação nada é redesenhado, para poupar bateria.

import {
  CanvasTexture,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Quaternion,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { hopHeight, MATERIAL_VALUES, restingQuaternion, tumbleQuaternion } from './orientation';

/** Cores do tema (apps/web/src/app.css): dado marfim com pontos azul-tinta. */
const FACE_COLOR = '#f6f2e8';
const PIP_COLOR = '#1b2436';
const SPACING = 0.72;

/** Posição dos pontos numa face de 0 a 1 (mesmo desenho do dado 2D). */
const PIPS: Record<number, [number, number][]> = {
  1: [[0.5, 0.5]],
  2: [
    [0.27, 0.27],
    [0.73, 0.73],
  ],
  3: [
    [0.27, 0.27],
    [0.5, 0.5],
    [0.73, 0.73],
  ],
  4: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  5: [
    [0.27, 0.27],
    [0.73, 0.27],
    [0.5, 0.5],
    [0.27, 0.73],
    [0.73, 0.73],
  ],
  6: [
    [0.27, 0.25],
    [0.73, 0.25],
    [0.27, 0.5],
    [0.73, 0.5],
    [0.27, 0.75],
    [0.73, 0.75],
  ],
};

export interface RollStats {
  frames: number;
  /** Tempo médio entre quadros, em ms. */
  averageFrameMs: number;
}

export interface Dice3D {
  readonly canvas: HTMLCanvasElement;
  /** Ajusta a cena ao tamanho (em pixels CSS) do lugar dos dados. */
  resize(width: number, height: number): void;
  /** Anima os dois dados até mostrarem d1 e d2. */
  roll(d1: number, d2: number, durationMs: number): Promise<RollStats>;
  /** Mostra d1 e d2 parados, sem animação. */
  show(d1: number, d2: number): void;
}

function faceTexture(value: number): CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = FACE_COLOR;
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = PIP_COLOR;
    for (const [x, y] of PIPS[value] ?? []) {
      ctx.beginPath();
      ctx.arc(x * size, y * size, size * 0.095, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function randomAxis(): Vector3 {
  return new Vector3(Math.random() - 0.5, Math.random() * 0.4, Math.random() - 0.5).normalize();
}

let instance: Dice3D | null = null;
let broken = false;

/** A cena dos dados (criada na primeira chamada). Lança erro se o aparelho não tiver WebGL. */
export function getDice3D(): Dice3D {
  if (broken) throw new Error('dados 3D indisponíveis');
  if (instance) return instance;

  const canvas = document.createElement('canvas');
  canvas.className = 'dice-3d';
  canvas.setAttribute('aria-hidden', 'true');
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'low-power',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  canvas.addEventListener('webglcontextlost', () => {
    broken = true;
    instance = null;
  });

  const scene = new Scene();
  scene.add(new HemisphereLight('#ffffff', '#5d6578', 2.2));
  const sun = new DirectionalLight('#ffffff', 2.4);
  sun.position.set(-2, 6, 4);
  scene.add(sun);

  const camera = new PerspectiveCamera(32, 2, 0.1, 50);
  camera.position.set(0, 3.0, 2.0);
  camera.lookAt(0, 0, 0);

  const geometry = new RoundedBoxGeometry(1, 1, 1, 4, 0.14);
  const materials = MATERIAL_VALUES.map(
    (value) => new MeshStandardMaterial({ map: faceTexture(value), roughness: 0.45 }),
  );
  const dice = [new Mesh(geometry, materials), new Mesh(geometry, materials)];
  dice.forEach((die, i) => {
    die.position.x = i === 0 ? -SPACING : SPACING;
    scene.add(die);
  });

  let rollId = 0;
  const draw = () => renderer.render(scene, camera);

  instance = {
    canvas,
    resize(width, height) {
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw();
    },
    show(d1, d2) {
      rollId++;
      [d1, d2].forEach((value, i) => {
        const die = dice[i];
        if (!die) return;
        die.quaternion.copy(restingQuaternion(value, (i === 0 ? -1 : 1) * 0.25));
        die.position.y = 0;
      });
      draw();
    },
    roll(d1, d2, durationMs) {
      const id = ++rollId;
      const plans = [d1, d2].map((value) => ({
        rest: restingQuaternion(value, (Math.random() - 0.5) * 0.9),
        axis: randomAxis(),
        turns: 1.5 + Math.random() * 1.5,
        hop: 0.3 + Math.random() * 0.2,
      }));
      const scratch = new Quaternion();
      const start = performance.now();
      let last = start;
      let frames = 0;
      let total = 0;
      return new Promise<RollStats>((resolve) => {
        const step = (now: number) => {
          if (id !== rollId) {
            resolve({ frames, averageFrameMs: frames ? total / frames : 0 });
            return;
          }
          const t = durationMs > 0 ? Math.min(1, (now - start) / durationMs) : 1;
          plans.forEach((plan, i) => {
            const die = dice[i];
            if (!die) return;
            die.quaternion.copy(tumbleQuaternion(plan.rest, plan.axis, plan.turns, t, scratch));
            die.position.y = hopHeight(t, plan.hop);
          });
          draw();
          if (now > start) {
            frames++;
            total += now - last;
          }
          last = now;
          if (t < 1) requestAnimationFrame(step);
          else resolve({ frames, averageFrameMs: frames ? total / frames : 0 });
        };
        requestAnimationFrame(step);
      });
    },
  };
  return instance;
}
