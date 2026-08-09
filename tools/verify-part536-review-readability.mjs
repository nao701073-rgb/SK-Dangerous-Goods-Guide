import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=rel=>fs.readFileSync(path.join(root,rel),'utf8');
let passed=0;const checks=[];const check=(name,fn)=>{fn();passed++;checks.push({name,status:'passed'});console.log(`PASS ${name}`)};
const required=[
 'assets/css/application-review-part536.css','assets/js/application-allowance-resolver.js',
 'pages/application-intake-workflow.html','pages/application-verification.html','pages/applications.html','pages/ctu-securing-calculator.html'
];
for(const rel of required)check(`exists ${rel}`,()=>assert.equal(fs.existsSync(path.join(root,rel)),true));
const home=read('index.html'),submenu=read('assets/js/unified-submenu.js'),intake=read('pages/application-intake-workflow.html'),verification=read('pages/application-verification.html'),appsPage=read('pages/applications.html'),appsJs=read('assets/js/applications.js'),resultsJs=read('assets/js/application-results-view.js'),ctu=read('pages/ctu-securing-calculator.html'),css=read('assets/css/application-review-part536.css'),resolver=read('assets/js/application-allowance-resolver.js');
check('home has single combined application entry',()=>{assert.ok(home.includes('申請書取込・確認'));assert.ok(!home.includes('href="pages/application-verification.html"'))});
check('submenu has combined entry',()=>assert.ok(submenu.includes('label:"申請書取込・確認"')));
check('submenu does not expose duplicate verification entry',()=>assert.ok(!submenu.includes('key:"application-verification"')));
check('intake title combined',()=>assert.match(intake,/<h1>申請書取込・確認<\/h1>/));
check('detailed allowance verification retained',()=>assert.ok(intake.includes('許容容量・許容質量の詳細確認へ')));
check('verification cards present',()=>assert.ok(verification.includes('verificationGoodsCards')));
check('verification compatibility table visually hidden',()=>assert.ok(verification.includes('part536-compat-table')));
check('applications review cards',()=>assert.ok(appsJs.includes('case-cargo-review-card')));
check('saved verification review cards',()=>assert.ok(resultsJs.includes('linked-result-cargo-card')));
check('CTU registered case review cards',()=>assert.ok(ctu.includes('ctu-case-review-card')));
check('CTU calculation inputs retained',()=>['mass','mu','payload','quickMass','quickMu','quickCount','quickStrength','quickAngle','calcStandard','transportPreset','ctuPreset'].forEach(id=>assert.ok(ctu.includes(`id="${id}"`),id)));
check('CTU calculation function retained',()=>{assert.ok(ctu.includes('function calc()'));assert.ok(ctu.includes('saveCtuResult'));assert.ok(ctu.includes('createAndSaveCtuResult'))});
check('card layouts remove horizontal scroll',()=>{assert.ok(css.includes('overflow:visible!important'));assert.ok(css.includes('grid-template-columns:1fr'))});
check('mobile breakpoint',()=>assert.ok(css.includes('@media(max-width:620px)')));
check('public screen colors retained',()=>{assert.ok(css.includes('--review-navy:#0b3a67'));assert.ok(css.includes('--review-blue:#0b6db7'))});
check('all-allowance resolver linked',()=>{assert.ok(verification.includes('application-allowance-resolver.js'));assert.ok(resolver.includes('source-reference'));assert.ok(resolver.includes('not-applicable'))});
check('registered application shows allowance',()=>assert.ok(appsJs.includes('許容容量・許容質量')));
check('CTU review shows allowance without changing calculation',()=>assert.ok(ctu.includes('<h5>許容容量・許容質量</h5>')));
check('intake fields remain available',()=>['intakeApplicationYear','intakeApplicationNumber','intakeCargoBody','intakeRegisterNew','intakeUpdateExisting','intakeOpenCtu'].forEach(id=>assert.ok(intake.includes(`id="${id}"`),id)));
check('all pages use review CSS',()=>[intake,verification,appsPage,ctu].forEach(s=>assert.ok(s.includes('application-review-part536.css'))));
const report={release:'part536',generatedAt:new Date().toISOString(),status:'passed',passed,total:passed,scope:'登録後の再確認画面の可読性。申請書取込・確認および固縛力参考算出の既存機能・入力項目を維持。',checks};
if(process.argv.includes('--write'))fs.writeFileSync(path.join(root,'docs/part536_再確認画面・機能維持静的検証.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
