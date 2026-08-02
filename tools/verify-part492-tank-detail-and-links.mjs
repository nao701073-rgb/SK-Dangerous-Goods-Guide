import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const js = read('assets/js/detail-dashboard.js');
const css = read('assets/css/detail-dashboard.css');
const html = read('pages/dangerous-goods-detail.html');

assert.match(js, /const portableTankRequirementRows = \{/);
assert.match(js, /renderPortableTankRequirementReference/);
assert.match(js, /タンクの記号/);
assert.match(js, /最小試験圧力（MPa）/);
assert.match(js, /タンク外板の最小板厚（基準鋼）/);
assert.match(js, /圧力安全装置の種類/);
assert.match(js, /底部開口/);
assert.match(js, /代替使用可能なTコード/);
assert.match(js, /PDF 364ページ/);
assert.match(js, /renderPortableTankRequirementReference\(reference\.code\)/);

const expected = {
  T1:['0.15','－','N','A'], T2:['0.15','－','N','B'], T3:['0.265','－','N','A'], T4:['0.265','－','N','B'],
  T5:['0.265','－','NF','C'], T6:['0.4','－','N','A'], T7:['0.4','－','N','B'], T8:['0.4','－','N','C'],
  T9:['0.4','6mm','N','C'], T10:['0.4','6mm','NF','C'], T11:['0.6','－','N','B'], T12:['0.6','－','NF','B'],
  T13:['0.6','6mm','N','C'], T14:['0.6','6mm','NF','C'], T15:['1','－','N','B'], T16:['1','－','NF','B'],
  T17:['1','6mm','N','B'], T18:['1','6mm','NF','B'], T19:['1','6mm','NF','C'], T20:['1','8mm','NF','C'],
  T21:['1','10mm','N','C'], T22:['1','10mm','NF','C']
};
for (const [code, values] of Object.entries(expected)) {
  const re = new RegExp(`${code}:\\s*\\[${values.map(v => `"${v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}"`).join(',\\s*')}\\]`);
  assert.match(js, re, `${code}: tank requirement row`);
}

assert.match(js, /suppressPrefixes: \["PP"\]/);
assert.match(js, /const suppressLink = suppressedPrefixes/);
assert.match(js, /\^P\\d\/i\.test/);
assert.match(js, /navLabel: `\$\{target\.law\} \$\{target\.label\}`/);
assert.doesNotMatch(js, /resolveDomesticLawTargets\(references\)\.map\(target => buildDomesticLawPageSection/);
assert.match(js, /modalDialog\.scrollTop = 0/);
assert.match(js, /codeModalBody\.scrollTop = 0/);
assert.match(css, /part492: T1〜T22/);
assert.match(css, /\.modal-reference-block--portable-tank/);

for (const token of ['detail-dashboard.css?v=492','imdg-code-page-map.js?v=492','domestic-packing-quantity-profiles.js?v=492','imdg-cross-reference-resolver.js?v=492','detail-dashboard.js?v=492']) {
  assert.ok(html.includes(token), `cache-bust ${token}`);
}

const context = { window: {} };
vm.createContext(context);
vm.runInContext(read('data/imdg-code-page-map.js'), context, { filename: 'data/imdg-code-page-map.js' });
for (let i = 1; i <= 22; i += 1) {
  const code = `T${i}`;
  assert.equal(context.window.IMDG_CODE_PAGE_MAP.entries[code]?.page, 260, `${code}: IMDG page 260`);
}

console.log('part492 T-code detail / duplicate-link / modal-position verification passed');
