const DAY_MS = 86_400_000;
const clean = value => String(value ?? '').trim();
const asDate = value => value instanceof Date ? value : new Date(value);
const same = (a, b) => clean(a) && clean(a) === clean(b);
const sha = /^[a-f0-9]{64}$/i;
const severityRanks = Object.freeze({ critical: 4, high: 3, medium: 2, low: 1 });
export const issueSlaDays = Object.freeze({ critical: 1, high: 7, medium: 30, low: 90 });

const finite = (value, name, errors, { min = 0, max = Infinity, integer = false } = {}) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max || (integer && !Number.isInteger(number))) {
    errors.push(`${name}を${integer ? '整数で' : ''}${min}以上${Number.isFinite(max) ? `${max}以下` : ''}で入力してください。`);
  }
  return number;
};

const validateCommonSnapshot = (input, now, errors) => {
  const environment = clean(input.environment);
  if (!['production', 'staging', 'test', 'development'].includes(environment)) errors.push('環境を確認してください。');
  const measuredAt = asDate(input.measuredAt);
  if (Number.isNaN(measuredAt.getTime()) || measuredAt > now) errors.push('測定日時を確認してください。');
  if (!clean(input.evidenceReference)) errors.push('証跡参照番号が必要です。');
  if (!sha.test(clean(input.evidenceSha256))) errors.push('証跡SHA-256を64桁で入力してください。');
  return { environment, measuredAt };
};

export function evaluateDatabaseSearchSnapshot(input = {}, now = new Date()) {
  const errors = [];
  validateCommonSnapshot(input, now, errors);
  const queryP95Ms = finite(input.queryP95Ms, 'DBクエリP95', errors);
  const searchP95Ms = finite(input.searchP95Ms, '検索P95', errors);
  const failedQueryPercent = finite(input.failedQueryPercent, '失敗クエリ率', errors, { max: 100 });
  const cacheHitPercent = finite(input.cacheHitPercent, 'キャッシュヒット率', errors, { max: 100 });
  const connectionUsePercent = finite(input.connectionUsePercent, 'DB接続使用率', errors, { max: 100 });
  const indexBloatPercent = finite(input.indexBloatPercent, 'インデックス膨張率', errors, { max: 100 });
  const noResultPercent = finite(input.noResultPercent, '検索結果0件率', errors, { max: 100 });
  const indexedRecordCount = finite(input.indexedRecordCount, '索引済み危険物件数', errors, { integer: true });
  const indexedUniqueUnCount = finite(input.indexedUniqueUnCount, '索引済み国連番号件数', errors, { integer: true });
  const blockers = [];
  const warnings = [];
  const criticalChecks = [
    [queryP95Ms >= 2500, 'DBクエリP95が2.5秒以上'],
    [searchP95Ms >= 3000, '検索P95が3秒以上'],
    [failedQueryPercent >= 5, '失敗クエリ率が5%以上'],
    [connectionUsePercent >= 95, 'DB接続使用率が95%以上'],
    [indexBloatPercent >= 45, 'インデックス膨張率が45%以上'],
    [noResultPercent >= 25, '検索結果0件率が25%以上'],
    [indexedRecordCount !== 2725, '危険物索引件数が2,725件と一致しない'],
    [indexedUniqueUnCount !== 2248, '国連番号索引件数が2,248件と一致しない']
  ];
  const warningChecks = [
    [queryP95Ms >= 1000, 'DBクエリP95が1秒以上'],
    [searchP95Ms >= 1500, '検索P95が1.5秒以上'],
    [failedQueryPercent >= 1, '失敗クエリ率が1%以上'],
    [cacheHitPercent < 95, 'キャッシュヒット率が95%未満'],
    [connectionUsePercent >= 80, 'DB接続使用率が80%以上'],
    [indexBloatPercent >= 20, 'インデックス膨張率が20%以上'],
    [noResultPercent >= 10, '検索結果0件率が10%以上']
  ];
  criticalChecks.forEach(([hit, message]) => { if (hit) blockers.push(message); });
  warningChecks.forEach(([hit, message]) => { if (hit && !blockers.includes(message)) warnings.push(message); });
  return { valid: errors.length === 0, errors, status: blockers.length ? 'critical' : warnings.length ? 'warning' : 'healthy', blockers, warnings };
}

