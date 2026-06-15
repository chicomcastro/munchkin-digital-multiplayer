import { describe, it, expect } from 'vitest';
import { runBatch, runMatch } from './runner.js';

describe('runMatch', () => {
  it('plays a deterministic match to completion with a fixed seed', () => {
    const result = runMatch({
      variant: 'long',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      seed: 42,
      maxTurns: 1500,
    });
    expect(result.finished).toBe(true);
    expect(result.turns).toBeGreaterThan(1);
    expect(result.turns).toBeLessThanOrEqual(1500);
    expect(['win', 'timeout']).toContain(result.outcome);
  });

  it('always finishes within the configured turn budget for the long variant', () => {
    for (const seed of [11, 22, 33, 44]) {
      const r = runMatch({ variant: 'long', playerCount: 2, difficulties: ['easy', 'easy'], seed, maxTurns: 1500 });
      expect(r.finished).toBe(true);
      expect(r.outcome).not.toBe('deadlock');
    }
  });

  it('supports the cooperative variant without deadlocking', () => {
    const result = runMatch({
      variant: 'cooperative',
      playerCount: 3,
      difficulties: ['easy', 'easy', 'easy'],
      seed: 7,
      maxTurns: 1000,
    });
    expect(result.finished).toBe(true);
  });

  it('caps total runtime by maxTurns', () => {
    const result = runMatch({
      variant: 'long',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      seed: 1,
      maxTurns: 5,
    });
    expect(result.turns).toBeLessThanOrEqual(6);
  });
});

describe('runBatch', () => {
  it('aggregates a small batch and reports totals', () => {
    const batch = runBatch({
      variant: 'long',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      runs: 4,
      baseSeed: 1000,
      maxTurns: 1500,
    });
    expect(batch.runs).toBe(4);
    expect(batch.results).toHaveLength(4);
    expect(batch.finished + batch.deadlocked).toBeLessThanOrEqual(4);
    expect(batch.avgTurns).toBeGreaterThan(0);
    const totalWins = batch.winsByDifficulty.easy + batch.winsByDifficulty.normal + batch.winsByDifficulty.hard;
    expect(totalWins).toBeLessThanOrEqual(batch.finished);
  });
});
