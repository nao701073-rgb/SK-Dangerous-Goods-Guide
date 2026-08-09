(function(){
'use strict';
const $=id=>document.getElementById(id);
const appId=new URLSearchParams(location.search).get('applicationId');
function rows(){try{return (window.ISSApplicationResults?.get?.(appId)||[]).filter(r=>r.type==='ctu-securing'&&!r.cancelledAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))}catch{return []}}
function num(v){const n=Number(v);return Number.isFinite(n)?n:null}
function fmt(v,unit=''){const n=num(v);return n===null?'―':`${Math.abs(n).toLocaleString('ja-JP',{maximumFractionDigits:3})}${unit}`}
function build(){
 const panel=$('part557CtuCommandPanel');if(!panel||$('part558NextTask'))return false;const all=rows();if(!all.length)return false;
 const row=all[0],p=row.payload||{},warnings=Array.isArray(p.warnings)?p.warnings:[],review=p.review||{},worst=num(p.worstMargin),overall=String(p.overall||'要確認');
 const issue=overall!=='充足'||warnings.length>0||(worst!==null&&worst<0), reviewerMissing=!String(review.reviewer||'').trim();
 let lead='',detail='';
 if(worst!==null&&worst<0){lead='方向別結果を確認';detail=`最厳方向で ${fmt(worst,' kN')} 不足しています。固縛条件・取付点MSL・支保条件を確認してください。`;}
 else if(warnings.length){lead='確認事項を確認';detail=`登録済み結果に ${warnings.length}件の確認事項があります。必要な項目だけ詳細を開いて確認してください。`;}
 else if(overall!=='充足'){lead='算出結果を確認';detail=`現在の判定は「${overall}」です。条件を確認し、必要な場合だけ再計算してください。`;}
 else {lead='条件変更がなければ再計算不要';detail='最新版は充足です。貨物・固縛条件に変更がなければ、登録済み結果をそのまま確認できます。';}
 const box=document.createElement('div');box.id='part558NextTask';box.className=`part558-next-task ${issue?'is-review':'is-ok'}`;
 box.innerHTML=`<div><span>次にすること</span><strong>${lead}</strong><p>${detail}</p>${reviewerMissing?'<small>確認者が記録されていません。再登録時に確認者を確認してください。</small>':''}</div><span class="part558-next-badge">${issue?'要確認':'確認済み'}</span>`;
 panel.querySelector('.part557-command-summary')?.insertAdjacentElement('afterend',box);return true;
}
function setup(){let tries=0;const t=setInterval(()=>{tries++;if(build()||tries>35)clearInterval(t)},120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part558.js':'part558'});
