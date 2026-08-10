import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=new URL('../',import.meta.url);
const rules=require(new URL('../data/ctu-code-rules-v1380.js',import.meta.url).pathname);
const core=fs.readFileSync(new URL('../assets/js/ctu-securing-calculator-core-v1380.js',import.meta.url),'utf8');
const page=fs.readFileSync(new URL('../pages/ctu-securing-calculator.html',import.meta.url),'utf8');
const tests=[];
function ok(name,condition,detail=''){tests.push({name,pass:Boolean(condition),detail});if(!condition)process.exitCode=1}
function close(a,b,tol=1e-9){return Math.abs(a-b)<=tol}
const exp={
 seaA:{forward:[.3,.5],rear:[.3,.5],left:[.5,1],right:[.5,1]},
 seaB:{forward:[.3,.3],rear:[.3,.3],left:[.7,1],right:[.7,1]},
 seaC:{forward:[.4,.2],rear:[.4,.2],left:[.8,1],right:[.8,1]}
};
for(const [area,dirs] of Object.entries(exp))for(const [dir,pair] of Object.entries(dirs))ok(`${area} ${dir} c/cz`,JSON.stringify(rules.TRANSPORT_PRESETS[area].v[dir])===JSON.stringify(pair),JSON.stringify(rules.TRANSPORT_PRESETS[area].v[dir]));
const audit=rules.seaAudit(10,.2);
ok('Sea A longitudinal force 10t = 29.43kN',close(audit.seaA.forward.forceKn,29.43,1e-6),audit.seaA.forward.forceKn);
ok('Sea A transverse force 10t = 49.05kN',close(audit.seaA.left.forceKn,49.05,1e-6),audit.seaA.left.forceKn);
ok('Sea B longitudinal force 10t = 29.43kN',close(audit.seaB.forward.forceKn,29.43,1e-6),audit.seaB.forward.forceKn);
ok('Sea B transverse force 10t = 68.67kN',close(audit.seaB.left.forceKn,68.67,1e-6),audit.seaB.left.forceKn);
ok('Sea C longitudinal force 10t = 39.24kN',close(audit.seaC.forward.forceKn,39.24,1e-6),audit.seaC.forward.forceKn);
ok('Sea C transverse force 10t = 78.48kN',close(audit.seaC.left.forceKn,78.48,1e-6),audit.seaC.left.forceKn);
ok('No 40/60 mass split model',!core.includes('0.4*m')&&!core.includes('0.6*m')&&!core.includes('m*.4')&&!core.includes('m*.6'),'directionalForce uses m*g*c');
ok('Direct securing friction uses 75% static mu',close(rules.effectiveFrictionMu(.4,true),.3),rules.effectiveFrictionMu(.4,true));
ok('Non-direct friction keeps static mu',close(rules.effectiveFrictionMu(.4,false),.4),rules.effectiveFrictionMu(.4,false));
ok('Sea C longitudinal friction reflects cz=0.2',close(rules.frictionForce(10,.2,.2,false),3.924,1e-6),rules.frictionForce(10,.2,.2,false));
ok('Weakest MSL complete selects CTU 10kN',rules.weakestMsl(12.1,20,10).complete&&close(rules.weakestMsl(12.1,20,10).value,10)&&rules.weakestMsl(12.1,20,10).limiting==='CTU側固縛点',JSON.stringify(rules.weakestMsl(12.1,20,10)));
ok('Incomplete MSL is zero and not creditable',!rules.weakestMsl(12.1,20,0).complete&&rules.weakestMsl(12.1,20,0).value===0,JSON.stringify(rules.weakestMsl(12.1,20,0)));
ok('CTU wall formula uses P*r*g',close(rules.wallResistance(28,.6,0),164.808,1e-6),rules.wallResistance(28,.6,0));
ok('Core requires three MSL elements before direct credit',core.includes('MSLが3要素すべて確認できていないため、この直接固縛は抵抗力へ算入していません。'));
ok('Quick calculation stops when cargo/CTU MSL missing',core.includes('未確認の要素があるため算出を停止しました。'));
ok('Stiff path governs when CTU boundary/support coexists with direct lashing',core.includes('const stiff=Math.max(wall,blocking)')&&core.includes('const mechanical=stiff>0?stiff:direct'));
ok('Approved mode does not re-enable arithmetic parallel sum',!core.includes('friction+top+wall+blocking+direct')&&core.includes('この参考算出では剛性の異なる抵抗要素を単純加算しません'));
ok('Annex 7 4.1.6 parallel-load warning present',core.includes('CTU Code Annex 7 4.1.6')&&core.includes('剛性経路側を単独で評価'));
ok('Advanced UI records approved combination without simple addition',page.includes('承認済み併用（根拠記録のみ・この参考算出では単純加算しない）'));
ok('Bracing path suppresses duplicated wall credit',core.includes('CTU境界抵抗を別途二重加算していません。')&&core.includes('wall=0'));
ok('CSS branch uses ship-specific external-force routine',core.includes('if(css)cssExternal=cssExternalForces(m,warnings)')&&core.includes('CSS Code Annex 13'));

