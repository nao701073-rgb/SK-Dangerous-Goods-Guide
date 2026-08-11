(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const prefs=()=>{try{return window.SKDGUserPreferencesV11?.read?.()||{followActions:true,autoScroll:false,lightweightMode:true}}catch{return{followActions:true,autoScroll:false,lightweightMode:true}}};
  document.documentElement.style.scrollBehavior='auto';
  document.body.classList.remove('v131-import-settling','v133-intake-settling');
  $('v131ImportSettling')?.remove();

  const bar=document.createElement('div');bar.id='v134IntakeActionBar';bar.className='v134-intake-actionbar';bar.innerHTML='<span id="v134IntakeActionStatus">申請書を読み込んでください</span><div><button type="button" id="v134RunCheck">自動確認を実行</button><button type="button" class="primary-action" id="v134Register" disabled>申請番号管理へ登録</button></div>';
  document.body.append(bar);
  const run=$('v134RunCheck'),reg=$('v134Register'),status=$('v134IntakeActionStatus');
  function core(){return window.SKDGIntakeV134Core||null}
  function update(){
    const p=prefs();
    const c=core(),state=c?.state||{},loaded=Boolean(state.caseData),evaluation=state.evaluation;
    bar.hidden=p.followActions===false||!loaded;
    run.disabled=!loaded;reg.disabled=!evaluation?.valid;
    reg.textContent=evaluation?.duplicateApplicationId?'登録済み案件を更新':'申請番号管理へ登録';
    status.textContent=!loaded?'申請書を読み込んでください':!evaluation?'内容を確認後、自動確認を実行してください':evaluation.valid?'確認結果を確認して登録できます':'修正が必要な項目があります';
  }
  run.addEventListener('click',()=>core()?.runCheckFromUi?.());
  reg.addEventListener('click',()=>core()?.registerCurrent?.());
  ['sk:v134-intake-loading','sk:v134-intake-loaded','sk:v134-intake-checked','sk:v134-intake-error','sk:v134-intake-reset'].forEach(n=>window.addEventListener(n,()=>requestAnimationFrame(update)));
  window.addEventListener('sk:user-preferences-changed',update);
  ['input','change'].forEach(n=>document.addEventListener(n,e=>{if(e.target.closest?.('#intakeEditSection')){const c=core();if(c?.state)c.state.evaluation=null;requestAnimationFrame(update)}},{passive:true}));
  update();
})();
