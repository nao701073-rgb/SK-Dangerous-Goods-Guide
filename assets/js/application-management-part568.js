(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function selectedApp(){const id=$('quickApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function review(app){return app?.caseData?.intake?.reviewEvidence||null}
  function activePoints(app){return Array.isArray(app?.ctuMslPointRegistry)?app.ctuMslPointRegistry.filter(row=>row?.planned!==false):[]}
  function ensurePanel(){
    const box=$('part566ApplicationSelected');if(!box||$('part568CaseNextAction',box))return;
    const panel=document.createElement('div');panel.id='part568CaseNextAction';panel.className='part568-case-next-action';
    box.appendChild(panel);
  }
  function nextAction(app){
    const e=review(app),points=activePoints(app),unconfirmed=points.filter(row=>(row.reviewStatus||'unconfirmed')!=='confirmed');
    if(!e)return {label:'申請書確認を開始',detail:'この案件には登録時の申請書確認記録がありません。',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(app.id)}`,tone:'warning'};
    if(Number(e.unresolvedCount||0)>0)return {label:`要確認 ${Number(e.unresolvedCount)}件を再確認`,detail:'申請書確認に未解決項目があります。対象案件を維持したまま確認画面を開きます。',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(app.id)}`,tone:'warning'};
    if(unconfirmed.length)return {label:`MSL取付点 ${unconfirmed.length}件を確認`,detail:`使用予定 ${points.length}件のうち未確認取付点があります。固縛力画面で写真・刻印・資料を照合してください。`,href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(app.id)}#mslPointRegistryTitle`,tone:'warning'};
    return {label:'固縛力参考算出へ',detail:points.length?`申請書確認済み、使用予定MSL取付点 ${points.length}件も確認済みです。`:'申請書確認は完了しています。必要に応じて固縛力参考算出へ進めます。',href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(app.id)}`,tone:'ok'};
  }
  function render(){
    const box=$('part566ApplicationSelected'),app=selectedApp();if(!box)return;
    if(!app){box.querySelector('#part568CaseNextAction')?.remove();return}
    ensurePanel();const panel=$('part568CaseNextAction');if(!panel)return;
    const e=review(app),points=activePoints(app),confirmed=points.filter(row=>(row.reviewStatus||'unconfirmed')==='confirmed').length,action=nextAction(app);
    const reviewState=e?(Number(e.unresolvedCount||0)>0?`要確認 ${Number(e.unresolvedCount)}件`:'確認済み'):'記録なし';
    panel.className=`part568-case-next-action is-${action.tone}`;
    panel.innerHTML=`<div class="part568-case-progress"><span>案件の次の操作</span><strong>${esc(action.label)}</strong><small>${esc(action.detail)}</small><div><b>申請書：${esc(reviewState)}</b><b>MSL取付点：${points.length?`${confirmed}/${points.length}件確認済み`:'未登録'}</b></div></div><a class="primary-action" href="${action.href}">${esc(action.label)}</a>`;
  }
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(render,0));
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,0));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,20)):setTimeout(render,20);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part568.js':'part568'});
})();
