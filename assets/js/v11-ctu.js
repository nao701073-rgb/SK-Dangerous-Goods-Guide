(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator'||document.documentElement.dataset.v11Ctu==='1')return;document.documentElement.dataset.v11Ctu='1';
  const $=id=>document.getElementById(id);const initial=new Map();
  const watched=['quickTransport','quickCtu','quickMass','quickCargoDescription','quickMaterialCategory','quickMethod','quickMaterial','quickDirection','quickCount','quickStrength','quickAngle'];
  watched.forEach(id=>{const el=$(id);if(el)initial.set(id,el.value)});
  const markChanged=()=>watched.forEach(id=>{const el=$(id);if(el&&initial.has(id)&&el.value!==initial.get(id)){el.closest('.quick-grid>div,.quick-field')?.classList.add('v11-assisted-field')}});
  window.addEventListener('sk:ctu-excel-imported',()=>setTimeout(markChanged,120));
  $('v101ApplyAi')?.addEventListener('click',()=>setTimeout(markChanged,80));
  ['v1LashingCount','v1VisibleMsl','v1Angle','v1LashingType'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(markChanged,0)));

  /* Entire AI card can be tapped, making candidate selection easier on phones. */
  const candidates=$('v101AiCandidates');if(candidates){candidates.addEventListener('click',e=>{if(e.target.matches('input,button,select,a,label'))return;const card=e.target.closest('.v101-ai-card');const cb=card?.querySelector('input[type=checkbox]');if(cb){cb.checked=!cb.checked;cb.dispatchEvent(new Event('change',{bubbles:true}));card.classList.toggle('is-selected',cb.checked)}});candidates.addEventListener('change',e=>{const cb=e.target.closest('input[type=checkbox]');cb?.closest('.v101-ai-card')?.classList.toggle('is-selected',cb.checked)})}
  if(candidates&&!$('v11AiTools')){const tools=document.createElement('div');tools.id='v11AiTools';tools.className='v11-ai-tools';tools.innerHTML='<button type="button" class="v11-small-button" id="v11SelectAi">表示中の候補を選択</button><button type="button" class="v11-small-button" id="v11ClearAi">選択を解除</button>';candidates.before(tools);$('v11SelectAi').onclick=()=>candidates.querySelectorAll('input[type=checkbox]').forEach(cb=>{cb.checked=true;cb.dispatchEvent(new Event('change',{bubbles:true}))});$('v11ClearAi').onclick=()=>candidates.querySelectorAll('input[type=checkbox]').forEach(cb=>{cb.checked=false;cb.dispatchEvent(new Event('change',{bubbles:true}))})}

  /* Step 6: assisted fields are collapsed by default after document/photo candidate adoption. */
  const fieldStep=$('quickMaterialCategory')?.closest('.quick-step');if(fieldStep&&!$('v11AssistedToggle')){const body=fieldStep.querySelector('.quick-step__body');const bar=document.createElement('div');bar.className='v11-assisted-bar';bar.innerHTML='<div><strong>不足項目だけ補う</strong><small>申請書や写真から候補入力できた項目は折りたたみます。</small></div><button id="v11AssistedToggle" type="button" class="v11-small-button">入力済みも表示</button>';body?.prepend(bar);let showAll=false;$('v11AssistedToggle').onclick=()=>{showAll=!showAll;fieldStep.classList.toggle('v11-show-assisted',showAll);$('v11AssistedToggle').textContent=showAll?'入力済みを隠す':'入力済みも表示'};new MutationObserver(markChanged).observe(fieldStep,{childList:true,subtree:true});}

  /* Put one large calculation action at the bottom of the normal flow. */
  const calc=$('quickCalcBtn');if(calc){calc.classList.add('v11-main-calc');calc.textContent='参考算出する'}
})();
