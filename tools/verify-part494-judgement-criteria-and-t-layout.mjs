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
for (const file of ['data/un-data.js', 'data/domestic-judgement-criteria.js']) {
  vm.runInContext(read(file), context, { filename: file });
}
const records = context.window.UN_DATABASE || [];
const resolver = context.window.DomesticJudgementCriteriaResolver;
assert.equal(records.length, 2725, '危険物データ全2,725行を対象にする');
assert.equal(typeof resolver?.resolve, 'function', '判定基準リゾルバーが読み込まれる');

const errors = [];
const kindCounts = {};
const note2Pages = new Set();
for (const record of records) {
  const result = resolver.resolve(record);
  kindCounts[result?.kind] = (kindCounts[result?.kind] || 0) + 1;
  if (!Array.isArray(result?.references) || !result.references.length) errors.push(`UN${record.unNumber}: 参照表示なし`);
  if (!Array.isArray(result?.sections) || !result.sections.length) errors.push(`UN${record.unNumber}: 原文ページなし`);
  for (const section of result?.sections || []) {
    if (!section.pdfPath || !Number.isFinite(section.page) || section.page < 1) errors.push(`UN${record.unNumber}: 不正な原文ページ`);
    if (/undefined|null/i.test(`${section.title} ${section.navLabel} ${section.pdfPath}`)) errors.push(`UN${record.unNumber}: undefined/null表示`);
    const imageKind = section.law === '危規則' || section.pdfPath.includes('regulations')
      ? 'regulation'
      : section.law === '放告示' || section.pdfPath.includes('radioactive')
        ? 'radioactive'
        : 'notification';
    const imagePath = path.join(root, 'assets', 'domestic-law-pages', imageKind, `page-${section.page}.png`);
    if (!fs.existsSync(imagePath)) errors.push(`UN${record.unNumber}: 表示画像なし ${imageKind}/page-${section.page}.png`);
    if (result.kind === 'note2') note2Pages.add(section.page);
  }
  if ((result?.references || []).some(value => /undefined|null/i.test(String(value)))) errors.push(`UN${record.unNumber}: undefined/null参照`);
}
assert.deepEqual(errors, [], '全危険物に有効な判定基準参照を設定');
assert.ok(kindCounts.note2 >= 2600, '備考2に該当する危険物は備考2へ集約');
assert.ok(kindCounts['specific-definition'] > 0, '備考2対象外の病毒・放射性物質は固有定義へ案内');
assert.ok(kindCounts['listed-entry'] > 0, '環境有害物質以外のクラス9は当該品名・備考へ案内');
assert.deepEqual([...note2Pages].sort((a, b) => a - b), [268,269,270,271,272,273,274,275,276], '備考2の判定基準ページ範囲を使用');

const findRecord = un => records.find(record => record.unNumber === un);
assert.deepEqual(Array.from(resolver.resolve(findRecord('0005')).sections, section => section.page), [268,269], 'UN0005は備考2(1)火薬類');
assert.deepEqual(Array.from(resolver.resolve(findRecord('1203')).sections, section => section.page), [269,270], 'UN1203は備考2(3)引火性液体類');
assert.deepEqual(Array.from(resolver.resolve(findRecord('3077')).sections, section => section.page), [275,276], 'UN3077は備考2(8)環境有害物質');
assert.equal(resolver.resolve(findRecord('3090')).kind, 'listed-entry', 'リチウム電池を環境有害物質の備考2(8)へ誤案内しない');
assert.equal(resolver.resolve(findRecord('2814')).kind, 'specific-definition', '病毒をうつしやすい物質は固有定義へ案内');

const notificationPdf = path.join(root, 'references/originals/dangerous-goods-notification.pdf');
const pageText = page => execFileSync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', notificationPdf, '-'], { encoding: 'utf8' });
assert.match(pageText(268), /備考\s*2/);
assert.match(pageText(268), /火薬類の等級の判定基準/);
assert.match(pageText(269), /高圧ガス/);
assert.match(pageText(269) + pageText(270), /引火性液体類の容器等級の判定基準/);
assert.match(pageText(270) + pageText(271), /可燃性物質.*判定基準/s);
assert.match(pageText(271) + pageText(272), /自然発火性物質.*判定基準/s);
assert.match(pageText(272), /水反応可燃性物質.*判定基準/s);
assert.match(pageText(272) + pageText(273), /酸化性物質.*判定基準/s);
assert.match(pageText(273), /有機過酸化物のタイプの判定基準/);
assert.match(pageText(274), /毒物の容器等級/);
assert.match(pageText(275), /腐食性物質の容器等級の判定基準/);
assert.match(pageText(275) + pageText(276), /環境有害物質のタイプの判定基準/s);

assert.ok(html.includes('domestic-judgement-criteria.js?v=494'), '判定基準リゾルバーをpart494で読み込む');
assert.ok(html.includes('detail-dashboard.css?v=494'), '詳細画面CSSをpart494で更新');
assert.ok(html.includes('detail-dashboard.js?v=494'), '詳細画面JSをpart494で更新');
assert.match(js, /DomesticJudgementCriteriaResolver\?\.resolve\(record\)/);
assert.match(js, /openJudgementCriteria\(/);
assert.doesNotMatch(js, /classificationReferenceMap/);

const tankStart = js.indexOf('const renderPortableTankRequirementReference');
const tankEnd = js.indexOf('const formatDomesticOriginalText', tankStart);
const tankFunction = js.slice(tankStart, tankEnd);
assert.ok(tankStart >= 0 && tankEnd > tankStart, 'Tコード表示関数を取得');
assert.doesNotMatch(tankFunction, /domestic-source-table-scroll/);
assert.match(tankFunction, /portable-tank-requirement-table--vertical/);
for (const label of ['最小試験圧力（MPa）','タンク外板の最小板厚（基準鋼）','圧力安全装置の種類','底部開口','代替使用可能なTコード']) {
  assert.ok(tankFunction.includes(label), `${label}を縦型表に表示`);
}
assert.match(css, /\.portable-tank-requirement-table--vertical/);
assert.match(css, /min-width:\s*0\s*!important/);
assert.match(css, /overflow-wrap:\s*anywhere/);
assert.match(css, /@media \(max-width: 680px\)/);

// 国内法令本文中のコードは通常文字、原文リンクは国内法令→IMDG Codeの順を維持。
assert.match(js, /const inlineLinkOptions = \{ disableLinks: true \};/);
assert.match(js, /renderLinkGroup\(domesticLinks, "domestic"\).*renderLinkGroup\(imdgLinks, "imdg"\)/s);

const report = {
  schemaVersion: 1,
  version: 'part494',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  dangerousGoodsRowsVerified: records.length,
  uniqueUnNumbersVerified: new Set(records.map(record => record.unNumber)).size,
  judgementReferenceKinds: kindCounts,
  note2PdfPagesVerified: [...note2Pages].sort((a, b) => a - b),
  tCodeLayout: 'vertical-two-column-without-horizontal-scroll',
  preservedDesign: ['色', 'フォント', '罫線', '余白']
};
fs.writeFileSync(path.join(root, 'docs/part494-judgement-criteria-and-t-layout-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`part494 verification passed: ${records.length} rows / note2 pages ${report.note2PdfPagesVerified.join(',')} / T vertical layout`);
