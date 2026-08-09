(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNumber(app){return app?.numberType==='temporary'?(app.temporaryNumber||app.applicationNumber):app?.applicationNumber}
  function target(){return applications().find(app=>String(app.id)===String(requestedId))||null}
  function ensureContext(){
    if(!requestedId||$('part567IntakeContext'))return;const intro=document.querySelector('.intake-intro');if(!intro)return;
    const box=document.createElement('section');box.id='part567IntakeContext';box.className='part567-intake-context';box.innerHTML='<div><span>照合対象の申請案件</span><strong id="part567IntakeCaseTitle">登録案件を確認しています</strong><small id="part567IntakeCaseMeta"></small><b id="part567IntakeMatchState">取込後に申請番号を照合します</b></div><div class="part567-intake-context__actions"><a id="part567IntakeDetail" target="_blank" rel="noopener">申請詳細</a><a id="part567IntakeCtu">固縛力参考算出</a></div>';
    intro.insertAdjacentElement('afterend',box);
  }
  function fillEmptyCaseFields(app){
    if(!app)return;const year=$('intakeApplicationYear'),number=$('intakeApplicationNumber'),type=$('intakeNumberType');
    if(year&&!String(year.value||'').trim())year.value=String(app.applicationYear||'');
    if(type&&app.numberType==='temporary')type.value='temporary';
    if(number&&!String(number.value||'').trim()&&app.numberType!=='temporary')number.value=String(app.applicationNumber||'');
  }
  function render(){
    ensureContext();const box=$('part567IntakeContext');if(!box)return;const app=target();
    if(!app){$('part567IntakeCaseTitle').textContent='指定された申請案件を確認できません';$('part567IntakeCaseMeta').textContent='申請番号管理から案件を選び直してください。';$('part567IntakeMatchState').textContent='対象案件なし';$('part567IntakeMatchState').className='is-warning';return}
    $('part567IntakeCaseTitle').textContent=`${app.applicationYear||''}-${appNumber(app)||''}${app.caseTitle?'｜'+app.caseTitle:''}`;
    $('part567IntakeCaseMeta').textContent=[app.vesselName,app.voyageNumber,app.containerNumber].filter(Boolean).join('｜')||'この案件と申請書の内容を照合します。';
    $('part567IntakeDetail').href=`application-detail.html?applicationId=${encodeURIComponent(app.id)}&tab=review`;
    $('part567IntakeCtu').href=`ctu-securing-calculator.html?applicationId=${encodeURIComponent(app.id)}`;
    fillEmptyCaseFields(app);updateMatch();
  }
  function updateMatch(){
    const app=target(),state=$('part567IntakeMatchState');if(!app||!state)return;
    const year=String($('intakeApplicationYear')?.value||'').trim(),number=String($('intakeApplicationNumber')?.value||'').trim(),targetYear=String(app.applicationYear||'').trim(),targetNumber=String(appNumber(app)||'').trim();
    state.className='';
    if(!year&&!number){state.textContent='取込後に申請番号を照合します';return}
    if(app.numberType==='temporary'){state.textContent='仮番号案件です。取込内容と案件情報を確認してください。';state.className='is-note';return}
    if(year===targetYear&&number===targetNumber){state.textContent='申請番号一致';state.className='is-ok';return}
    state.textContent=`選択案件 ${targetYear}-${targetNumber} と入力中の申請番号が一致していません`;state.className='is-warning';
  }
  ['intakeApplicationYear','intakeApplicationNumber','intakeNumberType'].forEach(id=>$(id)?.addEventListener('input',updateMatch));
  ['intakeApplicationYear','intakeApplicationNumber','intakeNumberType'].forEach(id=>$(id)?.addEventListener('change',updateMatch));
  const edit=$('intakeEditSection');if(edit)new MutationObserver(()=>setTimeout(()=>{render();updateMatch()},0)).observe(edit,{attributes:true,subtree:true,childList:true});
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,0));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,0)):setTimeout(render,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part567.js':'part567'});
})();
