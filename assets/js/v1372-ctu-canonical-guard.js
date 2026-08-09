(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const TITLES={1:'申請書・航路から入力する',2:'写真を撮影・アップロードする',3:'輸送条件と貨物を確認',4:'貨物底面とCTU床面を確認',5:'固縛・支保条件を確認',6:'参考算出を確認'};
const norm=v=>String(v||'').replace(/[\s\u3000]+/g,' ').trim();
let enforcing=false, queued=false;
function canonicalCards(){
  const one=$('ctuExcelRoutePanel');
  const two=$('photoInputPanel');
  const three=$('quickTransport')?.closest('.quick-step');
  const four=[...document.querySelectorAll('#v1CargoSurface')].map(e=>e.closest('.quick-step')).find(Boolean)||[...document.querySelectorAll('#v1ContactStep')].find(e=>e.classList.contains('quick-step'))||null;
  const five=$('quickMaterialCategory')?.closest('.quick-step');
  const six=$('quickCalcBtn')?.closest('.quick-step');
  return [one,two,three,four,five,six];
}
function makeHeader(card,n){
  if(!card)return;
  if(card.dataset.ctuStep!==String(n))card.dataset.ctuStep=String(n);
  if(card.hidden)card.hidden=false;
  if(card.hasAttribute('hidden'))card.removeAttribute('hidden');
  if(card.hasAttribute('aria-hidden'))card.removeAttribute('aria-hidden');
  let head=card.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head,:scope > h2');
  if(!head)return;
  head.classList.add('ctu-step-card__head');
  if(head.classList.contains('quick-step__head')===false&&card.classList.contains('quick-step'))head.classList.add('quick-step__head');
  let num=head.querySelector(':scope > .ctu-step-card__num');
  let title=head.querySelector(':scope > .ctu-step-card__title');
  if(!num){num=document.createElement('span');num.className='ctu-step-card__num';}
  if(!title){title=document.createElement('span');title.className='ctu-step-card__title';}
  if(num.textContent!==String(n))num.textContent=String(n);
  if(title.textContent!==TITLES[n])title.textContent=TITLES[n];
  const desired=[num,title];
  const children=[...head.children];
  if(children.length!==2||children[0]!==num||children[1]!==title){head.replaceChildren(...desired)}
}
function canonicalOrder(cards){
  const main=document.querySelector('main.calc-shell'),status=$('ctuStickyStatus'),quick=$('quickEntryPanel'),flow=quick?.querySelector(':scope > .quick-flow');
  const [one,two,three,four,five,six]=cards;
  if(main&&status&&one&&two){
    if(one.parentElement!==main||status.nextElementSibling!==one)main.insertBefore(one,status.nextElementSibling);
    if(two.parentElement!==main||one.nextElementSibling!==two)main.insertBefore(two,one.nextElementSibling);
    const photoAi=$('photoRecognitionPanel');
    if(photoAi&&photoAi.parentElement!==main)main.insertBefore(photoAi,two.nextElementSibling);
    const anchor=photoAi?.parentElement===main?photoAi:two;
    if(quick&&quick.parentElement!==main)main.insertBefore(quick,anchor.nextElementSibling);
    if(quick&&anchor.nextElementSibling!==quick)main.insertBefore(quick,anchor.nextElementSibling);
  }
  if(flow){
    const wanted=[three,four,five,six].filter(Boolean);
    wanted.forEach((card,index)=>{
      const at=flow.children[index];
      if(at!==card)flow.insertBefore(card,at||null);
    });
  }
}
function unwrap(node){
  if(!node?.parentNode)return;
  const p=node.parentNode;
  [...node.childNodes].forEach(c=>{if(c.nodeType===1&&c.tagName==='SUMMARY')return;p.insertBefore(c,node)});
  node.remove();
}
function retireLegacy(){
  document.querySelectorAll('details.part551-assist-details').forEach(unwrap);
  const source=$('v131SourceStart');if(source)unwrap(source);
  ['v1PhotoStep','v1ApplicationImport','v13ConditionCards','part551QuickProgress','part552ModeBadge','part552ConditionSummary','part552CalcProceed','part553Completion','part553Journey','part553StickyNext','part553RestoreState','part554SaveSummary','part554RegistrationSuccess','part555Context','part555Changes','part556RestoreTools','part558PreviousResult','part558InputGuide','part559Guide','part560CaseBar','ctuStickyAnchor','ctuStickySpacer'].forEach(id=>document.querySelectorAll(`#${id}`).forEach(n=>n.remove()));
  document.querySelectorAll('.v1-contact-step:not(.quick-step),.part551-next,.part552-guide-message,.part552-review-guide,.part553-completion,.part553-journey,.part553-sticky-next,.part559-guide,[data-v1356-legacy-progress-hidden]').forEach(n=>n.remove());
  document.body.classList.remove('part559-guide-ready');
}
function removeEmptyVisualShells(cards){
  const protectedNodes=new Set(cards.filter(Boolean));
  [$('ctuStickyStatus'),$('quickEntryPanel'),$('photoRecognitionPanel'),$('ctuRegistrationSection'),$('deficiencySupportPanel'),$('ctuCommonCasePanel')].filter(Boolean).forEach(n=>protectedNodes.add(n));
  const parents=[document.querySelector('main.calc-shell'),$('quickEntryPanel')?.querySelector(':scope > .quick-flow')].filter(Boolean);
  parents.forEach(parent=>[...parent.children].forEach(node=>{
    if(protectedNodes.has(node)||node.matches?.('.hero,.top-actions,.advanced-section,.result-registration-panel,.part541-deficiency-panel'))return;
    const controls=node.querySelector?.('input,select,textarea,button,a,canvas,img,table,svg');
    if(!controls&&!norm(node.textContent)&&node.matches?.('section,div,details,.panel,.quick-step,.ctu-numbered-step-card,.ctu-numbered-card-unified,.ctu-numbered-card__body'))node.remove();
  }));
}
function repairMethodOptions(){
  const method=$('quickMethod'),category=$('quickMaterialCategory');if(!method)return;
  const supportOnly=category?.value==='support';
  const wanted=[['direct','直接固縛'],['topover','トップオーバー']];
  let current=method.value;
  if(!wanted.some(([v])=>v===current))current=method.dataset.ctuLastMethod||'direct';
  const exact=method.options.length===2&&wanted.every(([v,l],i)=>method.options[i]?.value===v&&norm(method.options[i]?.textContent)===l);
  if(!exact){method.replaceChildren(...wanted.map(([v,l])=>{const o=document.createElement('option');o.value=v;o.textContent=l;return o}))}
  if(supportOnly){
    if(method.dataset.ctuWasSupport!=='1'&&!method.dataset.ctuLastMethod&&(current==='topover'||current==='direct'))method.dataset.ctuLastMethod=current;
    method.dataset.ctuWasSupport='1';
    method.value='direct';method.disabled=true;method.setAttribute('aria-disabled','true');
  }else{
    const comingBack=method.dataset.ctuWasSupport==='1';
    method.disabled=false;method.removeAttribute('disabled');method.setAttribute('aria-disabled','false');
    const restored=comingBack?(method.dataset.ctuLastMethod||'direct'):((current==='topover'||current==='direct')?current:(method.dataset.ctuLastMethod||'direct'));
    method.value=(restored==='topover'||restored==='direct')?restored:'direct';
    method.dataset.ctuLastMethod=method.value;
    delete method.dataset.ctuWasSupport;
  }
}
function syncStep5(){
  const category=$('quickMaterialCategory')?.value||'tensile';
  const panels=$('ctuStep5Panels'),support=$('ctuSupportSecuringPanel');
  if(panels)panels.classList.toggle('is-combined',category==='combined');
  if(support)support.hidden=category!=='combined';
}
function enforce(){
  if(enforcing)return;enforcing=true;
  try{
    retireLegacy();
    const cards=canonicalCards();
    canonicalOrder(cards);
    cards.forEach((c,i)=>makeHeader(c,i+1));
    removeEmptyVisualShells(cards);
    repairMethodOptions();syncStep5();
    const calc=$('quickCalcBtn');if(calc&&calc.textContent!=='この条件で算出する')calc.textContent='この条件で算出する';
    document.documentElement.dataset.ctuCanonical='1372';
  }finally{enforcing=false}
}
function queueEnforce(){if(queued)return;queued=true;queueMicrotask(()=>{queued=false;enforce()})}
function watchCanonicalStructure(){
  const cards=canonicalCards(),flow=$('quickEntryPanel')?.querySelector(':scope > .quick-flow');
  const observer=new MutationObserver(muts=>{
    if(enforcing)return;
    if(muts.some(m=>m.type==='childList'||m.type==='characterData'||(m.type==='attributes'&&['data-ctu-step','hidden','class'].includes(m.attributeName))))queueEnforce();
  });
  cards.filter(Boolean).forEach(card=>{
    const head=card.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head,:scope > h2');
    if(head)observer.observe(head,{childList:true,subtree:true,characterData:true});
    observer.observe(card,{attributes:true,attributeFilter:['data-ctu-step','hidden']});
  });
  if(flow)observer.observe(flow,{childList:true});
}
function setupMethodGuard(){
  document.documentElement.dataset.ctuMethodGuard='1373';
  // Delegate from document so the guard survives any late legacy DOM replacement.
  document.addEventListener('change',event=>{
    const target=event.target;if(!(target instanceof Element))return;
    const method=$('quickMethod'),category=$('quickMaterialCategory');
    if(target.id==='quickMaterialCategory'){
      if(category?.value==='support'&&method&&(method.value==='direct'||method.value==='topover'))method.dataset.ctuLastMethod=method.value;
      queueMicrotask(()=>{
        repairMethodOptions();
        if(typeof setQuickMaterialOptions==='function')setQuickMaterialOptions();
        repairMethodOptions();syncStep5();
      });
    }else if(target.id==='quickMethod'){
      if(method&&(method.value==='direct'||method.value==='topover'))method.dataset.ctuLastMethod=method.value;
      queueMicrotask(()=>{
        repairMethodOptions();
        if(typeof setQuickMaterialOptions==='function')setQuickMaterialOptions();
        repairMethodOptions();syncStep5();
      });
    }
  },true);
  document.addEventListener('pointerdown',event=>{if(event.target?.id==='quickMethod')repairMethodOptions()},true);
  document.addEventListener('focusin',event=>{if(event.target?.id==='quickMethod')repairMethodOptions()},true);
  window.addEventListener('sk:ctu-restored',e=>{const m=e.detail?.method;if(m==='direct'||m==='topover'){const method=$('quickMethod');if(method)method.dataset.ctuLastMethod=m}queueMicrotask(()=>{repairMethodOptions();if(typeof setQuickMaterialOptions==='function')setQuickMaterialOptions();repairMethodOptions()})});
}
function setupCurrentStep(){
  const chips=[...document.querySelectorAll('.ctu-status-chip[data-ctu-step]')];
  let raf=0;
  const refresh=()=>{raf=0;const cards=canonicalCards();const y=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sk38-header-height'))||40)+115;let current=1;cards.forEach((card,i)=>{if(card&&card.getBoundingClientRect().top<=y)current=i+1});chips.forEach(c=>c.classList.toggle('is-current-step',Number(c.dataset.ctuStep)===current))};
  addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(refresh)},{passive:true});addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(refresh)},{passive:true});refresh();
}
function init(){
  enforce();setupMethodGuard();watchCanonicalStructure();setupCurrentStep();
  [50,150,350,800,1600,3000].forEach(ms=>setTimeout(enforce,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',()=>setTimeout(enforce,0),{once:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1372-ctu-canonical-guard.js':'v1.3.73'});
})();
