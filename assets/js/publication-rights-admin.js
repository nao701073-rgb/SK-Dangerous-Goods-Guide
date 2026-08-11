(() => {
  'use strict';
  const api=window.ISSApi;
  const policy=window.SK_PUBLICATION_SCOPE_POLICY||{};
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const state={page:1,pageCount:1,items:[],selected:null,remote:Boolean(api?.isConfigured?.())};
  const checklist=[
    ['rights-holder','権利者・発行者を特定した'],
    ['terms-license','契約・公式利用条件・ライセンスを確認した'],
    ['reproduction-scope','複製・抜粋・画像化・転載の可否を確認した'],
    ['internal-scope','社内利用の対象者・部署・保存場所を確認した'],
    ['public-scope','外部公開の可否、または対象外であることを確認した'],
    ['attribution','必要な出典・著作権表示を確認した'],
    ['expiry-update','期限・版更新・契約変更時の再確認条件を確認した'],
    ['checksum-version','対象ファイルの版・SHA-256を確認した']
  ];
  const statusLabel=value=>policy.statusLabels?.[value]||({unregistered:'台帳未登録'}[value]||value||'-');
  const classLabel=value=>({
    'licensed-international-code':'国際規則・契約確認対象','official-domestic-law':'国内法令','international-guidance':'国際ガイダンス',
    'internal-created-source-dependent':'整理情報・AI要約','third-party-or-unknown':'第三者・不明','user-upload':'利用者登録資料','system-original':'システム作成物'
  }[value]||value||'-');
  const bytes=value=>{const n=Number(value)||0;if(n>=1024**3)return`${(n/1024**3).toFixed(1)}GB`;if(n>=1024**2)return`${(n/1024**2).toFixed(1)}MB`;if(n>=1024)return`${(n/1024).toFixed(1)}KB`;return`${n}B`;};
  const message=(text,type='')=>{const el=$('publicationRightsMessage');if(!el)return;el.textContent=text;el.dataset.type=type;};
  const request=(path,options)=>api.request(path,options);

  function renderChecklist(){
    $('rightsChecklist').innerHTML=checklist.map(([key,label])=>`<label><input type="checkbox" data-rights-check="${esc(key)}"><span>${esc(label)}</span></label>`).join('');
  }
  function summaryFromCatalog(catalog){
    const items=catalog.items||[];return {total:items.length,approved:0,restricted:0,metadata_only:0,pending:items.length,prohibited:0,unresolved_high_risk:items.filter(x=>x.riskLevel==='high').length,total_bytes:catalog.summary?.totalBytes||0};
  }
  function renderSummary(summary={},scope={}){
    $('rightsTotal').textContent=summary.total??'-';$('rightsApproved').textContent=summary.approved??0;$('rightsRestricted').textContent=summary.restricted??0;$('rightsMetadataOnly').textContent=summary.metadata_only??0;$('rightsPending').textContent=summary.pending??0;$('rightsProhibited').textContent=summary.prohibited??0;$('rightsHighRisk').textContent=summary.unresolved_high_risk??0;$('rightsBytes').textContent=bytes(summary.total_bytes);
    $('publicationScopeMode').value=scope.mode||localStorage.getItem('iss-publication-scope')||policy.defaultMode||'prototype-review';
  }
  function renderItems(items){
    const host=$('publicationRightsList');
    if(!items.length){host.innerHTML='<p class="empty-state">該当する資料はありません。</p>';return;}
    host.innerHTML=items.map(item=>{
      const status=item.status||item.rightsStatus||'unreviewed';const risk=item.risk_level||item.riskLevel||'medium';const reason=item.restriction_reason||item.review_note||item.reason||'';
      return `<article class="rights-card" data-rights-id="${esc(item.id||item.assetKey)}">
        <div class="rights-card__top"><h3>${esc(item.display_label||item.displayLabel||item.file_path||item.filePath)}</h3><span class="rights-pill ${status==='approved'?'is-approved':''}">${esc(statusLabel(status))}</span></div>
        <div class="rights-card__meta"><span class="rights-pill">${esc(classLabel(item.source_class||item.sourceClass))}</span><span class="rights-pill is-${esc(risk)}">リスク：${esc(risk==='high'?'高':risk==='medium'?'中':'低')}</span><span class="rights-pill">${esc(bytes(item.file_size||item.fileSize))}</span></div>
        <p class="rights-card__path">${esc(item.file_path||item.filePath||'')}</p>${reason?`<p class="rights-card__reason">${esc(reason)}</p>`:''}
        <div class="rights-card__actions"><button type="button" data-open-rights="${esc(item.id||item.assetKey)}">確認・決定を開く</button></div>
      </article>`;
    }).join('');
    host.querySelectorAll('[data-open-rights]').forEach(btn=>btn.addEventListener('click',()=>openItem(btn.dataset.openRights)));
  }
  function filters(){return {status:$('rightsStatusFilter').value,sourceClass:$('rightsClassFilter').value,riskLevel:$('rightsRiskFilter').value,search:$('rightsSearch').value.trim(),page:state.page,pageSize:30};}
  async function loadRemote(){
    const [summary,list]=await Promise.all([request('/publication-rights/summary'),request(`/publication-rights/items?${new URLSearchParams(filters())}`)]);
    state.items=list.items||[];state.page=list.page||1;state.pageCount=list.pageCount||1;renderSummary(summary.summary,summary.scope);renderItems(state.items);$('rightsPageInfo').textContent=`${state.page} / ${state.pageCount}`;message(`中央台帳を表示しています。最終更新：${summary.latestCatalogRun?.executed_at?new Date(summary.latestCatalogRun.executed_at).toLocaleString('ja-JP'):'未実行'}`,'ok');
  }
  async function loadLocal(){
    const response=await fetch('../data/publication-rights-catalog.json',{cache:'no-store'});const catalog=await response.json();let items=catalog.items||[];const f=filters();if(f.status)items=items.filter(x=>(x.rightsStatus||'unreviewed')===f.status);if(f.sourceClass)items=items.filter(x=>x.sourceClass===f.sourceClass);if(f.riskLevel)items=items.filter(x=>x.riskLevel===f.riskLevel);if(f.search){const q=f.search.toLowerCase();items=items.filter(x=>[x.filePath,x.displayLabel,x.assetKey].join(' ').toLowerCase().includes(q));}
    state.pageCount=Math.max(1,Math.ceil(items.length/30));state.page=Math.min(state.page,state.pageCount);state.items=items.slice((state.page-1)*30,state.page*30);renderSummary(summaryFromCatalog(catalog),{mode:localStorage.getItem('iss-publication-scope')||policy.defaultMode});renderItems(state.items);$('rightsPageInfo').textContent=`${state.page} / ${state.pageCount}`;message('中央サーバー未接続のため、静的台帳を読取専用で表示しています。決定・承認はサーバー接続後に行ってください。','warning');
  }
  async function load(){try{state.remote=Boolean(api?.isConfigured?.());if(state.remote)await loadRemote();else await loadLocal();}catch(error){message(error.message||'権利台帳を取得できませんでした。','error');}}
  function selectedById(id){return state.items.find(item=>String(item.id||item.assetKey)===String(id));}
  function openItem(id){
    const item=selectedById(id);if(!item)return;state.selected=item;$('rightsItemId').value=item.id||'';$('rightsDialogTitle').textContent=item.display_label||item.displayLabel||'対象資料';$('rightsFilePath').textContent=item.file_path||item.filePath||'-';$('rightsSourceClass').textContent=classLabel(item.source_class||item.sourceClass);$('rightsCurrentStatus').textContent=statusLabel(item.status||item.rightsStatus||'unreviewed');$('rightsChecksum').textContent=item.checksum_sha256||item.checksumSha256||'-';$('rightsHolder').value=item.rights_holder||item.rightsHolder||'';$('rightsBasis').value=item.rights_basis||item.rightsBasis||'';$('rightsLicenseReference').value=item.license_reference||item.licenseReference||'';$('rightsSourceUrl').value=item.source_url||item.sourceUrl||'';$('rightsAttribution').value=item.attribution_text||item.attributionText||'';$('rightsComment').value=item.review_note||item.restriction_reason||item.reason||'';$('rightsDecision').value=['approved','restricted','metadata-only','prohibited'].includes(item.status)?item.status:'restricted';$('rightsPublicTreatment').value=item.public_treatment||item.publicTreatment||'blocked';$('rightsExpiryDate').value=item.rights_expiry_date?String(item.rights_expiry_date).slice(0,10):'';$('rightsNextReview').value=item.next_review_due?String(item.next_review_due).slice(0,10):'';
    document.querySelectorAll('[data-rights-check]').forEach(box=>box.checked=false);const existing=Array.isArray(item.rights_checklist)?item.rights_checklist:[];existing.forEach(x=>{const box=document.querySelector(`[data-rights-check="${CSS.escape(x.key)}"]`);if(box)box.checked=Boolean(x.checked);});const scopes=item.allowed_scopes||item.allowedScopes||[];document.querySelectorAll('.rights-scope-options input').forEach(box=>box.checked=scopes.includes(box.value));
    const status=item.status||'unreviewed';const remote=state.remote;$('submitRightsReview').hidden=!remote||!['unreviewed','prepared','returned'].includes(status);$('completeRightsReview').hidden=!remote||status!=='submitted';$('returnRightsItem').hidden=!remote||status!=='submitted';$('decideRightsScope').hidden=!remote||status!=='reviewed';$('publicationRightsDialog').showModal();
  }
  const payloadBase=()=>({comment:$('rightsComment').value.trim(),rightsHolder:$('rightsHolder').value.trim(),rightsBasis:$('rightsBasis').value.trim(),licenseReference:$('rightsLicenseReference').value.trim(),sourceUrl:$('rightsSourceUrl').value.trim(),attributionText:$('rightsAttribution').value.trim()});
  const checklistPayload=()=>checklist.map(([key])=>({key,checked:Boolean(document.querySelector(`[data-rights-check="${CSS.escape(key)}"]`)?.checked),note:''}));
  async function runAction(action){
    if(!state.selected?.id)return;try{
      if(action==='submit')await request(`/publication-rights/items/${state.selected.id}/submit`,{method:'POST',body:JSON.stringify(payloadBase())});
      if(action==='review')await request(`/publication-rights/items/${state.selected.id}/review`,{method:'POST',body:JSON.stringify({decision:'reviewed',comment:$('rightsComment').value.trim(),checklist:checklistPayload()})});
      if(action==='return')await request(`/publication-rights/items/${state.selected.id}/review`,{method:'POST',body:JSON.stringify({decision:'returned',comment:$('rightsComment').value.trim(),checklist:checklistPayload()})});
      if(action==='decide'){const allowedScopes=[...document.querySelectorAll('.rights-scope-options input:checked')].map(x=>x.value);await request(`/publication-rights/items/${state.selected.id}/decide`,{method:'POST',body:JSON.stringify({decision:$('rightsDecision').value,allowedScopes,publicTreatment:$('rightsPublicTreatment').value,comment:$('rightsComment').value.trim(),rightsExpiryDate:$('rightsExpiryDate').value,nextReviewDue:$('rightsNextReview').value})});}
      $('publicationRightsDialog').close();await load();
    }catch(error){message(error.message||'処理に失敗しました。','error');}
  }
  renderChecklist();
  $('refreshPublicationRights').addEventListener('click',load);$('searchPublicationRights').addEventListener('click',()=>{state.page=1;load();});$('rightsSearch').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();state.page=1;load();}});$('rightsPrev').addEventListener('click',()=>{if(state.page>1){state.page--;load();}});$('rightsNext').addEventListener('click',()=>{if(state.page<state.pageCount){state.page++;load();}});
  $('exportPublicationDecisions').addEventListener('click',async()=>{if(!state.remote)return message('決定台帳の出力には中央サーバー接続が必要です。','warning');try{const data=await request('/publication-rights/export');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`publication-rights-decisions-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);message('公開用パッケージ作成に使用する決定台帳を出力しました。','ok');}catch(error){message(error.message||'決定台帳を出力できませんでした。','error');}});
  $('rebuildPublicationCatalog').addEventListener('click',async()=>{if(!state.remote)return message('資料台帳の更新には中央サーバー接続が必要です。','warning');try{message('資料台帳を更新しています。');await request('/publication-rights/catalog/rebuild',{method:'POST',body:'{}'});await load();}catch(error){message(error.message||'台帳を更新できませんでした。','error');}});
  $('savePublicationScope').addEventListener('click',async()=>{const mode=$('publicationScopeMode').value;localStorage.setItem('iss-publication-scope',mode);try{if(state.remote)await request('/admin/publication-scope',{method:'PUT',body:JSON.stringify({mode,note:'システム設定画面から更新'})});message(`公開範囲を「${policy.modes?.[mode]?.label||mode}」に設定しました。`,'ok');}catch(error){message(error.message||'公開範囲を保存できませんでした。','error');}});
  $('submitRightsReview').addEventListener('click',()=>runAction('submit'));$('completeRightsReview').addEventListener('click',()=>runAction('review'));$('returnRightsItem').addEventListener('click',()=>runAction('return'));$('decideRightsScope').addEventListener('click',()=>runAction('decide'));
  load();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/publication-rights-admin.js':'part509'});
