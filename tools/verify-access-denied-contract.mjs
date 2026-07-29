import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = readFileSync(resolve(root, 'assets/js/role-access.js'), 'utf8');
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
  ['利用可能権限を先に表示', source.indexOf('この画面は ${roleNames} のみ利用できます。') < source.indexOf('設定画面へ戻る')],
  ['設定画面へ戻る導線', source.includes('>設定画面へ戻る</a>')],
  ['権限エラー通知', source.includes('role="alert"')]
];
const failed = checks.filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checked: checks.length, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
