import fs from 'fs';
import vm from 'vm';
import path from 'path';
const root=path.resolve(process.argv[2]||'.');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
let pass=0,fail=0;
function ok(cond,msg){if(cond){pass++;console.log('PASS',msg)}else{fail++;console.error('FAIL',msg)}}
const html=read('pages/ctu-securing-calculator.html');
const css=read('assets/css/v13100-ctu-complete-visual-system.css');
const css101=read('assets/css/v13101-ctu-screen-print-polish.css');
const core=read('assets/js/ctu-securing-calculator-core-v1398.js');
const layout=read('assets/js/v1398-ctu-layout-wall-sync.js');
const guard=read('assets/js/v1372-ctu-canonical-guard.js');
const sticky=read('assets/js/v1386-ctu-sticky-status.js');
const consistency=read('assets/js/v13100-ctu-ui-consistency.js');
const printState=read('assets/js/v13101-ctu-print-state.js');
const gapAssist=read('assets/js/v1394-ctu-gap-wall-assist.js');
const appLink=read('assets/js/v1391-ctu-application-number-registration-link.js');
const excelRoute=read('assets/js/ctu-excel-route-import.js');
const intakePolicy=read('assets/js/application-intake-workflow-policy.js');
const manifest=read('data/build-manifest.js');
const version=JSON.parse(read('VERSION.json'));

ok(version.version==='v1.3.101','VERSION is v1.3.101');
ok(version.base==='v1.3.100','base is v1.3.100 complete');
ok(version.completeBuild===true,'completeBuild is true');
ok(version.calculationLogicChanged===false,'calculation formula is unchanged from v1.3.98');
ok(version.ui?.workflowSteps===7,'VERSION declares seven-step workflow');
ok(version.ui?.automaticTwoColumnEffectiveWidthPx===2200,'automatic two-column threshold is 2200 CSS px');
ok(manifest.includes('version: "v1.3.101"')&&manifest.includes("v13101:{version:'v1.3.101'"),'build manifest is v1.3.101 and contains v13101 extension');

const chips=[...html.matchAll(/data-ctu-stage="step(\d)" data-ctu-step="(\d)"/g)].map(m=>[m[1],m[2]]);
ok(chips.length===7 && chips.every((x,i)=>x[0]===String(i+1)&&x[1]===String(i+1)),'progress tracker has exactly steps 1 through 7');
ok(html.includes('id="ctuStatusStep6">未使用</em>')&&html.includes('id="ctuStatusStep7">算出前</em>'),'step 6 wall / step 7 calculation statuses exist');
ok(html.includes('id="wallGapAssistPanel"')&&html.includes('data-ctu-step="6"'),'wall resistance is formal Step 6');
ok(html.includes('data-ctu-step="7"')&&html.includes('7</span><span class="ctu-step-card__title">参考算出を確認'),'calculation result is formal Step 7');
ok(!html.includes('5B')&&!sticky.includes('5B')&&!guard.includes('5B'),'no legacy 5B numbering remains in active page/status/guard');
const flowStart=html.indexOf('class="quick-flow"');
const i5=html.indexOf('data-ctu-step="5"',flowStart), i6=html.indexOf('id="wallGapAssistPanel"',i5), i7=html.indexOf('data-ctu-step="7"',i6);
ok(i5>=0&&i6>i5&&i7>i6,'workflow order is Step 5 -> Step 6 wall -> Step 7 result');

ok(html.includes('v13100-ctu-complete-visual-system.css?v=13100'),'v13100 complete visual CSS is retained');
ok(html.includes('v13101-ctu-screen-print-polish.css?v=13101'),'v13101 screen/print polish CSS is loaded after v13100');
ok(html.indexOf('v13101-ctu-screen-print-polish.css?v=13101') > html.indexOf('v13100-ctu-complete-visual-system.css?v=13100'),'v13101 CSS is later in cascade than v13100');
ok(html.includes('v13100-ctu-ui-consistency.js?v=13100'),'v13100 UI consistency JS is loaded');
ok(html.includes('v13101-ctu-print-state.js?v=13101'),'v13101 print-state bridge is loaded');
ok(html.includes('ctu-securing-calculator-core-v1398.js?v=1398'),'v1.3.98 audited calculation core is retained');
ok(!/src="[^"]*core-v1394\.js/.test(html),'obsolete v1394 calculation core is not active');
ok(html.includes('v1391-ctu-application-number-registration-link.js?v=1391'),'v1.3.91 application-number linkage remains active');
ok(html.includes('ctu-excel-route-import.js?v=1391'),'v1.3.91 Excel route/application import remains active');
ok(appLink.includes('sk:ctu-application-number-prefilled')&&appLink.includes('申請番号の整合性を確認してください。'),'application-number prefill/mismatch guard retained');
ok(excelRoute.includes("emit('sk:ctu-application-number-prefilled'")&&excelRoute.includes('prefillRegistrationIdentity'),'Excel import emits application-number prefill');
ok(intakePolicy.includes("weightSource='remarks-un'")&&intakePolicy.includes('備考欄のUN番号別重量から自動反映'),'remark UN-weight autofill retained');

