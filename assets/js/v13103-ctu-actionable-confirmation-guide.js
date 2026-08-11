(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':'&quot;',"'":'&#39;'}[c]));
  const circled={1:'①',2:'②',3:'③',4:'④',5:'⑤',6:'⑥',7:'⑦'};
  let timer=0;

  function ensure(){
    if($('ctuActionGuide'))return $('ctuActionGuide');
    const overall=$('overall'); if(!overall)return null;
    const box=document.createElement('section');
    box.id='ctuActionGuide'; box.className='ctu-action-guide'; box.hidden=true;
    box.setAttribute('aria-live','polite');
    box.innerHTML=`
      <div class="ctu-action-guide__head">
        <div><span class="ctu-action-guide__eyebrow">要確認を解消するには</span><strong id="ctuActionGuideTitle">確認が必要な入力を表示します</strong><small id="ctuActionGuideHint">各項目の「入力欄へ」を押すと、該当するStepと入力欄へ移動します。</small></div>
        <button type="button" class="ctu-action-guide__recalc" id="ctuActionGuideRecalc">入力後に再算出</button>
      </div>
      <div class="ctu-action-guide__items" id="ctuActionGuideItems"></div>
    `;
    overall.insertAdjacentElement('afterend',box);
    box.addEventListener('click',ev=>{
      const go=ev.target.closest('[data-ctu-action-target]');
      if(go){ev.preventDefault();focusTarget(go.dataset.ctuActionTarget,go.dataset.ctuActionSelector||'');return}
      if(ev.target.closest('#ctuActionGuideRecalc')){$('quickCalcBtn')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('quickCalcBtn')?.focus({preventScroll:true}),280)}
    });
    return box;
  }

  function reveal(target){
    let node=target;
    while(node&&node!==document.body){
      if(node.tagName==='DETAILS')node.open=true;
      if(node.hidden){
        const id=node.id||'';
        // Do not expose intentionally unused Step 5 panels. Only reveal a hidden wrapper
        // when it directly owns the requested field.
        if(/Field$|Panel$|Details$/.test(id))node.hidden=false;
      }
      node=node.parentElement;
    }
    if(target.closest?.('.advanced-section')){
      document.body.classList.add('show-advanced');
      const toggle=$('toggleAdvanced'); if(toggle){toggle.textContent='詳細設定を閉じる';toggle.setAttribute('aria-expanded','true')}
    }
  }

  function focusTarget(id,selector){
    let target=id?$(id):null;
    if(!target&&selector)target=document.querySelector(selector);
    if(!target)return;
    reveal(target);
    const block=target.closest('[data-ctu-step],.quick-step,.panel,.ctu-step6-section,.case-section')||target;
    block.scrollIntoView?.({behavior:'smooth',block:'center'});
    target.classList.add('ctu-action-target-focus');
    block.classList.add('ctu-action-block-focus');
    setTimeout(()=>{
      target.classList.remove('ctu-action-target-focus');
      block.classList.remove('ctu-action-block-focus');
    },2200);
    if(/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(target.tagName))setTimeout(()=>target.focus?.({preventScroll:true}),380);
  }

  function progressItems(){
    let state=null; try{state=window.SKCTUProgressAPI?.evaluate?.()}catch(_){ }
    if(!state)return [];
    return [
      ...(state.missing||[]).map(x=>({kind:'missing',step:x.step||0,label:x.label,target:x.id,source:'入力状況'})),
      ...(state.review||[]).map(x=>({kind:'review',step:x.step||0,label:x.label,target:x.id,source:'入力状況'}))
    ];
  }

  function rowTarget(index,cls,quickId){
    if(index===1&&$(quickId))return {target:quickId,selector:''};
    return {target:'',selector:`#lashings .lashing-row:nth-child(${index}) .${cls}`};
  }

  function currentKind(target,fallback='review'){
    const el=target?$(target):null;
    if(!el)return fallback;
    const raw=String(el.value??'').trim();
    if(el.type==='number'){const n=Number(raw);if(!raw||!Number.isFinite(n)||n<=0)return'missing'}
    if((el.tagName==='SELECT'||el.tagName==='INPUT'||el.tagName==='TEXTAREA')&&!raw&&el.type!=='checkbox')return'missing';
    return fallback;
  }

  function mapResultIssue(text){
    const issue=String(text||'').trim();
    let m;
    if((m=issue.match(/^固縛器具(\d+)の固縛材MSL$/))){const t=rowTarget(Number(m[1]),'msl','quickStrength');return {kind:currentKind(t.target,'review'),step:5,label:issue,...t,source:'算出結果'}}
    if((m=issue.match(/^固縛器具(\d+)の貨物側取付部MSL$/))){const t=rowTarget(Number(m[1]),'cargoMsl','quickCargoMsl');return {kind:currentKind(t.target,'review'),step:5,label:issue,...t,source:'算出結果'}}
    if((m=issue.match(/^固縛器具(\d+)の(?:CTU側|船側)固縛点MSL$/))){const t=rowTarget(Number(m[1]),'ctuMsl','quickCtuMsl');return {kind:currentKind(t.target,'review'),step:5,label:issue,...t,source:'算出結果'}}
    if((m=issue.match(/^固縛器具(\d+)のSTF$/))){const t=rowTarget(Number(m[1]),'stf','quickStrength');return {kind:currentKind(t.target,'review'),step:5,label:issue,...t,source:'算出結果'}}
    if(/CTU境界抵抗/.test(issue)){
      const preset=String($('wallCtuPresetQuick')?.value||'');
      const payload=Number($('wallPayloadQuick')?.value)||0;
      const target=(!preset||preset==='none')?'wallCtuPresetQuick':payload<=0?'wallPayloadQuick':'wallGapAssistPanel';
      return {kind:'review',step:6,label:issue,target,source:'算出結果'};
    }
    if(issue==='摩擦係数の適用根拠')return {kind:'review',step:4,label:'接触面・摩擦係数の適用根拠',target:'v1ContactStep',source:'算出結果'};
    if(issue==='支保・当て材の確認済み支保力')return {kind:currentKind('quickSupportStrength','review'),step:5,label:issue,target:'quickSupportStrength',source:'算出結果'};
    if(issue==='支保・当て材の支保力根拠')return {kind:'review',step:5,label:issue,target:'quickSupportBasis',source:'算出結果'};
    if(issue==='木材支保の厚さw')return {kind:'missing',step:5,label:'木材支保の厚さ w',target:'quickTimberThicknessW',source:'算出結果'};
    if(issue==='木材支保の高さh')return {kind:'missing',step:5,label:'木材支保の高さ h',target:'quickTimberHeightH',source:'算出結果'};
    if(issue==='木材支保の自由長L')return {kind:'missing',step:5,label:'木材支保の自由長 L',target:'quickTimberFreeLengthL',source:'算出結果'};
    if(issue==='木材支保の寸法・自由長・施工状態')return {kind:'review',step:5,label:issue,target:'quickTimberDimensionsConfirmed',source:'算出結果'};
    if(issue==='CSS Code Annex 13の適用範囲／Cargo Securing Manual')return {kind:'review',step:5,label:issue,target:'cssScopeConfirmed',source:'算出結果'};
    if(issue==='認証摩擦材の適用根拠')return {kind:'review',step:4,label:issue,target:'cssContactMaterial',source:'算出結果'};
    return {kind:'review',step:7,label:issue,target:'resultTable',source:'算出結果'};
  }

  function resultItems(){
    if(window.SKCTUProgressState?.dirtyAfterCalculation)return [];
    const result=window.SKCTULatestResult;
    if(!result||result.overall!=='要確認'||!Array.isArray(result.directions))return [];
    const issues=[];
    result.directions.filter(x=>x?.applicable&&x?.status==='要確認').forEach(x=>(x.confirmationIssues||[]).forEach(issue=>issues.push(mapResultIssue(issue))));
    return issues;
  }

  function dedupe(items){
    const out=[],seen=new Set();
    items.forEach(x=>{
      if(!x||!x.label)return;
      const locator=x.target||x.selector||x.label;const key=`${x.kind}|${x.step}|${locator}`;
      if(seen.has(key))return; seen.add(key); out.push(x);
    });
    return out;
  }

  function render(){
    const box=ensure(); if(!box)return;
    const overallText=String($('overall')?.textContent||'').replace(/\s+/g,' ').trim();
    const progress=progressItems(),results=resultItems();
    const items=dedupe([...progress,...results]);
    const dirty=Boolean(window.SKCTUProgressState?.dirtyAfterCalculation);
    const unresolved=items.length>0||(!dirty&&/要確認|不足/.test(overallText));
    box.hidden=!unresolved;
    if(!unresolved)return;

    const missing=items.filter(x=>x.kind==='missing'),review=items.filter(x=>x.kind!=='missing');
    const title=$('ctuActionGuideTitle'),hint=$('ctuActionGuideHint'),list=$('ctuActionGuideItems');
    if(title)title.textContent=missing.length&&review.length?`入力不足 ${missing.length}件・確認待ち ${review.length}件`:missing.length?`入力不足 ${missing.length}件`:review.length?`確認待ち ${review.length}件`:'確認が必要な項目があります';
    if(hint)hint.textContent=missing.length?'まず「入力不足」を埋め、その後「確認待ち」を確認して再算出してください。':'各項目の入力・確認後に「この条件で算出する」をもう一度実行してください。';
    if(!list)return;
    if(!items.length){list.innerHTML='<div class="ctu-action-guide__fallback"><strong>⑦ 詳細結果を確認</strong><span>方向別の詳細結果に確認事項があります。</span><button type="button" data-ctu-action-target="resultTable">詳細結果へ</button></div>';return}
    list.innerHTML=items.map((x,i)=>{
      const badge=x.kind==='missing'?'入力不足':'確認待ち';
      const step=x.step?circled[x.step]||String(x.step):'';
      return `<article class="ctu-action-guide__item ${x.kind==='missing'?'is-missing':'is-review'}">
        <div class="ctu-action-guide__item-main"><span class="ctu-action-guide__badge">${badge}</span><strong>${step?`${step} `:''}${esc(x.label)}</strong><small>${x.kind==='missing'?'値を入力してください。':'値・根拠・成立条件を確認してください。'}</small></div>
        <button type="button" data-ctu-action-target="${esc(x.target||'')}" data-ctu-action-selector="${esc(x.selector||'')}">${x.kind==='missing'?'入力欄へ':'確認欄へ'}</button>
      </article>`;
    }).join('');
  }

  function schedule(){clearTimeout(timer);timer=setTimeout(render,50)}
  ['input','change'].forEach(type=>document.addEventListener(type,schedule,true));
  ['sk:ctu-calculated','sk:ctu-restored','sk:ctu-confirm-all-applied','sk:ctu-wall-gap-updated','sk:ctu-friction-updated','sk:ctu-system-applied'].forEach(type=>window.addEventListener(type,()=>setTimeout(render,0)));
  window.SKCTUActionGuide={render,focusTarget,progressItems,resultItems};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(render,180),{once:true});else setTimeout(render,180);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v13103-ctu-actionable-confirmation-guide.js':'v1.3.109-step-confirmation'});
})();
