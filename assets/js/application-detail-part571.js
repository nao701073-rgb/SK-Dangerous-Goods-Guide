(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-detail')return;
  const $=id=>document.getElementById(id);
  const appId=new URLSearchParams(location.search).get('applicationId')||'';
  let lastRenderKey='';
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function app(){return apps().find(row=>String(row.id)===String(appId))||null}
  function countFrom(id){const text=String($(id)?.textContent||'');const n=Number((text.match(/\d+/)||[])[0]||0);return Number.isFinite(n)?n:0}
  function review(a){return a?.caseData?.intake?.reviewEvidence||null}
  function points(a){return Array.isArray(a?.ctuMslPointRegistry)?a.ctuMslPointRegistry.filter(row=>row?.planned!==false):[]}
  function next(a){
    const e=review(a),p=points(a),unconfirmed=p.filter(row=>(row.reviewStatus||'unconfirmed')!=='confirmed'),ctu=countFrom('ctuResultCount'),files=countFrom('fileCount');
    if(!e)return {tone:'warning',title:'申請書確認記録を確認',detail:'登録時の個別確認記録がありません。現在の申請書で確認してください。',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`,label:'申請書を確認'};
    if(Number(e.unresolvedCount||0)>0)return {tone:'warning',title:`申請書の要確認 ${Number(e.unresolvedCount)}件`,detail:'未解決の確認項目があります。対象案件を維持したまま再確認できます。',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`,label:'要確認へ'};
    if(unconfirmed.length)return {tone:'warning',title:`MSL取付点 未確認 ${unconfirmed.length}件`,detail:`使用予定 ${p.length}件のうち未確認の取付点があります。写真・刻印・資料を照合してください。`,href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}#mslPointRegistryTitle`,label:'MSLを確認'};
    if(ctu===0)return {tone:'note',title:'固縛力参考算出が未登録',detail:'申請書確認は完了しています。必要に応じてこの案件の条件を引き継いで参考算出へ進めます。',href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}`,label:'固縛力算出へ'};
    if(files===0)return {tone:'note',title:'写真・添付を確認',detail:'算出結果は登録されています。必要な現場写真・根拠資料がある場合は案件へ追加してください。',tab:'files',label:'写真・添付へ'};
    return {tone:'ok',title:'主要確認記録あり',detail:'申請書確認・算出結果・写真／添付の状況を確認できます。必要な箇所を下の直接操作から開いてください。',tab:'review',label:'確認記録を見る'};
  }
  function ensure(){
    const anchor=$('part567DetailActions');if(!anchor||$('part571DetailNext'))return;
    const box=document.createElement('section');box.id='part571DetailNext';box.className='part571-detail-next';anchor.insertAdjacentElement('afterend',box);
  }
  function render(){
    ensure();const a=app(),box=$('part571DetailNext');if(!a||!box)return;const action=next(a),e=review(a),p=points(a),confirmed=p.filter(row=>(row.reviewStatus||'unconfirmed')==='confirmed').length;
    const ctuCount=countFrom('ctuResultCount'),fileCount=countFrom('fileCount'),renderKey=[a.id,action.tone,action.title,action.label,Number(e?.unresolvedCount||0),p.length,confirmed,ctuCount,fileCount].join('|');
    if(renderKey===lastRenderKey)return;lastRenderKey=renderKey;
    box.className=`part571-detail-next is-${action.tone}`;
    const primary=action.href?`<a class="part571-detail-next__primary" href="${action.href}">${action.label}</a>`:`<button type="button" class="part571-detail-next__primary" data-part571-tab="${action.tab}">${action.label}</button>`;
    box.innerHTML=`<div class="part571-detail-next__body"><span>この案件の次の確認</span><strong>${action.title}</strong><small>${action.detail}</small><div><b>申請書：${e?(Number(e.unresolvedCount||0)?`要確認 ${Number(e.unresolvedCount)}件`:'確認済み'):'記録なし'}</b><b>MSL取付点：${p.length?`${confirmed}/${p.length}件確認済み`:'未登録'}</b><b>算出結果：${ctuCount}件</b><b>写真・添付：${fileCount}件</b></div></div><div class="part571-detail-next__actions">${primary}<a href="applications.html?applicationId=${encodeURIComponent(a.id)}">申請番号管理</a><a href="application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}">申請書確認</a><a href="ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}">固縛力算出</a></div>`;
    box.querySelector('[data-part571-tab]')?.addEventListener('click',event=>document.querySelector(`[data-detail-tab="${event.currentTarget.dataset.part571Tab}"]`)?.click());
  }
  const observer=new MutationObserver(()=>setTimeout(render,20));observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,20));
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,100)):setTimeout(render,100);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part571.js':'part571'});
})();
