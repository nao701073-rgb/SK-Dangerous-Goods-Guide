(function(){
  'use strict';

  const PERMIT_REQUIRED_P200 = new Set(['1953','1954','1955','1956','3156','3157','3160','3161','3162','3163','3303','3304','3305','3306','3307','3308','3309','3310']);
  const P200_SOURCE = { path:'../references/originals/dangerous-goods-notification.pdf', pageStart:298, pageEnd:307 };
  const numberOrNull = value => {
    const text=String(value??'').replace(/,/g,'').trim();
    if(!text)return null;
    const n=Number(text);
    return Number.isFinite(n)?n:null;
  };
  const text = value => String(value??'').trim();
  const unNumber = value => {
    const match=String(value??'').toUpperCase().match(/(?:UN\s*)?(\d{4})/);
    return match?match[1]:'';
  };
  const uid = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const esc = value => String(value??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt = value => Number.isFinite(Number(value)) ? Number(value).toLocaleString('ja-JP',{maximumFractionDigits:3}) : '―';

  function normalizeCargoItem(item={}, index=0){
    const quantity=item.quantity||{};
    const allowance=item.allowance||{};
    const instruction=text(item.packingInstruction||allowance.referenceCode);
    const un=unNumber(item.unNumber||item.un);
    const permit=Boolean(item.permissionRequired ?? allowance.permissionRequired ?? (instruction==='P200'&&PERMIT_REQUIRED_P200.has(un)));
    return {
      id:text(item.id)||uid(),
      lineNo:Number(item.lineNo||index+1),
      unNumber:un,
      properShippingNameJa:text(item.properShippingNameJa||item.japaneseName||item.nameJa),
      properShippingNameEn:text(item.properShippingNameEn||item.properShippingName||item.englishName||item.nameEn),
      originalName:text(item.originalName||item.name||item.source),
      hazardClass:text(item.hazardClass||item.classNo),
      subsidiaryHazards:text(item.subsidiaryHazards||item.subsidiary),
      packingGroup:text(item.packingGroup||item.pg),
      containerCode:text(item.containerCode||item.container),
      packageForm:text(item.packageForm),
      packageCount:numberOrNull(item.packageCount??item.count??quantity.count),
      netMassPerPackageKg:numberOrNull(item.netMassPerPackageKg??quantity.massPerPackage),
      grossMassPerPackageKg:numberOrNull(item.grossMassPerPackageKg??quantity.grossPerPackage),
      totalNetMassKg:numberOrNull(item.totalNetMassKg??item.netWeight??quantity.totalMass),
      totalGrossMassKg:numberOrNull(item.totalGrossMassKg??item.grossWeight??quantity.grossTotal),
      packingInstruction:instruction,
      allowableCapacityOrMass:text(item.allowableCapacityOrMass||allowance.summary||item.allowedQuantityOrMass),
      permissionRequired:permit,
      permissionNote:text(item.permissionNote||allowance.permissionNote),
      resultStatus:text(item.resultStatus),
      warning:text(item.warning),
      sourcePath:text(item.sourcePath||allowance.sourcePath||(instruction==='P200'?P200_SOURCE.path:'')),
      sourcePageStart:numberOrNull(item.sourcePageStart??allowance.sourcePageStart??(instruction==='P200'?P200_SOURCE.pageStart:null)),
      sourcePageEnd:numberOrNull(item.sourcePageEnd??allowance.sourcePageEnd??(instruction==='P200'?P200_SOURCE.pageEnd:null))
    };
  }

  function normalizeCargoItems(items){
    return (Array.isArray(items)?items:[]).map(normalizeCargoItem).map((item,index)=>({...item,lineNo:index+1}));
  }

  function defaultP200Allowance(un){
    const permit=PERMIT_REQUIRED_P200.has(unNumber(un));
    return permit
      ? {summary:'地方運輸局長の許可が必要です。社内既存システムの許可証データベースに登録された許可内容から、使用容器と許容容量を確認してください。',permissionRequired:true,permissionNote:'危告示別表第1 P200の当該欄は「x」です。'}
      : {summary:'溶接容器：1,000 L／継目なし容器：3,000 L',permissionRequired:false,permissionNote:'実際に使用できる容器、充てん定数、最大圧力その他の条件は、当該国連番号の行と容器の許可内容を確認してください。'};
  }

  function fromVerificationPayload(payload={}){
    return normalizeCargoItems((Array.isArray(payload.goods)?payload.goods:[]).map((g,index)=>{
      const instruction=text(g.packingInstruction);
      const allowance=instruction==='P200'?defaultP200Allowance(g.un):{summary:text(g.allowedQuantityOrMass),permissionRequired:false,permissionNote:text(g.warning)};
      return {
        id:uid(),lineNo:index+1,unNumber:g.un,
        properShippingNameJa:g.properShippingNameJa,
        properShippingNameEn:g.properShippingName,
        originalName:g.name||g.source,
        hazardClass:g.hazardClass,
        subsidiaryHazards:g.subsidiaryHazards,
        packingGroup:g.packingGroup,
        containerCode:g.container,
        packageCount:g.count,
        netMassPerPackageKg:g.quantity?.massPerPackage,
        grossMassPerPackageKg:g.quantity?.grossPerPackage,
        totalNetMassKg:g.quantity?.totalMass??g.netWeight,
        totalGrossMassKg:g.quantity?.grossTotal??g.grossWeight,
        packingInstruction:instruction,
        allowableCapacityOrMass:allowance.summary,
        permissionRequired:allowance.permissionRequired,
        permissionNote:allowance.permissionNote,
        resultStatus:g.resultStatus,
        warning:g.warning,
        sourcePath:instruction==='P200'?P200_SOURCE.path:'',
        sourcePageStart:instruction==='P200'?P200_SOURCE.pageStart:null,
        sourcePageEnd:instruction==='P200'?P200_SOURCE.pageEnd:null
      };
    }));
  }

  function aggregateCargoItems(items){
    const rows=normalizeCargoItems(items);
    const sum=key=>rows.reduce((total,row)=>total+(Number.isFinite(Number(row[key]))?Number(row[key]):0),0);
    const packageCount=sum('packageCount');
    const totalNetMassKg=sum('totalNetMassKg');
    const totalGrossMassKg=sum('totalGrossMassKg');
    return {
      count:rows.length,
      packageCount,
      totalNetMassKg,
      totalGrossMassKg,
      calculationMassKg:totalGrossMassKg||totalNetMassKg,
      unNumbers:[...new Set(rows.map(row=>row.unNumber).filter(Boolean))],
      cargoNames:rows.map(row=>row.originalName||row.properShippingNameJa||row.properShippingNameEn).filter(Boolean)
    };
  }

  function extractCaseData(application={}){
    const caseData=application.caseData||application.case_data||{};
    const merged={...caseData,...application};
    return {
      applicantName:text(merged.applicantName),
      shipper:text(merged.shipper||merged.shipperName),
      loadingPort:text(merged.loadingPort),
      dischargePort:text(merged.dischargePort),
      containerType:text(merged.containerType),
      cargoItems:normalizeCargoItems(merged.cargoItems||caseData.cargoItems)
    };
  }

  function toCaseData(application={}){
    const data=extractCaseData(application);
    return {
      applicantName:data.applicantName,
      shipper:data.shipper,
      loadingPort:data.loadingPort,
      dischargePort:data.dischargePort,
      containerType:data.containerType,
      cargoItems:data.cargoItems
    };
  }

  function compatibilityFromCargo(items){
    const first=normalizeCargoItems(items)[0]||{};
    return {
      unNumber:first.unNumber||'',
      japaneseName:first.properShippingNameJa||first.originalName||'',
      englishName:first.properShippingNameEn||'',
      hazardClass:first.hazardClass||'',
      subsidiaryHazardClasses:text(first.subsidiaryHazards).split(/[\/、,]/).map(v=>v.trim()).filter(Boolean),
      packingGroup:first.packingGroup||'',
      cargoName:first.originalName||first.properShippingNameJa||first.properShippingNameEn||''
    };
  }

  function sourceLink(item){
    const row=normalizeCargoItem(item);
    if(!row.sourcePath)return '';
    const start=row.sourcePageStart||'';
    const end=row.sourcePageEnd||start;
    const label=start?(start===end?`${start}頁`:`${start}-${end}頁`):'原文';
    return `${row.sourcePath}${start?`#page=${start}`:''}|${row.packingInstruction||'原文'}原文を開く（PDF ${label}）`;
  }

  function rowMarkup(item,index,readonly){
    const row=normalizeCargoItem(item,index);
    const prefix=`cargo-${row.id.replace(/[^a-zA-Z0-9_-]/g,'')}`;
    const disabled=readonly?' disabled':'';
    const readonlyAttr=readonly?' readonly':'';
    const option=(value,label)=>`<option value="${esc(value)}"${row.packingGroup===value?' selected':''}>${esc(label)}</option>`;
    const link=sourceLink(row);
    return `<article class="case-cargo-row" data-cargo-id="${esc(row.id)}">
      <header class="case-cargo-row__header"><div><span class="case-cargo-number">No. ${index+1}</span><strong>${esc(row.unNumber?`UN${row.unNumber}`:'危険物明細')}</strong></div>${readonly?'':`<button class="case-button case-button--danger" type="button" data-remove-cargo>この行を削除</button>`}</header>
      <div class="case-cargo-grid">
        <label for="${prefix}-un">国連番号<input id="${prefix}-un" data-cargo-field="unNumber" inputmode="numeric" maxlength="4" value="${esc(row.unNumber)}" placeholder="例：1077"${readonlyAttr}></label>
        <label for="${prefix}-pg">容器等級<select id="${prefix}-pg" data-cargo-field="packingGroup"${disabled}><option value="">―</option>${option('I','I')}${option('II','II')}${option('III','III')}${option('not_applicable','該当なし')}</select></label>
        <label for="${prefix}-container">容器コード<input id="${prefix}-container" data-cargo-field="containerCode" value="${esc(row.containerCode)}" placeholder="例：継目なし容器"${readonlyAttr}></label>
        <label for="${prefix}-count">個数<input id="${prefix}-count" data-cargo-field="packageCount" type="number" min="0" step="1" value="${row.packageCount??''}"${readonlyAttr}></label>
        <label class="case-cargo-grid__wide" for="${prefix}-name">品名・原文<textarea id="${prefix}-name" data-cargo-field="originalName" rows="2" placeholder="申請書の品名・原文"${readonlyAttr}>${esc(row.originalName)}</textarea></label>
        <label for="${prefix}-ja">日本語名<input id="${prefix}-ja" data-cargo-field="properShippingNameJa" value="${esc(row.properShippingNameJa)}"${readonlyAttr}></label>
        <label for="${prefix}-en">英語名<input id="${prefix}-en" data-cargo-field="properShippingNameEn" value="${esc(row.properShippingNameEn)}"${readonlyAttr}></label>
        <label for="${prefix}-class">等級<input id="${prefix}-class" data-cargo-field="hazardClass" value="${esc(row.hazardClass)}" placeholder="例：2.3"${readonlyAttr}></label>
        <label for="${prefix}-subs">副次危険性等級<input id="${prefix}-subs" data-cargo-field="subsidiaryHazards" value="${esc(row.subsidiaryHazards)}" placeholder="例：3/6.1"${readonlyAttr}></label>
      </div>
      <div class="case-cargo-subsection"><h4>申請数量</h4><div class="case-cargo-grid case-cargo-grid--quantity">
        <label>1容器当たり正味質量（kg）<input data-cargo-field="netMassPerPackageKg" type="number" min="0" step="0.001" value="${row.netMassPerPackageKg??''}"${readonlyAttr}></label>
        <label>1容器当たり総質量（kg）<input data-cargo-field="grossMassPerPackageKg" type="number" min="0" step="0.001" value="${row.grossMassPerPackageKg??''}"${readonlyAttr}></label>
        <label>申請総正味質量 N/W（kg）<input data-cargo-field="totalNetMassKg" type="number" min="0" step="0.001" value="${row.totalNetMassKg??''}"${readonlyAttr}></label>
        <label>申請総質量 G/W（kg）<input data-cargo-field="totalGrossMassKg" type="number" min="0" step="0.001" value="${row.totalGrossMassKg??''}"${readonlyAttr}></label>
      </div></div>
      <div class="case-cargo-subsection"><h4>許容容量・許容質量</h4><div class="case-cargo-grid">
        <label for="${prefix}-pi">包装要件・法令参照<input id="${prefix}-pi" data-cargo-field="packingInstruction" value="${esc(row.packingInstruction)}" placeholder="例：危告示別表第1 P200"${readonlyAttr}></label>
        <label for="${prefix}-status">判定状態<input id="${prefix}-status" data-cargo-field="resultStatus" value="${esc(row.resultStatus)}" placeholder="確認／現場確認／許可確認"${readonlyAttr}></label>
        <label class="case-cargo-grid__wide" for="${prefix}-allow">許容容量・許容質量<textarea id="${prefix}-allow" data-cargo-field="allowableCapacityOrMass" rows="3" placeholder="例：溶接容器 1,000 L、継目なし容器 3,000 L"${readonlyAttr}>${esc(row.allowableCapacityOrMass)}</textarea></label>
        <label class="case-check-field"><input data-cargo-field="permissionRequired" type="checkbox"${row.permissionRequired?' checked':''}${disabled}> 地方運輸局長等の許可確認が必要</label>
        <label class="case-cargo-grid__wide" for="${prefix}-permit">許可・確認事項<textarea id="${prefix}-permit" data-cargo-field="permissionNote" rows="2"${readonlyAttr}>${esc(row.permissionNote||row.warning)}</textarea></label>
      </div>${link?`<a class="case-source-link" href="${esc(link.split('|')[0])}" target="_blank" rel="noopener">${esc(link.split('|')[1])}</a>`:''}</div>
    </article>`;
  }

  class CargoEditor{
    constructor(root,{items=[],readonly=false,onChange=null,emptyItem=true}={}){
      this.root=typeof root==='string'?document.querySelector(root):root;
      this.readonly=Boolean(readonly);
      this.onChange=typeof onChange==='function'?onChange:null;
      this.items=normalizeCargoItems(items);
      if(!this.items.length&&emptyItem&&!this.readonly)this.items=[normalizeCargoItem({},0)];
      this.render();
    }
    setItems(items,{keepEmpty=true}={}){this.items=normalizeCargoItems(items);if(!this.items.length&&keepEmpty&&!this.readonly)this.items=[normalizeCargoItem({},0)];this.render();}
    getItems(){this.readDom();return normalizeCargoItems(this.items).filter(item=>item.unNumber||item.originalName||item.properShippingNameJa||item.properShippingNameEn||item.containerCode||item.packageCount||item.totalNetMassKg||item.totalGrossMassKg||item.packingInstruction||item.allowableCapacityOrMass);}
    readDom(){if(!this.root)return;const rows=[...this.root.querySelectorAll('[data-cargo-id]')];this.items=rows.map((article,index)=>{const base=this.items.find(x=>x.id===article.dataset.cargoId)||{};const out={...base,id:article.dataset.cargoId,lineNo:index+1};article.querySelectorAll('[data-cargo-field]').forEach(input=>{const key=input.dataset.cargoField;if(input.type==='checkbox')out[key]=input.checked;else if(['packageCount','netMassPerPackageKg','grossMassPerPackageKg','totalNetMassKg','totalGrossMassKg'].includes(key))out[key]=numberOrNull(input.value);else out[key]=text(input.value);});return normalizeCargoItem(out,index);});}
    add(item={}){this.readDom();this.items.push(normalizeCargoItem(item,this.items.length));this.render();}
    remove(id){this.readDom();this.items=this.items.filter(item=>item.id!==id);if(!this.items.length&&!this.readonly)this.items=[normalizeCargoItem({},0)];this.render();}
    calculate(article,changed){
      const get=key=>article.querySelector(`[data-cargo-field="${key}"]`);
      const count=numberOrNull(get('packageCount')?.value);
      if(!count||count<=0)return;
      const update=(per,total)=>{
        const p=get(per),t=get(total);if(!p||!t)return;
        const pv=numberOrNull(p.value),tv=numberOrNull(t.value);
        if(changed===per&&pv!=null)t.value=String(Number((pv*count).toFixed(3)));
        else if(changed===total&&tv!=null)p.value=String(Number((tv/count).toFixed(3)));
        else if(changed==='packageCount'){
          if(pv!=null)t.value=String(Number((pv*count).toFixed(3)));
          else if(tv!=null)p.value=String(Number((tv/count).toFixed(3)));
        }
      };
      update('netMassPerPackageKg','totalNetMassKg');update('grossMassPerPackageKg','totalGrossMassKg');
    }
    render(){
      if(!this.root)return;
      this.root.innerHTML=`<div class="case-cargo-editor__toolbar"><div><strong>危険物明細</strong><span id="${this.root.id||'cargo'}Summary"></span></div>${this.readonly?'':`<button class="case-button case-button--secondary" type="button" data-add-cargo>＋ 危険物を追加</button>`}</div><div class="case-cargo-editor__list">${this.items.map((item,index)=>rowMarkup(item,index,this.readonly)).join('')}</div><div class="case-cargo-total" data-cargo-total></div>`;
      this.root.querySelector('[data-add-cargo]')?.addEventListener('click',()=>this.add());
      this.root.querySelectorAll('[data-remove-cargo]').forEach(button=>button.addEventListener('click',()=>this.remove(button.closest('[data-cargo-id]').dataset.cargoId)));
      this.root.querySelectorAll('[data-cargo-field]').forEach(input=>input.addEventListener('change',()=>{this.calculate(input.closest('[data-cargo-id]'),input.dataset.cargoField);this.readDom();this.renderTotal();this.onChange?.(this.getItems());}));
      this.renderTotal();
    }
    renderTotal(){
      this.readDom();const total=aggregateCargoItems(this.items);const box=this.root?.querySelector('[data-cargo-total]');if(box)box.innerHTML=`<div><span>危険物</span><strong>${total.count}件</strong></div><div><span>個数</span><strong>${fmt(total.packageCount)}個</strong></div><div><span>申請総正味質量</span><strong>${fmt(total.totalNetMassKg)} kg</strong></div><div><span>申請総質量</span><strong>${fmt(total.totalGrossMassKg)} kg</strong></div>`;
    }
  }

  function applyApplicationToCtu(application,ids=null){
    const data=extractCaseData(application);let rows=data.cargoItems;
    if(Array.isArray(ids)&&ids.length)rows=rows.filter(row=>ids.includes(row.id));
    const total=aggregateCargoItems(rows);
    const set=(id,value)=>{const element=document.getElementById(id);if(element&&value!=null&&String(value)!=='')element.value=String(value);};
    if(total.calculationMassKg>0)set('quickMass',Number((total.calculationMassKg/1000).toFixed(3)));
    set('quickCargoDescription',total.cargoNames.join(' / '));set('cargoDescription',total.cargoNames.join(' / '));set('unNumbers',total.unNumbers.map(v=>`UN${v}`).join(', '));set('packageCount',total.packageCount||'');
    set('containerNumber',application.containerNumber||'');set('loadingPort',data.loadingPort);set('dischargePort',data.dischargePort);set('ctuCaseVesselName',application.vesselName||'');set('ctuCaseVoyageNumber',application.voyageNumber||'');
    const mass=document.getElementById('mass');if(mass&&total.calculationMassKg>0)mass.value=String(Number((total.calculationMassKg/1000).toFixed(3)));
    return {caseData:data,items:rows,aggregate:total};
  }

  function updateApplicationFromVerification(applicationId,payload){
    if(!applicationId||!window.ISSStorage?.updateApplication)return null;
    const cargoItems=fromVerificationPayload(payload);if(!cargoItems.length)return null;
    const apps=window.ISSStorage.getApplications({scope:window.ISSStorage.isSafetyEnvironment?.()?'all':'office'});
    const app=apps.find(row=>row.id===applicationId);if(!app)return null;
    const compat=compatibilityFromCargo(cargoItems);
    window.ISSStorage.updateApplication(applicationId,{...compat,cargoItems,caseData:{...toCaseData(app),cargoItems},changeReason:'申請書確認結果から危険物明細を反映'});
    window.dispatchEvent(new CustomEvent('iss:applications-changed',{detail:{applicationId,source:'application-verification'}}));
    return cargoItems;
  }

  window.ISSApplicationCase={normalizeCargoItem,normalizeCargoItems,fromVerificationPayload,aggregateCargoItems,extractCaseData,toCaseData,compatibilityFromCargo,sourceLink,CargoEditor,applyApplicationToCtu,updateApplicationFromVerification,P200_SOURCE};
})();

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { 'assets/js/application-case-common.js':'part529' });
