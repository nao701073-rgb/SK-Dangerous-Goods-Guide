import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const rules=require(new URL('../data/ctu-code-rules-v1380.js',import.meta.url).pathname);
const policy=require(new URL('../data/ctu-assessment-policy-v1381.js',import.meta.url).pathname);
const core=fs.readFileSync(new URL('../assets/js/ctu-securing-calculator-core-v1381.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/ctu-securing-calculator.html',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('../assets/css/v1381-ctu-three-state-assessment.css',import.meta.url),'utf8');
const version=JSON.parse(fs.readFileSync(new URL('../VERSION.json',import.meta.url),'utf8'));
const tests=[];
function ok(name,condition,detail=''){tests.push({name,pass:Boolean(condition),detail});if(!condition)process.exitCode=1}
function close(a,b,tol=1e-9){return Math.abs(a-b)<=tol}
// v1.3.80 audited load model remains unchanged
ok('Sea A forward remains 0.3g',rules.TRANSPORT_PRESETS.seaA.v.forward[0]===.3);
ok('Sea A transverse remains 0.5g',rules.TRANSPORT_PRESETS.seaA.v.left[0]===.5);
ok('Sea B forward remains 0.3g',rules.TRANSPORT_PRESETS.seaB.v.forward[0]===.3);
ok('Sea B transverse remains 0.7g',rules.TRANSPORT_PRESETS.seaB.v.left[0]===.7);
ok('Sea C forward remains 0.4g',rules.TRANSPORT_PRESETS.seaC.v.forward[0]===.4);
ok('Sea C transverse remains 0.8g',rules.TRANSPORT_PRESETS.seaC.v.left[0]===.8);
ok('10t Sea C transverse = 78.48kN',close(rules.directionalForce(10,.8),78.48,1e-6),rules.directionalForce(10,.8));
ok('Direct friction still 75 percent mu',close(rules.effectiveFrictionMu(.4,true),.3));
ok('Weakest MSL still selects CTU 10kN',rules.weakestMsl(12.1,20,10).limiting==='CTU側固縛点'&&rules.weakestMsl(12.1,20,10).value===10);
ok('Incomplete MSL still gets zero credit',rules.weakestMsl(12.1,20,0).value===0&&!rules.weakestMsl(12.1,20,0).complete);
// Three state policy
ok('Policy sufficient',policy.status({applicable:true,margin:5,mandatory:false,confirmationIssues:[]})==='参考上十分');
ok('Policy unresolved overrides negative margin',policy.status({applicable:true,margin:-20,mandatory:false,confirmationIssues:['CTU側MSL']})==='要確認');
ok('Policy unresolved overrides positive margin',policy.status({applicable:true,margin:20,mandatory:false,confirmationIssues:['摩擦根拠']})==='要確認');
ok('Policy confirmed negative is insufficient',policy.status({applicable:true,margin:-.1,mandatory:false,confirmationIssues:[]})==='参考上不足');
ok('Policy confirmed mandatory securing is insufficient',policy.status({applicable:true,margin:10,mandatory:true,confirmationIssues:[]})==='参考上不足');
ok('Policy non-applicable',policy.status({applicable:false,margin:-10,mandatory:true,confirmationIssues:['x']})==='対象外');
ok('Overall confirm has priority',policy.overall(['参考上十分','参考上不足','要確認'])==='要確認');
ok('Overall insuff when fully confirmed',policy.overall(['参考上十分','参考上不足'])==='参考上不足');
ok('Overall sufficient',policy.overall(['参考上十分','参考上十分'])==='参考上十分');
// Core integration
ok('Core has confirmation issue collector',core.includes('function directionConfirmationIssues'));
ok('Core checks three MSL elements',core.includes('貨物側取付部MSL')&&core.includes("'CTU側'"));
ok('Core checks CTU boundary only when requested',core.includes('wallState.requested&&!wallState.eligible'));
ok('Core checks friction basis',core.includes("issues.push('摩擦係数の適用根拠')"));
ok('Core checks combined support basis',core.includes("issues.push('併用する支保・当て材の支保力根拠')"));
ok('Quick direct missing MSL no longer hard-stops calculation',!core.includes('未確認の要素があるため算出を停止しました。'));
ok('Core serializes three-state overall',core.includes("overall:overallStatus,assessmentPolicy:'v1.3.81-three-state'"));
ok('Quick status distinguishes confirmation difference',core.includes('確認済み値との差'));
ok('Unresolved message states not final failure',core.includes('固縛不良とは確定しません'));
// UI
ok('Page loads v1381 policy',page.includes('../data/ctu-assessment-policy-v1381.js?v=1381'));
ok('Page loads v1381 core',page.includes('../assets/js/ctu-securing-calculator-core-v1381.js?v=1381'));
ok('Page loads v1381 CSS',page.includes('../assets/css/v1381-ctu-three-state-assessment.css?v=1381'));
ok('Guide shows all three labels',page.includes('参考上十分')&&page.includes('要確認')&&page.includes('参考上不足'));
ok('Guide explains unresolved is not final insufficiency',page.includes('「要確認」は固縛不良の確定判定ではありません'));
ok('Amber confirmation styling exists',css.includes('.status-check')&&css.includes('#overall.check'));
ok('Mobile guide becomes one column',css.includes('@media(max-width:768px)')&&css.includes('.v1381-assessment-guide{grid-template-columns:1fr}'));
ok('Version is 1.3.81',version.version==='1.3.81'&&version.baseVersion==='1.3.80');
const passed=tests.filter(x=>x.pass).length;
const report={version:'1.3.81',passed,total:tests.length,allPassed:passed===tests.length,tests};
console.log(JSON.stringify(report,null,2));
fs.writeFileSync(new URL('../docs/SKDG_v1.3.81_検証レポート.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
if(passed!==tests.length)process.exit(1);
