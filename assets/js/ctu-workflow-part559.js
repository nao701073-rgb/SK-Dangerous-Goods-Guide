(function(){
'use strict';
// v1.3.50: legacy four-step "かんたん操作ガイド" is retired.
// The consolidated CTU sticky status bar (v1.3.48+) is the single source of
// input / review / calculation guidance. Do not recreate #part559Guide.
function cleanupLegacyGuide(){
  document.getElementById('part559Guide')?.remove();
  document.body?.classList.remove('part559-guide-ready');
}
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',cleanupLegacyGuide,{once:true});
}else{
  cleanupLegacyGuide();
}
window.addEventListener('load',cleanupLegacyGuide,{once:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part559.js':'v1.3.50-retired'});
})();
