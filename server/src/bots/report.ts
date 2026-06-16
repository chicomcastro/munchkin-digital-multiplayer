import { runMatch } from './runner.js';
import type { BotDifficulty } from './policy.js';
import type { Variant } from '../types.js';

export interface MatrixCell {
  variant: Variant;
  playerCount: number;
  difficulties: BotDifficulty[];
  runs: number;
  finished: number;
  avgTurns: number;
  winsByDifficulty: Record<BotDifficulty, number>;
}

export interface BalanceReport {
  generatedAt: string;
  cells: MatrixCell[];
}

const DIFFICULTIES: BotDifficulty[] = ['easy', 'normal', 'hard'];

export interface BalanceOptions {
  variants?: Variant[];
  playerCounts?: number[];
  matchups?: BotDifficulty[][];
  runs?: number;
  maxTurns?: number;
  baseSeed?: number;
}

function defaultMatchups(playerCount: number): BotDifficulty[][] {
  if (playerCount === 2) {
    return [
      ['easy', 'easy'],
      ['easy', 'normal'],
      ['easy', 'hard'],
      ['normal', 'normal'],
      ['normal', 'hard'],
      ['hard', 'hard'],
    ];
  }
  // For larger tables: same-tier baseline + a "mixed" line that puts one of each.
  const all = DIFFICULTIES.map((d) => Array(playerCount).fill(d) as BotDifficulty[]);
  const mixed = Array(playerCount).fill('easy').map((_, i) => DIFFICULTIES[i % DIFFICULTIES.length]!) as BotDifficulty[];
  return [...all, mixed];
}

export function runBalanceReport(opts: BalanceOptions = {}): BalanceReport {
  const variants = opts.variants ?? (['quick', 'medium', 'long'] as Variant[]);
  const playerCounts = opts.playerCounts ?? [2, 4];
  const runs = opts.runs ?? 30;
  const maxTurns = opts.maxTurns ?? 2500;
  const baseSeed = opts.baseSeed ?? 0;
  const cells: MatrixCell[] = [];
  let seedCursor = baseSeed;
  for (const variant of variants) {
    for (const playerCount of playerCounts) {
      const matchups = opts.matchups ?? defaultMatchups(playerCount);
      for (const matchup of matchups) {
        if (matchup.length !== playerCount) continue;
        const wins: Record<BotDifficulty, number> = { easy: 0, normal: 0, hard: 0 };
        let finished = 0;
        let totalTurns = 0;
        for (let i = 0; i < runs; i++) {
          const r = runMatch({
            variant,
            playerCount,
            difficulties: matchup,
            seed: seedCursor++,
            maxTurns,
          });
          if (r.finished) finished += 1;
          if (r.winnerDifficulty) wins[r.winnerDifficulty] += 1;
          totalTurns += r.turns;
        }
        cells.push({
          variant,
          playerCount,
          difficulties: matchup,
          runs,
          finished,
          avgTurns: totalTurns / runs,
          winsByDifficulty: wins,
        });
      }
    }
  }
  return { generatedAt: new Date().toISOString(), cells };
}

export function formatBalanceMarkdown(report: BalanceReport): string {
  const lines: string[] = [];
  lines.push(`# Bot balance report`);
  lines.push('');
  lines.push(`_Generated at ${report.generatedAt}_`);
  lines.push('');
  const variants = Array.from(new Set(report.cells.map((c) => c.variant)));
  for (const variant of variants) {
    lines.push(`## Variant: ${variant}`);
    lines.push('');
    lines.push('| Players | Matchup | Runs | Finished | Avg turns | Easy wins | Normal wins | Hard wins |');
    lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: |');
    for (const c of report.cells.filter((c) => c.variant === variant)) {
      lines.push(`| ${c.playerCount} | ${c.difficulties.join('×')} | ${c.runs} | ${c.finished} | ${c.avgTurns.toFixed(1)} | ${c.winsByDifficulty.easy} | ${c.winsByDifficulty.normal} | ${c.winsByDifficulty.hard} |`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
