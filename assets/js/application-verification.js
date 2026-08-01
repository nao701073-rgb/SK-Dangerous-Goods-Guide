(function(){
  'use strict';
  const $=id=>document.getElementById(id);
  const dropZone=$('dropZone'), input=$('fileInput'), status=$('fileStatus');
  const normalize=s=>String(s??'').replace(/\s+/g,' ').trim();
  const escapeHtml=s=>String(s||'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const romanToPg=s=>{const t=String(s||'').toUpperCase().replace(/\s/g,'');if(/(?:PG|容器等級)?I{3}(?!I)/.test(t))return 'III';if(/(?:PG|容器等級)?II(?!I)/.test(t))return 'II';if(/(?:PG|容器等級)?I(?!I)/.test(t))return 'I';return ''};
  const db=Array.isArray(window.UN_DATABASE)?window.UN_DATABASE:[];
  const profiles=window.DOMESTIC_PACKING_QUANTITY_PROFILES?.profiles||{};
  const densityMaster=window.ARTICLE112_DENSITY_MASTER?.records||{};
  const p200Source=window.DOMESTIC_CODE_PAGE_RANGES?.entries?.P200||null;
  const p200PermitRequiredUns=new Set(['UN1953','UN1954','UN1955','UN1956','UN3156','UN3157','UN3160','UN3161','UN3162','UN3163','UN3303','UN3304','UN3305','UN3306','UN3307','UN3308','UN3309','UN3310']);
  const p200PdfPath='../references/originals/dangerous-goods-notification.pdf';
  function setStatus(text,type){status.textContent=text;status.className='file-status'+(type?' is-'+type:'')}
  function validate(file){if(!file)return false;const ext=(file.name.split('.').pop()||'').toLowerCase();if(!['xls','xlsx'].includes(ext)){setStatus('対応していないファイル形式です。Excel形式（.xls または .xlsx）を選択してください。','error');return false}return true}
  function parseRows(workbook){const all=[];workbook.SheetNames.forEach(name=>{const ws=workbook.Sheets[name];const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});rows.forEach((row,i)=>{const text=normalize(row.join(' '));if(text)all.push({sheet:name,row:i+1,text,cells:row.map(normalize)})})});return all}
  function headerKey(value){return normalize(value).replace(/[\s\n\r　]/g,'').toLowerCase()}
  function findColumn(cells,patterns){
    const keys=cells.map(headerKey);
    for(let i=0;i<keys.length;i++)if(patterns.some(p=>p.test(keys[i])))return i;
    return -1;
  }
  function cleanUn(value){
    const text=normalize(value).toUpperCase().replace(/^UN\s*/,'').replace(/\.0$/,'');
    const m=text.match(/(?:^|\D)(\d{4})(?:\D|$)/);
    return m?'UN'+m[1]:'';
  }
  function extractGoods(rows){
    const result=[];
    const sheets=[...new Set(rows.map(r=>r.sheet))];
    sheets.forEach(sheet=>{
      const sheetRows=rows.filter(r=>r.sheet===sheet);
      let headerPos=-1,cols=null;
      for(let i=0;i<sheetRows.length;i++){
        const cells=sheetRows[i].cells;
        const un=findColumn(cells,[/^国連番号$/,/^un番号$/,/^unnumber$/]);
        const target=findColumn(cells,[/^検査対象$/,/^対象$/]);
        if(un>=0&&target>=0){
          cols={
            un,
            target,
            name:findColumn(cells,[/^品名$/]),
            chemical:findColumn(cells,[/^化学品名$/]),
            classNo:findColumn(cells,[/^等級$/]),
            subsidiary:findColumn(cells,[/^副次$/,/^副次危険性$/]),
            pg:findColumn(cells,[/^容器等級$/]),
            limited:findColumn(cells,[/^少量危険物$/]),
            container:findColumn(cells,[/^容器記号$/,/^容器コード$/]),
            count:findColumn(cells,[/^個数$/]),
            net:findColumn(cells,[/^n\/w\(kg\)$/,/^nw\(kg\)$/,/^正味質量/]),
            gross:findColumn(cells,[/^g\/w\(kg\)$/,/^gw\(kg\)$/,/^総質量/]),
            density:findColumn(cells,[/^密度$/,/^密度\(kg\/l\)$/,/^比重$/]),
            densitySource:findColumn(cells,[/^密度出典$/,/^比重出典$/,/^出典$/])
          };
          headerPos=i;break;
        }
      }
      if(headerPos<0||!cols)return;
      for(let i=headerPos+1;i<sheetRows.length;i++){
        const entry=sheetRows[i],c=entry.cells;
        const target=normalize(c[cols.target]);
        if(!target)continue;
        // 「非対象」には「対象」の文字が含まれるため完全一致で判定する。
        if(target!=='対象')continue;
        const un=cleanUn(c[cols.un]);
        if(!un)continue;
        const pg=normalizePg(c[cols.pg]);
        const container=normalize(c[cols.container]).toUpperCase();
        const net=normalize(c[cols.net]);
        const quantity=net?`${net} kg`:'';
        const name=normalize(c[cols.name]);
        const chemical=normalize(c[cols.chemical]);
        result.push({
          un,
          source:[name,chemical].filter(Boolean).join('／')||entry.text,
          name,
          chemical,
          classNo:normalize(c[cols.classNo]),
          subsidiary:normalize(c[cols.subsidiary]),
          pg,
          container,
          count:normalize(c[cols.count]),
          netWeight:net,
          grossWeight:normalize(c[cols.gross]),
          density:cols.density>=0?normalize(c[cols.density]):'',
          densitySource:cols.densitySource>=0?normalize(c[cols.densitySource]):'',
          quantity,
          limited:/^(?:○|〇|有|対象|yes)$/i.test(normalize(c[cols.limited])),
          inspectionTarget:true,
          sheet:entry.sheet,
          row:entry.row
        });
      }
    });
    return result;
  }
  const score=g=>(g.pg?1:0)+(g.container?1:0)+(g.quantity?1:0)+(g.limited?1:0);
  function findRecord(g){const no=g.un.replace(/^UN/,'');const candidates=db.filter(x=>x.unNumber===no);return candidates.find(x=>normalizePg(x.packingGroup)===g.pg)||candidates[0]||null}
  function normalizePg(v){return romanToPg(String(v||'').replace('Ⅰ','I').replace('Ⅱ','II').replace('Ⅲ','III'))}
  function containerTokens(text){return String(text||'').split(/[・,、\s]+/).map(x=>x.replace(/（.*?）/g,'').trim()).filter(Boolean)}
  function rowMatches(row,code){if(!code)return false;const text=String(row.container||'');return containerTokens(text).includes(code)||new RegExp('(^|[^A-Z0-9])'+code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'([^A-Z0-9]|$)').test(text)}
  function physicalState(g,record){
    const classText=normalize(g.classNo||record?.class);
    const haystack=[record?.classification,record?.item,record?.properShippingNameJa,record?.properShippingName,record?.rawText,g.name,g.chemical].map(normalize).join(' ').toUpperCase();
    if(/^2(?:\.|$)/.test(classText)||/(高圧ガス|圧縮ガス|液化ガス|溶解ガス|冷却液化ガス|GAS|AEROSOL)/i.test(haystack))return 'gas';
    if(/(液体|溶液|LIQUID|SOLUTION)/i.test(haystack)||/^3(?:\.|$)/.test(classText)||/引火性液体/.test(haystack))return 'liquid';
    return 'solid';
  }
  function numberValue(value){
    const m=String(value??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);
    return m?Number(m[0]):NaN;
  }
  function isNosRecord(record){
    const text=[record?.properShippingNameJa,record?.properShippingName,record?.rawText].map(normalize).join(' ').toUpperCase();
    return /N\.?O\.?S\.?|その他(?:の)?危険物|他に品名が明示/.test(text);
  }
  function densityInfo(g,record){
    const masterEntry=!isNosRecord(record)?densityMaster[g.un]:null;
    const candidates=[
      {value:g.density,source:g.densitySource||'申請書',confidence:'high'},
      {value:record?.densityKgL,source:record?.densitySource||'危険物マスター',confidence:'medium'},
      {value:record?.density,source:record?.densitySource||'危険物マスター',confidence:'medium'},
      {value:record?.specificGravity,source:record?.specificGravitySource||record?.densitySource||'危険物マスター',confidence:'medium'},
      {value:masterEntry?.densityKgL,source:masterEntry?.source||'概算密度マスター',confidence:masterEntry?.confidence||'low'}
    ];
    for(const c of candidates){
      const n=numberValue(c.value);
      if(Number.isFinite(n)&&n>0)return {value:n,source:c.source||'危険物マスター',confidence:c.confidence||'medium'};
    }
    return null;
  }
  function formatNumber(n){
    return Number(n.toFixed(3)).toLocaleString('ja-JP',{maximumFractionDigits:3});
  }
  function applicationQuantity(g,record){
    const raw=normalize(g.netWeight);
    const totalMass=numberValue(raw);
    const count=numberValue(g.count);
    const state=physicalState(g,record);
    if(!raw||!Number.isFinite(totalMass))return {html:'要確認',unit:'',state,value:NaN};
    if(!Number.isFinite(count)||count<=0){
      return {html:`<strong>申請総質量 ${escapeHtml(raw)} kg</strong><br><span class="status-chip status-chip--review">1容器当たり数量 要確認</span><br><small>個数を取得できないため、許容容量・許容質量との自動比較は行いません。</small>`,unit:'',state,value:NaN,totalMass,count:NaN};
    }
    const massPerPackage=totalMass/count;
    const grossTotal=numberValue(g.grossWeight);
    const grossPerPackage=Number.isFinite(grossTotal)?grossTotal/count:NaN;
    const grossPerPackageHtml=Number.isFinite(grossTotal)?`<br><strong>1容器当たり総質量 ${formatNumber(grossPerPackage)} kg</strong>`:'';
    const grossTotalHtml=Number.isFinite(grossTotal)?`<br><strong>申請総質量（G/W） ${formatNumber(grossTotal)} kg</strong>`:'';
    const common=`<strong>個数 ${formatNumber(count)}個</strong><br><strong>1容器当たり正味質量 ${formatNumber(massPerPackage)} kg</strong>${grossPerPackageHtml}<br><strong>申請総正味質量（N/W） ${escapeHtml(raw)} kg</strong>${grossTotalHtml}`;
    if(state==='liquid'||state==='gas'){
      return {html:common,unit:'',state,value:NaN,totalMass,count,massPerPackage,grossTotal,grossPerPackage};
    }
    return {html:common,unit:'kg',state,value:massPerPackage,totalMass,count,massPerPackage};
  }
  function limitUnit(text){
    const t=String(text||'').toUpperCase();
    if(/L(?:\b|$)/.test(t))return 'L';
    if(/KG/.test(t))return 'kg';
    return '';
  }
  function p200ReferenceBlock(g,record,instruction){
    if(instruction!=='P200')return '';
    const permitRequired=p200PermitRequiredUns.has(g.un);
    const pageStart=p200Source?.pageStart||298;
    const pageEnd=p200Source?.pageEnd||301;
    const pageLabel=pageStart===pageEnd?String(pageStart):`${pageStart}-${pageEnd}`;
    const capacityHtml=permitRequired
      ? `<div class="p200-permit"><strong>地方運輸局長の許可が必要です。</strong><br>危告示別表第1 P200の当該欄は「x」です。社内既存システムの許可証データベースに登録された許可内容から、使用容器と許容容量を確認してください。</div>`
      : `<ul><li>溶接容器：<strong>1,000 L</strong></li><li>継目なし容器：<strong>3,000 L</strong></li></ul><small>危告示別表第1 P200の「許容容量又は許容質量」欄に基づく最大値です。実際に使用できる容器、充てん定数、最大圧力その他の条件は、当該国連番号の行と容器の許可内容を確認してください。</small>`;
    return `<div class="limit-block p200-reference-block"><span>危告示別表第1 P200</span>${capacityHtml}<br><a class="p200-reference-link" href="${p200PdfPath}#page=${pageStart}" target="_blank" rel="noopener">P200原文を開く（PDF ${pageLabel}頁）</a></div>`;
  }

  function packingResult(g,q){
    const record=findRecord(g);
    if(!record)return {html:'<span class="status-chip status-chip--review">UNデータなし</span>',status:'要確認'};

    const instruction=normalize(record.smallPackingInstruction).match(/P\d{3}/)?.[0]||'';
    const profile=profiles[instruction];
    const pg=g.pg||normalizePg(record.packingGroup);
    const codes=g.container?g.container.split(/,\s*/).filter(Boolean):[];
    const combination=codes.some(c=>/^4[A-Z0-9]+$/.test(c));
    const state=physicalState(g,record);
    const blocks=[];
    const p200Block=p200ReferenceBlock(g,record,instruction);
    if(p200Block)blocks.push(p200Block);

    // 少量危険物は、申請書上の4G表記をUN容器の性能表示として扱わない。
    if(g.limited){
      const limitedInner=(record.limitedQuantity&&record.limitedQuantity!=='-')
        ?escapeHtml(record.limitedQuantity)
        :'要確認';

      let grossComparison='';
      if(Number.isFinite(q.grossPerPackage)){
        const ok=q.grossPerPackage<=30;
        grossComparison=`<div class="limited-gross-check">
          <strong>外装容器1個当たり総質量：${formatNumber(q.grossPerPackage)} kg</strong><br>
          <strong>上限：30 kg</strong><br>
          <span class="status-chip ${ok?'status-chip--ok':'status-chip--danger'}">${ok?'30 kg以下':'30 kg超過'}</span>
        </div>`;
      }else{
        grossComparison=`<div class="limited-gross-check"><strong>外装容器1個当たり総質量：要確認</strong><br><strong>上限：30 kg</strong></div>`;
      }

      blocks.push(`<div class="limit-block limited-quantity-block">
        <span>少量危険物</span>
        <ul>
          <li>内装容器1個当たりの上限：<strong>${limitedInner}</strong></li>
          <li>外装容器1個当たりの総質量上限：<strong>30 kg</strong></li>
        </ul>
        ${grossComparison}
        <small>
          少量危険物では、申請書上の「4G」をUN容器の性能表示とはみなしません。
          通常カートン等を含む実際の外装容器、内装容器の種類・容量・個数を現場で確認してください。
        </small>
      </div>`);

      return {html:blocks.join(''),status:'現場確認'};
    }

    // 通常危険物で4G/4GVを使用する場合は、現物の容器性能表示を確認する。
    if(combination){
      const grossPerPackage=Number.isFinite(q.grossPerPackage)?q.grossPerPackage:'';
      blocks.push(`<div class="limit-block combination-package-block">
        <span>4G／4GV 組合せ容器</span>
        <ul>
          <li>申請容器コード：<strong>${escapeHtml(codes.join(', '))}</strong></li>
          <li>1外装容器当たり総質量：<strong>${Number.isFinite(q.grossPerPackage)?formatNumber(q.grossPerPackage)+' kg':'要確認'}</strong></li>
        </ul>
        <label class="field-label">現物表示の許容総質量（kg）
          <input class="package-marking-limit" type="number" min="0" step="0.1"
            data-gross="${Number.isFinite(q.grossPerPackage)?q.grossPerPackage:''}"
            placeholder="4G/4GVの容器性能表示を入力">
        </label>
        <div class="package-marking-result">容器のUN表示・4GV表示・許容総質量を現場で確認してください。</div>
        <small>
          通常危険物の4G／4GVでは、一律の固定値を表示しません。
          容器本体に表示された許容総質量、性能等級、内装容器条件、緩衝材・吸収材を確認してください。
        </small>
      </div>`);

      if(profile&&profile.innerRows?.length){
        blocks.push(`<div class="limit-block">
          <span>内装容器は現場確認</span>
          <ul>${profile.innerRows.map(r=>`<li>${escapeHtml(r.container)}：<strong>${escapeHtml(r.limit)}</strong></li>`).join('')}</ul>
          <small>4GVの場合も、実際の内装容器、容量・質量、個数、緩衝材・吸収材を現場で確認してください。</small>
        </div>`);
      }
      return {html:blocks.join(''),status:'現場確認'};
    }

    // 単一容器・IBC等は、危険物の性状に応じて容量または質量を表示する。
    if(profile){
      const limits=[];
      codes.forEach(code=>{
        const matches=profile.outerRows.filter(r=>rowMatches(r,code));
        if(!matches.length){limits.push(`<li>${escapeHtml(code)}：個別照合が必要</li>`);return}
        const valued=matches.map(r=>({row:r,value:r[pg]||'要確認',unit:limitUnit(r[pg])}));
        let selected=valued;
        if(state==='liquid'){
          const litres=valued.filter(x=>x.unit==='L');
          if(litres.length)selected=litres;
        }else if(state==='solid'){
          const kilos=valued.filter(x=>x.unit==='kg');
          if(kilos.length)selected=kilos;
        }
        const seen=new Set();
        selected.forEach(x=>{
          const key=String(x.value);
          if(seen.has(key))return;
          seen.add(key);
          limits.push(`<li>${escapeHtml(code)}：<strong>${escapeHtml(x.value)}</strong></li>`);
        });
      });
      if(limits.length){
        blocks.push(`<div class="limit-block"><span>許容容量・許容質量</span><ul>${limits.join('')}</ul></div>`);
      }
    }else if(instruction!=='P200'){
      blocks.push('<div>許容容量・許容質量の個別確認が必要です。</div>');
    }
    return {html:blocks.join(''),status:'確認'};
  }

  function render(file,rows,goods){
    const summarySection=$('summarySection');
    if(summarySection)summarySection.hidden=false;
    $('summaryGrid').innerHTML=`<div class="summary-item"><span>ファイル</span><strong>${escapeHtml(file.name)}</strong></div><div class="summary-item"><span>シート数</span><strong>${new Set(rows.map(r=>r.sheet)).size}</strong></div><div class="summary-item"><span>抽出国連番号件数</span><strong>${goods.length}</strong></div><div class="summary-item"><span>法令接続</span><strong>${db.length?'接続済み':'未接続'}</strong></div>`;
    $('goodsBody').innerHTML=goods.length?goods.map((g,i)=>{const record=findRecord(g);const q=applicationQuantity(g,record);const r=packingResult(g,q);return `<tr><td>${i+1}</td><td><strong>${g.un}</strong><br><small>${escapeHtml(g.sheet)} ${g.row}行</small></td><td>${escapeHtml(g.source)}</td><td>${g.pg||'ー'}</td><td>${g.container||'内装・外装容器とも要確認'}</td><td>${q.html}${g.limited?'<br><span class="status-chip">少量危険物</span>':''}</td><td>${r.html}</td></tr>`}).join(''):'<tr><td colspan="7">国連番号を抽出できませんでした。申請書の様式または記載内容を確認してください。</td></tr>';
    const rawText=$('rawText');
    if(rawText)rawText.textContent=rows.map(r=>`[${r.sheet} ${r.row}行] ${r.text}`).join('\n');
    const resultPayload={fileName:file.name,checkedAt:new Date().toISOString(),goods:goods.map(g=>{const record=findRecord(g);const q=applicationQuantity(g,record);const r=packingResult(g,q);return {un:g.un,name:g.source,packingGroup:g.pg,container:g.container,count:g.count,netWeight:g.netWeight,grossWeight:g.grossWeight,limited:g.limited,allowedQuantityOrMass:r.status}})};
    window.dispatchEvent(new CustomEvent('iss:application-verification-result',{detail:resultPayload}));
  }
  function arrayBufferToBinary(buffer){
    const bytes=new Uint8Array(buffer);let out='';const chunk=0x8000;
    for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode.apply(null,bytes.subarray(i,i+chunk));
    return out;
  }
  function readWorkbookWithFallback(buffer,fileName){
    const attempts=[
      ()=>XLSX.read(new Uint8Array(buffer),{type:'array',cellDates:true,codepage:932}),
      ()=>XLSX.read(buffer,{type:'array',cellDates:true,codepage:932}),
      ()=>XLSX.read(arrayBufferToBinary(buffer),{type:'binary',cellDates:true,codepage:932})
    ];
    let lastError=null;
    for(const attempt of attempts){
      try{const wb=attempt();if(wb&&Array.isArray(wb.SheetNames)&&wb.SheetNames.length)return wb;}catch(error){lastError=error;console.warn('Excel read attempt failed',fileName,error);}
    }
    throw lastError||new Error('ワークブックを読み取れませんでした。');
  }
  async function handle(file){
    if(!validate(file))return;
    if(typeof XLSX==='undefined'){
      setStatus('Excel解析機能を読み込めませんでした。ページを再読み込みしてから、もう一度お試しください。','error');
      return;
    }
    setStatus(`${file.name} を解析しています…`);
    try{
      const data=await file.arrayBuffer();
      const wb=readWorkbookWithFallback(data,file.name);
      const rows=parseRows(wb);
      if(!rows.length)throw new Error('申請書内の文字情報を読み取れませんでした。');
      const goods=extractGoods(rows);
      render(file,rows,goods);
      setStatus(`${file.name} を読み込み、既存の国内法令データと照合しました。${goods.length}件の国連番号を抽出しました。`,'success');
    }catch(e){
      console.error(e);
      const detail=(e&&e.message)?`（${e.message}）`:'';
      setStatus(`申請書を読み取れませんでした${detail}。旧形式の .xls も含めて複数の読み込み方式を試しました。ファイルをExcelで開ける場合は、内容を変更せず保存し直してから再度お試しください。`,'error');
    }
  }
  ['dragenter','dragover'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.add('is-dragover')}));['dragleave','drop'].forEach(ev=>dropZone.addEventListener(ev,e=>{e.preventDefault();dropZone.classList.remove('is-dragover')}));dropZone.addEventListener('drop',e=>handle(e.dataTransfer.files[0]));dropZone.addEventListener('click',e=>{if(e.target.id!=='selectFileButton')input.click()});$('selectFileButton').addEventListener('click',e=>{e.stopPropagation();input.click()});dropZone.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}});input.addEventListener('change',()=>handle(input.files[0]));$('clearButton').addEventListener('click',()=>{input.value='';const summarySection=$('summarySection');if(summarySection)summarySection.hidden=true;const rawSection=$('rawSection');if(rawSection)rawSection.hidden=true;setStatus('申請書が選択されていません。');window.scrollTo({top:0,behavior:'smooth'})});

  document.addEventListener('input',e=>{
    if(!e.target.classList.contains('package-marking-limit'))return;
    const input=e.target;
    const result=input.closest('.combination-package-block')?.querySelector('.package-marking-result');
    if(!result)return;
    const limit=Number(input.value);
    const gross=Number(input.dataset.gross);
    if(!Number.isFinite(limit)||limit<=0){
      result.textContent='容器のUN表示・4GV表示・許容総質量を現場で確認してください。';
      result.className='package-marking-result';
      return;
    }
    if(!Number.isFinite(gross)){
      result.textContent=`許容総質量 ${formatNumber(limit)} kgを入力しました。申請書から1外装容器当たり総質量を取得できないため、現場で比較してください。`;
      result.className='package-marking-result status-review';
      return;
    }
    const ok=gross<=limit;
    result.textContent=`1外装容器当たり総質量 ${formatNumber(gross)} kg ／ 現物表示上限 ${formatNumber(limit)} kg：${ok?'範囲内':'超過'}`;
    result.className='package-marking-result '+(ok?'status-ok':'status-danger');
  });
})();

