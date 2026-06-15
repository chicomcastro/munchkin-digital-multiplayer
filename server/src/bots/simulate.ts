/**
 * Headless bot match runner.
 *
 * Usage:
 *   npm --prefix server run simulate -- --variant=medium --players=4 --runs=100 \
 *     --difficulty=easy [--difficulty=normal …] [--seed=42] [--winLevel=10] [--maxTurns=2000]
 *
 * Output: JSON summary on stdout, suitable for piping into jq.
 */
import { runBatch } from './runner.js';
import type { BotDifficulty } from './policy.js';
import type { Variant } from '../types.js';

interface ParsedArgs {
  variant: Variant;
  players: number;
  runs: number;
  difficulties: BotDifficulty[];
  seed?: number;
  winLevel?: number;
  maxTurns?: number;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args = new Map<string, string[]>();
  for (const a of argv) {
    if (!a.startsWith('--')) continue;
    const [k, vRaw] = a.replace(/^--/, '').split('=');
    if (!k) continue;
    const v = vRaw ?? 'true';
    if (!args.has(k)) args.set(k, []);
    args.get(k)!.push(v);
  }
  const get = (k: string) => args.get(k)?.[0];
  const getAll = (k: string) => args.get(k) ?? [];
  const variant = (get('variant') ?? 'medium') as Variant;
  const players = Number(get('players') ?? '4');
  const runs = Number(get('runs') ?? '50');
  const diffs = getAll('difficulty') as BotDifficulty[];
  const seedStr = get('seed');
  const winLevelStr = get('winLevel');
  const maxTurnsStr = get('maxTurns');
  return {
    variant,
    players,
    runs,
    difficulties: diffs.length ? diffs : (Array(players).fill('easy') as BotDifficulty[]),
    seed: seedStr ? Number(seedStr) : undefined,
    winLevel: winLevelStr ? Number(winLevelStr) : undefined,
    maxTurns: maxTurnsStr ? Number(maxTurnsStr) : undefined,
  };
}

const cli = parseArgs(process.argv.slice(2));
const report = runBatch({
  variant: cli.variant,
  playerCount: cli.players,
  difficulties: cli.difficulties,
  runs: cli.runs,
  baseSeed: cli.seed,
  winLevel: cli.winLevel,
  maxTurns: cli.maxTurns,
});

const { results: _omit, ...summary } = report;
process.stdout.write(JSON.stringify({ config: cli, summary }, null, 2) + '\n');
