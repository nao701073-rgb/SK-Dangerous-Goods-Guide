(()=>{
  'use strict';
  const visibleVersion='Version 1.0 試作版';
  const qs=(sel,root=document)=>root.querySelector?.(sel)||null;

  function normalizeVersion(root=document){
    const nodes=[];
    if(root?.matches?.('.status-badge,[data-version-label]'))nodes.push(root);
    root?.querySelectorAll?.('.status-badge,[data-version-label]').forEach(el=>nodes.push(el));
    nodes.forEach(el=>{
      const current=(el.textContent||'').trim();
      if(/^Version\s+[0-9.]+\s*試作版$/i.test(current) && current!==visibleVersion){
        el.textContent=visibleVersion;
      }
    });
  }

  const reveal=el=>{
    if(!el)return false;
    if(el.hidden)el.hidden=false;
    el.removeAttribute?.('hidden');
    el.classList?.remove('is-hidden','v137-is-collapsed','is-collapsed');
    if(!el.classList?.contains('v138-photo-force-visible'))el.classList?.add('v138-photo-force-visible');
    if(el.style){
      if(el.style.display==='none')el.style.display='';
      if(el.style.visibility==='hidden')el.style.visibility='';
      if(el.style.maxHeight==='0px')el.style.maxHeight='';
      if(el.style.height==='0px')el.style.height='';
    }
    if(el.tagName==='DETAILS')el.open=true;
    return true;
  };

  const revealAncestors=el=>{
    let cur=el?.parentElement;
    while(cur&&cur!==document.body){
      if(cur.tagName==='DETAILS'&&!cur.open)cur.open=true;
      if(cur.hidden||cur.classList?.contains('is-hidden')||cur.classList?.contains('v137-is-collapsed')||cur.classList?.contains('is-collapsed'))reveal(cur);
      cur=cur.parentElement;
    }
  };

  function ensurePhotoPanel(){
    const panel=document.getElementById('photoInputPanel');
    const quick=document.getElementById('v1PhotoStep');
    const appSection=document.getElementById('applicationPhotoSection');
    // On unrelated pages (e.g. Home), do no document-wide photo scan at all.
    if(!panel&&!quick&&!appSection)return false;

    if(panel){
      reveal(panel);revealAncestors(panel);
      const route=document.getElementById('ctuExcelRoutePanel');
      if(route?.parentNode&&route.nextElementSibling!==panel){
        try{route.parentNode.insertBefore(panel,route.nextElementSibling);}catch(_e){}
      }
    }
    if(quick){reveal(quick);revealAncestors(quick);}

    // Legacy CTU layouts only. The selector is intentionally scoped to details on a relevant page.
    document.querySelectorAll('details').forEach(d=>{
      const summary=d.querySelector(':scope > summary');
      const t=(summary?.textContent||'').replace(/\s+/g,'');
      if(t.includes('写真から入力')){
        if(!d.open)d.open=true;
        if(!d.classList.contains('v138-photo-force-open'))d.classList.add('v138-photo-force-open');
        reveal(d);
      }
    });
    return true;
  }

  function openPhotoEntry(trigger){
    ensurePhotoPanel();
    const target=document.getElementById('photoInputPanel')||document.getElementById('v1PhotoStep');
    if(target){
      reveal(target);revealAncestors(target);
      const input=document.getElementById('photoInput')||document.getElementById('cameraInput')||document.getElementById('v1PhotoInput');
      if(input&&trigger?.dataset?.openPicker==='true')input.click();
      target.scrollIntoView?.({block:'start'});
      return true;
    }
    const section=document.getElementById('applicationPhotoSection');
    if(section){
      document.querySelectorAll('.application-primary-section').forEach(s=>{if(s!==section&&s.hidden!==true)s.hidden=true;});
      reveal(section);section.scrollIntoView?.({block:'start'});return true;
    }
    const input=document.querySelector('input[type="file"][accept*="image"]');
    if(input){input.click();return true;}
    return false;
  }

  function isPhotoTrigger(el){
    const txt=(el?.textContent||'').replace(/\s+/g,'').trim();
    return txt.includes('写真から登録')||txt.includes('写真から入力')||txt.includes('写真を撮影・アップロード');
  }

  // Delegation keeps dynamically-created buttons working without a MutationObserver.
  document.addEventListener('click',ev=>{
    const trigger=ev.target?.closest?.('button,a,summary,[role="button"]');
    if(!trigger||!isPhotoTrigger(trigger))return;
    if(!openPhotoEntry(trigger))return;
    if(trigger.tagName==='SUMMARY'){
      ev.preventDefault();
      const d=trigger.closest('details');if(d)d.open=true;
    }
  },true);

  function init(){normalizeVersion();ensurePhotoPanel();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',()=>{normalizeVersion();ensurePhotoPanel();},{once:true});
  window.SKDGPhotoEntryV139={open:openPhotoEntry,ensure:ensurePhotoPanel,normalizeVersion};
  // Backward compatibility for callers introduced in v1.3.8.
  window.SKDGPhotoEntryV138=window.SKDGPhotoEntryV139;
})();