export function evaluateAttachmentIntegritySnapshot(input = {}, now = new Date()) {
  const errors = [];
  validateCommonSnapshot(input, now, errors);
  const totalFiles = finite(input.totalFiles, '総ファイル数', errors, { integer: true });
  const linkedFiles = finite(input.linkedFiles, '参照済みファイル数', errors, { integer: true });
  const orphanedFiles = finite(input.orphanedFiles, '孤立ファイル数', errors, { integer: true });
  const missingFiles = finite(input.missingFiles, '欠落ファイル数', errors, { integer: true });
  const hashMismatchFiles = finite(input.hashMismatchFiles, 'ハッシュ不一致件数', errors, { integer: true });
  const malwarePendingFiles = finite(input.malwarePendingFiles, 'スキャン待ち件数', errors, { integer: true });
  const malwareFailedFiles = finite(input.malwareFailedFiles, 'スキャン不合格件数', errors, { integer: true });
  const metadataMismatchFiles = finite(input.metadataMismatchFiles, 'メタデータ不一致件数', errors, { integer: true });
  const quarantinedFiles = finite(input.quarantinedFiles, '隔離件数', errors, { integer: true });
  const counted = linkedFiles + orphanedFiles + missingFiles;
  if (counted > totalFiles) errors.push('参照済み・孤立・欠落ファイル数の合計が総ファイル数を超えています。');
  const blockers = [];
  const warnings = [];
  if (missingFiles > 0) blockers.push(`欠落ファイル ${missingFiles}件`);
  if (hashMismatchFiles > 0) blockers.push(`ハッシュ不一致 ${hashMismatchFiles}件`);
  if (malwareFailedFiles > 0) blockers.push(`マルウェアスキャン不合格 ${malwareFailedFiles}件`);
  if (quarantinedFiles > 0) blockers.push(`隔離中ファイル ${quarantinedFiles}件`);
  if (orphanedFiles > 0) warnings.push(`孤立ファイル ${orphanedFiles}件`);
  if (malwarePendingFiles > 0) warnings.push(`スキャン待ち ${malwarePendingFiles}件`);
  if (metadataMismatchFiles > 0) warnings.push(`メタデータ不一致 ${metadataMismatchFiles}件`);
  return { valid: errors.length === 0, errors, status: blockers.length ? 'critical' : warnings.length ? 'warning' : 'healthy', blockers, warnings };
}

export function evaluateCrossDataIntegritySnapshot(input = {}, now = new Date()) {
  const errors = [];
  validateCommonSnapshot(input, now, errors);
  const fields = [
    ['applicationCount', '申請件数'],
    ['duplicateApplicationNumberCount', '申請番号重複件数'],
    ['invalidCaseSchemaCount', '共通案件情報スキーマ不一致件数'],
    ['missingCommonCaseCount', '共通案件情報欠落件数'],
    ['ctuLinkMismatchCount', '固縛力算出連携不一致件数'],
    ['documentLinkBrokenCount', '添付資料参照切れ件数'],
    ['photoLinkBrokenCount', '写真参照切れ件数'],
    ['revisionGapCount', '訂正履歴欠番件数'],
    ['officeScopeMismatchCount', '事業所範囲不一致件数'],
    ['danglingUserReferenceCount', '利用者参照切れ件数']
  ];
  const values = Object.fromEntries(fields.map(([key, label]) => [key, finite(input[key], label, errors, { integer: true })]));
  const blockers = [];
  const warnings = [];
  const criticalKeys = ['duplicateApplicationNumberCount', 'invalidCaseSchemaCount', 'ctuLinkMismatchCount', 'documentLinkBrokenCount', 'photoLinkBrokenCount', 'revisionGapCount', 'officeScopeMismatchCount', 'danglingUserReferenceCount'];
  criticalKeys.forEach(key => { if (values[key] > 0) blockers.push(`${fields.find(([field]) => field === key)[1]} ${values[key]}件`); });
  if (values.missingCommonCaseCount > 0) warnings.push(`共通案件情報欠落 ${values.missingCommonCaseCount}件`);
  return { valid: errors.length === 0, errors, status: blockers.length ? 'critical' : warnings.length ? 'warning' : 'healthy', blockers, warnings };
}

