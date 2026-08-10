(function(){
'use strict';
/* SKDG v1.3.51
 * Part553 introduced a second fixed completion panel / journey / bottom-next bar.
 * v1.3.48+ ctuStickyStatus is now the single source of truth for input/readiness status.
 * Keep this asset as a compatibility stub so older HTML references do not recreate duplicate UI.
 */
function cleanupLegacyPart553Ui(){
  [
    'part553Completion',
    'part553Journey',
    'part553StickyNext',
    'part553RestoreState'
  ].forEach(id=>document.getElementById(id)?.remove());
  document.querySelectorAll('.part553-completion,.part553-journey,.part553-sticky-next').forEach(el=>el.remove());
}
function init(){
  cleanupLegacyPart553Ui();
  // Finite compatibility cleanup only. No interval / MutationObserver is used.
  [80,180,360].forEach(delay=>setTimeout(cleanupLegacyPart553Ui,delay));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part553.js':'v1.3.51-retired-duplicate-status'});
})();
