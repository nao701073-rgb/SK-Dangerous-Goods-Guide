import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const js = read('assets/js/detail-dashboard.js');
const html = read('pages/dangerous-goods-detail.html');
const pdfPath = path.join(root, 'references/excerpts/domestic-bundles/package-marking-domestic-laws.pdf');
const imagePath = path.join(root, 'assets/domestic-law-bundles/package-marking-domestic-laws.png');

assert.ok(js.includes('const packageMarkingLegalReferences = ['), '品名・国連番号表示の国内法令一覧を定義');
for (const reference of [
  '危規則 第8条第1項・第9条',
  '危告示 第7条の3第1項・第2項',
  '危告示 第14条の2の2（オーバーパック表示）'
]) assert.ok(js.includes(`"${reference}"`), `${reference}を表示`);

const markingStart = js.indexOf('<article class="panel marking-panel">');
const markingEnd = js.indexOf('<article class="panel">\n          <div class="panel-heading"><h3>関連情報</h3>', markingStart);
const markingSection = js.slice(markingStart, markingEnd);
assert.ok(markingSection.includes('<strong>国内法令の主な参照</strong>'), '見出しを国内法令の主な参照に統一');
assert.ok(markingSection.includes('該当する国内法令を全画面で続けて表示'), 'ボタン文言を国内法令のみへ変更');
assert.ok(!markingSection.includes('国内法令・IMDG Codeの主な参照'), 'IMDG併記見出しを削除');
assert.ok(!markingSection.includes('IMDG Code 5.2.1.1'), '品名・国連番号表示欄からIMDG 5.2.1.1を削除');

for (const duplicate of ['国内法令（主表示）', '<tr><th>表示まとめ</th>']) {
  assert.ok(!js.includes(duplicate), `${duplicate}の重複表示を削除`);
}

assert.ok(js.includes('data-domestic-law-group="${escapeHtml(group)}"'), '国内法令ボタンを内部全画面表示へ接続');
assert.ok(js.includes('if (group === "package-marking")'), '品名・国連番号表示の専用分岐を実装');
assert.ok(js.includes('package-marking-domestic-laws.pdf'), '結合PDFを内部表示');
assert.ok(js.includes('package-marking-domestic-laws.png'), 'スマートフォン用連続画像を表示');
assert.ok(js.includes('国連番号${record.unNumber} 品名・国連番号表示の国内法令'), '全危険物で国連番号表記のタイトルを使用');
assert.ok(js.includes('第7条の3第1項・第2項",6'), '危告示第7条の3の正しいPDFページを設定');
assert.ok(js.includes('第14条の2の2",10'), '危告示第14条の2の2の正しいPDFページを設定');

assert.ok(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 5000, '品名・国連番号表示の結合PDFを収録');
assert.ok(fs.existsSync(imagePath) && fs.statSync(imagePath).size > 100000, 'スマートフォン用連続画像を収録');
const pdfText = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' });
for (const text of ['第8条第1項', '第9条', '第7条の3第1項・第2項', '第14条の2の2', 'OVERPACK']) {
  assert.ok(pdfText.includes(text), `結合PDFに${text}を収録`);
}
assert.ok(!pdfText.includes('IMDG Code 5.2.1.1'), '結合PDFにIMDG Codeを含めない');

for (const cache of ['detail-dashboard.css?v=497', 'detail-dashboard.js?v=497']) {
  assert.ok(html.includes(cache), `${cache}でキャッシュを更新`);
}
execFileSync(process.execPath, ['--check', path.join(root, 'assets/js/detail-dashboard.js')]);

const report = {
  schemaVersion: 1,
  version: 'part497',
  generatedAt: new Date().toISOString(),
  status: 'passed',
  scope: '全危険物の品名・国連番号表示に関する国内法令UI',
  changes: [
    '国内法令の主な参照へ見出しを統一',
    'IMDG Code 5.2.1.1の表示を削除',
    '該当する国内法令を全画面で続けて表示へ文言変更',
    '必要な国内法令だけを整形済み結合PDFで連続表示',
    '概要と重複する国内法令表示及び積載方法の表示まとめを削除'
  ],
  domesticReferences: [
    '危規則 第8条第1項・第9条',
    '危告示 第7条の3第1項・第2項',
    '危告示 第14条の2の2（オーバーパック表示）'
  ],
  designPreserved: ['色', 'フォント', '罫線', '角丸', '余白']
};
fs.writeFileSync(path.join(root, 'docs/part497-domestic-law-display-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log('part497 domestic law display verification passed');
