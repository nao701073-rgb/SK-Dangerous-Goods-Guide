(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const requestedId=new URLSearchParams(location.search).get('applicationId')||'';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const normalize=v=>String(v??'').trim().replace(/\s+/g,' ');
  const labels={unNumber:'国連番号',originalName:'品名・原文',properShippingNameJa:'品名',properShippingNameEn:'英語品名',classDivision:'等級',class:'等級',packingGroup:'容器等級',containerCode:'容器コード',packageCount:'個数',totalNetMassKg:'総N/W',totalGrossMassKg:'総G/W',netMassPerPackageKg:'1容器N/W',grossMassPerPackageKg:'1容器G/W',packingInstruction:'包装要件'};
  const basic=[['intakeApplicantName','applicantName','申請者・依頼元'],['intakeShipper','shipper','荷主・荷送人'],['intakeCaseTitle','caseTitle','案件名'],['intakeVesselName','vesselName','船名'],['intakeVoyageNumber','voyageNumber','航海番号'],['intakeContainerNumber','containerNumber','コンテナ番号'],['intakeContainerType','containerType','コンテナ種類'],['intakeLoadingPort','loadingPort','船積港'],['intakeDischargePort','dischargePort','陸揚港'],['intakeInspectionPlannedDate','inspectionPlannedDate','検査予定日'],['intakeInspectionDate','inspectionDate','検査実施日']];
  let timer=null;
  function applications(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function app(){return applications().find(row=>String(row.id)===String(requestedId))||null}
  function cargo(a){return Array.isArray(a?.caseData?.cargoItems)?a.caseData.cargoItems:Array.isArray(a?.cargoItems)?a.cargoItems:[]}
  function appValue(a,key){const vals=[a?.[key],a?.caseData?.[key],a?.caseData?.intake?.[key]];return vals.find(v=>v!==undefined&&v!==null)??''}
  function currentRows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function currentRowData(row){const out={};qa('[data-cargo-field]',row).forEach(node=>{const key=node.dataset.cargoField;if(key)out[key]=node.type==='checkbox'?Boolean(node.checked):node.value});return out}
  function keyUn(v){return normalize(v).replace(/^UN\s*/i,'')}
  function compareRow(prev,cur){const fields=[];const keys=new Set([...Object.keys(cur||{}),...Object.keys(prev||{})]);keys.forEach(key=>{if(['id','applicationId','source','review','reviewStatus','precheck'].includes(key))return;const a=normalize(prev?.[key]),b=normalize(cur?.[key]);if(a===b)return;if(!a&&!b)return;fields.push({key,label:labels[key]||key,prev:a||'―',now:b||'―'})});return fields}
  function buildDiff(){
    const a=app();if(!a)return null;
    const prev=cargo(a),rows=currentRows(),current=rows.map(currentRowData),used=new Set(),items=[];
    current.forEach((cur,index)=>{
      const un=keyUn(cur.unNumber);let pi=-1;
      if(un)pi=prev.findIndex((p,i)=>!used.has(i)&&keyUn(p.unNumber)===un);
      if(pi<0&&index<prev.length&&!used.has(index))pi=index;
      if(pi<0){items.push({type:'added',index,row:rows[index],un:un||'未入力',fields:[]});return}
      used.add(pi);const changes=compareRow(prev[pi],cur);items.push({type:changes.length?'changed':'same',index,row:rows[index],un:un||keyUn(prev[pi]?.unNumber)||'未入力',fields:changes});
    });
    prev.forEach((p,i)=>{if(!used.has(i))items.push({type:'removed',index:i,row:null,un:keyUn(p.unNumber)||'未入力',fields:[]})});
    const basics=basic.map(([id,key,label])=>{const node=$(id);if(!node)return null;const before=normalize(appValue(a,key)),now=normalize(node.value);return before===now?null:{id,key,label,prev:before||'―',now:now||'―'}}).filter(Boolean);
    return {items,basics};
  }
  function ensure(){
    if(!requestedId||$('part572DiffBoard'))return;
    const anchor=$('part571PreviousReview')||$('part567IntakeContext')||document.querySelector('.intake-intro');if(!anchor)return;
    const box=document.createElement('section');box.id='part572DiffBoard';box.className='part572-diff-board';box.innerHTML='<div class="part572-diff-board__head"><div><span>今回の差分</span><strong id="part572DiffTitle">前回登録内容と比較中</strong><small>差分表示は確認補助です。前回の確認済み状態や判定結果は自動で引き継ぎません。</small></div><button type="button" id="part572DiffFocus">最初の差分へ</button></div><div id="part572DiffSummary" class="part572-diff-summary"></div><div id="part572DiffList" class="part572-diff-list"></div>';
    anchor.insertAdjacentElement('afterend',box);$('part572DiffFocus')?.addEventListener('click',focusFirst);
  }
  function render(){
    ensure();const box=$('part572DiffBoard');if(!box)return;const diff=buildDiff();if(!diff){box.hidden=true;return}box.hidden=false;
    const changed=diff.items.filter(x=>x.type==='changed'),added=diff.items.filter(x=>x.type==='added'),removed=diff.items.filter(x=>x.type==='removed'),same=diff.items.filter(x=>x.type==='same');const total=changed.length+added.length+removed.length+diff.basics.length;
    $('part572DiffTitle').textContent=currentRows().length?total?`前回から差分 ${total}項目・明細があります`:'前回登録内容との主要差分はありません':'申請書取込後に差分を表示します';
    const button=$('part572DiffFocus');if(button)button.disabled=!total;
    $('part572DiffSummary').innerHTML=`<span class="${diff.basics.length?'is-warning':'is-ok'}">基本情報 ${diff.basics.length?diff.basics.length+'項目変更':'差分なし'}</span><span class="${changed.length?'is-warning':'is-ok'}">明細変更 ${changed.length}件</span><span class="${added.length?'is-warning':''}">追加 ${added.length}件</span><span class="${removed.length?'is-warning':''}">未取込 ${removed.length}件</span><span>一致 ${same.length}件</span>`;
    const chunks=[];
    diff.basics.slice(0,6).forEach(x=>chunks.push(`<button type="button" data-part572-basic="${esc(x.id)}"><strong>${esc(x.label)}</strong><small>${esc(x.prev)} → ${esc(x.now)}</small></button>`));
    [...changed,...added,...removed].slice(0,10).forEach(x=>{const label=x.type==='changed'?'変更':x.type==='added'?'追加':'未取込';const detail=x.type==='changed'?x.fields.slice(0,3).map(f=>`${f.label}: ${f.prev} → ${f.now}`).join('／'):x.type==='added'?'今回の申請書に追加されています':'前回登録にはありますが今回の取込に見当たりません';chunks.push(`<button type="button" data-part572-row="${x.row?x.index:''}" ${x.row?'':'disabled'}><strong>${label}・UN${esc(x.un)}</strong><small>${esc(detail)}</small></button>`)});
    $('part572DiffList').innerHTML=chunks.length?chunks.join(''):'<p>現在表示中の主要項目に差分はありません。数量・包装要件・原本記載は現在の確認結果で引き続き確認してください。</p>';
    qa('[data-part572-basic]',box).forEach(btn=>btn.addEventListener('click',()=>focusNode($(btn.dataset.part572Basic))));qa('[data-part572-row]',box).forEach(btn=>btn.addEventListener('click',()=>focusNode(currentRows()[Number(btn.dataset.part572Row)])));
  }
  function focusNode(node){if(!node)return;node.scrollIntoView?.({behavior:'smooth',block:'center'});node.classList.add('part572-diff-focus');setTimeout(()=>node.classList.remove('part572-diff-focus'),1500);setTimeout(()=>node.focus?.({preventScroll:true}),220)}
  function focusFirst(){const diff=buildDiff();if(!diff)return;const basicDiff=diff.basics[0];if(basicDiff){focusNode($(basicDiff.id));return}const row=diff.items.find(x=>x.type==='changed'||x.type==='added')?.row;if(row)focusNode(row)}
  function schedule(){clearTimeout(timer);timer=setTimeout(render,70)}
  ['input','change'].forEach(ev=>document.addEventListener(ev,schedule));const body=$('intakeCargoBody');if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true});window.addEventListener('iss:applications-changed',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,120)):setTimeout(render,120);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part572.js':'part572'});
})();
