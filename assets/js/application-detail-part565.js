(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-detail')return;
  const $=id=>document.getElementById(id),qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dt=v=>{if(!v)return '―';try{return new Date(v).toLocaleString('ja-JP')}catch{return String(v)}};
  const appId=new URLSearchParams(location.search).get('applicationId');
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function legacyEvidence(app){
    const note=String(app?.note||''),m=note.match(/\[かんたん確認\]\s*要確認事項を確認済み：([^\n（]+)(?:（(\d+)件）)?/),reviewer=(note.match(/取込原本照合者：([^\n]+)/)||[])[1]||'';
    if(!m&&!reviewer)return null;
    const nums=m?[...m[1].matchAll(/No\.(\d+)/g)].map(x=>Number(x[1])):[];
    return {schemaVersion:'legacy-part562',source:'legacy-review-note',status:'completed',reviewedAt:app?.updatedAt||app?.createdAt||'',reviewer:reviewer.trim(),cargoCount:Number(app?.cargoItems?.length||app?.caseData?.cargoItems?.length||0),autoConfirmedCount:Math.max(0,Number(app?.cargoItems?.length||app?.caseData?.cargoItems?.length||0)-nums.length),humanConfirmedCount:nums.length,unresolvedCount:0,humanConfirmed:nums.map(index=>({index,unNumber:'',reasons:['要確認事項（旧記録）']})),reasonGroups:{'要確認事項（旧記録）':nums},legacy:true};
  }
  function evidence(app){return app?.caseData?.intake?.reviewEvidence||legacyEvidence(app)}
  function cargo(app){return app?.caseData?.cargoItems||app?.cargoItems||[]}
  function ensureTab(){
    const nav=document.querySelector('.detail-tabs');if(!nav||document.querySelector('[data-detail-tab="review"]'))return;
    const appBtn=nav.querySelector('[data-detail-tab="application"]');const b=document.createElement('button');b.type='button';b.dataset.detailTab='review';b.innerHTML='申請書確認 <span id="applicationReviewCount"></span>';appBtn?.insertAdjacentElement('afterend',b);
    const appPanel=$('detailTabApplication');const p=document.createElement('section');p.id='detailTabReview';p.className='detail-tab-panel';p.hidden=true;appPanel?.insertAdjacentElement('afterend',p);
  }
  function selectReview(writeUrl=true){
    qa('[data-detail-tab]').forEach(b=>b.classList.toggle('is-active',b.dataset.detailTab==='review'));qa('.detail-tab-panel').forEach(p=>p.hidden=true);if($('detailTabReview'))$('detailTabReview').hidden=false;
    if(writeUrl){const u=new URL(location.href);u.searchParams.set('tab','review');history.replaceState(null,'',u.toString())}
  }
  function statusRows(app,e){
    const items=cargo(app),human=new Map((e?.humanConfirmed||[]).map(x=>[Number(x.index),x]));
    return items.map((g,i)=>{const idx=i+1,h=human.get(idx),status=h?'人が確認済み':'自動確認で完了',cls=h?'is-human':'is-auto',reasons=h?.reasons?.length?h.reasons:['追加確認なし'];return `<article class="part565-review-row ${cls}"><div><strong>No.${idx} ${g?.unNumber?`UN${esc(g.unNumber)}`:''}</strong><span>${esc(g?.originalName||g?.properShippingNameJa||g?.properShippingNameEn||'')}</span></div><b>${status}</b><div class="part565-review-reasons">${reasons.map(r=>`<span>${esc(r)}</span>`).join('')}</div></article>`}).join('');
  }
  function render(){
    ensureTab();const app=apps().find(a=>String(a.id)===String(appId));if(!app||!$('detailTabReview'))return;const e=evidence(app),items=cargo(app);
    if(!e){$('detailTabReview').innerHTML='<section class="detail-section part565-review-record"><div class="part565-review-record__head"><div><span>申請書確認記録</span><h2>個別確認記録はありません</h2></div><b class="is-legacy">旧登録データ</b></div><p class="part565-review-note">この案件は申請書確認記録の保存機能追加前に登録された可能性があります。現在の危険物明細と登録備考を確認してください。</p></section>';return}
    const human=Number(e.humanConfirmedCount||0),auto=Number(e.autoConfirmedCount??Math.max(0,items.length-human)),unresolved=Number(e.unresolvedCount||0);const count=$('applicationReviewCount');if(count)count.textContent=human?`(${human})`:'';
    const groups=Object.entries(e.reasonGroups||{}).filter(([,v])=>Array.isArray(v)&&v.length);const grouped=groups.length?`<div class="part565-review-groups">${groups.map(([reason,nums])=>`<span><strong>${esc(reason)}</strong> No.${nums.map(Number).join('・')}</span>`).join('')}</div>`:'';
    $('detailTabReview').innerHTML=`<section class="detail-section part565-review-record"><div class="part565-review-record__head"><div><span>登録時点の申請書確認記録</span><h2>${unresolved?'要確認あり':'確認完了'}</h2></div><b class="${unresolved?'is-review':'is-complete'}">${unresolved?'要確認':'確認完了'}</b></div><div class="part565-review-summary"><div><span>危険物</span><strong>${items.length}件</strong></div><div><span>自動確認で完了</span><strong>${auto}件</strong></div><div><span>人が確認</span><strong>${human}件</strong></div><div><span>原本照合者</span><strong>${esc(e.reviewer||'―')}</strong></div><div><span>確認日時</span><strong>${esc(dt(e.reviewedAt))}</strong></div></div>${e.legacy?'<p class="part565-review-note is-legacy">旧形式の確認メモから復元した記録のため、確認理由の詳細が残っていない場合があります。</p>':'<p class="part565-review-note">登録時点の確認結果です。登録後に申請内容を編集した場合は、現在の内容と照合して確認してください。</p>'}${grouped}<h3>危険物ごとの確認状況</h3><div class="part565-review-list">${statusRows(app,e)||'<p>危険物明細はありません。</p>'}</div></section>`;
    const cards=qa('#detailTabApplication .detail-cargo-card');(e.humanConfirmed||[]).forEach(h=>{const card=cards[Number(h.index)-1];if(!card)return;card.classList.add('part565-human-reviewed');const header=card.querySelector('header');if(header&&!header.querySelector('.part565-review-badge')){const badge=document.createElement('span');badge.className='part565-review-badge';badge.textContent='人確認済み';header.appendChild(badge)}});
  }
  document.addEventListener('click',e=>{const b=e.target.closest('[data-detail-tab="review"]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();selectReview(true)},{capture:true});
  function boot(){render();if(new URLSearchParams(location.search).get('tab')==='review')setTimeout(()=>selectReview(false),0)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,0)):setTimeout(boot,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part565.js':'part565'});
})();
