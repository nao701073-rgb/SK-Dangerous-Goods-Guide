import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.resolve(process.argv[2] || '.');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const sandbox = { window: {} };
vm.runInNewContext(read('data/domestic-complex-packing-profiles.js'), sandbox, { filename: 'domestic-complex-packing-profiles.js' });
const profile = sandbox.window.DOMESTIC_COMPLEX_PACKING_PROFILES?.profiles?.P520;
check(Boolean(profile), 'P520複雑包装要件プロファイルがありません。');
check(JSON.stringify(profile?.sourcePages) === JSON.stringify([320, 321, 322, 323]), 'P520原典ページは320～323ページでなければなりません。');
check(profile?.sections?.length === 3, 'P520は3区分で表示する必要があります。');
check(profile?.sections?.[0]?.rows?.length === 24, '固体・組合せ容器は24行必要です。');
check(profile?.sections?.[1]?.rows?.length === 25, '固体・単一容器・複合容器は25行必要です。');
check(profile?.sections?.[2]?.rows?.length === 25, '液体・単一容器・複合容器は25行必要です。');
check(profile?.notes?.length === 7, 'P520注記は7件必要です。');
check(profile?.additionalProvisions?.map(x => x.code).join(',') === 'PP21,PP22,PP94,PP95', 'P520追加規定PP21、PP22、PP94、PP95が必要です。');

const firstSolid = profile?.sections?.[0]?.rows?.find(row => row.container === '1G');
check(firstSolid?.op1 === '0.5kg' && firstSolid?.op2Outer === '10kg' && firstSolid?.op8 === '400kg', 'P520固体1Gの値が原典表と一致しません。');
const solid4h2 = profile?.sections?.[0]?.rows?.find(row => row.container === '4H2');
check(solid4h2?.op8 === '200kg', 'P520固体組合せ容器4H2のOP8は200kgです。');
const liquid = profile?.sections?.[2]?.rows?.find(row => row.container === '6HH2');
check(liquid?.op1 === '0.5L' && liquid?.op5 === '30L' && liquid?.op8 === '225L', 'P520液体6HH2の値が原典表と一致しません。');

const js = read('assets/js/detail-dashboard.js');
const css = read('assets/css/detail-dashboard.css');
const html = read('pages/dangerous-goods-detail.html');
check(js.includes('renderComplexPackingProfile'), 'P520構造化レンダラーがありません。');
check(js.includes('complexProfilePages'), 'P520の320～323ページリンク処理がありません。');
check(js.includes('responsive-wide-table'), '同種の複雑表を幅に応じてカード化する処理がありません。');
check(css.includes('@container code-detail-content (max-width: 1040px)'), '内容量に応じた1040pxカード切替がありません。');
check(css.includes('.p520-card-view'), 'P520カード表示CSSがありません。');
check(html.includes('domestic-complex-packing-profiles.js?v=505'), 'P520構造化データが詳細画面で読み込まれていません。');

const htmlFiles = [path.join(root, 'index.html'), ...fs.readdirSync(path.join(root, 'pages')).filter(name => name.endsWith('.html')).map(name => path.join(root, 'pages', name))];
check(htmlFiles.length === 63, `HTML画面数が63ではありません（${htmlFiles.length}）。`);
for (const file of htmlFiles) {
  const content = fs.readFileSync(file, 'utf8');
  check(content.includes('<meta name="sk-build" content="part505">'), `${path.relative(root, file)}のビルド表記がpart505ではありません。`);
}

for (const rel of ['assets/js/detail-dashboard.js', 'data/domestic-complex-packing-profiles.js']) {
  try { execFileSync(process.execPath, ['--check', path.join(root, rel)], { stdio: 'pipe' }); }
  catch (error) { failures.push(`${rel}のJavaScript構文検査に失敗しました。`); }
}

if (failures.length) {
  console.error(JSON.stringify({ status: 'failed', failures }, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({
  status: 'passed',
  sourcePages: profile.sourcePages,
  sectionRows: profile.sections.map(section => ({ id: section.id, rows: section.rows.length })),
  notes: profile.notes.length,
  additionalProvisions: profile.additionalProvisions.map(item => item.code),
  htmlScreens: htmlFiles.length
}, null, 2));
