import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = rel => fs.existsSync(path.join(root, rel));

const expectedPages = [
  'application-verification.html','applications.html','ctu-securing-calculator.html',
  'dangerous-goods-detail.html','dangerous-goods-search.html','ems.html','feedback.html',
  'imdg-cross-reference.html','label-catalog.html','overpack-label-tool.html','references.html',
  'regulations.html','search-history.html','settings.html','system-settings.html'
];
for (const file of expectedPages) {
  const html = read(`pages/${file}`);
  assert.match(html, /unified-submenu\.css\?v=500/, `${file}: unified-submenu.css`);
  assert.match(html, /unified-submenu\.js\?v=500/, `${file}: unified-submenu.js`);
}

const submenu = read('assets/js/unified-submenu.js');
for (const label of ['ホーム','危険物検索','申請番号管理','申請書確認','固縛力参考算出','関連法令','関連資料','オーバーパック表示用作成','検索履歴','改善要望','ユーザー設定','システム設定']) {
  assert.ok(submenu.includes(label), `submenu item: ${label}`);
}

const bundleManifest = JSON.parse(read('references/excerpts/domestic-bundles/judgement-criteria/manifest.json'));
const keys = Object.keys(bundleManifest);
assert.equal(keys.length, 13);
for (const key of keys) {
  assert.ok(exists(`references/excerpts/domestic-bundles/judgement-criteria/${key}.pdf`), `${key}.pdf`);
  assert.ok(exists(`assets/domestic-law-bundles/judgement-criteria/${key}.png`), `${key}.png`);
}

const detail = read('assets/js/detail-dashboard.js');
assert.match(detail, /buildJudgementCriteriaBundle/);
assert.match(detail, /judgement-criteria\/\$\{key\}\.pdf/);
assert.match(detail, /judgement-criteria\/\$\{key\}\.png/);
assert.match(detail, /openJudgementCriteriaSourceFullscreen/);
assert.match(detail, /結合PDFを別画面で開く/);

const detailHtml = read('pages/dangerous-goods-detail.html');
assert.match(detailHtml, /detail-dashboard\.css\?v=500/);
assert.match(detailHtml, /detail-dashboard\.js\?v=500/);

console.log(JSON.stringify({
  pages: expectedPages.length,
  judgementBundles: keys.length,
  result: 'ok'
}, null, 2));
