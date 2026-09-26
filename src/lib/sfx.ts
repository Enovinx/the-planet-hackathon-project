import * as React from 'react';

export type SfxName =
  | 'keyShow'
  | 'keyGood'
  | 'keyBad'
  | 'win'
  | 'send'
  | 'reply'
  | 'crash'
  | 'lights'
  | 'lock'
  | 'solved'
  | 'shoot'
  | 'explode'
  | 'click';

const MUTE_KEY = 'planet-fresh-muted';

let ctx: AudioContext | null = null;
let muted: boolean = false;
let mutedLoaded = false;

const listeners = new Set<() => void>();

function loadMuted(): boolean {
  if (mutedLoaded) return muted;
  mutedLoaded = true;
  if (typeof window !== 'undefined') {
    try {
      muted = window.localStorage.getItem(MUTE_KEY) === '1';
    } catch {
      muted = false;
    }
  }
  return muted;
}

function notify(): void {
  listeners.forEach((fn) => fn());
}

export function isMuted(): boolean {
  return loadMuted();
}

export function setMuted(value: boolean): void {
  loadMuted();
  muted = value;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(MUTE_KEY, value ? '1' : '0');
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }
  notify();
}

export function toggleMuted(): boolean {
  setMuted(!isMuted());
  return isMuted();
}

export function useMuted(): { muted: boolean; toggle: () => void } {
  const [value, setValue] = React.useState<boolean>(() => loadMuted());
  React.useEffect(() => {
    const fn = (): void => setValue(isMuted());
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  const toggle = React.useCallback(() => {
    toggleMuted();
  }, []);
  return { muted: value, toggle };
}

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (loadMuted()) return null;
  try {
    if (!ctx) {
      const AC =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  endFreq?: number;
  dur: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
}

function tone(ac: AudioContext, opts: ToneOpts): void {
  const { freq, endFreq, dur, delay = 0, type = 'square', gain = 0.08 } = opts;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noiseBurst(ac: AudioContext, dur: number, delay = 0, gain = 0.12): void {
  const t0 = ac.currentTime + delay;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, len, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(g);
  g.connect(ac.destination);
  src.start(t0);
}

const PRESETS: Record<SfxName, (ac: AudioContext) => void> = {
  keyShow: (ac) => tone(ac, { freq: 660, dur: 0.12, type: 'square', gain: 0.05 }),
  keyGood: (ac) => tone(ac, { freq: 880, endFreq: 1320, dur: 0.09, type: 'square', gain: 0.06 }),
  keyBad: (ac) => tone(ac, { freq: 220, endFreq: 110, dur: 0.22, type: 'sawtooth', gain: 0.09 }),
  win: (ac) => {
    tone(ac, { freq: 523, dur: 0.12, delay: 0, type: 'square', gain: 0.07 });
    tone(ac, { freq: 659, dur: 0.12, delay: 0.12, type: 'square', gain: 0.07 });
    tone(ac, { freq: 784, dur: 0.2, delay: 0.24, type: 'square', gain: 0.07 });
  },
  send: (ac) => tone(ac, { freq: 1200, endFreq: 900, dur: 0.07, type: 'square', gain: 0.05 }),
  reply: (ac) => tone(ac, { freq: 440, endFreq: 330, dur: 0.1, type: 'sawtooth', gain: 0.05 }),
  crash: (ac) => {
    tone(ac, { freq: 400, endFreq: 60, dur: 0.6, type: 'sawtooth', gain: 0.1 });
    noiseBurst(ac, 0.4, 0.05, 0.1);
  },
  lights: (ac) => {
    tone(ac, { freq: 150, endFreq: 900, dur: 0.35, type: 'sawtooth', gain: 0.06 });
    tone(ac, { freq: 1800, dur: 0.06, delay: 0.35, type: 'square', gain: 0.05 });
  },
  lock: (ac) => tone(ac, { freq: 980, dur: 0.08, type: 'square', gain: 0.06 }),
  solved: (ac) => {
    tone(ac, { freq: 784, dur: 0.1, delay: 0, type: 'square', gain: 0.07 });
    tone(ac, { freq: 1046, dur: 0.18, delay: 0.1, type: 'square', gain: 0.07 });
  },
  shoot: (ac) => tone(ac, { freq: 900, endFreq: 200, dur: 0.12, type: 'square', gain: 0.04 }),
  explode: (ac) => noiseBurst(ac, 0.3, 0, 0.12),
  click: (ac) => tone(ac, { freq: 700, dur: 0.05, type: 'square', gain: 0.05 }),
};

export function playSfx(name: SfxName): void {
  const ac = audio();
  if (!ac) return;
  try {
    PRESETS[name](ac);
  } catch {
    // never let sfx break gameplay
  }
}
