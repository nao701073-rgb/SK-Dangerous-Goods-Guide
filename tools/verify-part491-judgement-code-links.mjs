import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = new URL('../', import.meta.url);
const read = path => fs.readFileSync(new URL(path, root), 'utf8');
const exists = path => fs.existsSync(new URL(path, root));
const js = read('assets/js/detail-dashboard.js');
const css = read('assets/css/detail-dashboard.css');
const html = read('pages/dangerous-goods-detail.html');

for (const classification of [
  '火薬類','高圧ガス','引火性液体類','可燃性物質類','酸化性物質類','毒物類','腐食性物質','有害性物質','放射性物質等'
]) {
  assert.match(js, new RegExp(`"${classification}": \\[(?:"危告示|"放告示)`), `${classification}: 告示を先頭表示`);
}
assert.match(js, /判定基準の国内法令を全画面表示/);
assert.match(js, /UN\$\{record\.unNumber\} 判定基準の国内法令/);
assert.match(js, /第2条第5項・第6項（判定基準）",1/);
assert.match(js, /第2条第7項・第8項（判定基準）",1/);
assert.match(js, /第2条（判定基準）",1/);
assert.doesNotMatch(js, /<span>整理済み情報<\/span>/);
assert.doesNotMatch(js, /renderStructuredPackingOriginal\(contextual, "整理済み情報"\)/);
assert.match(js, /renderStructuredPackingOriginal\(contextual, ""(?:, inlineLinkOptions)?\)/);
assert.match(js, /renderIbcMaximumContentReference/);
assert.match(js, /IBC容器の最大内容積（参考）/);
assert.match(js, /PDF 353ページ/);
assert.match(js, /code-inline-reference-link/);
assert.match(js, /IMDG_CODE_PAGE_MAP\?\.entries/);
assert.match(js, /(?<!\[A-Z0-9\])/);
assert.match(css, /part491: コード詳細の不要見出し削除・原典コード直リンク/);
assert.match(css, /\.code-inline-reference-link/);
for (const asset of ['detail-dashboard.css','imdg-code-page-map.js','domestic-packing-quantity-profiles.js','imdg-cross-reference-resolver.js','detail-dashboard.js']) {
  assert.match(html, new RegExp(`${asset.replace('.', '\\.') }\\?v=49[12]`), `cache-bust ${asset}`);
}
assert.ok(exists('assets/domestic-law-pages/notification/page-1.png'));
assert.ok(exists('references/excerpts/domestic/notification-article-2.pdf'));
const excerptPath = new URL('references/excerpts/domestic/notification-article-2.pdf', root);
const excerptText = execFileSync('pdftotext', ['-layout', excerptPath.pathname, '-'], { encoding: 'utf8' });
assert.match(excerptText, /第二条/);
assert.match(excerptText, /分類の欄が火薬類/);
assert.doesNotMatch(excerptText.slice(0, 300), /第二条の二/);

const context = { window: {} };
vm.createContext(context);
for (const file of ['data/imdg-code-page-map.js']) vm.runInContext(read(file), context, { filename: file });
const entries = context.window.IMDG_CODE_PAGE_MAP.entries;
for (const code of ['P130','PP67','LP01','IBC02','T4','TP1','BK2','B1','SW1','SP188']) {
  assert.ok(entries[code]?.page, `${code}: verified IMDG direct page`);
}
// VV/CV/V/Sも原文中コードとして認識するが、検証済みページ対応がないコードは
// 誤ったリンクを生成せず、文字列のまま表示する。
for (const family of ['VV','CV','V','S']) {
  assert.match(js, new RegExp(`\\|${family}(?:\\||\\))`), `${family}: inline code family supported`);
}
for (const code of ['VV1','CV1','V1','S1']) {
  assert.equal(entries[code], undefined, `${code}: no fabricated page mapping`);
}
assert.equal(entries.P130.page, 178);
assert.equal(entries.PP67.page, 178);

console.log('part491 judgement criteria / code-link verification passed');
