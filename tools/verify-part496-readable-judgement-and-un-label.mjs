import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const js = read('assets/js/detail-dashboard.js');
const css = read('assets/css/detail-dashboard.css');
const html = read('pages/dangerous-goods-detail.html');
const criteriaSource = read('data/domestic-judgement-criteria.js');

const context = { window: {} };
vm.createContext(context);
for (const file of ['data/un-data.js', 'data/domestic-judgement-criteria-texts.js', 'data/domestic-judgement-criteria.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
const records = context.window.UN_DATABASE || [];
const resolver = context.window.DomesticJudgementCriteriaResolver;

assert.equal(records.length, 2725, '登録済み危険物2,725行を全件対象にする');
assert.equal(new Set(records.map(record => record.unNumber)).size, 2248, '国連番号2,248件を対象にする');
assert.equal(typeof resolver?.resolve, 'function', '判定基準リゾルバーを読み込む');

const errors = [];
const kindCounts = {};
for (const record of records) {
  const result = resolver.resolve(record);
  kindCounts[result?.kind] = (kindCounts[result?.kind] || 0) + 1;
  if (!result) {
    errors.push(`国連番号${record.unNumber}: 判定基準なし`);
    continue;
  }
  const uiTexts = [
    ...(result.references || []),
    ...(result.sections || []).flatMap(section => [section.title, section.navLabel])
  ].filter(Boolean).join(' ');
  if (/\bUN\d{4}\b/.test(uiTexts)) errors.push(`国連番号${record.unNumber}: 国内法令UIにUN表記が残存`);
  if (/undefined|null/i.test(uiTexts)) errors.push(`国連番号${record.unNumber}: undefined/null`);
}
assert.deepEqual(errors, [], '全危険物の国内法令UIを「国連番号＋番号」表記に統一');

// 判定基準を行の羅列ではなく、原則・判定表・要件・注記へ整理する。
for (const token of [
  'parseJudgementCriteriaBlocks',
  'renderJudgementCriteriaTable',
  'judgement-criteria-section--requirements',
  'judgement-criteria-note',
  'この危険物に適用される判定基準',
  '判定条件と結果の対応が分かるように整理して表示しています。'
]) assert.ok(js.includes(token), `${token}を実装`);
assert.doesNotMatch(js.slice(js.indexOf('const renderJudgementCriteriaDetails'), js.indexOf('const openDomesticLawBundlePdf')), /renderJudgementCriteriaRows/);

// 国内法令関連の画面タイトルは「国連番号1234」の書式。
for (const title of [
  '`国連番号${record.unNumber} 判定基準の国内法令`',
  '`国連番号${record.unNumber} 標札表示の国内法令`'
]) assert.ok(js.includes(title), `${title}を使用`);
for (const oldTitle of [
  '`UN${record.unNumber} 判定基準の国内法令`',
  '`UN${record.unNumber} 標札表示の国内法令`',
  '`UN${record.unNumber} 品名・国連番号表示の国内法令`',
  '`UN${record.unNumber} 関連国内法令`'
]) assert.ok(!js.includes(oldTitle), `${oldTitle}を残さない`);
assert.ok(!criteriaSource.includes('別表第1 UN${unNumber}'), '判定基準の参照ラベルにUN表記を残さない');
assert.ok(criteriaSource.includes('別表第1 国連番号${unNumber}'), '判定基準の参照ラベルを国連番号表記にする');

// 横スクロールを使わず、PCは表、スマートフォンは縦カードで表示する。
for (const selector of [
  '.judgement-criteria-table-wrap',
  '.judgement-criteria-table',
  '.judgement-criteria-requirement',
  '.judgement-criteria-context'
]) assert.ok(css.includes(selector), `${selector}の表示規則を設定`);
assert.match(css, /\.judgement-criteria-table-wrap\s*\{[^}]*overflow:\s*hidden/s);
assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*\.judgement-criteria-table--wide[\s\S]*display:\s*block/s);

// 既存配色・フォント・罫線・余白を使う。
assert.match(css, /font-family:\s*"Yu Gothic",\s*"YuGothic",\s*"Meiryo"/);
assert.match(css, /border:\s*1px solid #c8d9e8/);

// キャッシュ更新と構文。
for (const item of [
  'detail-dashboard.css?v=505',
  'detail-dashboard.js?v=505',
  'domestic-judgement-criteria-texts.js?v=496',
  'domestic-judgement-criteria.js?v=496'
]) assert.ok(html.includes(item), `${item}を読み込む`);
execFileSync(process.execPath, ['--check', path.join(root, 'assets/js/detail-dashboard.js')]);
execFileSync(process.execPath, ['--check', path.join(root, 'data/domestic-judgement-criteria.js')]);

const report = {
  schemaVersion: 1,
  version: 'part496',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  dangerousGoodsRowsVerified: records.length,
  uniqueUnNumbersVerified: new Set(records.map(record => record.unNumber)).size,
  judgementReferenceKinds: kindCounts,
  improvements: [
    '判定条件と判定結果を整理表・カードで表示',
    '例外条件・試験方法・注記を独立した見出し付き欄で表示',
    '国内法令関連画面のUN表記を国連番号表記へ変更',
    'スマートフォンで横スクロールを発生させない'
  ],
  preservedDesign: ['色', 'フォント', '罫線', '角丸', '余白']
};
fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
fs.writeFileSync(path.join(root, 'docs/part496-readable-judgement-and-un-label-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`part496 verification passed: ${records.length} rows / ${report.uniqueUnNumbersVerified} unique numbers`);
