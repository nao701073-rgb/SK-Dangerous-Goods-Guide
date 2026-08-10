const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('pages/ctu-securing-calculator.html');
const css=read('assets/css/ctu-securing-part540.css');
const build=read('data/build-manifest.js');
const version=read('VERSION.json');
const checks=[
  ['version part540',version.includes('"version": "part540"')],
  ['build part540',build.includes('version: "part540"')],
  ['part540 css',html.includes('ctu-securing-part540.css?v=540')&&css.includes('Part 540')],
  ['text detector optional',html.includes('window.TextDetector')&&html.includes('mslPointReadPhotoText')],
  ['manual candidate parser',html.includes('parseMslRecognitionText')&&html.includes('mslPointExtractCandidate')],
  ['MSL only auto apply',html.includes("matches.find(x=>x.label==='MSL')")],
  ['WLL no auto conversion',html.includes("['WLL','SWL','LC'].includes")&&html.includes('MSLへの自動換算は行いません')],
  ['photo annotation',html.includes('mslAnnotationCanvas')&&html.includes('MSL_MARKER_LABELS')],
  ['review workflow',html.includes('MSL_POINT_WORKFLOW')&&html.includes('changeMslPointWorkflow')],
  ['unconfirmed apply prevention',html.includes('確認者が「確認済み」にした取付点のみ反映できます')],
  ['change history',html.includes('mslPointHistoryEntry')&&html.includes('mslPointHistory')],
  ['report output',html.includes('printMslPointReport')&&html.includes('台帳報告書を表示')],
  ['json export',html.includes('exportMslPointJson')],
  ['snapshot workflow fields',html.includes('workflowStatus:row.workflowStatus')&&html.includes('history:row.history.map')],
  ['old point registry retained',html.includes('MSL_UNIT_TO_KN')&&html.includes('mslLineRows()')],
  ['old calculation retained',html.includes('function calc()')&&html.includes('readLashings()')],
  ['mobile css',css.includes('@media(max-width:620px)')]
];
const failed=checks.filter(x=>!x[1]);
console.log(JSON.stringify({release:'part540',passed:checks.length-failed.length,total:checks.length,checks:checks.map(([name,pass])=>({name,pass}))},null,2));
if(failed.length)process.exit(1);
