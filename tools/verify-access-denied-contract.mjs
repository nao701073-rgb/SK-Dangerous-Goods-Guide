import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = readFileSync(resolve(root, 'assets/js/role-access.js'), 'utf8');
const style = readFileSync(resolve(root, 'assets/css/style.css'), 'utf8');
const requiredOrder = [
  '"office-admin"',
  '"office-user"',
  '"safety-environment-director"',
  '"safety-environment-staff"',
  '"safety-environment-admin"'
];
const orderPositions = requiredOrder.map(value => source.indexOf(value, source.indexOf('const ACCESS_ROLE_DISPLAY_ORDER')));
const checks = [
  ['許可権限の表示順', orderPositions.every((value, index) => value >= 0 && (index === 0 || value > orderPositions[index - 1]))],
  ['現在の権限を非表示', !source.includes('<p>現在の権限：')],
  ['利用可能権限を先に表示', source.indexOf('この画面は ${roleNames} のみ利用できます。') < source.indexOf('ホームに戻る')],
  ['ホームに戻る導線', source.includes('>ホームに戻る</a>')],
  ['ホーム画面リンク', source.includes('const homeUrl = () => location.pathname.includes("/pages/") ? "../index.html" : "index.html";') && source.includes('const returnUrl = homeUrl();')],
  ['権限エラー通知', source.includes('role="alert"')],
  ['即時通知', source.includes('aria-live="assertive"')],
  ['見出し関連付け', source.includes('aria-labelledby="accessDeniedTitle"')],
  ['説明文関連付け', source.includes('aria-describedby="accessDeniedDescription"')],
  ['見出しフォーカス', source.includes('document.getElementById("accessDeniedTitle")?.focus()')],
  ['画面タイトル', source.includes('document.title = "権限がありません｜検査・検品業務サポートシステム"')],
  ['専用画面クラス', source.includes('document.body.className = "access-denied-page"')],
  ['モバイル画面高対応', style.includes('min-height: 100dvh')],
  ['安全領域対応', style.includes('env(safe-area-inset-top)') && style.includes('env(safe-area-inset-bottom)')],
  ['戻る導線44px確保', style.includes('.access-denied-return') && style.includes('min-height: 44px')]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checked: checks.length, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
