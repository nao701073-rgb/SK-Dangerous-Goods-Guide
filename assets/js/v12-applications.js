(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='applications'||document.documentElement.dataset.v12Applications==='1')return;
  document.documentElement.dataset.v12Applications='1';
  const allowScroll=()=>{try{return Boolean(window.SKDGUserPreferencesV11?.read?.().autoScroll)}catch{return false}};
  const $=id=>document.getElementById(id);const motion=()=>document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth';
  const list=$('applicationList'),quick=$('applicationQuickSection'),select=$('quickApplicationSelect');

  /* Keep non-daily work areas closed until the user explicitly asks for them. */
  const sections={documents:$('applicationDocumentSection'),photos:$('applicationPhotoSection'),registeredPhotos:$('applicationRegisteredPhotosSection'),results:$('applicationResultSection')};
  Object.entries(sections).forEach(([key,section])=>{
    if(!section)return;section.classList.add('v12-optional-section');
    const heading=section.querySelector('.management-heading,.section-heading');
    if(heading&&!heading.querySelector('.v12-section-close')){
      const b=document.createElement('button');b.type='button';b.className='v12-section-close v12-inline-button';b.textContent='閉じる';
      b.addEventListener('click',()=>{section.classList.remove('v12-open');allowScroll()&&quick?.scrollIntoView({behavior:motion(),block:'start'})});heading.append(b);
    }
  });
  function openSection(section){if(!section)return;section.classList.add('v12-open');allowScroll()&&setTimeout(()=>section.scrollIntoView({behavior:motion(),block:'start'}),20)}
  $('quickAddPhoto')?.addEventListener('click',()=>openSection(sections.photos));
  $('quickAddDocument')?.addEventListener('click',()=>openSection(sections.documents));
  document.querySelectorAll('[data-application-section]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.applicationSection;if(id==='applicationPhotoSection')openSection(sections.photos);if(id==='applicationDocumentSection')openSection(sections.documents)}));

  /* Results remain available without taking vertical space in the normal path. */
  if(sections.results&&!$('v12ResultToggle')){
    const heading=sections.results.querySelector('.management-heading');const b=document.createElement('button');b.id='v12ResultToggle';b.type='button';b.className='v12-inline-button';b.textContent='確認結果を表示';
    b.addEventListener('click',()=>{const on=sections.results.classList.toggle('v12-open');b.textContent=on?'確認結果を閉じる':'確認結果を表示'});heading?.append(b);
  }

  /* Small selected-case summary: no workflow state, only a visual handoff. */
  if(quick&&!$('v12SelectedCase')){
    const p=document.createElement('div');p.id='v12SelectedCase';p.className='v12-selected-case';p.innerHTML='<span>選択中</span><strong id="v12SelectedCaseText">申請番号を選択してください</strong>';
    quick.querySelector('.management-heading')?.after(p);
  }
  function updateSelected(){const text=select?.selectedOptions?.[0]?.textContent?.trim()||'申請番号を選択してください';const out=$('v12SelectedCaseText');if(out)out.textContent=select?.value?text:'申請番号を選択してください';highlightList()}
  select?.addEventListener('change',updateSelected);updateSelected();

  function resolveOptionFromCard(card){
    if(!select||!card)return null;const id=card.dataset.applicationId||card.dataset.id||card.querySelector('[data-application-id]')?.dataset.applicationId;
    if(id){const direct=[...select.options].find(o=>o.value===id);if(direct)return direct}
    const text=(card.textContent||'').replace(/\s+/g,' ');return [...select.options].find(o=>o.value&&text.includes((o.textContent||'').trim()))||null;
  }
  function highlightList(){if(!list||!select)return;list.querySelectorAll('.v12-selected-list-item').forEach(x=>x.classList.remove('v12-selected-list-item'));if(!select.value)return;[...list.children].forEach(card=>{const opt=resolveOptionFromCard(card);if(opt?.value===select.value)card.classList.add('v12-selected-list-item')})}
  list?.addEventListener('click',e=>{
    if(e.target.closest('button,a,input,select,textarea,label'))return;const card=e.target.closest(':scope > *')||e.target.closest('[data-application-id]');const opt=resolveOptionFromCard(card);if(!opt)return;select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}));if(window.innerWidth<760)allowScroll()&&quick?.scrollIntoView({behavior:motion(),block:'start'});
  });
  if(list)new MutationObserver(highlightList).observe(list,{childList:true,subtree:true});

  /* Search stays simple: one clear action next to the existing search box. */
  const filter=$('applicationFilter');if(filter&&!$('v12ClearApplicationSearch')){
    const b=document.createElement('button');b.id='v12ClearApplicationSearch';b.type='button';b.className='v12-inline-button';b.textContent='検索をクリア';b.addEventListener('click',()=>{filter.value='';filter.dispatchEvent(new Event('input',{bubbles:true}));filter.focus()});filter.after(b);
  }
})();
