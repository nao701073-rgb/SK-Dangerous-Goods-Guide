(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const prefs=()=>{try{return window.SKDGUserPreferencesV11?.read?.()||{autoScroll:false}}catch{return{autoScroll:false}}};
  function setValue(id,value){const el=$(id);if(!el||value==null||value==='')return;el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  function syncImportedToQuick(detail={}){
    const fields=detail?.fields||window.ISSCTUExcelRoute?.getState?.()?.fields||{};
    const mass=Number(fields.massT);if(Number.isFinite(mass)&&mass>0)setValue('quickMass',Number(mass.toFixed(3)));else if(Number($('mass')?.value)>0)setValue('quickMass',$('mass').value);
    if(fields.cargoName)setValue('quickCargoDescription',fields.cargoName);else if($('cargoDescription')?.value)setValue('quickCargoDescription',$('cargoDescription').value);
    if($('transportPreset')?.value)setValue('quickTransport',$('transportPreset').value);
    if($('ctuPreset')?.value)setValue('quickCtu',$('ctuPreset').value);
    repairMaterial();
  }
  function repairMaterial(){
    const select=$('quickMaterial');if(!select)return;
    try{if(typeof window.setQuickMaterialOptions==='function')window.setQuickMaterialOptions()}catch(_){ }
    if(select.options.length)return;
    const category=$('quickMaterialCategory')?.value||'tensile';
    const rows=category==='support'?[['timber','木材'],['frp','強化プラスチック（FRP等）'],['otherSupport','その他の支保・当て材']]:[['chain','チェーン'],['wire','ワイヤロープ'],['web','ベルト・ウェビング'],['tygard','TY-GARD等'],['other','その他の引張系固縛材']];
    select.innerHTML=rows.map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
  }
  function showError(message){const n=$('quickStatus');if(n)n.textContent=message}
  window.addEventListener('sk:ctu-excel-imported',e=>syncImportedToQuick(e.detail||{}));
  $('quickMaterialCategory')?.addEventListener('change',repairMaterial);
  $('quickMethod')?.addEventListener('change',repairMaterial);
  $('quickCalcBtn')?.addEventListener('click',()=>{syncImportedToQuick();repairMaterial();},true);
  window.addEventListener('error',e=>{const m=String(e?.message||'');if(/quick|calc|lashing|secur|msl|ctu/i.test(m))showError(`算出処理を確認できませんでした：${m}`)});
  document.documentElement.style.scrollBehavior='auto';
  repairMaterial();
  syncImportedToQuick();
  window.SKDGCTUV135={syncImportedToQuick,repairMaterial,autoScroll:()=>Boolean(prefs().autoScroll)};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v135-ctu-stability.js':'v1.3.5'});
})();
