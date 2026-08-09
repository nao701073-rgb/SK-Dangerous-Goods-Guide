(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNumber(app){return app?.numberType==='temporary'?(app.temporaryNumber||app.applicationNumber):app?.applicationNumber}
  function searchText(app){return [app?.applicationYear,appNumber(app),app?.caseTitle,app?.vesselName,app?.voyageNumber,app?.containerNumber,app?.applicantName,app?.caseData?.applicantName,app?.shipper,app?.caseData?.shipper].filter(Boolean).join(' ').toLowerCase()}
  function ensureUi(){
    const select=$('quickApplicationSelect');if(!select||$('part566ApplicationSearch'))return;
    const grid=select.closest('.application-quick-grid');if(!grid)return;
    const search=document.createElement('label');search.className='part566-application-search';search.innerHTML='案件を検索<input id="part566ApplicationSearch" type="search" placeholder="申請番号・船名・コンテナ番号・案件名">';
    grid.insertBefore(search,select.closest('label'));
    const card=document.createElement('div');card.id='part566ApplicationSelected';card.className='part566-application-selected';card.hidden=true;
    grid.insertAdjacentElement('afterend',card);
    $('part566ApplicationSearch').addEventListener('input',filterOptions);
  }
  function filterOptions(){
    const select=$('quickApplicationSelect'),input=$('part566ApplicationSearch');if(!select||!input)return;
    const term=String(input.value||'').trim().toLowerCase(),map=new Map(applications().map(app=>[String(app.id),app]));let shown=0;
    [...select.options].forEach((opt,index)=>{if(index===0){opt.hidden=false;return}const app=map.get(String(opt.value));const match=!term||(app?searchText(app).includes(term):String(opt.textContent||'').toLowerCase().includes(term));opt.hidden=!match;if(match)shown++});
    input.setAttribute('aria-label',shown?`案件検索、${shown}件表示`:'案件検索、該当なし');
  }
  function renderSelected(){
    const select=$('quickApplicationSelect'),box=$('part566ApplicationSelected');if(!select||!box)return;const app=applications().find(x=>String(x.id)===String(select.value));
    if(!app){box.hidden=true;box.innerHTML='';return}
    const detail=`application-detail.html?applicationId=${encodeURIComponent(app.id)}`;
    const files=`${detail}&tab=files`,ctu=`ctu-securing-calculator.html?applicationId=${encodeURIComponent(app.id)}`;
    box.innerHTML=`<div class="part566-application-selected__summary"><span>選択中</span><strong>${esc(app.applicationYear||'')}-${esc(appNumber(app)||'')}</strong><small>${esc([app.caseTitle,app.vesselName,app.containerNumber].filter(Boolean).join('｜')||'補完情報を追加できます')}</small></div><div class="part566-application-selected__actions"><a class="button-link" href="${detail}" target="_blank" rel="noopener">申請詳細</a><a class="button-link" href="${files}" target="_blank" rel="noopener">写真・添付</a><a class="button-link" href="${ctu}">固縛力算出</a></div>`;box.hidden=false;
  }
  function refresh(){ensureUi();filterOptions();renderSelected()}
  ensureUi();refresh();
  $('quickApplicationSelect')?.addEventListener('change',renderSelected);
  window.addEventListener('iss:applications-changed',()=>setTimeout(refresh,0));
  const select=$('quickApplicationSelect');if(select)new MutationObserver(()=>setTimeout(refresh,0)).observe(select,{childList:true,subtree:true});
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part566.js':'part566'});
})();
