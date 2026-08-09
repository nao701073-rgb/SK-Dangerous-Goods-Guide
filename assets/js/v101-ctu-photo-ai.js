(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const set=(id,value)=>{const el=$(id);if(!el||value==null||value==='')return;el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}))};

  /* 1. Application document first. Reuse the existing importer and route estimator. */
  const excel=$('ctuExcelRoutePanel'),quick=$('quickEntryPanel');
  // v1.3.6: source panels ship in the correct static HTML order; never relocate them after paint.
  if(excel){excel.classList.add('v101-first-step');}
  const excelNotice=excel?.querySelector('.notice.info');if(excelNotice)excelNotice.textContent='最初に申請書を読み込みます。貨物情報・船積港・陸揚港など、取得できた項目だけ候補入力し、航路から海域候補を表示します。申請書がない場合は、そのまま下の入力へ進めます。';
  if(excel&&!$('v101RouteStatus')){const p=document.createElement('p');p.id='v101RouteStatus';p.className='v101-route-status';p.textContent='申請書を読み込むと、貨物情報と航路・海域候補の確認を続けて行えます。';excel.append(p)}
  const stepHeads=[...document.querySelectorAll('#quickEntryPanel .quick-step__head')];
  if(stepHeads[0])stepHeads[0].innerHTML='<span class="quick-step__num">2</span>輸送条件と貨物を確認';
  const photo=$('v1PhotoStep'),contact=$('v1ContactStep');
  if(photo)photo.querySelector('.v1-step-no').textContent='3';
  if(contact)contact.querySelector('.v1-step-no').textContent='5';
  if(stepHeads[1])stepHeads[1].innerHTML='<span class="quick-step__num">6</span>不足項目だけ補う';
  if(stepHeads[2])stepHeads[2].innerHTML='<span class="quick-step__num">7</span>参考算出';

  function autoInferRoute(){
    const status=$('v101RouteStatus'),load=$('loadingPort')?.value?.trim(),dis=$('dischargePort')?.value?.trim();
    if(load&&dis&&$('inferSeaArea')){status.textContent=`${load} → ${dis} の航路から海域候補を確認しています。`;$('inferSeaArea').click();setTimeout(()=>{const t=$('routeEstimate')?.textContent?.trim();status.textContent=t?`海域候補：${t}`:'航路情報を読み込みました。表示された輸送条件を確認してください。'},250)}
    else if(status)status.textContent='申請書から航路を特定できない場合は、輸送条件だけ手動で選択してください。';
  }
  window.addEventListener('sk:ctu-excel-imported',()=>setTimeout(autoInferRoute,150));

  /* 2. Photo first, then AI candidates. Use existing photo inputs/recognition so static and server-backed builds share the same flow. */
  if(photo&&!$('v101PhotoActions')){
    const body=photo.querySelector('.v1-step-body');
    const actions=document.createElement('div');actions.id='v101PhotoActions';actions.className='v101-photo-actions';actions.innerHTML='<button type="button" class="btn primary" id="v101Camera">カメラで撮影</button><button type="button" class="btn" id="v101ChoosePhoto">写真を選択</button>';
    body?.prepend(actions);
    $('v101Camera')?.addEventListener('click',()=>$('cameraInput')?.click());
    $('v101ChoosePhoto')?.addEventListener('click',()=>$('photoInput')?.click());
  }
  if(photo&&!$('v101AiAssist')){
    const choice=photo.querySelector('.v1-choice-grid');
    const box=document.createElement('section');box.id='v101AiAssist';box.className='v101-ai-box';box.innerHTML=`<div class="v101-ai-head"><div><h3>4．AI候補を確認</h3><p>写真から分かる範囲を候補表示します。自動確定せず、検査員が採用する候補だけ選びます。</p></div><button class="btn" type="button" id="v101AnalyzePhoto">AI候補を更新</button></div><div id="v101AiCandidates" class="v101-ai-candidates"><div class="v101-ai-card"><strong>写真を選択してください</strong><p>候補が出ない項目は、そのまま手入力できます。</p></div></div><p id="v101AiStatus" class="v101-ai-status">写真の内容だけでMSL・安全性を確定しません。</p><div class="v101-photo-actions"><button class="btn primary" type="button" id="v101ApplyAi">採用した候補を入力欄へ反映</button></div>`;
    choice?.before(box);
  }

  function copyPhotoPreview(){
    const preview=$('v1PhotoPreview'),empty=$('v1PhotoEmpty'),canvas=$('photoCanvas');if(!preview)return;
    try{if(canvas&&!canvas.hidden&&canvas.width&&canvas.height){preview.src=canvas.toDataURL('image/jpeg',.86);preview.hidden=false;if(empty)empty.hidden=true}}catch(_){}
  }
  function rowValue(cell){
    if(!cell)return'';const input=cell.querySelector('input:not([type=checkbox]),select,textarea');if(input)return input.tagName==='SELECT'?(input.selectedOptions[0]?.textContent||input.value):(input.value||'');return(cell.textContent||'').trim();
  }
  function renderCandidates(){
    const out=$('v101AiCandidates'),rows=[...document.querySelectorAll('#fieldSecuringElementRows tr')].filter(r=>r.cells?.length>1&&!/候補はまだありません/.test(r.textContent||''));if(!out)return;
    const summary=$('fieldPhotoAnalysisSummary')?.textContent||'';
    const cards=[];
    rows.forEach((r,i)=>{
      const vals=[...r.cells].map(rowValue);const cb=r.querySelector('input[type=checkbox]');
      const title=vals[0]||`候補${i+1}`,details=[vals[1],vals[2],vals[3],vals[4],vals[5]].filter(Boolean).join(' ／ '),conf=vals[6]||'AI候補';
      cards.push(`<div class="v101-ai-card"><strong>${esc(title)}</strong><p>${esc(details||conf)}</p><label><input type="checkbox" data-ai-row="${i}" ${cb?.checked?'checked':''}>この候補を採用</label></div>`);
    });
    const low=(summary+' '+rows.map(r=>r.textContent||'').join(' ')).toLowerCase();
    const surfaceHints=[];
    const add=(label,target,value)=>surfaceHints.push(`<div class="v101-ai-card"><strong>${esc(label)}</strong><p>写真読取結果に関連する表記が見つかりました。</p><label><input type="checkbox" data-ai-set="${target}|${value}">この候補を採用</label></div>`);
    if(/プラスチック|plastic|樹脂/.test(low))add('貨物側：プラスチック候補','v1CargoSurface','plastic');
    if(/木材|木製|wood|timber|パレット/.test(low))add('貨物側：木・木製パレット候補','v1CargoSurface','wood');
    if(/金属|steel|metal|鋼/.test(low)){add('貨物側：金属候補','v1CargoSurface','metal');add('床側：金属床・鋼板候補','v1FloorSurface','steel')}
    if(/ゴム|rubber/.test(low)){add('貨物側：ゴム面候補','v1CargoSurface','rubber');add('床側：ゴムマット候補','v1FloorSurface','rubber')}
    if(/濡れ|wet|水滴|雨/.test(low))add('接触状態：濡れている候補','v1SurfaceCondition','wet');
    if(/油|グリース|oil|grease/.test(low))add('接触状態：油・グリース候補','v1SurfaceCondition','oil');
    if(/氷|雪|霜|ice|snow|frost/.test(low))add('接触状態：霜・氷・雪候補','v1SurfaceCondition','snow');
    const msl=low.match(/msl\s*[:：]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kn|dan|n|kgf|tf)?/i);if(msl){let v=Number(msl[1]),u=(msl[2]||'kn').toLowerCase();if(u==='dan')v*=.01;else if(u==='n')v*=.001;else if(u==='kgf')v*=.00980665;else if(u==='tf')v*=9.80665;surfaceHints.push(`<div class="v101-ai-card"><strong>MSL表示候補：約 ${v.toFixed(1)} kN</strong><p>写真読取文字からの候補です。刻印を目視確認してください。</p><label><input type="checkbox" data-ai-set="v1VisibleMsl|${v.toFixed(1)}">この候補を採用</label></div>`)}
    out.innerHTML=(cards.concat(surfaceHints).join('')||'<div class="v101-ai-card"><strong>明確な候補を取得できませんでした</strong><p>写真を見ながら、下の選択欄で分かる項目だけ入力してください。</p></div>');
    out.querySelectorAll('[data-ai-row]').forEach((x)=>x.addEventListener('change',()=>{const r=rows[Number(x.dataset.aiRow)],cb=r?.querySelector('input[type=checkbox]');if(cb){cb.checked=x.checked;cb.dispatchEvent(new Event('change',{bubbles:true}))}}));
  }
  function analyze(){const status=$('v101AiStatus');copyPhotoPreview();window.dispatchEvent(new CustomEvent('sk:ctu-photo-ai-requested'));if($('fieldAnalyzePhoto')){$('fieldAnalyzePhoto').click();if(status)status.textContent='写真から候補を整理しています。候補は検査員が選択するまで確定しません。反映後も全項目を訂正できます。';setTimeout(renderCandidates,250)}else{if(status)status.textContent='写真から取得できる範囲を候補化します。反映後も全項目を訂正できます。'}}
  $('v101AnalyzePhoto')?.addEventListener('click',analyze);
  function previewFile(input){const f=input?.files?.[0],preview=$('v1PhotoPreview'),empty=$('v1PhotoEmpty');if(!f||!preview)return;const url=URL.createObjectURL(f);preview.src=url;preview.hidden=false;if(empty)empty.hidden=true;preview.onload=()=>URL.revokeObjectURL(url);setTimeout(analyze,180)}
  $('cameraInput')?.addEventListener('change',e=>previewFile(e.target));
  $('photoInput')?.addEventListener('change',e=>previewFile(e.target));
  ['sk:ctu-photo-loaded','sk:ctu-photo-applied'].forEach(name=>window.addEventListener(name,()=>{setTimeout(()=>{copyPhotoPreview();analyze()},120)}));
  const rows=$('fieldSecuringElementRows');if(rows)rows.addEventListener('change',()=>renderCandidates());
  $('v101ApplyAi')?.addEventListener('click',()=>{
    document.querySelectorAll('#v101AiCandidates [data-ai-set]:checked').forEach(x=>{const [id,value]=x.dataset.aiSet.split('|');set(id,value)});
    $('fieldApplyConfirmedElements')?.click();
    const status=$('v101AiStatus');if(status)status.textContent='選択した候補を入力欄へ反映しました。反映した項目を含め、すべて後から訂正できます。';window.dispatchEvent(new CustomEvent('sk:ctu-ai-applied')); 
  });

  /* Manual photo choices remain quick overrides and are never auto-confirmed. */
  const oldPhotoInput=$('v1PhotoInput');if(oldPhotoInput)oldPhotoInput.disabled=true;
})();
