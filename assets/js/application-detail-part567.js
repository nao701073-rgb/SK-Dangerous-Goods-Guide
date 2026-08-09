(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-detail')return;
  const $=id=>document.getElementById(id);
  const appId=new URLSearchParams(location.search).get('applicationId')||'';
  function ensureActions(){
    if(!appId)return;const hero=$('applicationDetailHero');if(!hero||$('part567DetailActions'))return;
    const bar=document.createElement('nav');bar.id='part567DetailActions';bar.className='part567-detail-actions';bar.setAttribute('aria-label','この申請案件の操作');
    bar.innerHTML=`<a href="applications.html?applicationId=${encodeURIComponent(appId)}">申請番号管理</a><a href="application-intake-workflow.html?applicationId=${encodeURIComponent(appId)}">申請書を再確認</a><a href="ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}">固縛力参考算出</a>`;
    hero.insertAdjacentElement('afterend',bar);
    const back=document.querySelector('.app-header a[href^="applications.html"]');if(back)back.href=`applications.html?applicationId=${encodeURIComponent(appId)}`;
    const reviewActions=$('part566ReviewActions');if(reviewActions&&!reviewActions.querySelector('[data-part567-recheck]')){const a=document.createElement('a');a.dataset.part567Recheck='';a.href=`application-intake-workflow.html?applicationId=${encodeURIComponent(appId)}`;a.textContent='申請書を再確認';reviewActions.appendChild(a)}
  }
  const observer=new MutationObserver(()=>ensureActions());observer.observe(document.body,{childList:true,subtree:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(ensureActions,0)):setTimeout(ensureActions,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part567.js':'part567'});
})();
