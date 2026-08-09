const SEVERITY_DEFAULTS = Object.freeze({
  critical:{ackMinutes:15,resolveMinutes:120},
  high:{ackMinutes:30,resolveMinutes:240},
  medium:{ackMinutes:120,resolveMinutes:1440},
  low:{ackMinutes:480,resolveMinutes:4320}
});

export const ALERT_SEVERITIES = Object.freeze(Object.keys(SEVERITY_DEFAULTS));
export const REPORT_PERIODS = Object.freeze(['weekly','monthly','quarterly']);
export const CAPACITY_TYPES = Object.freeze(['database','storage','api','notifications','users','sessions']);

export function calculateAlertDeadlines(severity, detectedAt, overrides={}) {
  const base=SEVERITY_DEFAULTS[severity]||SEVERITY_DEFAULTS.medium;
  const start=new Date(detectedAt);
  if(Number.isNaN(start.getTime())) throw new Error('検知日時が不正です。');
  const ackMinutes=Number(overrides.ackMinutes??base.ackMinutes);
  const resolveMinutes=Number(overrides.resolveMinutes??base.resolveMinutes);
  if(!Number.isFinite(ackMinutes)||ackMinutes<1||!Number.isFinite(resolveMinutes)||resolveMinutes<ackMinutes) throw new Error('応答・復旧期限が不正です。');
  return {ackDueAt:new Date(start.getTime()+ackMinutes*60000),resolveDueAt:new Date(start.getTime()+resolveMinutes*60000)};
}

export function validateShift({startsAt,endsAt,primaryUserId,backupUserId}) {
  const errors=[];
  const start=new Date(startsAt), end=new Date(endsAt);
  if(Number.isNaN(start.getTime())||Number.isNaN(end.getTime())||end<=start) errors.push('当番の開始・終了日時を確認してください。');
  if(!primaryUserId) errors.push('主担当者が必要です。');
  if(primaryUserId&&backupUserId&&primaryUserId===backupUserId) errors.push('主担当者と副担当者は別の利用者にしてください。');
  if(!Number.isNaN(start.getTime())&&!Number.isNaN(end.getTime())&&end-start>14*86400000) errors.push('一つの当番期間は14日以内にしてください。');
  return {valid:errors.length===0,errors};
}

export function validateEscalationSteps(steps=[]) {
  const errors=[];
  if(!Array.isArray(steps)||steps.length<1) errors.push('エスカレーション手順を1段階以上登録してください。');
  let last=-1;
  (Array.isArray(steps)?steps:[]).forEach((step,index)=>{
    const minutes=Number(step.afterMinutes);
    if(!Number.isInteger(minutes)||minutes<0) errors.push(`第${index+1}段階の経過時間が不正です。`);
    if(minutes<=last) errors.push('エスカレーションの経過時間は昇順にしてください。');
    if(!String(step.targetRole||step.targetUserId||'').trim()) errors.push(`第${index+1}段階の通知先がありません。`);
    last=minutes;
  });
  return {valid:errors.length===0,errors};
}

export function deriveAlertState(alert, now=new Date()) {
  const current=now instanceof Date?now:new Date(now);
  const status=String(alert.status||'open');
  const acknowledged=Boolean(alert.acknowledged_at||alert.acknowledgedAt);
  const resolved=['resolved','closed','cancelled'].includes(status);
  const ackDue=new Date(alert.acknowledgement_due_at||alert.ack_due_at||alert.ackDueAt||0);
  const resolveDue=new Date(alert.resolve_due_at||alert.resolveDueAt||0);
  return {
    acknowledged,
    resolved,
    acknowledgementOverdue:!resolved&&!acknowledged&&!Number.isNaN(ackDue.getTime())&&ackDue<current,
    resolutionOverdue:!resolved&&!Number.isNaN(resolveDue.getTime())&&resolveDue<current,
    needsEscalation:!resolved&&((!acknowledged&&ackDue<current)||resolveDue<current)
  };
}

export function calculateSlo({numerator,denominator,targetPercent}) {
  const n=Number(numerator),d=Number(denominator),target=Number(targetPercent);
  if(!Number.isFinite(n)||!Number.isFinite(d)||d<=0||n<0||n>d) throw new Error('SLO測定値が不正です。');
  if(!Number.isFinite(target)||target<=0||target>100) throw new Error('SLO目標値が不正です。');
  const actualPercent=Number(((n/d)*100).toFixed(5));
  const allowedFailures=d*(1-target/100);
  const actualFailures=d-n;
  const errorBudgetRemaining=Number((allowedFailures-actualFailures).toFixed(5));
  return {actualPercent,targetPercent:target,status:actualPercent>=target?'met':'missed',errorBudgetRemaining,errorBudgetConsumedPercent:allowedFailures>0?Number(((actualFailures/allowedFailures)*100).toFixed(2)):(actualFailures?100:0)};
}

export function validateCapacityForecast({currentValue,warningThreshold,criticalThreshold,forecastValue,forecastAt,dueAt}) {
  const errors=[];
  const current=Number(currentValue),warning=Number(warningThreshold),critical=Number(criticalThreshold),forecast=Number(forecastValue);
  if([current,warning,critical,forecast].some(v=>!Number.isFinite(v)||v<0)) errors.push('容量値は0以上の数値で入力してください。');
  if(Number.isFinite(warning)&&Number.isFinite(critical)&&warning>=critical) errors.push('警告しきい値は重大しきい値より小さくしてください。');
  const forecastDate=new Date(forecastAt),dueDate=new Date(dueAt);
  if(Number.isNaN(forecastDate.getTime())) errors.push('予測到達日を入力してください。');
  if(!Number.isNaN(forecastDate.getTime())&&!Number.isNaN(dueDate.getTime())&&dueDate>forecastDate) errors.push('対策期限は予測到達日以前に設定してください。');
  return {valid:errors.length===0,errors};
}

export function evaluateReportGate({report,alerts=[],measurements=[],forecasts=[],now=new Date()}) {
  const blockers=[];
  const activeAlerts=alerts.filter(a=>!['resolved','closed','cancelled'].includes(String(a.status||'')));
  if(activeAlerts.some(a=>a.severity==='critical')) blockers.push('未解決の重大アラートがあります。');
  if(activeAlerts.some(a=>deriveAlertState(a,now).resolutionOverdue)) blockers.push('復旧期限を超過したアラートがあります。');
  if(!measurements.length) blockers.push('対象期間のSLO測定がありません。');
  if(measurements.some(m=>String(m.status)==='missed'&&Boolean(m.critical))) blockers.push('重要SLOが未達です。');
  if(forecasts.some(f=>String(f.status)!=='completed'&&new Date(f.due_at||f.dueAt||0)<new Date(now))) blockers.push('期限超過の容量対策があります。');
  if(!String(report?.summary||'').trim()||!String(report?.risks||'').trim()||!String(report?.nextActions||report?.next_actions||'').trim()) blockers.push('概要・リスク・次の対応を入力してください。');
  const actors=[report?.createdBy||report?.created_by,report?.reviewedBy||report?.reviewed_by,report?.approvedBy||report?.approved_by].filter(Boolean);
  if(new Set(actors).size!==actors.length) blockers.push('作成者・確認者・承認者は別の利用者にしてください。');
  return {allowed:blockers.length===0,blockers};
}
