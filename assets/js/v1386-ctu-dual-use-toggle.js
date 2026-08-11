(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
function usage(){return{tensile:Boolean($('quickUseTensile')?.checked),support:Boolean($('quickUseSupport')?.checked)}}
function sync(){
 const u=usage(),category=$('quickMaterialCategory');if(category)category.value='combined';
 const primary=$('ctuPrimarySecuringPanel'),support=$('ctuSupportSecuringPanel');
 if(support)support.hidden=false;if($('quickSupportFields'))$('quickSupportFields').hidden=false;
 primary?.classList.toggle('is-not-used',!u.tensile);support?.classList.toggle('is-not-used',!u.support);
 if($('ctuPrimarySecuringPanelStateText'))$('ctuPrimarySecuringPanelStateText').textContent=u.tensile?'計算に使用する':'計算に使用しない';
 if($('ctuSupportSecuringPanelStateText'))$('ctuSupportSecuringPanelStateText').textContent=u.support?'計算に使用する':'計算に使用しない';
 document.getElementById('ctuStep5Panels')?.classList.add('is-combined');
 if(typeof window.setQuickMaterialOptions==='function')window.setQuickMaterialOptions();
 window.dispatchEvent(new CustomEvent('sk:ctu-usage-changed',{detail:{useTensile:u.tensile,useSupport:u.support}}));
}
['quickUseTensile','quickUseSupport'].forEach(id=>$(id)?.addEventListener('change',sync));
window.addEventListener('sk:ctu-restored',()=>queueMicrotask(sync));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
window.SKCTUQuickUsage={snapshot:usage,sync};
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1386-ctu-dual-use-toggle.js':'v1.3.86'});
})();
