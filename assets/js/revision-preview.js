(()=>{
  'use strict';
  const PREVIEW_KEY='iss-structured-data-preview-v1';
  const REVIEW_KEY='iss-structured-data-preview-reviews-v1';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={
    'dangerous-goods-basic':'危険物基本データ','label-master':'標札マスター','packaging-requirements':'包装要件','special-provisions':'特別規定','article-links':'条文リンク','domestic-imdg-cross-reference':'国内法令・IMDG対照','regulation-registry':'法令登録情報','marking-rules':'品名・国連番号表示基準'
  };
  let selected='';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const currentUser=()=>window.ISSApi?.getUser?.()||read('iss-api-user',{});
  function statusLabel(status){return status==='passed'?'検証合格':status==='failed'?'要修正':'検証待ち'}
  function render(){
    const preview=read(PREVIEW_KEY,{}),reviews=read(REVIEW_KEY,{}),entries=Object.entries(preview);
    if(!entries.length){$('candidateList').innerHTML='<p class="empty-state">現在、先行確認できる更新候補はありません。</p>';$('reviewEditor').innerHTML='<p>更新候補が保存されると、ここで検証結果を記録できます。</p>';return;}
    if(!selected||!preview[selected]) selected=entries[0][0];
    $('candidateList').innerHTML=entries.map(([id,item])=>{const review=reviews[id]||{status:'pending'};return `<article class="candidate-card ${id===selected?'is-selected':''}"><div class="candidate-card__top"><div><h3>${esc(labels[id]||id)}</h3><p>${esc(item.summary||'更新概要未入力')}</p><div class="candidate-meta"><span>版：${esc(item.edition||'未入力')}</span><span>件数：${item.records?.length||0}件</span><span>担当：${esc(item.preparedBy||'未入力')}</span><span>保存：${item.stagedAt?new Date(item.stagedAt).toLocaleString('ja-JP'):'―'}</span></div></div><span class="candidate-status ${review.status==='passed'?'is-passed':review.status==='failed'?'is-failed':''}">${statusLabel(review.status)}</span></div><button type="button" data-select="${esc(id)}">この更新候補を検証する</button></article>`}).join('');
    $('candidateList').querySelectorAll('[data-select]').forEach(button=>button.addEventListener('click',()=>{selected=button.dataset.select;render()}));
    const review=reviews[selected]||{status:'pending',note:''};
    const item=preview[selected];
    $('reviewEditor').innerHTML=`<form class="review-form" id="revisionReviewForm"><div><strong>${esc(labels[selected]||selected)}</strong><p>更新候補 ${item.records?.length||0}件を反映した各画面を確認し、結果を記録してください。</p></div><label>検証メモ<textarea id="revisionReviewNote" rows="5" placeholder="検索結果、標札、包装要件、条文リンク、画面表示などの確認内容">${esc(review.note||'')}</textarea></label><div class="review-actions"><button type="button" class="pass" data-status="passed">検証合格</button><button type="button" class="fail" data-status="failed">要修正</button><button type="button" class="pending" data-status="pending">検証待ちに戻す</button></div>${review.reviewedAt?`<p>最終記録：${new Date(review.reviewedAt).toLocaleString('ja-JP')}／${esc(review.reviewedBy||'')}</p>`:''}</form>`;
    $('reviewEditor').querySelectorAll('[data-status]').forEach(button=>button.addEventListener('click',()=>saveReview(button.dataset.status)));
  }
  function saveReview(status){
    const reviews=read(REVIEW_KEY,{}),user=currentUser();
    reviews[selected]={status,note:$('revisionReviewNote').value.trim(),reviewedAt:new Date().toISOString(),reviewedBy:user.displayName||user.display_name||user.loginId||'改正検証者'};
    localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews));render();
  }
  $('reloadPreview').addEventListener('click',()=>location.reload());
  render();
})();
