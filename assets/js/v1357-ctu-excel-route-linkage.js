(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const bridge={file:null,fields:{},routeEstimate:null,lastAppliedAt:''};
  const text=v=>String(v??'').replace(/\u0000/g,'').replace(/[\r\n]+/g,' ').replace(/[\s　]+/g,' ').trim();
  const key=v=>text(v).toLowerCase().replace(/[\s　:：()（）\[\]【】._\-\/・]/g,'');
  const hasValue=v=>v!==null&&v!==undefined&&text(v)!=='';
  const patterns={
    loading:[/^船積地$/,/^船積港$/,/^積出地$/,/^積出港$/,/^積港$/,/^積地$/,/^portofloading$/,/^loadingport$/,/^portfrom$/,/^pol$/],
    discharge:[/^陸揚地$/,/^陸揚港$/,/^揚地$/,/^揚港$/,/^仕向地$/,/^仕向港$/,/^portofdischarge$/,/^dischargeport$/,/^portto$/,/^pod$/],
    departureDate:[/^発航予定年月日$/,/^発航予定日$/,/^出港予定年月日$/,/^出港予定日$/,/^出航予定年月日$/,/^出航予定日$/,/^船積予定年月日$/,/^船積予定日$/,/^etd$/,/^estimatedtimeofdeparture$/,/^departuredate$/,/^sailingdate$/,/^shipmentdate$/],
    departureMonth:[/^想定出港月$/,/^出港月$/,/^出航月$/,/^発航月$/,/^departuremonth$/]
  };

  function matchLabel(value,list){const k=key(value);return Boolean(k&&list.some(rx=>rx.test(k)))}
  function workbookRows(workbook){
    const rows=[];
    for(const sheet of workbook.SheetNames||[]){
      const ws=workbook.Sheets?.[sheet];if(!ws)continue;
      const matrix=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:true,blankrows:false});
      matrix.forEach((cells,index)=>rows.push({sheet,row:index+1,cells:Array.isArray(cells)?cells:[]}));
    }
    return rows;
  }
  function candidateValue(rows,r,c,labels){
    const row=rows[r];if(!row)return null;
    // Many SK forms place the value two or more columns to the right of a merged label.
    for(let j=c+1;j<Math.min(row.cells.length,c+12);j++){
      const v=row.cells[j];if(!hasValue(v))continue;
      if(!matchLabel(v,labels))return v;
    }
    // Also support values below a label / merged block, including a small horizontal offset.
    for(let rr=r+1;rr<Math.min(rows.length,r+5);rr++){
      if(rows[rr].sheet!==row.sheet)break;
      for(let cc=Math.max(0,c-2);cc<=Math.min(rows[rr].cells.length-1,c+4);cc++){
        const v=rows[rr].cells[cc];if(!hasValue(v))continue;
        if(!matchLabel(v,labels))return v;
      }
    }
    return null;
  }
  function findLabeled(rows,labels){
    for(let r=0;r<rows.length;r++){
      const row=rows[r];
      for(let c=0;c<row.cells.length;c++){
        if(!matchLabel(row.cells[c],labels))continue;
        const value=candidateValue(rows,r,c,labels);
        if(hasValue(value))return{value,sheet:row.sheet,row:row.row,column:c+1};
      }
    }
    return null;
  }
  function excelSerialMonth(n){
    if(!Number.isFinite(n)||n<1000)return null;
    const ms=Date.UTC(1899,11,30)+Math.floor(n)*86400000;
    const d=new Date(ms);return Number.isFinite(d.getTime())?d.getUTCMonth()+1:null;
  }
  function monthFromValue(v){
    if(v instanceof Date&&!Number.isNaN(v.getTime()))return v.getMonth()+1;
    if(typeof v==='number'){
      if(v>=1&&v<=12&&Number.isInteger(v))return v;
      return excelSerialMonth(v);
    }
    const s=text(v);if(!s)return null;
    const jp=s.match(/(?:^|\D)(1[0-2]|0?[1-9])\s*月/);if(jp)return Number(jp[1]);
    const ymd=s.match(/(?:19|20)\d{2}\s*[\/\.\-年]\s*(1[0-2]|0?[1-9])(?:\s*[\/\.\-月]|\s*月)/);if(ymd)return Number(ymd[1]);
    const mdy=s.match(/^(1[0-2]|0?[1-9])\s*[\/\.\-]\s*\d{1,2}\s*[\/\.\-]\s*(?:19|20)?\d{2}$/);if(mdy)return Number(mdy[1]);
    const n=Number(s);if(Number.isFinite(n))return n>=1&&n<=12?Math.trunc(n):excelSerialMonth(n);
    const parsed=Date.parse(s);if(Number.isFinite(parsed))return new Date(parsed).getMonth()+1;
    return null;
  }
  function extractFromRows(rows){
    const loading=findLabeled(rows,patterns.loading);
    const discharge=findLabeled(rows,patterns.discharge);
    const monthDirect=findLabeled(rows,patterns.departureMonth);
    const departure=findLabeled(rows,patterns.departureDate);
    return{
      loadingPort:text(loading?.value),
      dischargePort:text(discharge?.value),
      departureMonth:monthFromValue(monthDirect?.value)??monthFromValue(departure?.value),
      sources:{loading,discharge,departureMonth:monthDirect,departureDate:departure}
    };
  }
  function extractFromWorkbook(workbook){return extractFromRows(workbookRows(workbook))}
  async function readWorkbook(file){
    if(!file||!window.XLSX)return null;
    const buffer=await file.arrayBuffer();let last=null;
    try{
      for(const options of [
        {type:'array',cellDates:true,cellText:true,codepage:932},
        {type:'array',cellDates:true,cellText:true},
        {type:'array',cellDates:true,cellText:true,codepage:65001}
      ]){
        try{return window.XLSX.read(buffer,options)}catch(error){last=error}
      }
      throw last||new Error('Excelを解析できませんでした。');
    }finally{
      try{new Uint8Array(buffer).fill(0)}catch(_e){}
    }
  }
  function setField(id,value){
    const el=$(id);if(!el||value===null||value===undefined||text(value)==='')return false;
    const next=String(value);if(el.value===next)return true;
    el.value=next;
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  }
  function syncCasePorts(fields){
    if(fields.loadingPort)setField('ctuCaseLoadingPort',fields.loadingPort);
    if(fields.dischargePort)setField('ctuCaseDischargePort',fields.dischargePort);
  }
  function applyRouteFromDom(){
    const loading=text($('loadingPort')?.value),discharge=text($('dischargePort')?.value),month=Number($('departureMonth')?.value)||null;
    if(!loading||!discharge)return null;
    let estimate=null;
    try{estimate=window.ISSCTUExcelRoute?.inferRoute?.(loading,discharge,month)||null}catch(_e){}
    // Use the existing button handler as the canonical renderer and transport-coefficient updater.
    $('inferSeaArea')?.click();
    if(estimate){
      const preset=$('transportPreset'),quick=$('quickTransport');
      if(preset&&preset.value!==estimate.area){preset.value=estimate.area;preset.dispatchEvent(new Event('change',{bubbles:true}))}
      if(quick&&quick.value!==estimate.area){quick.value=estimate.area;quick.dispatchEvent(new Event('change',{bubbles:true}))}
      window.applyTransportPreset?.();
      window.updateSummary?.();
      bridge.routeEstimate=estimate;
    }else{
      bridge.routeEstimate=window.ISSCTUExcelRoute?.getState?.()?.routeEstimate||null;
    }
    window.dispatchEvent(new CustomEvent('sk:ctu-route-applied',{detail:{loadingPort:loading,dischargePort:discharge,departureMonth:month,routeEstimate:bridge.routeEstimate}}));
    return bridge.routeEstimate;
  }
  async function enhanceImportedFile(file){
    if(!file||!window.XLSX)return;
    try{
      const workbook=await readWorkbook(file);if(!workbook)return;
      const fields=extractFromWorkbook(workbook);
      bridge.fields=fields;bridge.lastAppliedAt=new Date().toISOString();
      if(fields.loadingPort)setField('loadingPort',fields.loadingPort);
      if(fields.dischargePort)setField('dischargePort',fields.dischargePort);
      if(fields.departureMonth)setField('departureMonth',fields.departureMonth);
      syncCasePorts(fields);
      if(fields.loadingPort&&fields.dischargePort)applyRouteFromDom();
      const status=$('ctuExcelStatus');
      if(status&&(fields.loadingPort||fields.dischargePort||fields.departureMonth)){
        const parts=[];
        if(fields.loadingPort)parts.push(`船積港 ${fields.loadingPort}`);
        if(fields.dischargePort)parts.push(`陸揚港 ${fields.dischargePort}`);
        if(fields.departureMonth)parts.push(`想定出港月 ${fields.departureMonth}月`);
        status.textContent=`Excel申請書を読み込み、${parts.join('、')} を含む取得値を入力欄へ反映しました。原本と照合してください。`;
        status.className='import-status is-ok';
      }
      window.dispatchEvent(new CustomEvent('sk:ctu-excel-route-enhanced',{detail:{fields:{...fields},routeEstimate:bridge.routeEstimate}}));
    }catch(error){
      console.warn('[SKDG v1.3.57] Excel route enhancement skipped:',error);
    }finally{bridge.file=null}
  }
  function patchGetState(){
    const api=window.ISSCTUExcelRoute;if(!api||api.__v1357Patched)return;
    const original=typeof api.getState==='function'?api.getState.bind(api):()=>({});
    api.getState=()=>{
      const base=original()||{};
      const baseFields=base.fields||{};
      return{...base,fields:{...baseFields,...Object.fromEntries(Object.entries(bridge.fields||{}).filter(([k,v])=>k!=='sources'&&v!==null&&v!==''))},routeEstimate:bridge.routeEstimate||base.routeEstimate||null};
    };
    api.__v1357Patched=true;
  }
  function captureFile(event){
    const file=event.target?.files?.[0]||event.dataTransfer?.files?.[0]||null;
    if(file)bridge.file=file;
  }
  function bind(){
    const input=$('ctuExcelFile'),drop=$('ctuExcelDropZone');
    if(input&&!input.dataset.v1357RouteCapture){input.dataset.v1357RouteCapture='1';input.addEventListener('change',captureFile,true)}
    if(drop&&!drop.dataset.v1357RouteCapture){drop.dataset.v1357RouteCapture='1';drop.addEventListener('drop',captureFile,true)}
    patchGetState();
  }
  window.addEventListener('sk:ctu-excel-imported',()=>{
    patchGetState();
    const file=bridge.file;
    if(file)setTimeout(()=>enhanceImportedFile(file),0);
  });
  window.addEventListener('sk:ctu-excel-cleared',()=>{bridge.file=null;bridge.fields={};bridge.routeEstimate=null;bridge.lastAppliedAt=''});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.addEventListener('load',patchGetState,{once:true});
  window.SKCTUExcelRouteV1357={extractFromRows,extractFromWorkbook,monthFromValue,applyRouteFromDom,getState:()=>JSON.parse(JSON.stringify({fields:bridge.fields,routeEstimate:bridge.routeEstimate,lastAppliedAt:bridge.lastAppliedAt}))};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1357-ctu-excel-route-linkage.js':'v1.3.57'});
})();