ok('CSS Table 2 basic accelerations match MSC.1/Circ.1623',core.includes("high:{ay:[7.1,6.9,6.8,6.7,6.7,6.8,6.9,7.1,7.4],ax:3.8}")&&core.includes("low:{ay:[6.5,6.3,6.1,6.1,6.1,6.1,6.3,6.5,6.7],ax:2.9}")&&core.includes("tween:{ay:[5.9,5.6,5.5,5.4,5.4,5.5,5.6,5.9,6.2],ax:2.0}")&&core.includes("lower:{ay:[5.5,5.3,5.1,5.0,5.0,5.1,5.3,5.5,5.9],ax:1.5}")&&core.includes("az:[7.6,6.2,5.0,4.3,4.3,5.0,6.2,7.6,9.2]"));
ok('CSS Table 3 length/service-speed formula matches amendment',core.includes(".345*speed/Math.sqrt(length)+(58.62*length-1034.5)/(length*length)"));
ok('CSS service speed below 15 kn is not incorrectly clamped to 15 kn',core.includes('const transverseT3=t3')&&!core.includes('t3At15')&&!core.includes('speed<15?Math.max'));
ok('CSS reduced operational speed warning is documented',page.includes('減速運航の速力ではなく、船舶の service speed')&&page.includes('横加速度には減速補正を使用できない'));
ok('CSS Table 4 B/GM corrections match amendment',core.includes("high:{3:2.64,4:2.28,5:1.98,6:1.74,7:1.56,8:1.40,9:1.27,10:1.19,11:1.11,12:1.05,13:1}")&&core.includes("lower:{3:1.24,4:1.23,5:1.20,6:1.18,7:1.15,8:1.12,9:1.09,10:1.06,11:1.04,12:1.02,13:1}"));
ok('CSS Table 5 friction caps match amendment',core.includes("timberTimber:.4,steelTimber:.3,steelSteelDry:.1,steelSteelWet:0"));
ok('CSS longitudinal fz correction table matches amendment',core.includes("CSS_FZ_TABLE=[[0,.20],[.1,.50],[.2,.70],[.3,.80],[.4,.85],[.6,.90]]"));
ok('CSS MSL conversion factors match amended Annex 13',core.includes("shackle:.5,fibre:.33,web:.5,wireSingle:.8,wireReusable:.3,steelBand:.7,chain:.5"));
ok('CSS advanced method uses CS = MSL/1.5',core.includes("const safety=method==='cssAlternative'?1.35:1.5"));
ok('CSS alternative method uses CS = MSL/1.35',core.includes("method==='cssAlternative'?1.35:1.5"));
ok('CSS top-over lashings are excluded from Annex 13 balance credit',core.includes('貨物頂部を越える固縛はCSS Code Annex 13の平衡計算では抵抗力に算入しません。'));
ok('CSS weather reduction formula matches fR expression',core.includes("1-Math.pow(hs-13,2)/240"));
ok('CSS wind and sea simple loads use 1 kN/m2 area basis',core.includes('windX=ax*c.fR')&&core.includes('windY=ay*c.fR')&&core.includes('sloshX=sx')&&core.includes('sloshY=sy'));
ok('Page loads v1380 audited rules',page.includes('../data/ctu-code-rules-v1380.js?v=1380'));
ok('Page loads v1380 core',page.includes('../assets/js/ctu-securing-calculator-core-v1380.js?v=1380'));
ok('Old v1377 core not active',!page.includes('../assets/js/ctu-securing-calculator-core-v1377.js?v=1377'));
ok('Directional audit UI exists',page.includes('id="ctuDirectionalLoadAudit"')&&page.includes('方向別作用力'));
const passed=tests.filter(x=>x.pass).length;
console.log(JSON.stringify({version:'1.3.80',passed,total:tests.length,allPassed:passed===tests.length,tests},null,2));
if(passed!==tests.length)process.exit(1);
