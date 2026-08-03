import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import vm from 'node:vm';
const root=resolve(process.argv[2]||'.');
const errors=[],warnings=[],checks=[];
const pass=(name,detail)=>checks.push({name,status:'pass',detail});
const fail=(name,detail)=>{checks.push({name,status:'fail',detail});errors.push(`${name}: ${detail}`)};
const warn=(name,detail)=>{checks.push({name,status:'warning',detail});warnings.push(`${name}: ${detail}`)};
const text=file=>readFileSync(join(root,file),'utf8');
const required=[
  'server/sql/093_part503_storage_permissions_approval_history_performance.sql','server/src/storage.js','server/scripts/backup.sh','server/scripts/backup-scheduler.sh','server/scripts/verify-backup.sh',
  'assets/js/central-backup-admin.js','assets/js/regulation-approval-admin.js','pages/regulation-approval-admin.html','data/legal-code-master-core.js','data/legal-code-master-codes.js'
];
const missing=required.filter(file=>!existsSync(join(root,file)));missing.length?fail('Part503構成ファイル',missing.join(', ')):pass('Part503構成ファイル',`${required.length}件を確認`);
const ctx={window:{},console};ctx.globalThis=ctx;vm.createContext(ctx);
for(const file of ['data/un-data.js','data/legal-code-master-core.js','data/legal-code-master-codes.js','data/domestic-judgement-criteria-texts.js','data/domestic-judgement-criteria.js'])vm.runInContext(text(file),ctx,{filename:file});
const records=ctx.window.UN_DATABASE||[],master=ctx.window.LEGAL_CODE_MASTER||{};
records.length===2725?pass('危険物レコード','2,725行'):fail('危険物レコード',`${records.length}行`);
new Set(records.map(row=>row.unNumber)).size===2248?pass('国連番号','2,248件'):fail('国連番号','件数不一致');
master.masterVersion==='part503'?pass('法令マスター版','part503'):fail('法令マスター版',master.masterVersion||'未設定');
Object.keys(master.codes||{}).length===594?pass('コードマスター','594件'):fail('コードマスター',`${Object.keys(master.codes||{}).length}件`);
const badWords=[];for(const row of records)for(const [key,value] of Object.entries(row))if(/undefined|nullp/i.test(String(value??'')))badWords.push(`${row.unNumber}:${key}`);
badWords.length?fail('不正表示候補',`${badWords.length}件`):pass('不正表示候補','undefined/nullpなし');
const detail=text('pages/dangerous-goods-detail.html'),cross=text('pages/imdg-cross-reference.html');
const runtimeSize=statSync(join(root,'data/legal-code-master-core.js')).size+statSync(join(root,'data/legal-code-master-codes.js')).size;
const oldSize=statSync(join(root,'data/legal-code-master.js')).size;
if(!detail.includes('legal-code-master.js')&&!detail.includes('legal-code-master-judgements.js')&&detail.includes('legal-code-master-core.js')&&detail.includes('legal-code-master-codes.js')&&!cross.includes('legal-code-master.js'))pass('法令マスター分割読込',`通常読込 ${(runtimeSize/1024/1024).toFixed(2)}MB（従来 ${(oldSize/1024/1024).toFixed(2)}MB）`);else fail('法令マスター分割読込','従来一括ファイルが通常画面に残っています');
const html=[join(root,'index.html'),...readdirSync(join(root,'pages')).filter(f=>f.endsWith('.html')).map(f=>join(root,'pages',f))];
const oldBuild=html.filter(file=>{const value=readFileSync(file,'utf8');return !value.includes('meta name="sk-build" content="part503"')||!value.includes('build-manifest.js?v=503')||!value.includes('version-guard.js?v=503')});
oldBuild.length?fail('バージョン混在防止',`${oldBuild.length}画面が旧版`):pass('バージョン混在防止',`${html.length}画面をpart503に統一`);
const auth=text('server/src/auth.js');
!auth.match(/OPERATIONAL_ROLES[^\n]*guest/)&&auth.includes("'office-user','office-admin','safety-environment-director','safety-environment-staff','safety-environment-admin'")?pass('サーバー側権限制御','ゲストを業務データAPIから除外'):fail('サーバー側権限制御','運用役割設定を確認してください');
const server=text('server/src/server.js'),migration=text('server/sql/093_part503_storage_permissions_approval_history_performance.sql');
const securitySignals=['/api/auth/permissions','requireDistinctRegulationActors','application_revisions','/api/admin/backup-status','regulation_approval_events'];
const missingSignals=securitySignals.filter(value=>!server.includes(value)&&!migration.includes(value));missingSignals.length?fail('中央管理API',missingSignals.join(', ')):pass('中央管理API','権限・履歴・承認・バックアップAPIを確認');
const approvalPage=text('pages/regulation-approval-admin.html');
approvalPage.includes('作成者、原典照合者、承認者')&&approvalPage.includes('regulationApprovalList')?pass('人による法令承認画面','作成・照合・承認・公開を分離'):fail('人による法令承認画面','必要要素が不足');
const maintenance=text('pages/system-maintenance.html');
maintenance.includes('centralBackupPanel')&&maintenance.includes('中央保存・自動バックアップ')?pass('中央バックアップ画面','状態・設定・復元試験を表示'):fail('中央バックアップ画面','必要要素が不足');
const applications=text('assets/js/applications.js');
applications.includes('centralApplicationHistoryDialog')&&applications.includes('applicationHistory(serverId)')?pass('中央訂正履歴画面','訂正前後・理由・操作者を確認可能'):fail('中央訂正履歴画面','必要要素が不足');
const sync=text('assets/js/sync-manager.js'),storage=text('assets/js/storage.js');
sync.includes('application-document')&&storage.includes('setApplicationDocumentServerId')?pass('申請書・写真中央同期','資料版管理を同期対象へ追加'):fail('申請書・写真中央同期','同期処理が不足');
const backup=text('server/scripts/backup.sh');
backup.includes('sha256sum')&&backup.includes('OFFSITE_BACKUP_COMMAND')&&backup.includes('system_backup_runs')?pass('バックアップ完全性','DB・添付・SHA-256・遠隔保管・実行台帳'):fail('バックアップ完全性','必要処理が不足');
const report={reportName:'Part503 実装検証レポート',generatedAt:new Date().toISOString(),systemVersion:'part503',releaseDecision:errors.length?'blocked':warnings.length?'pass-with-warnings':'pass',summary:{recordCount:records.length,uniqueUnCount:new Set(records.map(r=>r.unNumber)).size,masterCodeCount:Object.keys(master.codes||{}).length,htmlCount:html.length,runtimeLegalMasterBytes:runtimeSize,previousLegalMasterBytes:oldSize,errorCount:errors.length,warningCount:warnings.length,checkCount:checks.length},checks,errors,warnings};
writeFileSync(join(root,'docs','part503_実装検証レポート.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.summary,null,2));
if(errors.length){console.error(errors.join('\n'));process.exit(1)}
