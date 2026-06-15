import { describe, it, expect } from 'vitest';
import { runBatch, runMatch } from './runner.js';

describe('runMatch', () => {
  it('plays a long-variant match without crashing within the turn budget', () => {
    const result = runMatch({
      variant: 'long',
      playerCount: 2,
      difficulties: ['easy', 'easy'],
      seed: 42,
      maxTurns: 3000,
    });
    expect(result.turns).toBeGreaterThan(1);
    expect(result.turns).toBeLessThanOrEqual(3001);
    expect(['win', 'timeout', 'deadlock']).toContain(result.outcome);
  });

  it('finishes most long-variant matches within the turn budget', () => {
    const seeds = [11, 22, 33, 44, 55, 66, 77, 88];
    let finished = 0;
    for (const seed of seeds) {
      const r = runMatch({ variant: 'long', playerCount: 2, difficulties: ['easy', 'easy'], seed, maxTurns: 3000 });
      if (r.finished) finished += 1;
      expect(r.turns).toBeGreaterThan(0);
    }
    // Easy bots are intentionally not great, but with a roomy budget they
    // should almost always converge — flag the heuristic if they don't.
    expect(finished).toBeGreaterThanOrEqual(seeds.length - 2);
  });

  it('supports the cooperative variant without crashing', () => {
    const result = runMatch({
      variant: 'cooperative',
      playerCount: 3,
      difficulties: ['easy', 'easy', 'easy'],
      seed: 7,
      maxTurns: 2000,
    });
    expect(result.turns).toBeGreaterThan(0);
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
