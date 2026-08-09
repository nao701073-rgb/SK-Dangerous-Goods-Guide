const DAY_MS = 86_400_000;
const clean = value => String(value ?? '').trim();
const asDate = value => value instanceof Date ? value : new Date(value);
const sameActor = (a,b) => clean(a) && clean(a) === clean(b);

export const severitySlaDays = Object.freeze({ critical:1, high:7, medium:30, low:90 });

export function calculateRetentionDue(endedAt, retentionDays) {
  const end = asDate(endedAt);
  const days = Number(retentionDays);
  if (Number.isNaN(end.getTime()) || !Number.isInteger(days) || days < 1) throw new Error('保存終了日または保存日数が不正です。');
  return new Date(end.getTime() + days * DAY_MS);
}

export function calculateVulnerabilityDue(detectedAt, severity, overrideDays = null) {
  const detected = asDate(detectedAt);
  const days = overrideDays == null ? severitySlaDays[clean(severity)] : Number(overrideDays);
  if (Number.isNaN(detected.getTime()) || !Number.isInteger(days) || days < 1) throw new Error('脆弱性の検知日または期限が不正です。');
  return new Date(detected.getTime() + days * DAY_MS);
}

export function validateRetentionPolicy(input = {}) {
  const errors = [];
  if (!clean(input.recordType)) errors.push('記録種別が必要です。');
  if (!Number.isInteger(Number(input.retentionDays)) || Number(input.retentionDays) < 30) errors.push('保存期間は30日以上で設定してください。');
  if (!['archive-then-dispose','retain-only','legal-hold'].includes(clean(input.disposition))) errors.push('保存後の取扱いを確認してください。');
  if (!clean(input.ownerRole)) errors.push('管理責任者の役割が必要です。');
  return { valid:errors.length === 0, errors };
}

export function validateDisposalActors(row = {}, actorId, stage) {
  const actor = clean(actorId);
  const errors = [];
  if (!actor) errors.push('実行者を確認できません。');
  if (stage === 'review' && sameActor(row.created_by, actor)) errors.push('作成者本人は廃棄確認者になれません。');
  if (stage === 'execute' && [row.created_by,row.reviewed_by].some(value => sameActor(value,actor))) errors.push('作成者・確認者とは別の利用者が廃棄してください。');
  if (stage === 'verify' && [row.created_by,row.reviewed_by,row.executed_by].some(value => sameActor(value,actor))) errors.push('作成・確認・実行者とは別の利用者が廃棄結果を検証してください。');
  if (row.legal_hold === true) errors.push('法的保全中の記録は廃棄できません。');
  return { valid:errors.length === 0, errors };
}

export function validateEvidenceMetadata(input = {}) {
  const errors = [];
  const text = [input.title,input.reference,input.note,input.storageReference].map(clean).join(' ');
  if (!clean(input.title)) errors.push('証跡名が必要です。');
  if (!['public','internal','confidential','restricted'].includes(clean(input.classification))) errors.push('機密区分を確認してください。');
  if (!/^[a-f0-9]{64}$/i.test(clean(input.sha256))) errors.push('SHA-256を64桁の16進数で入力してください。');
  const forbidden = [/(?:password|passwd|secret|token|api[_-]?key)\s*[:=]/i,/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i,/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i];
  if (forbidden.some(pattern => pattern.test(text))) errors.push('秘密情報・メールアドレス・秘密鍵を証跡台帳へ直接保存できません。');
  return { valid:errors.length === 0, errors };
}

export function validateVulnerability(input = {}, now = new Date()) {
  const errors = [];
  if (!clean(input.assetName)) errors.push('対象資産が必要です。');
  if (!['critical','high','medium','low'].includes(clean(input.severity))) errors.push('重大度を確認してください。');
  if (!clean(input.title)) errors.push('脆弱性名が必要です。');
  const detected = asDate(input.detectedAt);
  if (Number.isNaN(detected.getTime()) || detected > now) errors.push('検知日時を確認してください。');
  if (input.cvss != null && (Number(input.cvss) < 0 || Number(input.cvss) > 10)) errors.push('CVSSは0～10で入力してください。');
  return { valid:errors.length === 0, errors };
}

export function validateVulnerabilityClosure(row = {}, actorId, now = new Date()) {
  const errors = [];
  if (!['mitigated','accepted'].includes(clean(row.status))) errors.push('軽減済みまたはリスク受容済みの案件だけを終了承認できます。');
  if (sameActor(row.owner_user_id,actorId) || sameActor(row.mitigated_by,actorId)) errors.push('対応責任者・対応実施者とは別の利用者が確認してください。');
  if (!clean(row.resolution_note) || !/^[a-f0-9]{64}$/i.test(clean(row.evidence_sha256))) errors.push('対応内容と証跡SHA-256が必要です。');
  if (clean(row.status)==='accepted' && (!clean(row.risk_acceptance_reason) || !row.risk_acceptance_expires_at || asDate(row.risk_acceptance_expires_at) <= now)) errors.push('リスク受容理由と将来の有効期限が必要です。');
  return { valid:errors.length === 0, errors };
}

export function validateAuditActors(row = {}, actorId, stage) {
  const actor = clean(actorId);
  const errors = [];
  const prior = stage === 'review' ? [row.created_by,row.submitted_by] : stage === 'approve' ? [row.created_by,row.submitted_by,row.reviewed_by] : [];
  if (prior.some(value => sameActor(value,actor))) errors.push(stage === 'review' ? '作成・提出者とは別の利用者が確認してください。' : '作成・提出・確認者とは別の利用者が承認してください。');
  return { valid:errors.length === 0, errors };
}

export function evaluateAssuranceGate({ disposals=[], vulnerabilities=[], audits=[], findings=[] } = {}, now = new Date()) {
  const blockers = [];
  for (const item of disposals) {
    if (item.legal_hold) blockers.push(`法的保全中の廃棄案件: ${item.title || item.id}`);
    if (!['verified','cancelled'].includes(clean(item.status)) && item.due_at && asDate(item.due_at) < now) blockers.push(`期限超過の廃棄案件: ${item.title || item.id}`);
  }
  for (const item of vulnerabilities) {
    if (['closed','cancelled'].includes(clean(item.status))) continue;
    const severe = ['critical','high'].includes(clean(item.severity));
    if (severe && item.due_at && asDate(item.due_at) < now) blockers.push(`期限超過の${item.severity}脆弱性: ${item.title || item.id}`);
  }
  for (const audit of audits) {
    if (clean(audit.status)==='approved') continue;
    if (audit.due_at && asDate(audit.due_at) < now) blockers.push(`期限超過の外部監査: ${audit.title || audit.id}`);
  }
  for (const item of findings) {
    if (['verified','closed','cancelled'].includes(clean(item.status))) continue;
    if (['critical','high'].includes(clean(item.severity))) blockers.push(`未解決の${item.severity}監査指摘: ${item.title || item.id}`);
    else if (item.due_at && asDate(item.due_at) < now) blockers.push(`期限超過の監査指摘: ${item.title || item.id}`);
  }
  return { allowed:blockers.length === 0, blockers };
}
