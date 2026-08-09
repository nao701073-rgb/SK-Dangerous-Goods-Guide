(() => {
  'use strict';
  const policy=window.SK_PUBLICATION_SCOPE_POLICY||{};
  let serverMode='';
  let catalogMap=new Map();
  let catalogPromise=null;
  const currentMode=()=>serverMode||localStorage.getItem('iss-publication-scope')||policy.defaultMode||'prototype-review';
  const endpoint=()=>String(window.ISSStorage?.getServerEndpoint?.()||localStorage.getItem('iss-server-endpoint')||'').replace(/\/$/,'');
  const normalize=value=>{
    try{
      const url=new URL(value,location.href);if(url.origin!==location.origin&&url.protocol!=='file:')return'';
      let p=decodeURIComponent(url.pathname);const match=p.match(/(?:^|\/)(references|assets|database)\/.+$/);
      if(match)p=match[0].replace(/^\//,'');else p=p.replace(/^.*?\/SK-Dangerous-Goods-Guide\//,'').replace(/^\//,'');return p;
    }catch{return'';}
  };
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fallback=item=>({assetKey:item.assetKey,status:item.rightsStatus||'unreviewed',allowedScopes:item.allowedScopes||[],publicTreatment:item.publicTreatment||'blocked',restrictionReason:item.reason||'',source_url:item.sourceUrl||''});
  async function loadScope(){const base=endpoint();if(!base)return;try{const response=await fetch(`${base}/system/publication-scope`,{credentials:'include',headers:{Accept:'application/json'}});if(response.ok){const scope=await response.json();serverMode=scope.mode||'';if(serverMode)localStorage.setItem('iss-publication-scope',serverMode);}}catch{}}
  async function loadCatalog(){
    if(catalogPromise)return catalogPromise;
    catalogPromise=(async()=>{await loadScope();const response=await fetch('../data/publication-rights-catalog.json',{cache:'no-store'});if(!response.ok)throw new Error('rights catalog unavailable');const catalog=await response.json();catalogMap=new Map((catalog.items||[]).map(item=>[item.filePath,item]));return catalogMap;})().catch(()=>catalogMap);
    return catalogPromise;
  }
  async function statusFor(item){
    const base=endpoint();if(!base)return fallback(item);
    try{const response=await fetch(`${base}/public/publication-rights-status?${new URLSearchParams({assetKey:item.assetKey})}`,{credentials:'include',headers:{Accept:'application/json'}});if(!response.ok)throw new Error();return await response.json();}catch{return fallback(item);}
  }
  function evaluate(status,mode){
    if(mode==='prototype-review')return {allow:true,warning:true,metadata:false};
    if(status.expired||status.status==='expired'||status.status==='prohibited')return {allow:false,metadata:false};
    const scopes=status.allowed_scopes||status.allowedScopes||[];const treatment=status.public_treatment||status.publicTreatment||'blocked';
    if(mode==='public-approved')return {allow:scopes.includes('public-approved')&&['approved','metadata-only'].includes(status.status)&&treatment!=='blocked',metadata:['metadata-only','external-link-only'].includes(treatment)};
    if(mode==='internal-authenticated')return {allow:scopes.includes('internal-authenticated')&&['approved','restricted','metadata-only'].includes(status.status),metadata:['metadata-only','external-link-only'].includes(treatment)};
    if(mode==='internal-restricted')return {allow:scopes.some(x=>['internal-restricted','internal-authenticated'].includes(x))&&['approved','restricted','metadata-only'].includes(status.status),metadata:['metadata-only','external-link-only'].includes(treatment)};
    return {allow:false,metadata:false};
  }
  async function authorizePath(value){
    const path=normalize(value);if(!path)return {managed:false,allow:true,path};await loadCatalog();const item=catalogMap.get(path);if(!item)return {managed:false,allow:true,path};const status=await statusFor(item);return {managed:true,item,status,path,...evaluate(status,currentMode())};
  }
  function ensureDialog(){
    let dialog=document.getElementById('publicationScopeBlockedDialog');if(dialog)return dialog;
    dialog=document.createElement('dialog');dialog.id='publicationScopeBlockedDialog';dialog.className='publication-scope-dialog';dialog.innerHTML='<form method="dialog"><header><h2>資料の公開範囲を確認してください</h2><button value="cancel" aria-label="閉じる">×</button></header><div class="publication-scope-dialog__body"></div><footer><button value="cancel">閉じる</button></footer></form>';document.body.appendChild(dialog);return dialog;
  }
  function showBlocked(result){
    const {item,status}=result;const dialog=ensureDialog();const treatment=status.public_treatment||status.publicTreatment||item.publicTreatment||'blocked';dialog.querySelector('.publication-scope-dialog__body').innerHTML=`<p><strong>${esc(item.displayLabel||item.filePath)}</strong></p><p>現在の公開範囲「${esc(policy.modes?.[currentMode()]?.label||currentMode())}」では、この資料ファイルを直接表示できません。</p><dl><div><dt>状態</dt><dd>${esc(policy.statusLabels?.[status.status]||status.status||'未確認')}</dd></div><div><dt>表示方法</dt><dd>${esc(policy.publicTreatmentLabels?.[treatment]||treatment)}</dd></div></dl><p>${esc(status.restriction_reason||status.restrictionReason||item.reason||'権利・利用条件の確認が完了するまで表示を制限します。')}</p>${status.source_url?`<p><a href="${esc(status.source_url)}" target="_blank" rel="noopener noreferrer">公式情報を別画面で確認</a></p>`:''}`;dialog.showModal();
  }
  function decorate(anchor,item){
    if(anchor.dataset.publicationScopeBound==='1')return;anchor.dataset.publicationScopeBound='1';anchor.classList.add('publication-scope-target');const mark=document.createElement('span');mark.className='publication-scope-mark';mark.textContent=currentMode()==='prototype-review'?'権利確認中':'公開範囲管理';anchor.insertAdjacentElement('afterend',mark);
    anchor.addEventListener('click',async event=>{const result=await authorizePath(anchor.getAttribute('href'));if(!result.managed||result.allow&&!result.metadata)return;event.preventDefault();if(result.allow&&result.metadata&&result.status.source_url){window.open(result.status.source_url,'_blank','noopener,noreferrer');return;}showBlocked(result);});
  }
  async function scan(root=document){await loadCatalog();root.querySelectorAll?.('a[href]').forEach(anchor=>{const item=catalogMap.get(normalize(anchor.getAttribute('href')));if(item)decorate(anchor,item);});}
  async function init(){
    try{await scan(document);const observer=new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(node=>{if(node.nodeType!==1)return;if(node.matches?.('a[href]')){const item=catalogMap.get(normalize(node.getAttribute('href')));if(item)decorate(node,item);}scan(node);})));observer.observe(document.body,{childList:true,subtree:true});document.documentElement.dataset.publicationScope=currentMode();}catch{}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.SKPublicationScope={mode:currentMode,refresh:init,authorizePath,showBlocked};
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/publication-scope-gate.js':'part509'});
