(()=>{
  "use strict";
  const mode=()=>localStorage.getItem('iss-regulation-display-mode')||'prototype-warning';
  const endpoint=()=>String(window.ISSStorage?.getServerEndpoint?.()||localStorage.getItem('iss-server-endpoint')||'').replace(/\/$/,'');
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const inferTarget=()=>{
    const page=document.body.dataset.page||'';
    if(page==='detail'&&Array.isArray(window.UN_DATABASE)){
      const params=new URLSearchParams(location.search);const un=String(params.get('un')||'').replace(/\D/g,'').padStart(4,'0');const rowNo=Number(params.get('row'));let row=Number.isFinite(rowNo)?window.UN_DATABASE.find(x=>Number(x.sourceRow)===rowNo):null;row=row||window.UN_DATABASE.find(x=>String(x.unNumber).padStart(4,'0')===un);if(row){return {targetType:'dangerous-good-criteria',targetKey:`${String(row.unNumber||'').padStart(4,'0')}|${String(row.class||'-')}|${String(row.item||'-')}|${String(row.properShippingNameJa||'')}`,label:`国連番号${String(row.unNumber||'').padStart(4,'0')}`};}
    }
    return null;
  };
  const insertBanner=status=>{
    if(document.querySelector('.regulation-approval-banner'))return;
    const approved=Boolean(status?.approved);const formal=mode()==='approved-only';const banner=document.createElement('section');banner.className=`regulation-approval-banner${approved?' is-approved':formal?' is-blocked':''}`;
    if(approved){banner.innerHTML=`<strong>原典照合・承認済み</strong><small>承認証明：${esc(status.certificate_number||'-')}／承認日：${esc(status.approved_at?String(status.approved_at).slice(0,10):'-')}／原典版：${esc(status.source_edition||'-')}</small>`;}
    else if(formal){banner.innerHTML='<strong>正式利用対象外：原典照合・承認が完了していません</strong><small>正式運用モードでは、承認済み情報だけを業務判断に使用してください。原典本文を確認し、管理者へ照合・承認を依頼してください。</small>';document.documentElement.dataset.regulationApproval='blocked';}
    else{banner.innerHTML='<strong>試作・参考表示：原典照合・承認待ち</strong><small>整理情報には未承認の内容を含む可能性があります。実務判断では最新版の原典本文を確認してください。</small>';}
    const anchor=document.querySelector('.page-heading-row')||document.querySelector('main.workspace');if(anchor?.parentNode)anchor.insertAdjacentElement('afterend',banner);else document.body.prepend(banner);
  };
  const target=inferTarget();const base=endpoint();
  if(!target||!base){insertBanner(null);return;}
  fetch(`${base}/api/public/regulation-approval-status?${new URLSearchParams(target)}`,{credentials:'include',headers:{Accept:'application/json'}}).then(response=>response.ok?response.json():Promise.reject(new Error(String(response.status)))).then(insertBanner).catch(()=>insertBanner(null));
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/js/regulation-approval-gate.js":"part508"});
