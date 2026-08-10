(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
function unwrap(details){if(!details?.parentNode)return;const parent=details.parentNode;[...details.childNodes].forEach(node=>{if(node.nodeType===1&&node.tagName==='SUMMARY')return;parent.insertBefore(node,details)});details.remove()}
function cleanup(){
  // Part551 introduced outer <details> around Step1/2. They are no longer part of the canonical workflow.
  document.querySelectorAll('details.part551-assist-details').forEach(unwrap);
  // Retired Part551/559 navigation layers must not reappear beside the current 1-6 status.
  $('part551QuickProgress')?.remove();document.querySelectorAll('.part551-next').forEach(n=>n.remove());
  $('part559Guide')?.remove();document.body.classList.remove('part559-guide-ready');
  // The v13 dynamic Step5 cards predate the current static Step5 panels. Never allow both structures at once.
  if($('ctuStep5Panels')){
    const legacy=$('v13ConditionCards');
    if(legacy){
      // Do not destructively move live controls here; patched v13 prevents creation. If an old cached instance exists,
      // hide only the legacy container and let canonical initialization repopulate/normalize on reload.
      legacy.hidden=true;legacy.setAttribute('aria-hidden','true');legacy.dataset.v1365Legacy='1';
    }
  }
}
function init(){cleanup();[0,80,220,520,1000,1800,2800].forEach(ms=>setTimeout(cleanup,ms))}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',cleanup,{once:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1365-ctu-legacy-part-root-cleanup.js':'v1.3.65'});
})();
