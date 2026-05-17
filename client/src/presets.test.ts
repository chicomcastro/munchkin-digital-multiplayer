import { describe, it, expect } from 'vitest';
import { PRESETS } from './presets';

describe('PRESETS', () => {
  it('exposes at least 6 presets', () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(6);
  });

  it('every preset has a unique id', () => {
    const ids = new Set(PRESETS.map((p) => p.id));
    expect(ids.size).toBe(PRESETS.length);
  });

  it('every preset has a label, description and a config patch', () => {
    for (const p of PRESETS) {
      expect(p.label).toBeTruthy();
      expect(p.description).toBeTruthy();
      expect(typeof p.config).toBe('object');
      expect(typeof p.config.playerCount).toBe('number');
      expect(typeof p.config.variant).toBe('string');
    }
  });

  it('cooperative presets set a coopObjective', () => {
    for (const p of PRESETS.filter((p) => p.config.variant === 'cooperative')) {
      expect(p.config.coopObjective).toBeTruthy();
    }
  });

  it('player counts are within the supported range (2..6)', () => {
    for (const p of PRESETS) {
      expect(p.config.playerCount).toBeGreaterThanOrEqual(2);
      expect(p.config.playerCount).toBeLessThanOrEqual(6);
    }
  });
});