export function calculateIssueDue(detectedAt, severity) {
  const date = asDate(detectedAt);
  const days = issueSlaDays[clean(severity)];
  if (Number.isNaN(date.getTime()) || !days) throw new Error('整合性課題の検知日時または重大度が不正です。');
  return new Date(date.getTime() + days * DAY_MS);
}

export function validateIntegrityIssue(input = {}, now = new Date()) {
  const errors = [];
  if (!['database-search', 'attachment', 'cross-data', 'application-case', 'ctu-link', 'other'].includes(clean(input.sourceType))) errors.push('課題の起点を確認してください。');
  if (!['critical', 'high', 'medium', 'low'].includes(clean(input.severity))) errors.push('重大度を確認してください。');
  if (!clean(input.title)) errors.push('課題名が必要です。');
  const detectedAt = asDate(input.detectedAt);
  if (Number.isNaN(detectedAt.getTime()) || detectedAt > now) errors.push('検知日時を確認してください。');
  if (clean(input.description).length < 10) errors.push('課題内容を10文字以上で入力してください。');
  if (clean(input.remediationPlan).length < 10) errors.push('是正計画を10文字以上で入力してください。');
  if (!clean(input.ownerUserId)) errors.push('責任者が必要です。');
  return { valid: errors.length === 0, errors };
}

export function validateIssueActors(row = {}, actorId, stage) {
  const errors = [];
  if (stage === 'resolve' && same(row.owner_user_id, actorId)) errors.push('責任者本人だけで是正完了を確定できません。別の実施者が記録してください。');
  if (stage === 'verify' && [row.owner_user_id, row.resolved_by].some(value => same(value, actorId))) errors.push('責任者・是正実施者とは別の利用者が検証してください。');
  return { valid: errors.length === 0, errors };
}

export function validateDataReviewActors(row = {}, actorId, stage) {
  const prior = stage === 'review' ? [row.created_by, row.submitted_by] : stage === 'approve' ? [row.created_by, row.submitted_by, row.reviewed_by] : [];
  const errors = [];
  if (prior.some(value => same(value, actorId))) errors.push(stage === 'review' ? '作成・提出者とは別の利用者が確認してください。' : '作成・提出・確認者とは別の利用者が承認してください。');
  return { valid: errors.length === 0, errors };
}

const latestProduction = rows => [...rows].filter(row => clean(row.environment) === 'production').sort((a, b) => asDate(b.measured_at || b.measuredAt) - asDate(a.measured_at || a.measuredAt))[0];
export function evaluateDataAssuranceGate({ databaseSnapshots = [], attachmentSnapshots = [], integritySnapshots = [], issues = [] } = {}, now = new Date()) {
  const blockers = [];
  const snapshotGroups = [
    ['DB・検索性能', latestProduction(databaseSnapshots)],
    ['添付資料・写真', latestProduction(attachmentSnapshots)],
    ['横断データ整合性', latestProduction(integritySnapshots)]
  ];
  snapshotGroups.forEach(([label, snapshot]) => {
    if (!snapshot) return blockers.push(`${label}の本番測定がありません。`);
    const measuredAt = asDate(snapshot.measured_at || snapshot.measuredAt);
    if (Number.isNaN(measuredAt.getTime()) || measuredAt < new Date(now.getTime() - 24 * 60 * 60 * 1000)) blockers.push(`${label}の本番測定が24時間以上前です。`);
    if (clean(snapshot.status) === 'critical') blockers.push(`${label}が重大状態です。`);
  });
  issues.forEach(issue => {
    if (['verified', 'closed', 'cancelled'].includes(clean(issue.status))) return;
    if (severityRanks[clean(issue.severity)] >= severityRanks.high) blockers.push(`未解決の${issue.severity}課題: ${issue.title || issue.id}`);
    else if (issue.due_at && asDate(issue.due_at) < now) blockers.push(`期限超過の整合性課題: ${issue.title || issue.id}`);
  });
  return { allowed: blockers.length === 0, blockers };
}
