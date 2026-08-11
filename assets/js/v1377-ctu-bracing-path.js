(function(){
'use strict';
const $=id=>document.getElementById(id);
const G=9.81;
function num(id){return Math.max(0,Number($(id)?.value)||0)}
function category(){return $('quickMaterialCategory')?.value||''}
function supportDirection(){return category()==='combined'?($('quickSupportDirection')?.value||''):($('quickDirection')?.value||'')}
function supportMaterial(){return category()==='combined'?($('quickSupportMaterial')?.value||''):($('quickMaterial')?.value||'')}
function supportEnabled(){const toggle=$('quickUseSupport');if(toggle)return Boolean(toggle.checked);return category()==='support'||category()==='combined'}
function supportManualTotal(){
 const combined=category()==='combined';
 const count=combined?num('quickSupportCount'):num('quickCount');
 const strength=combined?num('quickSupportStrength'):num('quickStrength');
 return count*strength;
}
function battenCapacity(){
 const n=num('quickSupportCount')||num('quickBattenCount'),w=(num('quickTimberThicknessW')/10)||num('quickBattenThickness'),h=(num('quickTimberHeightH')/10)||num('quickBattenHeight'),L=num('quickTimberFreeLengthL')||num('quickBattenLength');
 if(!(n>0&&w>0&&h>0&&L>0))return 0;
 // CTU Code Annex 7 Appendix 4: F = n * w^2 * h / (28 * L) [kN]
 return n*w*w*h/(28*L);
}
function receiverCapacity(){
 const type=$('quickSupportReceiverType')?.value||'frontWall';
 if(type==='frontWall'){
   const p=num('quickSupportPayload')||num('payload');
   const ctu=$('quickCtu')?.value||$('ctuPreset')?.value||'';
   if(ctu!=='container'||p<=0)return 0;
   const d=supportDirection();
   const r=(d==='left'||d==='right')?0.60:0.40;
   return r*p*G;
 }
 if(type==='frameConfirmed')return Number.POSITIVE_INFINITY;
 return num('quickSupportReceiverCapacity');
}
function getState(){
 const enabled=supportEnabled();
 const calcMode=$('quickSupportCalcMode')?.value||'manual';
 const active=enabled&&supportMaterial()==='timber'&&calcMode!=='manual';
 const materialCapacity=calcMode==='timberBattens'?battenCapacity():supportManualTotal();
 const recv=receiverCapacity();
 const confirmed=Boolean($('quickSupportTransferConfirmed')?.checked);
 const dir=supportDirection();
 const receiverType=$('quickSupportReceiverType')?.value||'frontWall';
 const needsReceiverValue=receiverType!=='frontWall';
 const frameConfirmed=receiverType==='frameConfirmed';
 const receiverValid=frameConfirmed||recv>0;
 const geometryValid=!frameConfirmed||calcMode==='timberBattens';
 const valid=active&&confirmed&&dir&&materialCapacity>0&&receiverValid&&geometryValid;
 const adopted=valid?(frameConfirmed?materialCapacity:Math.min(materialCapacity,recv)):0;
 return {active,enabled,calcMode,direction:dir,material:supportMaterial(),materialCapacity,receiverCapacity:recv,receiverType,frameConfirmed,confirmed,valid,adoptedCapacity:adopted,manualTotal:supportManualTotal(),needsReceiverValue,payload:num('quickSupportPayload')||num('payload'),batten:{count:num('quickSupportCount')||num('quickBattenCount'),thicknessCm:(num('quickTimberThicknessW')/10)||num('quickBattenThickness'),heightCm:(num('quickTimberHeightH')/10)||num('quickBattenHeight'),freeLengthM:num('quickTimberFreeLengthL')||num('quickBattenLength'),capacityKn:battenCapacity()}};
}
function appliesToDirection(key){
 const st=getState();
 return st.valid&&(st.direction==='all'||st.direction===key)?st:null;
}
function textKn(x){return x>0?x.toFixed(1)+' kN':'－'}
function render(){
 const assist=$('ctuBracingAssist');if(!assist)return;
 const enabled=supportEnabled();
 const timber=enabled&&supportMaterial()==='timber';
 assist.hidden=!timber;
 if(!timber)return;
 const mode=$('quickSupportCalcMode')?.value||'manual';
 $('ctuBattenFields').hidden=mode!=='timberBattens';
 const receiver=$('quickSupportReceiverType')?.value||'frontWall';
 const pathMode=mode!=='manual';
 $('quickSupportReceiverType').closest('label').hidden=!pathMode;
 $('quickSupportPayloadField').hidden=!pathMode||receiver!=='frontWall';
 $('quickSupportReceiverCapacityField').hidden=!pathMode||receiver==='frontWall'||receiver==='frameConfirmed';
 $('quickSupportTransferConfirmed').closest('.ctu-bracing-check').hidden=!pathMode;
 const combined=category()==='combined';
 const countInput=combined?$('quickSupportCount'):$('quickCount');
 const strengthInput=combined?$('quickSupportStrength'):$('quickStrength');
 if(countInput)countInput.disabled=false;
 if(strengthInput)strengthInput.disabled=mode==='timberBattens';
 const p=num('quickSupportPayload'); if(p>0&&$('payload'))$('payload').value=String(p);
 const st=getState();
 if(mode==='manual'){
   $('quickSupportMaterialCapacity').textContent=textKn(st.manualTotal);
   $('quickSupportReceiverCapacityOut').textContent='対象外';
   $('quickSupportAdoptedCapacity').textContent=textKn(st.manualTotal);
   $('quickSupportRouteStatus').textContent='従来評価';
   $('quickSupportRouteStatus').className='';
   $('quickSupportRouteNote').textContent='確認済み支保能力を従来どおり単独で評価します。壁／フレームへ荷重を伝える実際の支保状況を評価する場合は、支保能力の求め方を切り替えてください。';
   return;
 }
 $('quickSupportMaterialCapacity').textContent=textKn(st.materialCapacity);
 $('quickSupportReceiverCapacityOut').textContent=st.frameConfirmed?'強い受け部確認':textKn(st.receiverCapacity);
 $('quickSupportAdoptedCapacity').textContent=textKn(st.adoptedCapacity);
 $('quickSupportRouteStatus').textContent=st.valid?'算入可能':'要確認';
 $('quickSupportRouteStatus').className=st.valid?'status-ok':'status-ng';
 const notes=[];
 if(!st.direction)notes.push('対象方向を選択してください。');
 if(st.calcMode==='timberBattens'&&st.materialCapacity<=0)notes.push('横木寸法・本数・自由長を入力してください。');
 if(st.receiverType==='frontWall'&&st.receiverCapacity<=0)notes.push('汎用コンテナを選び、CSC等で確認した最大積載量Pを入力してください。');
 if(st.receiverType!=='frontWall'&&st.receiverType!=='frameConfirmed'&&st.receiverCapacity<=0)notes.push('フレーム／受け部の確認済み能力を入力してください。');
 if(st.receiverType==='frameConfirmed'&&st.calcMode!=='timberBattens')notes.push('数値上限なしの強い受け部確認は、Appendix 4横木フェンスの成立条件として使用してください。');
 if(!st.confirmed)notes.push('隙間・荷重分散・強い受け部への伝達確認が必要です。');
 $('quickSupportRouteNote').textContent=notes.length?notes.join(' '):(st.frameConfirmed?`採用支保能力 ${st.adoptedCapacity.toFixed(1)} kN。Appendix 4横木能力を採用し、横木端部が強いフレーム／コルゲーションへ適切に支保され局部過負荷を避けることを成立条件とします。`:`採用支保能力 ${st.adoptedCapacity.toFixed(1)} kN = min（支保材側 ${st.materialCapacity.toFixed(1)} kN、CTU受け部 ${st.receiverCapacity.toFixed(1)} kN）。同じ荷重経路の壁抵抗は別途加算しません。`);
}
function syncPayload(){if(num('quickSupportPayload')>0&&$('payload'))$('payload').value=String(num('quickSupportPayload'))}
function bind(){
 ['quickMaterialCategory','quickMaterial','quickSupportMaterial','quickDirection','quickSupportDirection','quickSupportCalcMode','quickSupportReceiverType','quickSupportPayload','quickSupportReceiverCapacity','quickBattenCount','quickBattenThickness','quickBattenHeight','quickBattenLength','quickSupportTransferConfirmed','quickCount','quickStrength','quickSupportCount','quickSupportStrength','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL','quickTimberDimensionsConfirmed','quickCtu'].forEach(id=>{
   const el=$(id);if(!el)return;el.addEventListener('change',()=>{syncPayload();render()});el.addEventListener('input',()=>{syncPayload();render()});
 });
 render();
}

function enhanceResult(){
 try{
   if(typeof latestCtuResult==='undefined'||!latestCtuResult?.directions)return;
   const applicable=latestCtuResult.directions.filter(x=>x.applicable);
   const severe=applicable.reduce((a,b)=>!a||Number(b.margin)<Number(a.margin)?b:a,null);
   if(!severe)return;
   const path=appliesToDirection(severe.key);if(!path)return;
   const residual=Math.max(0,Number(severe.external||0)-Number(severe.friction||0)-Number(severe.topover||0));
   const capacity=Math.max(0,Number(severe.blocking||0));
   const remaining=Math.max(0,residual-capacity);
   const utilization=capacity>0?residual/capacity*100:null;
   const status=remaining<=1e-6?'支保経路単独で拘束可能':'支保経路だけでは不足';
   const host=$('quickStatus');if(!host)return;
   host.querySelector('.ctu-bracing-result-inline')?.remove();
   const div=document.createElement('div');div.className='ctu-bracing-result-inline';
   div.innerHTML=`<strong>支保経路評価：</strong>摩擦等控除後の必要拘束力 ${residual.toFixed(1)} kN ／ 採用支保能力 ${capacity.toFixed(1)} kN ／ 利用率 ${utilization===null?'－':utilization.toFixed(0)+'%'} ／ <strong class="${remaining<=1e-6?'status-ok':'status-ng'}">${status}</strong>${remaining>1e-6?`（残り ${remaining.toFixed(1)} kN）`:''}`;
   host.appendChild(div);
 }catch(_e){}
}

window.SKCTUBracing={getState,appliesToDirection,render,battenCapacity,enhanceResult};
window.addEventListener('sk:ctu-calculated',()=>setTimeout(enhanceResult,0));
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
