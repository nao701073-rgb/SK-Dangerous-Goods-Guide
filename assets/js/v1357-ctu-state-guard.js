(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/[\s　]+/g,' ').trim();
  let validRegistration=false;

  const successRx=/(登録が完了しました|算出結果を登録しました|共通案件情報と算出結果を登録しました|新規登録し.*算出結果を保存しました|申請詳細.*固縛力(?:参考)?算出)/;
  const oldReadinessRx=/(入力ミス防止チェック.*基本条件|基本条件は入力済み.*算出結果|基本条件に明らかな入力不足はありません)/;

  function smallestBlock(node,limit=900){
    let current=node;
    for(let i=0;i<4&&current?.parentElement;i++){
      const parent=current.parentElement;
      if(['ctuRegistrationSection','quickEntryPanel','ctuStickyStatus'].includes(parent.id))break;
      const t=norm(parent.textContent);
      if(t.length<=limit)current=parent;else break;
    }
    return current;
  }
  function hideLegacyReadiness(root=document.querySelector('main')){
    if(!root)return;
    root.querySelectorAll('section,aside,div,p,span,strong').forEach(node=>{
      if(node.id==='ctuStickyStatus'||node.closest('#ctuStickyStatus'))return;
      if(node.id==='ctuRegistrationMessage'||node.closest('#ctuRegistrationMessage'))return;
      const t=norm(node.textContent);if(!t||!oldReadinessRx.test(t))return;
      const block=smallestBlock(node,750);
      if(block&&block!==root&&block.id!=='quickEntryPanel'){
        block.dataset.v1357LegacyReadiness='1';block.hidden=true;block.setAttribute('aria-hidden','true');
      }
    });
  }
  function guardRegistrationMessages(){
    const section=$('ctuRegistrationSection'),msg=$('ctuRegistrationMessage');if(!section)return;
    // Retire every legacy/generated success card. Only #ctuRegistrationMessage may show success,
    // and only after the real sk:ctu-registered event fires in this page session.
    section.querySelectorAll('section,aside,div,p,span,strong').forEach(node=>{
      if(node===msg||node.closest('#ctuRegistrationMessage'))return;
      const t=norm(node.textContent);if(!t||!successRx.test(t))return;
      const block=smallestBlock(node,850);
      if(block&&block!==section&&block!==msg){
        block.dataset.v1357StaleRegistration='1';block.hidden=true;block.setAttribute('aria-hidden','true');
      }
    });
    if(!msg)return;
    const t=norm(msg.textContent);
    if(successRx.test(t)&&!validRegistration){
      msg.textContent='';msg.classList.remove('is-v1357-valid-registration');msg.hidden=true;return;
    }
    if(successRx.test(t)&&validRegistration){msg.classList.add('is-v1357-valid-registration');msg.hidden=false;return}
    // Error / guidance text is allowed, but it is never styled as registration success.
    msg.classList.remove('is-v1357-valid-registration');msg.hidden=!t;
  }
  function guardAll(){hideLegacyReadiness();guardRegistrationMessages()}
  function clearRegistrationSuccess(){
    validRegistration=false;
    const msg=$('ctuRegistrationMessage');
    if(msg&&successRx.test(norm(msg.textContent))){msg.textContent='';msg.classList.remove('is-v1357-valid-registration');msg.hidden=true}
    guardAll();
  }
  function showRegistrationSuccess(detail={}){
    validRegistration=true;
    const msg=$('ctuRegistrationMessage');if(!msg)return;
    const year=detail.applicationYear??'',number=detail.applicationNumber??'';
    if(!successRx.test(norm(msg.textContent))){
      msg.textContent=year&&number?`申請番号 ${year}-${number} に算出結果を登録しました。`:'算出結果を申請番号管理へ登録しました。';
    }
    msg.classList.add('is-v1357-valid-registration');msg.hidden=false;
    guardRegistrationMessages();
  }
  function observeSmallRoots(){
    const reg=$('ctuRegistrationSection');
    if(reg){
      const o=new MutationObserver(()=>guardRegistrationMessages());
      o.observe(reg,{subtree:true,childList:true,characterData:true});
    }
    const quick=$('quickEntryPanel');
    if(quick){
      const o=new MutationObserver(()=>hideLegacyReadiness(quick));
      o.observe(quick,{subtree:true,childList:true,characterData:true});
    }
    // Legacy scripts may insert the old green readiness card as a sibling after quickEntryPanel.
    // Observe only during startup; later updates are covered by the explicit system events below.
    const main=document.querySelector('main');
    if(main){
      const startup=new MutationObserver(()=>guardAll());
      startup.observe(main,{subtree:true,childList:true,characterData:true});
      setTimeout(()=>startup.disconnect(),3200);
    }
  }
  function bind(){
    guardAll();observeSmallRoots();
    [80,220,520,900,1400,2200,3200].forEach(ms=>setTimeout(guardAll,ms));
    window.addEventListener('load',()=>setTimeout(guardAll,0),{once:true});
    // A real registration event is the only way to show a green registration success state.
    window.addEventListener('sk:ctu-registered',event=>setTimeout(()=>showRegistrationSuccess(event.detail||{}),0));
    [
      'sk:ctu-case-applied','sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-excel-route-enhanced',
      'sk:ctu-photo-loaded','sk:ctu-photo-applied','sk:ctu-ai-suggested','sk:ctu-ai-applied','sk:ctu-system-applied',
      'sk:ctu-calculated'
    ].forEach(type=>window.addEventListener(type,()=>setTimeout(clearRegistrationSuccess,0)));
    document.addEventListener('input',event=>{if(event.isTrusted&&event.target?.closest?.('#quickEntryPanel,#ctuExcelRoutePanel,#photoInputPanel'))clearRegistrationSuccess()},true);
    document.addEventListener('change',event=>{if(event.isTrusted&&event.target?.closest?.('#quickEntryPanel,#ctuExcelRoutePanel,#photoInputPanel'))clearRegistrationSuccess()},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.SKCTUStateGuardV1357={guardAll,isRegistrationValid:()=>validRegistration};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1357-ctu-state-guard.js':'v1.3.57'});
})();
