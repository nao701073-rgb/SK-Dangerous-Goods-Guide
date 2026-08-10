(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/[\s\u3000]+/g,' ').trim();
const dry={
 'wood|wood':.30,'wood|steel':.30,'wood|plastic':.20,'wood|rubber':.30,
 'plastic|steel':.20,'plastic|wood':.20,'plastic|plastic':.20,'plastic|rubber':.30,
 'metal|steel':.10,'metal|wood':.20,'metal|plastic':.15,'metal|rubber':.30,
 'rubber|steel':.30,'rubber|wood':.30,'rubber|plastic':.30,'rubber|rubber':.30
};
function syncMu(){
 const a=$('v1CargoSurface')?.value||'other',b=$('v1FloorSurface')?.value||'other',c=$('v1SurfaceCondition')?.value||'dry';
 let mu=dry[`${a}|${b}`]??.20;if(c==='wet'||c==='snow')mu=Math.min(mu,.20);if(c==='oil')mu=.10;mu=Math.max(0,Math.round(mu*100)/100);
 if($('quickMu'))$('quickMu').value=mu.toFixed(2);
 if($('quickFriction'))$('quickFriction').value=c==='oil'?'oil':c==='snow'?'snow':'verified';
 if($('v1MuValue'))$('v1MuValue').textContent=`μ = ${mu.toFixed(2)}`;
 if($('v1MuNote'))$('v1MuNote').textContent=c==='oil'?'油・グリース等があるため、参考値を0.10として扱います。':c==='snow'?'霜・氷・雪があるため、参考値は0.20以下として扱います。':c==='wet'?'濡れた状態を考慮し、参考値は0.20以下として扱います。':'材質の組合せと表面状態から保守側の参考候補を設定しています。';
 ['quickMu','quickFriction'].forEach(id=>$(id)?.dispatchEvent(new Event('change',{bubbles:true})));
 window.dispatchEvent(new CustomEvent('sk:v137-friction-updated',{detail:{mu}}));
}
function unwrap(node){if(!node?.parentNode)return;const p=node.parentNode;[...node.childNodes].forEach(n=>{if(n.nodeType===1&&n.tagName==='SUMMARY')return;p.insertBefore(n,node)});node.remove()}
function removeLegacyRuntime(){
 document.querySelectorAll('details.part551-assist-details').forEach(unwrap);
 const oldSource=$('v131SourceStart');if(oldSource)unwrap(oldSource);
 $('v1PhotoStep')?.remove();
 ['part551QuickProgress','part553Completion','part553Journey','part553StickyNext','part559Guide','ctuStickyAnchor','ctuStickySpacer','v13ConditionCards'].forEach(id=>$(id)?.remove());
 document.querySelectorAll('.part551-next,.part553-completion,.part553-journey,.part553-sticky-next').forEach(n=>n.remove());
}
function canonicalizeFlow(){
 const flow=$('quickEntryPanel')?.querySelector(':scope > .quick-flow');if(!flow)return;
 const wanted=[3,4,5,6].map(n=>flow.querySelector(`:scope > [data-ctu-step="${n}"]`)||document.querySelector(`#quickEntryPanel [data-ctu-step="${n}"]`)).filter(Boolean);
 wanted.forEach(card=>{if(card.parentElement!==flow)flow.appendChild(card)});wanted.forEach(card=>flow.appendChild(card));
 [...flow.children].forEach(node=>{
   if(wanted.includes(node))return;
   const hasControl=node.querySelector?.('input,select,textarea,button,a,canvas,img,table');
   if(!hasControl&&!norm(node.textContent))node.remove();
 });
}
function removeGhosts(){
 const main=document.querySelector('main.calc-shell');if(!main)return;
 const protectedIds=new Set(['ctuCommonCasePanel','ctuStickyStatus','ctuExcelRoutePanel','photoInputPanel','photoRecognitionPanel','quickEntryPanel','ctuRegistrationSection']);
 [...main.children].forEach(node=>{
   if(protectedIds.has(node.id)||node.matches?.('.hero,.top-actions'))return;
   const hasControl=node.querySelector?.('input,select,textarea,button,a,canvas,img,table');
   const empty=!hasControl&&!norm(node.textContent);
   const legacy=node.matches?.('.ctu-numbered-card__body,.ctu-numbered-card-unified,.ctu-numbered-step-card,.v1-photo-step,.v1-contact-step,[data-v1356-legacy-progress-hidden]');
   if(empty&&legacy)node.remove();
 });
 document.querySelectorAll('#quickEntryPanel .ctu-numbered-card__body:empty,#quickEntryPanel .ctu-numbered-card-unified:empty').forEach(n=>n.remove());
}
function init(){
 removeLegacyRuntime();canonicalizeFlow();removeGhosts();
 ['v1CargoSurface','v1FloorSurface','v1SurfaceCondition'].forEach(id=>$(id)?.addEventListener('change',syncMu));syncMu();
 [80,220,520,1000,1800].forEach(ms=>setTimeout(()=>{removeLegacyRuntime();canonicalizeFlow();removeGhosts()},ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',()=>{removeLegacyRuntime();canonicalizeFlow();removeGhosts()},{once:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1368-ctu-canonical-runtime.js':'v1.3.68'});
})();
