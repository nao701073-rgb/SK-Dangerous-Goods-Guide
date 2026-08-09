const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('pages/ctu-securing-calculator.html');const css=read('assets/css/ctu-securing-part539.css');const build=read('data/build-manifest.js');
const checks=[
 ['version part539',read('VERSION.json').includes('"version": "part539"')],
 ['build version part539',build.includes('version: "part539"')],
 ['registry heading',html.includes('取付点別MSL・根拠写真台帳')],
 ['multiple photos',html.includes('id="mslPointPhotoInput"')&&html.includes('multiple')],
 ['unit conversion',html.includes('MSL_UNIT_TO_KN')&&html.includes('kgf:.00980665')&&html.includes('tf:9.80665')],
 ['damage states',html.includes('value="deformation"')&&html.includes('value="corrosion"')&&html.includes('value="unusable"')],
 ['line linkage',html.includes('id="mslPointLines"')&&html.includes('mslLineRows()')],
 ['minimum MSL',html.includes('Math.min(device,cargo,ctu)')],
 ['application persistence',html.includes("ctuMslPointRegistry")&&html.includes('updateApplication')],
 ['result snapshot',html.includes('attachmentPointRegistry:mslPointRegistrySnapshot()')],
 ['mobile css',css.includes('@media(max-width:620px)')],
 ['old calculation retained',html.includes('function calc()')&&html.includes('readLashings()')]
];
const failed=checks.filter(x=>!x[1]);console.log(JSON.stringify({release:'part539',passed:checks.length-failed.length,total:checks.length,checks:checks.map(([name,pass])=>({name,pass}))},null,2));if(failed.length)process.exit(1);
