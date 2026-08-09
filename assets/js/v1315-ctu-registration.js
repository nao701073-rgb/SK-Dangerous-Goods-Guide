(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator'||document.documentElement.dataset.v1315CtuRegistration==='1')return;
  document.documentElement.dataset.v1315CtuRegistration='1';
  const $=id=>document.getElementById(id);const btn=$('ctuRegisterSimple'),msg=$('ctuRegistrationMessage'),review=$('ctuReviewSection');
  if(!btn)return;
  function keepClickable(){if(btn.disabled)btn.disabled=false;btn.setAttribute('aria-disabled',String(!(window.SKCTUReview?.isComplete?.())));}
  function missingReason(){
    const checks=[...document.querySelectorAll('[data-ctu-review]')];const unchecked=checks.find(x=>!x.checked);const reviewer=String($('ctuReviewer')?.value||'').trim();
    if(unchecked)return '「入力値・強度根拠・算出結果を確認しました」にチェックしてから登録してください。';
    if(!reviewer)return '確認者を入力してから登録してください。';
    return '登録前の確認項目を確認してください。';
  }
  btn.addEventListener('click',e=>{
    if(window.SKCTUReview?.isComplete?.())return;
    e.preventDefault();e.stopImmediatePropagation();
    if(msg){msg.textContent=missingReason();msg.classList.add('is-error');}
    review?.scrollIntoView({behavior:document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth',block:'center'});
    const target=document.querySelector('[data-ctu-review]:not(:checked)')||$('ctuReviewer');setTimeout(()=>target?.focus?.(),80);
  },true);
  ['input','change'].forEach(type=>document.addEventListener(type,e=>{if(e.target.matches('[data-ctu-review],#ctuReviewer,#ctuReviewNote'))setTimeout(keepClickable,0)},true));
  const mo=new MutationObserver(keepClickable);mo.observe(btn,{attributes:true,attributeFilter:['disabled']});
  window.addEventListener('iss:application-results-changed',()=>{if(msg?.textContent.includes('登録しました'))msg.classList.remove('is-error')});
  keepClickable();setTimeout(keepClickable,100);
})();
