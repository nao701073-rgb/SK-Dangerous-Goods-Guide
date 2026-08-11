(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const num=id=>Math.max(0,Number($(id)?.value)||0);
  const ROLE={
    device:{prefix:'quickDeviceMsl',target:'quickStrength',label:'固縛材'},
    cargo:{prefix:'quickCargoMsl',target:'quickCargoMsl',label:'貨物側取付部'},
    ctu:{prefix:'quickCtuMsl',target:'quickCtuMsl',label:'CTU側固縛点'}
  };
  const MAIN_TO_DEVICE={
    web:'web',
    aslash:'aslash',
    steel:'steel',
    wire:'wire',
    chain:'chain',
    tygard:'tygard',
    pet:'petBand',
    pp:'ppRope',
    other:'other'
  };
  let internalSync=false;

  function roleIds(role){
    const p=ROLE[role]?.prefix;
    return p?{material:`${p}Material`,profile:`${p}Profile`,evidence:`${p}Evidence`,candidate:`${p}Candidate`,status:`${p}Status`}:null;
  }
  function selectedProfile(role){
    const ids=roleIds(role),id=$(ids?.profile)?.value;
    return window.ISS_SECURING_MSL_REFERENCE?.roles?.[role]?.profiles?.find(row=>row.id===id)||null;
  }
  function candidateValue(role){
    const ids=roleIds(role),node=$(ids?.candidate);
    return Math.max(0,Number(node?.dataset?.value)||Number(String(node?.textContent||'').replace(/[^0-9.\-]/g,''))||0);
  }
  function clearEstimateState(role){
    try{if(typeof quickMslEstimateState!=='undefined'&&quickMslEstimateState)quickMslEstimateState[role]=null}catch(_e){}
  }
  function signalTarget(role,source,{reference=false}={}){
    const target=$(ROLE[role]?.target);if(!target)return;
    target.dispatchEvent(new Event('input',{bubbles:true}));
    target.dispatchEvent(new Event('change',{bubbles:true}));
    if(reference){
      target.dataset.v13103ReferenceCandidate='1';
      window.dispatchEvent(new CustomEvent('sk:ctu-reference-candidate-applied',{detail:{source,fields:[ROLE[role].target]}}));
    }else{
      delete target.dataset.v13103ReferenceCandidate;
      window.dispatchEvent(new CustomEvent('sk:ctu-system-applied',{detail:{source,fields:[ROLE[role].target]}}));
    }
  }
  function clearTarget(role,message){
    const target=$(ROLE[role]?.target),ids=roleIds(role);if(!target)return;
    target.value='';
    target.dataset.v1379AutoCandidate='';
    target.dataset.v1379AutoProfile='';
    delete target.dataset.v13103ReferenceCandidate;
    clearEstimateState(role);
    if($(ids?.status)&&message)$(ids.status).textContent=message;
    signalTarget(role,'v1379-msl-candidate-cleared');
  }
  function setMainHint(text,state){
    const input=$('quickStrength');if(!input?.parentElement)return;
    let hint=$('v1379QuickMslHint');
    if(!hint){hint=document.createElement('p');hint.id='v1379QuickMslHint';hint.className='v1379-quick-msl-hint';input.parentElement.appendChild(hint)}
    hint.textContent=text||'';
    hint.dataset.state=state||'';
    hint.hidden=!text;
  }
  function autoReflectRole(role,reason){
    const profile=selectedProfile(role),ids=roleIds(role),target=$(ROLE[role]?.target);
    if(!profile||!target)return false;
    if(role==='device'){
      const category=$('quickMaterialCategory')?.value||'tensile';
      const method=$('quickMethod')?.value||'direct';
      if(category==='support'||method!=='direct')return false;
    }
    const evidence=$(ids.evidence)?.value||'reference';
    if(profile.manual){
      clearTarget(role,`${ROLE[role].label}は確認値を入力してください。前の候補値は引き継ぎません。`);
      if(role==='device')setMainHint('登録済みの自動MSL候補がないため、刻印・メーカー仕様・証明書等で確認した値を入力してください。','review');
      renderAdoptedMsl();
      return false;
    }
    const value=candidateValue(role);
    if(value<=0){
      clearTarget(role,'MSL候補を算出できません。確認済みの公称強度またはMSLを入力してください。');
      if(role==='device')setMainHint('MSL候補を算出できません。確認値を入力してください。','review');
      renderAdoptedMsl();
      return false;
    }
    const isReference=evidence==='reference'||Boolean(profile.referenceOnly)||Boolean(profile.requiresConditionReview)||Boolean(profile.requiresConfirmedEvidence);
    target.value=value.toFixed(1);
    try{
      if(typeof quickMslEstimateState!=='undefined'&&quickMslEstimateState){
        quickMslEstimateState[role]={role,profileId:profile.id||'reference',material:$(ids.material)?.value||'',size:profile.size||'任意',nominalStrengthKn:Number(profile.nominalStrengthKn||0),factor:Number(window.ISS_SECURING_MSL_REFERENCE?.factors?.[profile.factorKey]?.value??profile.factor??1),candidateMslKn:value,evidence,confirmed:!isReference,appliedAt:new Date().toISOString(),source:profile.source||'参照マスター'};
      }
    }catch(_e){}
    target.dataset.v1379AutoCandidate='1';
    target.dataset.v1379AutoProfile=profile.id||'';
    signalTarget(role,'v1379-msl-candidate-auto-reflect',{reference:isReference});
    if(role==='device'){
      const size=profile.size||profile.label||'選択仕様';
      const suffix=isReference?'実物の規格・刻印・メーカー仕様等との一致を確認してください。':'確認根拠を反映しました。';
      setMainHint(`${size} のMSL候補 ${value.toFixed(1)} kNを自動反映しました。${suffix}`,'candidate');
    }
    renderAdoptedMsl();
    return true;
  }
  function syncMainMaterial(){
    const category=$('quickMaterialCategory')?.value||'tensile';
    const method=$('quickMethod')?.value||'direct';
    if(category==='support'||method!=='direct'){renderAdoptedMsl();return}
    const main=$('quickMaterial')?.value||'other';
    const mapped=MAIN_TO_DEVICE[main]||'other';
    const select=$('quickDeviceMslMaterial');
    if(select&&[...select.options].some(o=>o.value===mapped)){
      internalSync=true;
      select.value=mapped;
      select.dispatchEvent(new Event('change',{bubbles:true}));
      internalSync=false;
    }
    clearTarget('device','材質だけではMSLを確定しません。上の「規格・サイズ／表示値」を選択してください。');
    setMainHint('固縛材の規格・サイズ／表示値を選ぶと、その条件に対応するMSL候補を自動反映します。','review');
    renderAdoptedMsl();
  }
  function ensureSummary(){
    if($('v1379AdoptedMslSummary'))return;
    const grid=$('ctuPrimarySecuringPanel')?.querySelector('.quick-grid');
    if(!grid)return;
    const box=document.createElement('section');
    box.id='v1379AdoptedMslSummary';
    box.className='v1379-adopted-msl';
    box.innerHTML='<div class="v1379-adopted-msl__head"><span>計算に使用する採用MSL</span><strong id="v1379AdoptedMslValue">要確認</strong></div><div class="v1379-adopted-msl__values" id="v1379AdoptedMslValues"></div><p id="v1379AdoptedMslNote"></p>';
    grid.insertAdjacentElement('afterend',box);
  }
  function clearLimiterClasses(){
    [$('quickStrength'),$('quickCargoMsl'),$('quickCtuMsl')].forEach(input=>input?.parentElement?.classList.remove('v1379-msl-limiter','v1379-msl-ctu-primary'));
  }
  function renderAdoptedMsl(){
    ensureSummary();
    const box=$('v1379AdoptedMslSummary'),value=$('v1379AdoptedMslValue'),values=$('v1379AdoptedMslValues'),note=$('v1379AdoptedMslNote');
    if(!box||!value||!values||!note)return;
    clearLimiterClasses();
    const category=$('quickMaterialCategory')?.value||'tensile',method=$('quickMethod')?.value||'direct';
    const device=num('quickStrength'),cargo=num('quickCargoMsl'),ctu=num('quickCtuMsl');
    values.innerHTML=`<span>固縛材 <b>${device>0?device.toFixed(1)+' kN':'未入力'}</b></span><span>貨物側 <b>${cargo>0?cargo.toFixed(1)+' kN':'未入力'}</b></span><span>CTU側 <b>${ctu>0?ctu.toFixed(1)+' kN':'未入力'}</b></span>`;
    box.classList.remove('is-ok','is-review','is-note','is-ctu-limited');
    if(category==='support'){
      value.textContent='MSL評価対象外';note.textContent='支保・当て材のみを使用するため、直接固縛のMSL評価は行いません。';box.classList.add('is-note');return;
    }
    if(method==='topover'){
      value.textContent='STFで評価';note.textContent='トップオーバーではMSLではなく、確認済みSTFを使用して参考算出します。';box.classList.add('is-note');return;
    }
    if(device<=0||cargo<=0||ctu<=0){
      value.textContent='MSL未入力あり';note.textContent='固縛材・貨物側取付部・CTU側固縛点の3値を確認してください。前の材質のMSLは自動的に引き継ぎません。';box.classList.add('is-review');return;
    }
    const min=Math.min(device,cargo,ctu);
    let limiting='固縛材',target=$('quickStrength');
    if(Math.abs(ctu-min)<1e-9){limiting='CTU側固縛点';target=$('quickCtuMsl');box.classList.add('is-ctu-limited')}
    else if(Math.abs(cargo-min)<1e-9){limiting='貨物側取付部';target=$('quickCargoMsl')}
    target?.parentElement?.classList.add('v1379-msl-limiter');
    if(limiting==='CTU側固縛点')target?.parentElement?.classList.add('v1379-msl-ctu-primary');
    value.textContent=`${min.toFixed(1)} kN（制限：${limiting}）`;
    note.textContent=`直接固縛では3要素の最小MSLを採用します。通常はCTU側固縛点を主に確認しますが、固縛材または貨物側取付部がそれより小さい場合は、その小さい値が上限です。`;
    box.classList.add('is-ok');
  }
  function bindEstimator(role){
    const ids=roleIds(role);if(!ids)return;
    $(ids.material)?.addEventListener('change',()=>{
      const el=$(ids.material);
      if(internalSync||!el)return;
      const current=String(el.value||'');
      if(el.dataset.v1379LastMaterial===current)return;
      el.dataset.v1379LastMaterial=current;
      setTimeout(()=>{clearTarget(role,'材質を変更しました。規格・サイズ／製品仕様を選択してください。');renderAdoptedMsl()},0)
    });
    $(ids.profile)?.addEventListener('change',()=>setTimeout(()=>autoReflectRole(role,'estimator-profile'),0));
    $(ids.evidence)?.addEventListener('change',()=>setTimeout(()=>autoReflectRole(role,'estimator-evidence'),0));
  }
  function bind(){
    ['device','cargo','ctu'].forEach(bindEstimator);
    $('quickMaterial')?.addEventListener('change',()=>setTimeout(syncMainMaterial,0));
    $('quickTransport')?.addEventListener('change',()=>setTimeout(()=>{if(($('quickMaterial')?.value||'')==='tygard')syncMainMaterial();else renderAdoptedMsl()},0));
    $('quickMaterialCategory')?.addEventListener('change',()=>setTimeout(()=>{if(($('quickMaterialCategory')?.value||'')!=='support'&&($('quickMethod')?.value||'direct')==='direct')syncMainMaterial();else renderAdoptedMsl()},0));
    $('quickMethod')?.addEventListener('change',()=>setTimeout(()=>{
      const method=$('quickMethod')?.value||'direct';
      if(method==='topover'){
        const target=$('quickStrength');if(target){target.value='';target.dataset.v1379AutoCandidate='';target.dataset.v1379AutoProfile='';signalTarget('device','v1379-method-switch-topover')}
        clearEstimateState('device');
        setMainHint('トップオーバーではMSLをSTFとして流用しません。確認済みSTFを入力してください。','review');
        renderAdoptedMsl();
      }else syncMainMaterial();
    },0));
    ['quickStrength','quickCargoMsl','quickCtuMsl'].forEach(id=>{
      $(id)?.addEventListener('input',event=>{if(event.isTrusted)delete event.currentTarget.dataset.v13103ReferenceCandidate;renderAdoptedMsl()});
      $(id)?.addEventListener('change',event=>{if(event.isTrusted)delete event.currentTarget.dataset.v13103ReferenceCandidate;renderAdoptedMsl()});
    });
    window.addEventListener('sk:ctu-system-applied',renderAdoptedMsl);
  }
  function init(){ensureSummary();bind();renderAdoptedMsl()}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(init,40)):setTimeout(init,40);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1379-ctu-msl-material-linkage.js':'v1.3.108-ignore-duplicate-material-change'});
})();
