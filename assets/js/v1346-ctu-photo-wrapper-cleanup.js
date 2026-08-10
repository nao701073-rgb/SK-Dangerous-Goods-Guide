(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;

  const normalize=value=>String(value||'').replace(/[\s\u3000]+/g,'');
  const legacyLabels=new Set([
    '写真から入力する（必要な場合のみ）',
    '写真から入力する（必要な場合）',
    '写真から入力する'
  ].map(normalize));

  function unwrapLegacyPhotoDetails(){
    document.querySelectorAll('details').forEach(details=>{
      const summary=details.querySelector(':scope > summary');
      if(!summary||!legacyLabels.has(normalize(summary.textContent)))return;

      // The legacy wrapper may contain the live photo-entry controls created by
      // v1-ctu-simple.js / photo-assist scripts. Never remove that subtree.
      const containsLivePhotoUi=Boolean(
        details.querySelector('#v1PhotoStep,#photoInputPanel,#photoRecognitionPanel,#v101AiAssist,#v1PhotoInput,#photoInput,#cameraInput')
      );

      if(containsLivePhotoUi){
        const parent=details.parentNode;
        if(!parent)return;
        [...details.childNodes].forEach(node=>{
          if(node===summary)return;
          parent.insertBefore(node,details);
        });
        details.remove();
        return;
      }

      // If it is only an obsolete empty/duplicate legacy shortcut, remove just it.
      details.remove();
    });
  }


  function unwrapPart551AssistDetails(){
    document.querySelectorAll('details.part551-assist-details').forEach(details=>{
      const parent=details.parentNode;if(!parent)return;
      [...details.childNodes].forEach(node=>{if(node.nodeType===1&&node.tagName==='SUMMARY')return;parent.insertBefore(node,details)});
      details.remove();
    });
  }

  function removeStandaloneLegacyShortcut(){
    document.querySelectorAll('summary,button,a,[role="button"]').forEach(el=>{
      if(!legacyLabels.has(normalize(el.textContent)))return;
      if(el.closest('#v1PhotoStep,#photoInputPanel,#photoRecognitionPanel,#v101AiAssist'))return;
      if(el.closest('details'))return; // handled safely by unwrapLegacyPhotoDetails()
      el.remove();
    });
  }

  function fix(){
    unwrapPart551AssistDetails();
    unwrapLegacyPhotoDetails();
    removeStandaloneLegacyShortcut();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(fix,0),{once:true});
  }else{
    setTimeout(fix,0);
  }
  // Some legacy scripts create the wrapper during their own load handlers.
  // Recheck once only; no polling and no document-wide MutationObserver.
  window.addEventListener('load',()=>setTimeout(fix,0),{once:true});

  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {
    'assets/js/v1346-ctu-photo-wrapper-cleanup.js':'v1.3.65-part551-unwrapper'
  });
})();
