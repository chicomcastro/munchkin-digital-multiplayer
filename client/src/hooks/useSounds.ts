import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'munchkin:sound';

type SoundName = 'kick' | 'levelUp' | 'death' | 'victory' | 'flee' | 'select' | 'error';

interface SoundSpec {
  freq: number;
  type: OscillatorType;
  duration: number;
  sweep?: number; // optional endFreq
  volume?: number;
}

const PRESETS: Record<SoundName, SoundSpec[]> = {
  kick:    [{ freq: 180, type: 'square', duration: 0.18, sweep: 80, volume: 0.4 }],
  levelUp: [{ freq: 523, type: 'sine', duration: 0.15, volume: 0.4 }, { freq: 783, type: 'sine', duration: 0.18, volume: 0.45 }],
  death:   [{ freq: 220, type: 'sawtooth', duration: 0.5, sweep: 60, volume: 0.5 }],
  victory: [{ freq: 523, type: 'triangle', duration: 0.12, volume: 0.4 }, { freq: 659, type: 'triangle', duration: 0.12, volume: 0.4 }, { freq: 783, type: 'triangle', duration: 0.25, volume: 0.5 }],
  flee:    [{ freq: 660, type: 'sine', duration: 0.08, sweep: 220, volume: 0.3 }],
  select:  [{ freq: 880, type: 'sine', duration: 0.05, volume: 0.18 }],
  error:   [{ freq: 220, type: 'square', duration: 0.18, sweep: 110, volume: 0.4 }],
};

function loadEnabled(): boolean {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === null ? false : v === '1';
  } catch {
    return false;
  }
}

export function useSounds() {
  const [enabled, setEnabled] = useState<boolean>(() => loadEnabled());
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0'); } catch {}
  }, [enabled]);

  const play = useCallback((name: SoundName) => {
    if (!enabled) return;
    if (typeof window === 'undefined' || typeof window.AudioContext === 'undefined') return;
    try {
      if (!ctxRef.current) {
        ctxRef.current = new AudioContext();
      }
      const ctx = ctxRef.current;
      // Resume if suspended (mobile policy)
      if (ctx.state === 'suspended') ctx.resume();
      let t = ctx.currentTime;
      for (const spec of PRESETS[name]) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = spec.type;
        osc.frequency.setValueAtTime(spec.freq, t);
        if (spec.sweep != null) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(50, spec.sweep), t + spec.duration);
        }
        const v = spec.volume ?? 0.3;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(v, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + spec.duration);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + spec.duration + 0.02);
        t += spec.duration;
      }
    } catch {
      /* ignore audio failures (autoplay, no AudioContext, etc.) */
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, toggle, play };
}
