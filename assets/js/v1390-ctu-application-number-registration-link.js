(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const state={identity:null,expectedApplicationId:'',autoLinked:false,lastImportedAt:''};
  const text=v=>String(v??'').replace(/[\r\n]+/g,' ').replace(/[\s　]+/g,' ').trim();
  const esc=v=>text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validYear=v=>/^\d{4}$/.test(text(v))?text(v):'';
  const validNo=v=>/^\d{4,5}$/.test(text(v))?text(v):'';
  function normalizedIdentity(fields={}){
    let year=validYear(fields.applicationYear),number=validNo(fields.applicationNumber);
    if((!year||!number)&&window.ISSCTUExcelRoute?.applicationIdentity){
      const derived=window.ISSCTUExcelRoute.applicationIdentity(fields.refNo||'',fields.applicationYear||'',fields.applicationDate||'')||{};
      year=year||validYear(derived.applicationYear);number=number||validNo(derived.applicationNumber);
    }
    if(!number)number=validNo(fields.refNo);
    return year&&number?{applicationYear:year,applicationNumber:number,applicationDate:text(fields.applicationDate),refNo:text(fields.refNo)}:null;
  }
  function displayNumber(app){return text(app?.numberType)==='temporary'?text(app?.temporaryNumber||app?.applicationNumber):text(app?.applicationNumber)}
  function applications(){
    try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}
  }
  function findExisting(identity=state.identity){
    if(!identity)return null;
    return applications().find(app=>text(app.applicationYear)===identity.applicationYear&&text(app.numberType)!=='temporary'&&displayNumber(app)===identity.applicationNumber)||null;
  }
  function ensureInfoBox(){
    let box=$('ctuImportedApplicationIdentity');if(box)return box;
    const target=$('ctuRegistrationTarget');if(!target)return null;
    box=document.createElement('div');box.id='ctuImportedApplicationIdentity';box.className='v1390-imported-application-id';box.hidden=true;target.insertAdjacentElement('afterend',box);return box;
  }
  function ensureOption(select,app){
    if(!select||!app)return;
    let option=[...select.options].find(o=>o.value===String(app.id));
    if(!option){option=document.createElement('option');option.value=String(app.id);select.appendChild(option)}
    option.textContent=`${text(app.applicationYear)}-${displayNumber(app)}${app.caseTitle?'｜'+text(app.caseTitle):''}`;
  }
  function setSelects(app){
    const a=$('ctuCaseApplicationSelect'),b=$('ctuApplicationSelect');
    if(app){ensureOption(a,app);ensureOption(b,app);if(a)a.value=String(app.id);if(b)b.value=String(app.id)}
    else {if(a)a.value='';if(b)b.value=''}
  }
  function setNewFields(identity){
    const y=$('ctuNewApplicationYear'),n=$('ctuNewApplicationNumber');
    if(y)y.value=identity?.applicationYear||'';
    if(n)n.value=identity?.applicationNumber||'';
  }
  function render(mode='linked',message=''){
    const identity=state.identity,target=$('ctuRegistrationTarget'),details=$('ctuNewApplicationDetails'),info=ensureInfoBox();
    if(!identity){if(info){info.hidden=true;info.textContent=''};return}
    const existing=findExisting(identity),number=`${identity.applicationYear}-${identity.applicationNumber}`;
    if(existing){
      state.expectedApplicationId=String(existing.id);state.autoLinked=true;setSelects(existing);
      if(target)target.innerHTML=`<span>登録先（申請書と一致）</span><strong>${esc(number)}${existing.caseTitle?'｜'+esc(existing.caseTitle):''}</strong><small>既に登録済みのため、この案件へ固縛力参考算出結果を保存します。</small>`;
      if(details)details.open=false;
    }else{
      state.expectedApplicationId='';state.autoLinked=true;
      if(mode!=='warning'){setSelects(null);setNewFields(identity)}
      if(target)target.innerHTML=`<span>登録先（申請書から取得）</span><strong>${esc(number)}</strong><small>未登録のため、申請書と同じ申請番号で新規登録します。</small>`;
      if(details){details.open=true;const s=details.querySelector('summary');if(s)s.textContent='申請書から取得した申請番号を確認'}
    }
    if(info){
      info.hidden=false;info.className='v1390-imported-application-id'+(mode==='warning'?' is-warning':existing?' is-existing':' is-new');
      info.innerHTML=mode==='warning'?`<strong>申請番号の整合性を確認してください。</strong><span>${esc(message||'申請書から取得した番号と登録先が一致していません。')}</span>`:`<strong>申請書取得番号：${esc(number)}</strong><span>${existing?'申請番号管理の既存案件と一致しました。':'この番号を登録時の基準値として使用します。'}</span>`;
    }
  }
  function linkImportedIdentity(fields){
    const identity=normalizedIdentity(fields||window.ISSCTUExcelRoute?.getState?.()?.fields||{});
    if(!identity){state.identity=null;state.expectedApplicationId='';state.autoLinked=false;return}
    state.identity=identity;state.lastImportedAt=new Date().toISOString();
    // Refresh the core's application cache without loading/overwriting the just-imported CTU inputs.
    try{window.dispatchEvent(new CustomEvent('iss:applications-changed',{detail:{source:'ctu-imported-application-number-link',refreshOnly:true}}))}catch{}
    setNewFields(identity);render('linked');
    const existing=findExisting(identity),caseSelect=$('ctuCaseApplicationSelect');
    if(existing&&caseSelect){
      try{caseSelect.dispatchEvent(new Event('change',{bubbles:true}))}catch{}
      setTimeout(()=>render('linked'),0);
    }
    window.dispatchEvent(new CustomEvent('sk:ctu-application-number-linked',{detail:{...identity,existingApplicationId:state.expectedApplicationId||null}}));
  }
  function currentMismatch(){
    if(!state.identity)return '';
    const identity=state.identity,existing=findExisting(identity),selectedId=text($('ctuCaseApplicationSelect')?.value);
    if(existing){
      if(selectedId&&selectedId!==String(existing.id))return `申請書は ${identity.applicationYear}-${identity.applicationNumber} ですが、別の登録済み案件が選択されています。`;
      return '';
    }
    if(selectedId)return `申請書は ${identity.applicationYear}-${identity.applicationNumber} ですが、別の登録済み案件が選択されています。`;
    const y=validYear($('ctuNewApplicationYear')?.value),n=validNo($('ctuNewApplicationNumber')?.value);
    if(y!==identity.applicationYear||n!==identity.applicationNumber)return `申請書取得番号 ${identity.applicationYear}-${identity.applicationNumber} と登録欄 ${y||'未入力'}-${n||'未入力'} が一致していません。`;
    return '';
  }
  function prepareRegistration(){
    if(!state.identity)return true;
    const existing=findExisting(state.identity);
    if(existing){
      state.expectedApplicationId=String(existing.id);setSelects(existing);render('linked');return true;
    }
    const mismatch=currentMismatch();
    if(mismatch){
      render('warning',mismatch);const msg=$('ctuRegistrationMessage');if(msg){msg.hidden=false;msg.textContent='登録を停止しました。'+mismatch+' 申請書の取込データを消去すると手入力登録へ戻れます。'}
      return false;
    }
    setSelects(null);setNewFields(state.identity);render('linked');return true;
  }
  function clearLink(){
    const old=state.identity;if(!old)return;
    const y=$('ctuNewApplicationYear'),n=$('ctuNewApplicationNumber');
    if(y&&y.value===old.applicationYear)y.value=String(new Date().getFullYear());
    if(n&&n.value===old.applicationNumber)n.value='';
    if(state.autoLinked)setSelects(null);
    state.identity=null;state.expectedApplicationId='';state.autoLinked=false;state.lastImportedAt='';
    const info=ensureInfoBox();if(info){info.hidden=true;info.textContent=''}
    const target=$('ctuRegistrationTarget');if(target)target.innerHTML='<span>登録先</span><strong>新しい申請番号</strong>';
    const details=$('ctuNewApplicationDetails');if(details){details.open=true;const s=details.querySelector('summary');if(s)s.textContent='未登録の案件として申請番号を入力'}
  }
  window.addEventListener('sk:ctu-excel-imported',event=>linkImportedIdentity(event.detail?.fields||{}));
  window.addEventListener('sk:ctu-excel-route-enhanced',event=>{if(!state.identity)linkImportedIdentity(event.detail?.fields||{})});
  window.addEventListener('sk:ctu-excel-cleared',clearLink);
  window.addEventListener('sk:ctu-registered',event=>{
    if(!state.identity)return;const y=text(event.detail?.applicationYear),n=text(event.detail?.applicationNumber);
    if(y===state.identity.applicationYear&&n===state.identity.applicationNumber){state.expectedApplicationId=text(event.detail?.applicationId);render('linked')}
  });
  document.addEventListener('click',event=>{
    if(!event.target?.closest?.('#ctuRegisterSimple'))return;
    if(!prepareRegistration()){event.preventDefault();event.stopImmediatePropagation()}
  },true);
  document.addEventListener('input',event=>{
    if(!state.identity||!event.target?.matches?.('#ctuNewApplicationYear,#ctuNewApplicationNumber'))return;
    const mismatch=currentMismatch();render(mismatch?'warning':'linked',mismatch);
  },true);
  document.addEventListener('change',event=>{
    if(!state.identity||!event.target?.matches?.('#ctuCaseApplicationSelect,#ctuApplicationSelect'))return;
    const mismatch=currentMismatch();
    if(mismatch){event.preventDefault();event.stopImmediatePropagation();const existing=findExisting(state.identity);setSelects(existing||null);render('warning',mismatch)}
  },true);
  // Covers a page restored with importer state before this deferred bridge executed.
  const existingState=window.ISSCTUExcelRoute?.getState?.()?.fields||{};if(normalizedIdentity(existingState))linkImportedIdentity(existingState);
  window.SKCTUApplicationNumberLinkV1390={getState:()=>JSON.parse(JSON.stringify(state)),normalizedIdentity,findExisting,prepareRegistration,linkImportedIdentity,clearLink};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1390-ctu-application-number-registration-link.js':'v1.3.90'});
})();
