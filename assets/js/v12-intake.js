(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow'||document.documentElement.dataset.v12Intake==='1')return;
  document.documentElement.dataset.v12Intake='1';
  const allowScroll=()=>{try{return Boolean(window.SKDGUserPreferencesV11?.read?.().autoScroll)}catch{return false}};
  const $=id=>document.getElementById(id);
  const upload=$('intakeUploadSection'),edit=$('intakeEditSection'),check=$('intakeCheckSection'),reg=$('intakeRegisterApplication');
  const motion=()=>document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth';

  function ensureButtons(){
    if(upload&&!$('v12ChangeFile')){
      const h=upload.querySelector('.intake-heading');
      const b=document.createElement('button');b.id='v12ChangeFile';b.type='button';b.className='v12-inline-button';b.textContent='別の申請書を選ぶ';b.hidden=true;
      b.addEventListener('click',()=> $('intakeSelectFile')?.click());h?.append(b);
    }
    if(edit&&!$('v12ReviewImported')){
      const h=edit.querySelector('.intake-heading');
      const b=document.createElement('button');b.id='v12ReviewImported';b.type='button';b.className='v12-inline-button';b.textContent='読取内容を再確認';b.hidden=true;
      b.addEventListener('click',()=>{edit.classList.toggle('v12-expanded');b.textContent=edit.classList.contains('v12-expanded')?'読取内容を閉じる':'読取内容を再確認'});h?.append(b);
    }
  }

  function isRegisterReady(){return Boolean(reg&&!reg.disabled)}
  function refresh(){
    ensureButtons();
    const imported=Boolean(edit&&!edit.hidden);
    upload?.classList.toggle('v12-complete-section',imported);
    const change=$('v12ChangeFile');if(change)change.hidden=!imported;

    const checked=Boolean(check&&!check.hidden);
    const ready=isRegisterReady();
    edit?.classList.toggle('v12-complete-edit',checked&&ready&&!edit.classList.contains('v12-expanded'));
    const review=$('v12ReviewImported');if(review)review.hidden=!(checked&&ready);
    if(!ready&&edit?.classList.contains('v12-expanded')){edit.classList.remove('v12-expanded');if(review)review.textContent='読取内容を再確認'}

    [upload,edit,check].forEach(x=>x?.classList.remove('v12-current-section'));
    if(!imported)upload?.classList.add('v12-current-section');
    else if(!checked)edit?.classList.add('v12-current-section');
    else if(!ready)check?.classList.add('v12-current-section');
  }
  refresh();
  [upload,edit,check,reg,$('intakeRegisterState'),$('intakeFileStatus')].filter(Boolean).forEach(el=>new MutationObserver(()=>requestAnimationFrame(refresh)).observe(el,{attributes:true,childList:true,subtree:true,characterData:true}));
  document.addEventListener('input',()=>requestAnimationFrame(refresh),true);
  document.addEventListener('change',()=>requestAnimationFrame(refresh),true);

  /* After a new import, keep the user on the newly relevant content rather than the now-complete upload box. */
  $('intakeFileInput')?.addEventListener('change',()=>{if(!allowScroll())return;setTimeout(()=>{if(edit&&!edit.hidden)edit.scrollIntoView({behavior:motion(),block:'start'})},180)});
})();
