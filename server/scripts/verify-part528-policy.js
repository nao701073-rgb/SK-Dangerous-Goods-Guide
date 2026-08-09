import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {calculateAlertDeadlines,validateShift,validateEscalationSteps,deriveAlertState,calculateSlo,validateCapacityForecast,evaluateReportGate} from '../src/operations-command-center-policy.js';
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'../..');
const results=[];
const test=(name,fn)=>{try{fn();results.push({name,status:'passed'});}catch(error){results.push({name,status:'failed',error:error.message});}};
const now=new Date('2026-08-06T10:00:00Z');

test('重大アラート既定応答15分',()=>assert.equal(calculateAlertDeadlines('critical',now).ackDueAt.toISOString(),'2026-08-06T10:15:00.000Z'));
test('重大アラート既定復旧120分',()=>assert.equal(calculateAlertDeadlines('critical',now).resolveDueAt.toISOString(),'2026-08-06T12:00:00.000Z'));
test('高アラート既定応答30分',()=>assert.equal(calculateAlertDeadlines('high',now).ackDueAt.toISOString(),'2026-08-06T10:30:00.000Z'));
test('中アラート既定復旧24時間',()=>assert.equal(calculateAlertDeadlines('medium',now).resolveDueAt.toISOString(),'2026-08-07T10:00:00.000Z'));
test('方針上書き',()=>assert.equal(calculateAlertDeadlines('low',now,{ackMinutes:10,resolveMinutes:20}).resolveDueAt.toISOString(),'2026-08-06T10:20:00.000Z'));
test('不正日時拒否',()=>assert.throws(()=>calculateAlertDeadlines('high','x')));
test('復旧期限が応答以前を拒否',()=>assert.throws(()=>calculateAlertDeadlines('high',now,{ackMinutes:30,resolveMinutes:20})));

test('正常当番',()=>assert.equal(validateShift({startsAt:now,endsAt:new Date(now.getTime()+3600000),primaryUserId:'a',backupUserId:'b'}).valid,true));
test('開始終了逆転拒否',()=>assert.equal(validateShift({startsAt:now,endsAt:new Date(now.getTime()-1),primaryUserId:'a'}).valid,false));
test('主副同一拒否',()=>assert.equal(validateShift({startsAt:now,endsAt:new Date(now.getTime()+1),primaryUserId:'a',backupUserId:'a'}).valid,false));
test('主担当なし拒否',()=>assert.equal(validateShift({startsAt:now,endsAt:new Date(now.getTime()+1)}).valid,false));
test('14日超拒否',()=>assert.equal(validateShift({startsAt:now,endsAt:new Date(now.getTime()+15*86400000),primaryUserId:'a'}).valid,false));

test('正常エスカレーション',()=>assert.equal(validateEscalationSteps([{afterMinutes:0,targetRole:'admin'},{afterMinutes:15,targetRole:'director'}]).valid,true));
test('段階なし拒否',()=>assert.equal(validateEscalationSteps([]).valid,false));
test('時刻降順拒否',()=>assert.equal(validateEscalationSteps([{afterMinutes:15,targetRole:'a'},{afterMinutes:10,targetRole:'b'}]).valid,false));
test('通知先なし拒否',()=>assert.equal(validateEscalationSteps([{afterMinutes:0}]).valid,false));

test('未応答期限超過',()=>assert.equal(deriveAlertState({status:'open',acknowledgement_due_at:'2026-08-06T09:59:00Z',resolution_due_at:'2026-08-06T11:00:00Z'},now).acknowledgementOverdue,true));
test('応答済みは応答超過なし',()=>assert.equal(deriveAlertState({status:'acknowledged',acknowledged_at:'2026-08-06T09:00:00Z',acknowledgement_due_at:'2026-08-06T09:59:00Z',resolution_due_at:'2026-08-06T11:00:00Z'},now).acknowledgementOverdue,false));
test('復旧期限超過',()=>assert.equal(deriveAlertState({status:'investigating',acknowledged_at:'2026-08-06T09:00:00Z',resolution_due_at:'2026-08-06T09:59:00Z'},now).resolutionOverdue,true));
test('復旧済みは超過なし',()=>assert.equal(deriveAlertState({status:'resolved',resolution_due_at:'2026-08-06T09:59:00Z'},now).resolutionOverdue,false));

