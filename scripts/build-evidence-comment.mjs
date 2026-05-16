// Reads e2e/cypress/screenshots/ and produces evidence-comment.md
// with each screenshot rendered inline via raw.githubusercontent.com URLs.
//
// Env:
//   RAW_BASE_URL — e.g. https://raw.githubusercontent.com/owner/repo/ci-evidence/pr-12/abc1234
//   PR_NUMBER, SHORT_SHA, RUN_URL — used in the header

import fs from 'fs';
import path from 'path';

const RAW_BASE_URL = process.env.RAW_BASE_URL ?? '';
const PR_NUMBER = process.env.PR_NUMBER ?? '';
const SHORT_SHA = process.env.SHORT_SHA ?? '';
const RUN_URL = process.env.RUN_URL ?? '';

const SCREENSHOTS_DIR = path.resolve('e2e', 'cypress', 'screenshots');

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (full.endsWith('.png')) out.push(full);
  }
  return out;
}

const files = walk(SCREENSHOTS_DIR).sort();

const lines = [];
lines.push('## 📸 Visual evidence (Cypress E2E)');
lines.push('');
if (files.length === 0) {
  lines.push('_No screenshots were captured for this run._');
} else {
  lines.push(
    `PR #${PR_NUMBER} · commit \`${SHORT_SHA}\` · ${files.length} screenshot${files.length === 1 ? '' : 's'}`
      + (RUN_URL ? ` · [workflow run](${RUN_URL})` : ''),
  );
  lines.push('');

  // Group by spec (top-level subdir under screenshots/).
  const grouped = new Map();
  for (const f of files) {
    const rel = path.relative(SCREENSHOTS_DIR, f);
    const segs = rel.split(path.sep);
    const spec = segs.length > 1 ? segs[0] : 'root';
    if (!grouped.has(spec)) grouped.set(spec, []);
    const url = `${RAW_BASE_URL}/${rel.replace(/\\/g, '/')}`;
    const label = segs.slice(1).join('/').replace(/\.png$/, '') || segs[0];
    grouped.get(spec).push({ label, url, rel });
  }

  for (const [spec, shots] of grouped) {
    lines.push(`<details open><summary><strong>${spec}</strong> (${shots.length})</summary>`);
    lines.push('');
    // Render as a markdown table so screenshots tile in pairs.
    lines.push('| | |');
    lines.push('| :---: | :---: |');
    for (let i = 0; i < shots.length; i += 2) {
      const a = shots[i];
      const b = shots[i + 1];
      const cell = (s) =>
        s ? `<sub>${s.label}</sub><br/><a href="${s.url}"><img src="${s.url}" width="300"/></a>` : '';
      lines.push(`| ${cell(a)} | ${cell(b)} |`);
    }
    lines.push('');
    lines.push('</details>');
    lines.push('');
  }
}

lines.push('');
lines.push(`_Sources are committed to the \`ci-evidence\` branch under \`pr-${PR_NUMBER}/${SHORT_SHA}/\` and updated on every push._`);

fs.writeFileSync('evidence-comment.md', lines.join('\n') + '\n');
console.log(`Wrote evidence-comment.md (${files.length} screenshots).`);
