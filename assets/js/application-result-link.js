(function(){
  'use strict';
  const KEY='iss-application-linked-results-v445';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  const write=rows=>localStorage.setItem(KEY,JSON.stringify(rows));
  const user=()=>window.ISSAuthBridge?.currentAuth?.().user||{};
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return []}}
  function fillSelect(select){
    if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">申請番号を選択してください</option>'+applications().map(a=>`<option value="${a.id}">${a.applicationYear||''}-${a.applicationNumber||''}${a.caseTitle?'｜'+a.caseTitle:''}</option>`).join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
  }
  function save(applicationId,type,title,payload){
    const app=applications().find(a=>a.id===applicationId); if(!app)throw new Error('登録先の申請番号を選択してください。');
    const rows=read(); const authUser=user();
    const row={id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,applicationId,applicationYear:app.applicationYear||'',applicationNumber:app.applicationNumber||'',type,title,payload,createdAt:new Date().toISOString(),createdBy:authUser.displayName||authUser.name||authUser.loginId||'利用者'};
    rows.unshift(row); write(rows); window.dispatchEvent(new CustomEvent('iss:application-results-changed')); return row;
  }
  function get(applicationId){return read().filter(r=>!applicationId||r.applicationId===applicationId)}
  window.ISSApplicationResults={fillSelect,save,get,read};
})();
