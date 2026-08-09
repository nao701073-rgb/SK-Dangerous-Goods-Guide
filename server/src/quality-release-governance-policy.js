const DAY_MS = 86_400_000;
const clean = value => String(value ?? '').trim();
const asDate = value => value instanceof Date ? value : new Date(value);
const same = (a,b) => clean(a) && clean(a) === clean(b);
const sha = /^[a-f0-9]{64}$/i;
const severityRank = Object.freeze({ critical:4, high:3, medium:2, low:1 });
export const defectSlaDays = Object.freeze({ critical:1, high:7, medium:30, low:90 });
export const requiredReleaseEvidence = Object.freeze([
  'policy-report','static-report','regression-report','data-quality-report',
  'update-file-list','rollback-plan','installation-instructions'
]);

const finite = (value,name,errors,{min=0,max=Infinity,integer=false}={}) => {
  const number=Number(value);
  if(!Number.isFinite(number)||number<min||number>max||(integer&&!Number.isInteger(number))){
    errors.push(`${name}を${integer?'整数で':''}${min}以上${Number.isFinite(max)?`${max}以下`:''}で入力してください。`);
  }
  return number;
};

const validateEvidence = (input,errors) => {
  if(!clean(input.evidenceReference)) errors.push('証跡参照番号が必要です。');
  if(!sha.test(clean(input.evidenceSha256))) errors.push('証跡SHA-256を64桁で入力してください。');
};

export function evaluateQualityRuleRun(input={},now=new Date()){
  const errors=[];
  const domain=clean(input.domain);
  if(!['dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other'].includes(domain)) errors.push('品質ルールの対象分野を確認してください。');
  const executedAt=asDate(input.executedAt);
  if(Number.isNaN(executedAt.getTime())||executedAt>now) errors.push('実行日時を確認してください。');
  const evaluatedCount=finite(input.evaluatedCount,'評価件数',errors,{integer:true});
  const violationCount=finite(input.violationCount,'違反件数',errors,{integer:true});
  const criticalViolationCount=finite(input.criticalViolationCount,'重大違反件数',errors,{integer:true});
  const autoFixCandidateCount=finite(input.autoFixCandidateCount,'自動是正候補件数',errors,{integer:true});
  const manualReviewCount=finite(input.manualReviewCount,'手動確認件数',errors,{integer:true});
  const falsePositivePercent=finite(input.falsePositivePercent,'誤検知率',errors,{max:100});
  if(violationCount>evaluatedCount) errors.push('違反件数が評価件数を超えています。');
  if(criticalViolationCount>violationCount) errors.push('重大違反件数が違反件数を超えています。');
  if(autoFixCandidateCount+manualReviewCount<violationCount) errors.push('違反件数に対する自動是正候補または手動確認の割当が不足しています。');
  validateEvidence(input,errors);
  const violationRate=evaluatedCount?violationCount/evaluatedCount*100:0;
  const blockers=[],warnings=[];
  if(criticalViolationCount>0) blockers.push(`重大違反 ${criticalViolationCount}件`);
  if(violationRate>=5) blockers.push(`違反率 ${violationRate.toFixed(2)}%`);
  else if(violationCount>0) warnings.push(`違反 ${violationCount}件`);
  if(falsePositivePercent>=20) blockers.push(`誤検知率 ${falsePositivePercent}%`);
  else if(falsePositivePercent>=10) warnings.push(`誤検知率 ${falsePositivePercent}%`);
  return {valid:errors.length===0,errors,status:blockers.length?'critical':warnings.length?'warning':'healthy',blockers,warnings,violationRate:Number(violationRate.toFixed(4))};
}

