(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id);

  function hasSelection(){return Boolean($('quickApplicationSelect')?.value)}
  function message(text,error=false){const out=$('quickApplicationMessage');if(!out)return;out.textContent=text;out.classList.toggle('is-error',error)}
  function ensureQuickBar(){
    const actions=document.querySelector('.application-quick-actions');if(!actions||$('part569QuickBar'))return;
    const bar=document.createElement('div');bar.id='part569QuickBar';bar.className='part569-quick-bar';
    bar.innerHTML='<div><span>ワンタッチ操作</span><small>申請番号を選択したまま、メモ保存と写真追加を続けて行えます。</small></div><div class="part569-quick-bar__actions"><button type="button" class="primary-action" id="part569SaveAndPhoto">メモ保存＋写真撮影</button><button type="button" id="part569PhotoNow">写真をすぐ追加</button></div>';
    actions.insertAdjacentElement('afterend',bar);
    $('part569SaveAndPhoto')?.addEventListener('click',()=>saveThenPhoto());
    $('part569PhotoNow')?.addEventListener('click',()=>openPhoto());
  }
  function openPhoto(){
    if(!hasSelection()){message('申請番号を選択してください。',true);$('quickApplicationSelect')?.focus();return}
    $('quickAddPhoto')?.click();
    setTimeout(()=>{
      const file=$('photoFile');
      if(!file){message('写真入力欄を開けませんでした。',true);return}
      file.click();
    },90);
  }
  function saveThenPhoto(){
    if(!hasSelection()){message('申請番号を選択してください。',true);$('quickApplicationSelect')?.focus();return}
    $('quickSaveMemo')?.click();
    setTimeout(()=>{
      const out=$('quickApplicationMessage');
      if(out?.classList.contains('is-error'))return;
      openPhoto();
    },80);
  }
  function update(){
    ensureQuickBar();
    const disabled=!hasSelection();
    ['part569SaveAndPhoto','part569PhotoNow'].forEach(id=>{const node=$(id);if(node)node.disabled=disabled});
  }
  $('quickApplicationSelect')?.addEventListener('change',()=>setTimeout(update,0));
  window.addEventListener('iss:applications-changed',()=>setTimeout(update,0));
  document.addEventListener('keydown',event=>{
    if(!(event.altKey&&String(event.key).toLowerCase()==='p'))return;
    if(!hasSelection())return;
    event.preventDefault();openPhoto();
  });
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(update,0)):setTimeout(update,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part569.js':'part569'});
})();
