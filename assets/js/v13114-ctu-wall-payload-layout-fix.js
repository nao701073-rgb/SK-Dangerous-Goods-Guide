(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const DIRS=['Forward','Rear','Left','Right'];
// 0.1 t conservative fallback payloads for cases where the CSC / door marking cannot be confirmed.
// These are NOT the structural MAX PAYLOAD of an individual container. Actual CSC / door values always have priority.
const PAYLOAD_DEFAULTS={
  // CSC / door plate cannot be confirmed: conservative fallback only.
  // P is derived from a conservative gross-mass cap minus a representative TARE,
  // then rounded down to 0.1 t so wall resistance is not overestimated.
  dry20:{label:'20FT ドライコンテナ',fallbackGrossCapT:24.0,tareT:2.2,payloadT:21.8},
  dry40:{label:'40FT ドライコンテナ',fallbackGrossCapT:30.48,tareT:3.6,payloadT:26.8},
  reefer20:{label:'20FT リーファーコンテナ',fallbackGrossCapT:24.0,tareT:2.8,payloadT:21.2},
  reefer40:{label:'40FT リーファーコンテナ',fallbackGrossCapT:30.48,tareT:4.5,payloadT:25.9}
};
let applying=false;
function n(id){const raw=String($(id)?.value??'').trim();if(!raw)return 0;const v=Number(raw);return Number.isFinite(v)?v:0}
function isContainer(){return ($('wallCtuPresetQuick')?.value||$('ctuPreset')?.value||$('quickCtu')?.value)==='container'}
function specKey(){return $('quickContainerSpec')?.value||'dry20'}
function payloadDefault(){return PAYLOAD_DEFAULTS[specKey()]||PAYLOAD_DEFAULTS.dry20}
function source(){return $('wallPayloadQuick')?.dataset?.v13113PayloadSource||''}
function setSource(value){['wallPayloadQuick','payload','quickSupportPayload'].forEach(id=>{const el=$(id);if(el)el.dataset.v13113PayloadSource=value})}
function fire(el,type='input'){el?.dispatchEvent(new Event(type,{bubbles:true}))}
function setSyncedPayload(v,src){
  if(applying)return;applying=true;
  try{
    const text=Number(v).toFixed(1);
    ['wallPayloadQuick','payload','quickSupportPayload'].forEach(id=>{const el=$(id);if(!el)return;if(String(el.value)!==text){el.value=text;fire(el,'input')}el.dataset.v13113PayloadSource=src});
  }finally{applying=false}
}
function ensureNote(){
  const input=$('wallPayloadQuick');if(!input)return null;
  let note=$('v13113WallPayloadNote');
  if(!note){note=document.createElement('small');note.id='v13113WallPayloadNote';note.className='v13113-wall-payload-note';input.insertAdjacentElement('afterend',note)}
  return note;
}
function updateAdvancedHint(){
  const el=$('payload');if(!el)return;
  const hint=el.parentElement?.querySelector('.hint');
  if(hint)hint.textContent='実物CSC・扉表示を確認できる場合は、MAX GROSS − TARE（または表示されたMAX PAYLOAD）をPとして優先します。確認できない場合だけ、サイズ・種類から0.1 t単位の保守的な概算Pを使用します。';
  el.placeholder='保守的概算P／CSC確認値で上書き可';
}
function refreshNote(){
  const note=ensureNote();if(!note)return;
  if(!isContainer()){
    note.textContent='コンテナ以外のCTUでは自動概算値を設定しません。確認できる資料の値を入力してください。';note.dataset.state='manual';return;
  }
  const d=payloadDefault(),p=n('wallPayloadQuick'),src=source();
  if(src==='approx'){
    note.innerHTML=`<strong>保守的概算P ${d.payloadT.toFixed(1)} t</strong>（${d.label}／CSC不明時の安全側参考：総重量上限 ${d.fallbackGrossCapT.toFixed(2).replace(/\.00$/,'')} t − 代表TARE ${d.tareT.toFixed(1)} t）。この概算値は実物コンテナのMAX PAYLOADそのものではありません。CSC・扉表示を確認できた場合は、MAX GROSS − TARE または表示されたMAX PAYLOADへ上書きしてください。`;
    note.dataset.state='approx';
  }else if(p>0){
    note.innerHTML=`<strong>入力値 ${p.toFixed(1)} t</strong> を使用します。実物CSC・扉表示では MAX GROSS − TARE（またはMAX PAYLOAD表示値）と一致することを確認してください。`;
    note.dataset.state='confirmed';
  }else{
    note.textContent='CSC・扉表示を確認できない場合だけ、選択したコンテナサイズ・種類から保守的な概算Pを自動使用します。';note.dataset.state='approx';
  }
}
function applyApproxIfNeeded(reason='init'){
  if(!isContainer()){refreshNote();return false}
  const d=payloadDefault(),current=n('wallPayloadQuick'),src=source();
  // Existing positive values from saved cases are respected as user/CSC values.
  if(current>0&&src!=='approx'){setSource(src||'existing');refreshNote();return false}
  setSyncedPayload(d.payloadT,'approx');
  refreshNote();
  window.dispatchEvent(new CustomEvent('sk:ctu-wall-payload-defaulted',{detail:{reason,spec:specKey(),label:d.label,payloadT:d.payloadT,source:'approx'}}));
  return true;
}
function forceApproxForNewSpec(){
  if(!isContainer())return;
  if(source()==='manual'||source()==='existing'){
    // Actual/manual values are never silently overwritten by a size selector change.
    refreshNote();return;
  }
  const d=payloadDefault();setSyncedPayload(d.payloadT,'approx');refreshNote();
}
function markManual(event){
  if(applying||!event?.isTrusted)return;
  const p=n('wallPayloadQuick');
  if(p>0)setSource('manual');else setSource('');
  refreshNote();
}
function wallReady(){return isContainer()&&n('wallPayloadQuick')>0}
function confirmWallSelection(){
  // The direction checkbox itself is the inspector's load-transfer confirmation.
  // Do not ask for the same confirmation twice. Step 6 remains incomplete only
  // when CTU/P conditions are truly unavailable.
  setTimeout(()=>{
    if(!DIRS.some(s=>$(`wallUse${s}`)?.checked))return;
    if(!wallReady())return;
    const api=window.SKCTUProgressAPI;
    api?.acceptFields?.(['wallCtuPresetQuick','wallPayloadQuick']);
    api?.confirmStep?.(6,{invalidate:false});
    api?.update?.();
  },0);
}
function decorateResult(){
  const box=$('metrics');if(!box)return;
  const metric=box.querySelector('.metric-worst-direction');
  if(metric){
    const text=[...metric.childNodes].find(n=>n.nodeType===Node.TEXT_NODE);
    if(text)text.nodeValue='重点確認方向';
    let small=metric.querySelector('small');
    if(!small){small=document.createElement('small');metric.appendChild(small)}
    small.classList.add('v13113-focus-note');
    small.textContent='壁抵抗反映後の余裕／不足量が最も小さい方向';
  }
  const latest=window.SKCTULatestResult;
  if(latest?.inputs){latest.inputs.wallPayloadReference=snapshot()}
}
function snapshot(){
  const d=isContainer()?payloadDefault():null;
  return{ctuPreset:$('wallCtuPresetQuick')?.value||$('ctuPreset')?.value||'',containerSpec:isContainer()?specKey():'',containerLabel:d?.label||'',payloadT:n('wallPayloadQuick')||n('payload'),source:source()||'unknown',approximate:source()==='approx',actualCscValuePriority:true,roundedToT:0.1,referenceMaxGrossT:d?.fallbackGrossCapT||null,referenceTareT:d?.tareT||null,fallbackBasis:'conservative-gross-cap-minus-representative-tare',conservativeFallback:source()==='approx'};
}
function installStyle(){
  if($('v13113WallStyle'))return;const s=document.createElement('style');s.id='v13113WallStyle';s.textContent=`
  .v13113-wall-payload-note{display:block;margin-top:6px;line-height:1.55;color:#536779}
  .v13113-wall-payload-note[data-state="approx"]{padding:7px 9px;border:1px solid #e7c56b;border-radius:7px;background:#fff9e7;color:#765300}
  .v13113-wall-payload-note[data-state="confirmed"]{padding:7px 9px;border:1px solid #b9d8c5;border-radius:7px;background:#f2fbf5;color:#205d39}
  .metric-worst-direction .v13113-focus-note{display:block;margin-top:4px;font-size:.76rem;font-weight:500;color:#5d6d7b}
  @media(max-width:760px){.v13113-wall-payload-note{font-size:.78rem}.metric-worst-direction .v13113-focus-note{font-size:.72rem}}
  `;document.head.appendChild(s)
}
function init(){
  installStyle();updateAdvancedHint();ensureNote();
  // v141 is loaded earlier as defer; apply immediately to avoid a blank/default-value flash.
  applyApproxIfNeeded('initial');
  $('quickContainerSpec')?.addEventListener('change',()=>setTimeout(forceApproxForNewSpec,0));
  ['quickCtu','wallCtuPresetQuick','ctuPreset'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(()=>{if(isContainer())applyApproxIfNeeded('ctu-change');else refreshNote()},0)));
  $('wallPayloadQuick')?.addEventListener('input',markManual);
  $('payload')?.addEventListener('input',markManual);
  $('quickSupportPayload')?.addEventListener('input',markManual);
  $('wallPayloadQuick')?.addEventListener('change',()=>{if(!n('wallPayloadQuick'))applyApproxIfNeeded('empty-field');else refreshNote()});
  DIRS.forEach(s=>$(`wallUse${s}`)?.addEventListener('change',confirmWallSelection));
  window.addEventListener('sk:ctu-calculated',()=>setTimeout(()=>{decorateResult();refreshNote()},0));
  window.addEventListener('sk:ctu-restored',()=>setTimeout(()=>{applyApproxIfNeeded('restore');decorateResult()},120));
  window.addEventListener('sk:ctu-case-applied',()=>setTimeout(()=>applyApproxIfNeeded('case'),120));
  const api={defaults:PAYLOAD_DEFAULTS,applyApproxIfNeeded,refreshNote,snapshot};
  window.SKCTUWallPayloadV13114=api;
  window.SKCTUWallPayloadV13113=api; // backward-compatible alias
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v13114-ctu-wall-payload-layout-fix.js':'v1.3.114'});
})();