export function validateCorrectionCandidate(input={},now=new Date()){
  const errors=[];
  if(!clean(input.ruleId)) errors.push('品質ルールIDが必要です。');
  if(!['dangerous-goods-master','domestic-law','code-mapping','application-case','ctu-link','attachment-metadata','other'].includes(clean(input.domain))) errors.push('是正候補の対象分野を確認してください。');
  if(!clean(input.entityReference)) errors.push('対象参照番号が必要です。');
  if(!clean(input.fieldName)) errors.push('対象項目名が必要です。');
  if(!sha.test(clean(input.currentValueSha256))) errors.push('現行値SHA-256を64桁で入力してください。');
  if(!sha.test(clean(input.proposedValueSha256))) errors.push('提案値SHA-256を64桁で入力してください。');
  if(clean(input.currentValueSha256)===clean(input.proposedValueSha256)) errors.push('現行値と提案値のSHA-256が同一です。');
  if(!['critical','high','medium','low'].includes(clean(input.severity))) errors.push('重大度を確認してください。');
  finite(input.confidencePercent,'信頼度',errors,{max:100});
  if(clean(input.rationale).length<10) errors.push('是正根拠を10文字以上で入力してください。');
  if(!clean(input.ownerUserId)) errors.push('責任者が必要です。');
  const detectedAt=asDate(input.detectedAt);
  if(Number.isNaN(detectedAt.getTime())||detectedAt>now) errors.push('検知日時を確認してください。');
  const forbidden=[input.entityReference,input.fieldName,input.rationale].join(' ').toLowerCase();
  if(/password|token|secret|private key|メールアドレス|氏名|本文|原文値/.test(forbidden)) errors.push('機密情報や個人情報の実値を是正候補へ保存できません。');
  return {valid:errors.length===0,errors};
}

export function validateCorrectionActors(row={},actorId,stage){
  const errors=[];
  const prior=stage==='review'?[row.created_by,row.owner_user_id]:stage==='apply'?[row.created_by,row.owner_user_id,row.reviewed_by]:stage==='verify'?[row.created_by,row.owner_user_id,row.reviewed_by,row.applied_by]:[];
  if(prior.some(value=>same(value,actorId))) errors.push(stage==='review'?'作成者・責任者とは別の利用者が確認してください。':stage==='apply'?'作成者・責任者・確認者とは別の利用者が適用してください。':'作成者・責任者・確認者・適用者とは別の利用者が効果確認してください。');
  return {valid:errors.length===0,errors};
}

export function deriveRegressionTargets(input={}){
  const components=new Set((input.impactedComponents||[]).map(clean).filter(Boolean));
  const targets=new Set(['authentication','authorization','navigation']);
  if(components.has('shared-ui')||components.has('frontend')) ['desktop-ui','mobile-ui','accessibility'].forEach(x=>targets.add(x));
  if(components.has('api')||components.has('server')) ['api-contract','permissions','audit-log'].forEach(x=>targets.add(x));
  if(components.has('database')||components.has('migration')) ['migration','rollback','data-integrity','backup-restore'].forEach(x=>targets.add(x));
  if(components.has('dangerous-goods-master')||components.has('master-data')) ['dangerous-goods-search','record-count-2725','unique-un-count-2248'].forEach(x=>targets.add(x));
  if(components.has('domestic-law')||components.has('regulation')) ['domestic-law-links','original-source-window','judgement-criteria'].forEach(x=>targets.add(x));
  if(components.has('application-case')) ['application-management','common-case-data','offline-sync','revision-history'].forEach(x=>targets.add(x));
  if(components.has('ctu-link')) ['ctu-calculation','application-ctu-link','mass-transfer'].forEach(x=>targets.add(x));
  if(components.has('attachments')) ['document-access','photo-access','hash-integrity','retention'].forEach(x=>targets.add(x));
  if(components.has('roles')||components.has('permissions')) ['role-matrix','direct-url-denial','office-scope'].forEach(x=>targets.add(x));
  return [...targets].sort();
}