(function(){
  'use strict';
  const $=id=>document.getElementById(id); let latest=null;
  window.addEventListener('iss:application-verification-result',e=>{latest=e.detail; const sec=$('verificationRegistrationSection'); if(sec)sec.hidden=false; window.ISSApplicationResults?.fillSelect($('verificationApplicationSelect'));});
  document.addEventListener('DOMContentLoaded',()=>{
    const year=$('verificationNewApplicationYear'); if(year)year.value=String(new Date().getFullYear());
    $('saveVerificationResult')?.addEventListener('click',()=>{const msg=$('verificationRegistrationMessage');try{if(!latest)throw new Error('先にExcel申請書を解析してください。');const row=window.ISSApplicationResults.save($('verificationApplicationSelect').value,'dangerous-goods-verification','申請書確認結果',latest);msg.textContent=`申請番号 ${row.applicationYear}-${row.applicationNumber} に登録しました。`;}catch(e){msg.textContent=e.message||'登録できませんでした。';}});
    $('createAndSaveVerificationResult')?.addEventListener('click',()=>{const msg=$('verificationRegistrationMessage');try{if(!latest)throw new Error('先にExcel申請書を解析してください。');const app=window.ISSApplicationResults.createApplication({applicationYear:$('verificationNewApplicationYear').value,applicationNumber:$('verificationNewApplicationNumber').value,caseTitle:$('verificationNewCaseTitle').value});window.ISSApplicationResults.fillSelect($('verificationApplicationSelect'));$('verificationApplicationSelect').value=app.id;const row=window.ISSApplicationResults.save(app.id,'dangerous-goods-verification','申請書確認結果',latest);msg.textContent=`申請番号 ${row.applicationYear}-${row.applicationNumber} を新規登録し、確認結果を保存しました。`;}catch(e){msg.textContent=e.message||'新規登録できませんでした。';}});
  });
})();
