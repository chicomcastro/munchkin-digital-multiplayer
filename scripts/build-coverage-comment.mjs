// Reads server-coverage/coverage-summary.json and client-coverage/coverage-summary.json
// (downloaded as CI artifacts) and produces coverage-comment.md for the sticky PR comment.

import fs from 'fs';

function loadSummary(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (e) {
    return null;
  }
}

function emoji(pct) {
  if (pct >= 95) return '🟢';
  if (pct >= 90) return '🟡';
  if (pct >= 80) return '🟠';
  return '🔴';
}

function row(name, summary) {
  if (!summary?.total) return `| ${name} | _missing_ | – | – | – |`;
  const t = summary.total;
  return `| **${name}** | ${emoji(t.lines.pct)} ${t.lines.pct.toFixed(2)}% | ${emoji(t.statements.pct)} ${t.statements.pct.toFixed(2)}% | ${emoji(t.functions.pct)} ${t.functions.pct.toFixed(2)}% | ${emoji(t.branches.pct)} ${t.branches.pct.toFixed(2)}% |`;
}

function combinedRow(server, client) {
  if (!server?.total || !client?.total) return '';
  const merge = (k) => {
    const sCov = server.total[k].covered + client.total[k].covered;
    const sTot = server.total[k].total + client.total[k].total;
    return sTot === 0 ? 100 : (sCov / sTot) * 100;
  };
  const l = merge('lines');
  const s = merge('statements');
  const f = merge('functions');
  const b = merge('branches');
  return `| **Combined** | ${emoji(l)} ${l.toFixed(2)}% | ${emoji(s)} ${s.toFixed(2)}% | ${emoji(f)} ${f.toFixed(2)}% | ${emoji(b)} ${b.toFixed(2)}% |`;
}

const serverSummary = loadSummary('server-coverage/coverage-summary.json');
const clientSummary = loadSummary('client-coverage/coverage-summary.json');

const lines = [];
lines.push('## 📊 Test coverage');
lines.push('');
lines.push('| Package | Lines | Statements | Functions | Branches |');
lines.push('| --- | --- | --- | --- | --- |');
lines.push(row('Server', serverSummary));
lines.push(row('Client', clientSummary));
const cr = combinedRow(serverSummary, clientSummary);
if (cr) lines.push(cr);
lines.push('');
lines.push('🟢 ≥95% &nbsp; 🟡 ≥90% &nbsp; 🟠 ≥80% &nbsp; 🔴 <80%');
lines.push('');
lines.push(`Threshold: **90%** for lines, statements, functions; **80%** for branches.`);
lines.push('');
lines.push('Detailed HTML reports are attached as workflow artifacts: `server-coverage`, `client-coverage`, `visual-catalog`.');

fs.writeFileSync('coverage-comment.md', lines.join('\n') + '\n');
console.log('Wrote coverage-comment.md');
