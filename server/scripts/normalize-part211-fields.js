import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, '../..');
const file = path.join(rootDir, 'data/un-data.js');
const source = fs.readFileSync(file, 'utf8');
const window = {};
vm.runInNewContext(source, { window, console }, { filename: file, timeout: 20000 });
const records = window.UN_DATABASE;
const report = [];

const classFixes = new Map([
  ['3500','2.2'],['3501','2.1'],['3502','2.2'],['3503','2.2'],['3504','2.1'],['3505','2.1'],
  ['3537','2.1'],['3538','2.2'],['3539','2.3'],['3540','3'],['3541','4.1'],['3542','4.2'],
  ['3543','4.3'],['3544','5.1'],['3545','5.2'],['3546','6.1'],['3547','8'],['3548','9']
]);
const subsidiaryFixes = new Map([['3502','6.1'],['3503','8'],['3504','6.1'],['3505','8']]);
const bkTargets = new Set(['1438:123:7','1495:125:21','1942:142:13','3377:206:4','3378:206:5','3378:206:6']);

for (const r of records) {
  const before = { class:r.class, labels:r.labels, subsidiaryRisk:r.subsidiaryRisk, specialProvisions:r.specialProvisions, flexibleBulkContainer:r.flexibleBulkContainer };
  let changed = false;
  if (classFixes.has(r.unNumber)) {
    r.class = classFixes.get(r.unNumber);
    r.subsidiaryRisk = subsidiaryFixes.get(r.unNumber) || '-';
    r.labels = [r.class, ...(r.subsidiaryRisk !== '-' ? [r.subsidiaryRisk] : [])];
    changed = true;
  }
  const key = `${r.unNumber}:${r.sourcePage}:${r.sourceRow}`;
  if (bkTargets.has(key)) {
    r.specialProvisions = (r.specialProvisions || []).filter(v => String(v).toUpperCase() !== 'BK2');
    const current = String(r.flexibleBulkContainer || '-').trim();
    const codes = current === '-' ? [] : current.split(/[\s,、/]+/).filter(Boolean);
    if (!codes.includes('BK2')) codes.unshift('BK2');
    r.flexibleBulkContainer = codes.join(' / ');
    changed = true;
  }
  if (changed) report.push({ unNumber:r.unNumber, sourcePage:r.sourcePage, sourceRow:r.sourceRow, before, after:{ class:r.class, labels:r.labels, subsidiaryRisk:r.subsidiaryRisk, specialProvisions:r.specialProvisions, flexibleBulkContainer:r.flexibleBulkContainer }});
}
fs.writeFileSync(file, `window.UN_DATABASE = ${JSON.stringify(records)};\n`, 'utf8');
const reportPath = path.join(rootDir, 'docs/Part211_分類_SP_B欄正規化レポート.json');
fs.writeFileSync(reportPath, JSON.stringify({generatedAt:new Date().toISOString(), count:report.length, policy:{class:'分類値のみ',specialProvisions:'SPコードのみ',bulk:'BKコードはflexibleBulkContainer（画面B欄）',un0190:'xを維持'},records:report}, null, 2)+'\n');
console.log(`Updated ${report.length} records`);