export function evaluateChangeImpact(input={},now=new Date()){
  const errors=[];
  if(!['application','database','master-data','regulation','configuration','security','mixed'].includes(clean(input.changeType))) errors.push('変更種別を確認してください。');
  if(!clean(input.sourceRelease)||!clean(input.targetRelease)) errors.push('変更元版・変更先版が必要です。');
  if(clean(input.sourceRelease)===clean(input.targetRelease)) errors.push('変更元版と変更先版は別の値にしてください。');
  const analyzedAt=asDate(input.analyzedAt);
  if(Number.isNaN(analyzedAt.getTime())||analyzedAt>now) errors.push('影響分析日時を確認してください。');
  finite(input.changedFileCount,'変更ファイル数',errors,{integer:true});
  finite(input.changedTableCount,'変更テーブル数',errors,{integer:true});
  const components=(input.impactedComponents||[]).map(clean).filter(Boolean);
  if(!components.length) errors.push('影響対象コンポーネントが必要です。');
  const required=deriveRegressionTargets({impactedComponents:components});
  const selected=new Set((input.regressionTargets||[]).map(clean));
  const missing=required.filter(target=>!selected.has(target));
  if(missing.length) errors.push(`必須回帰対象が不足しています: ${missing.join(', ')}`);
  if(!['critical','high','medium','low'].includes(clean(input.riskLevel))) errors.push('変更リスクを確認してください。');
  if(clean(input.summary).length<10) errors.push('影響分析概要を10文字以上で入力してください。');
  validateEvidence(input,errors);
  const blockers=[];
  if(clean(input.riskLevel)==='critical') blockers.push('変更リスクが重大です。');
  if(missing.length) blockers.push(`回帰対象不足 ${missing.length}件`);
  return {valid:errors.length===0,errors,requiredTargets:required,missingTargets:missing,status:blockers.length?'critical':clean(input.riskLevel)==='high'?'warning':'healthy',blockers};
}

export function validateImpactActors(row={},actorId,stage){
  const errors=[];
  const prior=stage==='review'?[row.created_by]:stage==='approve'?[row.created_by,row.reviewed_by]:[];
  if(prior.some(value=>same(value,actorId))) errors.push(stage==='review'?'影響分析作成者とは別の利用者が確認してください。':'影響分析作成者・確認者とは別の利用者が承認してください。');
  return {valid:errors.length===0,errors};
}

export function calculateDefectDue(detectedAt,severity){
  const date=asDate(detectedAt),days=defectSlaDays[clean(severity)];
  if(Number.isNaN(date.getTime())||!days) throw new Error('不具合の検知日時または重大度が不正です。');
  return new Date(date.getTime()+days*DAY_MS);
}

export function validateReleaseDefect(input={},now=new Date()){
  const errors=[];
  if(!['critical','high','medium','low'].includes(clean(input.severity))) errors.push('重大度を確認してください。');
  if(!clean(input.title)) errors.push('不具合名が必要です。');
  if(clean(input.description).length<10) errors.push('不具合内容を10文字以上で入力してください。');
  const detectedAt=asDate(input.detectedAt);
  if(Number.isNaN(detectedAt.getTime())||detectedAt>now) errors.push('検知日時を確認してください。');
  if(!clean(input.ownerUserId)) errors.push('責任者が必要です。');
  return {valid:errors.length===0,errors};
}

export function validateReleaseCandidate(input={}){
  const errors=[];
  if(!clean(input.releaseName)||!/^part\d+$/i.test(clean(input.releaseName))) errors.push('リリース名をpart番号で入力してください。');
  if(!clean(input.baseRelease)||!/^part\d+$/i.test(clean(input.baseRelease))) errors.push('基準リリース名をpart番号で入力してください。');
  if(clean(input.releaseName)===clean(input.baseRelease)) errors.push('リリース名と基準リリース名は別にしてください。');
  if(!sha.test(clean(input.packageSha256))) errors.push('配布パッケージSHA-256を64桁で入力してください。');
  if(!sha.test(clean(input.rollbackPackageSha256))) errors.push('ロールバックパッケージSHA-256を64桁で入力してください。');
  if(clean(input.packageSha256)===clean(input.rollbackPackageSha256)) errors.push('配布パッケージとロールバックパッケージのSHA-256は別にしてください。');
  const evidence=Array.isArray(input.evidenceItems)?input.evidenceItems:[];
  const seen=new Set();
  evidence.forEach(item=>{
    const type=clean(item?.type),hash=clean(item?.sha256),reference=clean(item?.reference);
    if(!type||!reference||!sha.test(hash)) errors.push('リリース証跡の種別・参照番号・SHA-256を確認してください。');
    if(type) seen.add(type);
  });
  const missing=requiredReleaseEvidence.filter(type=>!seen.has(type));
  if(missing.length) errors.push(`必須リリース証跡が不足しています: ${missing.join(', ')}`);
  if(clean(input.releaseSummary).length<10) errors.push('リリース概要を10文字以上で入力してください。');
  return {valid:errors.length===0,errors,missingEvidence:missing};
}

