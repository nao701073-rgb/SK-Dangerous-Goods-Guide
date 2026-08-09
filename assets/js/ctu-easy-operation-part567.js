(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=id=>Math.max(0,Number($(id)?.value)||0);
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNumber(app){return app?.numberType==='temporary'?(app.temporaryNumber||app.applicationNumber):app?.applicationNumber}
  function currentApp(){const id=$('ctuCaseApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function ensureCaseContext(){
    const section=$('ctuCommonCaseSection');if(!section||$('part567CtuCaseContext'))return;
    const box=document.createElement('div');box.id='part567CtuCaseContext';box.className='part567-ctu-case-context';box.hidden=true;
    section.querySelector('.ctu-case-review-shell')?.insertAdjacentElement('beforebegin',box) || section.appendChild(box);
  }
  function renderCaseContext(){
    ensureCaseContext();const box=$('part567CtuCaseContext'),app=currentApp();if(!box)return;
    if(!app){box.hidden=true;box.innerHTML='';return}
    const cargo=Number(app?.caseData?.cargoItems?.length||app?.cargoItems?.length||0),review=app?.caseData?.intake?.reviewEvidence,reviewText=review?(Number(review.unresolvedCount||0)>0?'申請書：要確認あり':'申請書：確認済み'):'申請書：記録なし';
    box.innerHTML=`<div><span>現在の案件</span><strong>${esc(app.applicationYear||'')}-${esc(appNumber(app)||'')}${app.caseTitle?'｜'+esc(app.caseTitle):''}</strong><small>${esc([app.vesselName,app.containerNumber].filter(Boolean).join('｜')||'案件情報を算出条件へ引き継いでいます')}</small></div><div class="part567-ctu-case-tags"><b>${esc(reviewText)}</b><b>危険物 ${cargo}件</b></div><div class="part567-ctu-case-actions"><a href="application-intake-workflow.html?applicationId=${encodeURIComponent(app.id)}">申請書確認</a><a href="application-detail.html?applicationId=${encodeURIComponent(app.id)}" target="_blank" rel="noopener">申請詳細</a></div>`;box.hidden=false;
  }
  function ensureMslSummary(){
    const shortcuts=$('part566MslShortcuts');if(!shortcuts||$('part567MslSummary'))return;
    const box=document.createElement('section');box.id='part567MslSummary';box.className='part567-msl-summary';box.innerHTML='<div class="part567-msl-summary__title"><span>直接固縛の採用MSL</span><strong id="part567AdoptedMsl">確認中</strong></div><div class="part567-msl-summary__values" id="part567MslValues"></div><p id="part567CombinationState"></p>';
    shortcuts.insertAdjacentElement('afterend',box);
  }
  function renderMslSummary(){
    ensureMslSummary();const box=$('part567MslSummary');if(!box)return;
    const category=$('quickMaterialCategory')?.value||'tensile',method=$('quickMethod')?.value||'direct',device=num('quickStrength'),cargo=num('quickCargoMsl'),ctu=num('quickCtuMsl'),adopted=$('part567AdoptedMsl'),values=$('part567MslValues'),comb=$('part567CombinationState');
    if(values)values.innerHTML=`<span>固縛材 <b>${device?device.toFixed(1):'―'} kN</b></span><span>貨物側 <b>${cargo?cargo.toFixed(1):'―'} kN</b></span><span>CTU側 <b>${ctu?ctu.toFixed(1):'―'} kN</b></span>`;
    box.classList.remove('is-warning','is-ok','is-note');
    if(category==='support'){
      if(adopted)adopted.textContent='支保・当て材のみ';box.classList.add('is-note');
    }else if(method==='topover'){
      if(adopted)adopted.textContent='トップオーバーはSTFで評価';box.classList.add('is-note');
    }else if(device>0&&cargo>0&&ctu>0){
      const min=Math.min(device,cargo,ctu),limiting=min===device?'固縛材':min===cargo?'貨物側取付部':'CTU側固縛点';
      if(adopted)adopted.textContent=`${min.toFixed(1)} kN（制限：${limiting}）`;box.classList.add('is-ok');
    }else{
      if(adopted)adopted.textContent='MSL未入力あり';box.classList.add('is-warning');
    }
    if(comb){
      if(category==='combined')comb.textContent=$('quickCombinationConfirmed')?.checked?'併用成立条件：確認済み。引張系と支保材の有効寄与を別々に算出し、成立方向のみ合算します。':'併用成立条件：未確認。同一方向は単純加算せず、保守的に強い方のみを採用します。';
      else comb.textContent=category==='support'?'支保・当て材の寄与を単独で評価します。':'引張系固縛材の寄与を評価します。';
    }
  }
  function refresh(){renderCaseContext();renderMslSummary()}
  $('ctuCaseApplicationSelect')?.addEventListener('change',()=>setTimeout(renderCaseContext,0));
  ['quickMaterialCategory','quickMethod','quickStrength','quickCargoMsl','quickCtuMsl','quickCombinationConfirmed'].forEach(id=>{const node=$(id);node?.addEventListener('input',renderMslSummary);node?.addEventListener('change',renderMslSummary)});
  window.addEventListener('iss:applications-changed',()=>setTimeout(renderCaseContext,0));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,20)):setTimeout(refresh,20);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part567.js':'part567'});
})();
