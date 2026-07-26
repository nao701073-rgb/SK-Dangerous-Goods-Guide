import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const findings = [];
const stats = { html: 0, js: 0, json: 0, refs: 0, bytes: 0 };
const ignoredProtocols = /^(?:https?:|mailto:|tel:|data:|javascript:|#)/i;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') return [];
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const files = walk(root);
for (const file of files) stats.bytes += fs.statSync(file).size;

for (const file of files.filter(file => file.endsWith('.json'))) {
  stats.json += 1;
  try { JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { findings.push({ severity: 'error', type: 'json', file, detail: error.message }); }
}

for (const file of files.filter(file => file.endsWith('.js') || file.endsWith('.mjs'))) {
  stats.js += 1;
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) findings.push({ severity: 'error', type: 'javascript', file, detail: result.stderr.trim() });
}

for (const file of files.filter(file => file.endsWith('.html'))) {
  stats.html += 1;
  const html = fs.readFileSync(file, 'utf8');
  const ids = [...html.matchAll(/\sid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicateIds = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
  for (const id of duplicateIds) findings.push({ severity: 'error', type: 'duplicate-id', file, detail: id });

  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)) {
    const ref = match[1].trim();
    if (!ref || ignoredProtocols.test(ref)) continue;
    stats.refs += 1;
    const clean = ref.split('#')[0].split('?')[0];
    const resolved = path.resolve(path.dirname(file), clean);
    if (!fs.existsSync(resolved)) findings.push({ severity: 'error', type: 'missing-reference', file, detail: ref });
  }
}

const oversized = files
  .map(file => ({ file, size: fs.statSync(file).size }))
  .filter(item => item.size >= 1024 * 1024)
  .sort((a, b) => b.size - a.size);

const report = {
  generatedAt: new Date().toISOString(),
  root,
  status: findings.some(item => item.severity === 'error') ? 'failed' : 'passed',
  stats,
  findingCount: findings.length,
  findings,
  oversizedAssets: oversized.map(item => ({ file: path.relative(root, item.file), bytes: item.size }))
};

const output = path.join(root, 'docs', 'part150-static-qa-report.json');
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ status: report.status, findingCount: report.findingCount, stats }, null, 2));
process.exit(report.status === 'passed' ? 0 : 1);
