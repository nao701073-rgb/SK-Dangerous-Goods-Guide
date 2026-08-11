(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const appId=new URLSearchParams(location.search).get('applicationId');
function rows(){try{return (window.ISSApplicationResults?.get?.(appId)||[]).filter(r=>r.type==='ctu-securing'&&!r.cancelledAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}catch{return []}}
function key(row){return String(row?.id||row?.resultId||row?.createdAt||'')}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function fmt(v,unit=''){const n=num(v);return n===null?'―':`${n.toLocaleString('ja-JP',{maximumFractionDigits:3})}${unit}`}
function href(row){const k=key(row);return `ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}${k?`&resultKey=${encodeURIComponent(k)}`:''}`}
function openLatest(host){const d=host.querySelector('.ctu-result-detail.is-latest .ctu-result-more');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}}
function openHistory(host){const d=host.querySelector('.ctu-history-group');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}}
function build(all){
 const host=$('detailTabCtu');if(!host||!all.length)return;
 const section=host.querySelector('.detail-section');if(!section||$('part557CtuCommandPanel'))return;
 // Part555/556 added separate operation cards. Part557 replaces them with one command panel.
 const oldActions=$('part555DetailActions'),oldCheck=$('part556NextCheck');
 if(oldActions)oldActions.hidden=true;if(oldCheck)oldCheck.hidden=true;
 const row=all[0],p=row?.payload||{},review=p.review||{},warnings=Array.isArray(p.warnings)?p.warnings:[],worst=num(p.worstMargin);
 const needsReview=String(p.overall||'')!=='充足'||warnings.length>0||(worst!==null&&worst<0);
 const panel=document.createElement('section');panel.id='part557CtuCommandPanel';panel.className=`part557-command-panel ${needsReview?'is-review':'is-ok'}`;
 panel.innerHTML=`<div class="part557-command-head"><div><span>固縛力算出・最新版</span><strong>${esc(p.overall||'要確認')}</strong><p>${needsReview?'確認事項を確認し、必要な場合だけ再計算してください。':'登録済みの最新版は充足です。条件変更がある場合のみ再計算してください。'}</p></div><span class="part557-state-badge">${needsReview?'確認あり':'確認済み'}</span></div><div class="part557-command-summary"><div><span>最厳方向の余裕・不足</span><strong>${fmt(p.worstMargin,' kN')}</strong></div><div><span>確認事項</span><strong>${warnings.length}件</strong></div><div><span>確認者</span><strong>${esc(review.reviewer||'―')}</strong></div><div><span>登録日時</span><strong>${row.createdAt?esc(new Date(row.createdAt).toLocaleString('ja-JP')):'―'}</strong></div></div><div class="part557-primary-actions">${needsReview?'<button type="button" id="part557OpenIssues" class="is-primary">確認事項を確認</button>':''}<a class="${needsReview?'':'is-primary'}" href="${href(row)}" target="_blank" rel="noopener">最新版の条件で再計算</a></div><details class="part557-more-actions"><summary>その他の操作</summary><div><a href="ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}" target="_blank" rel="noopener">新しい算出を開始</a>${all.length>1?'<button type="button" id="part557OpenHistory">過去の算出履歴を表示</button>':''}<button type="button" id="part557OpenLatest">最新版の詳細を表示</button></div></details>`;
 section.insertAdjacentElement('afterbegin',panel);
 $('part557OpenIssues')?.addEventListener('click',()=>openLatest(host));
 $('part557OpenLatest')?.addEventListener('click',()=>openLatest(host));
 $('part557OpenHistory')?.addEventListener('click',()=>openHistory(host));
}
function setup(){if(!appId)return;let tries=0;const t=setInterval(()=>{tries++;const all=rows();if($('detailTabCtu')?.querySelector('.detail-section')&&all.length){clearInterval(t);build(all)}else if(tries>40)clearInterval(t)},120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part557.js':'part557'});
