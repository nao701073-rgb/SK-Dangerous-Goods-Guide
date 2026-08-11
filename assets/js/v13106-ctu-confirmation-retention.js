(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const BUILD='v1.3.109-confirmation-retention';
  const $=id=>document.getElementById(id);
  const TRACKED=[
    'quickMass','quickMaterial','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickBasis',
    'quickSupportCount','quickSupportStrength','quickSupportBasis','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL','quickTimberDimensionsConfirmed'
  ];
  const DEPENDENCIES={
    quickStrength:['quickMethod','quickMaterial','quickMaterialProfile','quickStrength'],
    quickCargoMsl:['quickCargoDescription','quickCargoMsl'],
    quickCtuMsl:['quickCtu','quickCtuMsl'],
    quickAngle:['quickAngle'],
    quickCount:['quickCount'],
    quickMaterial:['quickMaterial','quickMaterialProfile'],
    quickBasis:['quickMethod','quickMaterial','quickMaterialProfile','quickBasis'],
    quickSupportStrength:['quickSupportMaterial','quickSupportProfile','quickSupportStrength','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL'],
    quickSupportBasis:['quickSupportMaterial','quickSupportProfile','quickSupportBasis','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL'],
    quickSupportCount:['quickSupportCount'],
    quickTimberThicknessW:['quickSupportMaterial','quickTimberThicknessW'],
    quickTimberHeightH:['quickSupportMaterial','quickTimberHeightH'],
    quickTimberFreeLengthL:['quickSupportMaterial','quickTimberFreeLengthL'],
    quickTimberDimensionsConfirmed:['quickSupportMaterial','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL','quickSupportCount','quickTimberDimensionsConfirmed'],
    quickMass:['quickMass']
  };
  const INVALIDATE_BY_CHANGE={
    quickMethod:['quickStrength','quickBasis'],
    quickMaterial:['quickStrength','quickBasis'],
    quickMaterialProfile:['quickStrength','quickBasis'],
    quickCargoDescription:['quickCargoMsl'],
    quickCtu:['quickCtuMsl'],
    quickSupportMaterial:['quickSupportStrength','quickSupportBasis','quickTimberDimensionsConfirmed'],
    quickSupportProfile:['quickSupportStrength','quickSupportBasis','quickTimberDimensionsConfirmed'],
    quickTimberThicknessW:['quickSupportStrength','quickSupportBasis','quickTimberDimensionsConfirmed'],
    quickTimberHeightH:['quickSupportStrength','quickSupportBasis','quickTimberDimensionsConfirmed'],
    quickTimberFreeLengthL:['quickSupportStrength','quickSupportBasis','quickTimberDimensionsConfirmed'],
    quickSupportCount:['quickTimberDimensionsConfirmed']
  };
  const STEP_DEPENDENCIES={
    1:['loadingPort','dischargePort','departureMonth','quickTransport'],
    3:['quickTransport','quickCtu','quickMass','quickCargoDescription'],
    4:['v1CargoSurface','v1FloorSurface','v1SurfaceCondition','quickMu'],
    5:['quickUseTensile','quickUseSupport','quickMethod','quickMaterial','quickMaterialProfile','quickDirection','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickSupportMaterial','quickSupportProfile','quickSupportDirection','quickSupportCount','quickSupportStrength','quickSupportBasis','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL','quickTimberDimensionsConfirmed'],
    6:['wallCtuPresetQuick','wallPayloadQuick','wallGapForwardCm','wallGapRearCm','wallGapLeftCm','wallGapRightCm','wallUseForward','wallUseRear','wallUseLeft','wallUseRight']
  };
  let hydrating=false,timer=0;
  const val=id=>{const e=$(id);if(!e)return '';return e.type==='checkbox'?String(Boolean(e.checked)):String(e.value??'').trim()};
  const stable=(obj)=>JSON.stringify(obj,Object.keys(obj).sort());
  function fingerprint(id){const deps=DEPENDENCIES[id]||[id];const out={};deps.forEach(k=>out[k]=val(k));return stable(out)}
  function stepFingerprint(step){const deps=STEP_DEPENDENCIES[Number(step)]||[];const out={};deps.forEach(k=>out[k]=val(k));return stable(out)}
  function scope(){
    const qs=new URLSearchParams(location.search).get('applicationId');
    const selected=$('ctuCaseApplicationSelect')?.value||'';
    return String(selected||qs||'').trim();
  }
  function storageKey(s){return s?`SKDG_CTU_CONFIRM_V13106:${s}`:''}
  function snapshot(){
    const accepted=new Set(window.SKCTUProgressState?.accepted||[]),fields={},stepFingerprints={};
    TRACKED.forEach(id=>{if(accepted.has(id)&&$(id))fields[id]=fingerprint(id)});
    const confirmedSteps=window.SKCTUProgressAPI?.getConfirmedSteps?.()||window.SKCTUProgressState?.confirmedSteps||[];
    confirmedSteps.forEach(step=>{step=Number(step);if(STEP_DEPENDENCIES[step])stepFingerprints[step]=stepFingerprint(step)});
    return{schema:'v13109',confirmedAt:new Date().toISOString(),fields,confirmedSteps:[...confirmedSteps],stepFingerprints};
  }
  function saveLocal(){
    if(hydrating)return;
    const s=scope(),key=storageKey(s);if(!key)return;
    try{localStorage.setItem(key,JSON.stringify(snapshot()))}catch(_){ }
  }
  function readLocal(){const key=storageKey(scope());if(!key)return null;try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
  function matchingFields(snap){
    if(!snap?.fields||typeof snap.fields!=='object')return [];
    return Object.entries(snap.fields).filter(([id,fp])=>$(id)&&fingerprint(id)===String(fp)).map(([id])=>id);
  }
  function hydrate(snap,source='saved'){
    const api=window.SKCTUProgressAPI;if(!api?.acceptFields||!snap)return [];
    const ids=matchingFields(snap);
    const steps=(snap.confirmedSteps||[]).map(Number).filter(step=>STEP_DEPENDENCIES[step]&&String(snap.stepFingerprints?.[step]||'')===stepFingerprint(step));
    if(!ids.length&&!steps.length)return [];
    hydrating=true;try{if(ids.length)api.acceptFields(ids);if(steps.length)api.setConfirmedSteps?.(steps);api.update?.()}finally{hydrating=false}
    window.SKCTUGuidedUsabilityV13105?.refresh?.();
    document.dispatchEvent(new CustomEvent('sk:ctu-confirmation-retained',{detail:{fields:ids,steps,source}}));
    return ids.length?ids:steps.map(step=>`step:${step}`);
  }
  function hydrateBest(){
    const embedded=window.SKCTUPendingConfirmationSnapshot||null;
    const fromEmbedded=hydrate(embedded,'registered-result');
    if(fromEmbedded.length){window.SKCTUPendingConfirmationSnapshot=null;saveLocal();return fromEmbedded}
    return hydrate(readLocal(),'same-case');
  }
  function rejectFor(changedId){
    const ids=INVALIDATE_BY_CHANGE[changedId]||[];if(!ids.length)return;
    window.SKCTUProgressAPI?.rejectFields?.(ids);window.SKCTUProgressAPI?.update?.();window.SKCTUGuidedUsabilityV13105?.refresh?.();
    document.dispatchEvent(new CustomEvent('sk:ctu-confirmation-invalidated',{detail:{fields:ids,changedId}}));
  }
  function scheduleSave(){clearTimeout(timer);timer=setTimeout(saveLocal,80)}
  function bind(){
    if(document.documentElement.dataset.v13106Confirmation==='ready')return;
    document.documentElement.dataset.v13106Confirmation='ready';
    document.addEventListener('input',e=>{if(!e.isTrusted||!e.target?.id)return;rejectFor(e.target.id);scheduleSave()},true);
    document.addEventListener('change',e=>{if(!e.isTrusted||!e.target?.id)return;rejectFor(e.target.id);scheduleSave()},true);
    window.addEventListener('sk:ctu-confirm-all-applied',scheduleSave);
    window.addEventListener('sk:ctu-step-confirmed',scheduleSave);
    window.addEventListener('sk:ctu-calculated',scheduleSave);
    window.addEventListener('sk:ctu-registered',scheduleSave);
    window.addEventListener('sk:ctu-restored',()=>setTimeout(()=>{hydrateBest();saveLocal()},80));
    window.addEventListener('sk:ctu-system-applied',scheduleSave);
    setTimeout(hydrateBest,180);setTimeout(hydrateBest,650);
  }
  window.SKCTUConfirmationRetentionV13106={snapshot,hydrate,matchingFields,save:saveLocal,restore:hydrateBest,fingerprint,stepFingerprint};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v13106-ctu-confirmation-retention.js':BUILD});
})();
