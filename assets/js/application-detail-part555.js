(function(){
'use strict';
const $=id=>document.getElementById(id);
const esc=v=>String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const fmt=(v,unit='')=>{const x=Number(v);return Number.isFinite(x)?`${x.toLocaleString('ja-JP',{maximumFractionDigits:3})}${unit}`:(v===undefined||v===null||v===''?'―':String(v));};
const appId=new URLSearchParams(location.search).get('applicationId');
function rows(){try{return (window.ISSApplicationResults?.get?.(appId)||[]).filter(r=>r.type==='ctu-securing'&&!r.cancelledAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}catch{return []}}
function key(row){return String(row?.id||row?.resultId||row?.createdAt||'')}
function v(row,path){let x=row?.payload;for(const p of path)x=x?.[p];return x}
function values(row){const p=row?.payload||{},i=p.inputs||{},q=i.quickSecuring||{};return [
 ['判定',p.overall||'要確認',''],
 ['貨物質量',i.mass,' t'],
 ['輸送条件',p.transportPreset||'―',''],
 ['固縛方法',q.method||'―',''],
 ['材質',q.material||'―',''],
 ['本数・個数',q.count,''],
 ['固縛材MSL',q.confirmedStrength,' kN'],
 ['貨物側MSL',q.cargoSideMsl,' kN'],
 ['CTU側MSL',q.ctuSideMsl,' kN'],
 ['最厳方向の余裕・不足',p.worstMargin,' kN']
 ];}
function norm(v){if(v===null||v===undefined||v==='')return '';const n=Number(v);return Number.isFinite(n)?String(Math.round(n*1000)/1000):String(v).trim()}
function compare(latest,previous){const a=values(latest),b=values(previous);return a.map((x,i)=>({label:x[0],current:x[1],previous:b[i]?.[1],unit:x[2],changed:norm(x[1])!==norm(b[i]?.[1])}));}
function latestRecalcHref(row){const k=key(row);return `ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}${k?`&resultKey=${encodeURIComponent(k)}`:''}`}
function setupQuickActions(all){const host=$('detailTabCtu');if(!host||host.querySelector('#part555DetailActions')||!all.length)return;const latest=all[0];const bar=document.createElement('div');bar.id='part555DetailActions';bar.className='part555-detail-actions';bar.innerHTML=`<div><span>固縛力算出</span><strong>次の操作を選択</strong></div><div class="part555-detail-action-buttons"><a class="is-primary" href="${latestRecalcHref(latest)}" target="_blank" rel="noopener">最新版の条件で再計算</a><a href="ctu-securing-calculator.html?applicationId=${encodeURIComponent(appId)}" target="_blank" rel="noopener">新しい算出を開始</a>${all.length>1?'<button type="button" id="part555OpenHistory">過去の算出履歴を表示</button>':''}</div>`;
 const section=host.querySelector('.detail-section');section?.insertAdjacentElement('afterbegin',bar);
 $('part555OpenHistory')?.addEventListener('click',()=>{const d=host.querySelector('.ctu-history-group');if(d){d.open=true;d.scrollIntoView({behavior:'smooth',block:'start'});}});
}
function setupComparison(all){const host=$('detailTabCtu');if(!host||host.querySelector('#part555Comparison')||!all.length)return;const box=document.createElement('section');box.id='part555Comparison';box.className='part555-comparison';const latest=all[0],prev=all[1];if(!prev){box.innerHTML='<div class="part555-comparison-head"><div><span>前回結果との比較</span><strong>初回の固縛力算出結果です</strong></div><span class="part555-compare-badge is-first">初回</span></div><p>比較対象となる過去結果はありません。次回の再計算・登録後から差分を確認できます。</p>';}
 else {const diffs=compare(latest,prev),changed=diffs.filter(x=>x.changed);box.innerHTML=`<div class="part555-comparison-head"><div><span>前回結果との比較</span><strong>${changed.length?`${changed.length}項目に変更があります`:'主要条件の変更はありません'}</strong></div><span class="part555-compare-badge ${changed.length?'is-changed':'is-same'}">${changed.length?'変更あり':'変更なし'}</span></div>${changed.length?`<div class="part555-compare-grid">${changed.map(x=>`<div><span>${esc(x.label)}</span><small>前回 ${esc(fmt(x.previous,x.unit))}</small><strong>→ ${esc(fmt(x.current,x.unit))}</strong></div>`).join('')}</div>`:'<p>貨物質量、固縛方法、材質、本数、主要MSL、最厳方向の余裕・不足、判定に変更はありません。</p>'}<details class="part555-compare-all"><summary>全比較項目を表示</summary><div class="part555-compare-table">${diffs.map(x=>`<div class="${x.changed?'is-changed':''}"><span>${esc(x.label)}</span><span>${esc(fmt(x.previous,x.unit))}</span><strong>${esc(fmt(x.current,x.unit))}</strong></div>`).join('')}</div></details>`;}
 const guide=host.querySelector('.ctu-latest-guide');if(guide)guide.insertAdjacentElement('afterend',box);else host.querySelector('.detail-section')?.appendChild(box);
}
function setup(){if(!appId)return;let tries=0;const timer=setInterval(()=>{tries++;const all=rows();const rendered=$('detailTabCtu')?.querySelector('.detail-section');if(rendered&&all.length){clearInterval(timer);setupQuickActions(all);setupComparison(all);}else if(tries>30)clearInterval(timer);},120);}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part555.js':'part555'});
