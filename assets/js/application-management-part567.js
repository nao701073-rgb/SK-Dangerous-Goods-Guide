(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNumber(app){return app?.numberType==='temporary'?(app.temporaryNumber||app.applicationNumber):app?.applicationNumber}
  function searchText(app){return [app?.applicationYear,appNumber(app),app?.caseTitle,app?.vesselName,app?.voyageNumber,app?.containerNumber,app?.applicantName,app?.caseData?.applicantName,app?.shipper,app?.caseData?.shipper].filter(Boolean).join(' ').toLowerCase()}
  function selectedApp(){const id=$('quickApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function reviewEvidence(app){return app?.caseData?.intake?.reviewEvidence||null}
  function cargoCount(app){return Number(app?.caseData?.cargoItems?.length||app?.cargoItems?.length||0)}
  function ensureSearchHelp(){
    const search=$('part566ApplicationSearch');if(!search||$('part567SearchHelp'))return;
    const wrap=document.createElement('div');wrap.id='part567SearchHelp';wrap.className='part567-search-help';wrap.innerHTML='<span id="part567SearchCount">案件名・船名・コンテナ番号でも検索できます</span><button type="button" id="part567SearchClear">検索をクリア</button>';
    search.insertAdjacentElement('afterend',wrap);
    $('part567SearchClear')?.addEventListener('click',()=>{search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));search.focus()});
    search.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&search.value){event.preventDefault();search.value='';search.dispatchEvent(new Event('input',{bubbles:true}));return}
      if(event.key!=='Enter')return;
      const term=String(search.value||'').trim().toLowerCase();if(!term)return;
      const match=applications().find(app=>searchText(app).includes(term));if(!match)return;
      event.preventDefault();const select=$('quickApplicationSelect');if(!select)return;select.value=String(match.id);select.dispatchEvent(new Event('change',{bubbles:true}));
    });
  }
  function updateSearchCount(){
    const input=$('part566ApplicationSearch'),out=$('part567SearchCount');if(!input||!out)return;
    const term=String(input.value||'').trim().toLowerCase(),count=applications().filter(app=>!term||searchText(app).includes(term)).length;
    out.textContent=term?`該当 ${count}件。Enterで先頭案件を選択できます。`:`登録済み ${applications().length}件。Enterで検索結果の先頭を選択できます。`;
  }
  function enhanceSelectedCard(){
    const box=$('part566ApplicationSelected'),app=selectedApp();if(!box||!app)return;
    const actions=box.querySelector('.part566-application-selected__actions');
    if(actions&&!actions.querySelector('[data-part567-review]')){
      const link=document.createElement('a');link.className='button-link';link.dataset.part567Review='';link.textContent='申請書を確認';actions.prepend(link);
    }
    const reviewLink=actions?.querySelector('[data-part567-review]');if(reviewLink)reviewLink.href=`application-intake-workflow.html?applicationId=${encodeURIComponent(app.id)}`;
    const summary=box.querySelector('.part566-application-selected__summary');if(summary){
      let chips=summary.querySelector('.part567-case-chips');if(!chips){chips=document.createElement('div');chips.className='part567-case-chips';summary.appendChild(chips)}
      const e=reviewEvidence(app),review=e?(Number(e.unresolvedCount||0)>0?'要確認あり':'申請書確認済み'):'確認記録なし',points=Array.isArray(app?.ctuMslPointRegistry)?app.ctuMslPointRegistry.length:0;
      chips.innerHTML=`<span>${esc(review)}</span><span>危険物 ${cargoCount(app)}件</span>${points?`<span>MSL取付点 ${points}件</span>`:''}`;
    }
  }
  function ensureMemoState(){
    const memo=$('quickApplicationMemo');if(!memo||$('part567MemoState'))return;
    const state=document.createElement('span');state.id='part567MemoState';state.className='part567-memo-state';state.textContent='';
    memo.insertAdjacentElement('afterend',state);
    memo.addEventListener('input',updateMemoState);
    memo.addEventListener('keydown',event=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();$('quickSaveMemo')?.click()}});
  }
  function updateMemoState(){
    const memo=$('quickApplicationMemo'),state=$('part567MemoState'),app=selectedApp();if(!memo||!state)return;
    if(!app){state.textContent='';state.classList.remove('is-unsaved');return}
    const changed=String(memo.value||'')!==String(app.note||'');state.textContent=changed?'未保存（Ctrl+Enterで保存）':'保存済み';state.classList.toggle('is-unsaved',changed);
  }
  function selectRequested(){
    if(!requestedId)return;const select=$('quickApplicationSelect');if(!select||select.dataset.part567RequestedApplied==='1')return;
    if(![...select.options].some(opt=>String(opt.value)===String(requestedId)))return;
    select.dataset.part567RequestedApplied='1';select.value=requestedId;select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function refresh(){ensureSearchHelp();ensureMemoState();selectRequested();updateSearchCount();enhanceSelectedCard();updateMemoState()}
  document.addEventListener('input',event=>{if(event.target?.id==='part566ApplicationSearch')updateSearchCount()});
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(refresh,0));
  $('quickSaveMemo')?.addEventListener('click',()=>setTimeout(updateMemoState,40));
  window.addEventListener('iss:applications-changed',()=>setTimeout(refresh,0));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0)):setTimeout(refresh,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part567.js':'part567'});
})();