ok(html.includes('v1398-pair--step12')&&html.includes('v1398-pair--step34')&&html.includes('v1398-pair--step5wall'),'three real pair wrappers are present');
ok(html.indexOf('id="ctuLayoutToolbar"') < html.indexOf('id="ctuExcelRoutePanel"'),'layout toggle is at page top before Step 1');
ok(html.includes('id="ctuLayoutOne"')&&html.includes('id="ctuLayoutTwo"'),'explicit one/two-column buttons exist');
ok(css.includes('body[data-page="ctu-securing-calculator"].ctu-layout-two .v1398-pair')&&css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'),'two-column mode is a real 2-column grid');
ok(guard.includes('v1398-pair--step12')&&guard.includes('v1398-pair--step34')&&guard.includes('v1398-pair--step5wall')&&guard.includes('const seven'),'canonical guard builds 1+2, 3+4, 5+6 wrappers and preserves Step 7');
ok(layout.includes('AUTO_TWO_COLUMN_WIDTH=2200')&&layout.includes('automaticLayout()')&&layout.includes('preferredLayout()'),'normal one-column / effective-width auto two-column policy is active');
ok(layout.includes('⑤/⑥')&&layout.includes('⑦算出結果'),'layout hint uses seven-step numbering');

ok(css.includes('#ctuPrimarySecuringPanel')&&css.includes('#ctuSupportSecuringPanel'),'Step 5 primary/support panels have common rules');
ok(css.includes('.v1394-wall-direction-card.is-wall-selected'),'selected wall cards have explicit whole-card selected style');
ok(css.includes('.result-summary .metric-worst-direction'),'result metric cards have final common border rules');
ok(css.includes('.ctu-step-card__head::before')&&css.includes('.ctu-step-card__head::after'),'legacy step-header decorative pseudo-elements are neutralized');
ok(consistency.includes('normalizeStepHeaders')&&consistency.includes("removeProperty('border-left')")&&consistency.includes("removeProperty('box-shadow')"),'UI consistency runtime normalizes headers and removes legacy inline residue');
ok(sticky.includes("setChip(7,'ready','算出済'")&&sticky.includes('①〜⑦'),'status runtime has Step 7 and calculated state');
ok(sticky.includes('sk:ctu-calculated')&&sticky.includes('calculated=true;registered=false;dirtyAfterCalculation=false'),'calculated event synchronizes Step 7 state');

// Visual hardening assertions: no left-only accent may survive in the final canonical layer.
ok(!/border-left\s*:\s*[3-9]px/i.test(css),'final visual system contains no legacy left-only 3px+ accent');
ok(css.includes('border-top:2px solid #5f9dca!important')&&css.includes('border-right:2px solid #5f9dca!important')&&css.includes('border-bottom:2px solid #5f9dca!important')&&css.includes('border-left:2px solid #5f9dca!important'),'selected wall card uses equal 2px border on all four sides');
ok(!/box-shadow\s*:\s*inset\s+[1-9][0-9.-]*px\s+0/i.test(css),'final visual system contains no left-only inset shadow');
ok(css.includes('#overall.ok')&&css.includes('border-width:1px!important'),'overall result border is normalized on all four sides');
ok(css.includes('.v1381-quick-confirm')&&css.includes('.ctu-bracing-result-inline'),'legacy helper stripes are covered by four-side helper-box rules');
ok(css.includes('border-top:1px solid var(--ctu100-border)!important')&&css.includes('border-right:1px solid var(--ctu100-border)!important')&&css.includes('border-bottom:1px solid var(--ctu100-border)!important')&&css.includes('border-left:1px solid var(--ctu100-border)!important'),'main workflow cards explicitly declare four equal sides');
ok(css.includes('margin-top:0!important')&&css.includes('.ctu-step-card__head + .quick-step__body'),'header/body boundary has explicit zero-gap rule');

ok(['wallUseForward','wallUseRear','wallUseLeft','wallUseRight'].every(id=>html.includes(`id="${id}"`)),'four direction-specific wall confirmation checkboxes exist');
ok(['wallGapForwardCm','wallGapRearCm','wallGapLeftCm','wallGapRightCm'].every(id=>html.includes(`id="${id}"`)),'four direction-specific wall gap fields exist');
ok(gapAssist.includes('THRESHOLD_CM=15'),'15 cm candidate threshold remains explicit');
ok(!/\.checked\s*=\s*true/.test(gapAssist),'AI/photo helper never auto-enables wall resistance');
ok(core.includes('wallState.eligibleFor(key)'),'wall resistance remains direction-eligible after inspector confirmation');
ok(core.includes('wallDirectionConfirmed')&&core.includes('wallGapCm'),'calculation snapshot stores wall confirmation/gap');

// Recheck exact reusable CTU rules used by the v1.3.98 core.
const code=read('data/ctu-code-rules-v1380.js');
const ctx={globalThis:{}}; vm.createContext(ctx); vm.runInContext(code,ctx);
const R=ctx.globalThis.SKCTU_CODE_RULES_V1380;
const eq=(a,b,t=1e-9)=>Math.abs(a-b)<=t;
ok(!!R,'CTU reusable rules load');
ok(eq(R.TRANSPORT_PRESETS.seaA.v.forward[0],.3)&&eq(R.TRANSPORT_PRESETS.seaA.v.left[0],.5),'Sea A directional coefficients retained');
ok(eq(R.TRANSPORT_PRESETS.seaB.v.forward[0],.3)&&eq(R.TRANSPORT_PRESETS.seaB.v.left[0],.7),'Sea B directional coefficients retained');
ok(eq(R.TRANSPORT_PRESETS.seaC.v.forward[0],.4)&&eq(R.TRANSPORT_PRESETS.seaC.v.left[0],.8),'Sea C directional coefficients retained');
ok(eq(R.directionalForce(8.559,.3),25.189137,1e-6),'directional force m*g*c verified');
ok(eq(R.frictionForce(8.559,.2,.5,true),6.29728425,1e-6),'direct-lashing friction remains 75% of static mu');
ok(eq(R.wallResistance(28,.4,0),109.872,1e-6),'front/rear boundary 0.4P example retained');
ok(eq(R.wallResistance(28,.6,0),164.808,1e-6),'side wall 0.6P example retained');
const w=R.weakestMsl(12.1,20,10); ok(w.complete&&eq(w.value,10)&&w.limiting==='CTU側固縛点','weakest MSL remains 10 kN CTU-side');
ok(core.includes('Math.max(wall,blocking)'),'wall and blocking are not double-counted');
ok(core.includes('mechanical=stiff>0?stiff:direct'),'stiff restraint/direct lashing are not simply added');
ok(core.includes('friction+top+mechanical'),'final resistance remains friction + topover + one mechanical path');
ok(core.includes('latestCtuResult?.directions'),'tied-direction summary uses latest result safely');
ok(core.includes('必要抵抗力')&&core.includes('重点確認方向'),'result usability labels retained');


// v1.3.101 two-column and A4 print-only verification.
ok(css101.includes('@media screen and (min-width:1280px)')&&css101.includes('.v1398-pair--step5wall'),'screen polish targets the Step 5 + Step 6 desktop pair only');
ok(css101.includes('gap:20px!important'),'two-column Step 5 + Step 6 gap is explicitly polished to 20px');
ok(css101.includes('@page')&&css101.includes('size:A4 portrait'),'print stylesheet declares A4 portrait');
ok(css101.includes('.sk-v1338-header')&&css101.includes('#ctuStickyStatus')&&css101.includes('.no-print'),'print stylesheet suppresses app chrome and no-print controls');
ok(css101.includes('details:not([open])'),'closed details are omitted from print');
ok(css101.includes('[data-ctu-step="3"]')&&css101.includes('[data-ctu-step="5"]')&&css101.includes('#wallGapAssistPanel'),'print page grouping includes Step 3, Step 5 and Step 6 boundaries');
ok(css101.includes('.result-summary')&&css101.includes('grid-template-columns:repeat(3,minmax(0,1fr))'),'print result summary uses three readable columns');
ok(css101.includes('.ctu-directional-load-audit')&&css101.includes('break-before:page!important'),'directional load audit begins a clean print page');
ok(css101.includes('.ctu-print-support-off #ctuSupportSecuringPanel')&&css101.includes('.ctu-print-support-off #ctuBracingAssist'),'unused support input/load-path assistance is omitted from print');
ok(css101.includes('.ctu-print-result-sufficient #deficiencySupportPanel'),'sufficient result omits unnecessary deficiency support from print');
ok(printState.includes("window.addEventListener('beforeprint', syncPrintState)"),'print state synchronizes immediately before browser printing');
ok(printState.includes('ctu-print-support-off')&&printState.includes('ctu-print-tensile-off'),'print state follows the two securing-use checkboxes');
ok(printState.includes('ctu-print-result-sufficient')&&printState.includes("text.startsWith('参考上十分')"),'print state detects a sufficient calculation without touching calculation logic');
ok(version.ui?.printLayout==='A4 portrait single-flow report','VERSION declares the A4 single-flow print report');
ok(version.ui?.printResultSummaryColumns===3,'VERSION declares three-column print result summary');

console.log(`TOTAL ${pass+fail} / PASS ${pass} / FAIL ${fail}`);
process.exitCode=fail?1:0;
