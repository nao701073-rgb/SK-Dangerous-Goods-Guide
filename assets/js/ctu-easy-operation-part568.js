(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const num=id=>Math.max(0,Number($(id)?.value)||0);
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function currentApp(){const id=$('ctuCaseApplicationSelect')?.value;return applications().find(app=>String(app.id)===String(id))||null}
  function visible(id){const n=$(id);return Boolean(n&&!n.hidden&&n.getClientRects().length)}
  function ensureAssist(){
    const anchor=$('part567MslSummary')||$('part566MslShortcuts');if(!anchor||$('part568FieldAssist'))return;
    const box=document.createElement('section');box.id='part568FieldAssist';box.className='part568-field-assist';box.innerHTML=`
      <div class="part568-field-assist__head"><div><span>現場入力チェック</span><strong id="part568FieldStatus">入力状態を確認中</strong><small>既存の算出式は変更せず、不足している入力・確認だけを案内します。</small></div><button type="button" id="part568FocusMissing">最初の不足項目へ</button></div>
      <div class="part568-field-checks" id="part568FieldChecks"></div>
      <div class="part568-photo-shortcuts"><button type="button" id="part568CargoPhoto">貨物側MSL写真を撮影・選択</button><button type="button" id="part568CtuPhoto">CTU側MSL写真を撮影・選択</button><button type="button" id="part568PointRegistry">取付点MSL台帳へ</button></div>`;
    anchor.insertAdjacentElement('afterend',box);
    $('part568FocusMissing')?.addEventListener('click',()=>focusMissing());
    $('part568CargoPhoto')?.addEventListener('click',()=>openPhoto('cargo'));
    $('part568CtuPhoto')?.addEventListener('click',()=>openPhoto('ctu'));
    $('part568PointRegistry')?.addEventListener('click',()=>document.querySelector('.msl-point-registry')?.scrollIntoView?.({behavior:'smooth',block:'start'}));
  }
  function checks(){
    const category=$('quickMaterialCategory')?.value||'tensile',method=$('quickMethod')?.value||'direct',list=[];
    list.push({id:'quickMass',label:'貨物質量',ok:num('quickMass')>0});
    if(category!=='support'){
      list.push({id:'quickCount',label:'固縛材の本数',ok:num('quickCount')>0});
      list.push({id:'quickStrength',label:method==='topover'?'確認済み強度／STF':'固縛材MSL',ok:num('quickStrength')>0});
      if(method==='direct'){
        list.push({id:'quickCargoMsl',label:'貨物側取付部MSL',ok:num('quickCargoMsl')>0,photo:'cargo'});
        list.push({id:'quickCtuMsl',label:'CTU側固縛点MSL',ok:num('quickCtuMsl')>0,photo:'ctu'});
      }
    }
    if(category==='support'||category==='combined'){
      list.push({id:'quickSupportCount',label:'支保・当て材の個数',ok:num('quickSupportCount')>0});
      list.push({id:'quickSupportStrength',label:'確認済み支保力',ok:num('quickSupportStrength')>0});
      list.push({id:'quickSupportBasis',label:'支保力の根拠',ok:Boolean(String($('quickSupportBasis')?.value||'').trim())});
    }
    if(category==='combined')list.push({id:'quickCombinationConfirmed',label:'併用成立条件',ok:Boolean($('quickCombinationConfirmed')?.checked)});
    const friction=$('quickFriction')?.value||'';
    if(friction==='unknown')list.push({id:'quickFriction',label:'接触面状態の確認',ok:false});
    if(friction==='verified')list.push({id:'quickMu',label:'確認済み摩擦係数',ok:num('quickMu')>0});
    return list;
  }
  function registryState(){
    const app=currentApp(),points=Array.isArray(app?.ctuMslPointRegistry)?app.ctuMslPointRegistry.filter(row=>row?.planned!==false):[],unconfirmed=points.filter(row=>(row.reviewStatus||'unconfirmed')!=='confirmed');
    return {points,unconfirmed};
  }
  function render(){
    ensureAssist();const box=$('part568FieldAssist'),out=$('part568FieldChecks'),status=$('part568FieldStatus');if(!box||!out||!status)return;
    const list=checks(),missing=list.filter(item=>!item.ok),registry=registryState(),registryMissing=registry.unconfirmed.length>0,totalMissing=missing.length+(registryMissing?1:0);
    status.textContent=totalMissing?`不足・未確認 ${totalMissing}項目`:'主要入力欄・取付点確認はそろっています';
    box.classList.toggle('is-ready',totalMissing===0);box.classList.toggle('is-warning',totalMissing>0);
    out.innerHTML=list.map(item=>`<span class="${item.ok?'is-ok':'is-missing'}">${item.ok?'✓':'!'} ${item.label}</span>`).join('')+(registry.points.length?`<span class="${registry.unconfirmed.length?'is-missing':'is-ok'}">${registry.unconfirmed.length?'!':'✓'} 取付点台帳 ${registry.points.length-registry.unconfirmed.length}/${registry.points.length}件確認済み</span>`:'');
    const focus=$('part568FocusMissing');if(focus)focus.disabled=!totalMissing;
  }
  function focusMissing(){
    const item=checks().find(row=>!row.ok);
    if(!item){const registry=registryState();if(registry.unconfirmed.length){document.querySelector('.msl-point-registry')?.scrollIntoView?.({behavior:'smooth',block:'start'});}return}
    const target=$(item.id);if(!target)return;
    const details=target.closest('details');if(details)details.open=true;
    target.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>target.focus?.({preventScroll:true}),220);
  }
  function openPhoto(role){
    const input=$(role==='cargo'?'quickCargoMslPhotoInput':'quickCtuMslPhotoInput');if(!input)return;
    const details=input.closest('details');if(details)details.open=true;
    const estimator=$('quickMslEstimatorPanel');if(estimator)estimator.open=true;
    input.closest('.msl-photo-card')?.scrollIntoView?.({behavior:'smooth',block:'center'});
    input.click();
  }
  const ids=['quickMass','quickMaterialCategory','quickMethod','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickSupportCount','quickSupportStrength','quickSupportBasis','quickCombinationConfirmed','quickFriction','quickMu','ctuCaseApplicationSelect'];
  ids.forEach(id=>{const node=$(id);node?.addEventListener('input',()=>setTimeout(render,0));node?.addEventListener('change',()=>setTimeout(render,0))});
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,0));
  const registry=$('mslPointRecordList');if(registry)new MutationObserver(()=>setTimeout(render,0)).observe(registry,{subtree:true,childList:true,attributes:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,40)):setTimeout(render,40);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part568.js':'part568'});
})();
