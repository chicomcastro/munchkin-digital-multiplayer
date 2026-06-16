import { describe, it, expect } from 'vitest';
import { formatBalanceMarkdown, runBalanceReport } from './report.js';

describe('runBalanceReport', () => {
  it('generates one cell per (variant, playerCount, matchup) combination', () => {
    const report = runBalanceReport({
      variants: ['long'],
      playerCounts: [2],
      matchups: [['easy', 'easy'], ['normal', 'hard']],
      runs: 2,
      maxTurns: 800,
      baseSeed: 1,
    });
    expect(report.cells).toHaveLength(2);
    for (const cell of report.cells) {
      expect(cell.runs).toBe(2);
      expect(cell.avgTurns).toBeGreaterThan(0);
      const totalWins = cell.winsByDifficulty.easy + cell.winsByDifficulty.normal + cell.winsByDifficulty.hard;
      expect(totalWins).toBeLessThanOrEqual(cell.finished);
    }
  });

  it('uses the default matchup matrix when none is provided', () => {
    const report = runBalanceReport({
      variants: ['long'],
      playerCounts: [2],
      runs: 1,
      maxTurns: 300,
      baseSeed: 100,
    });
    // 2-player default has 6 matchups (every pair from {easy,normal,hard}).
    expect(report.cells.length).toBeGreaterThanOrEqual(6);
  });

  it('skips matchups whose length does not match playerCount', () => {
    const report = runBalanceReport({
      variants: ['long'],
      playerCounts: [3],
      matchups: [['easy', 'easy']], // wrong length
      runs: 1,
      baseSeed: 7,
    });
    expect(report.cells).toHaveLength(0);
  });
});

describe('formatBalanceMarkdown', () => {
  it('renders a heading and a table row per cell', () => {
    const report = runBalanceReport({
      variants: ['long'],
      playerCounts: [2],
      matchups: [['easy', 'hard']],
      runs: 1,
      maxTurns: 300,
      baseSeed: 0,
    });
    const md = formatBalanceMarkdown(report);
    expect(md).toContain('Bot balance report');
    expect(md).toContain('## Variant: long');
    expect(md).toContain('easy×hard');
    expect(md.split('\n').length).toBeGreaterThan(5);
  });
});
