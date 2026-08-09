const DAY_MS=86_400_000;
const clean=v=>String(v??'').trim();
const asDate=v=>v instanceof Date?v:new Date(v);
const same=(a,b)=>clean(a)&&clean(a)===clean(b);
const sha=/^[a-f0-9]{64}$/i;
const forbidden=[/(?:password|passwd|secret|token|api[_-]?key|private[_-]?key)\s*[:=]/i,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i];
export const driftSlaDays=Object.freeze({critical:1,high:7,medium:30,low:90});
export function calculateDriftDue(detectedAt,severity){const d=asDate(detectedAt),days=driftSlaDays[clean(severity)];if(Number.isNaN(d.getTime())||!days)throw new Error('構成差分の検知日時または重大度が不正です。');return new Date(d.getTime()+days*DAY_MS);}
export function evaluateHealthSnapshot(input={},now=new Date()){
 const errors=[];const environment=clean(input.environment);if(!['production','staging','test','development'].includes(environment))errors.push('環境を確認してください。');
 const measured=asDate(input.measuredAt);if(Number.isNaN(measured.getTime())||measured>now)errors.push('測定日時を確認してください。');
 const numeric=['p95ResponseMs','errorRatePercent','cpuPercent','memoryPercent','dbConnectionPercent','storagePercent','backupAgeHours','restoreTestAgeDays'];
 numeric.forEach(k=>{const n=Number(input[k]);if(!Number.isFinite(n)||n<0)errors.push(`${k}を0以上で入力してください。`);});
 if(Number(input.errorRatePercent)>100||Number(input.cpuPercent)>100||Number(input.memoryPercent)>100||Number(input.dbConnectionPercent)>100||Number(input.storagePercent)>100)errors.push('割合は100以下で入力してください。');
 if(!sha.test(clean(input.evidenceSha256)))errors.push('証跡SHA-256を64桁で入力してください。');
 const blockers=[];const warnings=[];
 const critical=[[input.errorRatePercent,5,'エラー率5%以上'],[input.cpuPercent,95,'CPU95%以上'],[input.memoryPercent,95,'メモリ95%以上'],[input.dbConnectionPercent,95,'DB接続95%以上'],[input.storagePercent,95,'保存領域95%以上'],[input.backupAgeHours,48,'バックアップ48時間超'],[input.restoreTestAgeDays,180,'復元試験180日超']];
 const warning=[[input.p95ResponseMs,2000,'P95応答2秒超'],[input.errorRatePercent,1,'エラー率1%以上'],[input.cpuPercent,80,'CPU80%以上'],[input.memoryPercent,80,'メモリ80%以上'],[input.dbConnectionPercent,80,'DB接続80%以上'],[input.storagePercent,80,'保存領域80%以上'],[input.backupAgeHours,24,'バックアップ24時間超'],[input.restoreTestAgeDays,90,'復元試験90日超']];
 critical.forEach(([v,t,m])=>{if(Number(v)>=t)blockers.push(m)});warning.forEach(([v,t,m])=>{if(Number(v)>=t&&!blockers.includes(m))warnings.push(m)});
 return {valid:errors.length===0,errors,status:blockers.length?'critical':warnings.length?'warning':'healthy',blockers,warnings};
}
export function validateConfigurationBaseline(input={}){const errors=[];if(!['production','staging','test','development'].includes(clean(input.environment)))errors.push('環境を確認してください。');if(!clean(input.componentName))errors.push('構成対象が必要です。');if(!clean(input.baselineVersion))errors.push('基準版が必要です。');if(!sha.test(clean(input.configurationSha256)))errors.push('構成SHA-256を64桁で入力してください。');if(!clean(input.storageReference))errors.push('保管参照番号が必要です。');const text=[input.componentName,input.baselineVersion,input.storageReference,input.note].map(clean).join(' ');if(forbidden.some(p=>p.test(text)))errors.push('秘密情報・メールアドレス・秘密鍵を構成台帳へ直接保存できません。');return {valid:errors.length===0,errors};}
export function validateDrift(input={},now=new Date()){const errors=[];if(!clean(input.baselineId))errors.push('基準構成が必要です。');if(!['critical','high','medium','low'].includes(clean(input.severity)))errors.push('重大度を確認してください。');if(!clean(input.title))errors.push('差分名が必要です。');const d=asDate(input.detectedAt);if(Number.isNaN(d.getTime())||d>now)errors.push('検知日時を確認してください。');if(!clean(input.description)||clean(input.description).length<10)errors.push('差分内容を10文字以上で入力してください。');if(!clean(input.remediationPlan)||clean(input.remediationPlan).length<10)errors.push('是正計画を10文字以上で入力してください。');return {valid:errors.length===0,errors};}
export function validateDriftActors(row={},actorId,stage){const errors=[];if(stage==='resolve'&&same(row.owner_user_id,actorId))errors.push('責任者本人だけで是正完了を確定できません。別の実施者が記録してください。');if(stage==='verify'&&[row.owner_user_id,row.resolved_by].some(v=>same(v,actorId)))errors.push('責任者・是正実施者とは別の利用者が検証してください。');return {valid:errors.length===0,errors};}
export function validateActionActors(row={},actorId,stage){const errors=[];if(stage==='complete'&&same(row.owner_user_id,actorId))errors.push('責任者本人だけで改善完了を確定できません。別の実施者が記録してください。');if(stage==='verify'&&[row.owner_user_id,row.completed_by].some(v=>same(v,actorId)))errors.push('責任者・実施者とは別の利用者が効果確認してください。');return {valid:errors.length===0,errors};}
export function validateReviewActors(row={},actorId,stage){const prior=stage==='review'?[row.created_by,row.submitted_by]:stage==='approve'?[row.created_by,row.submitted_by,row.reviewed_by]:[];const errors=[];if(prior.some(v=>same(v,actorId)))errors.push(stage==='review'?'作成・提出者とは別の利用者が確認してください。':'作成・提出・確認者とは別の利用者が承認してください。');return {valid:errors.length===0,errors};}
export function evaluateReliabilityGate({healthSnapshots=[],drifts=[],actions=[]}={},now=new Date()){
 const blockers=[];const prod=[...healthSnapshots].filter(x=>clean(x.environment)==='production').sort((a,b)=>asDate(b.measured_at||b.measuredAt)-asDate(a.measured_at||a.measuredAt))[0];
 if(!prod)blockers.push('本番環境の健全性測定がありません。');else{if(clean(prod.status)==='critical')blockers.push('本番環境の健全性が重大です。');if(asDate(prod.measured_at||prod.measuredAt)<new Date(now.getTime()-24*60*60*1000))blockers.push('本番環境の健全性測定が24時間以上前です。');if(Number(prod.backup_age_hours??prod.backupAgeHours)>24)blockers.push('本番バックアップが24時間を超えています。');if(Number(prod.restore_test_age_days??prod.restoreTestAgeDays)>90)blockers.push('復元試験が90日を超えています。');}
 for(const d of drifts){if(['verified','closed','cancelled'].includes(clean(d.status)))continue;if(['critical','high'].includes(clean(d.severity)))blockers.push(`未解決の${d.severity}構成差分: ${d.title||d.id}`);else if(d.due_at&&asDate(d.due_at)<now)blockers.push(`期限超過の構成差分: ${d.title||d.id}`);}
 for(const a of actions){if(['verified','closed','cancelled'].includes(clean(a.status)))continue;if(['critical','high'].includes(clean(a.priority)))blockers.push(`未完了の${a.priority}改善施策: ${a.title||a.id}`);else if(a.due_at&&asDate(a.due_at)<now)blockers.push(`期限超過の改善施策: ${a.title||a.id}`);}
 return {allowed:blockers.length===0,blockers};
}
