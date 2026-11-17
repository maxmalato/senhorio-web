import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  canUse3D,
  markUnavailable,
  reportSlow,
  resetForTests,
  setUse3D,
  use3D,
} from './preference';

function fakeWebGL(available: boolean) {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(((kind: string) =>
    available && kind.startsWith('webgl') ? ({} as RenderingContext) : null) as never);
}

function reducedMotion(on: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: on && query.includes('reduce'),
    media: query,
  }));
}

describe('dados 3D: quando usar', () => {
  beforeEach(() => {
    localStorage.clear();
    resetForTests();
    reducedMotion(false);
    fakeWebGL(true);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    history.replaceState(null, '', '/');
  });

  it('ligado por padrão quando o aparelho tem WebGL', () => {
    expect(canUse3D()).toBe(true);
    expect(use3D()).toBe(true);
  });

  it('sem WebGL, fica no 2D e nem oferece a escolha', () => {
    fakeWebGL(false);
    expect(canUse3D()).toBe(false);
    expect(use3D()).toBe(false);
  });

  it('quem pede menos animação no aparelho fica no 2D', () => {
    reducedMotion(true);
    expect(canUse3D()).toBe(false);
    expect(use3D()).toBe(false);
  });

  it('o jogador desliga e religa; a escolha fica guardada', () => {
    setUse3D(false);
    expect(use3D()).toBe(false);
    setUse3D(true);
    expect(use3D()).toBe(true);
    expect(localStorage.getItem('senhorio:dice')).toBe('on');
  });

  it('aparelho lento volta para o 2D, e o jogador pode religar', () => {
    reportSlow();
    expect(use3D()).toBe(false);
    setUse3D(true);
    expect(use3D()).toBe(true);
  });

  it('depois de uma falha, 2D até recarregar a página', () => {
    markUnavailable();
    expect(use3D()).toBe(false);
  });

  it('?dice=2d força o 2D (testes)', () => {
    history.replaceState(null, '', '/?dice=2d');
    expect(use3D()).toBe(false);
  });
});
