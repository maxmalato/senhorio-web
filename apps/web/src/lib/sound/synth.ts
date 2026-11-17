// Sons gerados pelo próprio navegador (Web Audio), sem arquivos de áudio e sem biblioteca:
// nada a baixar e nenhuma questão de direitos autorais. Sem Web Audio (testes, navegador
// antigo), tudo vira silêncio.

import type { SoundName } from './events';
import { soundOn } from './preference';

type AudioCtor = typeof AudioContext;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const lastPlayed = new Map<SoundName, number>();
/** O mesmo som repetido em menos tempo que isso (vários pagamentos seguidos) toca uma vez só. */
const REPEAT_GAP_MS = 120;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor: AudioCtor | undefined =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) {
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.22;
      master.connect(ctx.destination);
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
  return ctx;
}

/**
 * Os navegadores só liberam o som depois de um toque ou tecla na página (no iPhone, o
 * áudio precisa começar dentro do próprio toque). Chamado uma vez no início.
 */
export function unlockAudioOnFirstGesture(): void {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    if (soundOn()) audio();
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('keydown', unlock);
  };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);
}

interface Tone {
  freq: number;
  at: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slideTo?: number;
}

function tone(c: AudioContext, out: AudioNode, t0: number, s: Tone): void {
  const osc = c.createOscillator();
  const env = c.createGain();
  const start = t0 + s.at;
  osc.type = s.type ?? 'sine';
  osc.frequency.setValueAtTime(s.freq, start);
  if (s.slideTo) osc.frequency.exponentialRampToValueAtTime(s.slideTo, start + s.dur);
  env.gain.setValueAtTime(0.0001, start);
  env.gain.exponentialRampToValueAtTime(s.gain ?? 0.6, start + 0.01);
  env.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);
  osc.connect(env).connect(out);
  osc.start(start);
  osc.stop(start + s.dur + 0.02);
}

function noise(
  c: AudioContext,
  out: AudioNode,
  t0: number,
  at: number,
  dur: number,
  freq: number,
  gain = 0.5,
): void {
  const length = Math.max(1, Math.floor(c.sampleRate * dur));
  const buffer = c.createBuffer(1, length, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2;
  const source = c.createBufferSource();
  source.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  filter.Q.value = 1.2;
  const env = c.createGain();
  env.gain.value = gain;
  source.connect(filter).connect(env).connect(out);
  source.start(t0 + at);
}

/** Cada som: notas curtas e ruídos filtrados, todos abaixo de meio segundo. */
const SOUNDS: Record<SoundName, (c: AudioContext, out: AudioNode, t: number) => void> = {
  dice(c, out, t) {
    [0, 0.07, 0.15, 0.26].forEach((at, i) =>
      noise(c, out, t, at, 0.05, 2400 + i * 300, 0.9 - i * 0.18),
    );
  },
  coin(c, out, t) {
    tone(c, out, t, { freq: 988, at: 0, dur: 0.09, type: 'triangle' });
    tone(c, out, t, { freq: 1319, at: 0.08, dur: 0.18, type: 'triangle' });
  },
  pay(c, out, t) {
    tone(c, out, t, { freq: 660, at: 0, dur: 0.2, type: 'triangle', slideTo: 440, gain: 0.45 });
  },
  buy(c, out, t) {
    [523, 659, 784].forEach((freq, i) =>
      tone(c, out, t, { freq, at: i * 0.08, dur: 0.16, type: 'triangle' }),
    );
  },
  build(c, out, t) {
    [0, 0.11].forEach((at) => {
      tone(c, out, t, { freq: 196, at, dur: 0.07, type: 'square', gain: 0.25 });
      noise(c, out, t, at, 0.04, 900, 0.5);
    });
  },
  card(c, out, t) {
    noise(c, out, t, 0, 0.16, 3500, 0.35);
    tone(c, out, t, { freq: 740, at: 0.05, dur: 0.12, gain: 0.25 });
  },
  jail(c, out, t) {
    tone(c, out, t, { freq: 110, at: 0, dur: 0.3, type: 'square', gain: 0.25 });
    noise(c, out, t, 0.02, 0.12, 1800, 0.6);
  },
  bankrupt(c, out, t) {
    [392, 330, 262].forEach((freq, i) =>
      tone(c, out, t, { freq, at: i * 0.16, dur: 0.22, type: 'sawtooth', gain: 0.2 }),
    );
  },
  win(c, out, t) {
    [523, 659, 784, 1047].forEach((freq, i) =>
      tone(c, out, t, { freq, at: i * 0.11, dur: i === 3 ? 0.45 : 0.14, type: 'triangle' }),
    );
  },
  turn(c, out, t) {
    tone(c, out, t, { freq: 880, at: 0, dur: 0.22, gain: 0.5 });
    tone(c, out, t, { freq: 1175, at: 0.14, dur: 0.4, gain: 0.5 });
  },
};

/** Toca um som (se os sons estiverem ligados e o navegador tiver Web Audio). */
export function playSound(name: SoundName): void {
  if (!soundOn()) return;
  const now = performance.now();
  if (now - (lastPlayed.get(name) ?? -Infinity) < REPEAT_GAP_MS) return;
  lastPlayed.set(name, now);
  const c = audio();
  if (!c || !master) return;
  try {
    SOUNDS[name](c, master, c.currentTime + 0.01);
  } catch {
    // som é enfeite: uma falha nunca atrapalha a partida
  }
}
