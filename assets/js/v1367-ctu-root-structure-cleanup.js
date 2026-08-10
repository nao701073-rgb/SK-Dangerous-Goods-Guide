(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/[\s\u3000]+/g,' ').trim();
const controls='input,select,textarea,button,a,canvas,img,table,details:not(.part551-assist-details)';
function hasUseful(node){
  if(!node)return false;
  if(node.matches?.('#ctuStickyStatus,#ctuExcelRoutePanel,#photoInputPanel,#photoRecognitionPanel,#quickEntryPanel'))return true;
  if(node.querySelector?.(controls))return true;
  return norm(node.textContent).length>1;
}
function unwrapAssist(details){
  if(!details?.parentNode)return;
  const parent=details.parentNode;
  const children=[...details.childNodes].filter(n=>!(n.nodeType===1&&n.tagName==='SUMMARY'));
  children.forEach(n=>parent.insertBefore(n,details));
  details.remove();
}
function removeKnownLegacyUi(){
  // Part551 created outer <details> around Step1/Step2. Remove the wrapper node itself.
  document.querySelectorAll('details.part551-assist-details').forEach(unwrapAssist);
  // Retired progress/navigation layers from Part551/553/559.
  ['part551QuickProgress','part553Completion','part553Journey','part553StickyNext','part553RestoreState','part559Guide']
    .forEach(id=>$(id)?.remove());
  document.querySelectorAll('.part551-next,.part553-completion,.part553-journey,.part553-sticky-next').forEach(n=>n.remove());
  document.body.classList.remove('part559-guide-ready');
  // v13 pre-canonical Step5 container must never coexist with the current static Step5 panels.
  if($('ctuStep5Panels')){
    const legacy=$('v13ConditionCards');
    if(legacy){legacy.hidden=true;legacy.setAttribute('aria-hidden','true');legacy.dataset.v1367LegacyEmpty='1';}
  }
}
function removeEmptyLegacySiblings(){
  // Historical layout scripts left empty shells before/after Step1/2 after moving their live children.
  // Limit cleanup to known legacy shell types around the two canonical source cards.
  const known='.ctu-numbered-card__body,.ctu-numbered-card-unified,.ctu-numbered-step-card,.quick-step,.v1-photo-step,.v1-contact-step,details.part551-assist-details';
  const anchors=[$('ctuExcelRoutePanel'),$('photoInputPanel')].filter(Boolean);
  anchors.forEach(anchor=>{
    let node=anchor.previousElementSibling;
    for(let i=0;i<3&&node;i++){
      const prev=node.previousElementSibling;
      if(node.matches?.(known)&&!hasUseful(node)){node.dataset.v1367LegacyEmpty='1';node.remove();}
      node=prev;
    }
    node=anchor.nextElementSibling;
    for(let i=0;i<3&&node;i++){
      const next=node.nextElementSibling;
      if(node.matches?.(known)&&!hasUseful(node)){node.dataset.v1367LegacyEmpty='1';node.remove();}
      node=next;
    }
  });
  // Empty legacy shells nested in main/quick deck are also safe to remove when they contain no controls/text.
  document.querySelectorAll('#quickEntryPanel > .ctu-numbered-card__body,#quickEntryPanel > .ctu-numbered-card-unified').forEach(n=>{if(!hasUseful(n))n.remove()});
}
function enforceCanonicalOrder(){
  const main=document.querySelector('main.calc-shell'),one=$('ctuExcelRoutePanel'),two=$('photoInputPanel');
  if(!main||!one||!two)return;
  // Step1 and Step2 are canonical direct children. This eliminates residual wrapper spacing structurally.
  if(one.parentElement!==main)main.insertBefore(one,$('photoRecognitionPanel')||$('quickEntryPanel')||null);
  if(two.parentElement!==main)main.insertBefore(two,$('photoRecognitionPanel')||$('quickEntryPanel')||null);
  if(one.nextElementSibling!==two)main.insertBefore(two,one.nextElementSibling);
}
function removeResidualEmptyShells(){
  const main=document.querySelector('main.calc-shell');
  if(!main)return;
  const protectedIds=new Set(['ctuStickyStatus','ctuExcelRoutePanel','photoInputPanel','photoRecognitionPanel','quickEntryPanel','ctuRegistrationSection','ctuCommonCasePanel']);
  [...main.children].forEach(node=>{
    if(protectedIds.has(node.id))return;
    if(node.matches?.('details.part551-assist-details')){unwrapAssist(node);return;}
    const retired=node.matches?.('.ctu-numbered-card__body,.ctu-numbered-card-unified,.ctu-v1357-independent-card:empty,.part551-assist-details,.part553-completion,.part553-journey,.part553-sticky-next');
    if(retired&&!hasUseful(node))node.remove();
  });
  document.querySelectorAll('details.part551-assist-details').forEach(unwrapAssist);
}
function cleanup(){
  removeKnownLegacyUi();
  enforceCanonicalOrder();
  removeEmptyLegacySiblings();
  removeResidualEmptyShells();
}
function init(){cleanup();[0,80,220,520,1000,1800,2800].forEach(ms=>setTimeout(cleanup,ms));}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',cleanup,{once:true});
['sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-photo-loaded','sk:ctu-photo-applied','sk:ctu-system-applied','sk:ctu-ai-applied']
  .forEach(type=>window.addEventListener(type,()=>setTimeout(cleanup,0)));
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1367-ctu-root-structure-cleanup.js':'v1.3.67'});
})();
