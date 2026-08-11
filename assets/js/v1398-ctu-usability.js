(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const text=(id,fallback='未設定')=>{const el=$(id);if(!el)return fallback;if(el.tagName==='SELECT')return el.selectedOptions?.[0]?.textContent?.trim()||fallback;return String(el.value||'').trim()||fallback};
const checked=id=>Boolean($(id)?.checked);
const dirLabel=v=>({all:'各評価方向',forward:'前方',rear:'後方',left:'左方向',right:'右方向'})[v]||'方向未選択';
const compactSea=()=>{const v=$('quickTransport')?.value||$('transportPreset')?.value||'';return ({seaA:'海域A',seaB:'海域B',seaC:'海域C',A:'海域A',B:'海域B',C:'海域C'})[v]||text('transportPreset','未設定')};
function chip(label,value,warn=false){return `<div class="v1398-condition-chip${warn?' is-warn':''}"><span>${label}</span><strong>${value}</strong></div>`}
function refresh(){
 const box=$('ctuCalcConditionSummary');if(!box)return;
 const mass=Number($('quickMass')?.value||$('mass')?.value||0);
 const mu=Number($('quickMu')?.value||$('mu')?.value||0);
 const tensile=checked('quickUseTensile');
 const support=checked('quickUseSupport');
 const tdir=$('quickDirection')?.value||'';
 const sdir=$('quickSupportDirection')?.value||'';
 const tcount=Number($('quickCount')?.value||0);
 const scount=Number($('quickSupportCount')?.value||0);
 const walls=[];
 if(checked('wallUseForward'))walls.push('前');
 if(checked('wallUseRear'))walls.push('後');
 if(checked('wallUseLeft'))walls.push('左');
 if(checked('wallUseRight'))walls.push('右');
 const msl=[Number($('quickStrength')?.value||0),Number($('quickCargoMsl')?.value||0),Number($('quickCtuMsl')?.value||0)].filter(v=>v>0);
 const adopted=msl.length===3?Math.min(...msl):0;
 const tvalue=tensile?`${dirLabel(tdir)}・${Number.isFinite(tcount)?tcount:0}本`:'使用しない';
 const svalue=support?`${dirLabel(sdir)}・${Number.isFinite(scount)?scount:0}個`:'使用しない';
 const wvalue=walls.length?`${walls.join('・')}方向`:'未使用';
 box.innerHTML=[
   chip('輸送条件',compactSea()),
   chip('貨物質量',mass>0?`${mass.toFixed(3)} t`:'未入力',mass<=0),
   chip('摩擦係数',mu>0?`μ ${mu.toFixed(3)}`:'未確認',mu<=0),
   chip('固縛材',tvalue,tensile&&!tdir),
   chip('支保・あて材',svalue,support&&!sdir),
   chip('壁抵抗',wvalue,false),
   chip('採用MSL',tensile?(adopted>0?`${adopted.toFixed(1)} kN`:'要確認'):'対象外',tensile&&adopted<=0)
 ].join('');
}

function refreshUsageState(){
 const primary=$('ctuPrimarySecuringPanel'), supportPanel=$('ctuSupportSecuringPanel');
 primary?.classList.toggle('is-not-used',!checked('quickUseTensile'));
 supportPanel?.classList.toggle('is-not-used',!checked('quickUseSupport'));
 const map=[['wallUseForward','forward'],['wallUseRear','rear'],['wallUseLeft','left'],['wallUseRight','right']];
 map.forEach(([id,key])=>{
   const input=$(id); if(!input)return;
   const card=input.closest('.v1394-wall-direction-card')||input.closest('.v1394-wall-direction-item')||input.closest('article')||input.parentElement?.parentElement;
   card?.classList.toggle('is-wall-selected',Boolean(input.checked));
 });
}
function refreshOutcomeEmphasis(){
 const guide=$('ctuAssessmentGuide'), overall=$('overall'); if(!guide||!overall)return;
 const items=[...guide.querySelectorAll('.v1381-guide-item')];
 items.forEach(x=>x.classList.remove('is-current'));
 let selector='';
 if(overall.classList.contains('ok')) selector='.is-ok';
 else if(overall.classList.contains('check')) selector='.is-check';
 else if(overall.classList.contains('ng')) selector='.is-ng';
 const current=selector?guide.querySelector(selector):null;
 guide.classList.toggle('has-current',Boolean(current));
 current?.classList.add('is-current');
 const worst=$('metrics')?.querySelector('.metric-worst-direction');
 if(worst){
   const nodes=[...worst.childNodes];
   const first=nodes.find(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
   if(first) first.textContent='重点確認方向 ';
   let small=worst.querySelector('.v1398-worst-note');
   if(!small){small=document.createElement('small');small.className='v1398-worst-note';small.textContent='余裕／不足量が最も小さい方向';worst.appendChild(small)}
 }
}

function bind(){
 const ids=['quickTransport','transportPreset','quickMass','mass','quickMu','mu','quickUseTensile','quickUseSupport','quickDirection','quickSupportDirection','quickCount','quickSupportCount','quickStrength','quickCargoMsl','quickCtuMsl','wallUseForward','wallUseRear','wallUseLeft','wallUseRight','wallPayloadQuick','ctuPreset','quickCtu'];
 ids.forEach(id=>{const el=$(id);if(!el)return;const run=()=>{refresh();refreshUsageState();setTimeout(refreshOutcomeEmphasis,0)};el.addEventListener('input',run);el.addEventListener('change',run)});
 ['sk:ctu-calculated','sk:ctu-restored','sk:ctu-wall-gap-updated','sk:ctu-layout-changed'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(()=>{refresh();refreshUsageState();refreshOutcomeEmphasis()},0)));
 const overall=$('overall'), metrics=$('metrics');
 if(overall)new MutationObserver(refreshOutcomeEmphasis).observe(overall,{attributes:true,childList:true,subtree:true});
 if(metrics)new MutationObserver(refreshOutcomeEmphasis).observe(metrics,{childList:true,subtree:true});
 setTimeout(()=>{refresh();refreshUsageState();refreshOutcomeEmphasis()},100);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.SKCTUUsabilityV1398={refresh,refreshUsageState,refreshOutcomeEmphasis};
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1398-ctu-usability.js':'v1.3.98'});
})();
