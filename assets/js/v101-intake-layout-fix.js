(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const edit=$('intakeEditSection');
  if(edit&&!$('v101IntakeLayoutNote')){
    const note=document.createElement('p');note.id='v101IntakeLayoutNote';note.className='v101-intake-note';note.textContent='読み取れた内容だけ候補入力しています。原本を見ながら、違う箇所・空欄だけ修正してください。';
    edit.querySelector('.intake-heading')?.after(note);
  }
  function normalize(){
    document.documentElement.style.maxWidth='100%';document.body.style.maxWidth='100%';document.body.style.overflowX='hidden';
    document.querySelectorAll('.intake-page,.intake-card,.intake-grid,.intake-cargo-wrap,.intake-cargo-table').forEach(el=>{el.style.maxWidth='100%';el.style.minWidth=el.classList.contains('intake-cargo-table')?'':'0'});
    document.querySelectorAll('#intakeCargoBody input,#intakeCargoBody select,#intakeCargoBody textarea').forEach(el=>{el.style.maxWidth='100%';el.style.minWidth='0'});
  }
  normalize();
  const body=$('intakeCargoBody');if(body)new MutationObserver(()=>requestAnimationFrame(normalize)).observe(body,{childList:true,subtree:true,attributes:true});
  ['intakeFileStatus','intakeEditSection','intakeCheckSection'].forEach(id=>{const el=$(id);if(el)new MutationObserver(()=>requestAnimationFrame(normalize)).observe(el,{childList:true,subtree:true,attributes:true})});
  window.addEventListener('resize',normalize,{passive:true});
})();
