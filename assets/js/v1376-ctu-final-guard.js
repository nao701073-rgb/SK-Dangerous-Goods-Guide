(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
function restoreCasePanel(){
 const panel=$('ctuCommonCasePanel');if(!panel)return;
 panel.classList.remove('v137-is-collapsed','v137-collapsible');
 delete panel.dataset.v137Collapsible;
 panel.querySelectorAll('.v137-collapse-toggle').forEach(btn=>btn.remove());
 const head=panel.querySelector(':scope > .case-section__heading');
 if(!head)return;
 head.style.removeProperty('display');
 let btn=$('v1376CaseToggle');
 if(!btn){
  btn=document.createElement('button');btn.type='button';btn.id='v1376CaseToggle';btn.className='btn v1376-case-toggle';head.append(btn);
  btn.addEventListener('click',()=>{
   const closed=panel.classList.toggle('v1376-case-compact');
   btn.setAttribute('aria-expanded',String(!closed));btn.textContent=closed?'登録済み案件を開く':'登録済み案件を閉じる';
  });
 }
 if(!panel.dataset.v1376CaseInitialized){panel.classList.add('v1376-case-compact');panel.dataset.v1376CaseInitialized='1';}
 const closed=panel.classList.contains('v1376-case-compact');btn.setAttribute('aria-expanded',String(!closed));btn.textContent=closed?'登録済み案件を開く':'登録済み案件を閉じる';
}

function normalizeFieldCargoPanel(){
 const panel=$('fieldCargoUnitPanel');if(!panel)return;
 panel.classList.remove('v137-is-collapsed','v137-collapsible');
 delete panel.dataset.v137Collapsible;
 panel.querySelectorAll('.v137-collapse-toggle').forEach(btn=>btn.remove());
 const head=panel.querySelector(':scope > .part541-heading');if(!head)return;
 let btn=$('v1376FieldCargoToggle');
 if(!btn){
  btn=document.createElement('button');btn.type='button';btn.id='v1376FieldCargoToggle';btn.className='btn v1376-field-toggle';head.append(btn);
  btn.addEventListener('click',()=>{const closed=panel.classList.toggle('v1376-field-compact');btn.setAttribute('aria-expanded',String(!closed));btn.textContent=closed?'現場貨物ユニット・拘束構成を開く':'現場貨物ユニット・拘束構成を閉じる';});
 }
 if(!panel.dataset.v1376FieldInitialized){panel.classList.add('v1376-field-compact');panel.dataset.v1376FieldInitialized='1';}
 const closed=panel.classList.contains('v1376-field-compact');btn.setAttribute('aria-expanded',String(!closed));btn.textContent=closed?'現場貨物ユニット・拘束構成を開く':'現場貨物ユニット・拘束構成を閉じる';
}

function currentOffset(){
 const header=document.querySelector('.site-header,.app-header,header');
 const sticky=$('ctuStickyStatus');
 const hh=header?.getBoundingClientRect().height||0;
 const sh=sticky?.getBoundingClientRect().height||0;
 return Math.ceil(hh+sh+18);
}
function updateScrollOffset(){
 document.documentElement.style.setProperty('--ctu-v1376-scroll-offset',`${currentOffset()}px`);
}
function scrollToTarget(id){
 const target=$(id);if(!target)return;
 const block=target.closest('.ctu-numbered-step-card,[data-ctu-step],.quick-step,.panel,.case-section')||target;
 const top=Math.max(0,window.scrollY+block.getBoundingClientRect().top-currentOffset());
 window.scrollTo({top,behavior:'smooth'});
 target.classList.add('ctu-status-focus');
 setTimeout(()=>target.classList.remove('ctu-status-focus'),1300);
 if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName))setTimeout(()=>target.focus({preventScroll:true}),350);
}
function installTrackerJumpGuard(){
 const status=$('ctuStickyStatus');if(!status||status.dataset.v1376JumpGuard==='1')return;
 status.dataset.v1376JumpGuard='1';
 status.addEventListener('click',event=>{
  const chip=event.target.closest('.ctu-status-chip');
  const jump=event.target.closest('#ctuStickyJump');
  if(!chip&&!jump)return;
  const id=chip?.dataset.focusId||jump?.dataset.focusId;
  if(!id)return;
  event.preventDefault();event.stopImmediatePropagation();
  scrollToTarget(id);
 },true);
}
function normalize(){restoreCasePanel();normalizeFieldCargoPanel();updateScrollOffset();installTrackerJumpGuard();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',normalize,{once:true});else normalize();
window.addEventListener('load',()=>{normalize();setTimeout(normalize,80);setTimeout(normalize,420)},{once:true});
window.addEventListener('resize',()=>requestAnimationFrame(updateScrollOffset));
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1376-ctu-final-guard.js':'v1.3.76'});
})();
