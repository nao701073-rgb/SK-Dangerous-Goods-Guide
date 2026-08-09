(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  let orderTimer=null;

  function forceSourceOrder(){
    const excel=$('ctuExcelRoutePanel'),photo=$('v1PhotoStep');
    const host=$('v131SourceStart');
    if(excel){
      excel.hidden=false;
      excel.classList.add('v133-source-application');
      const parentDetails=excel.closest('details'); if(parentDetails)parentDetails.open=true;
    }
    if(photo){
      photo.hidden=false;
      photo.classList.add('v133-source-photo');
    }
    if(host&&excel){
      if(host.firstElementChild!==excel)host.insertBefore(excel,host.firstElementChild);
      if(photo&&excel.nextElementSibling!==photo)host.insertBefore(photo,excel.nextElementSibling);
    }
    // Hide obsolete duplicate toggles left by older overlays, but never hide the real panel.
    document.querySelectorAll('summary,button,a').forEach(el=>{
      if(excel?.contains(el)||photo?.contains(el))return;
      const t=String(el.textContent||'').replace(/\s+/g,'').trim();
      if(t.includes('申請書・航路から入力する（必要な場合のみ）'))el.classList.add('v133-obsolete-source-toggle');
    });
  }

  function initPicker(){
    const input=$('ctuExcelFile'),drop=$('ctuExcelDropZone'),status=$('ctuExcelStatus');
    if(!input)return;
    input.classList.add('ctu-excel-native-input');
    input.removeAttribute('hidden');
    input.setAttribute('aria-label','Excel申請書を選択');

    // The input itself is intentionally visible: clicking it invokes the browser's native file picker.
    // This does not depend on input.click(), labels, or another script being initialized first.
    input.addEventListener('change',()=>{
      const file=input.files?.[0];
      if(status&&file)status.textContent=`${file.name} を読み込んでいます…`;
      // Normally the core importer owns the change event. This fallback only runs if it did not bind.
      if(file&&!drop?.dataset?.ctuExcelImporterBound&&window.ISSCTUExcelRoute?.handleFile){
        window.ISSCTUExcelRoute.handleFile(file);
      }
    },{capture:true});
  }

  function init(){
    forceSourceOrder();
    initPicker();
    clearTimeout(orderTimer);orderTimer=setTimeout(forceSourceOrder,0);
    setTimeout(forceSourceOrder,120);
    setTimeout(forceSourceOrder,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',forceSourceOrder,{once:true});
  ['sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-photo-loaded','sk:ctu-photo-applied'].forEach(n=>window.addEventListener(n,forceSourceOrder));
})();
