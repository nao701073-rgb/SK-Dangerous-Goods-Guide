(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const dirs=[
  ['Forward','前方'],['Rear','後方'],['Left','左方向'],['Right','右方向']
];
let timer=0;
let autoRecalcInFlight=false;
let lastCalculatedAt=0;

function overallStatus(){
  const box=$('overall');
  const strong=box?.querySelector('strong')?.textContent?.trim();
  return strong||box?.textContent?.trim()||'';
}
function hasCalculatedResult(){
  const text=overallStatus();
  if(!text)return false;
  return !/入力後|未算出|算出する/.test(text) && Boolean($('metrics')?.children?.length);
}
function confirmedWallLabels(){
  return dirs.filter(([suffix])=>Boolean($(`wallUse${suffix}`)?.checked)).map(([,label])=>label);
}
function setDeficiencyBadge(text,state){
  const badge=$('fieldDeficiencyBadge');
  if(!badge)return;
  badge.textContent=text;
  badge.dataset.state=state||'';
}
function textBlock(el,text){
  if(!el)return;
  el.innerHTML='';
  const p=document.createElement('p');
  p.textContent=text;
  el.appendChild(p);
}
function syncDeficiencyPanel(){
  const status=overallStatus();
  const issues=$('fieldDeficiencyIssues');
  const fixes=$('fieldCorrectionCandidates');
  const walls=confirmedWallLabels();
  if(!hasCalculatedResult()){
    setDeficiencyBadge('算出待ち','idle');
    textBlock(issues,'算出後に表示します。');
    textBlock(fixes,'算出後に表示します。');
    return;
  }
  if(status.includes('参考上十分')){
    setDeficiencyBadge('算出済・参考上十分','ok');
    textBlock(issues,'確認済み条件の範囲で、評価対象方向の必要抵抗力を満たしています。');
  }else if(status.includes('参考上不足')){
    setDeficiencyBadge('算出済・参考上不足','ng');
    textBlock(issues,'確認済み条件で必要抵抗力に不足する方向があります。方向別詳細結果を確認してください。');
  }else{
    setDeficiencyBadge('算出済・要確認','check');
    const quick=$('quickStatus')?.textContent?.replace(/\s+/g,' ').trim();
    textBlock(issues,quick||'未確認項目があります。方向別詳細結果と確認事項を確認してください。');
  }
  if(walls.length){
    textBlock(fixes,`壁抵抗使用確認：${walls.join('・')}。確認済みの方向はCTU境界抵抗を算入した結果です。未確認方向は摩擦・固縛・支保等を確認してください。`);
  }else{
    textBlock(fixes,'壁抵抗を使用する方向は未確認です。必要に応じて壁・緩衝材までの荷重伝達を確認し、方向別に「壁抵抗を使用」を選択してください。');
  }
}
function markRecalculating(){
  setDeficiencyBadge('再算出中','working');
  const issues=$('fieldDeficiencyIssues');
  if(issues)textBlock(issues,'壁抵抗・隙間条件の変更を算出結果へ反映しています。');
}
function markManualRecalcNeeded(){
  setDeficiencyBadge('再算出待ち','review');
  const issues=$('fieldDeficiencyIssues');
  if(issues)textBlock(issues,'壁抵抗条件を変更しました。入力不足があるため自動再算出できませんでした。「この条件で算出する」を押して確認してください。');
}
function triggerQuickCalculation(){
  if(autoRecalcInFlight)return;
  autoRecalcInFlight=true;
  markRecalculating();
  const before=lastCalculatedAt;
  try{
    if(typeof window.runQuickCalculation==='function')window.runQuickCalculation();
    else $('quickCalcBtn')?.click();
  }catch(_){ }
  setTimeout(()=>{
    autoRecalcInFlight=false;
    if(lastCalculatedAt===before)markManualRecalcNeeded();
  },450);
}
function scheduleAutoRecalc(){
  // 初回入力中は勝手に算出しない。すでに結果がある場合だけ壁条件変更を即時反映する。
  if(!hasCalculatedResult()){
    syncDeficiencyPanel();
    return;
  }
  clearTimeout(timer);
  timer=setTimeout(triggerQuickCalculation,120);
}
function bind(){
  dirs.forEach(([suffix])=>{
    $(`wallUse${suffix}`)?.addEventListener('change',scheduleAutoRecalc);
    $(`wallGap${suffix}Cm`)?.addEventListener('input',()=>{
      if($(`wallUse${suffix}`)?.checked)scheduleAutoRecalc();
    });
  });
  $('payload')?.addEventListener('input',()=>{
    if(confirmedWallLabels().length)scheduleAutoRecalc();
  });
  $('quickCtu')?.addEventListener('change',()=>{
    if(confirmedWallLabels().length)scheduleAutoRecalc();
  });
  $('ctuPreset')?.addEventListener('change',()=>setTimeout(syncDeficiencyPanel,0));
  window.addEventListener('sk:ctu-calculated',()=>{
    lastCalculatedAt=Date.now();
    autoRecalcInFlight=false;
    setTimeout(syncDeficiencyPanel,0);
  });
  window.addEventListener('sk:ctu-wall-gap-updated',()=>{
    // 候補更新だけでは壁抵抗を自動採用しない。検査員確認済み方向のみ再算出対象。
    if(confirmedWallLabels().length&&hasCalculatedResult())scheduleAutoRecalc();
  });
  setTimeout(syncDeficiencyPanel,350);
  window.SKCTUWallResultSyncV1395={syncDeficiencyPanel,scheduleAutoRecalc,confirmedWallLabels};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1395-ctu-wall-result-sync.js':'v1.3.95'});
})();
