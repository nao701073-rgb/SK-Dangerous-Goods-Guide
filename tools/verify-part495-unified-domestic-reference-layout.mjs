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

const context = { window: {} };
vm.createContext(context);
for (const file of ['data/un-data.js', 'data/domestic-judgement-criteria-texts.js', 'data/domestic-judgement-criteria.js', 'data/domestic-code-originals.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
const records = context.window.UN_DATABASE || [];
const resolver = context.window.DomesticJudgementCriteriaResolver;
const exactTexts = context.window.DOMESTIC_JUDGEMENT_CRITERIA_TEXTS?.entries || {};
const originals = context.window.DOMESTIC_CODE_ORIGINALS?.entries || {};

assert.equal(records.length, 2725, '登録済み危険物2,725行を全件対象にする');
assert.equal(new Set(records.map(record => record.unNumber)).size, 2248, '国連番号2,248件を対象にする');
assert.equal(typeof resolver?.resolve, 'function', '判定基準リゾルバーを読み込む');

const errors = [];
const kindCounts = {};
let note2ExactTextCount = 0;
for (const record of records) {
  const result = resolver.resolve(record);
  kindCounts[result?.kind] = (kindCounts[result?.kind] || 0) + 1;
  if (!Array.isArray(result?.references) || !result.references.length) errors.push(`UN${record.unNumber}: 参照なし`);
  if (!Array.isArray(result?.sections) || !result.sections.length) errors.push(`UN${record.unNumber}: 原文リンクなし`);
  if (result?.kind === 'note2') {
    if (!result.criteriaKey || !exactTexts[result.criteriaKey]?.text) errors.push(`UN${record.unNumber}: 備考2本文なし`);
    else note2ExactTextCount += 1;
  }
  for (const section of result?.sections || []) {
    if (!section.pdfPath || !Number.isFinite(section.page) || section.page < 1) errors.push(`UN${record.unNumber}: 不正な原文ページ`);
    if (/undefined|null/i.test(`${section.title} ${section.navLabel} ${section.pdfPath}`)) errors.push(`UN${record.unNumber}: undefined/null`);
  }
}
assert.deepEqual(errors, [], '全危険物に有効な判定基準・原文リンクを設定');
assert.equal(note2ExactTextCount, kindCounts.note2, '備考2対象は全件、画面内本文を表示する');

// 判定基準はPDF画像画面ではなく、コード詳細と同じモーダル・カード書式で表示。
const judgementStart = js.indexOf('const renderJudgementCriteriaDetails');
const judgementEnd = js.indexOf('const openDomesticLawBundlePdf', judgementStart);
const judgementBlock = js.slice(judgementStart, judgementEnd);
assert.ok(judgementStart >= 0 && judgementEnd > judgementStart, '判定基準表示処理を取得');
assert.match(judgementBlock, /code-organized-summary/);
assert.match(judgementBlock, /code-exact-provisions/);
assert.match(judgementBlock, /code-exact-provisions__group/);
assert.match(judgementBlock, /code-exact-provisions__items/);
assert.match(js, /judgement-criteria-source-links/);
assert.match(judgementBlock, /codeModalBody\.innerHTML = renderJudgementCriteriaDetails/);
assert.doesNotMatch(judgementBlock, /renderDomesticLawPageDeck/);
assert.doesNotMatch(judgementBlock, /domesticLawFullscreen\.hidden = false/);

// 品名・国連番号表示の参照欄も、標札表示と同じ legal-reference-box 書式。
assert.match(js, /<div class="legal-reference-box">\s*<strong>国内法令・IMDG Codeの主な参照<\/strong>/s);
for (const text of [
  '危規則 第8条第1項・第9条',
  '危告示 第7条の3第1項・第2項',
  '危告示 第14条の2の2（オーバーパック表示）',
  'IMDG Code ${packageMarkingDetail?.imdgReference?.section || "5.2.1.1"}'
]) assert.ok(js.includes(text), `${text}を参照欄に表示`);
assert.match(css, /\.legal-reference-box,/);

// E積載方法区分は、2条件を横スクロールなしの表で表示。
assert.ok(originals.E?.domesticOriginal, 'Eの国内法令原文を登録');
assert.match(originals.E.domesticOriginal, /旅客船以外の船舶/);
assert.match(originals.E.domesticOriginal, /第5条第4項に規定する数を超える数の旅客/);
assert.match(js, /const renderStowageCategoryRequirement/);
assert.match(js, /stowage-category-requirement-table/);
assert.match(css, /\.stowage-category-requirement-grid\s*\{[^}]*overflow:\s*hidden/s);
assert.match(css, /\.stowage-category-requirement-table\s*\{[^}]*width:\s*100%/s);

// 既存のTコード縦型表示を維持。
assert.match(js, /portable-tank-requirement-table--vertical/);
assert.match(css, /\.portable-tank-requirement-table--vertical/);

// バージョン読み込みと構文。
assert.ok(html.includes('domestic-judgement-criteria-texts.js?v=495'));
assert.ok(html.includes('domestic-judgement-criteria.js?v=495'));
assert.ok(html.includes('detail-dashboard.css?v=495'));
assert.ok(html.includes('detail-dashboard.js?v=495'));
execFileSync(process.execPath, ['--check', path.join(root, 'assets/js/detail-dashboard.js')]);

const report = {
  schemaVersion: 1,
  version: 'part495',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  dangerousGoodsRowsVerified: records.length,
  uniqueUnNumbersVerified: new Set(records.map(record => record.unNumber)).size,
  judgementReferenceKinds: kindCounts,
  note2ExactTextRowsVerified: note2ExactTextCount,
  unifiedLayouts: [
    '判定基準＝コード詳細と同じカード書式',
    '品名・国連番号表示＝標札表示と同じ参照欄書式',
    'E積載方法区分＝画面幅内の2列表'
  ],
  preservedDesign: ['色', 'フォント', '罫線', '余白']
};
fs.writeFileSync(path.join(root, 'docs/part495-unified-domestic-reference-layout-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`part495 verification passed: ${records.length} rows / ${report.uniqueUnNumbersVerified} UN numbers / note2 ${note2ExactTextCount}`);
