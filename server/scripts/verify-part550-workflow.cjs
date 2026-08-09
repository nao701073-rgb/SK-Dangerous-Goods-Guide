const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const checks=[];function check(name,ok,detail=''){checks.push({name,status:ok?'passed':'failed',detail});if(!ok)console.error('FAIL',name,detail)}
const ctu=read('pages/ctu-securing-calculator.html');
const detail=read('assets/js/application-detail-part550.js');
const wf=read('assets/js/ctu-workflow-part550.js');
check('registered result recalculation link',detail.includes('この条件で再計算')&&detail.includes('resultKey='));
check('latest result badge',detail.includes('ctu-latest-badge')&&detail.includes('最新版'));
check('recalculation origin display',detail.includes('recalculatedFrom'));
check('case select automatic apply',wf.includes('autoApplySelectedCase')&&wf.includes("select.addEventListener('change'"));
check('legacy case-use button hidden',ctu.includes('id="loadCtuCaseInformation" type="button" hidden'));
check('registered result restore',wf.includes('restoreRegisteredResult')&&wf.includes('restoreLashings')&&wf.includes('restorePointSnapshot'));
check('restore requires reconfirmation',wf.includes('invalidateCtuReview'));
check('one final review checkbox',(ctu.match(/data-ctu-review=/g)||[]).length===1,(ctu.match(/data-ctu-review=/g)||[]).length+'');
check('one primary registration button',(ctu.match(/id="ctuRegisterSimple"/g)||[]).length===1);
check('recalculation audit metadata',ctu.includes('latestCtuResult.recalculatedFrom'));
check('friction policy persisted',ctu.includes("frictionPolicy:$('frictionPolicy')"));
check('part550 workflow asset',ctu.includes('ctu-workflow-part550.js?v=550'));
check('part550 ctu css',ctu.includes('ctu-securing-part550.css?v=550'));
check('application detail part550 asset',read('pages/application-detail.html').includes('application-detail-part550.js?v=550'));
const sqlDir=path.join(root,'server/sql');check('no DB migration',!fs.existsSync(path.join(sqlDir,'119_part550.sql'))&&(!fs.existsSync(sqlDir)||!fs.readdirSync(sqlDir,{withFileTypes:true}).some(x=>x.isFile()&&/part550/i.test(x.name))));

check('direction inputs persisted',ctu.includes('directionInputs:Object.fromEntries'));
check('registered result detailed direction restore',wf.includes('directionInputs')&&wf.includes("directionId('c',key)"));
try{new Function(detail);check('JS syntax application detail',true)}catch(e){check('JS syntax application detail',false,e.message)}
try{new Function(wf);check('JS syntax CTU workflow',true)}catch(e){check('JS syntax CTU workflow',false,e.message)}
const inline=(ctu.match(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/i)||[])[1]||'';try{new Function(inline);check('CTU inline JS syntax',true)}catch(e){check('CTU inline JS syntax',false,e.message)}
check('build manifest part550',read('data/build-manifest.js').includes('version: "part550", part: 550'));

const html=[];function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html'))html.push(p)}}walk(root);
check('all html build meta part550',html.every(p=>/<meta(?=[^>]*name=["']sk-build["'])(?=[^>]*content=["']part550["'])[^>]*>/.test(fs.readFileSync(p,'utf8'))),html.length+' html');
check('all html build manifest v550',html.every(p=>/build-manifest\.js\?v=550/.test(fs.readFileSync(p,'utf8'))),html.length+' html');
check('all html version guard v550',html.every(p=>/version-guard\.js\?v=550/.test(fs.readFileSync(p,'utf8'))),html.length+' html');
const passed=checks.filter(x=>x.status==='passed').length;const out={release:'part550',generatedAt:new Date().toISOString(),status:passed===checks.length?'passed':'failed',passed,total:checks.length,checks};
fs.writeFileSync(path.join(root,'docs/part550_総合検証レポート.json'),JSON.stringify(out,null,2));
console.log(JSON.stringify(out,null,2));process.exit(passed===checks.length?0:1);
