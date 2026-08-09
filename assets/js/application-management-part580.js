(function(){
  'use strict';
  if(document.body?.dataset?.page!=='applications')return;
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let queueKey='attention',cursor=-1,timer=null;
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function appNo(a){const no=a?.numberType==='temporary'?(a?.temporaryNumber||a?.applicationNumber):a?.applicationNumber;return [a?.applicationYear,no].filter(Boolean).join('-')||'未設定'}
  function points(a){return Array.isArray(a?.ctuMslPointRegistry)?a.ctuMslPointRegistry.filter(x=>x?.planned!==false):[]}
  function classify(a){const e=a?.caseData?.intake?.reviewEvidence,p=points(a),pending=p.filter(x=>(x.reviewStatus||'unconfirmed')!=='confirmed').length;if(!e)return 'noReview';if(Number(e.unresolvedCount||0)>0)return 'reviewPending';if(p.length&&pending)return 'mslPending';return 'ready'}
  function queues(){const list=apps().slice().sort((a,b)=>String(b.updatedAt||b.createdAt||'').localeCompare(String(a.updatedAt||a.createdAt||''))),q={all:list,noReview:[],reviewPending:[],mslPending:[],ready:[],attention:[]};list.forEach(a=>{const k=classify(a);q[k].push(a);if(k!=='ready')q.attention.push(a)});return q}
  function selected(){const id=$('quickApplicationSelect')?.value;return apps().find(a=>String(a.id)===String(id))||null}
  function ensure(){
    if($('part580CaseWorkbench'))return;
    const anchor=$('part574AttentionQueue')||$('part573Handoff')||$('part572CaseChecklist')||$('part566ApplicationSelected');if(!anchor)return;
    const box=document.createElement('section');box.id='part580CaseWorkbench';box.className='part580-case-workbench';box.innerHTML=`<div class="part580-case-workbench__head"><div><span>案件ワークキュー</span><strong id="part580CaseQueueTitle">案件状況を集計中</strong><small>表示・選択だけを補助します。案件データや進捗状態は自動変更しません。</small></div><button type="button" class="primary-action" id="part580SelectNextCase">次の案件を選択</button></div><div id="part580CaseQueueTabs" class="part580-case-queue-tabs"></div><div id="part580SelectedFlow" class="part580-selected-flow"></div><p id="part580CaseQueueStatus" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part580SelectNextCase')?.addEventListener('click',selectNext);
  }
  function selectApp(id){const sel=$('quickApplicationSelect');if(!sel||!id)return;const opt=Array.from(sel.options).find(o=>String(o.value)===String(id));if(!opt)return;sel.value=String(id);sel.dispatchEvent(new Event('change',{bubbles:true}));sel.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>sel.focus?.({preventScroll:true}),180)}
  function selectNext(){const q=queues()[queueKey]||[];if(!q.length)return;const current=String($('quickApplicationSelect')?.value||''),idx=q.findIndex(a=>String(a.id)===current);cursor=idx>=0?(idx+1)%q.length:(cursor+1)%q.length;selectApp(q[cursor].id)}
  function setQueue(key){queueKey=key;cursor=-1;render();const first=queues()[key]?.[0];if(first&&key!=='all')selectApp(first.id)}
  function statusFor(a){if(!a)return [];const e=a?.caseData?.intake?.reviewEvidence,p=points(a),confirmed=p.filter(x=>(x.reviewStatus||'unconfirmed')==='confirmed').length,items=[];items.push({label:'申請書確認',ok:Boolean(e)&&Number(e.unresolvedCount||0)===0,text:!e?'記録なし':Number(e.unresolvedCount||0)?`要確認 ${Number(e.unresolvedCount)}件`:'確認済み',href:`application-intake-workflow.html?applicationId=${encodeURIComponent(a.id)}`});items.push({label:'MSL取付点',ok:!p.length||confirmed===p.length,text:p.length?`${confirmed}/${p.length}件確認済み`:'未登録',href:`ctu-securing-calculator.html?applicationId=${encodeURIComponent(a.id)}#mslPointRegistryTitle`,neutral:!p.length});items.push({label:'簡易メモ',ok:Boolean(String(a.note||'').trim()),text:String(a.note||'').trim()?'あり':'なし',href:'#quickApplicationMemo',neutral:!String(a.note||'').trim()});return items}
  function render(){
    ensure();const box=$('part580CaseWorkbench');if(!box)return;const q=queues(),selectedApp=selected(),tabs=$('part580CaseQueueTabs'),flow=$('part580SelectedFlow'),title=$('part580CaseQueueTitle'),next=$('part580SelectNextCase');
    const defs=[['attention','要確認',q.attention.length],['noReview','確認記録なし',q.noReview.length],['reviewPending','申請書要確認',q.reviewPending.length],['mslPending','MSL未確認',q.mslPending.length],['ready','主要確認済み',q.ready.length],['all','全案件',q.all.length]];
    tabs.innerHTML=defs.map(([key,label,count])=>`<button type="button" class="${queueKey===key?'is-active':''}" data-part580-queue="${key}"><span>${label}</span><strong>${count}</strong></button>`).join('');tabs.querySelectorAll('[data-part580-queue]').forEach(btn=>btn.addEventListener('click',()=>setQueue(btn.dataset.part580Queue)));
    const active=q[queueKey]||[];title.textContent=`${defs.find(x=>x[0]===queueKey)?.[1]||'案件'}：${active.length}件`;if(next){next.disabled=!active.length;next.textContent=active.length?'次の案件を選択':'対象案件なし'}
    if(!selectedApp){flow.innerHTML='<p>申請番号を選択すると、その案件の主要な確認状況と次の操作を表示します。</p>'}else{const states=statusFor(selectedApp),nextState=states.find(x=>!x.ok&&!x.neutral);flow.innerHTML=`<div class="part580-selected-flow__head"><div><small>選択中</small><strong>${esc(appNo(selectedApp))}${selectedApp.caseTitle?`｜${esc(selectedApp.caseTitle)}`:''}</strong></div><a href="application-detail.html?applicationId=${encodeURIComponent(selectedApp.id)}">申請詳細</a></div><div class="part580-selected-flow__items">${states.map(x=>`<a class="${x.ok?'is-ok':x.neutral?'is-neutral':'is-warning'}" href="${esc(x.href)}"><small>${esc(x.label)}</small><strong>${esc(x.text)}</strong></a>`).join('')}</div><p>${nextState?`次の推奨：${esc(nextState.label)}を確認してください。`:'主要な確認状況に大きな未処理はありません。固縛力算出・写真・案件詳細を必要に応じて確認してください。'}</p>`;const memo=flow.querySelector('a[href="#quickApplicationMemo"]');memo?.addEventListener('click',ev=>{ev.preventDefault();$('quickApplicationMemo')?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>$('quickApplicationMemo')?.focus?.({preventScroll:true}),180)})}
    $('part580CaseQueueStatus').textContent=active.length>1?'「次の案件を選択」で同じキュー内を順番に確認できます。':'キューの分類は現在保存されている確認記録とMSL取付点確認状況から算出しています。';
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,70)}
  $('quickApplicationSelect')?.addEventListener('change',schedule);$('quickSaveMemo')?.addEventListener('click',()=>setTimeout(render,120));window.addEventListener('iss:applications-changed',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,240)):setTimeout(render,240);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-management-part580.js':'part580'});
})();
