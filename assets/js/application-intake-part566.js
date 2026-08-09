(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const q=(sel,root=document)=>root.querySelector(sel);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function authName(){
    try{
      const user=window.ISSAuthBridge?.currentAuth?.().user||{};
      return String(user.displayName||user.name||user.loginId||'').trim();
    }catch{return ''}
  }
  function fillReviewer(){
    const input=$('intakeReviewer');
    if(input&&!String(input.value||'').trim()){
      const name=authName();
      if(name)input.value=name;
    }
  }
  function registeredUrl(){
    const link=$('intakeOpenApplication');
    if(!link||link.hidden||!link.getAttribute('href'))return null;
    try{return new URL(link.getAttribute('href'),location.href)}catch{return null}
  }
  function applicationIdFrom(url){return url?.searchParams?.get('applicationId')||''}
  function ensureNextActions(){
    if($('part566IntakeNextActions'))return $('part566IntakeNextActions');
    const register=$('intakeRegisterSection');
    if(!register)return null;
    const box=document.createElement('section');
    box.id='part566IntakeNextActions';
    box.className='part566-intake-next-actions';
    box.hidden=true;
    box.innerHTML='<div><span class="part566-kicker">登録後の次の操作</span><strong id="part566IntakeNextTitle">申請番号管理へ登録しました</strong><small id="part566IntakeNextSummary"></small></div><div class="part566-intake-next-buttons"><a class="primary-action" id="part566OpenDetail" target="_blank" rel="noopener">申請詳細を開く</a><a class="button-link" id="part566OpenFiles" target="_blank" rel="noopener">写真・添付を追加</a><a class="button-link" id="part566OpenCtu">固縛力参考算出へ</a></div>';
    const message=$('intakeRegisterMessage');
    if(message)message.insertAdjacentElement('afterend',box);else register.appendChild(box);
    return box;
  }
  function evidenceSummary(){
    try{
      const e=window.__SK_PART565_BUILD_REVIEW_EVIDENCE__?.();
      if(!e)return '';
      if(Number(e.unresolvedCount||0)>0)return `要確認 ${Number(e.unresolvedCount)}件が残っています。`;
      return `確認記録：自動 ${Number(e.autoConfirmedCount||0)}件／人確認 ${Number(e.humanConfirmedCount||0)}件。`;
    }catch{return ''}
  }
  function updateNextActions(){
    const box=ensureNextActions(),url=registeredUrl();
    if(!box)return;
    if(!url){box.hidden=true;return}
    const appId=applicationIdFrom(url);
    $('part566OpenDetail').href=url.toString();
    const files=new URL(url.toString());files.searchParams.set('tab','files');$('part566OpenFiles').href=files.toString();
    const ctu=new URL('ctu-securing-calculator.html',location.href);if(appId)ctu.searchParams.set('applicationId',appId);$('part566OpenCtu').href=ctu.toString();
    const summary=$('part566IntakeNextSummary');if(summary)summary.textContent=evidenceSummary()||'登録した案件から写真・添付・固縛力算出へ続けて進めます。';
    box.hidden=false;
  }
  function markBuild(){window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part566.js':'part566'});}
  fillReviewer();ensureNextActions();updateNextActions();markBuild();
  const observer=new MutationObserver(()=>{fillReviewer();updateNextActions()});
  ['intakeOpenApplication','intakeRegisterMessage','intakeRegisterSection'].forEach(id=>{const n=$(id);if(n)observer.observe(n,{subtree:true,childList:true,attributes:true,attributeFilter:['href','hidden','class']})});
  document.addEventListener('input',e=>{if(e.target?.id==='intakeReviewer')updateNextActions()});
  document.addEventListener('change',()=>setTimeout(updateNextActions,30));
})();
