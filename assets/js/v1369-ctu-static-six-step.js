(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const norm=v=>String(v||'').replace(/[\s\u3000]+/g,' ').trim();
const titleMap={1:'申請書・航路から入力する',2:'写真を撮影・アップロードする',3:'輸送条件と貨物を確認',4:'貨物底面とCTU床面を確認',5:'固縛・支保条件を確認',6:'参考算出を確認'};
const getCard=n=>n===1?$('ctuExcelRoutePanel'):n===2?$('photoInputPanel'):document.querySelector(`#quickEntryPanel > .quick-flow > [data-ctu-step="${n}"]`);
function unwrap(node){if(!node?.parentNode)return;const p=node.parentNode;[...node.childNodes].forEach(c=>{if(c.nodeType===1&&c.tagName==='SUMMARY')return;p.insertBefore(c,node)});node.remove()}
function retireLegacy(){
 document.querySelectorAll('details.part551-assist-details').forEach(unwrap);
 const source=$('v131SourceStart');if(source)unwrap(source);
 const ids=['v1PhotoStep','part551QuickProgress','part552ModeBadge','part552ConditionSummary','part552CalcProceed','part553Completion','part553Journey','part553StickyNext','part553RestoreState','part554SaveSummary','part554RegistrationSuccess','part555Context','part555Changes','part556RestoreTools','part558PreviousResult','part558InputGuide','part559Guide','part560CaseBar','ctuStickyAnchor','ctuStickySpacer','v13ConditionCards'];
 ids.forEach(id=>$(id)?.remove());
 document.querySelectorAll('.part551-next,.part552-guide-message,.part552-review-guide,.part553-completion,.part553-journey,.part553-sticky-next,.part559-guide').forEach(n=>n.remove());
 document.body.classList.remove('part559-guide-ready');
}
function canonicalHeader(card,n){
 if(!card)return;
 card.dataset.ctuStep=String(n);card.hidden=false;card.removeAttribute('aria-hidden');card.style.removeProperty('display');
 const head=card.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head');if(!head)return;
 head.classList.add('ctu-step-card__head');
 let num=head.querySelector('.ctu-step-card__num,.quick-step__num,.v1-step-no');
 let title=head.querySelector('.ctu-step-card__title');
 if(!num){num=document.createElement('span');num.className='ctu-step-card__num';head.prepend(num)}
 num.className='ctu-step-card__num';num.textContent=String(n);
 if(!title){title=document.createElement('span');title.className='ctu-step-card__title';head.append(title)}
 title.textContent=titleMap[n];
 [...head.childNodes].forEach(node=>{if(node===num||node===title)return;if(node.nodeType===3&&!norm(node.textContent))return;if(node.nodeType===3)node.remove()});
}
function canonicalOrder(){
 const main=document.querySelector('main.calc-shell'),status=$('ctuStickyStatus'),one=$('ctuExcelRoutePanel'),two=$('photoInputPanel'),photoAi=$('photoRecognitionPanel'),quick=$('quickEntryPanel'),flow=quick?.querySelector(':scope > .quick-flow');
 if(!main||!status||!one||!two||!quick||!flow)return;
 // Step 1/2 are direct children immediately below the status. No wrappers, no empty shell between them.
 if(one.parentElement!==main)main.insertBefore(one,status.nextSibling);
 if(status.nextElementSibling!==one)main.insertBefore(one,status.nextElementSibling);
 if(two.parentElement!==main)main.insertBefore(two,one.nextElementSibling);
 if(one.nextElementSibling!==two)main.insertBefore(two,one.nextElementSibling);
 // Photo AI is optional supplemental content after Step 2; quick deck follows it or Step 2.
 if(photoAi&&photoAi.parentElement!==main)main.insertBefore(photoAi,two.nextElementSibling);
 const anchor=photoAi&&photoAi.parentElement===main?photoAi:two;
 if(quick.parentElement!==main)main.insertBefore(quick,anchor.nextElementSibling);
 if(anchor.nextElementSibling!==quick)main.insertBefore(quick,anchor.nextElementSibling);
 const cards=[3,4,5,6].map(getCard).filter(Boolean);cards.forEach(c=>flow.appendChild(c));
}
function normalizeAll(){for(let n=1;n<=6;n++)canonicalHeader(getCard(n),n)}
function cleanupEmptyShells(){
 const main=document.querySelector('main.calc-shell'),flow=$('quickEntryPanel')?.querySelector(':scope > .quick-flow');
 const protectedIds=new Set(['ctuCommonCasePanel','ctuStickyStatus','ctuExcelRoutePanel','photoInputPanel','photoRecognitionPanel','quickEntryPanel','ctuRegistrationSection']);
 [main,flow].filter(Boolean).forEach(parent=>[...parent.children].forEach(node=>{
  if(protectedIds.has(node.id)||node.matches?.('.hero,.top-actions,[data-ctu-step]'))return;
  const has=node.querySelector?.('input,select,textarea,button,a,canvas,img,table')||norm(node.textContent);
  const legacy=node.matches?.('.ctu-numbered-card__body,.ctu-numbered-card-unified,.part551-assist-details,[data-v1356-legacy-progress-hidden]');
  if(legacy&&!has)node.remove();
 }));
}
function syncStep5(){
 const category=$('quickMaterialCategory')?.value||'tensile',panels=$('ctuStep5Panels'),support=$('ctuSupportSecuringPanel');if(!panels)return;
 const combined=category==='combined';panels.classList.toggle('is-combined',combined);if(support)support.hidden=!combined;
 const n1=$('ctuPrimarySecuringPanelNum'),n2=$('ctuSupportSecuringPanelNum');if(n1)n1.textContent='1';if(n2)n2.textContent='2';
}
function setupScrollTracking(){
 const chips=[...document.querySelectorAll('.ctu-status-chip[data-ctu-step]')];
 const cards=[1,2,3,4,5,6].map(n=>({n,el:getCard(n)})).filter(x=>x.el);if(!chips.length||!cards.length)return;
 let raf=0;const refresh=()=>{raf=0;const y=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sk38-header-height'))||40)+150;let current=cards[0].n;for(const x of cards){if(x.el.getBoundingClientRect().top<=y)current=x.n;else break}chips.forEach(c=>c.classList.toggle('is-current-step',Number(c.dataset.ctuStep)===current));};
 addEventListener('scroll',()=>{if(!raf)raf=requestAnimationFrame(refresh)},{passive:true});addEventListener('resize',()=>{if(!raf)raf=requestAnimationFrame(refresh)},{passive:true});refresh();
}
function enforce(){retireLegacy();canonicalOrder();normalizeAll();cleanupEmptyShells();syncStep5()}
function init(){
 enforce();$('quickMaterialCategory')?.addEventListener('change',()=>{syncStep5();normalizeAll()});setupScrollTracking();
 [80,250,600,1200].forEach(ms=>setTimeout(enforce,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('load',()=>setTimeout(enforce,0),{once:true});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1369-ctu-static-six-step.js':'v1.3.69'});
})();
