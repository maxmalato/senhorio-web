import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setSoundOn } from './preference';

/** Web Audio de mentira: conta as notas criadas. */
function fakeAudio() {
  const created = { oscillators: 0, sources: 0 };
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
  });
  const node = () => ({ connect: vi.fn((next: unknown) => next), gain: param() });
  class FakeContext {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = {};
    resume = vi.fn(async () => {});
    createGain = () => node();
    createOscillator = () => {
      created.oscillators++;
      return { ...node(), type: 'sine', frequency: param(), start: vi.fn(), stop: vi.fn() };
    };
    createBuffer = (_c: number, length: number) => ({
      getChannelData: () => new Float32Array(length),
    });
    createBufferSource = () => {
      created.sources++;
      return { ...node(), buffer: null, start: vi.fn() };
    };
    createBiquadFilter = () => ({ ...node(), type: '', frequency: param(), Q: param() });
  }
  vi.stubGlobal('AudioContext', FakeContext);
  return created;
}

describe('sons gerados pelo navegador', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('sem Web Audio, nada acontece (nem erro)', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { playSound } = await import('./synth');
    expect(() => playSound('dice')).not.toThrow();
  });

  it('toca as notas de cada som', async () => {
    const created = fakeAudio();
    const { playSound } = await import('./synth');
    playSound('coin');
    expect(created.oscillators).toBe(2);
    playSound('dice');
    expect(created.sources).toBe(4);
  });

  it('o mesmo som repetido em seguida toca uma vez só', async () => {
    const created = fakeAudio();
    const { playSound } = await import('./synth');
    playSound('pay');
    playSound('pay');
    playSound('pay');
    expect(created.oscillators).toBe(1);
  });

  it('com os sons desligados, fica em silêncio', async () => {
    const created = fakeAudio();
    setSoundOn(false);
    const { playSound } = await import('./synth');
    playSound('win');
    expect(created.oscillators).toBe(0);
  });
});