test('SLO達成',()=>assert.equal(calculateSlo({numerator:999,denominator:1000,targetPercent:99.9}).status,'met'));
test('SLO未達',()=>assert.equal(calculateSlo({numerator:998,denominator:1000,targetPercent:99.9}).status,'missed'));
test('SLO百分率',()=>assert.equal(calculateSlo({numerator:9,denominator:10,targetPercent:80}).actualPercent,90));
test('SLO分母ゼロ拒否',()=>assert.throws(()=>calculateSlo({numerator:0,denominator:0,targetPercent:99})));
test('SLO成功数超過拒否',()=>assert.throws(()=>calculateSlo({numerator:11,denominator:10,targetPercent:99})));
test('SLO目標100超拒否',()=>assert.throws(()=>calculateSlo({numerator:10,denominator:10,targetPercent:101})));

test('正常容量予測',()=>assert.equal(validateCapacityForecast({currentValue:10,warningThreshold:70,criticalThreshold:90,forecastValue:80,forecastAt:'2026-10-01',dueAt:'2026-09-01'}).valid,true));
test('しきい値逆転拒否',()=>assert.equal(validateCapacityForecast({currentValue:10,warningThreshold:90,criticalThreshold:70,forecastValue:80,forecastAt:'2026-10-01',dueAt:'2026-09-01'}).valid,false));
test('対策期限後ろ拒否',()=>assert.equal(validateCapacityForecast({currentValue:10,warningThreshold:70,criticalThreshold:90,forecastValue:80,forecastAt:'2026-10-01',dueAt:'2026-11-01'}).valid,false));
test('負数拒否',()=>assert.equal(validateCapacityForecast({currentValue:-1,warningThreshold:70,criticalThreshold:90,forecastValue:80,forecastAt:'2026-10-01',dueAt:'2026-09-01'}).valid,false));

const baseReport={summary:'十分な運用概要です',risks:'リスクなし',nextActions:'次の対応',createdBy:'a',reviewedBy:'b',approvedBy:'c'};
test('正常報告承認',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[{status:'met',critical:true}],forecasts:[],now}).allowed,true));
test('重大アラート遮断',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[{status:'open',severity:'critical',resolution_due_at:'2026-08-07T00:00:00Z'}],measurements:[{status:'met'}],forecasts:[],now}).allowed,false));
test('復旧期限超過遮断',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[{status:'investigating',severity:'medium',resolution_due_at:'2026-08-06T09:00:00Z'}],measurements:[{status:'met'}],forecasts:[],now}).allowed,false));
test('測定なし遮断',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[],forecasts:[],now}).allowed,false));
test('重要SLO未達遮断',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[{status:'missed',critical:true}],forecasts:[],now}).allowed,false));
test('通常SLO未達は直接遮断しない',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[{status:'missed',critical:false}],forecasts:[],now}).allowed,true));
test('容量期限超過遮断',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[{status:'met'}],forecasts:[{status:'planned',due_at:'2026-08-01'}],now}).allowed,false));
test('完了容量は遮断しない',()=>assert.equal(evaluateReportGate({report:baseReport,alerts:[],measurements:[{status:'met'}],forecasts:[{status:'completed',due_at:'2026-08-01'}],now}).allowed,true));
test('概要不足遮断',()=>assert.equal(evaluateReportGate({report:{...baseReport,summary:''},alerts:[],measurements:[{status:'met'}],forecasts:[],now}).allowed,false));
test('作成確認同一遮断',()=>assert.equal(evaluateReportGate({report:{...baseReport,reviewedBy:'a'},alerts:[],measurements:[{status:'met'}],forecasts:[],now}).allowed,false));
test('確認承認同一遮断',()=>assert.equal(evaluateReportGate({report:{...baseReport,approvedBy:'b'},alerts:[],measurements:[{status:'met'}],forecasts:[],now}).allowed,false));

const failed=results.filter(x=>x.status==='failed');
const report={release:'part528',phases:[19,20,21],title:'運用指令・サービス水準・運用報告ポリシー単体検証',generatedAt:new Date().toISOString(),checks:{total:results.length,passed:results.length-failed.length,failed:failed.length},results,status:failed.length?'failed':'passed'};
fs.writeFileSync(path.join(root,'docs/part528_第19-21段階ポリシー単体検証レポート.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));process.exit(failed.length?1:0);
