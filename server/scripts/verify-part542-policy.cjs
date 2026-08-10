const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'assets/js/detail-dashboard.js'),'utf8');
const html=fs.readFileSync(path.join(root,'pages/dangerous-goods-detail.html'),'utf8');
const checks={
  heading_label: js.includes('<strong>標札</strong>'),
  marine_name_ja: js.includes('<small>海洋汚染物質</small>'),
  old_block_removed: !js.includes('<strong>海洋汚染物質</strong>\n                       <small>Marine Pollutant</small>'),
  detail_cache_version: html.includes('detail-dashboard.js?v=542'),
  build_version: html.includes('content="part542"')
};
const failed=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
console.log(JSON.stringify({release:'part542',passed:Object.keys(checks).length-failed.length,total:Object.keys(checks).length,checks,failed},null,2));
process.exit(failed.length?1:0);
