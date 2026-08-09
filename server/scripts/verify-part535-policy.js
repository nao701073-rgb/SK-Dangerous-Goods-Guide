import assert from 'node:assert/strict';
import { evaluateIntakeRecord, validateIntakeActors, intakeSnapshotSha, safeFileLabel } from '../src/application-intake-workflow-policy.js';
await import('../../assets/js/application-intake-workflow-policy.js');
const browser=globalThis.ISSApplicationIntakePolicy;
let passed=0;const check=(name,fn)=>{fn();passed++;console.log(`PASS ${name}`)};
check('safe xlsx label',()=>assert.equal(safeFileLabel('C:/secret/申請者名.xlsx'),'application.xlsx'));
check('unsafe extension hidden',()=>assert.equal(safeFileLabel('secret.pdf'),'application-data'));
const ready={sourceFormat:'xlsx',sourceSha256:'a'.repeat(64),originalFileStored:false,cargoCount:2,blockerCount:0,warningCount:0,validationStatus:'ready'};
check('ready allowed',()=>assert.equal(evaluateIntakeRecord(ready).allowed,true));
check('raw file blocked',()=>assert.equal(evaluateIntakeRecord({...ready,originalFileStored:true}).allowed,false));
check('bad hash blocked',()=>assert.equal(evaluateIntakeRecord({...ready,sourceSha256:'x'}).allowed,false));
check('bad format blocked',()=>assert.equal(evaluateIntakeRecord({...ready,sourceFormat:'pdf'}).allowed,false));
check('zero cargo blocked',()=>assert.equal(evaluateIntakeRecord({...ready,cargoCount:0}).allowed,false));
check('blocker count blocks',()=>assert.equal(evaluateIntakeRecord({...ready,blockerCount:1}).allowed,false));
check('warning status review',()=>assert.equal(evaluateIntakeRecord({...ready,warningCount:2}).status,'review'));
check('actor review separation',()=>assert.equal(validateIntakeActors({created_by:'u1'},'u1','review').valid,false));
check('actor register separation',()=>assert.equal(validateIntakeActors({reviewed_by:'u2'},'u2','register').valid,false));
check('snapshot deterministic',()=>assert.equal(intakeSnapshotSha({b:2}),intakeSnapshotSha({b:2})));
check('UN cleanup',()=>assert.equal(browser.cleanUn('UN 1077'),'1077'));
check('packing group normalization',()=>assert.equal(browser.normalizePg('容器等級 Ⅱ'),'II'));
const q=browser.parseQuantitySummary('個数 16個\n1容器当たり正味質量 18 kg\n1容器当たり総質量 73 kg\n申請総正味質量(N/W) 288 kg\n申請総質量(G/W) 1,168 kg');
check('quantity count',()=>assert.equal(q.packageCount,16));
check('quantity per net',()=>assert.equal(q.netMassPerPackageKg,18));
check('quantity per gross',()=>assert.equal(q.grossMassPerPackageKg,73));
check('quantity total net',()=>assert.equal(q.totalNetMassKg,288));
check('quantity total gross',()=>assert.equal(q.totalGrossMassKg,1168));
const allowance=browser.parseAllowance('危告示別表第1 P200\n地方運輸局長の許可が必要です。');
check('P200 extracted',()=>assert.equal(allowance.packingInstruction,'P200'));
check('permission detected',()=>assert.equal(allowance.permissionRequired,true));
const rows=[
 {sheet:'申請',row:1,cells:['申請年度','2026','申請番号','0001']},
 {sheet:'申請',row:2,cells:['船名','TEST VESSEL','コンテナ番号','ABCD1234567']},
 {sheet:'申請',row:5,cells:['国連番号','品名・原文','等級','容器コード','申請数量','許容容量・許容質量']},
 {sheet:'申請',row:6,cells:['UN1077','プロピレン / PROPYLENE','2.1','継目なし容器','個数 16個\n1容器当たり正味質量 18 kg\n1容器当たり総質量 73 kg\n申請総正味質量(N/W) 288 kg\n申請総質量(G/W) 1,168 kg','危告示別表第1 P200\n溶接容器:1,000 L\n継目なし容器:3,000 L']},
 {sheet:'申請',row:7,cells:['UN1953','DIBORANE & NITROGEN MIXTURE','2.3','継目なし容器','個数 20個\n申請総正味質量(N/W) 88 kg\n申請総質量(G/W) 1,188 kg','危告示別表第1 P200\n地方運輸局長の許可が必要です。']}
];
const extracted=browser.extractCase(rows,{name:'個人名を含む申請.xlsx',size:123,sha256:'b'.repeat(64)});
check('source filename not persisted',()=>assert.equal('sourceFileName' in extracted,false));
check('source label masked',()=>assert.equal(extracted.sourceLabel,'申請データ（.xlsx）'));
check('two cargo rows',()=>assert.equal(extracted.cargoItems.length,2));
check('first UN',()=>assert.equal(extracted.cargoItems[0].unNumber,'1077'));
check('first gross',()=>assert.equal(extracted.cargoItems[0].totalGrossMassKg,1168));
check('second permit',()=>assert.equal(extracted.cargoItems[1].permissionRequired,true));
const ev=browser.evaluateCase({...extracted,loadingPort:'Kawasaki',dischargePort:'Yokohama'},{existingApplications:[],unDatabase:[{unNumber:'1077'},{unNumber:'1953'}]});
check('evaluation valid',()=>assert.equal(ev.valid,true));
check('two cargo summary',()=>assert.equal(ev.summary.cargoCount,2));
check('calculation mass aggregate',()=>assert.equal(ev.summary.totalCalculationMassKg,2356));
check('CTU ready',()=>assert.equal(ev.summary.ctuReady,true));
const checklist=browser.buildChecklist(extracted,ev);
check('checklist includes permit',()=>assert.equal(checklist.some(x=>x.code==='permit'),true));
const payload=browser.toApplicationPayload(extracted);
check('payload cargo retained',()=>assert.equal(payload.cargoItems.length,2));
check('payload original file false',()=>assert.equal(payload.caseData.intake.originalFileStored,false));
check('payload no raw filename',()=>assert.equal('sourceFileName' in payload.caseData.intake,false));
console.log(JSON.stringify({status:'passed',passed,total:passed},null,2));
