(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const norm=v=>String(v||'').replace(/[\s\u3000]+/g,' ').trim();
  const hasUsefulContent=node=>{
    if(!node)return false;
    if(node.querySelector?.('input,select,textarea,button,a,canvas,img,table'))return true;
    if(node.querySelector?.('.ctu-step-card__head,.quick-step__head,.v1-step-head'))return true;
    return norm(node.textContent).length>1;
  };
  const isRealStep=node=>{
    if(!node)return false;
    if(node.id==='ctuExcelRoutePanel'||node.id==='photoInputPanel')return true;
    const step=String(node.dataset?.ctuStep||'');
    if(!['3','4','5','6'].includes(step))return false;
    if(step==='3')return Boolean(node.querySelector('#quickTransport,#quickMass'));
    if(step==='4')return Boolean(node.querySelector('input,select,textarea'));
    if(step==='5')return Boolean(node.querySelector('#quickMaterialCategory,#quickMethod'));
    if(step==='6')return Boolean(node.querySelector('#quickCalcBtn,#quickStatus'));
    return false;
  };
  function hideGhost(node){
    if(!node||isRealStep(node))return;
    if(hasUsefulContent(node))return;
    node.dataset.v1364GhostCard='1';
    node.hidden=true;
    node.setAttribute('aria-hidden','true');
  }
  function cleanup(){
    document.querySelectorAll('.ctu-numbered-step-card,.quick-step[data-ctu-step]').forEach(hideGhost);
    // Remove structurally empty direct siblings accidentally left by old card-normalization scripts.
    const anchors=[document.getElementById('ctuExcelRoutePanel'),document.getElementById('photoInputPanel')].filter(Boolean);
    anchors.forEach(anchor=>{
      [anchor.previousElementSibling,anchor.nextElementSibling].filter(Boolean).forEach(node=>{
        if(node.matches?.('#ctuStickyStatus,#ctuExcelRoutePanel,#photoInputPanel,#photoRecognitionPanel,#quickEntryPanel'))return;
        if((node.matches?.('.ctu-numbered-step-card,.quick-step,.ctu-numbered-card__body'))&&!hasUsefulContent(node)){
          node.dataset.v1364GhostCard='1';node.hidden=true;node.setAttribute('aria-hidden','true');
        }
      });
    });
  }
  function init(){cleanup();[50,150,350,700,1200,2200].forEach(ms=>setTimeout(cleanup,ms));}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',cleanup,{once:true});
  ['sk:ctu-excel-imported','sk:ctu-excel-cleared','sk:ctu-photo-loaded','sk:ctu-photo-applied','sk:ctu-system-applied','sk:ctu-ai-applied','sk:ctu-calculated'].forEach(type=>window.addEventListener(type,()=>setTimeout(cleanup,0)));
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1364-ctu-ghost-card-cleanup.js':'v1.3.64'});
})();
