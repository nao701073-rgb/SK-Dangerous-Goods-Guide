(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id),clean=v=>String(v||'').replace(/[\s　]+/g,' ').trim();
  let registered=false;
  const success=/(登録が完了しました|登録しました|算出結果.*保存しました)/;
  function purgeFalseSuccess(){
    const section=$('ctuRegistrationSection');if(!section)return;
    const canonical=$('ctuRegistrationMessage');
    section.querySelectorAll('p,div,aside,section,span,strong').forEach(node=>{
      const text=clean(node.textContent);if(!text||!success.test(text))return;
      if(node===canonical||node.closest('#ctuRegistrationMessage'))return;
      const direct=[...node.children].every(c=>!success.test(clean(c.textContent)));
      if(direct){node.hidden=true;node.setAttribute('aria-hidden','true');node.dataset.v1358FalseRegistration='1'}
    });
    if(canonical){
      const text=clean(canonical.textContent);
      if(success.test(text)&&!registered){canonical.textContent='';canonical.hidden=true;canonical.classList.remove('is-v1357-valid-registration','is-v1358-valid-registration')}
      else if(success.test(text)&&registered){canonical.hidden=false;canonical.classList.add('is-v1358-valid-registration')}
    }
  }
  function invalidate(){registered=false;purgeFalseSuccess()}
  function valid(detail={}){registered=true;const msg=$('ctuRegistrationMessage');if(msg){const y=detail.applicationYear||'',n=detail.applicationNumber||'';msg.textContent=y&&n?`申請番号 ${y}-${n} に算出結果を登録しました。`:'算出結果を申請番号管理へ登録しました。';msg.hidden=false;msg.classList.add('is-v1358-valid-registration')}purgeFalseSuccess()}
  function bind(){
    invalidate();
    const section=$('ctuRegistrationSection');if(section){const o=new MutationObserver(purgeFalseSuccess);o.observe(section,{subtree:true,childList:true,characterData:true})}
    window.addEventListener('sk:ctu-registered',e=>setTimeout(()=>valid(e.detail||{}),0));
    ['sk:ctu-case-applied','sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-photo-applied','sk:ctu-ai-applied','sk:ctu-system-applied','sk:ctu-calculated','sk:ctu-route-applied'].forEach(type=>window.addEventListener(type,()=>setTimeout(invalidate,0)));
    document.addEventListener('input',e=>{if(e.isTrusted&&e.target?.closest?.('#quickEntryPanel,#ctuExcelRoutePanel,#photoInputPanel,#ctuRegistrationSection'))invalidate()},true);
    document.addEventListener('change',e=>{if(e.isTrusted&&e.target?.closest?.('#quickEntryPanel,#ctuExcelRoutePanel,#photoInputPanel,#ctuRegistrationSection'))invalidate()},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.SKCTUStateConsistencyV1358={invalidate,isRegistered:()=>registered};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1358-ctu-state-consistency.js':'v1.3.58'});
})();
