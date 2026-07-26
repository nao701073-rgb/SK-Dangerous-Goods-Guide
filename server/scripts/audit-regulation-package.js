import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const [manifestPath] = process.argv.slice(2);
if (!manifestPath) {
  console.error('Usage: npm run audit:regulation -- <manifest.json>');
  process.exit(2);
}
const absManifest = path.resolve(manifestPath);
const baseDir = path.dirname(absManifest);
const manifest = JSON.parse(fs.readFileSync(absManifest, 'utf8'));
const issues = [];
const checks = [];
const hashFile = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const checkFile = (label, entry = {}) => {
  const fileName = entry.fileName;
  if (!fileName) { issues.push(`${label}: fileName未設定`); return null; }
  const filePath = path.resolve(baseDir, fileName);
  const exists = fs.existsSync(filePath);
  checks.push({ label, fileName, exists });
  if (!exists) { issues.push(`${label}: ファイルなし ${fileName}`); return null; }
  const actual = hashFile(filePath);
  const expected = entry.checksumSha256 || entry.sha256 || '';
  const hashMatches = !expected || expected.toLowerCase() === actual;
  checks[checks.length - 1] = { ...checks.at(-1), actualSha256: actual, expectedSha256: expected || null, hashMatches };
  if (!hashMatches) issues.push(`${label}: SHA-256不一致 ${fileName}`);
  return filePath;
};

const sourcePath = checkFile('原本PDF', manifest.sourceDocument);
const datasetPath = checkFile('構造化データ', manifest.dataset);
if (sourcePath && path.extname(sourcePath).toLowerCase() !== '.pdf') issues.push('原本PDF: 拡張子が.pdfではありません');
if (datasetPath && path.extname(datasetPath).toLowerCase() === '.json') {
  try {
    const data = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
    const records = Array.isArray(data) ? data : data.records;
    if (!Array.isArray(records)) issues.push('構造化データ: 配列またはrecords配列がありません');
    else {
      const expected = manifest.dataset?.expectedRecordCount;
      checks.push({ label: 'レコード件数', actual: records.length, expected: expected ?? null, matches: expected == null || Number(expected) === records.length });
      if (expected != null && Number(expected) !== records.length) issues.push(`構造化データ: 件数不一致 expected=${expected} actual=${records.length}`);
      const key = manifest.dataset?.recordKey || 'id';
      const seen = new Set(); const duplicates = [];
      records.forEach((record, index) => { const value = String(record?.[key] ?? ''); if (!value) issues.push(`構造化データ: ${index + 1}件目に識別キー ${key} がありません`); else if (seen.has(value)) duplicates.push(value); else seen.add(value); });
      if (duplicates.length) issues.push(`構造化データ: 識別キー重複 ${[...new Set(duplicates)].slice(0,10).join(', ')}`);
    }
  } catch (error) { issues.push(`構造化データ: JSON解析失敗 ${error.message}`); }
}
const report = {
  schemaVersion: '1.0', auditedAt: new Date().toISOString(), manifestFile: path.basename(absManifest),
  regulationId: manifest.regulationId || null, editionLabel: manifest.editionLabel || null,
  status: issues.length ? 'attention-required' : 'passed', checks, issues,
  reportSha256: ''
};
report.reportSha256 = crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex');
console.log(JSON.stringify(report, null, 2));
process.exitCode = issues.length ? 1 : 0;
