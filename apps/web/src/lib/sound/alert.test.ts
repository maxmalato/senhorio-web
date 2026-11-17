import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearTurnNotice, notifyTurn } from './alert';
import { setSoundOn } from './preference';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('aviso de "sua vez"', () => {
  let vibrate: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vibrate = vi.fn(() => true);
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: vibrate });
    document.title = 'Senhorio';
  });
  afterEach(() => {
    clearTurnNotice();
    setHidden(false);
    vi.useRealTimers();
  });

  it('vibra o celular; com a aba à vista, não mexe no título', () => {
    setHidden(false);
    notifyTurn('Sua vez!');
    expect(vibrate).toHaveBeenCalledOnce();
    expect(document.title).toBe('Senhorio');
  });

  it('em outra aba, o título pisca até a pessoa voltar', () => {
    setHidden(true);
    notifyTurn('Sua vez!');
    expect(document.title).toBe('Sua vez! · Senhorio');
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Senhorio');
    vi.advanceTimersByTime(1000);
    expect(document.title).toBe('Sua vez! · Senhorio');
    setHidden(false);
    expect(document.title).toBe('Senhorio');
    vi.advanceTimersByTime(3000);
    expect(document.title).toBe('Senhorio');
  });

  it('com sons e vibração desligados, não vibra (o título ainda avisa)', () => {
    setSoundOn(false);
    setHidden(true);
    notifyTurn('Sua vez!');
    expect(vibrate).not.toHaveBeenCalled();
    expect(document.title).toBe('Sua vez! · Senhorio');
  });
});
