(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id),qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  const normalize=v=>String(v??'').trim().replace(/\s+/g,' '),un=v=>normalize(v).replace(/^UN\s*/i,'');
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fieldLabels={unNumber:'国連番号',originalName:'品名・原文',properShippingNameJa:'品名',properShippingNameEn:'英語品名',classDivision:'等級',class:'等級',packingGroup:'容器等級',containerCode:'容器コード',packageCount:'個数',totalNetMassKg:'総N/W',totalGrossMassKg:'総G/W',netMassPerPackageKg:'1容器N/W',grossMassPerPackageKg:'1容器G/W',packingInstruction:'包装要件'};
  const importantCargo=new Set(['unNumber','originalName','properShippingNameJa','properShippingNameEn','classDivision','class','packingGroup','containerCode','packageCount','totalNetMassKg','netMassPerPackageKg','packingInstruction']);
  const basic=[['intakeApplicantName','applicantName','申請者・依頼元',false],['intakeShipper','shipper','荷主・荷送人',false],['intakeCaseTitle','caseTitle','案件名',false],['intakeVesselName','vesselName','船名',true],['intakeVoyageNumber','voyageNumber','航海番号',false],['intakeContainerNumber','containerNumber','コンテナ番号',true],['intakeContainerType','containerType','コンテナ種類',true],['intakeLoadingPort','loadingPort','船積港',false],['intakeDischargePort','dischargePort','陸揚港',false],['intakeInspectionPlannedDate','inspectionPlannedDate','検査予定日',true],['intakeInspectionDate','inspectionDate','検査実施日',true]];
  let timer=null,priorityIndex=0;
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function app(){return apps().find(a=>String(a.id)===String(requestedId))||null}
  function prevCargo(a){return Array.isArray(a?.caseData?.cargoItems)?a.caseData.cargoItems:Array.isArray(a?.cargoItems)?a.cargoItems:[]}
  function appValue(a,key){return [a?.[key],a?.caseData?.[key],a?.caseData?.intake?.[key]].find(v=>v!==undefined&&v!==null)??''}
  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function rowData(row){const out={};qa('[data-cargo-field]',row).forEach(node=>{if(node.dataset.cargoField)out[node.dataset.cargoField]=node.type==='checkbox'?Boolean(node.checked):node.value});return out}
  function diffItems(){
    const a=app();if(!a)return {important:[],other:[]};const prev=prevCargo(a),currentRows=rows(),used=new Set(),important=[],other=[];
    basic.forEach(([id,key,label,isImportant])=>{const node=$(id);if(!node)return;const before=normalize(appValue(a,key)),now=normalize(node.value);if(before===now)return;const item={key:`basic:${key}`,label,detail:`${before||'―'} → ${now||'―'}`,target:node,important:isImportant};(isImportant?important:other).push(item)});
    currentRows.forEach((row,index)=>{const cur=rowData(row),curUn=un(cur.unNumber);let pi=-1;if(curUn)pi=prev.findIndex((p,i)=>!used.has(i)&&un(p.unNumber)===curUn);if(pi<0&&index<prev.length&&!used.has(index))pi=index;
      if(pi<0){important.push({key:`cargo:add:${index}`,label:`追加・UN${curUn||'未入力'}`,detail:'今回の申請書に追加された危険物明細です。',target:row,important:true});return}
      used.add(pi);const before=prev[pi]||{};const keys=new Set(Object.keys(cur));const changes=[];keys.forEach(key=>{if(['id','applicationId','source','review','reviewStatus','precheck'].includes(key))return;const p=normalize(before[key]),n=normalize(cur[key]);if(p===n||(!p&&!n))return;changes.push({key,label:fieldLabels[key]||key,prev:p||'―',now:n||'―',important:importantCargo.has(key)})});
      if(!changes.length)return;const high=changes.some(x=>x.important),target=high?important:other;target.push({key:`cargo:${index}:${curUn}`,label:`UN${curUn||un(before.unNumber)||'未入力'}・${high?'重要変更':'変更'}`,detail:changes.slice(0,4).map(x=>`${x.label}: ${x.prev} → ${x.now}`).join('／'),target:row,important:high});
    });
    prev.forEach((p,i)=>{if(!used.has(i))important.push({key:`cargo:removed:${i}`,label:`未取込・UN${un(p.unNumber)||'未入力'}`,detail:'前回登録にはありますが、今回の取込明細に見当たりません。',target:$('intakeCargoBody'),important:true})});
    return {important,other};
  }
  function snapshotData(){const data={basic:{},cargo:rows().map(rowData)};basic.forEach(([id,key])=>{const n=$(id);if(n)data.basic[key]=normalize(n.value)});return data}
  function snapshotKey(){return `skdg:part585:intake-baseline:${requestedId||'new'}`}
  function loadSnapshot(){try{return JSON.parse(sessionStorage.getItem(snapshotKey())||'null')}catch{return null}}
  function saveSnapshot(){try{sessionStorage.setItem(snapshotKey(),JSON.stringify({at:new Date().toISOString(),data:snapshotData()}));return true}catch{return false}}
  function snapshotChanges(snapshot){if(!snapshot?.data)return [];const now=snapshotData(),out=[];basic.forEach(([id,key,label])=>{const before=normalize(snapshot.data.basic?.[key]),current=normalize(now.basic?.[key]);if(before!==current)out.push({label,detail:`${before||'―'} → ${current||'―'}`,target:$(id)})});const max=Math.max(snapshot.data.cargo?.length||0,now.cargo.length);for(let i=0;i<max;i++){const before=snapshot.data.cargo?.[i],current=now.cargo[i];if(!before||!current){out.push({label:`危険物明細 ${i+1}`,detail:before?'確認基準にはありますが現在はありません':'確認基準設定後に追加されています',target:rows()[i]||$('intakeCargoBody')});continue}const keys=new Set([...Object.keys(before),...Object.keys(current)]);const changed=[];keys.forEach(key=>{if(normalize(before[key])!==normalize(current[key]))changed.push(fieldLabels[key]||key)});if(changed.length)out.push({label:`UN${un(current.unNumber)||un(before.unNumber)||'未入力'}`,detail:`変更：${changed.slice(0,5).join('・')}`,target:rows()[i]})}return out}
  function officialReady(){const issues=rows().filter(r=>r.classList.contains('part562-hard-issue')||(r.classList.contains('part561-review')&&!r.classList.contains('part562-reviewed-warning')));const reviewer=normalize($('intakeReviewer')?.value);return issues.length===0&&Boolean(reviewer)}
  function ensure(){
    if($('part585IntakePriority'))return;const anchor=$('part580IntakeWorkbench')||$('part574CompletionGuide');if(!anchor)return;
    const box=document.createElement('section');box.id='part585IntakePriority';box.className='part585-intake-priority';box.innerHTML=`<div class="part585-intake-priority__head"><div><span>重点確認・変更監視</span><strong id="part585IntakePriorityTitle">重要差分を集計中</strong><small>前回との差分のうち国連番号・分類・容器・数量などを優先表示します。「確認基準」はこのタブ内の作業補助で、正式な確認記録・登録可否には使用しません。</small></div><div class="part585-intake-priority__actions"><button type="button" class="primary-action" id="part585FocusImportant">重要差分へ</button><button type="button" id="part585SetBaseline">現在内容を確認基準にする</button><button type="button" id="part585FocusBaselineChange">基準との差分へ</button></div></div><div id="part585IntakePriorityStats" class="part585-intake-priority__stats"></div><div id="part585IntakePriorityList" class="part585-intake-priority__list"></div><p id="part585IntakePriorityStatus" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part585FocusImportant')?.addEventListener('click',focusImportant);$('part585SetBaseline')?.addEventListener('click',setBaseline);$('part585FocusBaselineChange')?.addEventListener('click',focusBaselineChange);
  }
  function focus(node){if(!node)return;node.scrollIntoView?.({behavior:'smooth',block:'center'});node.classList.add('part585-focus');setTimeout(()=>node.classList.remove('part585-focus'),1500);const input=node.matches?.('input,select,textarea,button')?node:node.querySelector?.('input:not([type=hidden]),select,textarea,button');setTimeout(()=>input?.focus?.({preventScroll:true}),180)}
  function focusImportant(){const d=diffItems().important;if(!d.length)return;priorityIndex=priorityIndex%d.length;focus(d[priorityIndex].target);priorityIndex=(priorityIndex+1)%d.length}
  function setBaseline(){const status=$('part585IntakePriorityStatus');if(!officialReady()){if(status)status.textContent='確認基準を設定する前に、危険物の要確認と原本照合者を確認してください。';return}if(saveSnapshot()){if(status)status.textContent='現在内容をこのタブ内の確認基準として記録しました。正式な確認記録・登録内容は変更していません。';render()}else if(status)status.textContent='確認基準を保存できませんでした。ブラウザのセッション保存設定を確認してください。'}
  function focusBaselineChange(){const c=snapshotChanges(loadSnapshot());if(c.length)focus(c[0].target)}
  function render(){
    ensure();const box=$('part585IntakePriority'),check=$('intakeCheckSection');if(!box||!check)return;box.hidden=check.hidden;if(box.hidden)return;const d=diffItems(),snap=loadSnapshot(),changes=snapshotChanges(snap),important=d.important.length,other=d.other.length;
    $('part585IntakePriorityTitle').textContent=important?`重要差分 ${important}件を優先確認`:(other?`その他差分 ${other}件があります`:'前回との主要差分はありません');
    $('part585IntakePriorityStats').innerHTML=`<span class="${important?'is-warning':'is-ok'}"><small>重要差分</small><strong>${important}件</strong></span><span class="${other?'is-note':'is-ok'}"><small>その他差分</small><strong>${other}件</strong></span><span class="${!snap?'is-note':changes.length?'is-warning':'is-ok'}"><small>確認基準</small><strong>${!snap?'未設定':changes.length?`設定後変更 ${changes.length}件`:'変更なし'}</strong></span><span class="${officialReady()?'is-ok':'is-warning'}"><small>公式確認状態</small><strong>${officialReady()?'主要確認済み':'確認作業中'}</strong></span>`;
    $('part585IntakePriorityList').innerHTML=important?d.important.slice(0,5).map((x,i)=>`<button type="button" data-part585-priority="${i}"><strong>${esc(x.label)}</strong><small>${esc(x.detail)}</small></button>`).join(''):'<p>重要差分はありません。Part 580のまとめ確認ナビで残りの確認状態を確認してください。</p>';
    qa('[data-part585-priority]',box).forEach(btn=>btn.addEventListener('click',()=>focus(d.important[Number(btn.dataset.part585Priority)]?.target)));
    const f=$('part585FocusImportant');if(f){f.disabled=!important;f.textContent=important?`重要差分へ（${important}件）`:'重要差分なし'}const bc=$('part585FocusBaselineChange');if(bc){bc.disabled=!changes.length;bc.textContent=changes.length?`基準との差分へ（${changes.length}件）`:'基準との差分なし'};
    const status=$('part585IntakePriorityStatus');if(status&&!status.textContent)status.textContent=snap?`確認基準：${new Date(snap.at).toLocaleString('ja-JP')}。設定後に入力を変更した場合はここで検知します。`:'主要確認完了後に「現在内容を確認基準にする」を押すと、その後の変更をこのタブ内で検知できます。';
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,80)}
  ['input','change'].forEach(ev=>document.addEventListener(ev,schedule));document.addEventListener('click',e=>{if(/^part(568|570|573|574|580)/.test(String(e.target?.id||'')))setTimeout(render,100)});const body=$('intakeCargoBody');if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true});window.addEventListener('iss:applications-changed',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,320)):setTimeout(render,320);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part585.js':'part585'});
})();
