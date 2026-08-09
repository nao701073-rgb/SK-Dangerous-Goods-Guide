(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const body=document.body,input=$('intakeFileInput'),cargo=$('intakeCargoBody');
  if(!cargo)return;
  let active=true,timer=null,hardStop=null,lastMutation=Date.now(),sawRows=false;
  const reviewText=/(追加の確認|追加確認|人による確認|人の確認|確認が必要|自動確認|原本で確認|内容を確認済み|要確認なし)/;

  function markStatusNodes(){
    if(cargo.children.length)sawRows=true;
    const nodes=[...cargo.querySelectorAll('div,section,aside,p')];
    for(const el of nodes){
      const text=String(el.textContent||'').replace(/\s+/g,' ').trim();
      if(!text||text.length>650||!reviewText.test(text))continue;
      if(el.querySelector('input,select,textarea'))continue;
      let node=el;
      while(node.parentElement&&node.parentElement!==cargo&&node.parentElement.tagName!=='TR'){
        const p=node.parentElement,pt=String(p.textContent||'').replace(/\s+/g,' ').trim();
        if(pt.length>850||p.querySelector('input,select,textarea'))break;
        node=p;
      }
      node.classList.add('v133-review-status-node');
    }
  }
  function finish(){
    if(!active)return;
    active=false;clearTimeout(timer);clearTimeout(hardStop);markStatusNodes();
    requestAnimationFrame(()=>body.classList.remove('v133-intake-settling'));
  }
  function schedule(){
    if(!active)return;
    markStatusNodes();lastMutation=Date.now();clearTimeout(timer);
    // The allowance resolver can replace an initial green status roughly one second later.
    // Wait for a longer quiet period so only the final status is shown.
    timer=setTimeout(()=>{
      if(Date.now()-lastMutation>=1350&&(sawRows||!input?.files?.length))finish();
    },1400);
  }
  function begin(){
    active=true;sawRows=Boolean(cargo.children.length);body.classList.add('v133-intake-settling');
    clearTimeout(hardStop);hardStop=setTimeout(finish,8000);schedule();
  }

  // Start hidden from the first paint when an existing imported case is being restored.
  body.classList.add('v133-intake-settling');
  input?.addEventListener('change',begin,{capture:true});
  $('intakeDropZone')?.addEventListener('drop',()=>queueMicrotask(begin),{capture:true});
  ['sk:intake-imported','sk:application-intake-imported','sk:intake-complete'].forEach(n=>window.addEventListener(n,schedule));
  const obs=new MutationObserver(()=>{if(active)schedule();else markStatusNodes()});
  obs.observe(cargo,{subtree:true,childList:true,attributes:true,characterData:true});
  markStatusNodes();schedule();
  window.addEventListener('beforeunload',()=>{obs.disconnect();clearTimeout(timer);clearTimeout(hardStop)},{once:true});
})();
