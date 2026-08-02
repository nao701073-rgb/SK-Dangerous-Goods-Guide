import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const appJs = read('assets/js/application-verification.js');
const ctuJs = read('assets/js/ctu-excel-route-import.js');
const appHtml = read('pages/application-verification.html');
const ctuHtml = read('pages/ctu-securing-calculator.html');
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

for (const [name, source] of [['申請書確認', appJs], ['固縛力参考算出', ctuJs]]) {
  check(!/\blocalStorage\b|\bsessionStorage\b|\bindexedDB\b|\bcaches\s*\./.test(source), `${name}のExcel取込処理にブラウザ永続保存APIが含まれています。`);
  check(source.includes('secureEraseBuffer'), `${name}にArrayBuffer消去処理がありません。`);
  check(source.includes('disposeWorkbook'), `${name}にWorkbook破棄処理がありません。`);
  check(source.includes("addEventListener('pagehide'"), `${name}に画面離脱時の一時データ破棄がありません。`);
  check(source.includes("addEventListener('beforeunload'"), `${name}に画面終了時の一時データ破棄がありません。`);
}

check(!/resultPayload\s*=\s*\{\s*fileName/.test(appJs), '申請書確認の登録結果にExcelファイル名が保存されます。');
check(appJs.includes("source:'Excel申請書（原本未保存）'"), '申請書確認の登録結果に原本未保存の識別がありません。');
check(!/const state=\{[^}]*fileName/.test(ctuJs), '固縛力参考算出の状態にExcelファイル名が残ります。');
check(!/const state=\{[^}]*sourceSheets/.test(ctuJs), '固縛力参考算出の状態にシート名一覧が残ります。');
check(!/const state=\{[^}]*cargoRows/.test(ctuJs), '固縛力参考算出の状態に抽出行全体が残ります。');
check(ctuJs.includes('sanitizeFields'), '固縛力参考算出の登録情報を必要項目へ限定する処理がありません。');
check(appHtml.includes('Excel原本は端末内の一時メモリだけで解析'), '申請書確認画面に原本未保存の説明がありません。');
check(ctuHtml.includes('Excel原本は端末内の一時メモリだけで解析'), '固縛力参考算出画面に原本未保存の説明がありません。');
check(appHtml.includes('application-verification.js?v=481'), '申請書確認のキャッシュ更新番号がpart481ではありません。');
check(ctuHtml.includes('ctu-excel-route-import.js?v=481'), '固縛力参考算出のキャッシュ更新番号がpart481ではありません。');

if (failures.length) {
  console.error(`Part481 Excel一時処理検証: ${failures.length}件の不合格`);
  failures.forEach(x => console.error(`- ${x}`));
  process.exit(1);
}
console.log('Part481 Excel一時処理検証: 合格');
