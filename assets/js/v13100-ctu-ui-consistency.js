(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const cardForStep=n=>n===1?$('ctuExcelRoutePanel'):n===2?$('photoInputPanel'):n===6?$('wallGapAssistPanel'):n===7?$('quickCalcBtn')?.closest('[data-ctu-step="7"],.quick-step'):document.querySelector(`#quickEntryPanel [data-ctu-step="${n}"]`);
function normalizeStepHeaders(){
  const titles={1:'申請書・航路から入力する',2:'写真を撮影・アップロードする',3:'輸送条件と貨物を確認',4:'貨物底面とCTU床面を確認',5:'固縛・支保条件を確認',6:'壁面の隙間・壁抵抗利用を確認',7:'参考算出を確認'};
  for(let n=1;n<=7;n++){
    const card=cardForStep(n); if(!card)continue;
    card.dataset.ctuStep=String(n);
    const head=card.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head'); if(!head)continue;
    let num=head.querySelector('.ctu-step-card__num'), title=head.querySelector('.ctu-step-card__title');
    if(num)num.textContent=String(n);
    if(title)title.textContent=titles[n];
  }
}
function removeLegacyVisualResidue(){
  const nodes=[$('ctuStep5Panels'),$('ctuPrimarySecuringPanel'),$('ctuSupportSecuringPanel'),$('wallGapAssistPanel')].filter(Boolean);
  nodes.forEach(n=>{n.classList.add('v13100-clean-card'); n.style.removeProperty('border-left'); n.style.removeProperty('box-shadow')});
}
function updateWallSelectionLabels(){
  [['Forward','前方'],['Rear','後方'],['Left','左方向'],['Right','右方向']].forEach(([suffix,label])=>{
    const input=$(`wallUse${suffix}`); if(!input)return;
    const card=input.closest('.v1394-wall-direction-card'); if(!card)return;
    card.classList.toggle('is-wall-selected',input.checked);
    card.dataset.wallState=input.checked?'selected':'idle';
    card.setAttribute('aria-label',`${label}：${input.checked?'壁抵抗を計算に使用':'壁抵抗を使用しない'}`);
  });
}
function updateLayoutAria(){
  const body=document.body, two=body.classList.contains('ctu-layout-two');
  $('ctuLayoutOne')?.setAttribute('aria-pressed',String(!two));
  $('ctuLayoutTwo')?.setAttribute('aria-pressed',String(two));
}
function refresh(){normalizeStepHeaders();removeLegacyVisualResidue();updateWallSelectionLabels();updateLayoutAria()}
function bind(){
  ['wallUseForward','wallUseRear','wallUseLeft','wallUseRight'].forEach(id=>$(id)?.addEventListener('change',updateWallSelectionLabels));
  ['sk:ctu-layout-changed','sk:ctu-restored','sk:ctu-calculated','sk:ctu-wall-gap-updated'].forEach(ev=>window.addEventListener(ev,()=>setTimeout(refresh,0)));
  refresh(); [100,350,900,1800].forEach(ms=>setTimeout(refresh,ms));
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/css/v13100-ctu-visual-consolidation.css':'v1.3.100','assets/js/v13100-ctu-ui-consistency.js':'v1.3.100'});
})();
