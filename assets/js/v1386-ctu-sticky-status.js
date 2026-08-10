(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const value=id=>String($(id)?.value??'').trim();
  const number=id=>{const raw=value(id);return raw===''?NaN:Number(raw)};
  const item=(label,id,stage,type='missing',step=null)=>({label,id,stage,type,step});

  const CARGO_FIELDS=new Set(['quickMass','quickCargoDescription','quickTransport','quickCtu']);
  const SECURING_FIELDS=new Set([
    'quickUseTensile','quickUseSupport','quickMaterialCategory','quickMethod','quickMaterial','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickBasis',
    'quickSupportCount','quickSupportStrength','quickSupportBasis','quickDirection','quickSupportDirection',
    'quickFriction','quickMu'
  ]);
  const REQUIRED_PROVENANCE=new Set(['quickMass','quickMaterial','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickBasis','quickSupportCount','quickSupportStrength','quickSupportBasis']);
  const accepted=new Set();
  const suggested=new Set();
  const baseline=new Map();
  let calculated=false,registered=false,dirtyAfterCalculation=false;
  let excelImported=false,routeApplied=false,photoLoaded=false,photoApplied=false,contactTouched=false;

  function snapshotBaseline(){[...CARGO_FIELDS,...SECURING_FIELDS].forEach(id=>{const el=$(id);if(el)baseline.set(id,el.type==='checkbox'?String(Boolean(el.checked)):String(el.value??''))})}
  snapshotBaseline();
  function accept(id){if(id){accepted.add(id);suggested.delete(id)}}
  function suggest(id){if(id&&!accepted.has(id))suggested.add(id)}
  function acceptChangedFromBaseline(ids){ids.forEach(id=>{const el=$(id);if(!el)return;const current=el.type==='checkbox'?String(Boolean(el.checked)):String(el.value??'');if(current!==baseline.get(id))accepted.add(id)})}
  function hasAccepted(id){return !REQUIRED_PROVENANCE.has(id)||accepted.has(id)||suggested.has(id)}
  function fieldHasUsableValue(id){const el=$(id);if(!el)return false;if(el.type==='checkbox')return Boolean(el.checked);const raw=String(el.value??'').trim();if(!raw)return false;if(el.type==='number'){const n=Number(raw);return Number.isFinite(n)&&n>0}return true}
  function acceptFields(ids){(ids||[]).forEach(id=>{if(fieldHasUsableValue(id))accept(id)})}
  function suggestFields(ids){(ids||[]).forEach(id=>{if(fieldHasUsableValue(id))suggest(id)})}
  function stageStarted(pool){return [...pool].some(id=>accepted.has(id)||suggested.has(id))}
  function stepCard(step){return document.querySelector(`#quickEntryPanel .ctu-numbered-step-card[data-ctu-step="${step}"],#ctuExcelRoutePanel[data-ctu-step="${step}"],#photoInputPanel[data-ctu-step="${step}"]`)||((step===4)?$('v1ContactStep'):null)}
  function stepTarget(step){const card=stepCard(step);if(card?.id)return card.id;return step===1?'ctuExcelRoutePanel':step===2?'photoInputPanel':step===3?'quickTransport':step===4?'v1ContactStep':step===5?'quickUseTensile':'quickCalcBtn'}
  function contactCardHasValues(){const card=stepCard(4)||$('v1ContactStep');if(!card)return false;return [...card.querySelectorAll('input:not([type="hidden"]),select,textarea')].some(el=>el.type==='checkbox'?el.checked:String(el.value??'').trim()!=='')}

  function evaluate(){
    const missing=[],review=[];
    const method=$('quickMethod')?.value||'direct',useTensile=Boolean($('quickUseTensile')?.checked),useSupport=Boolean($('quickUseSupport')?.checked),combined=useTensile&&useSupport;

    const loading=value('loadingPort'),discharge=value('dischargePort');
    if((loading&&!discharge)||(!loading&&discharge))missing.push(item(loading?'陸揚港':'船積港',loading?'dischargePort':'loadingPort','route','missing',1));
    if(photoLoaded&&!photoApplied)review.push(item('写真候補の確認・反映','photoInputPanel','photo','review',2));

    const mass=number('quickMass');
    if(!Number.isFinite(mass)||mass<=0||!hasAccepted('quickMass'))missing.push(item('貨物質量','quickMass','cargo','missing',3));
    if(!contactTouched&&contactCardHasValues())review.push(item('接触面条件','v1ContactStep','contact','review',4));

    if(!useTensile&&!useSupport)missing.push(item('計算に使用する固縛材または支保・あて材','quickUseTensile','securing','missing',5));
    if(useTensile){
      const count=number('quickCount');if(!Number.isFinite(count)||count<=0||!hasAccepted('quickCount'))missing.push(item('固縛本数','quickCount','securing','missing',5));
      const strength=number('quickStrength');if(!Number.isFinite(strength)||strength<=0||!hasAccepted('quickStrength'))missing.push(item('確認済みMSL/STF','quickStrength','securing','missing',5));
      if(!value('quickMaterial')||!hasAccepted('quickMaterial'))missing.push(item('固縛材質','quickMaterial','securing','missing',5));
      if(method==='direct'){
        const cargoMsl=number('quickCargoMsl');if(!Number.isFinite(cargoMsl)||cargoMsl<=0||!hasAccepted('quickCargoMsl'))review.push(item('貨物側取付部MSL','quickCargoMsl','securing','review',5));
        const ctuMsl=number('quickCtuMsl');if(!Number.isFinite(ctuMsl)||ctuMsl<=0||!hasAccepted('quickCtuMsl'))review.push(item('CTU側固縛点MSL','quickCtuMsl','securing','review',5));
        const angle=number('quickAngle');if(!Number.isFinite(angle)||angle<=0||angle>90||!hasAccepted('quickAngle'))review.push(item('鉛直角','quickAngle','securing','review',5));
      }
    }
    if(useSupport){
      const supportCount=number('quickSupportCount');if(!Number.isFinite(supportCount)||supportCount<=0||!hasAccepted('quickSupportCount'))missing.push(item('支保材の個数','quickSupportCount','securing','missing',5));
      const supportStrength=number('quickSupportStrength');if(!Number.isFinite(supportStrength)||supportStrength<=0||!hasAccepted('quickSupportStrength'))missing.push(item('支保材の支保力','quickSupportStrength','securing','missing',5));
      if(!value('quickSupportMaterial'))missing.push(item('支保材質','quickSupportMaterial','securing','missing',5));
      if(!value('quickSupportBasis')||!hasAccepted('quickSupportBasis'))review.push(item('支保力の根拠','quickSupportBasis','securing','review',5));
    }
    const aiLabels={quickMaterial:'固縛材質（AI候補）',quickCount:'固縛本数（AI候補）',quickAngle:'鉛直角（AI候補）',quickSupportMaterial:'支保材質（AI候補）',quickSupportCount:'支保材個数（AI候補）'};
    suggested.forEach(id=>{if(aiLabels[id]&&fieldHasUsableValue(id)&&!accepted.has(id))review.push(item(aiLabels[id],id,'securing','review',5))});
    const overall=String($('overall')?.textContent||'').replace(/\s+/g,' ').trim();
    const resultNg=calculated&&/不足|要確認/.test(overall);
    return{missing,review,calculated,registered,resultNg,dirtyAfterCalculation,
      cargoStarted:stageStarted(CARGO_FIELDS),securingStarted:stageStarted(SECURING_FIELDS),
      excelImported,routeApplied,photoLoaded,photoApplied,contactTouched};
  }

  function rowsForStep(rows,step){return rows.filter(x=>x.step===step)}
  function setChip(step,state,label,focusId){
    const chip=document.querySelector(`.ctu-status-chip[data-ctu-step="${step}"]`),labelNode=$(`ctuStatusStep${step}`);
    if(chip){chip.dataset.state=state;chip.dataset.focusId=focusId||stepTarget(step)}
    if(labelNode)labelNode.textContent=label;
  }
  function setRegistrationButtons(enabled){['ctuRegisterSimple','saveCtuResult','createAndSaveCtuResult'].forEach(id=>{const b=$(id);if(!b)return;b.disabled=!enabled;b.setAttribute('aria-disabled',String(!enabled))})}

  function update(){
    const status=$('ctuStickyStatus');if(!status)return;
    const state=evaluate(),registrationMessage=$('ctuRegistrationMessage');
    if(!state.registered&&registrationMessage&&/(登録が完了しました|申請詳細.*固縛力算出)/.test(String(registrationMessage.textContent||'')))registrationMessage.textContent='';
    const m1=rowsForStep(state.missing,1),r1=rowsForStep(state.review,1);
    const r2=rowsForStep(state.review,2);
    const m3=rowsForStep(state.missing,3),r3=rowsForStep(state.review,3);
    const m4=rowsForStep(state.missing,4),r4=rowsForStep(state.review,4);
    const m5=rowsForStep(state.missing,5),r5=rowsForStep(state.review,5);

    if(m1.length)setChip(1,'missing',`不足 ${m1.length}`,m1[0].id);else if(r1.length)setChip(1,'review',`確認 ${r1.length}`,r1[0].id);else if(state.excelImported||state.routeApplied||value('loadingPort')||value('dischargePort'))setChip(1,'ok',state.excelImported?'取込済':'入力済',stepTarget(1));else setChip(1,'idle','任意',stepTarget(1));
    if(state.photoApplied)setChip(2,'ok','反映済',stepTarget(2));else if(state.photoLoaded||r2.length)setChip(2,'review','写真確認',stepTarget(2));else setChip(2,'idle','任意',stepTarget(2));
    if(m3.length)setChip(3,'missing',`不足 ${m3.length}`,m3[0].id);else if(r3.length)setChip(3,'review',`確認 ${r3.length}`,r3[0].id);else setChip(3,state.cargoStarted?'ok':'idle',state.cargoStarted?'入力済':'未確認',stepTarget(3));
    if(m4.length)setChip(4,'missing',`不足 ${m4.length}`,m4[0].id);else if(r4.length)setChip(4,'review','確認待ち',r4[0].id);else if(state.contactTouched)setChip(4,'ok','確認済',stepTarget(4));else setChip(4,stepCard(4)||$('v1ContactStep')?'idle':'idle',stepCard(4)||$('v1ContactStep')?'未確認':'準備中',stepTarget(4));
    if(m5.length)setChip(5,'missing',`不足 ${m5.length}`,m5[0].id);else if(r5.length)setChip(5,'review',`確認 ${r5.length}`,r5[0].id);else setChip(5,state.securingStarted?'ok':'idle',state.securingStarted?'入力済':'未確認',stepTarget(5));
    if(state.registered)setChip(6,'ok','登録済','ctuRegistrationSection');else if(state.dirtyAfterCalculation)setChip(6,'review','再算出必要','quickCalcBtn');else if(state.resultNg)setChip(6,'ng','不足・要確認','overall');else if(state.calculated)setChip(6,'ready','算出済','overall');else setChip(6,'idle','未算出','quickCalcBtn');

    const headline=$('ctuStickyHeadline'),detail=$('ctuStickyDetail'),jump=$('ctuStickyJump');
    const first=state.missing[0]||state.review[0]||null;
    const circled={1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥'};
    const groupedStatusText=(rows,limit=6)=>{
      const shown=rows.slice(0,limit),groups=[];
      shown.forEach(row=>{
        const step=Number(row.step)||0;
        let group=groups.find(x=>x.step===step);
        if(!group){group={step,labels:[]};groups.push(group)}
        group.labels.push(row.label);
      });
      const text=groups.map(group=>`${group.step?(circled[group.step]||String(group.step))+' ':''}${group.labels.join('・')}`).join(' ／ ');
      const rest=Math.max(0,rows.length-shown.length);
      return `${text}${rest?` ／ ほか${rest}件`:''}`;
    };
    if(state.missing.length){headline.textContent=`入力不足 ${state.missing.length}件`;detail.textContent=`不足項目：${groupedStatusText(state.missing)}`}
    else if(state.review.length){headline.textContent=`確認項目 ${state.review.length}件`;detail.textContent=`確認項目：${groupedStatusText(state.review)}`}
    else if(state.dirtyAfterCalculation){headline.textContent='条件が変更されています';detail.textContent='最新の条件で再度「参考算出する」を実行してください。'}
    else if(state.resultNg){headline.textContent='算出結果に不足・要確認があります';detail.textContent='⑥の算出結果と確認事項を確認してください。'}
    else if(state.registered){headline.textContent='①〜⑥の確認・登録が完了しています';detail.textContent='現在の入力条件に対する算出結果が申請番号管理へ登録されています。'}
    else if(state.calculated){headline.textContent='①〜⑥の入力確認・算出済み';detail.textContent='⑥の算出結果を確認し、必要に応じて申請番号管理へ登録してください。'}
    else {headline.textContent='①〜⑥の入力状況';detail.textContent='各番号の状態を確認してください。申請書・写真は任意の入力補助です。'}
    if(jump){jump.hidden=!first&&!state.resultNg&&!state.dirtyAfterCalculation;jump.dataset.focusId=first?.id||(state.resultNg?'overall':state.dirtyAfterCalculation?'quickCalcBtn':'');jump.textContent=state.missing.length?'不足箇所へ':state.review.length?'確認箇所へ':state.dirtyAfterCalculation?'再算出へ':'算出結果へ'}
    setRegistrationButtons(state.calculated&&!state.dirtyAfterCalculation&&!state.missing.length);
    window.SKCTUProgressState={...state,accepted:[...accepted],suggested:[...suggested]};
  }

  function confirmAllCurrent(){
    [...CARGO_FIELDS,...SECURING_FIELDS].forEach(id=>{if(fieldHasUsableValue(id))accept(id)});
    if(contactCardHasValues())contactTouched=true;
    photoApplied=photoApplied||photoLoaded;
    invalidateResult();
    update();
    window.dispatchEvent(new CustomEvent('sk:ctu-confirm-all-applied',{detail:{accepted:[...accepted]}}));
  }

  function invalidateResult(){if(calculated)dirtyAfterCalculation=true;registered=false;const msg=$('ctuRegistrationMessage');if(msg)msg.textContent=''}
  function jumpTo(id){
    let target=$(id);if(!target&&id==='v1ContactStep')target=stepCard(4);if(!target)return;
    const block=target.closest('[data-ctu-step],.quick-step,.panel,.case-section')||target;block.scrollIntoView({behavior:'smooth',block:'center'});target.classList.add('ctu-status-focus');setTimeout(()=>target.classList.remove('ctu-status-focus'),1300);if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName))setTimeout(()=>target.focus({preventScroll:true}),350)
  }
  function bind(){
    const status=$('ctuStickyStatus');if(!status||status.dataset.v1359Bound==='1')return;status.dataset.v1359Bound='1';
    status.addEventListener('click',event=>{const chip=event.target.closest('.ctu-status-chip'),jump=event.target.closest('#ctuStickyJump');if(chip)jumpTo(chip.dataset.focusId||stepTarget(Number(chip.dataset.ctuStep)||1));if(jump)jumpTo(jump.dataset.focusId)});
    let raf=0;const schedule=()=>{if(raf)return;raf=requestAnimationFrame(()=>{raf=0;update()})};
    const userChanged=event=>{const el=event.target;if(!el||!event.isTrusted)return;const card=el.closest?.('[data-ctu-step="4"],#v1ContactStep');if(card){contactTouched=true;invalidateResult();schedule();return}if(!el.id)return;if(CARGO_FIELDS.has(el.id)||SECURING_FIELDS.has(el.id)){accept(el.id);invalidateResult();schedule()}if(['loadingPort','dischargePort','departureMonth'].includes(el.id)){routeApplied=false;invalidateResult();schedule()}};
    document.addEventListener('input',userChanged,true);document.addEventListener('change',userChanged,true);
    window.addEventListener('sk:ctu-case-applied',()=>{['quickMass','quickCargoDescription','quickTransport','quickCtu'].forEach(id=>{if(value(id)!=='')accept(id)});invalidateResult();update()});
    window.addEventListener('sk:ctu-excel-imported',()=>{excelImported=true;if(Number.isFinite(number('quickMass'))&&number('quickMass')>0)accept('quickMass');if(value('quickCargoDescription'))accept('quickCargoDescription');acceptChangedFromBaseline([...CARGO_FIELDS,...SECURING_FIELDS]);invalidateResult();update()});
    window.addEventListener('sk:ctu-excel-cleared',()=>{excelImported=false;routeApplied=false;accepted.clear();suggested.clear();calculated=false;registered=false;dirtyAfterCalculation=false;update()});
    $('inferSeaArea')?.addEventListener('click',()=>setTimeout(()=>{routeApplied=Boolean(value('loadingPort')&&value('dischargePort'));if(routeApplied)accept('quickTransport');invalidateResult();update()},0));
    window.addEventListener('sk:ctu-photo-loaded',()=>{photoLoaded=true;photoApplied=false;invalidateResult();update()});
    window.addEventListener('sk:ctu-photo-applied',event=>{photoLoaded=true;photoApplied=true;const fields=event.detail?.fields;if(Array.isArray(fields)&&fields.length)acceptFields(fields);else acceptChangedFromBaseline([...SECURING_FIELDS]);invalidateResult();update()});
    window.addEventListener('sk:ctu-system-applied',event=>{const fields=event.detail?.fields;if(Array.isArray(fields)&&fields.length)acceptFields(fields);else acceptChangedFromBaseline([...CARGO_FIELDS,...SECURING_FIELDS]);invalidateResult();update()});
    window.addEventListener('sk:ctu-ai-suggested',event=>{suggestFields(event.detail?.fields||[]);invalidateResult();update()});
    window.addEventListener('sk:ctu-ai-applied',event=>setTimeout(()=>{const explicit=Array.isArray(event.detail?.fields)?event.detail.fields:[];acceptFields(explicit);[...CARGO_FIELDS,...SECURING_FIELDS].forEach(id=>{const el=$(id);if(el?.classList?.contains('v140-ai-applied')||el?.dataset?.v142AiSuggested==='1')accept(id)});acceptChangedFromBaseline([...CARGO_FIELDS,...SECURING_FIELDS]);photoApplied=true;invalidateResult();update()},0));
    window.addEventListener('sk:ctu-photo-ai-requested',()=>setTimeout(()=>{const ids=[...CARGO_FIELDS,...SECURING_FIELDS].filter(id=>{const el=$(id);return el?.dataset?.v142AiSuggested==='1'||el?.classList?.contains('v141-ai-suggested')});suggestFields(ids);invalidateResult();update()},100));
    const helperMap={v1LashingCount:['quickCount'],v1VisibleMsl:['quickStrength'],v1Angle:['quickAngle'],v1LashingType:['quickMaterialCategory','quickMaterial']};
    Object.entries(helperMap).forEach(([source,targets])=>{const el=$(source);if(!el)return;['input','change'].forEach(type=>el.addEventListener(type,event=>{if(!event.isTrusted)return;setTimeout(()=>{acceptFields(targets);photoApplied=true;invalidateResult();update()},0)}))});
    $('photoCanvas')?.addEventListener('click',event=>{if(!event.isTrusted)return;setTimeout(()=>{if(fieldHasUsableValue('quickAngle'))accept('quickAngle');photoApplied=true;invalidateResult();update()},0)});
    window.addEventListener('sk:ctu-calculated',()=>{const before=evaluate();calculated=!before.missing.length;registered=false;dirtyAfterCalculation=false;const msg=$('ctuRegistrationMessage');if(msg)msg.textContent='';update()});
    window.addEventListener('sk:ctu-registered',()=>{const current=evaluate();if(calculated&&!dirtyAfterCalculation&&!current.missing.length){registered=true;update()}});
    window.addEventListener('sk:ctu-confirm-all-current',confirmAllCurrent);
    window.SKCTUProgressAPI={confirmAllCurrent,evaluate,update,acceptFields};
    update();[80,220,520,900,1400,2200].forEach(delay=>setTimeout(update,delay));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('load',update,{once:true});
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1386-ctu-sticky-status.js':'v1.3.86'});
})();
