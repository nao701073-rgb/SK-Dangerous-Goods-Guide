import fs from 'fs';
import vm from 'vm';
const code=fs.readFileSync(new URL('../assets/js/v1392-ctu-direction-tie-label.js',import.meta.url),'utf8');
const context={window:{}};vm.createContext(context);vm.runInContext(code,context);
const api=context.window.SKCTUDirectionTieV1392;
const r=(key,margin,external=10)=>({key,label:key,margin,external,applicable:true});
const cases=[
  ['left/right',[r('forward',3),r('rear',3),r('left',-13.8,58.8),r('right',-13.8,58.8)],'側面方向（左・右同率）'],
  ['forward/rear',[r('forward',-4.2,25),r('rear',-4.2,25),r('left',2),r('right',2)],'前後方向（前・後同率）'],
  ['all',[r('forward',-1),r('rear',-1),r('left',-1),r('right',-1)],'前後・側面方向（全方向同率）'],
  ['single',[r('forward',1),r('rear',2),r('left',-3),r('right',0)],'左方向'],
  ['display rounding',[r('forward',-1.04),r('rear',-1.01),r('left',2),r('right',3)],'前後方向（前・後同率）'],
];
let fail=0;
for(const [name,rows,expected] of cases){const got=api.summarize(rows).label;const ok=got===expected;console.log(`${ok?'PASS':'FAIL'} ${name}: ${got}`);if(!ok)fail++;}
if(fail)process.exit(1);
console.log(`PASS ${cases.length}/${cases.length}`);
