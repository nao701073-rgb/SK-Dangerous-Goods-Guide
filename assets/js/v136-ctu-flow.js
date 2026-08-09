(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const setText=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text};
  function finalize(){
    const excel=$('ctuExcelRoutePanel'),photo=$('photoInputPanel'),ai=$('photoRecognitionPanel'),casePanel=$('ctuCommonCasePanel'),quick=$('quickEntryPanel');
    setText(excel?.querySelector(':scope>h2'),'① 申請書・航路から入力する');
    setText(photo?.querySelector(':scope>h2'),'② 写真を撮影・アップロードする');
    setText(ai?.querySelector('h2'),'写真AI候補を確認する');
    setText($('ctuCommonCaseTitle'),'登録済み案件から入力する（必要な場合）');
    setText(quick?.querySelector(':scope>h2'),'③ 不足項目を確認して参考算出');
    // Do not move DOM here: v1.3.6 ships the correct static order to prevent visual jumping.
    document.documentElement.style.scrollBehavior='auto';
    const p=window.SKDGUserPreferencesV11?.read?.();
    if(p?.autoScroll!==true){
      try{window.scrollTo({top:window.scrollY,left:window.scrollX,behavior:'auto'});}catch(_e){}
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',finalize,{once:true}); else finalize();
})();
