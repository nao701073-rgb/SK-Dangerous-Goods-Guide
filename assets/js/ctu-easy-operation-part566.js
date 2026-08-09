(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNumber(app){return app?.numberType==='temporary'?(app.temporaryNumber||app.applicationNumber):app?.applicationNumber}
  function appSearchText(app){return [app?.applicationYear,appNumber(app),app?.caseTitle,app?.vesselName,app?.voyageNumber,app?.containerNumber,app?.applicantName,app?.caseData?.applicantName,app?.shipper,app?.caseData?.shipper].filter(Boolean).join(' ').toLowerCase()}
  function ensureCaseSearch(){
    const select=$('ctuCaseApplicationSelect');if(!select||$('part566CtuCaseSearch'))return;
    const label=select.closest('label');if(!label)return;
    const search=document.createElement('label');search.className='part566-ctu-case-search';search.innerHTML='案件を検索<input id="part566CtuCaseSearch" type="search" placeholder="申請番号・船名・コンテナ番号・案件名">';
    label.insertAdjacentElement('beforebegin',search);$('part566CtuCaseSearch').addEventListener('input',filterCases);
    const link=document.createElement('a');link.id='part566CtuCaseDetail';link.className='case-button case-button--secondary part566-ctu-case-detail';link.target='_blank';link.rel='noopener';link.hidden=true;link.textContent='申請詳細を開く';label.insertAdjacentElement('afterend',link);
  }
  function filterCases(){
    const input=$('part566CtuCaseSearch'),select=$('ctuCaseApplicationSelect');if(!input||!select)return;const term=String(input.value||'').trim().toLowerCase(),map=new Map(applications().map(x=>[String(x.id),x]));let shown=0;
    [...select.options].forEach((opt,index)=>{if(index===0){opt.hidden=false;return}const app=map.get(String(opt.value));const match=!term||(app?appSearchText(app).includes(term):String(opt.textContent||'').toLowerCase().includes(term));opt.hidden=!match;if(match)shown++});
    input.setAttribute('aria-label',shown?`案件検索、${shown}件表示`:'案件検索、該当なし');
  }
  function updateCaseLink(){const id=$('ctuCaseApplicationSelect')?.value,link=$('part566CtuCaseDetail');if(!link)return;if(!id){link.hidden=true;return}link.href=`application-detail.html?applicationId=${encodeURIComponent(id)}`;link.hidden=false}
  function ensureMslShortcuts(){
    if($('part566MslShortcuts'))return;
    const panel=$('quickMslEstimatorPanel');if(!panel)return;
    const box=document.createElement('div');box.id='part566MslShortcuts';box.className='part566-msl-shortcuts';box.innerHTML='<div><strong>取付部MSLを写真で確認</strong><span>刻印・銘板を撮影し、確認値をそのままMSL欄へ反映できます。</span></div><div class="part566-msl-shortcut-buttons"><button type="button" data-part566-photo="cargo">貨物側を撮影・選択 <b id="part566CargoPhotoState">未確認</b></button><button type="button" data-part566-photo="ctu">CTU側を撮影・選択 <b id="part566CtuPhotoState">未確認</b></button><button type="button" data-part566-point>取付点MSL台帳へ</button></div>';
    panel.insertAdjacentElement('beforebegin',box);
    box.addEventListener('click',event=>{const p=event.target.closest('[data-part566-photo]');if(p){panel.open=true;const role=p.dataset.part566Photo,id=role==='cargo'?'quickCargoMslPhotoInput':'quickCtuMslPhotoInput',input=$(id);input?.scrollIntoView({behavior:'smooth',block:'center'});input?.click();return}if(event.target.closest('[data-part566-point]')){panel.open=true;$('mslPointRegistryTitle')?.scrollIntoView({behavior:'smooth',block:'start'});$('mslPointRole')?.focus()}});
  }
  function updatePhotoStates(){
    const cargo=Boolean($('quickCargoMslPhotoPreview')&&!$('quickCargoMslPhotoPreview').hidden)||Number($('quickCargoMslPhotoValue')?.value)>0;
    const ctu=Boolean($('quickCtuMslPhotoPreview')&&!$('quickCtuMslPhotoPreview').hidden)||Number($('quickCtuMslPhotoValue')?.value)>0;
    if($('part566CargoPhotoState'))$('part566CargoPhotoState').textContent=cargo?'写真あり':'未確認';
    if($('part566CtuPhotoState'))$('part566CtuPhotoState').textContent=ctu?'写真あり':'未確認';
  }
  function fillMslReviewer(){
    const input=$('mslPointReviewer');if(!input||String(input.value||'').trim())return;try{const u=window.ISSAuthBridge?.currentAuth?.().user||{};input.value=String(u.displayName||u.name||u.loginId||'').trim()}catch{}
  }
  function refresh(){ensureCaseSearch();filterCases();updateCaseLink();ensureMslShortcuts();updatePhotoStates();fillMslReviewer()}
  refresh();
  $('ctuCaseApplicationSelect')?.addEventListener('change',()=>{updateCaseLink();filterCases()});
  ['quickCargoMslPhotoInput','quickCtuMslPhotoInput','quickCargoMslPhotoValue','quickCtuMslPhotoValue'].forEach(id=>$(id)?.addEventListener('change',updatePhotoStates));
  const select=$('ctuCaseApplicationSelect');if(select)new MutationObserver(()=>setTimeout(refresh,0)).observe(select,{childList:true,subtree:true});
  ['quickCargoMslPhotoPreview','quickCtuMslPhotoPreview'].forEach(id=>{const n=$(id);if(n)new MutationObserver(updatePhotoStates).observe(n,{attributes:true,attributeFilter:['hidden','src']})});
  window.addEventListener('iss:applications-changed',()=>setTimeout(refresh,0));
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part566.js':'part566'});
})();
