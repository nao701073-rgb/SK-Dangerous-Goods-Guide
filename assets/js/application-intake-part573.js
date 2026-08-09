(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id),qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  const normalize=v=>String(v??'').trim().replace(/\s+/g,' '),un=v=>normalize(v).replace(/^UN\s*/i,'');
  const labels={unNumber:'国連番号',originalName:'品名・原文',properShippingNameJa:'品名',properShippingNameEn:'英語品名',classDivision:'等級',class:'等級',packingGroup:'容器等級',containerCode:'容器コード',packageCount:'個数',totalNetMassKg:'総N/W',totalGrossMassKg:'総G/W',netMassPerPackageKg:'1容器N/W',grossMassPerPackageKg:'1容器G/W',packingInstruction:'包装要件'};
  const basic=[['intakeApplicantName','applicantName','申請者・依頼元'],['intakeShipper','shipper','荷主・荷送人'],['intakeCaseTitle','caseTitle','案件名'],['intakeVesselName','vesselName','船名'],['intakeVoyageNumber','voyageNumber','航海番号'],['intakeContainerNumber','containerNumber','コンテナ番号'],['intakeContainerType','containerType','コンテナ種類'],['intakeLoadingPort','loadingPort','船積港'],['intakeDischargePort','dischargePort','陸揚港'],['intakeInspectionPlannedDate','inspectionPlannedDate','検査予定日'],['intakeInspectionDate','inspectionDate','検査実施日']];
  let items=[],index=0,timer=null,checked=new Set();
  const storageKey=()=>`skdg:part573:diff-review:${requestedId||'new'}`;
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function app(){return applications().find(row=>String(row.id)===String(requestedId))||null}
  function appValue(a,key){return [a?.[key],a?.caseData?.[key],a?.caseData?.intake?.[key]].find(v=>v!==undefined&&v!==null)??''}
  function cargo(a){return Array.isArray(a?.caseData?.cargoItems)?a.caseData.cargoItems:Array.isArray(a?.cargoItems)?a.cargoItems:[]}
  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function rowData(row){const out={};qa('[data-cargo-field]',row).forEach(node=>{if(node.dataset.cargoField)out[node.dataset.cargoField]=node.type==='checkbox'?Boolean(node.checked):node.value});return out}
  function compare(prev,cur){const changes=[];new Set([...Object.keys(prev||{}),...Object.keys(cur||{})]).forEach(key=>{if(['id','applicationId','source','review','reviewStatus','precheck'].includes(key))return;const before=normalize(prev?.[key]),now=normalize(cur?.[key]);if(before!==now&&(before||now))changes.push({label:labels[key]||key,before:before||'―',now:now||'―'})});return changes}
  function key(kind,target,detail){return `${kind}|${target||''}|${detail||''}`}
  function build(){
    const a=app();if(!a||!rows().length)return [];
    const out=[],prev=cargo(a),currentRows=rows(),current=currentRows.map(rowData),used=new Set();
    basic.forEach(([id,k,label])=>{const node=$(id);if(!node)return;const before=normalize(appValue(a,k)),now=normalize(node.value);if(before!==now){const detail=`${before||'―'} → ${now||'―'}`;out.push({key:key('basic',id,detail),label,detail,target:node})}});
    current.forEach((cur,i)=>{const currentUn=un(cur.unNumber);let pi=-1;if(currentUn)pi=prev.findIndex((p,j)=>!used.has(j)&&un(p.unNumber)===currentUn);if(pi<0&&i<prev.length&&!used.has(i))pi=i;
      if(pi<0){const detail='今回の申請書に追加されています';out.push({key:key('added',i,`${currentUn}|${detail}`),label:`追加・UN${currentUn||'未入力'}`,detail,target:currentRows[i]});return}
      used.add(pi);const changes=compare(prev[pi],cur);if(changes.length){const detail=changes.map(x=>`${x.label}: ${x.before} → ${x.now}`).join('／');out.push({key:key('changed',i,`${currentUn}|${detail}`),label:`変更・UN${currentUn||un(prev[pi]?.unNumber)||'未入力'}`,detail,target:currentRows[i]})}
    });
    prev.forEach((p,i)=>{if(!used.has(i)){const pu=un(p.unNumber)||'未入力',detail='前回登録にはありますが、今回の取込明細に見当たりません';out.push({key:key('removed',i,pu),label:`未取込・UN${pu}`,detail,target:null})}});
    return out;
  }
  function loadChecked(){try{const raw=JSON.parse(sessionStorage.getItem(storageKey())||'[]');checked=new Set(Array.isArray(raw)?raw:[])}catch{checked=new Set()}}
  function saveChecked(){try{sessionStorage.setItem(storageKey(),JSON.stringify([...checked]))}catch{}}
  function ensure(){if(!requestedId||$('part573DiffNavigator'))return;const anchor=$('part572DiffBoard')||$('part571PreviousReview');if(!anchor)return;const box=document.createElement('section');box.id='part573DiffNavigator';box.className='part573-diff-nav';box.innerHTML='<div class="part573-diff-nav__head"><div><span>差分確認ナビ</span><strong id="part573DiffProgress">差分を確認中</strong><small>ここでの「差分チェック済み」はこの画面内の進捗メモです。申請書の確認済み判定や登録可否には反映しません。</small></div><button type="button" id="part573DiffNextUnchecked">未チェックへ</button></div><div class="part573-diff-current"><div><b id="part573DiffPosition">0/0</b><strong id="part573DiffLabel">差分なし</strong><small id="part573DiffDetail">前回登録内容との差分を表示します。</small></div><div class="part573-diff-current__actions"><button type="button" id="part573DiffPrev">前へ</button><button type="button" class="primary-action" id="part573DiffCheck">この差分をチェック済みにする</button><button type="button" id="part573DiffNext">次へ</button></div></div>';anchor.insertAdjacentElement('afterend',box);$('part573DiffPrev')?.addEventListener('click',()=>move(-1));$('part573DiffNext')?.addEventListener('click',()=>move(1));$('part573DiffCheck')?.addEventListener('click',mark);$('part573DiffNextUnchecked')?.addEventListener('click',nextUnchecked)}
  function focusCurrent(){const item=items[index];if(!item?.target)return;item.target.scrollIntoView?.({behavior:'smooth',block:'center'});item.target.classList.add('part573-diff-focus');setTimeout(()=>item.target?.classList.remove('part573-diff-focus'),1400);setTimeout(()=>item.target?.focus?.({preventScroll:true}),180)}
  function move(delta){if(!items.length)return;index=(index+delta+items.length)%items.length;render(false);focusCurrent()}
  function mark(){const item=items[index];if(!item)return;checked.add(item.key);saveChecked();render(false);const next=items.findIndex((x,i)=>i!==index&&!checked.has(x.key));if(next>=0){index=next;render(false);focusCurrent()}}
  function nextUnchecked(){if(!items.length)return;const pos=items.findIndex((x,i)=>i>=index&&!checked.has(x.key));const fallback=items.findIndex(x=>!checked.has(x.key));index=pos>=0?pos:fallback>=0?fallback:index;render(false);focusCurrent()}
  function render(rebuild=true){ensure();const box=$('part573DiffNavigator');if(!box)return;if(rebuild){const next=build(),keys=new Set(next.map(x=>x.key));checked=new Set([...checked].filter(k=>keys.has(k)));items=next;if(index>=items.length)index=Math.max(0,items.length-1);saveChecked()}if(!items.length){box.hidden=true;return}box.hidden=false;const done=items.filter(x=>checked.has(x.key)).length,item=items[index];$('part573DiffProgress').textContent=`全差分 ${items.length}件・チェック済み ${done}件`;$('part573DiffPosition').textContent=`${index+1}/${items.length}`;$('part573DiffLabel').textContent=item.label;$('part573DiffDetail').textContent=item.detail;$('part573DiffCheck').textContent=checked.has(item.key)?'チェック済み':'この差分をチェック済みにする';$('part573DiffCheck').disabled=checked.has(item.key);$('part573DiffPrev').disabled=items.length<2;$('part573DiffNext').disabled=items.length<2;$('part573DiffNextUnchecked').disabled=done===items.length;box.classList.toggle('is-complete',done===items.length)}
  function schedule(){clearTimeout(timer);timer=setTimeout(()=>render(true),80)}
  loadChecked();['input','change'].forEach(ev=>document.addEventListener(ev,schedule));const body=$('intakeCargoBody');if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true});window.addEventListener('iss:applications-changed',schedule);document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>render(true),160)):setTimeout(()=>render(true),160);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part573.js':'part573'});
})();
