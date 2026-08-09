import assert from 'node:assert/strict';
import {
  calculateRetentionDue, calculateVulnerabilityDue, validateRetentionPolicy, validateDisposalActors,
  validateEvidenceMetadata, validateVulnerability, validateVulnerabilityClosure, validateAuditActors, evaluateAssuranceGate
} from '../src/assurance-security-audit-policy.js';

const tests=[]; const test=(name,fn)=>tests.push({name,fn});
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

test('保存期限を日数で計算',()=>assert.equal(calculateRetentionDue('2026-01-01T00:00:00Z',30).toISOString(),'2026-01-31T00:00:00.000Z'));
test('保存期間30日未満を拒否',()=>assert.equal(validateRetentionPolicy({recordType:'audit',retentionDays:29,disposition:'archive-then-dispose',ownerRole:'admin'}).valid,false));
test('保存ポリシー正常',()=>assert.equal(validateRetentionPolicy({recordType:'audit',retentionDays:365,disposition:'archive-then-dispose',ownerRole:'admin'}).valid,true));
test('法的保全中の廃棄拒否',()=>assert.equal(validateDisposalActors({legal_hold:true,created_by:id(1)},id(2),'review').valid,false));
test('廃棄確認者の分離',()=>assert.equal(validateDisposalActors({created_by:id(1)},id(1),'review').valid,false));
test('廃棄実行者の分離',()=>assert.equal(validateDisposalActors({created_by:id(1),reviewed_by:id(2)},id(2),'execute').valid,false));
test('廃棄検証者の分離',()=>assert.equal(validateDisposalActors({created_by:id(1),reviewed_by:id(2),executed_by:id(3)},id(3),'verify').valid,false));
test('廃棄分離正常',()=>assert.equal(validateDisposalActors({created_by:id(1),reviewed_by:id(2),executed_by:id(3)},id(4),'verify').valid,true));
test('重大脆弱性は1日',()=>assert.equal(calculateVulnerabilityDue('2026-01-01T00:00:00Z','critical').toISOString(),'2026-01-02T00:00:00.000Z'));
test('高脆弱性は7日',()=>assert.equal(calculateVulnerabilityDue('2026-01-01T00:00:00Z','high').toISOString(),'2026-01-08T00:00:00.000Z'));
test('未来の脆弱性検知を拒否',()=>assert.equal(validateVulnerability({assetName:'API',title:'test',severity:'high',detectedAt:'2030-01-01'},new Date('2026-01-01')).valid,false));
test('CVSS範囲外を拒否',()=>assert.equal(validateVulnerability({assetName:'API',title:'test',severity:'high',detectedAt:'2025-01-01',cvss:11},new Date('2026-01-01')).valid,false));
test('脆弱性正常',()=>assert.equal(validateVulnerability({assetName:'API',title:'test',severity:'high',detectedAt:'2025-01-01',cvss:8.2},new Date('2026-01-01')).valid,true));
test('証跡メールアドレス拒否',()=>assert.equal(validateEvidenceMetadata({title:'x a@example.com',classification:'internal',sha256:'a'.repeat(64),storageReference:'REF-1'}).valid,false));
test('証跡秘密情報拒否',()=>assert.equal(validateEvidenceMetadata({title:'x',classification:'internal',sha256:'a'.repeat(64),storageReference:'password=abc'}).valid,false));
test('証跡SHA不正拒否',()=>assert.equal(validateEvidenceMetadata({title:'x',classification:'internal',sha256:'x',storageReference:'REF-1'}).valid,false));
test('証跡正常',()=>assert.equal(validateEvidenceMetadata({title:'x',classification:'internal',sha256:'a'.repeat(64),storageReference:'REF-1'}).valid,true));
test('脆弱性対応者と確認者を分離',()=>assert.equal(validateVulnerabilityClosure({status:'mitigated',owner_user_id:id(1),mitigated_by:id(2),resolution_note:'fixed',evidence_sha256:'a'.repeat(64)},id(2)).valid,false));
test('リスク受容期限不足を拒否',()=>assert.equal(validateVulnerabilityClosure({status:'accepted',owner_user_id:id(1),mitigated_by:id(2),resolution_note:'accepted',evidence_sha256:'a'.repeat(64),risk_acceptance_reason:'reason'},id(3),new Date('2026-01-01')).valid,false));
test('脆弱性終了承認正常',()=>assert.equal(validateVulnerabilityClosure({status:'mitigated',owner_user_id:id(1),mitigated_by:id(2),resolution_note:'fixed',evidence_sha256:'a'.repeat(64)},id(3)).valid,true));
test('監査確認者の分離',()=>assert.equal(validateAuditActors({created_by:id(1),submitted_by:id(1)},id(1),'review').valid,false));
test('監査承認者の分離',()=>assert.equal(validateAuditActors({created_by:id(1),submitted_by:id(1),reviewed_by:id(2)},id(2),'approve').valid,false));
test('監査承認分離正常',()=>assert.equal(validateAuditActors({created_by:id(1),submitted_by:id(1),reviewed_by:id(2)},id(3),'approve').valid,true));
test('法的保全は保証ゲート遮断',()=>assert.equal(evaluateAssuranceGate({disposals:[{id:'d1',legal_hold:true,status:'draft'}]},new Date('2026-01-01')).allowed,false));
test('期限超過重大脆弱性は遮断',()=>assert.equal(evaluateAssuranceGate({vulnerabilities:[{id:'v1',title:'v',severity:'critical',status:'open',due_at:'2025-12-31'}]},new Date('2026-01-01')).allowed,false));
test('未解決高監査指摘は遮断',()=>assert.equal(evaluateAssuranceGate({findings:[{id:'f1',title:'f',severity:'high',status:'open',due_at:'2026-02-01'}]},new Date('2026-01-01')).allowed,false));
test('完了済みは許可',()=>assert.equal(evaluateAssuranceGate({disposals:[{status:'verified'}],vulnerabilities:[{status:'closed',severity:'critical'}],audits:[{status:'approved'}],findings:[{status:'verified',severity:'high'}]},new Date('2026-01-01')).allowed,true));

let passed=0; const results=[];
for(const t of tests){try{await t.fn();passed++;results.push({name:t.name,status:'passed'});}catch(error){results.push({name:t.name,status:'failed',error:error.message});}}
const report={release:'part530',suite:'第22～第24段階ポリシー単体検証',generatedAt:new Date().toISOString(),passed,total:tests.length,failed:tests.length-passed,results};
console.log(JSON.stringify(report,null,2));
if(passed!==tests.length)process.exitCode=1;
