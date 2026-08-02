import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const js = read('assets/js/detail-dashboard.js');
const html = read('pages/dangerous-goods-detail.html');

const context = { window: {} };
vm.createContext(context);
for (const file of [
  'data/un-data.js',
  'data/domestic-code-originals.js',
  'data/domestic-code-page-ranges.js',
  'data/imdg-cross-reference.js',
  'data/imdg-section-page-map.js',
  'data/imdg-code-page-map.js',
  'assets/js/imdg-cross-reference-resolver.js'
]) {
  vm.runInContext(read(file), context, { filename: file });
}

const records = context.window.UN_DATABASE || [];
const resolver = context.window.IMDGCrossReferenceResolver;
const imdgEntries = context.window.IMDG_CODE_PAGE_MAP?.entries || {};
assert.equal(records.length, 2725, '危険物データ全2,725行を対象にする');

const classificationReferences = {
  '火薬類': ['危告示 第2条第1項', '危規則 第2条第1号イ'],
  '高圧ガス': ['危告示 第2条第2項', '危規則 第2条第1号ロ'],
  '引火性液体類': ['危告示 第2条第3項', '危規則 第2条第1号ハ(1)〜(3)'],
  '可燃性物質類': ['危告示 第2条第4項', '危規則 第2条第1号ニ(1)〜(3)'],
  '酸化性物質類': ['危告示 第2条第5項・第6項', '危規則 第2条第1号ホ(1)・(2)'],
  '毒物類': ['危告示 第2条第7項・第8項', '危規則 第2条第1号ヘ(1)・(2)'],
  '腐食性物質': ['危告示 第2条第9項', '危規則 第2条第1号チ'],
  '有害性物質': ['危告示 第2条第10項', '危規則 第2条第1号リ'],
  '放射性物質等': ['放告示 第1条の2', '危規則 第2条第1号ト(1)・(2)']
};

const classCounts = {};
const unmappedRows = [];
for (const record of records) {
  classCounts[record.classification] = (classCounts[record.classification] || 0) + 1;
  if (!classificationReferences[record.classification]) {
    unmappedRows.push(`UN${record.unNumber}:${record.classification}`);
  }
}
assert.deepEqual(unmappedRows, [], '全危険物が判定基準の国内法令に対応する');
assert.equal(Object.values(classCounts).reduce((sum, count) => sum + count, 0), records.length);
for (const [classification, refs] of Object.entries(classificationReferences)) {
  assert.ok(classCounts[classification] > 0, `${classification}: 対象レコードあり`);
  const literal = `"${classification}": ["${refs[0]}", "${refs[1]}"]`;
  assert.ok(js.includes(literal), `${classification}: 画面側の判定基準設定と一致`);
}
assert.match(js, /classificationReferenceMap\[record\.classification\] \|\| \[\]/);
assert.doesNotMatch(js, /classificationReferenceMap\[record\.classification\] \|\| \[\s*"危告示 第3条第3項"/);

// 国内法令本文内のコードは通常文字。IMDG Code原文は最下部の独立リンクに集約。
assert.match(js, /const inlineLinkOptions = \{ disableLinks: true \};/);
assert.match(js, /const disableLinks = options\.disableLinks === true/);
assert.match(js, /const suppressLink = disableLinks \|\|/);
assert.match(js, /renderLinkGroup\(domesticLinks, "domestic"\).*renderLinkGroup\(imdgLinks, "imdg"\)/s);
assert.match(js, /data-source-group="\$\{group\}"/);
assert.match(js, /const selectedImdgEntry = window\.IMDG_CODE_PAGE_MAP\?\.entries\?\.\[selectedCode\]/);
assert.match(js, /IMDG Code \$\{selectedCode\} 原文を開く/);

const ibcFunction = js.slice(js.indexOf('const renderIbcMaximumContentReference'), js.indexOf('const portableTankRequirementRows'));
assert.doesNotMatch(ibcFunction, /imdg-code-amendment|IMDG Code .*原文を開く/);
assert.doesNotMatch(ibcFunction, /code-original-open-row/);
const tankFunction = js.slice(js.indexOf('const renderPortableTankRequirementReference'), js.indexOf('const formatDomesticOriginalText'));
assert.doesNotMatch(tankFunction, /imdg-code-amendment|IMDG Code .*原文を開く/);
assert.doesNotMatch(tankFunction, /code-original-open-row/);
assert.match(js, /IBC容器の最大内容積の原文を開く（PDF 353ページ）/);
assert.match(js, /代替使用可能なTコードの原文を開く（PDF 364ページ）/);

const fields = [
  'smallPackingInstruction', 'smallPackingAdditional',
  'largePackingInstruction', 'largePackingAdditional',
  'ibcInstruction', 'ibcAdditional',
  'portableTankInstruction', 'portableTankAdditional',
  'flexibleBulkContainer', 'specialProvisions', 'stowage', 'segregation', 'remarks'
];
const codePattern = /(?<![A-Z0-9])(?:IBC|LP|PP|TP|BK|VV|CV|SW|SP|P|B|T|V|S)\d+[A-Z]?(?:\([a-z0-9]+\))?(?![A-Z0-9])/gi;
const codes = new Set();
for (const record of records) {
  for (const field of fields) {
    const values = Array.isArray(record[field]) ? record[field] : [record[field]];
    for (const value of values) {
      for (const match of String(value || '').normalize('NFKC').matchAll(codePattern)) {
        codes.add(match[0].toUpperCase().replace(/\([^)]+\)$/, ''));
      }
    }
  }
}

