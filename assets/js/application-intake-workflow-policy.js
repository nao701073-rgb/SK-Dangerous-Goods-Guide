(function(global){
  'use strict';
  const normalize=value=>String(value??'').replace(/[\u3000\s]+/g,' ').trim();
  const compact=value=>normalize(value).replace(/[\s:：_\-／/（）()・]/g,'').toLowerCase();
  const numberValue=value=>{const m=String(value??'').replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN};
  const cleanUn=value=>{const m=normalize(value).toUpperCase().replace(/^UN\s*/,'').match(/(?:^|\D)(\d{4})(?:\D|$)/);return m?m[1]:''};
  const normalizePg=value=>{const t=normalize(value).toUpperCase().replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').replace(/容器等級|PACKINGGROUP|PG/g,'');if(/III/.test(t))return'III';if(/II/.test(t))return'II';if(/I/.test(t))return'I';return''};
  const isTruthy=value=>/^(?:○|〇|有|対象|yes|true|1|必要)$/i.test(normalize(value));
  const safeSourceLabel=source=>{const name=normalize(source?.name||source?.sourceFileName);const ext=(name.split('.').pop()||'').toLowerCase();return['xls','xlsx','csv'].includes(ext)?`申請データ（.${ext}）`:'申請データ'};
  const labelMap={
    applicationYear:['申請年度','年度'],applicationNumber:['申請番号','受付番号','applicationno','applicationnumber'],
    applicationDate:['申請日','受付日'],inspectionPlannedDate:['検査予定日','予定検査日'],inspectionDate:['検査実施日','検査日'],
    applicantName:['申請者','依頼元','申請者依頼元'],shipper:['荷主','荷送人','shipper','consignor'],caseTitle:['案件名','件名'],
    vesselName:['船名','本船名','vessel'],voyageNumber:['航海番号','voyageno','voyage'],loadingPort:['積地','船積港','portfrom','pol'],dischargePort:['揚地','陸揚港','portto','pod'],
    containerNumber:['コンテナ番号','containerno','containernumber'],containerType:['コンテナ種類','コンテナサイズ種類','containertype','sizetype']
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
    let year=normalize(fields.applicationYear).match(/20\d{2}/)?.[0]||'';let applicationNumber=normalize(fields.applicationNumber).match(/\d{4,5}/)?.[0]||'';
    if(!year){const match=normalize(fields.applicationDate).match(/20\d{2}/);if(match)year=match[0]}
    const cargoItems=extractCargo(rows);const ext=(normalize(source.name).split('.').pop()||normalize(source.type)).toLowerCase();
    return {schemaVersion:2,sourceLabel:safeSourceLabel(source),sourceFormat:['xls','xlsx','csv'].includes(ext)?ext:'csv',sourceSize:Number(source.size||0),sourceSha256:source.sha256||'',originalFileStored:false,importedAt:new Date().toISOString(),applicationYear:year,applicationNumber,numberType:applicationNumber?'official':'temporary',status:'received',...fields,cargoItems,caseData:{applicantName:fields.applicantName||'',shipper:fields.shipper||'',loadingPort:fields.loadingPort||'',dischargePort:fields.dischargePort||'',containerType:fields.containerType||'',cargoItems}};
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
  const api={normalize,compact,numberValue,cleanUn,normalizePg,safeSourceLabel,parseQuantitySummary,parseAllowance,extractCargo,extractCase,evaluateCase,buildChecklist,toApplicationPayload};global.ISSApplicationIntakePolicy=api;
})(typeof window!=='undefined'?window:globalThis);
if(typeof window!=='undefined')window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'part535'});
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-policy.js':'v1.3.17'});
