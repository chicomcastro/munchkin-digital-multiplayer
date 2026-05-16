// Walks e2e/cypress/screenshots/ and produces a single static HTML page
// at e2e/visual-catalog.html so reviewers can scan every captured page state.

import fs from 'fs';
import path from 'path';

const root = path.resolve('e2e', 'cypress', 'screenshots');
const out = path.resolve('e2e', 'visual-catalog.html');

if (!fs.existsSync(root)) {
  fs.writeFileSync(out, '<!doctype html><meta charset="utf-8"><title>No screenshots</title><h1>No screenshots captured.</h1>');
  console.log('No screenshots; wrote placeholder.');
  process.exit(0);
}

function walk(dir) {
  const items = [];
  if (!fs.existsSync(dir)) return items;
  for (const entry of fs.readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) items.push(...walk(full));
    else if (full.endsWith('.png')) items.push(full);
  }
  return items;
}

const files = walk(root).sort();
const grouped = new Map();
for (const f of files) {
  const rel = path.relative(root, f);
  const segs = rel.split(path.sep);
  const spec = segs.length > 1 ? segs[0] : 'root';
  if (!grouped.has(spec)) grouped.set(spec, []);
  grouped.get(spec).push({
    label: segs.slice(1).join('/').replace(/\.png$/, '') || segs[0],
    relPath: 'cypress/screenshots/' + rel.replace(/\\/g, '/'),
    bytes: fs.statSync(f).size,
  });
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Munchkin — Visual evidence catalog</title>
  <style>
    body { background: #0f172a; color: #e2e8f0; font-family: system-ui, sans-serif; margin: 0; padding: 24px; }
    h1 { margin: 0 0 8px; color: #f59e0b; }
    p.lede { opacity: 0.7; margin: 0 0 24px; }
    section { margin-bottom: 32px; }
    h2 { font-size: 18px; margin: 16px 0 8px; color: #fbbf24; border-bottom: 1px solid #334155; padding-bottom: 4px; }
    .grid { display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    .card img { width: 100%; display: block; background: #000; }
    .card .meta { padding: 8px 12px; font-size: 13px; }
    .card .label { font-weight: bold; color: #f5f5f4; }
    .card .size { opacity: 0.5; font-size: 12px; }
    .empty { padding: 48px; text-align: center; opacity: 0.5; }
  </style>
</head>
<body>
  <h1>Visual evidence catalog</h1>
  <p class="lede">Auto-captured Cypress screenshots from this PR's E2E run. ${files.length} screenshot${files.length === 1 ? '' : 's'} across ${grouped.size} spec${grouped.size === 1 ? '' : 's'}.</p>
${grouped.size === 0 ? '<div class="empty">No screenshots were produced.</div>' : ''}
${[...grouped.entries()].map(([spec, shots]) => `  <section>
    <h2>${spec}</h2>
    <div class="grid">
      ${shots.map((s) => `<div class="card">
        <img src="${s.relPath}" loading="lazy" alt="${s.label}">
        <div class="meta">
          <div class="label">${s.label}</div>
          <div class="size">${(s.bytes / 1024).toFixed(1)} KB</div>
        </div>
      </div>`).join('\n      ')}
    </div>
  </section>`).join('\n')}
</body>
</html>
`;

fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${files.length} screenshots).`);
