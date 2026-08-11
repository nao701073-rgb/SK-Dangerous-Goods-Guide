(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const BUILD='v1.3.110-step-confirmation';
  const $=id=>document.getElementById(id);
  const usable=el=>{
    if(!el)return false;
    if(el.type==='checkbox')return Boolean(el.checked);
    const raw=String(el.value??'').trim();
    if(!raw)return false;
    if(el.type==='number'){const n=Number(raw);return Number.isFinite(n)&&n>0}
    return true;
  };
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));
  const cardForStep=step=>step===1?$('ctuExcelRoutePanel'):step===2?$('photoInputPanel'):step===4?$('v1ContactStep'):step===6?$('wallGapAssistPanel'):document.querySelector(`#quickEntryPanel .ctu-numbered-step-card[data-ctu-step="${step}"]`);
  const BUTTON_TEXT={1:'このStepを確認',2:'確認して一括反映',3:'このStepを確認',4:'このStepを確認',5:'このStepを確認',6:'このStepを確認'};
  const PHOTO_FIELD_MAP={
    '固縛材':'quickMaterial',
    '固縛本数':'quickCount',
    '鉛直角':'quickAngle',
    '支保・当て材':'quickSupportMaterial',
    'CTUの種類':'quickCtu'
  };
  const PHOTO_TRACK=['quickMaterial','quickCount','quickAngle','quickSupportMaterial','quickCtu','quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL'];
  let timer=0;

  function api(){return window.SKCTUProgressAPI||null}
  function state(){try{return api()?.evaluate?.()||window.SKCTUProgressState||null}catch{return window.SKCTUProgressState||null}}
  function rowsForStep(step){const st=state();return [...(st?.missing||[]),...(st?.review||[])].filter(x=>Number(x.step)===Number(step))}
  function focusIssue(issue){
    if(!issue)return;
    const target=issue.id?$(issue.id):null;
    if(window.SKCTUActionGuide?.focusTarget&&issue.id){window.SKCTUActionGuide.focusTarget(issue.id,'');return}
    if(!target)return;
    const block=target.closest('[data-ctu-step],.quick-step,.panel')||target;
    block.scrollIntoView?.({behavior:'smooth',block:'center'});
    target.classList.add('ctu-status-focus');
    setTimeout(()=>target.classList.remove('ctu-status-focus'),1700);
    if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName))setTimeout(()=>target.focus?.({preventScroll:true}),260);
  }
  function showMessage(step,text,kind='ok'){
    const card=cardForStep(step),node=card?.querySelector('.v13109-step-confirm-message');
    if(!node)return;
    node.textContent=text;node.dataset.state=kind;node.hidden=false;
    clearTimeout(Number(node.dataset.timer)||0);
    const id=setTimeout(()=>{node.hidden=true;node.textContent=''},kind==='ok'?2200:4200);node.dataset.timer=String(id);
  }
  function setValueIfFree(id,value,changed){
    const el=$(id);if(!el||value==null||value==='')return false;
    if(api()?.isAccepted?.(id))return false;
    const raw=String(el.value??'').trim();
    // Empty fields and known unconfirmed defaults may be replaced by confirmed photo input.
    if(raw&& !['quickCount','quickAngle','quickCtu'].includes(id))return false;
    const next=String(value);if(raw===next)return false;
    el.value=next;fire(el,'input');fire(el,'change');changed.add(id);return true;
  }
  function protectSelectedAiCandidates(){
    const box=$('v140PhotoAiBox');if(!box)return;
    box.querySelectorAll('[data-v140-candidate]:checked').forEach(cb=>{
      const card=cb.closest('.v140-ai-card'),label=String(card?.querySelector('strong')?.textContent||'').trim();
      const target=PHOTO_FIELD_MAP[label];
      if(target&&api()?.isAccepted?.(target))cb.checked=false;
    });
  }
  function snapshotPhotoTargets(){const out={};PHOTO_TRACK.forEach(id=>{const el=$(id);if(el)out[id]=String(el.value??'')});return out}
  function changedPhotoTargets(before){return PHOTO_TRACK.filter(id=>String($(id)?.value??'')!==String(before[id]??''))}

  function batchApplyPhoto(){
    const changed=new Set(),before=snapshotPhotoTargets();
    // 1) Apply selected photo AI candidates, while leaving already confirmed/manual fields untouched.
    const aiApply=$('v140ApplyCandidates');
    if(aiApply){protectSelectedAiCandidates();aiApply.click()}
    // 2) Apply direct photo measurement fields only when the destination is not already confirmed.
    const angle=Number($('photoAngleValue')?.value);if(Number.isFinite(angle)&&angle>0)setValueIfFree('quickAngle',angle,changed);
    const count=Number($('visibleLashings')?.value);if(Number.isFinite(count)&&count>0)setValueIfFree('quickCount',Math.round(count),changed);
    const measured=Number($('photoMeasuredLength')?.value);if(Number.isFinite(measured)&&measured>0&&$('length')&&!String($('length').value||'').trim()){$('length').value=String(measured);fire($('length'),'input');changed.add('length')}
    // 3) Timber AI was intentionally designed to fill only empty/AI-staged w/h/L. Re-run that safe staging here.
    const timber=window.SKCTUTimberDimensions;
    const cand=timber?.getAiCandidate?.();
    if(cand)timber.stageAiCandidate?.(cand,{force:false,source:'②確認して一括反映'});
    changedPhotoTargets(before).forEach(id=>changed.add(id));
    return [...changed];
  }

  function updateButtons(){
    // Other CTU layout scripts may rebuild/move Step cards after this module initializes.
    // Re-ensure the per-Step action exists on the current live card before updating its state.
    for(let step=1;step<=6;step++)if(!$(`v13109ConfirmStep${step}`))addButton(step);
    const st=state();
    for(let step=1;step<=6;step++){
      const btn=$(`v13109ConfirmStep${step}`);if(!btn)continue;
      const confirmed=Boolean(api()?.isStepConfirmed?.(step));
      const rows=rowsForStep(step),missing=rows.filter(x=>x.type==='missing').length;
      btn.classList.toggle('is-confirmed',confirmed);btn.classList.toggle('has-missing',missing>0);
      btn.setAttribute('aria-pressed',String(confirmed));
      if(confirmed)btn.textContent=step===2?'✓ 一括反映・確認済み':'✓ 確認済み';
      else if(missing)btn.textContent=step===2?`確認して一括反映（不足${missing}）`:`確認する（不足${missing}）`;
      else btn.textContent=BUTTON_TEXT[step];
      const status=cardForStep(step)?.querySelector('.v13109-step-confirm-state');
      if(status){status.textContent=confirmed?'確認済み':missing?`未入力 ${missing}件`:rows.length?`確認待ち ${rows.length}件`:'確認できます';status.dataset.state=confirmed?'ok':missing?'missing':rows.length?'review':'ready'}
    }
  }

  function addButton(step){
    const card=cardForStep(step),head=card?.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head.ctu-step-card__head');
    if(!card||!head)return;
    let action=head.querySelector('.v13109-step-confirm-action');
    if(!action){
      action=document.createElement('span');action.className='v13109-step-confirm-action no-print';
      action.innerHTML=`<span class="v13109-step-confirm-state" aria-live="polite"></span><button type="button" class="v13109-step-confirm-btn" id="v13109ConfirmStep${step}" aria-pressed="false">${BUTTON_TEXT[step]}</button><small class="v13109-step-confirm-message" hidden aria-live="polite"></small>`;
      const wallBadge=step===6?head.querySelector('.v1394-wall-gap-badge'):null;
      if(wallBadge)head.insertBefore(action,wallBadge);else head.append(action);
    }
    const btn=$(`v13109ConfirmStep${step}`)||action.querySelector('.v13109-step-confirm-btn');
    if(btn&&btn.dataset.v13110Bound!=='1'){btn.dataset.v13110Bound='1';btn.addEventListener('click',()=>confirm(step));}
  }

  function confirm(step){
    const progress=api();if(!progress?.confirmStep){showMessage(step,'確認機能を読み込み直してください。','error');return}
    let fields=[];
    if(step===2)fields=batchApplyPhoto();
    // Let candidate/apply events settle before evaluating the step.
    setTimeout(()=>{
      const result=progress.confirmStep(step,{fields});
      if(!result?.ok){
        const issue=result?.missing?.[0]||result?.review?.[0]||result?.remaining?.[0];
        const label=issue?.label||'未確認項目';showMessage(step,`${label}を確認してください。`,'missing');focusIssue(issue);updateButtons();return;
      }
      if(step===2){
        const n=fields.length;showMessage(step,n?`${n}項目を反映し、②を確認済みにしました。`:'写真候補を確認済みにしました。','ok');
      }else showMessage(step,'このStepを確認済みにしました。','ok');
      window.SKCTUGuidedUsabilityV13105?.refresh?.();
      window.SKCTUActionGuide?.render?.();
      updateButtons();
    },step===2?120:0);
  }

  function init(){
    for(let step=1;step<=6;step++)addButton(step);
    updateButtons();
    const schedule=()=>{clearTimeout(timer);timer=setTimeout(updateButtons,60)};
    ['input','change'].forEach(type=>document.addEventListener(type,schedule,true));
    ['sk:ctu-step-confirmed','sk:ctu-confirm-all-applied','sk:ctu-photo-loaded','sk:ctu-photo-applied','sk:ctu-ai-applied','sk:ctu-ai-suggested','sk:ctu-system-applied','sk:ctu-calculated','sk:ctu-restored','sk:ctu-confirmation-retained','sk:ctu-confirmation-invalidated'].forEach(type=>window.addEventListener(type,schedule));
    [180,500,1000,1800].forEach(ms=>setTimeout(updateButtons,ms));
    window.SKCTUStepConfirmationV13109={confirm,batchApplyPhoto,updateButtons};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(init,180),{once:true});else setTimeout(init,180);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v13109-ctu-step-confirmation.js':BUILD});
})();
