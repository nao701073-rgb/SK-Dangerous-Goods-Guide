(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function selected(){const id=$('quickApplicationSelect')?.value;return applications().find(a=>String(a.id)===String(id))||null}
  function val(a,key){return a?.[key]??a?.caseData?.[key]??''}
  function points(a){return Array.isArray(a?.ctuMslPointRegistry)?a.ctuMslPointRegistry.filter(x=>x?.planned!==false):[]}
  function evidence(a){return a?.caseData?.intake?.reviewEvidence||null}
  function item(label,value,href,tone='neutral'){return {label,value:value||'未入力',href,tone}}
  function build(a){
    const e=evidence(a),p=points(a),confirmed=p.filter(x=>(x.reviewStatus||'unconfirmed')==='confirmed').length,unresolved=Number(e?.unresolvedCount||0),memo=String(a.note||'').trim();
    return [
      item('申請書確認',e?(unresolved?`要確認 ${unresolved}件`:'確認済み'):'記録なし',`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`,e&&!unresolved?'ok':'warning'),
      item('船名',val(a,'vesselName')||'未入力',`application-detail.html?applicationId=${encodeURIComponent(a.id)}`),
      item('コンテナ番号',val(a,'containerNumber')||'未入力',`application-detail.html?applicationId=${encodeURIComponent(a.id)}`),
      item('検査予定・実施日',val(a,'inspectionPlannedDate')||val(a,'inspectionDate')||'未入力',`application-detail.html?applicationId=${encodeURIComponent(a.id)}`),
      item('簡易メモ',memo?'入力あり':'未入力','#quickApplicationMemo',memo?'ok':'neutral'),
      item('MSL取付点',p.length?`${confirmed}/${p.length}件確認済み`:'未登録',`ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}#mslPointRegistryTitle`,p.length&&confirmed===p.length?'ok':p.length?'warning':'neutral')
    ];
  }
  function ensure(){const anchor=$('part571CaseContinuation')||$('part570CaseOverview')||$('part566ApplicationSelected');if(!anchor||$('part572CaseChecklist'))return;const box=document.createElement('section');box.id='part572CaseChecklist';box.className='part572-case-checklist';anchor.insertAdjacentElement('afterend',box)}
  function render(){const a=selected();if(!a){$('part572CaseChecklist')?.remove();return}ensure();const box=$('part572CaseChecklist');if(!box)return;const items=build(a),warnings=items.filter(x=>x.tone==='warning').length;box.innerHTML=`<div class="part572-case-checklist__head"><div><span>案件確認リスト</span><strong>${warnings?`要確認 ${warnings}項目`:'主要な確認状況を一覧表示'}</strong><small>未入力は必ずしもエラーではありません。案件に必要な情報だけ確認してください。</small></div><a href="application-detail.html?applicationId=${encodeURIComponent(a.id)}">案件全体を見る</a></div><div class="part572-case-checklist__grid">${items.map(x=>`<a class="is-${x.tone}" href="${esc(x.href)}"><small>${esc(x.label)}</small><strong>${esc(x.value)}</strong></a>`).join('')}</div>`;const memo=box.querySelector('a[href="#quickApplicationMemo"]');memo?.addEventListener('click',ev=>{ev.preventDefault();$('quickApplicationMemo')?.scrollIntoView({behavior:'smooth',block:'center'});$('quickApplicationMemo')?.focus()})}
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(render,0));$('quickSaveMemo')?.addEventListener('click',()=>setTimeout(render,100));window.addEventListener('iss:applications-changed',()=>setTimeout(render,20));document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,120)):setTimeout(render,120);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part572.js':'part572'});
})();
