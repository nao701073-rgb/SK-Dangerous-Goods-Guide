import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const window={};
const context=vm.createContext({window,console});
for(const rel of [
  'data/un-data.js',
  'data/legal-code-master-codes.js',
  'data/domestic-code-page-ranges.js',
  'data/domestic-packing-quantity-profiles.js',
  'assets/js/application-allowance-resolver.js'
]) vm.runInContext(fs.readFileSync(path.join(root,rel),'utf8'),context,{filename:rel});

const rows=window.UN_DATABASE||[];
const resolver=window.ISSApplicationAllowance;
let passed=0;
const checks=[];
const check=(name,fn)=>{fn();passed++;checks.push({name,status:'passed'});console.log(`PASS ${name}`)};

check('dangerous goods row count',()=>assert.equal(rows.length,2725));
check('unique UN count',()=>assert.equal(new Set(rows.map(r=>r.unNumber)).size,2248));
check('allowance resolver available',()=>assert.equal(typeof resolver?.resolve,'function'));

const allResults=rows.map(record=>({record,result:resolver.resolve(record,{})}));
const usedCodes=[...new Set(rows.flatMap(record=>resolver.pCodes(record.smallPackingInstruction)))].sort();
const missingSources=usedCodes.filter(code=>!resolver.sourceForCode(code).original);
const uncovered=allResults.filter(item=>!item.result.covered);
const noSummary=allResults.filter(item=>!String(item.result.summary||'').trim());
const withP=allResults.filter(item=>resolver.pCodes(item.record.smallPackingInstruction).length>0);
const withoutP=allResults.filter(item=>resolver.pCodes(item.record.smallPackingInstruction).length===0);
const modes=allResults.reduce((acc,item)=>{acc[item.result.mode]=(acc[item.result.mode]||0)+1;return acc},{});

check('all 84 used P codes have exact source text',()=>assert.equal(missingSources.length,0));
check('all 2725 records covered',()=>assert.equal(uncovered.length,0));
check('all results have a readable summary',()=>assert.equal(noSummary.length,0));
check('records with P code',()=>assert.equal(withP.length,2683));
check('records without P code explicitly classified',()=>assert.equal(withoutP.length,42));
check('no-P records use not-applicable mode',()=>assert.equal(withoutP.every(item=>item.result.mode==='not-applicable'),true));
check('structured P001/P002 records covered',()=>assert.equal(modes.structured,1598));
check('P200 records covered',()=>assert.equal(modes.p200,170));
check('other P-code source-reference records covered',()=>assert.equal(modes['source-reference'],915));
check('not-applicable / alternative transport records covered',()=>assert.equal(modes['not-applicable'],42));

const sample=(un,code)=>rows.find(r=>r.unNumber===un&&String(r.smallPackingInstruction||'').includes(code));
check('P001 sample resolves structured',()=>assert.equal(resolver.resolve(sample('1090','P001'),{}).mode,'structured'));
check('P002 sample resolves structured',()=>assert.equal(resolver.resolve(sample('1325','P002'),{}).mode,'structured'));
const p200=rows.find(r=>String(r.smallPackingInstruction||'').includes('P200'));
check('P200 sample resolves original source',()=>{const r=resolver.resolve(p200,{});assert.equal(r.mode,'p200');assert.ok(r.sources[0]?.pageStart)});
const p112=rows.find(r=>String(r.smallPackingInstruction||'').includes('P112'));
check('P112 sample resolves exact original source',()=>{const r=resolver.resolve(p112,{});assert.equal(r.mode,'source-reference');assert.ok(r.sources.some(x=>x.original&&x.pageStart))});
check('source links include PDF page',()=>{const r=resolver.resolve(p112,{});assert.match(resolver.sourceLinks(r)[0].href,/#page=\d+/)});
check('container code extraction',()=>assert.equal(Array.from(resolver.containerCodes('1A1, 4G / 3H1')).join(','),'1A1,4G,3H1'));

const report={
  release:'part536',
  generatedAt:new Date().toISOString(),
  status:'passed',
  passed,total:passed,
  coverage:{
    records:rows.length,
    uniqueUnNumbers:new Set(rows.map(r=>r.unNumber)).size,
    recordsWithSmallPackingInstruction:withP.length,
    recordsWithoutSmallPackingInstruction:withoutP.length,
    usedSmallPackingCodes:usedCodes.length,
    missingOriginalSources:missingSources.length,
    uncoveredRecords:uncovered.length,
    modes
  },
  interpretation:{
    structured:'P001/P002は構造化表で容器コード・容器等級に応じて照合',
    p200:'P200は原文・容器種類・充てん条件・許可内容を照合',
    sourceReference:'その他のPコードは危告示の正確な原文ページへ接続し、申請容器の該当行で確定',
    notApplicable:'小型容器包装要件がないものは、タンク・IBC・大型容器・放射性輸送物等の個別条件へ明示的に誘導'
  },
  checks
};
if(process.argv.includes('--write')){
  const target=path.join(root,'docs/part536_全危険物許容容量・許容質量カバレッジ.json');
  fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
  console.log(`WROTE ${target}`);
}
console.log(JSON.stringify(report,null,2));
