(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const appId=new URLSearchParams(location.search).get('applicationId');
function rows(){try{return (window.ISSApplicationResults?.get?.(appId)||[]).filter(r=>r.type==='ctu-securing'&&!r.cancelledAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}catch{return []}}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function fmt(v,unit=''){const n=num(v);return n===null?'―':`${n.toLocaleString('ja-JP',{maximumFractionDigits:3})}${unit}`}
function setupNextCheck(all){
 const host=$('detailTabCtu');
 if(!host||host.querySelector('#part556NextCheck')||!all.length)return;
 const row=all[0],p=row?.payload||{},review=p.review||{},warnings=Array.isArray(p.warnings)?p.warnings:[],worst=num(p.worstMargin);
 const needsReview=String(p.overall||'')!=='充足'||warnings.length>0||(worst!==null&&worst<0);
 const box=document.createElement('section');
 box.id='part556NextCheck';
 box.className=`part556-next-check ${needsReview?'is-review':'is-ok'}`;
 box.innerHTML=`<div class="part556-next-check__head"><div><span>最新版の確認状況</span><strong>${esc(p.overall||'要確認')}</strong></div><span class="part556-next-badge">${needsReview?'確認あり':'確認済み'}</span></div><div class="part556-next-grid"><div><span>最厳方向の余裕・不足</span><strong>${fmt(p.worstMargin,' kN')}</strong></div><div><span>確認事項</span><strong>${warnings.length}件</strong></div><div><span>確認者</span><strong>${esc(review.reviewer||'―')}</strong></div><div><span>確認日時</span><strong>${review.confirmedAt?esc(new Date(review.confirmedAt).toLocaleString('ja-JP')):'―'}</strong></div></div><div class="part556-next-actions"><button type="button" id="part556OpenLatestDetails">${needsReview?'確認事項・方向別結果を開く':'最新版の詳細を開く'}</button><a href="ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}" target="_blank" rel="noopener">新しい算出</a></div>${needsReview?'<p>判定または確認事項が残っています。詳細を確認してから必要に応じて再計算してください。</p>':'<p>最新版は充足として登録されています。条件変更がある場合は再計算してください。</p>'}`;
 const comparison=host.querySelector('#part555Comparison');
 if(comparison)comparison.insertAdjacentElement('afterend',box);else host.querySelector('.detail-section')?.appendChild(box);
 $('part556OpenLatestDetails')?.addEventListener('click',()=>{const d=host.querySelector('.ctu-result-detail.is-latest .ctu-result-more');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}});
}
function setup(){if(!appId)return;let tries=0;const t=setInterval(()=>{tries++;const all=rows();if($('detailTabCtu')?.querySelector('.detail-section')&&all.length){clearInterval(t);setupNextCheck(all);}else if(tries>35)clearInterval(t);},120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part556.js':'part556'});
