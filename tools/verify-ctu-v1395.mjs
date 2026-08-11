import fs from 'node:fs';
const page=fs.readFileSync(new URL('../pages/ctu-securing-calculator.html',import.meta.url),'utf8');
const js=fs.readFileSync(new URL('../assets/js/v1395-ctu-wall-result-sync.js',import.meta.url),'utf8');
const checks=[
 ['page build v1.3.95',page.includes('meta content="v1.3.95" name="sk-build"')],
 ['sync script loaded',page.includes('v1395-ctu-wall-result-sync.js?v=1395')],
 ['wall check auto recalc',js.includes('wallUse${suffix}`)?.addEventListener(\'change\',scheduleAutoRecalc)')],
 ['calculated event sync',js.includes("window.addEventListener('sk:ctu-calculated'" )],
 ['deficiency badge sync',js.includes("fieldDeficiencyBadge")&&js.includes("算出済・要確認")],
 ['no first-input forced calc',js.includes('if(!hasCalculatedResult())')]
];
let fail=0;for(const [name,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${name}`);if(!ok)fail++;}process.exitCode=fail?1:0;
