/**
 * Generates a markdown balance report by running matchup matrices across
 * variants, player counts and difficulty pairings.
 *
 * Usage:
 *   npm --prefix server run balance-report -- [--runs=30] [--maxTurns=2500] [--seed=0] [--out=balance.md]
 */
import { writeFileSync } from 'node:fs';
import { formatBalanceMarkdown, runBalanceReport } from './report.js';

function getArg(name: string): string | undefined {
  for (const a of process.argv.slice(2)) {
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
  }
  return undefined;
}

const runs = Number(getArg('runs') ?? '30');
const maxTurns = Number(getArg('maxTurns') ?? '2500');
const baseSeed = Number(getArg('seed') ?? '0');
const out = getArg('out');

const report = runBalanceReport({ runs, maxTurns, baseSeed });
const md = formatBalanceMarkdown(report);

if (out) {
  writeFileSync(out, md, 'utf8');
  process.stdout.write(`Report written to ${out}\n`);
} else {
  process.stdout.write(md + '\n');
}
