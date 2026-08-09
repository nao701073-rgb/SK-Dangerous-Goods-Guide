import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const html = readFileSync(resolve(root, 'pages/system-settings.html'), 'utf8');
const js = readFileSync(resolve(root, 'assets/js/quick-user-registration.js'), 'utf8');
const css = readFileSync(resolve(root, 'assets/css/settings.css'), 'utf8');
const checks = [
  ['システム設定内の簡易登録欄', html.includes('id="quickUserRegistrationPanel"') && html.includes('利用者アカウントの簡易登録')],
  ['管理者だけに表示', html.includes('data-roles="office-admin,safety-environment-admin"')],
  ['ログインID・利用者名・権限・所属', ['quickLoginId','quickDisplayName','quickRole','quickOfficeId'].every(id => html.includes(`id="${id}"`))],
  ['初期パスワード自動生成', html.includes('id="generateQuickPassword"') && js.includes('crypto.getRandomValues') && js.includes('generatePassword')],
  ['初回パスワード変更必須', html.includes('quickRequirePasswordChange') && html.includes('初回ログイン時にパスワード変更を必須') && js.includes('passwordChangeRequired: true')],
  ['API経由の利用者登録', js.includes('ISSApi.createAdminUser')],
  ['事業所管理者の登録範囲制限', js.includes('currentUser.role === "office-admin"') && js.includes('role.innerHTML = \'<option value="office-user"')],
  ['システム管理者の役割選択肢', html.includes('value="safety-environment-admin"') && html.includes('システム管理者')],
  ['初期情報の一時表示とコピー', html.includes('copyQuickCredentials') && js.includes('navigator.clipboard.writeText') && html.includes('clearQuickCredentials')],
  ['モバイル対応', css.includes('Part 360: quick user registration') && css.includes('@media(max-width:760px)')]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checked: checks.length, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
