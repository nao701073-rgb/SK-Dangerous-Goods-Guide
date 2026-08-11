import fs from 'node:fs';
const page=fs.readFileSync(new URL('../pages/ctu-securing-calculator.html',import.meta.url),'utf8');
const core=fs.readFileSync(new URL('../assets/js/ctu-securing-calculator-core-v1394.js',import.meta.url),'utf8');
const assist=fs.readFileSync(new URL('../assets/js/v1394-ctu-gap-wall-assist.js',import.meta.url),'utf8');
const checks=[
 ['direction checks', ['wallUseForward','wallUseRear','wallUseLeft','wallUseRight'].every(x=>page.includes(x))],
 ['gap fields', ['wallGapForwardCm','wallGapRearCm','wallGapLeftCm','wallGapRightCm'].every(x=>page.includes(x))],
 ['15cm threshold', assist.includes('THRESHOLD_CM=15')],
 ['AI never autochecks', !/\.checked\s*=\s*true/.test(assist)],
 ['direction eligibility', core.includes('wallState.eligibleFor(key)')],
 ['direction snapshot', core.includes('wallDirectionConfirmed')&&core.includes('wallGapCm')],
 ['legacy hidden', page.includes('v1394-legacy-wall-uniform')&&page.includes('hidden aria-hidden="true"')],
 ['new core loaded', page.includes('ctu-securing-calculator-core-v1394.js?v=1394')],
 ['new assist loaded', page.includes('v1394-ctu-gap-wall-assist.js?v=1394')]
];
let fail=0;for(const [n,ok] of checks){console.log(`${ok?'PASS':'FAIL'} ${n}`);if(!ok)fail++;}if(fail)process.exit(1);
