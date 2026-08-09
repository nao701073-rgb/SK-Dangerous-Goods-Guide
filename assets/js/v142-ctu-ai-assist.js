(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const fire=(el,type='change')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
const aiIds=['quickTransport','quickCtu','quickContainerSpec','quickMass','quickCargoDescription','quickCargoLength','quickCargoWidth','quickCargoHeight','quickMaterialCategory','quickMethod','quickMaterial','quickDirection','quickCount','quickStrength','quickBasis','quickCargoMsl','quickCtuMsl','quickAngle','quickSupportMaterial','quickSupportDirection','quickSupportCount','quickSupportStrength','quickSupportBasis','quickCombinationConfirmed','v1CargoSurface','v1FloorSurface','v1SurfaceCondition'];
const touched=new Set(),labelHints=new Map();

function addHint(id,text='',state='pending'){
  const el=$(id);if(!el)return;
  const wrap=el.closest('div,label')||el.parentElement;if(!wrap)return;
  let hint=wrap.querySelector(`.v142-ai-inline[data-for="${id}"]`);
  if(!hint){hint=document.createElement('span');hint.className='v142-ai-inline';hint.dataset.for=id;el.insertAdjacentElement('afterend',hint);}
  hint.dataset.state=state;hint.textContent=text;labelHints.set(id,hint);
}
function setCandidate(id,value,text){
  const el=$(id);if(!el||touched.has(id)||value==null||value==='')return false;
  if(el.tagName==='SELECT'&&![...el.options].some(o=>o.value===String(value)))return false;
  el.value=String(value);el.dataset.v142AiSuggested='1';el.classList.add('v142-ai-suggested');fire(el,'change');fire(el,'input');
  addHint(id,text||`AI候補：${el.selectedOptions?.[0]?.textContent||value}`,'candidate');return true;
}
function markManual(id){
  const el=$(id);if(!el)return;
  ['input','change'].forEach(type=>el.addEventListener(type,e=>{if(!e.isTrusted)return;touched.add(id);el.classList.remove('v142-ai-suggested');const h=labelHints.get(id);if(h){h.dataset.state='manual';h.textContent='利用者が訂正・確認済み';}}));
}
function selectedContainerLabel(){return $('quickContainerSpec')?.selectedOptions?.[0]?.textContent||'20FT ドライコンテナ'}
function prepareHints(){
  aiIds.forEach(markManual);
  addHint('quickTransport','AI：写真から輸送条件は確定できません。申請・航路情報を優先','review');
  addHint('quickMass','AI：写真だけで質量は確定しません。申請書・計量値を優先','review');
  addHint('quickCargoDescription','AI：写真だけで品名は確定しません。申請書を優先','review');
  addHint('quickCargoLength','AI：写真読込後、選択コンテナ内寸との画像比から参考候補','pending');
  addHint('quickCargoWidth','AI：写真読込後、選択コンテナの内幅を優先基準として参考候補','pending');
  addHint('quickCargoHeight','AI：写真読込後、選択コンテナ内寸との画像比から参考候補','pending');
  addHint('quickMaterialCategory','AI：写真から引張材・木製枠を補助判定。ただし支保への算入は現場確認','pending');
  addHint('quickMethod','AI：取付点が見えない場合は直接固縛と決めません','review');
  addHint('quickMaterial','AI：写真読込後に材質候補','pending');
  addHint('quickDirection','AI：1枚の写真だけでは作用方向を確定しません','review');
  addHint('quickCount','AI：写真で見える本数を候補化','pending');
  addHint('quickStrength','AI：外観からMSLは確定不可。刻印・仕様書・証明書を確認','review');
  addHint('quickBasis','AI：強度根拠はメーカー仕様書・刻印・証明書・試験成績を確認','review');
  addHint('quickCargoMsl','AI：外観から貨物側取付部MSLは確定不可','review');
  addHint('quickCtuMsl','AI：外観からCTU側固縛点MSLは確定不可','review');
  addHint('quickAngle','AI：写真上の傾きを参考候補化。必要なら2点測定で訂正','pending');
  addHint('quickSupportMaterial','AI：木製枠・当て材が見える場合に候補表示','pending');
  addHint('quickSupportDirection','AI：実際に抵抗する方向は現場確認','review');
  addHint('quickSupportCount','AI：写真で数えられる範囲のみ参考','pending');
  addHint('quickSupportStrength','AI：木材外観だけでは支保力を確定しません','review');
  addHint('quickSupportBasis','AI：材種・断面・仕様書・試験成績を確認','review');
  addHint('quickCombinationConfirmed','AI：併用成立は自動確定しません。作用方向・接触を確認','review');
  addHint('v1CargoSurface','AI：写真で判別できる場合だけ候補。実接触面を確認','pending');
  addHint('v1FloorSurface','AI：床材を写真で判別できる場合だけ候補','pending');
  addHint('v1SurfaceCondition','AI：乾燥・濡れ・油脂・氷雪は目視確認を優先','review');
}
function cleanupLegacyAiUi(){
  ['v101AiAssist','v140PhotoAiBox','v140EditableNotice','v137MslAssist','v1PhotoStep','v141ContainerFitPanel'].forEach(id=>$(id)?.remove());
  document.querySelectorAll('.v141-photo-ai-toolbar').forEach(x=>x.remove());
  const recognition=$('photoRecognitionPanel');if(recognition){recognition.hidden=true;recognition.setAttribute('aria-hidden','true');recognition.style.display='none';}
  const analyze=$('fieldAnalyzePhoto');if(analyze)analyze.hidden=true;
}
function ensureOptions(){
  const q=$('quickMaterial');if(q&&!([...q.options].some(o=>o.value==='web'))){const o=document.createElement('option');o.value='web';o.textContent='ラッシングベルト（ウェビング）';q.insertBefore(o,q.options[0]||null);}
  if(q&&!([...q.options].some(o=>o.value==='steel'))){const o=document.createElement('option');o.value='steel';o.textContent='帯鉄';q.append(o);}
}
function applyDimensions(p){
  const d=p?.dimensionCandidates;if(!d)return;
  const suffix='（写真単眼推定・低確度。実測で訂正可）';
  setCandidate('quickCargoLength',Number(d.length).toFixed(2),`AI候補：約 ${Number(d.length).toFixed(2)} m ${suffix}`);
  setCandidate('quickCargoWidth',Number(d.width).toFixed(2),`AI候補：約 ${Number(d.width).toFixed(2)} m ${suffix}`);
  setCandidate('quickCargoHeight',Number(d.height).toFixed(2),`AI候補：約 ${Number(d.height).toFixed(2)} m ${suffix}`);
}
function applyPrediction(p){
  if(!p)return;cleanupLegacyAiUi();ensureOptions();
  const count=Number(p.count)||0,angle=Number.isFinite(Number(p.angle))?Number(p.angle):null,wood=Number(p.brownFrac)>.055;
  const bandMaterial=p.materialCandidate==='steel'?'steel':p.materialCandidate==='web'?'web':'';
  applyDimensions(p);
  if(count>0){
    if(bandMaterial==='steel')setCandidate('quickMaterial','steel','AI候補：帯鉄（黒色の細い平帯）。商品名は写真から確定しません。');
    else if(bandMaterial==='web')setCandidate('quickMaterial','web','AI候補：ラッシングベルト（ウェビング）。商品名は写真から確定しません。');
    setCandidate('quickMaterialCategory','tensile',wood?'AI候補：引張系材。木製枠も見えますが、支保として算入するかは現場確認':'AI候補：引張系固縛材');
    setCandidate('quickCount',count,`AI候補：約 ${count}本（写真で見える範囲）`);
    addHint('quickMethod',bandMaterial==='steel'?'AI：帯鉄は検出。写真ではCTU側取付点が確認できないため、貨物ユニット結束かCTU固縛かを目視確認。直接固縛とは自動判定しません。':'AI：帯状材は検出。直接固縛／トップオーバーは取付位置を確認','review');
  }else{addHint('quickMaterial','AI：材質を明確に判別できません','review');addHint('quickCount','AI：本数を明確に抽出できません','review');}
  if(angle!=null)setCandidate('quickAngle',Math.round(angle*10)/10,`AI候補：約 ${angle.toFixed(1)}°（画像上。鉛直角は写真測定で訂正可）`);else addHint('quickAngle','AI：角度を抽出できません。2点測定を使用','review');
  if(wood){setCandidate('quickSupportMaterial','timber','AI候補：木材／木製枠');addHint('quickSupportDirection','AI：木製枠あり。CTUへの支保として作用する方向は現場確認','review');addHint('quickSupportCount','AI：木製部材あり。支保として有効な個数は目視確認','review');addHint('quickSupportStrength','AI：木材外観から支保力は確定不可','review');}
  addHint('v1CargoSurface',wood?'AI：木製ラック／当て材を検出。貨物底面の実接触材は要確認':'AI：貨物底面材は要確認','review');
  addHint('v1FloorSurface','AI：床との実接触面は写真で確認できる場合のみ選択','review');
  addHint('v1SurfaceCondition','AI：乾燥・濡れ・油脂等は目視確認を優先','review');
}
function blankNewCaseTitle(){
  const title=$('ctuNewCaseTitle');if(!title)return;
  const existing=Boolean(new URLSearchParams(location.search).get('applicationId'))||title.dataset.existingCaseLoaded==='1';
  if(!existing)title.value='';
}
function defaultNewCase(){
  if(new URLSearchParams(location.search).get('applicationId'))return;
  const q=$('quickMaterial');if(q){ensureOptions();if(!q.dataset.v142Defaulted){q.value='other';q.dataset.v142Defaulted='1';fire(q,'change');}}
  blankNewCaseTitle();
}
function init(){
  cleanupLegacyAiUi();prepareHints();defaultNewCase();
  window.addEventListener('sk:ctu-photo-ai-requested',e=>setTimeout(()=>applyPrediction(e.detail?.prediction||window.SKDGPhotoAI141?.prediction),0));
  window.addEventListener('sk:ctu-case-applied',()=>{const t=$('ctuNewCaseTitle');if(t)t.dataset.existingCaseLoaded='1';});
  window.addEventListener('sk:ctu-excel-imported',()=>setTimeout(blankNewCaseTitle,0));
  if(window.SKDGPhotoAI141?.prediction)applyPrediction(window.SKDGPhotoAI141.prediction);
  // 遅延挿入された旧補助UIが残らないよう、初期化直後の一度だけ再整理。常時監視はしない。
  setTimeout(cleanupLegacyAiUi,0);setTimeout(cleanupLegacyAiUi,500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
