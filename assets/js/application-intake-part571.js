(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  let timer=null;

  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function target(){return applications().find(app=>String(app.id)===String(requestedId))||null}
  function evidence(app){return app?.caseData?.intake?.reviewEvidence||null}
  function cargo(app){return app?.caseData?.cargoItems||app?.cargoItems||[]}
  function normalizeUn(value){return String(value||'').replace(/^UN\s*/i,'').trim()}
  function previousUns(app){return cargo(app).map(row=>normalizeUn(row?.unNumber)).filter(Boolean)}
  function currentUns(){return qa('#intakeCargoBody tr[data-cargo-index]').map(row=>normalizeUn(row.querySelector('[data-cargo-field="unNumber"]')?.value)).filter(Boolean)}
  function sameList(a,b){return a.length===b.length&&a.every((v,i)=>v===b[i])}
  function dt(value){if(!value)return '―';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})}

  function ensure(){
    if(!requestedId||$('part571PreviousReview'))return;
    const anchor=$('part567IntakeContext')||document.querySelector('.intake-intro');
    if(!anchor)return;
    const box=document.createElement('section');
    box.id='part571PreviousReview';
    box.className='part571-previous-review';
    box.innerHTML=`<div class="part571-previous-review__head"><div><span>前回確認記録</span><strong id="part571PreviousReviewTitle">登録済み案件の確認記録を確認中</strong><small id="part571PreviousReviewMeta">再確認時の参考として表示します。現在の判定状態へ自動反映はしません。</small></div><a id="part571PreviousReviewLink" target="_blank" rel="noopener">申請詳細で確認記録を開く</a></div><div class="part571-previous-review__summary" id="part571PreviousReviewSummary"></div><div class="part571-previous-review__reasons" id="part571PreviousReviewReasons"></div><p class="part571-previous-review__compare" id="part571PreviousReviewCompare" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);
  }

  function compareText(app){
    const prev=previousUns(app),now=currentUns();
    if(!now.length)return {tone:'neutral',text:`登録済み危険物 ${prev.length}件。申請書を取り込むと現在の明細構成と比較します。`};
    if(sameList(prev,now))return {tone:'ok',text:`明細構成一致：登録済み ${prev.length}件と、今回の取込 ${now.length}件のUN番号・並びが一致しています。内容・数量・包装要件は現在の判定で改めて確認してください。`};
    const prevSet=new Set(prev),nowSet=new Set(now),added=[...new Set(now.filter(x=>!prevSet.has(x)))],removed=[...new Set(prev.filter(x=>!nowSet.has(x)))];
    const parts=[`明細構成に差異：登録済み ${prev.length}件／今回 ${now.length}件`];
    if(added.length)parts.push(`追加候補 UN${added.join('・UN')}`);
    if(removed.length)parts.push(`未取込候補 UN${removed.join('・UN')}`);
    if(!added.length&&!removed.length)parts.push('UN番号は同じですが、並び順が異なります');
    return {tone:'warning',text:`${parts.join('。')}。前回の確認済み状態は引き継がず、現在の申請書で再確認してください。`};
  }

  function render(){
    ensure();const box=$('part571PreviousReview');if(!box)return;
    const app=target();if(!app){box.hidden=true;return}box.hidden=false;
    const e=evidence(app),title=$('part571PreviousReviewTitle'),meta=$('part571PreviousReviewMeta'),summary=$('part571PreviousReviewSummary'),reasons=$('part571PreviousReviewReasons'),compare=$('part571PreviousReviewCompare'),link=$('part571PreviousReviewLink');
    if(link)link.href=`application-detail.html?applicationId=${encodeURIComponent(app.id)}&tab=review`;
    if(!e){title.textContent='前回の個別確認記録はありません';meta.textContent='登録済み明細との構成比較のみ行います。現在の判定を優先してください。';summary.innerHTML=`<span><b>登録済み危険物</b><strong>${cargo(app).length}件</strong></span>`;reasons.innerHTML='';}
    else{
      const unresolved=Number(e.unresolvedCount||0),human=Number(e.humanConfirmedCount||0),auto=Number(e.autoConfirmedCount||0);
      title.textContent=unresolved?`前回記録：要確認 ${unresolved}件`:'前回記録：確認完了';
      meta.textContent='前回の照合者・確認理由を参考表示します。今回の確認操作・判定状態へは自動反映しません。';
      summary.innerHTML=`<span><b>原本照合者</b><strong>${esc(e.reviewer||'―')}</strong></span><span><b>確認日時</b><strong>${esc(dt(e.reviewedAt))}</strong></span><span><b>自動確認</b><strong>${auto}件</strong></span><span><b>人確認</b><strong>${human}件</strong></span>`;
      const groups=Object.entries(e.reasonGroups||{}).filter(([,nums])=>Array.isArray(nums)&&nums.length);
      reasons.innerHTML=groups.length?groups.slice(0,6).map(([reason,nums])=>`<span title="${esc(reason)}"><strong>${esc(reason)}</strong><small>No.${nums.map(Number).join('・')}</small></span>`).join(''):'<span class="is-empty">前回の個別確認理由はありません。</span>';
    }
    const state=compareText(app);compare.className=`part571-previous-review__compare is-${state.tone}`;compare.textContent=state.text;
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(render,50)}
  ['input','change'].forEach(name=>document.addEventListener(name,schedule));
  const body=$('intakeCargoBody');if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden','value']});
  window.addEventListener('iss:applications-changed',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,80)):setTimeout(render,80);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part571.js':'part571'});
})();
