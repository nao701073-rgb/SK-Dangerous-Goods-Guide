(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator'||document.documentElement.dataset.v13Ctu==='1')return;
  document.documentElement.dataset.v13Ctu='1';
  const $=id=>document.getElementById(id);
  const set=(id,value)=>{const el=$(id);if(!el||value==null||value==='')return false;el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}));return true};

  /* Material fallback: the core normally populates this. If an old cached page failed earlier, keep manual selection usable. */
  const material=$('quickMaterial');
  const tensile=[['aslash','アスラッシュ'],['steel','帯鉄'],['wire','ワイヤーロープ'],['tygard','TY-GARD'],['pet','エステルバンド（PETバンド）'],['pp','PPロープ'],['other','その他・手動確認']];
  const ensureMaterial=()=>{if(material&&material.options.length===0)material.innerHTML=tensile.map(([v,l])=>`<option value="${v}">${l}</option>`).join('')};
  ensureMaterial();

  /* v1.3.6: starting source panels are statically ordered in HTML to avoid layout shifts. */
  const excel=$('ctuExcelRoutePanel'),quick=$('quickEntryPanel'),photo=$('v1PhotoStep');
  if(excel){excel.classList.add('v136-source-application');}
  if(photo){photo.classList.add('v136-legacy-photo-step');}
  const aiTitle=$('v101AiAssist')?.querySelector('h3');if(aiTitle)aiTitle.textContent='写真AI候補を確認';
  const quickTitle=quick?.querySelector(':scope > h2');if(quickTitle)quickTitle.textContent='入力内容を確認して参考算出';
  const caseTitle=$('ctuCommonCaseTitle');if(caseTitle)caseTitle.textContent='登録済み案件を使う（必要な場合）';
  const quickHeads=[...document.querySelectorAll('#quickEntryPanel .quick-step__head')];
  if(quickHeads[0])quickHeads[0].innerHTML='<span class="quick-step__num">3</span>輸送条件と貨物を確認';
  const contact=$('v1ContactStep');if(contact){const n=contact.querySelector('.v1-step-no');if(n)n.textContent='4'}
  if(quickHeads[1])quickHeads[1].innerHTML='<span class="quick-step__num">5</span>固縛材・支保条件を確認';
  if(quickHeads[2])quickHeads[2].innerHTML='<span class="quick-step__num">6</span>参考算出';

  /* Strength-basis fields are not part of the normal field workflow in v1.3. Existing stored values are untouched. */
  $('quickBasisField')?.classList.add('v13-hide-strength-basis');
  const supportBasis=$('quickSupportBasis')?.closest('div');supportBasis?.classList.add('v13-hide-strength-basis');
  const simpleStrengthLabels=()=>{const strengthLabel=$('quickStrengthLabel');if(strengthLabel)strengthLabel.textContent=$('quickMethod')?.value==='topover'?'STF（1本当たり・kN）':'MSL（1本当たり・kN）';const supportStrength=$('quickSupportStrength')?.closest('div')?.querySelector('label');if(supportStrength)supportStrength.textContent='支保力（1個当たり・kN）';};
  simpleStrengthLabels();['quickMaterialCategory','quickMethod'].forEach(id=>$(id)?.addEventListener('change',()=>queueMicrotask(simpleStrengthLabels)));

  /* Separate lashing and support/blocking into two cards while reusing the existing calculation inputs. */
  const category=$('quickMaterialCategory');
  const step2=category?.closest('.quick-step');
  if(step2&&!$('v13ConditionCards')){
    const body=step2.querySelector('.quick-step__body');
    const oldGrid=body?.querySelector(':scope > .quick-grid');
    const support=$('quickSupportFields');
    if(oldGrid&&support){
      const categoryHolder=category.closest('div');categoryHolder.style.display='none';
      const cards=document.createElement('div');cards.id='v13ConditionCards';cards.className='v13-condition-cards';
      const lash=document.createElement('section');lash.id='v13LashingCard';lash.className='v13-condition-card';lash.innerHTML='<div class="v13-condition-card__head"><strong>① 固縛材</strong><label><input id="v13UseLashing" type="checkbox" checked>使用する</label></div><div class="v13-condition-card__body"><p class="v13-simple-note">写真のAI候補を使うか、分かる項目だけ選択してください。</p></div>';
      const block=document.createElement('section');block.id='v13SupportCard';block.className='v13-condition-card is-off';block.innerHTML='<div class="v13-condition-card__head"><strong>② 支保・あて材</strong><label><input id="v13UseSupport" type="checkbox">使用する</label></div><div class="v13-condition-card__body"><p class="v13-simple-note">木材・FRP等を併用する場合だけ入力します。強度の根拠入力は不要です。</p></div>';
      cards.append(lash,block);body.insertBefore(cards,oldGrid);
      lash.querySelector('.v13-condition-card__body').append(oldGrid);
      block.querySelector('.v13-condition-card__body').append(support);
      support.hidden=false;
      // Keep the original support heading out of the simpler card.
      support.querySelector(':scope>h3')?.classList.add('v13-hide-strength-basis');
      const syncSupportToCore=()=>{
        const useL=$('v13UseLashing')?.checked!==false,useS=Boolean($('v13UseSupport')?.checked);if(!useS||useL)return;
        set('quickCount',$('quickSupportCount')?.value||'0');set('quickStrength',$('quickSupportStrength')?.value||'0');set('quickDirection',$('quickSupportDirection')?.value||'all');
        const sm=$('quickSupportMaterial')?.value||'timber';ensureMaterial();const q=$('quickMaterial');if(q&&[...q.options].some(o=>o.value===sm))set('quickMaterial',sm);
      };
      const syncMode=()=>{
        const useL=$('v13UseLashing')?.checked!==false,useS=Boolean($('v13UseSupport')?.checked);
        lash.classList.toggle('is-off',!useL);block.classList.toggle('is-off',!useS);
        if(useL&&useS)category.value='combined';else if(useS)category.value='support';else category.value='tensile';
        category.dispatchEvent(new Event('change',{bubbles:true}));
        // Core change handler may hide the support section; v1.3 card owns visibility instead.
        support.hidden=!useS;syncSupportToCore();
      };
      $('v13UseLashing').addEventListener('change',syncMode);$('v13UseSupport').addEventListener('change',syncMode);
      ['quickSupportCount','quickSupportStrength','quickSupportDirection','quickSupportMaterial'].forEach(id=>$(id)?.addEventListener('input',syncSupportToCore));
      ['quickSupportDirection','quickSupportMaterial'].forEach(id=>$(id)?.addEventListener('change',syncSupportToCore));
      syncMode();
    }
  }

  /* AI candidate enhancement: distinguish lashing from support/blocking. Human still chooses the candidates. */
  const candidates=$('v101AiCandidates');
  function addCandidate(key,title,detail,apply,cls){
    if(!candidates||candidates.querySelector(`[data-v13-key="${key}"]`))return;
    const card=document.createElement('div');card.className=`v101-ai-card ${cls||''}`;card.dataset.v13Key=key;
    card.innerHTML=`<strong>${title}</strong><p>${detail}</p><label><input type="checkbox" data-v13-choice="${key}">この候補を採用</label>`;
    card._v13Apply=apply;candidates.append(card);
  }
  function materialValue(words){
    ensureMaterial();const opts=[...(material?.options||[])];return opts.find(o=>words.some(w=>(o.textContent+' '+o.value).toLowerCase().includes(w)))?.value||'';
  }
  function enhanceAi(){
    if(!candidates)return;const text=(candidates.textContent||'').toLowerCase();
    if(/チェーン|chain/.test(text))addCandidate('lashing-chain','固縛材：チェーン候補','写真からチェーン系固縛材の候補が見つかりました。',()=>{const x=$('v13UseLashing');if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}set('quickMaterial',materialValue(['chain'])||'other')},'v13-ai-card--lashing');
    if(/ワイヤ|wire|rope/.test(text))addCandidate('lashing-wire','固縛材：ワイヤーロープ候補','写真からワイヤー／ロープ系固縛材の候補が見つかりました。',()=>{const x=$('v13UseLashing');if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}set('quickMaterial',materialValue(['wire','rope'])||'wire')},'v13-ai-card--lashing');
    if(/ベルト|webbing|lash|アスラッシュ|polyester/.test(text))addCandidate('lashing-belt','固縛材：ベルト系候補','写真からベルト・ウェビング系固縛材の候補が見つかりました。',()=>{const x=$('v13UseLashing');if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}set('quickMaterial',materialValue(['aslash','belt','web'])||'aslash')},'v13-ai-card--lashing');
    if(/木材|timber|当て木|根止め|ショア|chock|blocking|支保/.test(text))addCandidate('support-timber','支保・あて材：木材候補','写真から木材による支保・当て材の候補が見つかりました。',()=>{const x=$('v13UseSupport');if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}set('quickSupportMaterial','timber')},'v13-ai-card--support');
    if(/frp|強化プラスチック/.test(text))addCandidate('support-frp','支保・あて材：FRP候補','写真からFRP等の支保・あて材候補が見つかりました。',()=>{const x=$('v13UseSupport');if(x){x.checked=true;x.dispatchEvent(new Event('change',{bubbles:true}))}set('quickSupportMaterial','frp')},'v13-ai-card--support');
    // Approximate angle if visible in OCR/candidate text. It remains only a selectable suggestion.
    const m=text.match(/(?:角度|angle|鉛直角)[^0-9]{0,8}(30|45|60|75)\s*°?/);if(m)addCandidate('angle-'+m[1],`鉛直角：約${m[1]}°候補`,'写真読取結果からのおおよその角度候補です。',()=>set('quickAngle',m[1]),'v13-ai-card--lashing');
  }
  if(candidates){new MutationObserver(()=>queueMicrotask(enhanceAi)).observe(candidates,{childList:true,subtree:true});enhanceAi()}

  function refreshAiSelection(){
    if(!candidates)return;const n=candidates.querySelectorAll('input[type=checkbox]:checked').length,btn=$('v101ApplyAi');
    let status=$('v13AiSelectionStatus');
    if(!status&&btn){status=document.createElement('span');status.id='v13AiSelectionStatus';status.className='v13-ai-selection-status';btn.parentNode?.insertBefore(status,btn);}
    if(status)status.textContent=`選択 ${n}件`;
    if(btn){btn.disabled=n===0;btn.textContent=n?`選んだ${n}件を入力欄へ反映`:'候補を選んでください';}
    candidates.querySelectorAll('.v101-ai-card').forEach(card=>card.classList.toggle('is-selected',Boolean(card.querySelector('input[type=checkbox]:checked'))));
  }
  candidates?.addEventListener('change',refreshAiSelection);
  queueMicrotask(refreshAiSelection);
  $('v101ApplyAi')?.addEventListener('click',()=>{
    candidates?.querySelectorAll('[data-v13-choice]:checked').forEach(cb=>cb.closest('.v101-ai-card')?._v13Apply?.());
  },true);

  /* Never auto-scroll after document/photo operations in v1.3. */
  document.documentElement.style.scrollBehavior='auto';
})();
