(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const digits=(v,max)=>String(v??'').replace(/\D/g,'').slice(0,max);
  let refreshTimer=0;
  let registrationTouched=false;

  function removeLegacyDock(){document.getElementById('v134IntakeActionBar')?.remove();}
  function mainIdentity(){return{
    year:digits($('intakeApplicationYear')?.value,4),
    number:digits($('intakeApplicationNumber')?.value,5),
    caseTitle:String($('intakeCaseTitle')?.value||'').trim()
  };}
  function regIdentity(){return{
    year:digits($('intakeRegisterYear')?.value,4),
    number:digits($('intakeRegisterNumber')?.value,5),
    caseTitle:String($('intakeRegisterCaseTitle')?.value||'').trim()
  };}
  function syncRegistrationFromMain(force=false){
    const y=$('intakeRegisterYear'),n=$('intakeRegisterNumber'),t=$('intakeRegisterCaseTitle');
    if(!y||!n||!t)return;
    if(registrationTouched&&!force)return;
    const src=mainIdentity();
    y.value=src.year||String(new Date().getFullYear());
    n.value=src.number;
    t.value=src.caseTitle;
  }
  function syncMainFromRegistration(){
    const reg=regIdentity(),year=$('intakeApplicationYear'),number=$('intakeApplicationNumber'),title=$('intakeCaseTitle'),type=$('intakeNumberType');
    if(year)year.value=reg.year;
    if(number)number.value=reg.number;
    if(title&&reg.caseTitle!==title.value)title.value=reg.caseTitle;
    if(type&&reg.number){type.value='official';if(number)number.disabled=false;}
  }
  function findExisting(year,number){
    if(!year||!number)return null;
    return window.ISSApplicationResults?.findByNumber?.(year,number)||null;
  }
  function renderTarget(){
    removeLegacyDock();
    const box=$('intakeRegistrationTarget');if(!box)return;
    const {year,number}=regIdentity();
    const existing=findExisting(year,number);
    if(existing)box.innerHTML=`<span>登録先</span><strong>${esc(existing.applicationYear||year)}-${esc(existing.applicationNumber||number)}${existing.caseTitle?'｜'+esc(existing.caseTitle):''}</strong><small>既存案件へ申請確認・許容容量／質量の結果を追加します。</small>`;
    else if(year&&number)box.innerHTML=`<span>登録先</span><strong>${esc(year)}-${esc(number)}</strong><small>新しい申請番号として登録します。</small>`;
    else box.innerHTML='<span>登録先</span><strong>新しい申請番号</strong>';
  }
  function scheduleCheckRefresh(){
    clearTimeout(refreshTimer);
    refreshTimer=setTimeout(()=>{
      try{
        const core=window.SKDGIntakeV135Core;
        if(core?.state?.caseData&&core?.state?.evaluation)core.runCheck?.();
      }catch(error){console.warn('SKDG registration check refresh failed',error);}
    },180);
  }
  function onRegistrationInput(event){
    registrationTouched=true;
    const node=event.currentTarget;
    if(node.id==='intakeRegisterYear')node.value=digits(node.value,4);
    if(node.id==='intakeRegisterNumber')node.value=digits(node.value,5);
    syncMainFromRegistration();
    renderTarget();
    scheduleCheckRefresh();
  }
  function bind(){
    ['intakeRegisterYear','intakeRegisterNumber','intakeRegisterCaseTitle'].forEach(id=>{
      const n=$(id);if(!n||n.dataset.v1321Bound==='1')return;
      n.dataset.v1321Bound='1';n.addEventListener('input',onRegistrationInput);n.addEventListener('change',onRegistrationInput);
    });
    ['intakeApplicationYear','intakeApplicationNumber','intakeCaseTitle','intakeNumberType'].forEach(id=>{
      const n=$(id);if(!n||n.dataset.v1321SourceBound==='1')return;
      n.dataset.v1321SourceBound='1';
      ['input','change'].forEach(type=>n.addEventListener(type,()=>{syncRegistrationFromMain(false);renderTarget();}));
    });
  }
  function refresh(force=false){bind();syncRegistrationFromMain(force);renderTarget();const a=$('intakeOpenApplication');if(a){a.textContent='登録した申請を詳細確認';a.setAttribute('aria-label','登録した申請を詳細確認');}}
  ['sk:v135-intake-loaded','sk:v134-intake-loaded','sk:v135-intake-reset','sk:v134-intake-reset'].forEach(name=>window.addEventListener(name,()=>{
    registrationTouched=false;setTimeout(()=>refresh(true),0);
  }));
  ['sk:v135-intake-checked','iss:applications-changed','iss:application-results-changed'].forEach(name=>window.addEventListener(name,()=>setTimeout(()=>refresh(false),0)));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>refresh(true),{once:true}):refresh(true);
  window.addEventListener('load',()=>refresh(false),{once:true});
  [80,250].forEach(ms=>setTimeout(()=>refresh(false),ms));
  window.SKDGIntakeRegistrationV1321={refresh,renderTarget,syncMainFromRegistration,regIdentity};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1317-intake-registration.js':'v1.3.22'});
})();
