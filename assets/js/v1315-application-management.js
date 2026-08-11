(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='applications'||document.documentElement.dataset.v1315ApplicationManagement==='1')return;
  document.documentElement.dataset.v1315ApplicationManagement='1';
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const list=$('applicationList');
  if(!list)return;
  const scope=()=>window.ISSStorage?.isSafetyEnvironment?.()?'all':'office';
  let renderSnapshot=null;
  let dataCache=null;
  let dataCacheDirty=true;
  const groupByApplicationId=rows=>{const map=new Map();for(const row of rows||[]){const key=String(row?.applicationId??'');if(!key)continue;const bucket=map.get(key);if(bucket)bucket.push(row);else map.set(key,[row]);}return map};
  const applications=()=>{if(renderSnapshot?.applications)return renderSnapshot.applications;try{return window.ISSStorage?.getApplications?.({scope:scope()})||[]}catch{return[]}};
  const photos=()=>{if(renderSnapshot?.photos)return renderSnapshot.photos;try{return window.ISSStorage?.getPhotos?.({scope:scope(),includeDeleted:false})||[]}catch{return[]}};
  const documents=()=>{if(renderSnapshot?.documents)return renderSnapshot.documents;try{return window.ISSStorage?.getApplicationDocuments?.({scope:scope(),includeCancelled:false})||[]}catch{return[]}};
  const results=id=>{try{if(renderSnapshot?.resultsByApplication&&id!=null)return renderSnapshot.resultsByApplication.get(String(id))||[];const rows=renderSnapshot?.results||window.ISSApplicationResults?.read?.()||window.ISSApplicationResults?.get?.()||[];return id?rows.filter(r=>String(r.applicationId)===String(id)):rows}catch{return[]}};
  const displayNumber=a=>a?.numberType==='temporary'?(a.temporaryNumber||a.applicationNumber):a?.applicationNumber;
  const normalize=s=>String(s??'').replace(/\s+/g,' ').trim();
  function appFromCard(card){
    if(!card)return null;
    const direct=card.dataset.applicationId||card.querySelector('[data-application-id]')?.dataset.applicationId||card.querySelector('[data-edit-application]')?.dataset.editApplication||card.querySelector('[data-delete-application]')?.dataset.deleteApplication||card.querySelector('[data-select-photo-application]')?.dataset.selectPhotoApplication||card.querySelector('[data-select-document-application]')?.dataset.selectDocumentApplication;
    if(direct){const found=renderSnapshot?.applicationById?.get(String(direct))||applications().find(a=>String(a.id)===String(direct));if(found)return found;}
    const href=[...card.querySelectorAll('a[href]')].map(a=>a.getAttribute('href')||'').find(h=>/applicationId=/.test(h));
    if(href){try{const id=new URL(href,location.href).searchParams.get('applicationId');const found=applications().find(a=>String(a.id)===String(id));if(found)return found;}catch{}}
    const text=normalize(card.textContent);
    return applications().find(a=>{
      const year=String(a.applicationYear||'');const num=String(displayNumber(a)||'');
      return year&&num&&(text.includes(`${year}年度・${num}`)||text.includes(`${year}-${num}`)||text.includes(`${year}年度:${num}`));
    })||null;
  }
  function allowanceRegistered(app){
    const data=app?.caseData||{};const rows=Array.isArray(app?.cargoItems)?app.cargoItems:Array.isArray(data.cargoItems)?data.cargoItems:[];
    return rows.some(r=>String(r?.allowableCapacityOrMass||r?.allowedQuantityOrMass||r?.allowanceSummary||'').trim());
  }
  function registrationBadges(app){
    const rs=results(app.id);const types=new Set(rs.map(r=>r.type));const badges=[];
    const verCount=rs.filter(r=>r.type==='dangerous-goods-verification').length,ctuCount=rs.filter(r=>r.type==='ctu-securing').length;
    if(verCount||allowanceRegistered(app))badges.push({key:'verification',label:`申請確認・許容容量／質量${verCount?` ${verCount}件`:''}`});
    if(ctuCount)badges.push({key:'ctu',label:`固縛力参考算出 ${ctuCount}件`});
    const pc=renderSnapshot?.photosByApplication?.get(String(app.id))?.length??photos().filter(p=>String(p.applicationId)===String(app.id)).length;if(pc)badges.push({key:'photo',label:`写真 ${pc}枚`});
    const dc=renderSnapshot?.documentsByApplication?.get(String(app.id))?.length??documents().filter(d=>String(d.applicationId)===String(app.id)).length;if(dc)badges.push({key:'document',label:`資料 ${dc}件`});
    if(!badges.length)badges.push({key:'case',label:'案件情報'});
    return badges;
  }
  function ensureSummary(card,app){
    card.dataset.applicationId=app.id;
    card.classList.add('v1315-application-card');
    const header=card.querySelector('.application-card__header')||card.firstElementChild||card;
    header.querySelectorAll('h2,h3,.application-card__title,.case-card__title').forEach(sourceTitle=>sourceTitle.classList.add('v1315-source-title-hidden'));
    let box=card.querySelector('.v1315-registration-summary');
    if(!box){box=document.createElement('div');box.className='v1315-registration-summary';header.insertAdjacentElement('afterend',box);}
    const badges=registrationBadges(app);const signature=badges.map(x=>x.key+':'+x.label).join('|');
    if(box.dataset.signature!==signature){box.dataset.signature=signature;box.innerHTML=`<span class="v1315-registration-label">登録内容</span><div class="v1315-registration-badges">${badges.map(x=>`<span class="v1315-registration-badge v1315-registration-badge--${esc(x.key)}">${esc(x.label)}<small>登録済み</small></span>`).join('')}</div>`;}
  }
  function ensureActions(card,app){
    let actions=card.querySelector('.management-actions,.application-card__actions,.case-card__actions');
    if(!actions){actions=document.createElement('div');actions.className='management-actions v1315-card-actions';card.append(actions);}
    [...actions.querySelectorAll('a,button')].forEach(el=>{
      const text=normalize(el.textContent);
      if(/固縛力参考算出|固縛力算出/.test(text))el.classList.add('v1315-hidden-action');
      if(/詳細/.test(text)&&!el.classList.contains('v1315-detail-link'))el.classList.add('v1315-hidden-action');
      if((el.matches('[data-delete-application]')||/取消|案件を削除|削除/.test(text))&&!el.classList.contains('v1315-delete-case'))el.classList.add('v1315-hidden-action');
    });
    let detail=actions.querySelector('.v1315-detail-link');
    if(!detail){detail=document.createElement('a');detail.className='v1315-detail-link v1315-primary-action';actions.prepend(detail);}
    detail.textContent='詳細を開く';detail.dataset.label='詳細を開く';detail.setAttribute('aria-label','詳細を開く');
    detail.href=`application-detail.html?applicationId=${encodeURIComponent(app.id)}`;detail.removeAttribute('target');detail.removeAttribute('rel');
    const canDelete=window.ISSStorage?.canDeleteOperationalData?.()!==false;
    let del=actions.querySelector('.v1315-delete-case');
    if(canDelete&&!del){del=document.createElement('button');del.type='button';del.className='v1315-delete-case danger-action';del.textContent='案件を削除';del.dataset.applicationId=app.id;actions.append(del);}else if(del)del.dataset.applicationId=app.id;
  }
  let updating=false;
  function readDataSnapshot(){
    if(!dataCacheDirty&&dataCache)return dataCache;
    const applicationRows=(()=>{try{return window.ISSStorage?.getApplications?.({scope:scope()})||[]}catch{return[]}})();
    const photoRows=(()=>{try{return window.ISSStorage?.getPhotos?.({scope:scope(),includeDeleted:false})||[]}catch{return[]}})();
    const documentRows=(()=>{try{return window.ISSStorage?.getApplicationDocuments?.({scope:scope(),includeCancelled:false})||[]}catch{return[]}})();
    const resultRows=(()=>{try{return window.ISSApplicationResults?.read?.()||window.ISSApplicationResults?.get?.()||[]}catch{return[]}})();
    dataCache={
      applications:applicationRows,
      photos:photoRows,
      documents:documentRows,
      results:resultRows,
      applicationById:new Map(applicationRows.map(app=>[String(app.id),app])),
      photosByApplication:groupByApplicationId(photoRows),
      documentsByApplication:groupByApplicationId(documentRows),
      resultsByApplication:groupByApplicationId(resultRows)
    };
    dataCacheDirty=false;
    return dataCache;
  }
  function enhance(){
    if(updating)return;updating=true;
    try{
      renderSnapshot=readDataSnapshot();
      for(const card of list.children){const app=appFromCard(card);if(!app)continue;ensureSummary(card,app);ensureActions(card,app);}
    } finally {renderSnapshot=null;updating=false;}
  }
  async function deleteCase(id){
    const snapshot=readDataSnapshot();
    const app=snapshot.applicationById.get(String(id));if(!app)return;
    if(window.ISSStorage?.canDeleteOperationalData?.()===false){alert('この権限では案件を削除できません。');return;}
    const number=`${app.applicationYear||''}-${displayNumber(app)||''}`;
    if(!confirm(`申請番号 ${number} を案件ごと削除しますか。\n申請確認・固縛力参考算出の登録履歴もこの案件から削除します。`))return;
    try{
      const relatedPhotos=snapshot.photosByApplication.get(String(app.id))||[];
      relatedPhotos.forEach(p=>{try{window.ISSStorage?.removePhoto?.(p.id,{reason:'申請番号管理から案件ごと削除'});}catch{}});
      const relatedDocs=snapshot.documentsByApplication.get(String(app.id))||[];
      relatedDocs.forEach(d=>{try{window.ISSStorage?.cancelApplicationDocument?.(d.id,'申請番号管理から案件ごと削除');}catch{}});
      window.ISSApplicationResults?.removeByApplicationId?.(app.id);
      const ok=window.ISSStorage?.removeApplication?.(app.id);
      if(ok===false)throw new Error('案件を削除できませんでした。');
      window.dispatchEvent(new CustomEvent('iss:application-results-changed',{detail:{applicationId:app.id,source:'case-delete'}}));
      window.dispatchEvent(new CustomEvent('iss:applications-changed',{detail:{applicationId:app.id,source:'case-delete'}}));
      setTimeout(enhance,0);
    }catch(error){alert(error.message||'案件を削除できませんでした。');}
  }
  list.addEventListener('click',e=>{const b=e.target.closest('.v1315-delete-case');if(!b)return;e.preventDefault();e.stopPropagation();deleteCase(b.dataset.applicationId);},true);
  let enhanceTimer=0;
  const scheduleEnhance=(delay=40)=>{clearTimeout(enhanceTimer);enhanceTimer=setTimeout(enhance,delay)};
  const invalidateAndEnhance=()=>{dataCacheDirty=true;scheduleEnhance()};
  window.addEventListener('iss:applications-changed',invalidateAndEnhance);
  window.addEventListener('iss:application-results-changed',invalidateAndEnhance);
  window.addEventListener('iss:application-documents-changed',invalidateAndEnhance);
  window.addEventListener('iss:photos-changed',invalidateAndEnhance);
  // 検索文字の入力ごとの全ストレージ再読込は行わない。
  // 一覧本体が再描画された場合はMutationObserverから、同じキャッシュを使って表示補正する。
  const observer=new MutationObserver(mutations=>{if(updating)return;const structural=mutations.some(m=>m.type==='childList'&&m.target===list);if(structural)scheduleEnhance(20)});observer.observe(list,{childList:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>scheduleEnhance(0)) : scheduleEnhance(0);
})();

window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1315-application-management.js':'v1.3.29'});
