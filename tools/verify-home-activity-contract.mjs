import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = readFileSync(resolve(root, 'assets/js/app.js'), 'utf8');
const css = readFileSync(resolve(root, 'assets/css/home-dashboard.css'), 'utf8');
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const checks = [
  ['検索履歴は実保存データを使用', source.includes('ISSStorage?.getSearchHistory?.()')],
  ['お気に入りは実保存データを使用', source.includes('ISSStorage?.getFavorites?.()')],
  ['固定サンプルデータを廃止', !source.includes('const recentSearches=') && !source.includes('GASOLINE')],
  ['検索履歴の空状態', source.includes('まだ検索履歴はありません。')],
  ['お気に入りの空状態', source.includes('お気に入りはまだ登録されていません。')],
  ['表示文字のHTMLエスケープ', source.includes('const escapeHtml') && source.includes('escapeHtml(label)')],
  ['履歴・お気に入り更新時の再描画', source.includes('window.addEventListener("storage"') && source.includes('refreshActivityPanels')],
  ['復帰時の再描画', source.includes('window.addEventListener("pageshow"')],
  ['メニューEscape操作', source.includes('event.key === "Escape"')],
  ['空状態の44px操作領域', css.includes('.simple-list__empty a') && css.includes('min-height: 44px')],
  ['スマートフォン下部安全領域', css.includes('env(safe-area-inset-bottom)')],
  ['キャッシュ識別子更新', home.includes('home-dashboard.css?v=346') && home.includes('app.js?v=346')]
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checkCount: checks.length, failed: failed.map(([name]) => name) }, null, 2));
process.exit(failed.length ? 1 : 0);
