(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const BUILD='v1.3.105-guided-usability';
  const $=id=>document.getElementById(id);
  const circled={1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥',7:'⑦'};
  let timer=0;

  function insertGuide(){
    const body=document.querySelector('[data-ctu-step="5"] > .quick-step__body');
    if(!body||$('v13105SimpleGuide'))return;
    const guide=document.createElement('div');
    guide.id='v13105SimpleGuide';guide.className='v13105-simple-guide';
    guide.innerHTML=`<div><strong>赤い「未入力」から順に入力すれば迷わず進められます。</strong><span>黄色はAI・参考候補などの「確認待ち」です。確認後、この条件で算出してください。計算式や係数を知らなくても通常操作できます。</span></div><div class="v13105-simple-guide__legend" aria-label="入力状態の色"><span class="v13105-legend is-missing">未入力</span><span class="v13105-legend is-review">確認待ち</span><span class="v13105-legend is-ok">確認済み</span></div>`;
    body.insertBefore(guide,body.firstChild);
  }

  function setSupportDefault(){
    const s=$('quickUseSupport');
    if(!s||s.dataset.v13105Initialised==='1')return;
    s.dataset.v13105Initialised='1';
    // Existing/restored cases are handled by the restore event. Only the untouched initial HTML state is simplified.
    const hasRestore=Boolean(window.SKCTUCaseRestoreInProgress||window.SKCTURestorePayload);
    if(!hasRestore&&s.defaultChecked===false&&s.checked){s.checked=false;s.dispatchEvent(new Event('change',{bubbles:true}))}
  }

  function syncTimberCompact(){
    const timber=Boolean($('quickUseSupport')?.checked)&&$('quickSupportMaterial')?.value==='timber';
    const strength=$('quickSupportStrength')?.closest('div');
    const basis=$('quickSupportBasis')?.closest('div');
    [strength,basis].forEach(x=>x?.classList.toggle('v13105-auto-hidden',timber));
    const grid=$('quickSupportStrength')?.closest('.quick-combined-grid');
    if(grid){
      let note=$('v13105TimberAutoNote');
      if(timber&&!note){note=document.createElement('p');note.id='v13105TimberAutoNote';note.className='v13105-timber-auto-note';note.textContent='木材は w・h・L と数量 n から参考支保力・根拠を自動作成します。入力は下の寸法欄だけで構いません。';grid.appendChild(note)}
      if(note)note.hidden=!timber;
    }
  }

  function controlFor(id){
    const el=$(id);if(!el)return null;
    if(el.type==='checkbox')return el.closest('label')||el;
    if(el.matches('input,select,textarea'))return el;
    return el;
  }
  function rawEmpty(el){
    if(!el)return true;
    if(el.type==='checkbox')return !el.checked;
    const raw=String(el.value??'').trim();
    if(!raw)return true;
    if(el.type==='number'){const n=Number(raw);return !Number.isFinite(n)||n<=0}
    return false;
  }
  function messageHost(el){
    if(!el)return null;
    if(el.type==='checkbox')return el.closest('label')?.parentElement||el.parentElement;
    return el.parentElement||el;
  }
  function clearMarks(){
    document.querySelectorAll('.v13105-field-missing,.v13105-field-review').forEach(el=>{el.classList.remove('v13105-field-missing','v13105-field-review');el.removeAttribute('aria-invalid')});
    document.querySelectorAll('.v13105-control-missing,.v13105-control-review').forEach(el=>el.classList.remove('v13105-control-missing','v13105-control-review'));
    document.querySelectorAll('.v13105-field-message').forEach(el=>el.remove());
    document.querySelectorAll('[data-v13105-review-title="1"]').forEach(el=>{el.removeAttribute('title');delete el.dataset.v13105ReviewTitle});
  }
  function mark(row,kindOverride=''){
    if(!row?.id)return;
    const el=$(row.id);if(!el)return;
    // A value that exists but only awaits provenance is a yellow review, not a red missing field.
    const kind=kindOverride||(row.type==='missing'&&rawEmpty(el)?'missing':'review');
    const control=controlFor(row.id);if(!control)return;
    if(control.matches?.('input,select,textarea')){
      control.classList.add(kind==='missing'?'v13105-field-missing':'v13105-field-review');
      if(kind==='missing')control.setAttribute('aria-invalid','true');
    }else control.classList.add(kind==='missing'?'v13105-control-missing':'v13105-control-review');
    if(kind==='review'){
      control.setAttribute('title',`要確認：${row.label}を確認してください。`);
      control.dataset.v13105ReviewTitle='1';
      return;
    }
    const host=messageHost(el);if(!host)return;
    const msg=document.createElement('small');msg.className='v13105-field-message is-missing';msg.dataset.for=row.id;
    msg.textContent=`未入力：${row.label}を入力してください。`;
    host.appendChild(msg);
  }

  function derivedRows(state){
    const rows=[];
    const useTensile=Boolean($('quickUseTensile')?.checked),useSupport=Boolean($('quickUseSupport')?.checked);
    // Profile selectors are helpers, not duplicate required inputs: a user may either select a profile or enter the verified capacity directly.
    if(!useTensile&&!useSupport){rows.push({id:'quickUseSupport',label:'支保・あて材を使用する場合はこちら',type:'missing',step:5})}
    return rows;
  }

  function refresh(){
    insertGuide();syncTimberCompact();clearMarks();
    let state=null;try{state=window.SKCTUProgressAPI?.evaluate?.()}catch(_){ }
    if(!state)return;
    const rows=[...(state.missing||[]),...(state.review||[]),...derivedRows(state)];
    const seen=new Set();
    rows.forEach(row=>{const key=row.id;if(!key||seen.has(key))return;seen.add(key);mark(row)});
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,45)}

  function init(){
    document.documentElement.dataset.v13105Guided='ready';
    insertGuide();
    const support=$('quickUseSupport');
    // HTML initial default in v1.3.105 is off; restored cases will overwrite it.
    if(support&&!support.checked)window.SKCTUQuickUsage?.sync?.();
    syncTimberCompact();
    ['quickUseSupport','quickUseTensile','quickSupportMaterial','quickMaterial','quickMaterialProfile','quickSupportProfile'].forEach(id=>{const e=$(id);e?.addEventListener('change',schedule)});
    ['input','change'].forEach(type=>document.addEventListener(type,schedule,true));
    ['sk:ctu-calculated','sk:ctu-restored','sk:ctu-confirm-all-applied','sk:ctu-photo-applied','sk:ctu-ai-suggested','sk:ctu-ai-applied','sk:ctu-system-applied','sk:ctu-usage-changed'].forEach(type=>window.addEventListener(type,()=>setTimeout(refresh,0)));
    const toggle=$('toggleAdvanced');if(toggle){toggle.textContent='計算の詳細を見る';toggle.setAttribute('title','計算式・係数・MSL採用理由・専門設定を別画面で確認')}
    const actions=toggle?.closest('.quick-actions');if(actions&&!$('v13105DetailsHint')){const hint=document.createElement('p');hint.id='v13105DetailsHint';hint.className='v13105-details-hint';hint.textContent='通常は「計算の詳細」を開かなくても算出できます。計算式や専門設定を確認したい場合だけ開いてください。';actions.insertAdjacentElement('afterend',hint)}
    setTimeout(refresh,140);setTimeout(refresh,520);
    window.SKCTUGuidedUsabilityV13105={refresh};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v13105-ctu-guided-usability.js':BUILD});
})();