const unresolved = [];
const missingDomesticOriginal = [];
const missingDomesticPages = [];
for (const code of [...codes].sort()) {
  const reference = resolver.resolve(code);
  if (!reference) {
    unresolved.push(code);
    continue;
  }
  if (!String(reference.domesticOriginal || '').trim()) missingDomesticOriginal.push(code);
  if (!(reference.domesticOriginalPages || [reference.domesticOriginalPage]).filter(Boolean).length) missingDomesticPages.push(code);
}
assert.deepEqual(unresolved, [], '使用コードを全件解決');
assert.deepEqual(missingDomesticOriginal, [], '使用コードの国内法令原文を全件登録');
assert.deepEqual(missingDomesticPages, [], '使用コードの国内法令ページを全件登録');

// 指定された全コード系列を共通正規表現が扱う。未使用系列でも認識対象から外さない。
for (const family of ['P','LP','IBC','T','TP','BK','PP','B','VV','CV','V','SW','S','SP']) {
  assert.ok(js.includes(family), `${family}: コード系列を画面側で認識`);
}

// ページ対応が確認済みのコードは、選択コード自身のIMDGリンクを最下部へ出せる。
const verifiedUsedCodes = [...codes].filter(code => imdgEntries[code]?.page);
assert.ok(verifiedUsedCodes.length >= 478, '使用コードの大部分に検証済みIMDGページ対応あり');
for (const code of ['P001','P112','LP01','IBC02','T4','TP1','BK2','PP67','PP89','PP97','B1','SW1','SP188']) {
  assert.ok(imdgEntries[code]?.page, `${code}: IMDG原文ページ登録済み`);
}

const imdgPdf = path.join(root, 'references/originals/imdg-code-amendment-42-24-msc556-108.pdf');
const pdfPageText = page => execFileSync('pdftotext', ['-f', String(page), '-l', String(page), '-layout', imdgPdf, '-'], { encoding: 'utf8' });
assert.match(pdfPageText(173), /P112\(a\)/);
assert.match(pdfPageText(173), /P112\(b\)/);
assert.match(pdfPageText(174), /P112\(c\)/);
assert.match(pdfPageText(197), /PP89/);
assert.match(pdfPageText(197), /PP97/);
for (const code of ['VV1','CV1','V1','S1']) {
  assert.equal(imdgEntries[code], undefined, `${code}: 未検証ページを推定登録しない`);
}

for (const asset of ['detail-dashboard.css','imdg-code-page-map.js','domestic-packing-quantity-profiles.js','imdg-cross-reference-resolver.js','detail-dashboard.js']) {
  assert.ok(html.includes(`${asset}?v=493`), `${asset}: part493キャッシュ更新`);
}

const report = {
  schemaVersion: 1,
  version: 'part493',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  dangerousGoodsRowsVerified: records.length,
  uniqueUnNumbersVerified: new Set(records.map(record => record.unNumber)).size,
  classificationCategoriesVerified: Object.keys(classCounts).length,
  classificationCounts: classCounts,
  usedCodeDetailsVerified: codes.size,
  usedCodesWithVerifiedImdgPages: verifiedUsedCodes.length,
  usedCodesWithoutFabricatedImdgPages: [...codes].filter(code => !imdgEntries[code]?.page).sort(),
  displayOrder: [
    '許容容量・許容質量などの整理情報',
    '国内法令の適用条件・注記・追加規定',
    '国内法令の原文リンク',
    'ページ最下部のIMDG Code原文リンク'
  ],
  preservedDesign: ['色','フォント','罫線','余白']
};
fs.writeFileSync(path.join(root, 'docs/part493-all-dangerous-goods-and-code-order-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`part493 verification passed: ${records.length} rows / ${codes.size} used code details / ${verifiedUsedCodes.length} verified IMDG links`);
