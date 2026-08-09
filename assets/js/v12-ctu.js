(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator'||document.documentElement.dataset.v12Ctu==='1')return;
  document.documentElement.dataset.v12Ctu='1';
  const $=id=>document.getElementById(id);const pref=()=>window.SKDGUserPreferencesV12?.read?.()||{autoAiFocus:true,autoScroll:false};const allowScroll=()=>Boolean(pref().autoScroll);const motion=()=>document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth';
  const candidates=$('v101AiCandidates'),apply=$('v101ApplyAi'),contact=$('v1ContactStep');

  /* "Select all" is too easy to misuse when candidates conflict. Keep only explicit individual selection. */
  $('v11SelectAi')?.remove();
  const tools=$('v11AiTools');
  if(tools&&!$('v12AiSelectionStatus')){const s=document.createElement('span');s.id='v12AiSelectionStatus';s.className='v12-ai-selection-status';s.textContent='選択 0件';tools.prepend(s)}
  if(tools&&!$('v12RetakePhoto')){const b=document.createElement('button');b.id='v12RetakePhoto';b.type='button';b.className='v11-small-button';b.textContent='写真を撮り直す';b.addEventListener('click',()=>$('cameraInput')?.click());tools.append(b)}

  function selectedCount(){return candidates?.querySelectorAll('input[type=checkbox]:checked').length||0}
  function refresh(){const n=selectedCount();const s=$('v12AiSelectionStatus');if(s)s.textContent=`選択 ${n}件`;if(apply){apply.disabled=n===0;apply.textContent=n?`選んだ${n}件を反映して次へ`:'候補を選んでください'}}
  candidates?.addEventListener('change',refresh);if(candidates)new MutationObserver(refresh).observe(candidates,{childList:true,subtree:true,attributes:true});refresh();

  /* After explicit adoption, continue to contact/friction. Existing v1.0.1 handler remains the source of truth for data reflection. */
  apply?.addEventListener('click',()=>setTimeout(()=>{refresh();if(allowScroll())contact?.scrollIntoView({behavior:motion(),block:'start'})},100));

  function focusCandidates(){if(!pref().autoAiFocus||!allowScroll())return;setTimeout(()=>{if(candidates?.querySelector('input[type=checkbox]'))$('v101AiAssist')?.scrollIntoView({behavior:motion(),block:'start'})},420)}
  $('cameraInput')?.addEventListener('change',focusCandidates);$('photoInput')?.addEventListener('change',focusCandidates);
  window.addEventListener('sk:ctu-photo-loaded',focusCandidates);window.addEventListener('sk:ctu-photo-applied',focusCandidates);

  /* Keep selected candidates visually obvious, including those created after asynchronous analysis. */
  function paint(){candidates?.querySelectorAll('.v101-ai-card').forEach(card=>card.classList.toggle('is-selected',Boolean(card.querySelector('input[type=checkbox]:checked'))))}
  candidates?.addEventListener('change',paint);if(candidates)new MutationObserver(paint).observe(candidates,{childList:true,subtree:true,attributes:true});paint();
})();
