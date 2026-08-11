(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const round2=v=>Math.max(0,Math.round((Number(v)||0)*100)/100);
  // Step 4 uses broad material groups. Values below are deliberately conservative
  // candidates derived from the CTU Code Annex 7 Appendix 2 table. Exact contact
  // combinations/tested values can still be entered in the detailed settings.
  const CONSERVATIVE_REFERENCE={
    'wood|wood':.30,'wood|steel':.20,'wood|plastic':.20,'wood|rubber':.30,
    'plastic|wood':.20,'plastic|steel':.15,'plastic|plastic':.20,'plastic|rubber':.30,
    'metal|wood':.20,'metal|steel':.20,'metal|plastic':.20,'metal|rubber':.30,
    'rubber|wood':.30,'rubber|steel':.30,'rubber|plastic':.30,'rubber|rubber':.30,
    'other|wood':.20,'other|steel':.20,'other|plastic':.20,'other|rubber':.20,'other|other':.20
  };
  const POLICY_CAP={verified:Infinity,unknown:.30,unclean:.30,snow:.20,oil:.10};
  let mode='contact-reference';
  let applying=false;
  let lastNote='';

  function contactSelection(){
    return{
      cargoSurface:$('v1CargoSurface')?.value||'other',
      floorSurface:$('v1FloorSurface')?.value||'other',
      condition:$('v1SurfaceCondition')?.value||'dry'
    };
  }
  function policyForCondition(condition){
    if(condition==='oil')return'oil';
    if(condition==='snow')return'snow';
    // Step 4 groups are intentionally broad, so an automatic candidate is not
    // labelled as a verified exact table/test value.
    return'unknown';
  }
  function candidateFor({cargoSurface,floorSurface,condition}){
    let mu=CONSERVATIVE_REFERENCE[`${cargoSurface}|${floorSurface}`];
    if(!Number.isFinite(mu))mu=.20;
    if(condition==='snow')mu=Math.min(mu,.20);
    if(condition==='oil')mu=.10;
    return round2(mu);
  }
  function effectiveFor(input,policy){
    const cap=POLICY_CAP[policy]??.30;
    return Number.isFinite(cap)?Math.min(round2(input),cap):round2(input);
  }
  function setSelect(id,value){const el=$(id);if(!el)return;if([...el.options].some(o=>o.value===String(value)))el.value=String(value)}
  function setValue(id,value){const el=$(id);if(el)el.value=String(value)}
  function setDisplay(input,policy,note){
    const effective=effectiveFor(input,policy),out=$('v1MuValue'),msg=$('v1MuNote');
    if(out)out.textContent=`μ = ${effective.toFixed(2)}`;
    if(msg)msg.textContent=note;
    lastNote=note;
  }
  function syncAdvanced(input,policy){
    setValue('mu',Number(input).toFixed(2));
    setSelect('frictionPolicy',policy);
    try{typeof updateSummary==='function'&&updateSummary()}catch(_){ }
  }
  function syncQuick(input,policy){
    setValue('quickMu',Number(input).toFixed(2));
    setSelect('quickFriction',policy);
  }
  function contactNote(sel,mu){
    if(sel.condition==='oil')return'油・グリース等があるため、CTU Code Annex 7の保守値 μ=0.10 を使用します。';
    if(sel.condition==='snow')return`霜・氷・雪を考慮し、CTU Code Annex 7の上限0.20以下として μ=${mu.toFixed(2)} を使用します。`;
    if(sel.condition==='wet')return`画面の材質区分は幅があるため、CTU Code Annex 7 Appendix 2を保守側に丸めた参考候補 μ=${mu.toFixed(2)} を使用します。正確な組合せ・試験値がある場合は詳細設定で上書きしてください。`;
    return`CTU Code Annex 7 Appendix 2を、画面の広い材質区分に合わせて保守側に丸めた参考候補 μ=${mu.toFixed(2)} を使用します。正確な組合せ・試験値がある場合は詳細設定で上書きしてください。`;
  }
  function syncFromContact({emit=true}={}){
    if(applying)return snapshot();
    applying=true;
    try{
      const sel=contactSelection(),mu=candidateFor(sel),policy=policyForCondition(sel.condition);
      mode='contact-reference';
      syncQuick(mu,policy);syncAdvanced(mu,policy);setDisplay(mu,policy,contactNote(sel,mu));
      if(emit)window.dispatchEvent(new CustomEvent('sk:ctu-friction-updated',{detail:snapshot()}));
      return snapshot();
    }finally{applying=false}
  }
  function applyManual(input,policy,{legacy=false,emit=true}={}){
    if(applying)return snapshot();
    applying=true;
    try{
      const raw=Math.max(0,Number(input)||0),p=POLICY_CAP[policy]!==undefined?policy:'unknown',eff=effectiveFor(raw,p);
      mode=legacy?'legacy-saved':'manual';
      syncQuick(raw,p);syncAdvanced(raw,p);
      const cap=POLICY_CAP[p];
      const capText=Number.isFinite(cap)&&raw>cap?`（入力 ${raw.toFixed(2)} に対し計算上限 ${eff.toFixed(2)}）`:'';
      const note=legacy
        ?`旧案件の保存済み摩擦係数を復元しています${capText}。接触材の組合せは旧データに保存されていないため、Step 4で再確認してください。`
        :`詳細設定で指定した摩擦係数を使用します${capText}。Step 4の材質を変更すると保守側の参考候補へ戻ります。`;
      setDisplay(raw,p,note);
      if(emit)window.dispatchEvent(new CustomEvent('sk:ctu-friction-updated',{detail:snapshot()}));
      return snapshot();
    }finally{applying=false}
  }
  function restore(saved,input,policy){
    if(saved&&typeof saved==='object'){
      setSelect('v1CargoSurface',saved.cargoSurface||'other');
      setSelect('v1FloorSurface',saved.floorSurface||'other');
      setSelect('v1SurfaceCondition',saved.condition||'dry');
      if(saved.mode==='manual'||saved.mode==='legacy-saved')return applyManual(saved.muInput??input,saved.frictionPolicy??policy,{legacy:saved.mode==='legacy-saved',emit:false});
      return syncFromContact({emit:false});
    }
    // Older results stored only mu/policy. Avoid displaying the default wood/steel
    // contact as if it were the source of that legacy value.
    setSelect('v1CargoSurface','other');setSelect('v1FloorSurface','other');
    setSelect('v1SurfaceCondition',policy==='oil'?'oil':policy==='snow'?'snow':'dry');
    return applyManual(input,policy,{legacy:true,emit:false});
  }
  function snapshot(){
    const sel=contactSelection();
    return{mode,...sel,muInput:Math.max(0,Number($('quickMu')?.value)||0),frictionPolicy:$('quickFriction')?.value||'unknown',displayNote:lastNote};
  }
  function onAdvancedChanged(){
    if(applying)return;
    const raw=Math.max(0,Number($('mu')?.value)||0),policy=$('frictionPolicy')?.value||'unknown';
    applyManual(raw,policy);
  }
  function bind(){
    ['v1CargoSurface','v1FloorSurface','v1SurfaceCondition'].forEach(id=>$(id)?.addEventListener('change',()=>syncFromContact()));
    $('mu')?.addEventListener('input',onAdvancedChanged);
    $('frictionPolicy')?.addEventListener('change',onAdvancedChanged);
    syncFromContact({emit:false});
  }
  window.SKCTUFrictionSync={syncFromContact,applyManual,restore,snapshot,candidateFor,effectiveFor};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1376-ctu-friction-sync.js':'v1.3.76'});
})();
