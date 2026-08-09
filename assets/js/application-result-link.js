(function(){
  'use strict';
  const KEY='iss-application-linked-results-v445';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return []}};
  const write=rows=>localStorage.setItem(KEY,JSON.stringify(rows));
  const user=()=>window.ISSAuthBridge?.currentAuth?.().user||{};
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return []}}
  function officialNumber(app){return String(app?.numberType==='temporary'?(app?.temporaryNumber||app?.applicationNumber):app?.applicationNumber||'').trim()}
  function findByNumber(year,number){
    const y=String(year||'').trim(),n=String(number||'').trim();
    if(!y||!n)return null;
    return applications().find(a=>String(a.applicationYear||'').trim()===y&&a.numberType!=='temporary'&&officialNumber(a)===n)||null;
  }
  function fillSelect(select){
    if(!select)return;
    const current=select.value;
    select.innerHTML='<option value="">申請番号を選択してください</option>'+applications().map(a=>`<option value="${a.id}">${a.applicationYear||''}-${officialNumber(a)}${a.caseTitle?'｜'+a.caseTitle:''}</option>`).join('');
    if([...select.options].some(o=>o.value===current))select.value=current;
  }
  function nonBlankUpdates(fields={}){
    const out={};
    ['applicantName','shipper','containerNumber','containerType','vesselName','voyageNumber','loadingPort','dischargePort','applicationDate','inspectionPlannedDate','inspectionDate','caseTitle','note','unNumber','japaneseName','englishName','hazardClass','packingGroup'].forEach(k=>{
      const v=fields[k]; if(v!==undefined&&v!==null&&String(v).trim()!=='')out[k]=v;
    });
    ['cargoItems','subsidiaryHazardClasses'].forEach(k=>{if(Array.isArray(fields[k])&&fields[k].length)out[k]=fields[k]});
    if(fields.caseData&&typeof fields.caseData==='object'){
      const cd={};
      Object.entries(fields.caseData).forEach(([k,v])=>{
        if(k==='cargoItems'){if(Array.isArray(v)&&v.length)cd[k]=v;return;}
        if(Array.isArray(v)){if(v.length)cd[k]=v;return;}
        if(v&&typeof v==='object'){cd[k]=v;return;}
        if(v!==undefined&&v!==null&&String(v).trim()!=='')cd[k]=v;
      });
      if(Object.keys(cd).length)out.caseData=cd;
    }
    if(fields.status)out.status=fields.status;
    return out;
  }
  function createApplication(fields={}){
    if(!window.ISSStorage?.addApplication)throw new Error('申請番号管理機能を読み込めませんでした。');
    const year=String(fields.applicationYear||new Date().getFullYear()).trim();
    const number=String(fields.applicationNumber||'').trim();
    if(!number)throw new Error('新規登録する申請番号を入力してください。');
    const existing=findByNumber(year,number);
    if(existing){
      const updates=nonBlankUpdates(fields);
      if(Object.keys(updates).length&&window.ISSStorage?.updateApplication){
        window.ISSStorage.updateApplication(existing.id,{...updates,applicationYear:year,numberType:'official',applicationNumber:number,changeReason:'同一申請番号へ登録内容を追加'});
      }
      return applications().find(a=>String(a.id)===String(existing.id))||existing;
    }
    return window.ISSStorage.addApplication({...fields,applicationYear:year,numberType:'official',applicationNumber:number,status:fields.status||'in_progress',caseTitle:String(fields.caseTitle||'').trim(),note:String(fields.note||'').trim()});
  }
  function save(applicationId,type,title,payload){
    const app=applications().find(a=>String(a.id)===String(applicationId)); if(!app)throw new Error('登録先の申請番号を選択してください。');
    const rows=read(); const authUser=user();
    const row={id:`${Date.now()}-${Math.random().toString(16).slice(2)}`,applicationId:app.id,applicationYear:app.applicationYear||'',applicationNumber:officialNumber(app),type,title,payload,createdAt:new Date().toISOString(),createdBy:authUser.displayName||authUser.name||authUser.loginId||'利用者'};
    rows.unshift(row); write(rows); window.dispatchEvent(new CustomEvent('iss:application-results-changed',{detail:{applicationId:app.id,type,resultId:row.id}})); return row;
  }
  function get(applicationId){return read().filter(r=>!applicationId||String(r.applicationId)===String(applicationId))}
  function removeByApplicationId(applicationId){
    const before=read(),after=before.filter(r=>String(r.applicationId)!==String(applicationId));
    if(after.length===before.length)return 0;
    write(after);window.dispatchEvent(new CustomEvent('iss:application-results-changed',{detail:{applicationId,removed:before.length-after.length}}));return before.length-after.length;
  }
  function getTypeSummary(applicationId){const rows=get(applicationId);return{verification:rows.filter(r=>r.type==='dangerous-goods-verification').length,ctu:rows.filter(r=>r.type==='ctu-securing').length,total:rows.length};}
  window.ISSApplicationResults={fillSelect,createApplication,save,get,read,removeByApplicationId,getTypeSummary,findByNumber};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-result-link.js':'v1.3.17'});
})();
