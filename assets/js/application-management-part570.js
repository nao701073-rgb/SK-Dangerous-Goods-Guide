(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function selectedApp(){const id=$('quickApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function points(app){return Array.isArray(app?.ctuMslPointRegistry)?app.ctuMslPointRegistry.filter(row=>row?.planned!==false):[]}
  function cargoCount(app){return Number(app?.caseData?.cargoItems?.length||app?.cargoItems?.length||0)}
  function reviewState(app){const e=app?.caseData?.intake?.reviewEvidence;if(!e)return {text:'記録なし',tone:'warning'};const unresolved=Number(e.unresolvedCount||0);return unresolved?{text:`要確認 ${unresolved}件`,tone:'warning'}:{text:'確認済み',tone:'ok'}}
  function formatDate(value){if(!value)return '―';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}
  function ensure(){
    const selected=$('part566ApplicationSelected');if(!selected||$('part570CaseOverview'))return;
    const box=document.createElement('section');box.id='part570CaseOverview';box.className='part570-case-overview';selected.appendChild(box);
  }
  function render(){
    const selected=$('part566ApplicationSelected'),app=selectedApp();if(!selected)return;
    if(!app){selected.querySelector('#part570CaseOverview')?.remove();return}
    ensure();const box=$('part570CaseOverview');if(!box)return;
    const p=points(app),confirmed=p.filter(row=>(row.reviewStatus||'unconfirmed')==='confirmed').length,review=reviewState(app),memo=String(app.note||'').trim(),inspection=app.inspectionPlannedDate||app.inspectionDate||app.caseData?.inspectionPlannedDate||app.caseData?.inspectionDate||'';
    box.innerHTML=`<div class="part570-case-overview__head"><div><span>案件状況</span><strong>選択中案件を1画面で確認</strong></div><a href="application-detail.html?applicationId=${encodeURIComponent(app.id)}">申請詳細</a></div><div class="part570-case-overview__status"><span class="is-${review.tone}">申請書：${esc(review.text)}</span><span class="${p.length&&confirmed===p.length?'is-ok':p.length?'is-warning':''}">MSL取付点：${p.length?`${confirmed}/${p.length}件確認済み`:'未登録'}</span><span class="${memo?'is-ok':''}">簡易メモ：${memo?'あり':'なし'}</span></div><dl class="part570-case-overview__facts"><div><dt>危険物</dt><dd>${cargoCount(app)}件</dd></div><div><dt>船名</dt><dd>${esc(app.vesselName||app.caseData?.vesselName||'―')}</dd></div><div><dt>コンテナ番号</dt><dd>${esc(app.containerNumber||app.caseData?.containerNumber||'―')}</dd></div><div><dt>検査予定・実施日</dt><dd>${esc(inspection||'―')}</dd></div><div><dt>最終更新</dt><dd>${esc(formatDate(app.updatedAt||app.createdAt))}</dd></div></dl>`;
  }
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(render,0));
  $('quickSaveMemo')?.addEventListener('click',()=>setTimeout(render,120));
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,20));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,80)):setTimeout(render,80);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part570.js':'part570'});
})();
