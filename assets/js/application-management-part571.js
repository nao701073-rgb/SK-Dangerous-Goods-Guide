(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function selected(){const id=$('quickApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function ensure(){
    const anchor=$('part570CaseOverview')||$('part568CaseNextAction')||$('part566ApplicationSelected');if(!anchor||$('part571CaseContinuation'))return;
    const bar=document.createElement('div');bar.id='part571CaseContinuation';bar.className='part571-case-continuation';bar.innerHTML='<div><span>選択案件を保持して連続操作</span><small>申請番号を選び直さず、確認・写真・固縛力算出へ進めます。</small></div><div class="part571-case-continuation__actions"><a id="part571ContinueReview">申請書確認</a><button type="button" id="part571ContinuePhoto">写真を追加</button><a id="part571ContinueCtu">固縛力算出</a><a id="part571ContinueDetail" target="_blank" rel="noopener">申請詳細</a></div>';
    anchor.insertAdjacentElement('afterend',bar);
    $('part571ContinuePhoto')?.addEventListener('click',()=>{const fast=$('part569PhotoNow');if(fast)fast.click();else $('quickAddPhoto')?.click()});
  }
  function render(){
    const app=selected();if(!app){$('part571CaseContinuation')?.remove();return}ensure();const bar=$('part571CaseContinuation');if(!bar)return;
    $('part571ContinueReview').href=`application-intake-workflow.html?applicationId=${encodeURIComponent(app.id)}`;
    $('part571ContinueCtu').href=`ctu-securing-calculator.html?applicationId=${encodeURIComponent(app.id)}`;
    $('part571ContinueDetail').href=`application-detail.html?applicationId=${encodeURIComponent(app.id)}`;
    bar.hidden=false;
  }
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(render,0));
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,20));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,100)):setTimeout(render,100);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part571.js':'part571'});
})();
