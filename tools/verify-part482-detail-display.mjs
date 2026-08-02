import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(new URL('..', import.meta.url).pathname);
const detailJs = fs.readFileSync(path.join(root, 'assets/js/detail-dashboard.js'), 'utf8');
const detailCss = fs.readFileSync(path.join(root, 'assets/css/detail-dashboard.css'), 'utf8');
const detailHtml = fs.readFileSync(path.join(root, 'pages/dangerous-goods-detail.html'), 'utf8');

for (const token of ['extractActualPsnCandidates', 'data-actual-psn-select', 'locateSeparatedChunks', 'repairCrossRowWrap']) {
  if (!detailJs.includes(token)) throw new Error(`detail-dashboard.js missing ${token}`);
}
for (const token of ['marking-psn-selector', 'domestic-source-table td:nth-child(4)']) {
  if (!detailCss.includes(token)) throw new Error(`detail-dashboard.css missing ${token}`);
}
if (!detailHtml.includes('detail-dashboard.js?v=482') || !detailHtml.includes('detail-dashboard.css?v=482')) {
  throw new Error('part482 cache-busting version missing');
}

const normalizeCandidate = value => String(value || '').normalize('NFKC').replace(/\s+/g, ' ').replace(/^[\s,;:／/+\-]+|[\s,;:／/+\-]+$/g, '').trim();
const extractCandidates = value => {
  const source = String(value || '').normalize('NFKC');
  const matches = source.match(/[A-Z0-9][A-Z0-9\s.,'’／/+\-]*/g) || [];
  const candidates = matches.map(normalizeCandidate).filter(v => v && /[A-Z]/.test(v)).filter(v => !/^(?:OR|AND)$/.test(v));
  const unique = [...new Set(candidates)];
  return unique.length ? unique : [normalizeCandidate(source) || '正式輸送品名を確認してください'];
};
const expected = ['ETHANOL', 'ETHYL ALCOHOL', 'ETHANOL SOLUTION', 'ETHYL ALCOHOL SOLUTION'];
const actual = extractCandidates('ETHANOL (ETHYL ALCOHOL) or ETHANOL SOLUTION (ETHYL ALCOHOL SOLUTION)');
if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error(`PSN candidates mismatch: ${JSON.stringify(actual)}`);
if (extractCandidates('AMMONIUM PICRATE dry or wetted with less than 10% water, by mass')[0] !== 'AMMONIUM PICRATE') {
  throw new Error('lower-case qualifier removal failed');
}

const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'data/domestic-code-originals.js'), 'utf8'), sandbox);
const entries = sandbox.window.DOMESTIC_CODE_ORIGINALS.entries;
const pageNoise = /^\s*(?:-\s*\d+\s*-|（船舶による危険物の運送基準等を定める告示）)\s*$/;
const clean = value => String(value || '').replace(/\r\n?/g, '\n').replace(/\f/g, '\n').replace(/^\s+|\s+$/g, '');
const sections = source => {
  const result = []; let current = null;
  const flush = () => { if (current) { current.lines = current.lines.filter(line => !pageNoise.test(line.trim())); result.push(current); current = null; } };
  for (const line of clean(source).split('\n')) {
    const heading = line.trim().match(/^((?:P|LP|IBC|T)\d+[A-Z]?(?:\([a-z0-9]+\))?)$/i);
    if (heading) { flush(); current = { title: heading[1], lines: [] }; continue; }
    if (!current) current = { title: '', lines: [] };
    current.lines.push(line);
  }
  flush(); return result;
};
const locate = line => {
  const out = []; let cursor = 0;
  for (const part of String(line).split(/(\s{2,})/)) {
    if (!part) continue;
    if (/^\s{2,}$/.test(part)) { cursor += part.length; continue; }
    const leading = (part.match(/^\s+/) || [''])[0].length;
    const text = part.trim(); if (text) out.push({ text, column: cursor + leading }); cursor += part.length;
  }
  return out;
};
const parse = section => {
  const lines = section.lines; const hi = lines.findIndex(line => line.includes('内装容器の種類') && line.includes('外装容器の種類') && /許容容量|許容質量/.test(line));
  if (hi < 0) return [];
  const header = lines[hi];
  const starts = ['内装容器の種類', '中間容器の種類', '外装容器の種類'].map(label => header.indexOf(label));
  starts.push(Math.max(header.lastIndexOf('外装容器の許容容量又は許容質量'), header.lastIndexOf('許容容量又は許容質量')));
  const boundaries = [(starts[0] + starts[1]) / 2, (starts[1] + starts[2]) / 2, (starts[2] + starts[3]) / 2];
  const col = n => n < boundaries[0] ? 0 : n < boundaries[1] ? 1 : n < boundaries[2] ? 2 : 3;
  const ni = lines.findIndex((line, index) => index > hi && /^\s*注(?:\s|$)/.test(line));
  const body = lines.slice(hi + 1, ni >= 0 ? ni : lines.length).filter(line => line.trim() && !pageNoise.test(line.trim()));
  const physical = body.map(line => {
    const cells = ['', '', '', ''];
    for (const chunk of locate(line)) { const index = col(chunk.column); cells[index] = cells[index] ? `${cells[index]} ${chunk.text}` : chunk.text; }
    return cells;
  });
  const rows = []; let group = [[], [], [], []]; let has = false;
  const flush = () => { if (has) { rows.push(group.map(items => items.length ? items.join('\n') : '—')); group = [[], [], [], []]; has = false; } };
  for (const cells of physical) { if (cells[3] && has && group[3].length) flush(); cells.forEach((value, index) => { if (value) { group[index].push(value); has = true; } }); }
  flush(); return rows;
};
const p132a = parse(sections(entries.P132.domesticOriginal)[0]);
if (p132a[0]?.[2] !== '4A、4B又は4N' || p132a[0]?.[3] !== '100kg') throw new Error(`P132 column split failed: ${JSON.stringify(p132a[0])}`);
for (const code of ['P110', 'P114', 'P132']) {
  for (const section of sections(entries[code].domesticOriginal)) {
    for (const row of parse(section)) {
      if (/\b\d+(?:\.\d+)?\s*(?:kg|g|L|mL)\b/i.test(row[2]) && row[3] === '—') throw new Error(`${code} capacity leaked into outer-container column: ${JSON.stringify(row)}`);
    }
  }
}
console.log('OK: part482 PSN candidates and packing-table columns verified');
