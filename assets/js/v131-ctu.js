(()=>{
 'use strict';
 if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
 const $=id=>document.getElementById(id);
 let tries=0,scheduled=false;
 function ensureStart(){
   const main=document.querySelector('main.calc-shell'); if(!main)return false;
   let host=$('v131SourceStart');
   if(!host){
     host=document.createElement('div');host.id='v131SourceStart';host.setAttribute('aria-label','申請書・写真から入力');
     const anchor=document.querySelector('.top-actions')||document.querySelector('.hero');
     if(anchor?.nextSibling)anchor.parentNode.insertBefore(host,anchor.nextSibling);else main.prepend(host);
   }
   const excel=$('ctuExcelRoutePanel'),photo=$('v1PhotoStep');

   // IMPORTANT: generation timing differs by browser. Always force the real DOM order to 1 -> 2.
   if(excel){
     if(excel.parentNode!==host || host.firstElementChild!==excel)host.insertBefore(excel,host.firstElementChild);
     excel.classList.add('v101-first-step','v131-source-application');
   }
   if(photo){
     if(excel){
       if(excel.nextElementSibling!==photo)host.insertBefore(photo,excel.nextElementSibling);
     }else if(photo.parentNode!==host || host.firstElementChild!==photo){
       host.insertBefore(photo,host.firstElementChild);
     }
     photo.classList.add('v13-photo-top','v131-source-photo');
   }

   if(excel){
     const h=excel.querySelector(':scope>h2');
     if(h)h.innerHTML='<span class="v131-source-no">1</span>申請書・航路から入力する';
   }
   if(photo){
     const head=photo.querySelector('.v1-step-head');
     if(head)head.innerHTML='<span class="v1-step-no">2</span><span>写真から入力する</span>';
   }
   const quick=$('quickEntryPanel');const heads=quick?[...quick.querySelectorAll('.quick-step__head')]:[];
   if(heads[0])heads[0].innerHTML='<span class="quick-step__num">3</span>輸送条件と貨物を確認';
   const contact=$('v1ContactStep');if(contact){const n=contact.querySelector('.v1-step-no');if(n)n.textContent='4'}
   if(heads[1])heads[1].innerHTML='<span class="quick-step__num">5</span>固縛材・支保条件を確認';
   if(heads[2])heads[2].innerHTML='<span class="quick-step__num">6</span>参考算出';
   return Boolean(excel&&photo&&host.firstElementChild===excel&&excel.nextElementSibling===photo);
 }
 function scheduleEnsure(){
   if(scheduled)return;scheduled=true;
   queueMicrotask(()=>{scheduled=false;ensureStart()});
 }
 function tick(){tries++;if(ensureStart()||tries>80)return;setTimeout(tick,50)}
 tick();
 document.addEventListener('DOMContentLoaded',()=>{tries=0;tick()},{once:true});
 window.addEventListener('load',scheduleEnsure,{once:true});
 ['sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-photo-loaded','sk:ctu-photo-applied'].forEach(name=>window.addEventListener(name,scheduleEnsure));
 const mo=new MutationObserver(scheduleEnsure);
 mo.observe(document.body,{childList:true,subtree:true});
})();
