(function(){
  'use strict';
  const text=value=>String(value??'').trim();
  const unique=values=>[...new Set(values.filter(Boolean))];
  const pCodes=value=>unique([...text(value).matchAll(/P\d{3}/g)].map(match=>match[0]));
  const containerCodes=value=>unique(text(value).split(/[\s,、・/]+/).map(value=>value.replace(/[()（）].*$/,'').trim()).filter(value=>/^[1-6][A-Z0-9]{1,4}$/.test(value)));
  const limitPattern=/(?:\d+(?:\.\d+)?\s*(?:kg|KG|L|ℓ|リットル)|使用禁止|禁止)/g;
  const normalizeLimit=value=>text(value).replace(/\s+/g,'').replace(/KG/gi,'kg').replace(/ℓ|リットル/g,'L');
  const SOURCE_FALLBACKS={P112:{pageStart:289,pageEnd:290,title:'P112 小型容器包装要件',note:'P112(a)～(c)は危告示PDF 289～290頁で原文照合'}};
  const sourceForCode=code=>{
    const master=window.LEGAL_CODE_MASTER?.codes?.[code]||{};
    const range=window.DOMESTIC_CODE_PAGE_RANGES?.entries?.[code]||{};
    const fallback=SOURCE_FALLBACKS[code]||{};
    const original=text(master.domesticOriginal||range.domesticOriginal||fallback.domesticOriginal);
    const pageStart=Number(master.domesticOriginalPage||range.pageStart||range.page||fallback.pageStart||0)||0;
    const pageEnd=Number(master.domesticOriginalPageEnd||range.pageEnd||fallback.pageEnd||pageStart)||pageStart;
    const href=pageStart?`../references/originals/dangerous-goods-notification.pdf#page=${pageStart}`:'';
    const label=pageStart?`${code}原文を開く（PDF ${pageStart}${pageEnd>pageStart?`-${pageEnd}`:''}頁）`:`${code} 原文参照先 要確認`;
    return {code,original,pageStart,pageEnd,href,label,title:text(master.domesticDisplay||master.labelJa||fallback.title||`${code} 包装・輸送要件`),exact:Boolean(master.domesticOriginalExact||range.exact),note:text(fallback.note)};
  };
  function allLimits(original){return unique((text(original).match(limitPattern)||[]).map(normalizeLimit)).slice(0,12)}
  function relevantLimits(original,codes){
    const lines=text(original).split(/\r?\n/).map(line=>line.trim()).filter(Boolean);
    const result=[];
    for(const code of codes){
      const matched=[];
      for(let index=0;index<lines.length;index++){
        if(!new RegExp(`(^|[^A-Z0-9])${code.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}([^A-Z0-9]|$)`).test(lines[index]))continue;
        const windowText=lines.slice(index,Math.min(lines.length,index+4)).join(' ');
        matched.push(...(windowText.match(limitPattern)||[]).map(normalizeLimit));
      }
      result.push({containerCode:code,limits:unique(matched).slice(0,8)});
    }
    return result;
  }
  function alternativeMethods(record){
    return unique([
      text(record?.largePackingInstruction),
      text(record?.ibcInstruction),
      text(record?.portableTankInstruction),
      text(record?.flexibleBulkContainer)
    ].flatMap(value=>value.split(/[\s,、]+/)).filter(value=>value&&value!=='-'));
  }
  function alternativeCodes(record){
    const joined=[record?.largePackingInstruction,record?.ibcInstruction,record?.portableTankInstruction,record?.flexibleBulkContainer].map(text).join(' ').toUpperCase();
    return unique([
      ...(joined.match(/LP\d{2,3}/g)||[]),
      ...(joined.match(/IBC\d{2,3}/g)||[]),
      ...[...joined.matchAll(/(?:^|[^A-Z])T(\d{1,2})(?!\d)/g)].map(m=>`T${m[1]}`),
      ...(joined.match(/BK\d+/g)||[])
    ]);
  }
  function resolve(record,cargo={}){
    const instructions=pCodes(record?.smallPackingInstruction||cargo.packingInstruction);
    const containers=containerCodes(cargo.container||cargo.containerCode);
    if(!instructions.length){
      const alternatives=alternativeMethods(record),altCodes=alternativeCodes(record),sources=altCodes.map(sourceForCode),missingSource=sources.filter(source=>!source.pageStart);
      const radioactive=/^7(?:\.|$)/.test(text(record?.class))||/放射性/.test(text(record?.classification));
      const summary=radioactive
        ? '小型容器の一律許容容量・許容質量ではなく、放射性輸送物の型式・収納限度・承認条件を個別に確認します。'
        : altCodes.length
          ? `小型容器包装要件の指定なし。${altCodes.join('、')}の原文から容量・質量・適用条件を確認します。`
          : alternatives.length
            ? `小型容器包装要件の指定なし。${alternatives.join('、')}の容量・質量条件を個別に確認します。`
            : '小型容器包装要件の指定なし。備考・特別規定・輸送形態を個別に確認します。';
      return {covered:missingSource.length===0,mode:altCodes.length?'alternative-reference':'not-applicable',status:'個別条件',summary,instructions:[],containers,alternatives,alternativeCodes:altCodes,sources,candidates:[],requiresOriginalCheck:true};
    }
    const sources=instructions.map(sourceForCode);
    const candidates=sources.map(source=>{
      const relevant=relevantLimits(source.original,containers);
      return {code:source.code,byContainer:relevant,all:allLimits(source.original),source};
    });
    const structured=instructions.every(code=>Boolean(window.DOMESTIC_PACKING_QUANTITY_PROFILES?.profiles?.[code]));
    const p200=instructions.includes('P200');
    const missingSource=sources.filter(source=>!source.original);
    let summary='';
    if(missingSource.length){
      summary=`${instructions.join('、')}の原文参照情報を確認できません。法令マスターを確認してください。`;
    }else if(structured){
      summary=`${instructions.join('、')}の構造化表により、容器コード・容器等級に応じて許容容量又は許容質量を確認します。`;
    }else if(p200){
      summary='P200の容器種類、充てん定数、最大圧力、許容容量及び許可条件を原文該当行で確認します。';
    }else if(containers.length){
      const found=unique(candidates.flatMap(item=>item.byContainer.flatMap(row=>row.limits)));
      summary=found.length
        ? `${instructions.join('、')}原文表の申請容器該当候補：${found.join('、')}。注記・追加規定を含めて原文で確定してください。`
        : `${instructions.join('、')}原文表で申請容器 ${containers.join('、')} の該当行と許容容量又は許容質量を確認してください。`;
    }else{
      summary=`${instructions.join('、')}原文表に対応しています。申請容器コードを確認し、該当行の許容容量又は許容質量を確定してください。`;
    }
    return {covered:missingSource.length===0,mode:structured?'structured':p200?'p200':'source-reference',status:structured?'自動照合':p200?'原文・許可確認':'原文照合',summary,instructions,containers,alternatives:alternativeMethods(record),sources,candidates,requiresOriginalCheck:!structured};
  }
  function sourceLinks(result,pdfPath='../references/originals/dangerous-goods-notification.pdf'){
    return (result?.sources||[]).filter(source=>source.pageStart).map(source=>({code:source.code,label:`${source.code}原文を開く（PDF ${source.pageStart}${source.pageEnd>source.pageStart?`-${source.pageEnd}`:''}頁）`,href:`${pdfPath}#page=${source.pageStart}`}));
  }
  window.ISSApplicationAllowance={resolve,pCodes,containerCodes,sourceLinks,sourceForCode,alternativeCodes};
  window.SKApplicationAllowanceResolver=Object.assign(window.SKApplicationAllowanceResolver||{},{resolve,resolveAllowance:resolve,pCodes,containerCodes,sourceLinks,sourceForCode,alternativeCodes});
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-allowance-resolver.js':'part536'});
})();
