// Quando usar os dados em 3D (Etapa 6). Sem Three.js aqui: este arquivo entra no pacote
// principal e decide se o 3D chega a ser baixado.

const KEY = 'senhorio:dice';
/** Quadro médio acima disso (menos de 20 por segundo) conta como aparelho lento. */
export const SLOW_FRAME_MS = 50;

type Stored = 'on' | 'off' | 'slow';

function read(): Stored | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'on' || value === 'off' || value === 'slow' ? value : null;
  } catch {
    return null;
  }
}

function write(value: Stored): void {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // sem armazenamento (navegação privada): vale só nesta visita
  }
}

let unavailable = false;

/** O aparelho pede menos animação (acessibilidade): dados em 2D, sem perguntar. */
export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** O navegador tem WebGL (sem criar a cena: só confere o contexto). */
export function hasWebGL(): boolean {
  if (unavailable) return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Parâmetro de teste: ?dice=2d ou ?dice=3d força um dos dois. */
function forced(): '2d' | '3d' | null {
  if (typeof location === 'undefined') return null;
  const value = new URLSearchParams(location.search).get('dice');
  return value === '2d' || value === '3d' ? value : null;
}

/** O 3D é possível neste aparelho (a escolha do jogador só aparece se for). */
export function canUse3D(): boolean {
  if (forced() === '3d') return !unavailable;
  return !prefersReducedMotion() && hasWebGL();
}

/** Usa os dados em 3D agora? Ligado por padrão; desligado pelo jogador ou por lentidão. */
export function use3D(): boolean {
  const force = forced();
  if (force) return force === '3d' && !unavailable;
  const stored = read();
  return canUse3D() && stored !== 'off' && stored !== 'slow';
}

/** Escolha do jogador na tela inicial. */
export function setUse3D(on: boolean): void {
  write(on ? 'on' : 'off');
}

/** Os quadros ficaram lentos: volta para o 2D neste aparelho (o jogador pode religar). */
export function reportSlow(): void {
  write('slow');
}

/** O 3D falhou (sem WebGL, contexto perdido, erro ao baixar): 2D até recarregar a página. */
export function markUnavailable(): void {
  unavailable = true;
}

/** Só para testes. */
export function resetForTests(): void {
  unavailable = false;
}
