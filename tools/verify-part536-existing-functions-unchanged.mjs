import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function functionSource(source,name){
 const match=new RegExp(`function\\s+${name}\\s*\\([^)]*\\)\\s*\\{`).exec(source);assert.ok(match,`missing function ${name}`);
 let index=match.index+match[0].length,depth=1,quote='',escaped=false;
 while(index<source.length&&depth){const char=source[index++];if(quote){if(escaped)escaped=false;else if(char==='\\\\')escaped=true;else if(char===quote)quote='';continue}if(char==='"'||char==="'"||char==='`'){quote=char;continue}if(char==='{')depth++;else if(char==='}')depth--;}
 return source.slice(match.index,index);
}
let passed=0;const checks=[];const check=(name,fn)=>{fn();passed++;checks.push({name,status:'passed'});console.log(`PASS ${name}`)};
const expectedFiles={
 'assets/js/application-intake-workflow-policy.js':'8eb0271fbe4506b6684cb87181470ba8484ae2aabc477c29169fa38c42734c08',
 'server/src/application-intake-workflow-policy.js':'39de94acbb809c23962cbe17ee470ce86560565fdb167019f4dec36a809bb5f4',
 'assets/js/application-case-common.js':'db2efc2c3052ddcdf21a532b9cdfa3bbe668a27ce30c9249d9c3ace0665b2df6',
 'assets/js/storage.js':'177538de1702bac23a0518db3b5729eb0a1f1fb92b5dd547fa6cd9fd79499183'
};
for(const [rel,expected] of Object.entries(expectedFiles))check(`${rel} unchanged from Part535`,()=>assert.equal(hash(fs.readFileSync(path.join(root,rel))),expected));
const ctu=read('pages/ctu-securing-calculator.html');
const expectedFunctions={
 calc:'4c0ea5df730cf02512b889548c667a12a57f60475ebe2ae39c8289fa4136b70b',
 applyTransportPreset:'70d4229171e8f3391b4b4c8e4d6400904a4cbaa0d841de415c4cafbe40183ac7',
 applyWallPreset:'c00f01abe9d956a4e7ed16bad18a5f8bcdb113888d35272a7b4f1daadfc85476',
 updateSummary:'8af84a4bf137f72168dc2b1b3a0f03f4451d93998732ef8b3f773d77c9334d0e',
 syncQuickInputs:'089e2795324c708d62c87c36023a2c3109d5c47ce64bcc374c2e4b1367335751'
};
for(const [name,expected] of Object.entries(expectedFunctions))check(`CTU ${name} unchanged from Part535`,()=>assert.equal(hash(functionSource(ctu,name)),expected));
const intake=read('pages/application-intake-workflow.html');
check('application intake fields unchanged',()=>['intakeApplicationYear','intakeApplicationNumber','intakeApplicationDate','intakeInspectionPlannedDate','intakeApplicantName','intakeShipper','intakeContainerNumber','intakeCargoBody','intakeRunCheck','intakeRegisterNew','intakeUpdateExisting'].forEach(id=>assert.ok(intake.includes(`id="${id}"`),id)));
check('CTU calculation fields unchanged',()=>['mass','mu','payload','quickMass','quickMu','quickCount','quickStrength','quickAngle','calcStandard','transportPreset','ctuPreset'].forEach(id=>assert.ok(ctu.includes(`id="${id}"`),id)));
check('CTU result registration retained',()=>['saveCtuResult','createAndSaveCtuResult','persistCtuCaseInformation'].forEach(term=>assert.ok(ctu.includes(term),term)));
const report={release:'part536',generatedAt:new Date().toISOString(),status:'passed',passed,total:passed,basis:'Part535 file/function SHA-256',checks};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'docs/part536_既存機能・計算ロジック維持検証.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
