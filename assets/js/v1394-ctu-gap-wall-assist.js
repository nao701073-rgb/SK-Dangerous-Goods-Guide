(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const DIRS=['forward','rear','left','right'];
const IDS={forward:'Forward',rear:'Rear',left:'Left',right:'Right'};
const THRESHOLD_CM=15;
const num=id=>{const e=$(id);if(!e||String(e.value||'').trim()==='')return null;const v=Number(e.value);return Number.isFinite(v)&&v>=0?v:null};
const setStatus=(axis,value,source)=>{
 const result=$(axis==='longitudinal'?'wallGapLongitudinalResult':'wallGapTransverseResult');
 const note=$(axis==='longitudinal'?'wallGapLongitudinalNote':'wallGapTransverseNote');
 if(value==null){if(result){result.textContent='判定不能';result.dataset.state='unknown'}if(note)note.textContent='尺度・寸法または目視測定値が不足しています。検査員が確認してください。';return;}
 const ok=value<=THRESHOLD_CM+1e-9;
 if(result){result.textContent=`${value.toFixed(1)} cm ／ ${ok?'15 cm以下候補':'15 cm超候補'}`;result.dataset.state=ok?'ok':'over'}
 if(note)note.textContent=`${source}。15 cm基準は水平方向の隙間合計の候補判定です。壁抵抗の採用は方向ごとの荷重伝達確認が必要です。`;
};
function manualAxis(axis){
 const a=axis==='longitudinal'?num('wallGapForwardCm'):num('wallGapLeftCm');
 const b=axis==='longitudinal'?num('wallGapRearCm'):num('wallGapRightCm');
 return a!=null&&b!=null?a+b:null;
}
function dimensionAxis(axis){
 const snap=window.SKCTUContainerReference?.snapshot?.();
 const inside=snap?.insideDimensionsM,cargo=snap?.cargoDimensionsM;
 if(!inside||!cargo)return null;
 const insideV=axis==='longitudinal'?Number(inside.l):Number(inside.w);
 const cargoV=axis==='longitudinal'?Number(cargo.length):Number(cargo.width);
 if(!(insideV>0&&cargoV>0))return null;
 return Math.max(0,(insideV-cargoV)*100);
}
function sourceLabel(axis){
 const ids=axis==='longitudinal'?['quickCargoLength']:['quickCargoWidth'];
 const ai=ids.some(id=>$(id)?.dataset?.v141AiSuggested==='1');
 return ai?'写真AIの貨物寸法候補と選択コンテナ内寸から算出（低確度）':'入力済み貨物寸法と選択コンテナ内寸から算出';
}
function refresh(){
 const ml=manualAxis('longitudinal'),mt=manualAxis('transverse');
 setStatus('longitudinal',ml!=null?ml:dimensionAxis('longitudinal'),ml!=null?'検査員入力の前方＋後方隙間合計':sourceLabel('longitudinal'));
 setStatus('transverse',mt!=null?mt:dimensionAxis('transverse'),mt!=null?'検査員入力の左＋右隙間合計':sourceLabel('transverse'));
 updateDirectionStatuses();
 window.dispatchEvent(new CustomEvent('sk:ctu-wall-gap-updated',{detail:snapshot()}));
}
function updateDirectionStatuses(){
 DIRS.forEach(key=>{
   const checked=Boolean($(`wallUse${IDS[key]}`)?.checked),gap=num(`wallGap${IDS[key]}Cm`),out=$(`wallUse${IDS[key]}Status`);
   if(!out)return;
   if(!checked){out.textContent='未確認：壁抵抗は算入しません。';out.dataset.state='off';return;}
   if(gap!=null&&gap>THRESHOLD_CM){out.textContent=`使用確認あり。ただし当該側の隙間入力 ${gap.toFixed(1)} cm。接触または緩衝・支保材による連続荷重経路を再確認してください。`;out.dataset.state='warn';return;}
   out.textContent=gap!=null?`検査員確認済み：隙間 ${gap.toFixed(1)} cm。壁抵抗の算入候補です。`:'検査員確認済み：有効な荷重伝達を確認。壁抵抗の算入候補です。';out.dataset.state='on';
 });
 if(typeof updateSummary==='function')try{updateSummary()}catch(_){ }
}
function applyMeasured(){
 const measured=num('photoMeasuredLength');if(measured==null){const st=$('photoStatus');if(st)st.textContent='写真測定長さがありません。基準寸法を設定して2点測定してください。';return;}
 const key=$('wallGapMeasuredDirection')?.value||'forward',target=$(`wallGap${IDS[key]}Cm`);if(!target)return;
 target.value=(measured*100).toFixed(1);target.dispatchEvent(new Event('input',{bubbles:true}));refresh();
 const st=$('photoStatus');if(st)st.textContent=`写真測定 ${measured.toFixed(3)} m を ${target.previousElementSibling?.textContent||'隙間'}として反映しました。`;
}
function snapshot(){
 const gaps=Object.fromEntries(DIRS.map(k=>[k,num(`wallGap${IDS[k]}Cm`)]));
 const confirmed=Object.fromEntries(DIRS.map(k=>[k,Boolean($(`wallUse${IDS[k]}`)?.checked)]));
 const long=manualAxis('longitudinal')??dimensionAxis('longitudinal'),trans=manualAxis('transverse')??dimensionAxis('transverse');
 return{thresholdCm:THRESHOLD_CM,gapsCm:gaps,confirmed,longitudinalGapSumCm:long,transverseGapSumCm:trans,longitudinalCandidate:long==null?'unknown':long<=THRESHOLD_CM?'within':'over',transverseCandidate:trans==null?'unknown':trans<=THRESHOLD_CM?'within':'over',updatedAt:new Date().toISOString()};
}
function restoreFromResult(){
 try{
  const p=new URLSearchParams(location.search),appId=p.get('applicationId'),key=p.get('resultKey');if(!appId||!key)return;
  const rows=window.ISSApplicationResults?.get?.(appId)||[];const row=rows.find(r=>String(r?.id||r?.resultId||r?.createdAt||'')===String(key))||rows.find(r=>String(r?.createdAt||'')===String(key));
  const i=row?.payload?.inputs||{},confirmed=i.wallDirectionConfirmed||{},gaps=i.wallGapCm||{};
  DIRS.forEach(k=>{const c=$(`wallUse${IDS[k]}`),g=$(`wallGap${IDS[k]}Cm`);if(c&&confirmed[k]!==undefined)c.checked=Boolean(confirmed[k]);if(g&&gaps[k]!=null)g.value=String(gaps[k]);});refresh();
 }catch(_){ }
}
function init(){
 $('wallGapAnalyzeBtn')?.addEventListener('click',refresh);$('wallGapApplyMeasuredBtn')?.addEventListener('click',applyMeasured);
 DIRS.forEach(k=>{$(`wallGap${IDS[k]}Cm`)?.addEventListener('input',refresh);$(`wallUse${IDS[k]}`)?.addEventListener('change',updateDirectionStatuses)});
 ['quickCargoLength','quickCargoWidth','quickContainerSpec','quickCtu'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(refresh,0)));
 ['sk:ctu-photo-loaded','sk:ctu-photo-ai-requested','sk:ctu-ai-applied','sk:ctu-restored'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(refresh,120)));
 restoreFromResult();setTimeout(refresh,200);
 window.SKCTUWallGapAssistV1394={refresh,snapshot,thresholdCm:THRESHOLD_CM};
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1394-ctu-gap-wall-assist.js':'v1.3.94'});
})();
