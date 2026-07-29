import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const root = resolve(new URL('..', import.meta.url).pathname);
const serverDir = join(root, 'server');
const versionPath = join(root, 'VERSION.json');
const version = JSON.parse(readFileSync(versionPath, 'utf8'));
const outputPath = join(root, 'docs', `${version.version}_総合検証レポート.json`);

function listFiles(dir, predicate, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (!['node_modules', '.git'].includes(name)) listFiles(full, predicate, out);
    } else if (predicate(full)) out.push(full);
  }
  return out;
}

function run(name, command, args, cwd = root) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false });
  return {
    name,
    status: result.status === 0 ? 'passed' : 'failed',
    exitCode: result.status ?? 1,
    startedAt,
    finishedAt: new Date().toISOString(),
    stdout: String(result.stdout || '').trim().slice(-12000),
    stderr: String(result.stderr || '').trim().slice(-12000)
  };
}

const requiredPages = [
  'index.html',
  'pages/login.html',
  'pages/settings.html',
  'pages/system-settings.html',
  'pages/dangerous-goods-search.html',
  'pages/dangerous-goods-detail.html',
  'pages/regulations.html',
  'pages/references.html',
  'pages/applications.html',
  'pages/user-admin.html',
  'pages/user-activity-admin.html',
  'pages/regulation-update-admin.html',
  'pages/data-quality-admin.html',
  'pages/completion-roadmap.html',
  'pages/prototype-completion-review.html',
  'pages/documentation-release-center.html'
];

const requiredCheck = {
  name: '主要画面・構成ファイル',
  status: 'passed',
  missing: requiredPages.filter(path => !existsSync(join(root, path)))
};
if (requiredCheck.missing.length) requiredCheck.status = 'failed';

const syntaxFiles = listFiles(join(root, 'assets', 'js'), f => f.endsWith('.js'))
  .concat(listFiles(join(root, 'server'), f => f.endsWith('.js')));
const syntaxFailures = [];
for (const file of syntaxFiles) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) syntaxFailures.push({ file: relative(root, file), error: String(result.stderr || result.stdout).trim() });
}
const syntaxCheck = {
  name: 'JavaScript構文検査',
  status: syntaxFailures.length ? 'failed' : 'passed',
  checkedFiles: syntaxFiles.length,
  failures: syntaxFailures
};

const tests = [
  run('静的ファイル・参照検査', process.execPath, ['../tools/qa-static.mjs'], serverDir),
  run('ログイン仕様回帰検証', process.execPath, ['../tools/verify-login-contract.mjs'], serverDir),
  run('ログイン視覚資産検証', process.execPath, ['../tools/verify-login-visual-assets.mjs'], serverDir),
  run('表示文言統一検証', process.execPath, ['../tools/verify-copy-contract.mjs'], serverDir),
  run('利用者簡易登録仕様検証', process.execPath, ['../tools/verify-quick-user-registration-contract.mjs'], serverDir),
  run('ログイン切替・段落レスポンシブ検証', process.execPath, ['../tools/verify-access-policy-layout-contract.mjs'], serverDir),
  run('権限エラー画面仕様検証', process.execPath, ['../tools/verify-access-denied-contract.mjs'], serverDir),
  run('主要機能アイコン仕様検証', process.execPath, ['../tools/verify-home-icon-contract.mjs'], serverDir),
  run('日本語見出し統一検証', process.execPath, ['../tools/verify-japanese-heading-contract.mjs'], serverDir),
  run('ホーム・法令画面統合表示検証', process.execPath, ['../tools/verify-dashboard-regulation-contract.mjs'], serverDir),
  run('ホーム利用履歴・お気に入り表示検証', process.execPath, ['../tools/verify-home-activity-contract.mjs'], serverDir),
  run('役割別権限マトリクス', process.execPath, ['scripts/verify-role-matrix.js'], serverDir),
  run('危険物データ公開判定', process.execPath, ['scripts/check-data-release.js', '../docs/Part211_データ品質監査レポート.json'], serverDir),
  requiredCheck,
  syntaxCheck
];

const dataPath = join(root, 'data', 'un-data.js');
const hash = createHash('sha256').update(readFileSync(dataPath)).digest('hex');
const passed = tests.every(t => t.status === 'passed');
const report = {
  schemaVersion: 1,
  reportName: `${version.version} 総合検証レポート`,
  generatedAt: new Date().toISOString(),
  systemVersion: version.version,
  versionMetadata: version,
  overallStatus: passed ? 'passed' : 'failed',
  summary: {
    testCount: tests.length,
    passedCount: tests.filter(t => t.status === 'passed').length,
    failedCount: tests.filter(t => t.status === 'failed').length,
    javascriptFilesChecked: syntaxFiles.length,
    requiredPagesChecked: requiredPages.length,
    dangerousGoodsDataSha256: hash
  },
  tests,
  manualVerificationRequired: [
    'クラウドAPIへの実接続と認証メール送信',
    '50名・150名を想定した実環境負荷試験',
    '実端末でのPC・スマートフォン表示確認',
    '写真保存領域のバックアップ・復元試験',
    '初期利用者・所属・役割の実データ確認'
  ],
  notes: [
    '本レポートはソース一式に対する自動検査結果です。',
    'クラウド契約や外部サービスを必要とする試験は、配置先決定後に実施します。',
    '透かし表示、スクリーンショット検知・追跡、画面自動保存は未実装です。'
  ]
};
writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({ status: report.overallStatus, output: relative(root, outputPath), summary: report.summary }, null, 2));
process.exit(passed ? 0 : 1);
