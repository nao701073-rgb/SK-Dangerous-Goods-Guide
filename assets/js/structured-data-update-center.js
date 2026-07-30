(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  if(!$('structuredUpdateCenter')) return;
  const STORAGE_KEY='iss-structured-update-history-v1';
  const ACTIVE_KEY='iss-structured-data-overrides-v1';
  const STAGED_KEY='iss-structured-data-staged-v1';
  const PREVIEW_KEY='iss-structured-data-preview-v1';
  const REVIEW_KEY='iss-structured-data-preview-reviews-v1';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const types=[
    {id:'dangerous-goods-basic',label:'危険物基本データ',file:'01_危険物基本データ更新ひな型.csv',key:'unNumber',required:['unNumber','properShippingName','class'],global:'UN_DATABASE',mode:'array'},
    {id:'label-master',label:'標札マスター',file:'02_標札マスター更新ひな型.csv',key:'id',required:['id','class','nameJa','file','widthMm','heightMm'],global:'LABEL_MASTER',mode:'labels'},
    {id:'packaging-requirements',label:'包装要件',file:'03_包装要件更新ひな型.csv',key:'code',required:['code','category','titleJa','source'],global:'STRUCTURED_PACKAGING_REQUIREMENTS',mode:'array'},
    {id:'special-provisions',label:'特別規定',file:'04_特別規定更新ひな型.csv',key:'code',required:['code','requirementJa','source'],global:'STRUCTURED_SPECIAL_PROVISIONS',mode:'array'},
    {id:'article-links',label:'条文リンク',file:'05_条文リンク更新ひな型.csv',key:'id',required:['id','regulationId','article','titleJa'],global:'STRUCTURED_ARTICLE_LINKS',mode:'array'},
    {id:'domestic-imdg-cross-reference',label:'国内法令・IMDG対照',file:'06_国内法令_IMDG対照更新ひな型.csv',key:'id',required:['id','domesticRegulationId','imdgEdition','imdgSection'],global:'STRUCTURED_DOMESTIC_IMDG_CROSS_REFERENCE',mode:'array'},
    {id:'regulation-registry',label:'法令登録情報',file:'07_法令登録情報更新ひな型.csv',key:'regulationId',required:['regulationId','officialName','shortName','category'],global:'REGULATION_REGISTRY',mode:'array'},
    {id:'marking-rules',label:'品名・国連番号表示基準',file:'08_品名_国連番号表示基準更新ひな型.csv',key:'id',required:['id','minimumHeightMm','appliesTo','source'],global:'STRUCTURED_MARKING_RULES',mode:'array'}
  ];
  let validated=null;
  const typeMap=new Map(types.map(x=>[x.id,x]));
  $('structuredDatasetType').innerHTML='<option value="">選択してください</option>'+types.map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');
  $('structuredTemplateGrid').innerHTML=types.map(x=>`<article><div><strong>${esc(x.label)}</strong><small>識別キー：${esc(x.key)}</small></div><a class="secondary-button" download href="../templates/structured-data/${encodeURIComponent(x.file)}">CSVひな型</a></article>`).join('')+`<article><div><strong>記入要領</strong><small>文字コード・日付・複数値の入力規則</small></div><a class="secondary-button" download href="../templates/structured-data/README_%E8%A8%98%E5%85%A5%E8%A6%81%E9%A0%98.txt">記入要領</a></article>`;

  function parseCsv(text){
    const rows=[]; let row=[],cell='',quote=false;
    const src=String(text||'').replace(/^\uFEFF/,'');
    for(let i=0;i<src.length;i++){
      const c=src[i],n=src[i+1];
      if(c==='"'&&quote&&n==='"'){cell+='"';i++;continue;}
      if(c==='"'){quote=!quote;continue;}
      if(c===','&&!quote){row.push(cell);cell='';continue;}
      if((c==='\n'||c==='\r')&&!quote){if(c==='\r'&&n==='\n')i++;row.push(cell);cell='';if(row.some(v=>v!==''))rows.push(row);row=[];continue;}
      cell+=c;
    }
    row.push(cell); if(row.some(v=>v!==''))rows.push(row);
    if(!rows.length) return [];
    const headers=rows.shift().map(x=>x.trim());
    return rows.map((values,index)=>Object.fromEntries(headers.map((h,i)=>[h,normalize(values[i]??'')]))).map((r,i)=>({...r,__line:i+2}));
  }
  function normalize(value){
    const s=String(value??'').trim();
    if(s==='true') return true; if(s==='false') return false;
    if(/^\d+(\.\d+)?$/.test(s)&&!/^0\d+/.test(s)) return Number(s);
    if(s.includes('|')) return s.split('|').map(v=>v.trim()).filter(Boolean);
    return s;
  }
  async function parseFile(file){
    if(!file) throw new Error('更新用CSV／JSONを選択してください。');
    if(file.name.toLowerCase().endsWith('.json')){
      const parsed=JSON.parse(await file.text());
      const records=Array.isArray(parsed)?parsed:Array.isArray(parsed.records)?parsed.records:null;
      if(!records) throw new Error('JSONは配列、またはrecords配列を持つ形式にしてください。');
      return {format:'json',records};
    }
    if(!file.name.toLowerCase().endsWith('.csv')) throw new Error('CSVまたはJSONを選択してください。');
    return {format:'csv',records:parseCsv(await file.text())};
  }
  function history(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'[]')}catch{return[]}}
  function renderHistory(){
    const rows=history();
    $('structuredHistoryRows').innerHTML=rows.length?rows.map(r=>`<tr><td>${new Date(r.at).toLocaleString('ja-JP')}</td><td>${esc(r.label)}</td><td>${esc(r.edition)}</td><td>${r.count}</td><td><span class="revision-status">${esc(r.status)}</span></td><td>${esc(r.preparedBy)}</td></tr>`).join(''):'<tr><td colspan="6">更新履歴はありません。</td></tr>';
  }
  function showResult(ok,title,items){
    const el=$('structuredValidationResult');el.className=`validation-result ${ok?'is-ok':'is-error'}`;
    el.innerHTML=`<h3>${esc(title)}</h3><ul>${items.map(x=>`<li>${x.ok?'✓':'×'} ${esc(x.text)}</li>`).join('')}</ul>`;
  }
  function preview(records){
    const sample=records.slice(0,5); const keys=[...new Set(sample.flatMap(r=>Object.keys(r).filter(k=>k!=='__line')))].slice(0,8);
    $('structuredPreview').innerHTML=`<h3>先頭${sample.length}件の確認</h3><div class="table-wrap"><table><thead><tr>${keys.map(k=>`<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${sample.map(r=>`<tr>${keys.map(k=>`<td>${esc(Array.isArray(r[k])?r[k].join(' | '):r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  $('validateStructuredDataset').addEventListener('click',async()=>{
    validated=null;$('stageStructuredDataset').disabled=true;$('applyStructuredDataset').disabled=true;
    const type=typeMap.get($('structuredDatasetType').value); const file=$('structuredDatasetFile').files[0];
    const checks=[];
    try{
      if(!type) throw new Error('更新対象を選択してください。');
      const parsed=await parseFile(file); const records=parsed.records;
      checks.push({ok:records.length>0,text:`レコード件数：${records.length}件`});
      const columns=new Set(records.flatMap(r=>Object.keys(r)));
      type.required.forEach(c=>checks.push({ok:columns.has(c),text:`必須列 ${c}` }));
      const missing=records.filter(r=>type.required.some(c=>r[c]===''||r[c]==null));
      checks.push({ok:missing.length===0,text:`必須値の欠落：${missing.length}件`});
      const seen=new Set(),dup=[];
      records.forEach(r=>{const v=String(r[type.key]??'');if(v&&seen.has(v))dup.push(v);seen.add(v)});
      checks.push({ok:dup.length===0,text:`識別キー重複：${[...new Set(dup)].length}件`});
      if(type.id==='dangerous-goods-basic'){
        const invalid=records.filter(r=>!/^\d{4}$/.test(String(r.unNumber??'').padStart(4,'0')));
        checks.push({ok:invalid.length===0,text:`国連番号形式エラー：${invalid.length}件`});
      }
      const ok=checks.every(x=>x.ok);
      showResult(ok,ok?'検証に合格しました':'修正が必要です',checks);
      preview(records);
      if(ok){validated={type,records,format:parsed.format,fileName:file.name};$('stageStructuredDataset').disabled=false;}
    }catch(e){showResult(false,'検証できません',[{ok:false,text:e.message}]);$('structuredPreview').innerHTML='';}
  });
  $('stageStructuredDataset').addEventListener('click',()=>{
    if(!validated) return;
    const packageData={...validated,edition:$('structuredEdition').value.trim(),effectiveFrom:$('structuredEffectiveFrom').value,preparedBy:$('structuredPreparedBy').value.trim(),summary:$('structuredSummary').value.trim(),stagedAt:new Date().toISOString()};
    localStorage.setItem(STAGED_KEY,JSON.stringify(packageData));
    let preview={};try{preview=JSON.parse(localStorage.getItem(PREVIEW_KEY)||'{}')}catch{}
    preview[validated.type.id]={records:validated.records,edition:packageData.edition,effectiveFrom:packageData.effectiveFrom,preparedBy:packageData.preparedBy,summary:packageData.summary,stagedAt:packageData.stagedAt,global:validated.type.global,mode:validated.type.mode,fileName:validated.fileName};
    localStorage.setItem(PREVIEW_KEY,JSON.stringify(preview));
    let reviews={};try{reviews=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')}catch{}
    reviews[validated.type.id]={status:'pending',reviewedAt:null,reviewedBy:null,note:''};
    localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews));
    $('applyStructuredDataset').disabled=true;
    showResult(true,'更新候補を保存しました',[{ok:true,text:'改正検証者アカウントでは、この更新候補を反映したシステムを先行確認できます。検証合格までは本番反映できません。'}]);
  });
  function stagedReviewPassed(){
    const raw=localStorage.getItem(STAGED_KEY); if(!raw) return false;
    const staged=JSON.parse(raw); const id=staged.type.id||staged.type;
    let reviews={};try{reviews=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')}catch{}
    return reviews[id]?.status==='passed';
  }
  $('structuredOriginalChecked').addEventListener('change',()=>{$('applyStructuredDataset').disabled=!$('structuredOriginalChecked').checked||!localStorage.getItem(STAGED_KEY)||!stagedReviewPassed()});
  $('applyStructuredDataset').addEventListener('click',()=>{
    const raw=localStorage.getItem(STAGED_KEY); if(!raw) return;
    const staged=JSON.parse(raw); const type=typeMap.get(staged.type.id||staged.type);
    if(!type) return alert('更新対象を特定できません。');
    if(!stagedReviewPassed()) return alert('改正検証者による検証合格が記録されていません。先に改正検証を完了してください。');
    if(!confirm(`${type.label} ${staged.records.length}件をこの端末の承認済みデータとして反映します。よろしいですか？`)) return;
    let overrides={};try{overrides=JSON.parse(localStorage.getItem(ACTIVE_KEY)||'{}')}catch{}
    overrides[type.id]={records:staged.records,edition:staged.edition,effectiveFrom:staged.effectiveFrom,preparedBy:staged.preparedBy,summary:staged.summary,appliedAt:new Date().toISOString(),global:type.global,mode:type.mode};
    localStorage.setItem(ACTIVE_KEY,JSON.stringify(overrides));
    let preview={};try{preview=JSON.parse(localStorage.getItem(PREVIEW_KEY)||'{}')}catch{};delete preview[type.id];localStorage.setItem(PREVIEW_KEY,JSON.stringify(preview));
    let reviews={};try{reviews=JSON.parse(localStorage.getItem(REVIEW_KEY)||'{}')}catch{};delete reviews[type.id];localStorage.setItem(REVIEW_KEY,JSON.stringify(reviews));
    const h=history();h.unshift({at:new Date().toISOString(),label:type.label,edition:staged.edition||'未入力',count:staged.records.length,status:'端末へ反映済み',preparedBy:staged.preparedBy||'未入力'});localStorage.setItem(STORAGE_KEY,JSON.stringify(h.slice(0,100)));
    localStorage.removeItem(STAGED_KEY);$('applyStructuredDataset').disabled=true;renderHistory();
    showResult(true,'承認済みデータを反映しました',[{ok:true,text:'次回の画面読込から反映されます。共有運用ではサーバー版の承認・公開処理を使用してください。'}]);
  });
  renderHistory();
})();
