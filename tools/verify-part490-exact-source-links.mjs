import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const detailJs = read('assets/js/detail-dashboard.js');
const resolverJs = read('assets/js/imdg-cross-reference-resolver.js');
const css = read('assets/css/detail-dashboard.css');
const html = read('pages/dangerous-goods-detail.html');
const profiles = read('data/domestic-packing-quantity-profiles.js');

assert.match(detailJs, /return `\$\{source\}#page=\$\{encodeURIComponent\(page \|\| 1\)\}&zoom=page-width`/);
assert.doesNotMatch(detailJs.slice(detailJs.indexOf('const openCodeModal'), detailJs.indexOf('root.querySelectorAll("[data-code-detail]"')), /renderDomesticPageVisual|renderVerbatimDomesticOriginal|renderAi|pdf-page-viewer/);
assert.match(detailJs, /renderExactProvisionGroups/);
assert.match(detailJs, /buildDirectSourceLinks/);
assert.match(css, /part490: 原典文言の整理表示＋原典PDF直リンク/);
assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(css, /@media \(max-width: 680px\)[\s\S]*\.code-direct-source-links[\s\S]*grid-template-columns:\s*minmax\(0, 1fr\)/);
assert.match(html, /imdg-code-page-map\.js\?v=49[0-4]/);
assert.match(html, /imdg-cross-reference-resolver\.js\?v=49[0-4]/);
assert.match(html, /detail-dashboard\.js\?v=49[0-4]/);
assert.match(profiles, /"3H1、3H2"/);
assert.doesNotMatch(profiles, /"3H1又は3H2","I":"30kg"/);

const context = { window: {} };
vm.createContext(context);
for (const file of [
  'data/imdg-cross-reference.js',
  'data/domestic-code-originals.js',
  'data/domestic-code-page-ranges.js',
  'data/imdg-section-page-map.js',
  'data/imdg-code-page-map.js',
  'assets/js/imdg-cross-reference-resolver.js'
]) vm.runInContext(read(file), context, { filename: file });

const expected = {
  P001: [281, 166], PP2: [282, 167], LP01: [338, 236], IBC02: [344, 231],
  T4: [353, 260], TP1: [365, 267], BK2: [367, 270], B1: [345, 231],
  SW1: [370, 484], SP188: [409, 755]
};
for (const [code, [domesticPage, imdgPage]] of Object.entries(expected)) {
  const ref = context.window.IMDGCrossReferenceResolver.resolve(code);
  assert.equal(ref.domesticOriginalPage, domesticPage, `${code} domestic page`);
  assert.ok(ref.domesticOriginal.includes(code), `${code} exact domestic text`);
  assert.ok(ref.domesticImdgReferences.some(item => item.page === imdgPage), `${code} IMDG page`);
}

const p001 = context.window.DOMESTIC_CODE_ORIGINALS.entries.P001.domesticOriginal;
for (const token of ['PP1', 'PP2', 'PP4', 'PP5', 'PP10', 'PP31', 'PP33', 'PP81', 'PP93']) {
  assert.ok(p001.includes(token), `P001 contains ${token}`);
}

const codePageEntries = context.window.IMDG_CODE_PAGE_MAP.entries;
assert.ok(Object.keys(codePageEntries).length >= 570);
assert.equal(codePageEntries.P001.page, 166);
assert.equal(codePageEntries.SP188.page, 755);
assert.equal(codePageEntries.SW1.page, 484);

console.log('part490 exact-source/direct-PDF verification passed');
