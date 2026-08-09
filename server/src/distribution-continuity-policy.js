const SHA=/^[a-f0-9]{64}$/i;
const RELEASE=/^part\d+$/i;
const clean=v=>String(v??'').trim();
const lower=v=>clean(v).toLowerCase();
const date=v=>new Date(v);
const bool=v=>v===true||v==='true'||v===1||v==='1';
const num=v=>Number(v??0);
const sensitive=/(password|passphrase|secret|token|private\s*key|api[-_ ]?key|メールアドレス|氏名|ログインid|user\s*id)/i;
const statusRank={healthy:0,warning:1,critical:2};
const packageTypes=new Set(['full','delta','hotfix','rollback']);
const domains=new Set(['dangerous-goods','domestic-law','code-mapping','application-case','all']);
const supportedBrowsers=new Set(['chrome','edge','safari','firefox']);
const deviceClasses=new Set(['desktop','smartphone','tablet']);
const outageTypes=new Set(['api','database','storage','network','authentication','master-sync','other']);
const requiredEvidence=['distribution-manifest','compatibility-matrix','continuity-exercise','reconciliation-report','rollback-procedure'];
export const hashPattern=SHA;
export function evaluateDistributionPackage(input={},now=new Date()){
 const errors=[],warnings=[];
 const source=lower(input.sourceRelease??input.source_release),target=lower(input.targetRelease??input.target_release);
 const generated=date(input.generatedAt??input.generated_at);
 const base=num(input.baseRecordCount??input.base_record_count),added=num(input.addedCount??input.added_count),changed=num(input.changedCount??input.changed_count),removed=num(input.removedCount??input.removed_count);
 if(!packageTypes.has(lower(input.packageType??input.package_type)))errors.push('配布種別を確認してください。');
 if(!domains.has(lower(input.dataDomain??input.data_domain)))errors.push('対象データを確認してください。');
 if(!RELEASE.test(source)||!RELEASE.test(target)||source===target)errors.push('変更元版と変更先版を別のPart番号で入力してください。');
 if(Number.isNaN(generated.getTime())||generated>now)errors.push('生成日時を確認してください。');
 if([base,added,changed,removed].some(x=>!Number.isInteger(x)||x<0))errors.push('件数は0以上の整数で入力してください。');
 if(removed>base)errors.push('削除件数が基準件数を超えています。');
 if(lower(input.dataDomain??input.data_domain)==='dangerous-goods'&&base!==2725)errors.push('危険物マスターの基準件数は2,725件です。');
 for(const [label,value] of [['マニフェスト',input.manifestSha256??input.manifest_sha256],['配布ZIP',input.packageSha256??input.package_sha256],['ロールバックZIP',input.rollbackSha256??input.rollback_sha256]]) if(!SHA.test(clean(value)))errors.push(`${label}のSHA-256を確認してください。`);
 if(clean(input.packageSha256??input.package_sha256).toLowerCase()===clean(input.rollbackSha256??input.rollback_sha256).toLowerCase())errors.push('配布ZIPとロールバックZIPは別のSHA-256にしてください。');
 if(sensitive.test(`${clean(input.evidenceReference??input.evidence_reference)} ${clean(input.note)}`))errors.push('証跡台帳へ機密情報・個人情報の実値は保存できません。');
 const totalChanges=added+changed+removed;
 if(lower(input.packageType??input.package_type)==='delta'&&totalChanges===0)warnings.push('差分配布ですが変更件数が0件です。');
 if(base>0&&totalChanges/base>=.25)warnings.push('変更件数が基準件数の25％以上です。完全版配布も検討してください。');
 const status=errors.length?'critical':warnings.length?'warning':'healthy';
 return {valid:errors.length===0,status,errors,warnings,expectedRecordCount:base+added-removed,totalChanges};
}
export function validateDistributionActors(row={},actorId,stage){
 const actor=clean(actorId),errors=[];
 const prior={review:[row.created_by,row.submitted_by],approve:[row.created_by,row.submitted_by,row.reviewed_by],publish:[row.created_by,row.submitted_by,row.reviewed_by,row.approved_by],verify:[row.created_by,row.submitted_by,row.reviewed_by,row.approved_by,row.published_by]}[stage]||[];
 if(!actor)errors.push('担当者を確認してください。');
 if(prior.some(v=>clean(v)===actor))errors.push(stage==='review'?'作成・提出者とは別の利用者が確認してください。':stage==='approve'?'作成・提出・確認者とは別の利用者が承認してください。':stage==='publish'?'承認までの担当者とは別の利用者が配布してください。':'配布までの担当者とは別の利用者が配布後確認をしてください。');
 return {valid:errors.length===0,errors};
}
export function evaluateClientCompatibility(input={},now=new Date()){
 const errors=[],warnings=[];
 const tested=date(input.testedAt??input.tested_at),device=lower(input.deviceClass??input.device_class),browser=lower(input.browser);
 const testCount=num(input.testCount??input.test_count),failureCount=num(input.failureCount??input.failure_count);
 if(!deviceClasses.has(device))errors.push('端末区分を確認してください。');
 if(!supportedBrowsers.has(browser))errors.push('対応対象外のブラウザです。');
 if(!clean(input.browserVersion??input.browser_version)||!clean(input.os))errors.push('ブラウザ版とOSを入力してください。');
 if(Number.isNaN(tested.getTime())||tested>now)errors.push('試験日時を確認してください。');
 if(tested<new Date(now.getTime()-30*86400000))warnings.push('互換性試験が30日以上前です。');
 if(!Number.isInteger(testCount)||testCount<1||!Number.isInteger(failureCount)||failureCount<0||failureCount>testCount)errors.push('試験件数・失敗件数を確認してください。');
 const required=['onlineSuccess','offlineStartup','syncSuccess','layoutSuccess','pdfDeepLinkSuccess','storageSuccess','serviceWorkerSuccess'];
 required.forEach(k=>{const snake=k.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());if(!bool(input[k]??input[snake]))errors.push(`${k}の確認が不合格です。`);});
 if(failureCount>0)warnings.push('失敗した互換性試験があります。');
 if(!SHA.test(clean(input.evidenceSha256??input.evidence_sha256)))errors.push('証跡SHA-256を確認してください。');
 if(sensitive.test(`${clean(input.evidenceReference??input.evidence_reference)} ${clean(input.note)}`))errors.push('証跡台帳へ個人情報・秘密情報は保存できません。');
 return {valid:errors.length===0,status:errors.length?'critical':warnings.length?'warning':'healthy',errors,warnings};
}
export function validateContinuityExercise(input={},now=new Date()){
 const errors=[],warnings=[];
 const started=date(input.startedAt??input.started_at),restored=date(input.restoredAt??input.restored_at);
 const manual=num(input.manualRecordCount??input.manual_record_count),reentered=num(input.reenteredCount??input.reentered_count),conflicts=num(input.conflictCount??input.conflict_count),lost=num(input.lostCount??input.lost_count),duplicates=num(input.duplicateCount??input.duplicate_count);
 if(!outageTypes.has(lower(input.outageType??input.outage_type)))errors.push('障害区分を確認してください。');
 if(Number.isNaN(started.getTime())||Number.isNaN(restored.getTime())||started>restored||restored>now)errors.push('障害開始・復旧日時を確認してください。');
 if([manual,reentered,conflicts,lost,duplicates].some(x=>!Number.isInteger(x)||x<0))errors.push('件数は0以上の整数で入力してください。');
 if(reentered+lost!==manual)errors.push('再入力件数と欠落件数の合計が手動記録件数と一致しません。');
 if(lost>0)errors.push('欠落した手動記録があります。');
 if(duplicates>0)errors.push('重複登録があります。');
 if(conflicts>0)warnings.push('再同期時の競合が記録されています。');
 if(!clean(input.playbookReference??input.playbook_reference))errors.push('手動継続手順の参照番号が必要です。');
 for(const [label,value] of [['手動記録',input.manualExportSha256??input.manual_export_sha256],['再同期',input.syncEvidenceSha256??input.sync_evidence_sha256]])if(!SHA.test(clean(value)))errors.push(`${label}のSHA-256を確認してください。`);
 if(sensitive.test(`${clean(input.playbookReference??input.playbook_reference)} ${clean(input.note)}`))errors.push('証跡台帳へ個人情報・秘密情報は保存できません。');
 return {valid:errors.length===0,status:errors.length?'critical':warnings.length?'warning':'healthy',errors,warnings,durationMinutes:Number.isNaN(started.getTime())||Number.isNaN(restored.getTime())?null:Math.round((restored-started)/60000)};
}
export function validateContinuityActors(row={},actorId,stage){
 const actor=clean(actorId),errors=[];
 const prior={review:[row.created_by,row.executor_user_id],reconcile:[row.created_by,row.executor_user_id,row.reviewed_by],verify:[row.created_by,row.executor_user_id,row.reviewed_by,row.reconciled_by]}[stage]||[];
 if(prior.some(v=>clean(v)===actor))errors.push(stage==='review'?'記録者・実行者とは別の利用者が確認してください。':stage==='reconcile'?'記録・実行・確認担当者とは別の利用者が再同期してください。':'再同期までの担当者とは別の利用者が最終確認してください。');
 return {valid:errors.length===0,errors};
}
const latest=(rows,key)=>[...rows].sort((a,b)=>date(b[key]??b[key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())])-date(a[key]??a[key.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())]))[0];
export function evaluateDistributionContinuityGate({packages=[],compatibilityTests=[],exercises=[],reviewCandidate=null,now=new Date()}={}){
 const blockers=[];
 const pkg=[...packages].find(x=>lower(x.status)==='verified')||latest(packages,'generated_at');
 if(!pkg)blockers.push('検証済みのマスターデータ配布パッケージがありません。');
 else if(lower(pkg.status)!=='verified')blockers.push('最新配布パッケージが配布後確認済みではありません。');
 const recent=compatibilityTests.filter(x=>date(x.tested_at??x.testedAt)>=new Date(now.getTime()-30*86400000)&&lower(x.status)==='healthy');
 if(!recent.some(x=>lower(x.device_class??x.deviceClass)==='desktop'))blockers.push('30日以内のPC互換性合格証跡がありません。');
 if(!recent.some(x=>lower(x.device_class??x.deviceClass)==='smartphone'))blockers.push('30日以内のスマートフォン互換性合格証跡がありません。');
 const ex=[...exercises].find(x=>lower(x.status)==='verified')||latest(exercises,'restored_at');
 if(!ex)blockers.push('検証済みの障害時手動継続・再同期訓練がありません。');
 else {if(lower(ex.status)!=='verified')blockers.push('最新の手動継続訓練が最終確認済みではありません。');if(lower(ex.result_status??ex.resultStatus)==='critical')blockers.push('手動継続訓練が重大状態です。');if(date(ex.restored_at??ex.restoredAt)<new Date(now.getTime()-180*86400000))blockers.push('手動継続訓練が180日以上前です。');}
 if(reviewCandidate){const items=reviewCandidate.evidence_items??reviewCandidate.evidenceItems??[];const types=new Set(items.map(x=>lower(x.type)));requiredEvidence.forEach(x=>{if(!types.has(x))blockers.push(`必須証跡がありません: ${x}`);});items.forEach(x=>{if(!SHA.test(clean(x.sha256)))blockers.push(`証跡SHA-256が不正です: ${clean(x.type)}`);});}
 return {allowed:blockers.length===0,blockers};
}
export function validateReviewActors(row={},actorId,stage){
 const actor=clean(actorId),errors=[];
 const prior=stage==='review'?[row.created_by,row.submitted_by]:stage==='approve'?[row.created_by,row.submitted_by,row.reviewed_by]:[];
 if(prior.some(v=>clean(v)===actor))errors.push(stage==='review'?'作成・提出者とは別の利用者が確認してください。':'作成・提出・確認者とは別の利用者が承認してください。');
 return {valid:errors.length===0,errors};
}
export {requiredEvidence};
