(function(global){
  'use strict';
  const P200_X_MESSAGE='地方運輸局長の許可が必要です。危告示別表第1 P200の当該欄は「x」です。社内既存システムの許可証データベースに登録された許可証から、使用容器と許容容量を確認してください。';
  const P200_STANDARD_CAPACITY='溶接容器：1,000 L／継目なし容器：3,000 L';
  const PDF_PATH='../references/originals/dangerous-goods-notification.pdf';
  const IBC_MAX_SOURCE={code:'IBC-MAX',pageStart:353,pageEnd:353,href:`${PDF_PATH}#page=353`,label:'IBC容器の最大内容積の原文を開く（PDF 353頁）',available:true};
  const text=value=>String(value??'').trim();
  const unNumber=value=>{const match=String(value??'').toUpperCase().match(/(?:UN\s*)?(\d{4})/);return match?match[1]:''};
  const unique=items=>[...new Set(items.filter(Boolean))];
  const pCodes=value=>unique([...text(value).toUpperCase().matchAll(/P\d{3}/g)].map(match=>match[0]));
  const ibcCodes=value=>unique([...text(value).toUpperCase().matchAll(/IBC\d{2,3}/g)].map(match=>match[0]));
  const tCodes=value=>unique([...text(value).toUpperCase().matchAll(/(?:^|[^A-Z])T(\d{1,2})(?!\d)/g)].map(match=>`T${match[1]}`));
  const extraCodes=(value,prefix)=>unique([...text(value).toUpperCase().matchAll(new RegExp(`${prefix}\\d+`,'g'))].map(match=>match[0]));
  function resolveInstruction(item={},record={}){
    const applicationText=text(item.packingInstruction);
    const masterText=text(record?.smallPackingInstruction);
    const applicationCodes=pCodes(applicationText);
    const masterCodes=pCodes(masterText);
    const applicationCode=applicationCodes[0]||'';
    const masterCode=masterCodes[0]||'';
    const effectiveCode=masterCode||applicationCode;
    const mismatch=Boolean(applicationCode&&masterCode&&applicationCode!==masterCode);
    let sourceLabel='要確認';
    if(masterCode&&applicationCode&&!mismatch)sourceLabel='申請書・危険物マスター一致';
    else if(masterCode)sourceLabel='危険物マスター';
    else if(applicationCode)sourceLabel='申請書';
    return {applicationText,masterText,applicationCodes,masterCodes,applicationCode,masterCode,effectiveCode,mismatch,sourceLabel,displayText:masterText||applicationText||effectiveCode||'要確認'};
  }
  function resolveTransportReferences(item={},record={}){
    const packing=resolveInstruction(item,record);
    const ibcText=text(item.ibcInstruction)||text(record?.ibcInstruction);
    const tankText=text(item.portableTankInstruction)||text(record?.portableTankInstruction);
    const ibcCode=ibcCodes(ibcText)[0]||'';
    const tankCode=tCodes(tankText)[0]||'';
    return {
      packing,
      ibc:{code:ibcCode,text:ibcText||ibcCode,additional:text(record?.ibcAdditional),additionalCodes:extraCodes(record?.ibcAdditional,'B'),source:ibcCode?sourceFor(ibcCode,item?.unNumber):null},
      portableTank:{code:tankCode,text:tankText||tankCode,additional:text(record?.portableTankAdditional),additionalCodes:extraCodes(record?.portableTankAdditional,'TP'),source:tankCode?sourceFor(tankCode,item?.unNumber):null}
    };
  }
  function sourceEntry(code){
    const normalized=String(code||'').toUpperCase();
    const range=global.DOMESTIC_CODE_PAGE_RANGES?.entries?.[normalized]||null;
    if(range)return range;
    if(normalized==='P112')return {code:'P112',pageStart:289,pageEnd:290,pages:[289,290],domesticOriginal:'',exact:true,source:'v1.3.6-pdf-page-fallback'};
    const master=global.LEGAL_CODE_MASTER?.codes?.[normalized]||null;
    if(!master)return null;
    const pageStart=Number(master.domesticOriginalPage||master.pageStart||master.page||0)||0,pageEnd=Number(master.domesticOriginalPageEnd||master.pageEnd||pageStart)||pageStart;
    return {code:normalized,pages:Array.isArray(master.domesticOriginalPages)?master.domesticOriginalPages:[pageStart].filter(Boolean),pageStart,pageEnd,domesticOriginal:master.domesticOriginal||''};
  }
  function contextByUn(code,un){
    const entry=sourceEntry(code),target=unNumber(un);
    if(!entry||!target)return {unNumber:target,page:Number(entry?.pageStart||entry?.page||0)||0,sourceText:''};
    const raw=String(entry.domesticOriginal||'').replace(/\r\n?/g,'\n');
    const segments=raw.split('\f');
    const pages=Array.isArray(entry.pages)&&entry.pages.length?entry.pages:[Number(entry.pageStart||entry.page||0)||0];
    const matcher=new RegExp(`(?:^|\\n)\\s*${target}(?:\\s|$)`);
    const segmentIndex=segments.findIndex(segment=>matcher.test(segment));
    const page=segmentIndex>=0?(pages[segmentIndex]||pages[0]||0):(pages[0]||0);
    const lines=raw.split('\n');
    const start=lines.findIndex(line=>new RegExp(`^\\s*${target}(?:\\s|$)`).test(line));
    if(start<0)return {unNumber:target,page,sourceText:''};
    const selected=[lines[start]];
    for(let i=start+1;i<lines.length;i++){
      const line=lines[i];
      if(/^\s*\d{4}(?:\s|$)/.test(line))break;
      if(/^\s*-\s*\d+\s*-\s*$/.test(line)||/船舶による危険物の運送基準等を定める告示/.test(line))continue;
      selected.push(line);
    }
    return {unNumber:target,page,sourceText:selected.join('\n').trim()};
  }
  function p200Context(un){
    const base=contextByUn('P200',un);
    return {...base,permitRequired:/(?:^|\s)[xｘ](?:\s|$)/i.test(base.sourceText)};
  }
  function sourceFor(code,un){
    const normalized=String(code||'').toUpperCase();
    const entry=sourceEntry(normalized);
    if(!entry)return {code:normalized,pageStart:0,pageEnd:0,href:'',label:`${normalized||'要件'} 原文参照先 要確認`,available:false};
    let pageStart=Number(entry.pageStart||entry.page||0)||0;
    let pageEnd=Number(entry.pageEnd||pageStart)||pageStart;
    if(normalized==='P200'&&un){const context=p200Context(un);if(context.page){pageStart=context.page;pageEnd=context.page}}
    if((normalized==='IBC520'||normalized==='T23'||normalized==='T50')&&un){const context=contextByUn(normalized,un);if(context.page){pageStart=context.page;pageEnd=context.page}}
    return {code:normalized,pageStart,pageEnd,href:pageStart?`${PDF_PATH}#page=${pageStart}`:'',label:pageStart?`危告示 ${normalized} 原文を開く（PDF ${pageStart}${pageEnd>pageStart?`-${pageEnd}`:''}頁）`:`${normalized} 原文参照先 要確認`,available:Boolean(pageStart)};
  }
  function p200Allowance(un){
    const context=p200Context(un);
    const source=sourceFor('P200',un);
    if(context.permitRequired)return {permitRequired:true,display:P200_X_MESSAGE,summary:P200_X_MESSAGE,status:'review',statusText:'地方運輸局長の許可が必要',source,context};
    return {permitRequired:false,display:P200_STANDARD_CAPACITY,summary:`${P200_STANDARD_CAPACITY}。実際に使用できる容器、充てん定数、最大圧力その他の条件はP200の当該国連番号の行を確認してください。`,status:'info',statusText:'P200 許容容量',source,context};
  }

  const IBC_MAX_REFERENCE=[
    {types:'金属製IBC容器',packingGroups:['I'],states:['solid'],capacityLiters:3000,label:'金属製IBC：3,000 L'},
    {types:'硬質プラスチック製IBC容器、プラスチック製内容器付複合IBC容器、フレキシブルIBC容器、ファイバ板製IBC容器、木製IBC容器',packingGroups:['I'],states:['solid'],capacityLiters:1500,label:'その他対象IBC：1,500 L'},
    {types:'液体用の特定複合IBCを除くIBC容器',packingGroups:['II','III'],states:['solid','liquid'],capacityLiters:3000,label:'原則：3,000 L'},
    {types:'外装が鋼又はプラスチック材で、内容器がフレキシブルプラスチック製の液体用複合IBC',packingGroups:['II','III'],states:['liquid'],capacityLiters:1250,label:'該当複合IBC：1,250 L'}
  ];
  const IBC_Z_MATERIALS={
    A:'鋼',B:'アルミニウム',C:'天然木材',D:'合板',F:'再生木材',G:'ファイバ板',H:'プラスチック材',L:'織布',M:'紙（多層のもの）',N:'金属（鋼又はアルミニウム以外のもの）'
  };
  const IBC_COMPOSITE_OUTER_CODES=Object.keys(IBC_Z_MATERIALS);
  function normalizePg(value){const t=String(value||'').toUpperCase().replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').replace(/\s/g,'');if(t==='I'||t==='II'||t==='III')return t;return''}
  function ibcAllowedContainers(code){
    const entry=sourceEntry(code),raw=String(entry?.domesticOriginal||'').replace(/\r\n?/g,'\n');
    if(!raw)return[];
    const head=raw.split(/\n\s*注/)[0];
    return unique([...head.toUpperCase().matchAll(/\b(?:11|13|21|31)[A-Z][A-Z0-9]*\b/g)].map(m=>m[0]));
  }
  function ibc520Context(un){
    const context=contextByUn('IBC520',un),pairs=[];
    const re=/\b(\d{2}[A-Z][A-Z0-9]*|\d{2}H\d)\s+(\d{3,4})(?=\s|$)/g;
    let m;while((m=re.exec(context.sourceText)))pairs.push({container:m[1],capacityLiters:Number(m[2])});
    return {...context,pairs,capacities:unique(pairs.map(x=>x.capacityLiters)).sort((a,b)=>a-b),containers:unique(pairs.map(x=>x.container))};
  }
  function classifyIbcContainer(value){
    const raw=text(value).toUpperCase().replace(/\s+/g,'');
    const match=raw.match(/(?:^|[^A-Z0-9])((?:11|13|21|31)[A-Z][A-Z0-9]*)(?:$|[^A-Z0-9])/i)||raw.match(/^((?:11|13|21|31)[A-Z][A-Z0-9]*)$/i);
    const code=match?match[1].toUpperCase():'';
    const empty={code:'',isIbc:false,family:'',stateHint:'',ibcType:'',ibcTypeLabel:'',materialCode:'',materialLabel:'',outerMaterialCode:'',outerMaterialLabel:'',innerReceptacle:'',materialGroup:'',composite:false,template:false,special1250:false};
    if(!code)return empty;
    const family=code.slice(0,2),stateHint=family==='31'?'liquid':'solid';
    let m;
    if((m=code.match(/^(11|21|31)(A|B|N)$/))){
      const materialCode=m[2];
      return {...empty,code,isIbc:true,family,stateHint,ibcType:'metal',ibcTypeLabel:'金属製IBC容器',materialCode,materialLabel:IBC_Z_MATERIALS[materialCode],materialGroup:'metal'};
    }
    if((m=code.match(/^13(H[1-5]|L[1-4]|M[1-2])$/))){
      const materialCode=m[1][0],materialLabel=materialCode==='H'?(m[1]==='H5'?'プラスチックフィルム':'樹脂クロス'):materialCode==='L'?'織布':'紙（多層のもの）';
      return {...empty,code,isIbc:true,family,stateHint,ibcType:'flexible',ibcTypeLabel:'フレキシブルIBC容器',materialCode,materialLabel,materialGroup:'flexible'};
    }
    if((m=code.match(/^(11|21|31)H([12])$/))){
      return {...empty,code,isIbc:true,family,stateHint,ibcType:'rigid-plastic',ibcTypeLabel:'硬質プラスチック製IBC容器',materialCode:'H',materialLabel:'プラスチック材',materialGroup:'rigid-plastic'};
    }
    if((m=code.match(/^(11|21|31)H([ABCDFGHLMN])([12])$/))){
      const outerMaterialCode=m[2],innerReceptacle=m[3]==='1'?'硬質プラスチック製':'フレキシブルプラスチック製';
      const special1250=family==='31'&&m[3]==='2'&&(outerMaterialCode==='A'||outerMaterialCode==='H');
      return {...empty,code,isIbc:true,family,stateHint,ibcType:'composite',ibcTypeLabel:'プラスチック製内容器付複合IBC容器',materialCode:'H',materialLabel:'プラスチック製内容器',outerMaterialCode,outerMaterialLabel:IBC_Z_MATERIALS[outerMaterialCode],innerReceptacle,materialGroup:'composite',composite:true,special1250};
    }
    if((m=code.match(/^(11|21|31)HZ([12])$/))){
      return {...empty,code,isIbc:true,family,stateHint,ibcType:'composite',ibcTypeLabel:'プラスチック製内容器付複合IBC容器',materialCode:'H',materialLabel:'プラスチック製内容器',outerMaterialCode:'Z',outerMaterialLabel:'外装材質記号へ置換が必要',innerReceptacle:m[2]==='1'?'硬質プラスチック製':'フレキシブルプラスチック製',materialGroup:'composite',composite:true,template:true,special1250:false};
    }
    if(code==='11G')return {...empty,code,isIbc:true,family,stateHint,ibcType:'fibreboard',ibcTypeLabel:'ファイバ板製IBC容器',materialCode:'G',materialLabel:'ファイバ板',materialGroup:'fibreboard'};
    if((m=code.match(/^11([CDF])$/))){const materialCode=m[1];return {...empty,code,isIbc:true,family,stateHint,ibcType:'wood',ibcTypeLabel:'木製IBC容器',materialCode,materialLabel:IBC_Z_MATERIALS[materialCode],materialGroup:'wood'};}
    return {...empty,code,isIbc:true,family,stateHint,ibcType:'unknown',ibcTypeLabel:'IBC容器',materialGroup:'other'};
  }
  function ibcContainerMatchesTemplate(actualValue,allowedValue){
    const actual=classifyIbcContainer(actualValue),allowed=text(allowedValue).toUpperCase().replace(/\s+/g,'');
    if(!actual.code||!allowed)return false;
    if(actual.code===allowed)return true;
    const wildcard=allowed.match(/^(11|21|31)HZ([12])$/);
    if(wildcard&&actual.composite&&!actual.template&&actual.family===wildcard[1]&&actual.code.endsWith(wildcard[2])&&IBC_COMPOSITE_OUTER_CODES.includes(actual.outerMaterialCode))return true;
    return false;
  }
  function ibcMaximumByContainer(item={},record={}){
    const actual=classifyIbcContainer(item.containerCode||item.packageCode||'');
    const pg=normalizePg(item.packingGroup||record.packingGroup);
    const state=(text(item.physicalState)||actual.stateHint||'').toLowerCase();
    if(!actual.isIbc)return {actual,determined:false,capacityLiters:null,status:'review',statusText:'IBC容器コード 要確認',display:''};
    const materialText=actual.composite&&!actual.template?`外装 ${actual.outerMaterialLabel}／内容器 ${actual.innerReceptacle}`:actual.materialLabel||actual.ibcTypeLabel;
    if(actual.template)return {actual,determined:false,capacityLiters:null,status:'review',statusText:'IBC材質コード 要確認',display:`${actual.code}：Zを実際の外装材質記号（A/B/C/D/F/G/H/L/M/N）に置き換えた容器コードを確認`};
    if(pg==='I'){
      if(state&&state!=='solid')return {actual,determined:false,capacityLiters:null,status:'review',statusText:'IBC性状 要確認',display:`${actual.code}（${materialText}）：容器等級Iの最大内容積表は固体を対象。性状を確認`};
      const capacity=actual.ibcType==='metal'?3000:1500;
      return {actual,determined:true,capacityLiters:capacity,status:'info',statusText:'IBC最大内容積',display:`${actual.code}（${materialText}）：最大内容積 ${capacity.toLocaleString('ja-JP')} L（容器等級I・固体）`};
    }
    if(pg==='II'||pg==='III'){
      if(actual.special1250){
        return {actual,determined:true,capacityLiters:1250,status:'info',statusText:'IBC最大内容積',display:`${actual.code}（${materialText}）：最大内容積 1,250 L（容器等級${pg}・液体用複合IBC）`};
      }
      return {actual,determined:true,capacityLiters:3000,status:'info',statusText:'IBC最大内容積',display:`${actual.code}（${materialText}）：最大内容積 3,000 L（容器等級${pg}）`};
    }
    return {actual,determined:false,capacityLiters:null,status:'review',statusText:'容器等級 要確認',display:`${actual.code}（${materialText}）：容器等級・性状からIBC最大内容積を確認`};
  }
  function ibcAllowance(item={},record={}){
    const code=ibcCodes(item.ibcInstruction||record.ibcInstruction)[0]||'';
    if(!code||code==='-')return null;
    const source=sourceFor(code,item.unNumber||record.unNumber),pg=normalizePg(item.packingGroup||record.packingGroup),state=text(item.physicalState||'').toLowerCase();
    if(code==='IBC520'){
      const context=ibc520Context(item.unNumber||record.unNumber),actualInfo=classifyIbcContainer(item.containerCode),actual=actualInfo.code||text(item.containerCode).toUpperCase();
      const matched=actual?context.pairs.filter(x=>ibcContainerMatchesTemplate(actual,x.container)):[];
      const values=unique((matched.length?matched:context.pairs).map(x=>x.capacityLiters)).sort((a,b)=>a-b);
      const display=values.length?`IBC520：${actual&&matched.length?actual+' ':''}${values.map(v=>`${v.toLocaleString('ja-JP')} L`).join('／')}（化学名${actual&&matched.length?'':'・IBC種類'}により異なる）`:'IBC520：当該国連番号・化学名の許容容量を確認';
      return {code,display,summary:display,status:'review',statusText:'IBC520 化学名・容器種類 要確認',source,secondarySource:IBC_MAX_SOURCE,context,maxReference:[],actualContainer:actual,actualInfo};
    }
    const actualInfo=classifyIbcContainer(item.containerCode),actual=actualInfo.code||text(item.containerCode).toUpperCase(),allowedContainers=ibcAllowedContainers(code),containerAllowed=actual&&allowedContainers.length?allowedContainers.some(template=>ibcContainerMatchesTemplate(actual,template)):null;
    const maximum=ibcMaximumByContainer(item,record);
    const applicable=IBC_MAX_REFERENCE.filter(row=>(!pg||row.packingGroups.includes(pg))&&(!state||row.states.includes(state)));
    let maxReference=applicable;
    if(!maxReference.length&&pg)maxReference=IBC_MAX_REFERENCE.filter(row=>row.packingGroups.includes(pg));
    let display=maximum.display;
    if(!display)display=maxReference.length?`${code}／最大内容積（参考） ${maxReference.map(row=>row.label).join('／')}`:`${code}／IBC容器の種類・容器等級・性状から最大内容積を確認`;
    if(containerAllowed===false)display=`${display}／${actual||'容器コード'}は${code}の許容IBC種類と不一致の可能性`;
    const status=containerAllowed===false?'review':maximum.status||'info';
    const statusText=containerAllowed===false?'IBC容器種類 不一致・要確認':maximum.statusText||'IBC要件を確認';
    return {code,display,summary:display,status,statusText,source,secondarySource:IBC_MAX_SOURCE,maxReference,maximum,actualContainer:actual,actualInfo,allowedContainers,containerAllowed};
  }


  const PORTABLE_TANK_ROWS={
    T1:['0.15','－','N','A'],T2:['0.15','－','N','B'],T3:['0.265','－','N','A'],T4:['0.265','－','N','B'],T5:['0.265','－','NF','C'],
    T6:['0.4','－','N','A'],T7:['0.4','－','N','B'],T8:['0.4','－','N','C'],T9:['0.4','6mm','N','C'],T10:['0.4','6mm','NF','C'],
    T11:['0.6','－','N','B'],T12:['0.6','－','NF','B'],T13:['0.6','6mm','N','C'],T14:['0.6','6mm','NF','C'],T15:['1','－','N','B'],T16:['1','－','NF','B'],T17:['1','6mm','N','B'],T18:['1','6mm','NF','B'],T19:['1','6mm','NF','C'],T20:['1','8mm','NF','C'],T21:['1','10mm','N','C'],T22:['1','10mm','NF','C']
  };
  const T_RELIEF={N:'ばね式圧力安全弁',NF:'破裂板を直列に設けたばね式圧力安全弁'};
  const T_BOTTOM={A:'二重閉鎖装置を備える底部開口可',B:'三重閉鎖装置を備える底部開口',C:'底部開口なし'};
  function portableTankAllowance(item={},record={}){
    const code=tCodes(item.portableTankInstruction||record.portableTankInstruction)[0]||'';
    if(!code||code==='-')return null;
    const source=sourceFor(code,item.unNumber||record.unNumber),row=PORTABLE_TANK_ROWS[code];
    if(row){const [pressure,shell,relief,bottom]=row;const display=`${code}：最小試験圧力 ${pressure} MPa／外板 ${shell}／安全装置 ${relief}／底部開口 ${bottom}`;return{code,display,summary:display,status:'info',statusText:'ポータブルタンク要件を確認',source,details:{pressure,shell,relief,reliefText:T_RELIEF[relief]||'',bottom,bottomText:T_BOTTOM[bottom]||''}}}
    const context=contextByUn(code,item.unNumber||record.unNumber);
    const label=code==='T23'?'国連番号・化学名ごとの要件':code==='T50'?'国連番号ごとの最大許容使用圧力等':code==='T75'?'T75の要件':`${code}の個別要件`;
    const display=`${code}：${label}を確認`;
    return{code,display,summary:display,status:'review',statusText:`${code} 個別条件 要確認`,source,context};
  }
  function detectTransportMode(item={},record={}){
    const container=text(item.containerCode).toUpperCase(),value=[container,item.containerType,item.packageType,item.transportPackage,item.packingInstruction].filter(Boolean).join(' ').toUpperCase();
    if(classifyIbcContainer(container).isIbc||/\bIBC\b/.test(value))return'ibc';
    if(/^(?:T(?:[1-9]|[1-9]\d))$/.test(container)||/ポータブル\s*タンク|PORTABLE\s*TANK|タンクコンテナ|TANK\s*CONTAINER|ISO\s*TANK/.test(value))return'portable-tank';
    return'small-package';
  }
  function primaryTransportReference(item={},record={}){
    const mode=detectTransportMode(item,record);
    if(mode==='ibc'&&ibcCodes(record.ibcInstruction||item.ibcInstruction)[0])return {mode,label:'IBC容器要件',result:ibcAllowance(item,record)};
    if(mode==='portable-tank'&&tCodes(record.portableTankInstruction||item.portableTankInstruction)[0])return {mode,label:'ポータブルタンク要件',result:portableTankAllowance(item,record)};
    return {mode:'small-package',label:'包装要件',result:null};
  }
  global.ISSApplicationPackingReference={P200_X_MESSAGE,P200_STANDARD_CAPACITY,PDF_PATH,IBC_MAX_SOURCE,IBC_MAX_REFERENCE,IBC_Z_MATERIALS,IBC_COMPOSITE_OUTER_CODES,PORTABLE_TANK_ROWS,pCodes,ibcCodes,tCodes,resolveInstruction,resolveTransportReferences,sourceFor,contextByUn,p200Context,p200Allowance,classifyIbcContainer,ibcContainerMatchesTemplate,ibcMaximumByContainer,ibcAllowedContainers,ibc520Context,ibcAllowance,portableTankAllowance,detectTransportMode,primaryTransportReference};
  if(typeof window!=='undefined')window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-packing-reference-part545.js':'part545'});
})(typeof window!=='undefined'?window:globalThis);
