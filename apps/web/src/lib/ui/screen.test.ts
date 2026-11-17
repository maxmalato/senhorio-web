import { afterEach, describe, expect, it, vi } from 'vitest';
import { keepScreenAwake } from './screen.svelte';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('manter a tela acesa (modo mesa)', () => {
  afterEach(() => {
    setVisibility('visible');
    Reflect.deleteProperty(navigator, 'wakeLock');
  });

  it('pede a trava, pede de novo ao voltar para a aba e solta no fim', async () => {
    const release = vi.fn(async () => {});
    const request = vi.fn(async () => ({ release }));
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request } });
    setVisibility('visible');
    const stop = keepScreenAwake();
    expect(request).toHaveBeenCalledTimes(1);
    setVisibility('hidden');
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(2);
    await Promise.resolve();
    stop();
    expect(release).toHaveBeenCalled();
    setVisibility('visible');
    expect(request).toHaveBeenCalledTimes(2); // depois de soltar, não pede mais
  });

  it('sem suporte no navegador, não faz nada (e não quebra)', () => {
    expect(() => keepScreenAwake()()).not.toThrow();
  });
});
