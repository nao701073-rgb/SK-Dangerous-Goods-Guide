(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-detail')return;
  const $=id=>document.getElementById(id);
  const appId=new URLSearchParams(location.search).get('applicationId')||'';
  let panelObserver=null;
  function ensureActions(){
    const panel=$('detailTabReview');
    if(!panel)return false;
    if(!panelObserver){panelObserver=new MutationObserver(ensureActions);panelObserver.observe(panel,{childList:true,subtree:true})}
    if($('part566ReviewActions'))return true;
    const record=panel.querySelector('.part565-review-record');if(!record)return true;
    const box=document.createElement('div');box.id='part566ReviewActions';box.className='part566-review-actions';
    const ctu=`ctu-securing-calculator.html${appId?`?applicationId=${encodeURIComponent(appId)}`:''}`;
    box.innerHTML=`<span>次の操作</span><button type="button" data-part566-tab="application">申請内容</button><button type="button" data-part566-tab="files">写真・添付</button><a href="${ctu}">固縛力参考算出へ</a>`;
    record.appendChild(box);
    box.addEventListener('click',event=>{const b=event.target.closest('[data-part566-tab]');if(!b)return;document.querySelector(`[data-detail-tab="${b.dataset.part566Tab}"]`)?.click()});
    return true;
  }
  const rootObserver=new MutationObserver(()=>{if(ensureActions())rootObserver.disconnect()});
  rootObserver.observe(document.body,{childList:true,subtree:true});
  const boot=()=>setTimeout(ensureActions,20);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',boot):boot();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part566.js':'part566'});
})();
