(function(global){
  'use strict';
  const normalize=value=>String(value??'').replace(/[\u3000\s]+/g,' ').trim();
  const compact=value=>normalize(value).replace(/[\s:：_\-／/（）()・]/g,'').toLowerCase();
  const numberValue=value=>{const m=String(value??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN};
  const cleanUn=value=>{const m=normalize(value).toUpperCase().replace(/^UN\s*/,'').match(/(?:^|\D)(\d{4})(?:\D|$)/);return m?m[1]:''};
  const normalizePg=value=>{const t=normalize(value).toUpperCase().replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').replace(/容器等級|PACKINGGROUP|PG/g,'');if(/III/.test(t))return'III';if(/II/.test(t))return'II';if(/I/.test(t))return'I';return''};
  const isTruthy=value=>/^(?:○|〇|有|対象|yes|true|1|必要)$/i.test(normalize(value));
  const toHalfWidthDigits=value=>String(value??'').replace(/[０-９]/g,ch=>String.fromCharCode(ch.charCodeAt(0)-0xFEE0));
  function normalizeDateValue(value){
    let s=toHalfWidthDigits(normalize(value));if(!s||/^(?:なし|無し|未定|未確定|―|-|n\/?a)$/i.test(s))return'';
    const serial=Number(s.replace(/,/g,''));
    if(Number.isFinite(serial)&&serial>=1&&serial<100000&&/^\d+(?:\.\d+)?$/.test(s.replace(/,/g,''))){
      const ms=Math.round((serial-25569)*86400000),d=new Date(ms);if(!Number.isNaN(d.getTime()))return d.toISOString().slice(0,10);
    }
    s=s.replace(/[（(][^）)]*[）)]/g,'').trim();
    let m=s.match(/^(20\d{2})\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*日?$/);
    if(m)return `${m[1]}-${String(Number(m[2])).padStart(2,'0')}-${String(Number(m[3])).padStart(2,'0')}`;
    m=s.match(/^(20\d{2})(\d{2})(\d{2})$/);if(m)return `${m[1]}-${m[2]}-${m[3]}`;
    m=s.match(/^(令和|R|平成|H|昭和|S)\s*(\d{1,2}|元)\s*[年\/.\-]\s*(\d{1,2})\s*[月\/.\-]\s*(\d{1,2})\s*日?$/i);
    if(m){const era=m[1].toUpperCase(),ey=m[2]==='元'?1:Number(m[2]),base=era==='令和'||era==='R'?2018:era==='平成'||era==='H'?1988:1925;return `${base+ey}-${String(Number(m[3])).padStart(2,'0')}-${String(Number(m[4])).padStart(2,'0')}`}
    m=s.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](20\d{2})$/);if(m)return `${m[3]}-${String(Number(m[1])).padStart(2,'0')}-${String(Number(m[2])).padStart(2,'0')}`;
    return'';
  }
  const safeSourceLabel=source=>{const name=normalize(source?.name||source?.sourceFileName);const ext=(name.split('.').pop()||'').toLowerCase();return['xls','xlsx','csv'].includes(ext)?`申請データ（.${ext}）`:'申請データ'};
  const labelMap={
    applicationYear:['申請年度','年度'],applicationNumber:['申請番号','受付番号','applicationno','applicationnumber'],
    applicationDate:['申請日','申請年月日','受付日','受付年月日'],
    inspectionPlannedDate:['検査予定日','予定検査日','検査予定年月日','検査実施予定日','検査予定'],
    inspectionDate:['検査実施日','検査日','検査年月日'],
    applicantName:['申請者','申請人','申請者名','申請人名','依頼元','申請者依頼元'],
    shipper:['荷主','荷送人','荷送人名','shipper','consignor'],
    caseTitle:['案件名','案件名称','件名','業務名','業務名称','案件タイトル'],
    vesselName:['船名','本船名','船舶名','vessel'],voyageNumber:['航海番号','航海No','voyageno','voyage'],
    loadingPort:['積地','船積地','船積港','船積み港','積込地','積込港','積出地','積出港','portfrom','pol'],
    dischargePort:['揚地','陸揚地','陸揚げ地','陸揚港','荷揚地','荷揚港','portto','pod'],
    containerNumber:['コンテナ番号','コンテナNo','containerno','containernumber'],
    containerType:['コンテナ種類','コンテナサイズ種類','コンテナサイズ・種類','コンテナ型式','コンテナタイプ','コンテナサイズ','containertype','containersizetype','sizetype','isotype'],
    note:['備考','特記事項','remarks','remark']
  };
  const cargoHeaders={
    unNumber:['国連番号','un番号','unnumber'],target:['検査対象','対象'],name:['品名','品名原文','化学品名','正式品名','proper shipping name'],
    hazardClass:['等級','class'],subsidiary:['副次危険性','副次','subsidiary'],packingGroup:['容器等級','packinggroup','pg'],containerCode:['容器記号','容器コード','容器','packagecode'],
    packageCount:['個数','packages'],netMass:['n/w(kg)','nw(kg)','申請総正味質量','正味質量','netweight'],grossMass:['g/w(kg)','gw(kg)','申請総質量','総質量','grossweight'],
    quantitySummary:['申請数量','数量内訳','quantitysummary'],packingInstruction:['包装要件','容器包装要件','packinginstruction'],allowable:['許容容量許容質量','許容容量・許容質量','許容容量','許容質量'],limited:['少量危険物','limitedquantity'],permission:['許可確認','許可が必要','permission']
  };
  function findLabelValue(rows,aliases){
    const aliasKeys=aliases.map(compact);
    for(const row of rows){
      const cells=(row.cells||[]).map(normalize);
      for(let i=0;i<cells.length;i++){
        const raw=cells[i],key=compact(raw);if(!aliasKeys.some(alias=>key===alias||key.startsWith(alias)))continue;
        const inline=raw.includes('：')||raw.includes(':')?raw.replace(/^.*?[：:]/,'').trim():'';if(inline)return inline;
        for(let j=i+1;j<cells.length;j++)if(cells[j])return cells[j];
      }
    }
    return'';
  }
  function findColumn(cells,aliases,exclude=[]){const keys=cells.map(compact),targets=aliases.map(compact),skip=new Set(exclude.filter(i=>i>=0));for(let i=0;i<keys.length;i++){if(skip.has(i))continue;if(targets.some(t=>keys[i]===t))return i}const ordered=[...targets].sort((a,b)=>b.length-a.length);for(let i=0;i<keys.length;i++){if(skip.has(i))continue;if(ordered.some(t=>t.length>=2&&keys[i].includes(t)))return i}return-1}
  function matchNumber(text,patterns){for(const pattern of patterns){const match=String(text||'').replace(/,/g,'').match(pattern);if(match)return Number(match[1])}return NaN}
  function parseQuantitySummary(value){
    const text=String(value??'').replace(/\r/g,'\n');
    return {
      packageCount:matchNumber(text,[/(?:個数|数量)\s*[:：]?\s*(\d+(?:\.\d+)?)/i]),
      netMassPerPackageKg:matchNumber(text,[/1\s*容器当たり(?:の)?(?:正味質量|N\/?W)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*kg/i]),
      grossMassPerPackageKg:matchNumber(text,[/1\s*容器当たり(?:の)?(?:総質量|G\/?W)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*kg/i]),
      totalNetMassKg:matchNumber(text,[/(?:^|\n)\s*(?:申請総正味質量(?:\s*[（(]N\/?W[）)])?|申請総N\/?W|総正味質量)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*kg/im]),
      totalGrossMassKg:matchNumber(text,[/(?:^|\n)\s*(?:申請総質量(?:\s*[（(]G\/?W[）)])?|申請総G\/?W|総質量)\s*[:：]?\s*(\d+(?:\.\d+)?)\s*kg/im])
    };
  }
  function normalizeMassText(value){return toHalfWidthDigits(String(value??'')).replace(/[，]/g,',').replace(/[．]/g,'.').replace(/［/g,'[').replace(/］/g,']').replace(/（/g,'(').replace(/）/g,')')}
  function parseRemarkCargoMasses(value){
    const text=normalizeMassText(value);const result={};
    if(!text)return result;
    const blocks=[];const re=/\bUN\s*([0-9]{4})\b/gi;let match;
    while((match=re.exec(text)))blocks.push({unNumber:match[1],start:match.index,end:re.lastIndex});
    blocks.forEach((block,index)=>{
      const body=text.slice(block.end,index+1<blocks.length?blocks[index+1].start:text.length);
      const massNumber=label=>{const pattern=new RegExp(label+'\\s*[:：]?\\s*([0-9][0-9,]*(?:\\.[0-9]+)?)\\s*(?:\\(?\\s*[Kk][Gg]\\s*\\)?)?','i');const m=body.match(pattern);return m?Number(m[1].replace(/,/g,'')):NaN};
      const net=massNumber('(?:正味(?:重量|質量)|申請総正味(?:重量|質量)?|N\\s*\\/?\\s*W)');
      const gross=massNumber('(?:総(?:重量|質量)|申請総(?:重量|質量)|G\\s*\\/?\\s*W)');
      if(Number.isFinite(net)||Number.isFinite(gross))result[block.unNumber]={totalNetMassKg:net,totalGrossMassKg:gross};
    });
    return result;
  }
  function applyRemarkCargoMasses(items,note){
    const masses=parseRemarkCargoMasses(note);
    return (Array.isArray(items)?items:[]).map(item=>{
      const un=String(item?.unNumber||'').replace(/^UN/i,'').padStart(4,'0'),remark=masses[un];if(!remark)return item;
      const out={...item};const count=numberValue(out.packageCount);let applied=false;
      if(Number.isFinite(remark.totalNetMassKg)){out.totalNetMassKg=Number(remark.totalNetMassKg.toFixed(6));out.netMassPerPackageKg=Number.isFinite(count)&&count>0?Number((remark.totalNetMassKg/count).toFixed(6)):out.netMassPerPackageKg;applied=true}
      if(Number.isFinite(remark.totalGrossMassKg)){out.totalGrossMassKg=Number(remark.totalGrossMassKg.toFixed(6));out.grossMassPerPackageKg=Number.isFinite(count)&&count>0?Number((remark.totalGrossMassKg/count).toFixed(6)):out.grossMassPerPackageKg;applied=true}
      if(applied){out.weightSource='remarks-un';out.weightSourceLabel='備考欄のUN番号別重量から自動反映'}
      return out;
    });
  }
  function splitName(value){const text=String(value??'').trim();const lines=text.split(/\n|\r|\s{2,}/).map(normalize).filter(Boolean);const english=lines.find(line=>/[A-Z]{3,}/.test(line))||'';const japanese=lines.find(line=>/[ぁ-んァ-ヶ一-龠]/.test(line))||'';return{originalName:text,properShippingNameJa:japanese,properShippingNameEn:english}}
  function parseAllowance(value,explicitInstruction=''){
    const text=String(value??'').trim();const code=(normalize(explicitInstruction)||text.match(/\b(?:P|LP|IBC|T|TP|BK|PP|B|VV|CV|V|SW|S|SP)\d{1,3}\b/i)?.[0]||'').toUpperCase();
    const permissionRequired=/(?:地方運輸局長|運輸局長|許可が必要|許可を要|許可確認)/.test(text);
    return{packingInstruction:code,allowableCapacityOrMass:text,permissionRequired,permissionNote:permissionRequired?text:''};
  }
  const containerCodePattern=/^(?:[1-6][A-Z]{1,2}\d?|0[A-Z]\d?)$/i;
  function cleanContainerCode(value){const t=normalize(value).toUpperCase().replace(/[（(].*?[）)]/g,'').trim();if(!t)return'';if(/^(?:I|II|III|Ⅰ|Ⅱ|Ⅲ)$/i.test(t))return'';const tokens=t.split(/[・,、\s/]+/).map(v=>v.trim()).filter(Boolean);return tokens.find(v=>containerCodePattern.test(v))||t}
  function inferContainerCode(cells,exclude=[]){const skip=new Set(exclude.filter(i=>i>=0));for(let i=0;i<cells.length;i++){if(skip.has(i))continue;const t=normalize(cells[i]).toUpperCase();const tokens=t.split(/[・,、\s/]+/).map(v=>v.replace(/[（(].*?[）)]/g,'').trim()).filter(Boolean);const hit=tokens.find(v=>containerCodePattern.test(v));if(hit)return hit}return''}
  function extractCargo(rows){
    const result=[];const sheets=[...new Set(rows.map(row=>row.sheet||'Sheet1'))];
    sheets.forEach(sheet=>{
      const sheetRows=rows.filter(row=>(row.sheet||'Sheet1')===sheet);let header=-1,cols={};
      for(let i=0;i<sheetRows.length;i++){
        const cells=sheetRows[i].cells||[];const un=findColumn(cells,cargoHeaders.unNumber);if(un<0)continue;
        const packingGroupCol=findColumn(cells,cargoHeaders.packingGroup);cols={un,target:findColumn(cells,cargoHeaders.target),name:findColumn(cells,cargoHeaders.name),hazardClass:findColumn(cells,cargoHeaders.hazardClass),subsidiary:findColumn(cells,cargoHeaders.subsidiary),packingGroup:packingGroupCol,containerCode:findColumn(cells,cargoHeaders.containerCode,[packingGroupCol]),packageCount:findColumn(cells,cargoHeaders.packageCount),netMass:findColumn(cells,cargoHeaders.netMass),grossMass:findColumn(cells,cargoHeaders.grossMass),quantitySummary:findColumn(cells,cargoHeaders.quantitySummary),packingInstruction:findColumn(cells,cargoHeaders.packingInstruction),allowable:findColumn(cells,cargoHeaders.allowable),limited:findColumn(cells,cargoHeaders.limited),permission:findColumn(cells,cargoHeaders.permission)};header=i;break;
      }
      if(header<0)return;
      let blankRun=0;
      for(let i=header+1;i<sheetRows.length;i++){
        const row=sheetRows[i],cells=row.cells||[],unNumber=cleanUn(cells[cols.un]);if(!unNumber){blankRun++;if(blankRun>20)break;continue}blankRun=0;
        const target=cols.target>=0?normalize(cells[cols.target]):'';if(target&&target!=='対象'&&!isTruthy(target))continue;
        const summary=cols.quantitySummary>=0?parseQuantitySummary(cells[cols.quantitySummary]):{};
        let packageCount=cols.packageCount>=0?numberValue(cells[cols.packageCount]):summary.packageCount;
        let totalNetMassKg=cols.netMass>=0?numberValue(cells[cols.netMass]):summary.totalNetMassKg;
        let totalGrossMassKg=cols.grossMass>=0?numberValue(cells[cols.grossMass]):summary.totalGrossMassKg;
        let netMassPerPackageKg=summary.netMassPerPackageKg,grossMassPerPackageKg=summary.grossMassPerPackageKg;
        if(!Number.isFinite(totalNetMassKg)&&Number.isFinite(packageCount)&&Number.isFinite(netMassPerPackageKg))totalNetMassKg=packageCount*netMassPerPackageKg;
        if(!Number.isFinite(totalGrossMassKg)&&Number.isFinite(packageCount)&&Number.isFinite(grossMassPerPackageKg))totalGrossMassKg=packageCount*grossMassPerPackageKg;
        if(!Number.isFinite(netMassPerPackageKg)&&Number.isFinite(packageCount)&&packageCount>0&&Number.isFinite(totalNetMassKg))netMassPerPackageKg=totalNetMassKg/packageCount;
        if(!Number.isFinite(grossMassPerPackageKg)&&Number.isFinite(packageCount)&&packageCount>0&&Number.isFinite(totalGrossMassKg))grossMassPerPackageKg=totalGrossMassKg/packageCount;
        const names=splitName(cols.name>=0?cells[cols.name]:'');
        const allowance=parseAllowance(cols.allowable>=0?cells[cols.allowable]:'',cols.packingInstruction>=0?cells[cols.packingInstruction]:'');
        const explicitPermission=cols.permission>=0?isTruthy(cells[cols.permission]):false;
        let containerCode=cols.containerCode>=0?cleanContainerCode(cells[cols.containerCode]):'';
        if(!containerCode)containerCode=inferContainerCode(cells,[cols.un,cols.hazardClass,cols.packingGroup,cols.packageCount,cols.netMass,cols.grossMass]);
        result.push({
          id:`cargo-${sheet}-${row.row||i+1}-${unNumber}`.replace(/[^a-zA-Z0-9_-]/g,'-'),lineNo:result.length+1,unNumber,...names,
          hazardClass:cols.hazardClass>=0?normalize(cells[cols.hazardClass]):'',subsidiaryHazards:cols.subsidiary>=0?normalize(cells[cols.subsidiary]):'',packingGroup:cols.packingGroup>=0?normalizePg(cells[cols.packingGroup]):'',
          containerCode,packageCount:Number.isFinite(packageCount)?packageCount:'',
          totalNetMassKg:Number.isFinite(totalNetMassKg)?Number(totalNetMassKg.toFixed(6)):'',totalGrossMassKg:Number.isFinite(totalGrossMassKg)?Number(totalGrossMassKg.toFixed(6)):'',
          netMassPerPackageKg:Number.isFinite(netMassPerPackageKg)?Number(netMassPerPackageKg.toFixed(6)):'',grossMassPerPackageKg:Number.isFinite(grossMassPerPackageKg)?Number(grossMassPerPackageKg.toFixed(6)):'',
          packingInstruction:allowance.packingInstruction,allowableCapacityOrMass:allowance.allowableCapacityOrMass,permissionRequired:explicitPermission||allowance.permissionRequired,permissionNote:allowance.permissionNote,
          limitedQuantity:cols.limited>=0?isTruthy(cells[cols.limited]):false,sourceSheet:sheet,sourceRow:row.row||i+1
        });
      }
    });
    return result;
  }
  function extractCase(rows,source={}){
    const fields={};Object.entries(labelMap).forEach(([key,aliases])=>fields[key]=findLabelValue(rows,aliases));
    fields.applicationDate=normalizeDateValue(fields.applicationDate);fields.inspectionPlannedDate=normalizeDateValue(fields.inspectionPlannedDate);fields.inspectionDate=normalizeDateValue(fields.inspectionDate);
    let year=normalize(fields.applicationYear).match(/20\d{2}/)?.[0]||'';let applicationNumber=normalize(fields.applicationNumber).match(/\d{4,5}/)?.[0]||'';
    if(!year){const match=normalize(fields.applicationDate).match(/20\d{2}/);if(match)year=match[0]}
    fields.applicationYear=year;fields.applicationNumber=applicationNumber;
    const cargoItems=applyRemarkCargoMasses(extractCargo(rows),fields.note);const ext=(normalize(source.name).split('.').pop()||normalize(source.type)).toLowerCase();
    return {schemaVersion:2,sourceLabel:safeSourceLabel(source),sourceFormat:['xls','xlsx','csv'].includes(ext)?ext:'csv',sourceSize:Number(source.size||0),sourceSha256:source.sha256||'',originalFileStored:false,importedAt:new Date().toISOString(),...fields,applicationYear:year,applicationNumber,numberType:applicationNumber?'official':'temporary',status:'received',cargoItems,caseData:{applicantName:fields.applicantName||'',shipper:fields.shipper||'',loadingPort:fields.loadingPort||'',dischargePort:fields.dischargePort||'',containerType:fields.containerType||'',cargoItems}};
  }
  function evaluateCase(caseData,{existingApplications=[],unDatabase=[]}={}){
    const blockers=[],warnings=[],passed=[];const goods=(Array.isArray(caseData?.cargoItems)?caseData.cargoItems:[]).filter(item=>item&&Object.values(item).some(Boolean));
    if(!/^20\d{2}$/.test(String(caseData?.applicationYear||'')))blockers.push('申請年度を4桁で確認してください。');else passed.push('申請年度');
    if(caseData?.numberType==='official'&&!/^\d{4,5}$/.test(String(caseData?.applicationNumber||'')))blockers.push('正式申請番号は4桁または5桁で確認してください。');
    const duplicate=existingApplications.find(item=>String(item.applicationYear||'')===String(caseData?.applicationYear||'')&&String(item.applicationNumber||'')===String(caseData?.applicationNumber||'')&&item.numberType!=='temporary');
    if(duplicate)warnings.push('同じ年度・申請番号が登録済みです。この案件へ申請確認・許容容量／質量の確認結果を追加登録します。');
    if(!goods.length)blockers.push('対象危険物を1件以上確認してください。');else passed.push(`対象危険物 ${goods.length}件`);
    const known=new Set((unDatabase||[]).map(row=>String(row.unNumber||row.un||'').replace(/^UN/i,'').padStart(4,'0')));
    goods.forEach((item,index)=>{
      const label=`危険物${index+1}`;if(!/^\d{4}$/.test(String(item.unNumber||'')))blockers.push(`${label}の国連番号を確認してください。`);else if(known.size&&!known.has(String(item.unNumber)))warnings.push(`${label}（UN${item.unNumber}）は危険物マスターで候補を確認できません。`);
      if(!item.originalName&&!item.properShippingNameJa&&!item.properShippingNameEn)warnings.push(`${label}の品名を確認してください。`);if(!item.containerCode)warnings.push(`${label}の容器コードが未入力です。`);
      const count=numberValue(item.packageCount),net=numberValue(item.totalNetMassKg),gross=numberValue(item.totalGrossMassKg);if(!Number.isFinite(count)||count<=0)warnings.push(`${label}の個数が未入力です。`);if(!Number.isFinite(net)||net<0)warnings.push(`${label}の正味質量が未入力です。`);if(Number.isFinite(net)&&Number.isFinite(gross)&&gross<net)blockers.push(`${label}の総質量が正味質量を下回っています。`);if(!item.packingInstruction&&!item.allowableCapacityOrMass)warnings.push(`${label}の包装要件・許容容量／許容質量は申請書確認で確認してください。`);if(item.permissionRequired&&!item.permissionNote)warnings.push(`${label}は許可確認が必要です。許可内容を追記してください。`);
    });
    const mass=goods.reduce((sum,item)=>{const gross=numberValue(item.totalGrossMassKg),net=numberValue(item.totalNetMassKg);return sum+(Number.isFinite(gross)?gross:Number.isFinite(net)?net:0)},0);
    if(!caseData?.containerNumber)warnings.push('コンテナ番号が未入力です。');if(!caseData?.vesselName)warnings.push('船名が未入力です。');
    const ctuReady=Boolean(caseData?.containerNumber)&&mass>0;const verificationReady=goods.length>0&&goods.every(item=>/^\d{4}$/.test(String(item.unNumber||'')));
    return {valid:blockers.length===0,blockers,warnings,passed,duplicateApplicationId:duplicate?.id||'',duplicate,summary:{cargoCount:goods.length,totalCalculationMassKg:Number(mass.toFixed(3)),ctuReady,verificationReady,status:blockers.length?'blocked':warnings.length?'review':'ready'}};
  }
  function buildChecklist(caseData,evaluation){const goods=caseData?.cargoItems||[];return[
    {code:'identity',label:'申請番号・年度・申請者',complete:Boolean(caseData?.applicationYear)&&(caseData?.numberType==='temporary'||Boolean(caseData?.applicationNumber)),note:'申請書原本と照合'},
    {code:'route',label:'船名・航海番号・積地・揚地',complete:Boolean(caseData?.vesselName&&caseData?.loadingPort&&caseData?.dischargePort),note:'不明項目は後から追記可能'},
    {code:'container',label:'コンテナ番号・種類',complete:Boolean(caseData?.containerNumber),note:'固縛力参考算出へ引継ぎ'},
    {code:'cargo',label:'危険物明細',complete:goods.length>0&&goods.every(x=>/^\d{4}$/.test(String(x.unNumber||''))),note:`${goods.length}件`},
    {code:'quantity',label:'個数・N/W・G/W',complete:goods.length>0&&goods.every(x=>Number.isFinite(numberValue(x.packageCount))&&Number.isFinite(numberValue(x.totalNetMassKg))),note:`算出用質量 ${evaluation?.summary?.totalCalculationMassKg||0} kg`},
    {code:'verification',label:'許容容量・許容質量の確認',complete:goods.length>0&&goods.every(x=>Boolean(x.packingInstruction||x.allowableCapacityOrMass)),note:'不足時は申請書確認へ'},
    {code:'permit',label:'許可確認',complete:goods.every(x=>!x.permissionRequired||Boolean(x.permissionNote)),note:'許可が必要な危険物だけ確認'},
    {code:'ctu',label:'固縛力参考算出の準備',complete:Boolean(evaluation?.summary?.ctuReady),note:'コンテナ番号と貨物質量'},
    {code:'attachments',label:'申請書・関連資料・写真',complete:false,note:'登録後に申請番号管理から追加'}
  ]}
  function toApplicationPayload(caseData){
    const goods=Array.isArray(caseData?.cargoItems)?caseData.cargoItems:[];const first=goods[0]||{};
    return {applicationYear:String(caseData?.applicationYear||new Date().getFullYear()),numberType:caseData?.numberType==='temporary'?'temporary':'official',applicationNumber:String(caseData?.applicationNumber||''),status:'received',applicantName:normalize(caseData?.applicantName),shipper:normalize(caseData?.shipper),containerNumber:normalize(caseData?.containerNumber),containerType:normalize(caseData?.containerType),vesselName:normalize(caseData?.vesselName),voyageNumber:normalize(caseData?.voyageNumber),loadingPort:normalize(caseData?.loadingPort),dischargePort:normalize(caseData?.dischargePort),applicationDate:normalize(caseData?.applicationDate),inspectionPlannedDate:normalize(caseData?.inspectionPlannedDate),inspectionDate:normalize(caseData?.inspectionDate),caseTitle:normalize(caseData?.caseTitle),unNumber:first.unNumber||'',japaneseName:first.properShippingNameJa||first.originalName||'',englishName:first.properShippingNameEn||'',hazardClass:first.hazardClass||'',packingGroup:first.packingGroup||'',cargoItems:goods,caseData:{applicantName:normalize(caseData?.applicantName),shipper:normalize(caseData?.shipper),loadingPort:normalize(caseData?.loadingPort),dischargePort:normalize(caseData?.dischargePort),containerType:normalize(caseData?.containerType),cargoItems:goods,intake:{sourceLabel:caseData?.sourceLabel||'申請データ',sourceFormat:caseData?.sourceFormat||'',sourceSha256:caseData?.sourceSha256||'',importedAt:caseData?.importedAt||'',originalFileStored:false}},note:normalize(caseData?.note)};
  }
  const api={normalize,compact,normalizeDateValue,numberValue,cleanUn,normalizePg,safeSourceLabel,parseQuantitySummary,parseRemarkCargoMasses,applyRemarkCargoMasses,parseAllowance,extractCargo,extractCase,evaluateCase,buildChecklist,toApplicationPayload};global.ISSApplicationIntakePolicy=api;
})(typeof window!=='undefined'?window:globalThis);
if(typeof window!=='undefined')window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'part535'});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'v1.3.89'});