export function validateReleaseActors(row={},actorId,stage){
  const errors=[];
  const prior=stage==='review'?[row.created_by,row.submitted_by]:stage==='approve'?[row.created_by,row.submitted_by,row.reviewed_by]:stage==='publish'?[row.created_by,row.submitted_by,row.reviewed_by,row.approved_by]:stage==='verify'?[row.created_by,row.submitted_by,row.reviewed_by,row.approved_by,row.published_by]:[];
  if(prior.some(value=>same(value,actorId))) errors.push(stage==='review'?'作成・提出者とは別の利用者が確認してください。':stage==='approve'?'作成・提出・確認者とは別の利用者が承認してください。':stage==='publish'?'作成・提出・確認・承認者とは別の利用者が配布してください。':'配布までの担当者とは別の利用者が配布後確認をしてください。');
  return {valid:errors.length===0,errors};
}

const latest = rows => [...rows].sort((a,b)=>asDate(b.executed_at||b.executedAt||b.analyzed_at||b.analyzedAt)-asDate(a.executed_at||a.executedAt||a.analyzed_at||a.analyzedAt))[0];
export function evaluateReleaseGate({qualityRuns=[],correctionCandidates=[],impactAnalyses=[],defects=[],releaseCandidate=null,now=new Date()}={}){
  const blockers=[];
  const quality=latest(qualityRuns);
  if(!quality) blockers.push('品質ルール実行結果がありません。');
  else {
    const at=asDate(quality.executed_at||quality.executedAt);
    if(Number.isNaN(at.getTime())||at<new Date(now.getTime()-24*60*60*1000)) blockers.push('品質ルール実行結果が24時間以上前です。');
    if(clean(quality.status)==='critical') blockers.push('品質ルール実行結果が重大状態です。');
  }
  correctionCandidates.forEach(row=>{
    if(['verified','rejected','cancelled'].includes(clean(row.status))) return;
    if(severityRank[clean(row.severity)]>=severityRank.high) blockers.push(`未完了の${row.severity}是正候補: ${row.entity_reference||row.id}`);
  });
  const impact=latest(impactAnalyses);
  if(!impact) blockers.push('変更影響分析がありません。');
  else if(clean(impact.status)!=='approved') blockers.push('変更影響分析が承認済みではありません。');
  defects.forEach(defect=>{
    if(['verified','closed','cancelled'].includes(clean(defect.status))) return;
    if(severityRank[clean(defect.severity)]>=severityRank.high) blockers.push(`未解決の${defect.severity}不具合: ${defect.title||defect.id}`);
    if(clean(defect.severity)==='medium'&&defect.due_at&&asDate(defect.due_at)<now) blockers.push(`期限超過の中不具合: ${defect.title||defect.id}`);
  });
  if(!releaseCandidate) blockers.push('リリース候補がありません。');
  else {
    const validation=validateReleaseCandidate({
      releaseName:releaseCandidate.release_name||releaseCandidate.releaseName,
      baseRelease:releaseCandidate.base_release||releaseCandidate.baseRelease,
      packageSha256:releaseCandidate.package_sha256||releaseCandidate.packageSha256,
      rollbackPackageSha256:releaseCandidate.rollback_package_sha256||releaseCandidate.rollbackPackageSha256,
      evidenceItems:releaseCandidate.evidence_items||releaseCandidate.evidenceItems||[],
      releaseSummary:releaseCandidate.release_summary||releaseCandidate.releaseSummary
    });
    if(!validation.valid) blockers.push(...validation.errors);
  }
  return {allowed:blockers.length===0,blockers};
}
