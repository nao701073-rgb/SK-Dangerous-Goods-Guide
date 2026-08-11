(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const STORAGE_KEY='skdg.ctu.cardLayout.v1398';
const MIN_TWO_COLUMN_WIDTH=1280;
const AUTO_TWO_COLUMN_WIDTH=2200; // normal 100% PC stays one-column; zoomed-out / very wide effective viewport may use two columns
const DIRS=[['Forward','前方'],['Rear','後方'],['Left','左方向'],['Right','右方向']];
let syncing=false;
function savedLayout(){try{const v=localStorage.getItem(STORAGE_KEY);return v==='two'||v==='one'?v:null}catch(_){return null}}
function automaticLayout(){return canUseTwo()&&window.innerWidth>=AUTO_TWO_COLUMN_WIDTH?'two':'one'}
function preferredLayout(){return savedLayout()||automaticLayout()}
function saveLayout(v){try{localStorage.setItem(STORAGE_KEY,v)}catch(_){}}
function canUseTwo(){return window.innerWidth>=MIN_TWO_COLUMN_WIDTH&&!matchMedia('(pointer:coarse)').matches}
function applyLayout(preference,{persist=false}={}){
  const requested=preference==='two'?'two':'one';
  if(persist)saveLayout(requested);
  const effective=requested==='two'&&canUseTwo()?'two':'one';
  document.body.classList.toggle('ctu-layout-two',effective==='two');
  document.body.dataset.ctuCardLayout=effective;
  const one=$('ctuLayoutOne'),two=$('ctuLayoutTwo'),hint=$('ctuLayoutHint');
  if(one){one.classList.toggle('is-active',effective==='one');one.setAttribute('aria-pressed',String(effective==='one'))}
  if(two){two.classList.toggle('is-active',effective==='two');two.setAttribute('aria-pressed',String(effective==='two'));two.disabled=!canUseTwo()}
  if(hint){
    if(!canUseTwo())hint.textContent='スマホ・タブレットまたは狭い画面では1列表示です。';
    else if(effective==='two')hint.textContent='2列表示中：①/②、③/④、⑤/⑥を左右に配置します。⑦算出結果は全幅です。';
    else hint.textContent='1列表示中：通常の入力順で縦に表示します。';
  }
  window.dispatchEvent(new CustomEvent('sk:ctu-layout-changed',{detail:{requested,effective,viewportWidth:window.innerWidth}}));
  return effective;
}
function bindLayout(){
  $('ctuLayoutOne')?.addEventListener('click',()=>applyLayout('one',{persist:true}));
  $('ctuLayoutTwo')?.addEventListener('click',()=>applyLayout('two',{persist:true}));
  let timer=0;
  window.addEventListener('resize',()=>{clearTimeout(timer);timer=setTimeout(()=>applyLayout(preferredLayout()),80)});
  applyLayout(preferredLayout());
}
function setValue(id,value,eventType='change'){
  const el=$(id);if(!el)return false;
  const next=String(value??'');if(String(el.value??'')===next)return false;
  el.value=next;el.dispatchEvent(new Event(eventType,{bubbles:true}));return true;
}
function positive(id){const v=Number($(id)?.value);return Number.isFinite(v)&&v>0?v:0}
function selectedWallDirs(){return DIRS.filter(([suffix])=>$(`wallUse${suffix}`)?.checked).map(([,label])=>label)}
function coefficientFor(key){const suffix=key.charAt(0).toUpperCase()+key.slice(1);const v=Number($(`r${suffix}`)?.value);return Number.isFinite(v)&&v>=0?v:0}
function capFor(key){const suffix=key.charAt(0).toUpperCase()+key.slice(1);const v=Number($(`cap${suffix}`)?.value);return Number.isFinite(v)&&v>0?v:0}
function wallValue(payload,key){
  const rule=window.SKCTU_CODE_RULES_V1380;
  if(rule?.wallResistance)return rule.wallResistance(payload,coefficientFor(key),capFor(key));
  let x=payload*9.81*coefficientFor(key),cap=capFor(key);if(cap>0)x=Math.min(x,cap);return Math.max(0,x);
}
function refreshReadiness(){
  const box=$('wallResistanceReadiness');if(!box)return;
  const preset=$('wallCtuPresetQuick')?.value||$('ctuPreset')?.value||'none';
  const p=positive('wallPayloadQuick')||positive('payload');
  const selected=selectedWallDirs();let text='',state='';
  if(!selected.length){text='「壁抵抗を使用」を確認した方向だけ計算へ算入します。写真AIの15 cm候補だけでは自動採用しません。';}
  else if(p<=0){text=`${selected.join('・')}を使用確認済みですが、最大積載量Pが未入力のため壁抵抗は0 kNです。CSC安全承認板等でPを確認してください。`;state='warn';}
  else if(preset==='none'){text=`${selected.join('・')}を使用確認済みですが、「壁強度を算入しない」が選択されているため壁抵抗は0 kNです。`;state='warn';}
  else{
    const vals={forward:wallValue(p,'forward'),rear:wallValue(p,'rear'),left:wallValue(p,'left'),right:wallValue(p,'right')};
    const chosen=[];
    if($('wallUseForward')?.checked)chosen.push(`前方 ${vals.forward.toFixed(1)} kN`);
    if($('wallUseRear')?.checked)chosen.push(`後方 ${vals.rear.toFixed(1)} kN`);
    if($('wallUseLeft')?.checked)chosen.push(`左 ${vals.left.toFixed(1)} kN`);
    if($('wallUseRight')?.checked)chosen.push(`右 ${vals.right.toFixed(1)} kN`);
    text=`P=${p.toFixed(1)} t。確認済み方向の壁抵抗候補：${chosen.join('／')}。同じ荷重経路の支保・壁は二重加算しません。`;state='ok';
  }
  box.dataset.state=state;
  const span=box.querySelector('span');if(span)span.textContent=text;else box.textContent=text;
}
function syncPresetFrom(sourceId){
  if(syncing)return;const source=$(sourceId);if(!source)return;syncing=true;
  try{
    const v=source.value||'none';
    if(sourceId!=='wallCtuPresetQuick')setValue('wallCtuPresetQuick',v,'change');
    if(sourceId!=='quickCtu')setValue('quickCtu',v,'change');
    if(sourceId!=='ctuPreset')setValue('ctuPreset',v,'change');
  }finally{syncing=false;setTimeout(refreshReadiness,0)}
}
function syncPayloadFrom(sourceId){
  if(syncing)return;const source=$(sourceId);if(!source)return;syncing=true;
  try{const v=source.value;for(const id of ['wallPayloadQuick','payload','quickSupportPayload'])if(id!==sourceId)setValue(id,v,'input')}
  finally{syncing=false;setTimeout(refreshReadiness,0)}
}
function initialWallSync(){
  const advanced=$('ctuPreset')?.value,quick=$('quickCtu')?.value,preferred=advanced&&advanced!=='none'?advanced:(quick||'none');
  syncing=true;
  try{
    if($('wallCtuPresetQuick'))$('wallCtuPresetQuick').value=preferred;
    if($('ctuPreset'))$('ctuPreset').value=preferred;
    if($('quickCtu')&&[...$('quickCtu').options].some(o=>o.value===preferred))$('quickCtu').value=preferred;
    const p=positive('payload')||positive('quickSupportPayload');
    if(p>0){if($('wallPayloadQuick'))$('wallPayloadQuick').value=String(p);if($('payload'))$('payload').value=String(p);if($('quickSupportPayload'))$('quickSupportPayload').value=String(p)}
  }finally{syncing=false}
  $('ctuPreset')?.dispatchEvent(new Event('change',{bubbles:true}));
  refreshReadiness();
}
function bindWall(){
  $('wallCtuPresetQuick')?.addEventListener('change',()=>syncPresetFrom('wallCtuPresetQuick'));
  $('quickCtu')?.addEventListener('change',()=>syncPresetFrom('quickCtu'));
  $('ctuPreset')?.addEventListener('change',()=>syncPresetFrom('ctuPreset'));
  $('wallPayloadQuick')?.addEventListener('input',()=>syncPayloadFrom('wallPayloadQuick'));
  $('payload')?.addEventListener('input',()=>syncPayloadFrom('payload'));
  $('quickSupportPayload')?.addEventListener('input',()=>syncPayloadFrom('quickSupportPayload'));
  DIRS.forEach(([suffix])=>{
    $(`wallUse${suffix}`)?.addEventListener('change',refreshReadiness);
    $(`wallGap${suffix}Cm`)?.addEventListener('input',refreshReadiness);
  });
  ['sk:ctu-calculated','sk:ctu-wall-gap-updated','sk:ctu-restored'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(refreshReadiness,0)));
  setTimeout(initialWallSync,80);
}
function init(){
  bindLayout();bindWall();
  window.SKCTULayoutWallV1398={applyLayout,refreshReadiness,syncPresetFrom,syncPayloadFrom,wallValue,canUseTwo,automaticLayout,preferredLayout};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1398-ctu-layout-wall-sync.js':'v1.3.100-layout-wall-auto'});
})();
