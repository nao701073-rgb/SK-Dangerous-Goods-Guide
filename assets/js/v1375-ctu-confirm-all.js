(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const USABLE_IDS=[
    'quickMass','quickCargoDescription','quickTransport','quickCtu','quickMaterialCategory','quickMethod','quickMaterial','quickDirection',
    'quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickBasis','quickSupportMaterial','quickSupportDirection',
    'quickSupportCount','quickSupportStrength','quickSupportBasis','quickFriction','quickMu'
  ];
  function usable(el){
    if(!el)return false;
    if(el.type==='checkbox')return Boolean(el.checked);
    const raw=String(el.value??'').trim();
    if(!raw)return false;
    if(el.type==='number')return Number.isFinite(Number(raw))&&Number(raw)>0;
    return true;
  }
  function confirmAll(){
    const api=window.SKCTUProgressAPI;
    if(api?.confirmAllCurrent){api.confirmAllCurrent();return}
    // Fallback for older cached progress script: dispatch a dedicated event consumed by v1.3.75+.
    window.dispatchEvent(new CustomEvent('sk:ctu-confirm-all-current'));
  }
  function bind(){
    const btn=$('ctuConfirmAll');
    if(!btn||btn.dataset.bound==='1')return;
    btn.dataset.bound='1';
    btn.addEventListener('click',()=>{
      confirmAll();
      const before=btn.textContent;
      btn.textContent='確認済みにしました';
      btn.classList.add('is-confirmed');
      setTimeout(()=>{btn.textContent=before;btn.classList.remove('is-confirmed')},1400);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1375-ctu-confirm-all.js':'v1.3.75'});
})();
