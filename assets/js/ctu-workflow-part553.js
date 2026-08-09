(function(){
'use strict';
const $=id=>document.getElementById(id);
const REQUIRED=[
  {id:'quickMass',label:'貨物質量',ok:el=>Number(el?.value)>0},
  {id:'quickMaterial',label:'材質',ok:el=>Boolean(String(el?.value||'').trim())},
  {id:'quickCount',label:'本数・個数',ok:el=>Number(el?.value)>0},
  {id:'quickStrength',label:'確認済みMSL',ok:el=>Number(el?.value)>0}
];
const SNAPSHOT_IDS=['quickTransport','quickCtu','quickMass','quickCargoDescription','quickFriction','quickMu','quickMaterialCategory','quickMethod','quickMaterial','quickDirection','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickBasis','quickSupportMaterial','quickSupportDirection','quickSupportCount','quickSupportStrength','quickSupportBasis','quickCombinationConfirmed'];
let restoredSnapshot=null;
function state(){
  const items=REQUIRED.map(x=>{const el=$(x.id);return {...x,el,complete:x.ok(el)}});
  return {items,complete:items.filter(x=>x.complete).length,total:items.length,missing:items.filter(x=>!x.complete)};
}
function valueOf(el){return el?.type==='checkbox'?Boolean(el.checked):String(el?.value??'');}
function snapshot(){return Object.fromEntries(SNAPSHOT_IDS.map(id=>[id,valueOf($(id))]));}
function sameSnapshot(a,b){if(!a||!b)return true;return SNAPSHOT_IDS.every(id=>String(a[id]??'')===String(b[id]??''));}
function focusFirstMissing(){const s=state();const item=s.missing[0];if(!item)return;item.el?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>item.el?.focus(),220);}
function setupCompletionPanel(){
  const panel=$('quickEntryPanel');if(!panel||$('part553Completion'))return;
  const box=document.createElement('section');box.id='part553Completion';box.className='part553-completion';box.setAttribute('aria-live','polite');
  box.innerHTML='<div class="part553-completion-head"><div><span>入力状況</span><strong id="part553CompletionCount">0 / 4</strong></div><button type="button" id="part553CheckMissing" class="part553-small-btn">不足項目を確認</button></div><div id="part553CompletionItems" class="part553-completion-items"></div><p id="part553NextAction" class="part553-next-action"></p>';
  const badge=$('part552ModeBadge');(badge||panel.querySelector('.hint')||panel.querySelector('h2'))?.insertAdjacentElement('afterend',box);
  $('part553CheckMissing')?.addEventListener('click',()=>{const s=state();if(s.missing.length)focusFirstMissing();else $('part552CalcProceed')?.scrollIntoView({behavior:'smooth',block:'center'});});
}
function refreshCompletion(){
  const s=state(),count=$('part553CompletionCount'),items=$('part553CompletionItems'),next=$('part553NextAction'),btn=$('part553CheckMissing');
  if(count)count.textContent=`${s.complete} / ${s.total}`;
  if(items)items.innerHTML=s.items.map(x=>`<span class="${x.complete?'is-complete':'is-missing'}">${x.complete?'✓':'○'} ${x.label}</span>`).join('');
  if(btn)btn.textContent=s.missing.length?'不足項目を確認':'算出へ進む';
  if(next){
    if(s.missing.length) next.textContent=`次の操作：${s.missing[0].label}を入力・確認してください。`;
    else next.textContent='基本入力は完了しています。「算出して登録確認へ進む」から結果を確認できます。';
    next.classList.toggle('is-ready',!s.missing.length);
  }
  s.items.forEach(x=>{const field=x.el?.closest('.quick-field')||x.el?.parentElement;field?.classList.toggle('part553-field-complete',x.complete);field?.classList.toggle('part553-field-missing',!x.complete)});
}
function setupJourney(){
  const review=$('ctuReviewSection');if(!review||$('part553Journey'))return;
  const bar=document.createElement('div');bar.id='part553Journey';bar.className='part553-journey';bar.innerHTML='<span data-stage="input">1 入力</span><span data-stage="calc">2 算出</span><span data-stage="review">3 確認</span><span data-stage="register">4 登録</span>';
  review.insertAdjacentElement('beforebegin',bar);
}
function refreshJourney(stage){
  const order=['input','calc','review','register'],idx=Math.max(0,order.indexOf(stage));
  document.querySelectorAll('#part553Journey [data-stage]').forEach((el,i)=>{el.classList.toggle('is-done',i<idx);el.classList.toggle('is-current',i===idx)});
}
function setupJourneyEvents(){
  ['quickCalcBtn','part552CalcProceed'].forEach(id=>$(id)?.addEventListener('click',()=>setTimeout(()=>refreshJourney('review'),180)));
  const review=$('ctuReviewSection'),reg=$('ctuRegistrationSection'),register=$('ctuRegisterSimple');
  review?.addEventListener('input',()=>{const final=review.querySelector('[data-ctu-review="final"]')?.checked,reviewer=Boolean(String($('ctuReviewer')?.value||'').trim());refreshJourney(final&&reviewer?'register':'review')});
  register?.addEventListener('click',()=>setTimeout(()=>refreshJourney('register'),0));
  if(reg)new MutationObserver(()=>{if(register&&!register.disabled)refreshJourney('register')}).observe(reg,{subtree:true,attributes:true,attributeFilter:['disabled']});
}
function setupCaseLoadedBadge(){
  const select=$('ctuCaseApplicationSelect'),summary=$('ctuCaseSummary');if(!select||!summary||$('part553CaseBadge'))return;
  const badge=document.createElement('div');badge.id='part553CaseBadge';badge.className='part553-case-badge';summary.insertAdjacentElement('beforebegin',badge);
  const refresh=()=>{const selected=Boolean(select.value);badge.hidden=!selected;badge.innerHTML=selected?'<strong>申請番号管理から自動入力</strong><span>案件を選ぶと、登録済み情報を算出条件へ反映します。必要な項目だけ確認・修正してください。</span>':''};
  select.addEventListener('change',()=>setTimeout(refresh,120));refresh();
}
function setupRestoreChangeIndicator(){
  const host=$('part553Completion');if(!host||$('part553RestoreState'))return;
  const box=document.createElement('div');box.id='part553RestoreState';box.className='part553-restore-state';box.hidden=true;host.appendChild(box);
  const capture=()=>{
    if(window.SKCTURestoreContext){restoredSnapshot=snapshot();box.hidden=false;box.innerHTML='<strong>前回の算出条件を復元しました。</strong><span>現在、前回結果からの変更はありません。</span>';}
  };
  const refresh=()=>{if(!restoredSnapshot)return;const changed=!sameSnapshot(restoredSnapshot,snapshot());box.classList.toggle('is-changed',changed);box.innerHTML=changed?'<strong>前回結果から変更があります。</strong><span>変更後は再算出し、内容を確認してから登録してください。</span>':'<strong>前回の算出条件を復元しました。</strong><span>現在、前回結果からの変更はありません。</span>';};
  setTimeout(capture,650);document.querySelector('.calc-shell')?.addEventListener('input',refresh);document.querySelector('.calc-shell')?.addEventListener('change',refresh);
}
function setupStickyNext(){
  if($('part553StickyNext'))return;const bar=document.createElement('div');bar.id='part553StickyNext';bar.className='part553-sticky-next';bar.innerHTML='<span id="part553StickyText">基本入力を確認</span><button type="button" id="part553StickyButton">次へ</button>';document.body.appendChild(bar);
  const btn=$('part553StickyButton');btn?.addEventListener('click',()=>{const s=state();if(s.missing.length){focusFirstMissing();return}const final=$('ctuReviewSection')?.querySelector('[data-ctu-review="final"]');if(!final?.checked){$('part552CalcProceed')?.click();return}if(!$('ctuRegisterSimple')?.disabled){$('ctuRegistrationSection')?.scrollIntoView({behavior:'smooth',block:'start'});return}$('ctuReviewSection')?.scrollIntoView({behavior:'smooth',block:'start'});});
}
function refreshSticky(){
  const text=$('part553StickyText'),btn=$('part553StickyButton');if(!text||!btn)return;const s=state(),final=$('ctuReviewSection')?.querySelector('[data-ctu-review="final"]')?.checked,register=$('ctuRegisterSimple');
  if(s.missing.length){text.textContent=`残り ${s.missing.length}項目：${s.missing[0].label}`;btn.textContent='不足項目へ';}
  else if(!final){text.textContent='基本入力完了';btn.textContent='算出・確認へ';}
  else if(register&&!register.disabled){text.textContent='登録準備完了';btn.textContent='登録欄へ';}
  else{text.textContent='登録前の確認事項があります';btn.textContent='確認欄へ';}
}
function refreshAll(){refreshCompletion();refreshSticky();}
function setup(){
  setupCompletionPanel();setupJourney();setupCaseLoadedBadge();setupStickyNext();setupRestoreChangeIndicator();
  REQUIRED.forEach(x=>{x.el?.addEventListener('input',refreshAll);x.el?.addEventListener('change',refreshAll)});
  $('ctuReviewSection')?.addEventListener('input',refreshAll);$('ctuReviewSection')?.addEventListener('change',refreshAll);
  const reg=$('ctuRegisterSimple');if(reg)new MutationObserver(refreshAll).observe(reg,{attributes:true,attributeFilter:['disabled']});
  setupJourneyEvents();refreshAll();refreshJourney('input');
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,80)):setTimeout(setup,80);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part553.js':'part553'});
