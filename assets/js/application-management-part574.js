(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let timer=null;
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNo(a){const no=a?.numberType==='temporary'?(a?.temporaryNumber||a?.applicationNumber):a?.applicationNumber;return [a?.applicationYear,no].filter(Boolean).join('-')||'未設定'}
  function points(a){return Array.isArray(a?.ctuMslPointRegistry)?a.ctuMslPointRegistry.filter(x=>x?.planned!==false):[]}
  function attention(a){
    const e=a?.caseData?.intake?.reviewEvidence,p=points(a),unconfirmed=p.filter(x=>(x.reviewStatus||'unconfirmed')!=='confirmed').length;
    if(!e)return {priority:1,reason:'申請書確認記録なし',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`};
    const unresolved=Number(e.unresolvedCount||0);if(unresolved)return {priority:1,reason:`申請書 要確認 ${unresolved}件`,href:`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`};
    if(unconfirmed)return {priority:2,reason:`MSL取付点 未確認 ${unconfirmed}件`,href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}#mslPointRegistryTitle`};
    return null;
  }
  function queue(){return applications().map(a=>({a,issue:attention(a)})).filter(x=>x.issue).sort((x,y)=>x.issue.priority-y.issue.priority||String(y.a.updatedAt||y.a.createdAt||'').localeCompare(String(x.a.updatedAt||x.a.createdAt||'')))}
  function ensure(){
    if($('part574AttentionQueue'))return;
    const anchor=$('part569QuickBar')||document.querySelector('.application-quick-actions');if(!anchor)return;
    const box=document.createElement('section');box.id='part574AttentionQueue';box.className='part574-attention-queue';box.innerHTML=`<div class="part574-attention-queue__head"><div><span>要確認案件キュー</span><strong id="part574AttentionTitle">案件を集計中</strong><small>申請書の未確認・要確認、使用予定MSL取付点の未確認を、更新の新しい案件から表示します。</small></div><button type="button" id="part574SelectFirstAttention">先頭案件を選択</button></div><div id="part574AttentionList" class="part574-attention-list"></div><p id="part574AttentionFoot"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part574SelectFirstAttention')?.addEventListener('click',()=>selectCase(queue()[0]?.a?.id));
  }
  function selectCase(id){const select=$('quickApplicationSelect');if(!select||!id)return;if(!Array.from(select.options).some(o=>String(o.value)===String(id)))return;select.value=String(id);select.dispatchEvent(new Event('change',{bubbles:true}));select.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>select.focus?.({preventScroll:true}),180)}
  function render(){
    ensure();const box=$('part574AttentionQueue'),list=$('part574AttentionList'),title=$('part574AttentionTitle'),foot=$('part574AttentionFoot'),button=$('part574SelectFirstAttention');if(!box||!list||!title)return;
    const items=queue(),selected=String($('quickApplicationSelect')?.value||''),shown=items.slice(0,8);
    box.classList.toggle('is-clear',items.length===0);box.classList.toggle('is-warning',items.length>0);
    title.textContent=items.length?`要確認 ${items.length}案件`:'要確認案件はありません';if(button)button.disabled=!items.length;
    list.innerHTML=shown.length?shown.map(({a,issue})=>`<button type="button" data-part574-app="${esc(a.id)}" class="${String(a.id)===selected?'is-selected':''}"><span>${esc(issue.reason)}</span><strong>${esc(appNo(a))}${a.caseTitle?`｜${esc(a.caseTitle)}`:''}</strong><small>${esc([a.vesselName||a.caseData?.vesselName,a.containerNumber||a.caseData?.containerNumber].filter(Boolean).join('｜')||'案件情報を確認')}</small></button>`).join(''):'<p>現在のアクセス範囲では、申請書確認またはMSL取付点確認が残っている案件は見つかりません。</p>';
    list.querySelectorAll('[data-part574-app]').forEach(btn=>btn.addEventListener('click',()=>selectCase(btn.dataset.part574App)));
    if(foot)foot.textContent=items.length>shown.length?`先頭 ${shown.length}案件を表示しています。ほか ${items.length-shown.length}案件あります。申請番号の検索から選択できます。`:'このキューは表示補助のみで、案件の保存内容・進捗状態は変更しません。';
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,70)}
  $('quickApplicationSelect')?.addEventListener('change',schedule);window.addEventListener('iss:applications-changed',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,180)):setTimeout(render,180);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part574.js':'part574'});
})();
