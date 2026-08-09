(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const uniq=a=>[...new Set(a.filter(Boolean))];
  function visible(node){return Boolean(node&&!node.hidden&&node.getClientRects().length)}
  function reasonList(row){return uniq(qa('.part562-reasons span',row).map(x=>x.textContent.trim()));}
  function rowEvidence(row){
    const index=Number(row.dataset.cargoIndex||0)+1;
    const un=String(q('[data-cargo-field="unNumber"]',row)?.value||'').trim();
    const reasons=reasonList(row);
    const human=row.classList.contains('part562-reviewed-warning');
    const hard=row.classList.contains('part562-hard-issue');
    const pending=row.classList.contains('part561-review')&&!hard;
    const mode=hard?'repair':pending?'pending':human?'human':'auto';
    return {index,unNumber:un,mode,reasons};
  }
  function globalIssueCount(){
    const ids=['intakeBlockers','intakeWarnings'];let count=0;
    ids.forEach(id=>{const node=$(id);if(!visible(node))return;qa('li',node).forEach(li=>{const t=li.textContent.trim();if(t&&!/ありません|問題はありません|確認事項はありません/.test(t))count++})});
    return count;
  }
  function buildEvidence(){
    if(!visible($('intakeCheckSection')))return null;
    const rows=qa('#intakeCargoBody tr[data-cargo-index]').map(rowEvidence);
    if(!rows.length)return null;
    const human=rows.filter(x=>x.mode==='human'),repair=rows.filter(x=>x.mode==='repair'),pending=rows.filter(x=>x.mode==='pending'),auto=rows.filter(x=>x.mode==='auto');
    const grouped={};human.forEach(item=>(item.reasons.length?item.reasons:['要確認']).forEach(reason=>{(grouped[reason]||(grouped[reason]=[])).push(item.index)}));
    return {
      schemaVersion:'part565-v1',
      source:'application-intake-easy-operation',
      status:(repair.length||pending.length)?'needs-review':'completed',
      reviewedAt:new Date().toISOString(),
      reviewer:String($('intakeReviewer')?.value||'').trim(),
      cargoCount:rows.length,
      autoConfirmedCount:auto.length,
      humanConfirmedCount:human.length,
      unresolvedCount:repair.length+pending.length,
      globalIssueCount:globalIssueCount(),
      humanConfirmed:human.map(x=>({index:x.index,unNumber:x.unNumber,reasons:x.reasons})),
      reasonGroups:grouped
    };
  }
  function wrapPolicy(){
    const policy=window.ISSApplicationIntakePolicy;if(!policy?.toApplicationPayload||policy.__part565ReviewEvidenceWrapped)return;
    const original=policy.toApplicationPayload.bind(policy);
    policy.toApplicationPayload=function(caseData){
      const payload=original(caseData),evidence=buildEvidence();
      if(evidence){
        payload.caseData=payload.caseData&&typeof payload.caseData==='object'?payload.caseData:{};
        payload.caseData.intake=payload.caseData.intake&&typeof payload.caseData.intake==='object'?payload.caseData.intake:{};
        payload.caseData.intake.reviewEvidence=evidence;
      }
      return payload;
    };
    policy.__part565ReviewEvidenceWrapped=true;
  }
  function ensureNotice(){
    if($('part565EvidenceNotice'))return;
    const final=$('part563FinalSummary');if(!final)return;
    const note=document.createElement('div');note.id='part565EvidenceNotice';note.className='part565-evidence-notice';note.innerHTML='<strong>確認記録も保存します</strong><span>人が確認した危険物と確認理由を、登録後の「申請書確認」タブから再確認できます。</span>';
    const actions=q('.part563-final-actions',final);if(actions)final.insertBefore(note,actions);else final.appendChild(note);
  }
  function updateNotice(){
    ensureNotice();const n=$('part565EvidenceNotice');if(!n)return;const e=buildEvidence();
    n.hidden=!e||e.status!=='completed';if(n.hidden)return;
    const span=q('span',n);if(span)span.textContent=e.humanConfirmedCount?`自動確認 ${e.autoConfirmedCount}件／人による確認 ${e.humanConfirmedCount}件を登録時点の確認記録として保存します。`:`全${e.cargoCount}件が自動確認で完了しています。登録時点の確認記録として保存します。`;
  }
  wrapPolicy();
  document.addEventListener('click',e=>{if(e.target.closest('#intakeRegisterApplication,#part563FinalRegister'))wrapPolicy()},{capture:true});
  document.addEventListener('input',()=>setTimeout(updateNotice,60));
  document.addEventListener('change',()=>setTimeout(updateNotice,60));
  const obs=new MutationObserver(()=>setTimeout(updateNotice,30));['intakeCheckSection','intakeCargoBody','part563FinalSummary'].forEach(id=>{const n=$(id);if(n)obs.observe(n,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']})});
  setTimeout(()=>{wrapPolicy();updateNotice()},0);
  window.__SK_PART565_BUILD_REVIEW_EVIDENCE__=buildEvidence;
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part565.js':'part565'});
})();
