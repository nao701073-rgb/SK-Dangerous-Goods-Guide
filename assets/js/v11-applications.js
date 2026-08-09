(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='applications'||document.documentElement.dataset.v11Applications==='1')return;document.documentElement.dataset.v11Applications='1';
  const $=id=>document.getElementById(id);const main=document.querySelector('main');const intro=document.querySelector('.application-support-intro');const list=$('applicationListSection'),quick=$('applicationQuickSection'),form=$('applicationRegisterSection');
  /* Daily flow: list first, then selected case memo/actions. */
  if(list&&intro)intro.after(list);if(quick&&list)list.after(quick);
  if(list){const heading=list.querySelector('.management-heading');const advanced=list.querySelector('.application-advanced-tools');if(heading&&advanced&&!$('v11FilterToggle')){const b=document.createElement('button');b.type='button';b.id='v11FilterToggle';b.className='v11-small-button';b.textContent='絞り込み';heading.append(b);advanced.classList.add('v11-collapsed');b.addEventListener('click',()=>{const on=advanced.classList.toggle('v11-collapsed');b.textContent=on?'絞り込み':'絞り込みを閉じる'})}}
  /* Keep the full registration editor out of the normal path, but reveal it when create/edit is explicitly requested. */
  const showForm=()=>{document.body.classList.add('v11-show-application-form');form?.scrollIntoView({behavior:document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth',block:'start'})};
  const hideForm=()=>document.body.classList.remove('v11-show-application-form');
  $('quickCreateApplication')?.addEventListener('click',()=>setTimeout(showForm,0));$('applicationEditCancel')?.addEventListener('click',()=>setTimeout(hideForm,0));
  document.addEventListener('click',e=>{const t=e.target.closest('button,a');if(!t)return;const text=(t.textContent||'').trim();if(t.closest('#applicationList')&&/編集|修正|開く/.test(text))setTimeout(showForm,0)},true);
  if(form&&!$('v11FormClose')){const h=form.querySelector('.section-heading,.management-heading');if(h){const b=document.createElement('button');b.id='v11FormClose';b.type='button';b.className='v11-small-button';b.textContent='入力画面を閉じる';b.addEventListener('click',hideForm);h.append(b)}}
  /* Selecting a case should bring the short memo/actions into view on narrow screens. */
  $('quickApplicationSelect')?.addEventListener('change',()=>{if(window.innerWidth<760)setTimeout(()=>quick?.scrollIntoView({behavior:document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth',block:'start'}),40)});
})();
