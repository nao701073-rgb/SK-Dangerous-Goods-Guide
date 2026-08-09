(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const ROLES={cargo:{label:'貨物側',target:'quickCargoMsl',marking:'quickCargoMslPhotoMarking',photoValue:'quickCargoMslPhotoValue'},ctu:{label:'CTU側',target:'quickCtuMsl',marking:'quickCtuMslPhotoMarking',photoValue:'quickCtuMslPhotoValue'}};
  function num(id){return Math.max(0,Number($(id)?.value)||0)}
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function currentApp(){const id=$('ctuCaseApplicationSelect')?.value||$('ctuApplicationSelect')?.value;return apps().find(app=>String(app.id)===String(id))||null}
  function registry(role){const app=currentApp(),rows=Array.isArray(app?.ctuMslPointRegistry)?app.ctuMslPointRegistry:[];return rows.filter(row=>row?.planned!==false&&row?.role===role)}
  function closeEnough(a,b){return a>0&&b>0&&Math.abs(a-b)<=Math.max(.15,Math.max(a,b)*.01)}
  function roleState(role){
    const ids=ROLES[role],target=num(ids.target),photo=num(ids.photoValue),marking=String($(ids.marking)?.value||'').trim(),rows=registry(role),confirmed=rows.filter(row=>(row.reviewStatus||'unconfirmed')==='confirmed'&&Number(row.mslKn||0)>0),registryMin=confirmed.length?Math.min(...confirmed.map(row=>Number(row.mslKn||0))):0;
    let tone='neutral',title='根拠未確認',detail='MSL値を入力した場合は、写真・刻印・銘板・仕様資料または取付点台帳と照合してください。',mismatch=false;
    if(target<=0){title='MSL未入力';detail='算出に使用するMSLを確認してください。';tone='warning'}
    else if(registryMin>0){if(closeEnough(target,registryMin)){title='取付点台帳の最小確認値と一致';detail=`MSL欄 ${target.toFixed(1)} kN／確認済み取付点最小 ${registryMin.toFixed(1)} kN（${confirmed.length}件）${photo>0&&marking?`／写真確認 ${photo.toFixed(1)} kN`:''}`;tone='ok'}else{title='取付点台帳の最小値と差異';detail=`MSL欄 ${target.toFixed(1)} kN／確認済み取付点最小 ${registryMin.toFixed(1)} kN${photo>0&&marking?`／写真確認 ${photo.toFixed(1)} kN`:''}`;tone='warning';mismatch=true}}
    else if(photo>0&&marking){if(closeEnough(target,photo)){title='写真・資料確認値と一致';detail=`MSL欄 ${target.toFixed(1)} kN／確認値 ${photo.toFixed(1)} kN`;tone='ok'}else{title='写真確認値と差異';detail=`MSL欄 ${target.toFixed(1)} kN／確認値 ${photo.toFixed(1)} kN`;tone='warning';mismatch=true}}
    else if(target>0){title='MSL値あり・根拠欄未確認';detail='写真確認欄または取付点台帳で根拠を確認できます。';tone='warning'}
    return {role,target,photo,marking,rows,confirmed,registryMin,tone,title,detail,mismatch};
  }
  function ensure(){
    const assist=$('part568FieldAssist');if(!assist||$('part570EvidenceCheck'))return;
    const box=document.createElement('section');box.id='part570EvidenceCheck';box.className='part570-evidence-check';box.innerHTML=`<div class="part570-evidence-check__head"><div><span>入力根拠確認</span><strong id="part570EvidenceTitle">MSL根拠を確認中</strong><small>入力値と写真・刻印・取付点台帳の確認値を比較します。計算値は変更しません。</small></div><button type="button" id="part570FocusEvidence">差異・未確認へ移動</button></div><div class="part570-evidence-check__grid" id="part570EvidenceGrid"></div>`;
    assist.insertAdjacentElement('afterend',box);
    $('part570FocusEvidence')?.addEventListener('click',focusProblem);
  }
  function render(){
    ensure();const box=$('part570EvidenceCheck'),grid=$('part570EvidenceGrid'),title=$('part570EvidenceTitle'),button=$('part570FocusEvidence');if(!box||!grid||!title)return;
    const method=$('quickMethod')?.value||'',category=$('quickMaterialCategory')?.value||'';box.hidden=!(method==='direct'&&(category==='lashing'||category==='combined'));if(box.hidden)return;
    const states=Object.keys(ROLES).map(roleState),problems=states.filter(s=>s.tone!=='ok');
    title.textContent=problems.length?`根拠の差異・未確認 ${problems.length}項目`:'貨物側・CTU側とも根拠確認値と整合';
    box.classList.toggle('is-ready',!problems.length);box.classList.toggle('is-warning',Boolean(problems.length));
    grid.innerHTML=states.map(s=>`<article class="is-${s.tone}"><span>${ROLES[s.role].label}MSL</span><strong>${s.title}</strong><small>${s.detail}</small><div><b>写真確認：${s.photo>0&&s.marking?'あり':'なし'}</b><b>台帳確認済み：${s.confirmed.length}件</b></div></article>`).join('');
    if(button)button.disabled=!problems.length;
  }
  function focusProblem(){
    const state=Object.keys(ROLES).map(roleState).find(s=>s.tone!=='ok');if(!state)return;
    const ids=ROLES[state.role],target=state.mismatch&&state.photo>0?$(ids.photoValue):state.target<=0?$(ids.target):state.photo<=0&&!state.registryMin?$(ids.marking):$(ids.target);
    const details=target?.closest('details');if(details)details.open=true;
    target?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>target?.focus?.({preventScroll:true}),220);
  }
  const ids=['quickMaterialCategory','quickMethod','quickCargoMsl','quickCtuMsl','quickCargoMslPhotoMarking','quickCargoMslPhotoValue','quickCtuMslPhotoMarking','quickCtuMslPhotoValue','ctuCaseApplicationSelect','ctuApplicationSelect'];
  ids.forEach(id=>{$(id)?.addEventListener('input',()=>setTimeout(render,0));$(id)?.addEventListener('change',()=>setTimeout(render,0))});
  window.addEventListener('iss:applications-changed',()=>setTimeout(render,30));
  const registryList=$('mslPointRecordList');if(registryList)new MutationObserver(()=>setTimeout(render,20)).observe(registryList,{subtree:true,childList:true,attributes:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,100)):setTimeout(render,100);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part570.js':'part570'});
})();
