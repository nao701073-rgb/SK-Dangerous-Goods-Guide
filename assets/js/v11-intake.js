(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow'||document.getElementById('v11IntakeDock'))return;
  const $=id=>document.getElementById(id);
  const edit=$('intakeEditSection'),check=$('intakeCheckSection'),reg=$('intakeRegisterApplication'),file=$('intakeFileInput');

  /* Move non-daily outputs/history behind one compact details block. */
  const exportActions=document.querySelector('.intake-actions--secondary'),history=document.querySelector('.v1-intake-history');
  if((exportActions||history)&&!$('v11IntakeExtras')){
    const details=document.createElement('details');details.id='v11IntakeExtras';details.className='v11-intake-extras';details.innerHTML='<summary>補助出力・取込履歴</summary><div class="v11-intake-extras__body"></div>';
    document.querySelector('#intakeRegisterSection')?.after(details);const body=details.querySelector('.v11-intake-extras__body');if(exportActions)body.append(exportActions);if(history)body.append(history);
  }

  const dock=document.createElement('div');dock.id='v11IntakeDock';dock.className='v11-action-dock';dock.innerHTML='<div><strong id="v11IntakeDockTitle">申請書を選択してください</strong><small id="v11IntakeDockNote">取込後は、必要な操作だけここに表示します。</small></div><button type="button" class="primary-action" id="v11IntakeNext">ファイルを選択</button>';
  document.body.append(dock);
  const title=$('v11IntakeDockTitle'),note=$('v11IntakeDockNote'),next=$('v11IntakeNext');let editWasVisible=!edit?.hidden;
  function state(){
    if(!edit||edit.hidden)return{title:'申請書を選択してください',note:'ExcelまたはCSVを読み込みます。',label:'ファイルを選択',action:()=>$('intakeSelectFile')?.click()};
    if(!check||check.hidden)return{title:'読取内容を確認してください',note:'必要な箇所だけ修正したら自動確認を実行します。',label:'自動確認を実行',action:()=>$('intakeRunCheck')?.click()};
    if(reg&&!reg.disabled)return{title:'登録できます',note:'確認内容を申請番号管理へ登録します。',label:'申請番号管理へ登録',action:()=>reg.click()};
    return{title:'確認結果を確認してください',note:'修正が必要な箇所を確認すると登録できます。',label:'確認結果へ移動',action:()=>check?.scrollIntoView({behavior:document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth',block:'start'})};
  }
  function refresh(){const s=state();title.textContent=s.title;note.textContent=s.note;next.textContent=s.label;next.onclick=s.action;const now=!edit?.hidden;if(now&&!editWasVisible){setTimeout(()=>edit?.scrollIntoView({behavior:document.documentElement.classList.contains('sk-user-reduce-motion')?'auto':'smooth',block:'start'}),80)}editWasVisible=now}
  refresh();
  [edit,check,reg,$('intakeRegisterState'),$('intakeFileStatus')].filter(Boolean).forEach(el=>new MutationObserver(refresh).observe(el,{attributes:true,childList:true,subtree:true,characterData:true}));
  ['click','change','input'].forEach(evt=>document.addEventListener(evt,()=>setTimeout(refresh,0),true));
  file?.addEventListener('change',()=>setTimeout(refresh,60));
})();
