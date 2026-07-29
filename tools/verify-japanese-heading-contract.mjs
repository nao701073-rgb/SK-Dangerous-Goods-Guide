import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, relative } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const targets = [join(root, 'index.html'), join(root, 'pages'), join(root, 'assets', 'js')];
const files = [];
function walk(path) {
  const stat = statSync(path);
  if (stat.isDirectory()) {
    for (const name of readdirSync(path)) walk(join(path, name));
  } else if (/\.(html|js)$/.test(path)) files.push(path);
}
for (const target of targets) walk(target);

const violations = [];
const eyebrowPattern = /<p\s+class=["']eyebrow["'][^>]*>([^<]*)<\/p>/gi;
for (const file of files) {
  const source = readFileSync(file, 'utf8');
  let match;
  while ((match = eyebrowPattern.exec(source))) {
    const label = match[1].trim();
    if (/[A-Za-z]/.test(label) && !/[ぁ-んァ-ン一-龥]/.test(label)) {
      violations.push({ file: relative(root, file), label });
    }
  }
}

const regulations = readFileSync(join(root, 'pages', 'regulations.html'), 'utf8');
const checks = [
  ['国内法令見出し', regulations.includes('<h2>国内法令</h2>')],
  ['国際規則見出し', regulations.includes('<h2>国際条約・国際規則</h2>')],
  ['国内英語ラベル削除', !regulations.includes('>Domestic</p>')],
  ['国際英語ラベル削除', !regulations.includes('>International</p>')],
  ['ページ英語ラベル削除', !regulations.includes('Regulations & International Codes')],
  ['他画面の冗長な英語ラベル削除', violations.length === 0]
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({
  status: failed.length ? 'failed' : 'passed',
  checkCount: checks.length,
  failed: failed.map(([name]) => name),
  violations
}, null, 2));
process.exit(failed.length ? 1 : 0);
