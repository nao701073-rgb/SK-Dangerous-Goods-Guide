import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
const exists=rel=>fs.existsSync(path.join(root,rel));
const checks=[];
function check(name,fn){try{fn();checks.push({name,status:'passed'});console.log('PASS',name);}catch(error){checks.push({name,status:'failed',error:error.message});console.error('FAIL',name,error.message);}}

check('Part 537 version files',()=>{
  const version=JSON.parse(read('VERSION.json'));
  const config=JSON.parse(read('data/app-config.json'));
  const pkg=JSON.parse(read('server/package.json'));
  assert.equal(version.version,'part537'); assert.equal(version.part,537);
  assert.equal(config.version,'0.537.0'); assert.equal(config.build,'part537-production-integration-acceptance');
  assert.equal(pkg.version,'0.537.0');
});
check('Home has one unified intake entry',()=>{
  const home=read('index.html');
  assert.ok(home.includes('申請書取込・確認'));
  assert.ok(home.includes('pages/application-intake-workflow.html'));
  assert.ok(!home.includes('<h3 id="applicationVerificationTitle">申請書確認</h3>'));
  assert.ok(!home.includes('href="pages/application-verification.html"'));
});
check('Unified intake retains verification and registration modes',()=>{
  const html=read('pages/application-intake-workflow.html');
  const js=read('assets/js/application-intake-workflow.js');
  assert.ok(html.includes('guest,office-user,office-admin'));
  assert.ok(html.includes('assets/js/role-access.js?v=537'));
  assert.ok(html.includes('data-write-only id="intakeRegisterNew"'));
  assert.ok(js.includes("canWriteApplications"));
  assert.ok(js.includes("document.querySelectorAll('[data-write-only]')"));
  assert.ok(js.includes("$('intakeRegisterSection').hidden=false"));
});
check('Guest navigation uses unified intake',()=>{
  const role=read('assets/js/role-access.js');
  const dash=read('assets/js/role-home-dashboard.js');
  assert.ok(role.includes('application-intake-workflow'));
  assert.ok(role.includes('ゲストは危険物検索、申請書取込・確認'));
  assert.ok(dash.includes('pages/application-intake-workflow.html'));
});
check('Integrated verification uses current report',()=>{
  const html=read('pages/integrated-verification.html');
  const js=read('assets/js/integrated-verification.js');
  assert.ok(html.includes('本番環境統合試験'));
  assert.ok(html.includes('npm run verify:part537'));
  assert.ok(js.includes('part537_本番環境統合試験レポート.json'));
});
check('All HTML build metadata is Part 537',()=>{
  const files=[];
  for(const dir of ['', 'pages']){
    const base=path.join(root,dir);
    for(const name of fs.readdirSync(base)) if(name.endsWith('.html')) files.push(path.join(base,name));
  }
  const bad=[];
  for(const file of files){const text=fs.readFileSync(file,'utf8'); if(!/<meta[^>]+(?:name=\"sk-build\"[^>]+content=\"part537\"|content=\"part537\"[^>]+name=\"sk-build\")/.test(text)) bad.push(path.relative(root,file));}
  assert.deepEqual(bad,[]);
});
check('Build and version guard references are current',()=>{
  const bad=[];
  for(const dir of ['', 'pages']){
    const base=path.join(root,dir);
    for(const name of fs.readdirSync(base)) if(name.endsWith('.html')){
      const text=fs.readFileSync(path.join(base,name),'utf8');
      if(text.includes('build-manifest.js?v=536')||text.includes('version-guard.js?v=536')||text.includes('version-guard.css?v=536'))bad.push(path.join(dir,name));
    }
  }
  assert.deepEqual(bad,[]);
});
check('Required integration assets exist',()=>{
  ['pages/applications.html','pages/application-intake-workflow.html','pages/ctu-securing-calculator.html','pages/integrated-verification.html','assets/js/application-case-common.js','assets/js/application-intake-workflow.js','assets/js/application-allowance-resolver.js'].forEach(rel=>assert.ok(exists(rel),rel));
});

const failed=checks.filter(x=>x.status==='failed');
const report={release:'part537',generatedAt:new Date().toISOString(),status:failed.length?'failed':'passed',passed:checks.length-failed.length,total:checks.length,checks};
fs.mkdirSync(path.join(root,'docs'),{recursive:true});
fs.writeFileSync(path.join(root,'docs/part537_静的統合検証レポート.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
if(failed.length)process.exit(1);
