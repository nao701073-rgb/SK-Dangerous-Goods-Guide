(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const num=id=>Math.max(0,Number($(id)?.value)||0);
  let timer=null;
  function directNeedsMsl(){const method=$('quickMethod')?.value||'',category=$('quickMaterialCategory')?.value||'';return method==='direct'&&(category==='lashing'||category==='combined')}
  function evidenceOk(){if(!directNeedsMsl())return true;const cards=Array.from(document.querySelectorAll('#part570EvidenceGrid article'));return cards.length>=2&&cards.every(card=>card.classList.contains('is-ok'))}
  function reviewComplete(){try{return Boolean(window.SKCTUReview?.isComplete?.())}catch{return false}}
  function checks(){
    const category=$('quickMaterialCategory')?.value||'tensile',method=$('quickMethod')?.value||'direct',out=[];
    out.push({key:'mass',label:'貨物質量',ok:num('quickMass')>0,target:'quickMass',required:true});
    if(category!=='support'){
      out.push({key:'count',label:'固縛材本数',ok:num('quickCount')>0,target:'quickCount',required:true});
      out.push({key:'strength',label:method==='topover'?'確認済み強度／STF':'固縛材MSL',ok:num('quickStrength')>0,target:'quickStrength',required:true});
      if(method==='direct'){
        out.push({key:'cargoMsl',label:'貨物側MSL',ok:num('quickCargoMsl')>0,target:'quickCargoMsl',required:true});
        out.push({key:'ctuMsl',label:'CTU側MSL',ok:num('quickCtuMsl')>0,target:'quickCtuMsl',required:true});
      }
    }
    if(category==='support'||category==='combined'){
      out.push({key:'supportCount',label:'支保・当て材個数',ok:num('quickSupportCount')>0,target:'quickSupportCount',required:true});
      out.push({key:'supportStrength',label:'確認済み支保力',ok:num('quickSupportStrength')>0,target:'quickSupportStrength',required:true});
      out.push({key:'supportBasis',label:'支保力根拠',ok:Boolean(String($('quickSupportBasis')?.value||'').trim()),target:'quickSupportBasis',required:true});
    }
    if(category==='combined')out.push({key:'combined',label:'併用成立条件',ok:Boolean($('quickCombinationConfirmed')?.checked),target:'quickCombinationConfirmed',required:true});
    if(directNeedsMsl())out.push({key:'evidence',label:'MSL入力根拠',ok:evidenceOk(),target:'part570EvidenceCheck',required:false,attention:true});
    const friction=$('quickFriction')?.value||'';out.push({key:'friction',label:'接触面状態',ok:friction!=='unknown',target:'quickFriction',required:false,attention:true});
    out.push({key:'case',label:'申請案件連携',ok:Boolean($('ctuCaseApplicationSelect')?.value||$('ctuApplicationSelect')?.value),target:'ctuCaseApplicationSelect',required:false,optional:true});
    out.push({key:'review',label:'登録前確認',ok:reviewComplete(),target:'ctuReviewPanel',required:false,optional:true});
    return out;
  }
  function ensure(){
    if($('part571Preflight'))return;
    const calc=$('quickCalcBtn'),step=calc?.closest('.quick-step');if(!step)return;
    const box=document.createElement('section');box.id='part571Preflight';box.className='part571-preflight';box.innerHTML=`<div class="part571-preflight__head"><div><span>計算前チェック</span><strong id="part571PreflightTitle">入力条件を確認中</strong><small id="part571PreflightHint">算出式や入力値は変更せず、計算前に不足・未確認だけをまとめて表示します。</small></div><button type="button" id="part571PreflightFocus">最初の不足・未確認へ</button></div><div class="part571-preflight__items" id="part571PreflightItems"></div><p class="part571-preflight__status" id="part571PreflightStatus" aria-live="polite"></p>`;
    step.insertAdjacentElement('beforebegin',box);
    $('part571PreflightFocus')?.addEventListener('click',focusFirst);
    calc.addEventListener('click',()=>{render();const box=$('part571Preflight');box?.classList.add('is-pulse');setTimeout(()=>box?.classList.remove('is-pulse'),900)},true);
  }
  function render(){
    ensure();const box=$('part571Preflight'),title=$('part571PreflightTitle'),hint=$('part571PreflightHint'),items=$('part571PreflightItems'),button=$('part571PreflightFocus'),status=$('part571PreflightStatus');if(!box||!title||!items)return;
    const list=checks(),required=list.filter(x=>x.required&&!x.ok),attention=list.filter(x=>!x.required&&!x.optional&&!x.ok),optional=list.filter(x=>x.optional&&!x.ok);
    const ready=required.length===0;box.classList.toggle('is-ready',ready&&!attention.length);box.classList.toggle('is-warning',Boolean(required.length||attention.length));
    title.textContent=required.length?`必須入力の不足 ${required.length}項目`:attention.length?`計算可能・確認推奨 ${attention.length}項目`:'主要入力・根拠確認はそろっています';
    hint.textContent=required.length?'不足項目を入力してから算出してください。既存の算出ボタンは変更していません。':attention.length?'参考算出は可能ですが、根拠・接触面状態を確認してから結果を採用してください。':optional.length?'参考算出の主要条件はそろっています。案件連携・登録前確認は結果登録時に確認してください。':'参考算出・案件登録に向けた主要確認項目がそろっています。';
    items.innerHTML=list.map(x=>`<span class="${x.ok?'is-ok':x.required?'is-missing':x.optional?'is-optional':'is-attention'}">${x.ok?'✓':x.required?'!':x.optional?'○':'△'} ${x.label}</span>`).join('');
    if(button)button.disabled=!(required.length||attention.length);
    if(status)status.textContent=required.length?`計算前：必須入力 ${required.length}項目が不足しています。`:attention.length?`計算前：必須入力はそろっています。確認推奨 ${attention.length}項目があります。`:'計算前：主要入力・MSL根拠の確認状態に大きな不足はありません。';
  }
  function focusFirst(){
    const item=checks().find(x=>!x.ok&&(x.required||x.attention));if(!item)return;const target=$(item.target)||document.querySelector(`#${item.target}`);if(!target)return;
    const details=target.closest?.('details');if(details)details.open=true;
    target.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>target.focus?.({preventScroll:true}),220);
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,45)}
  document.addEventListener('input',schedule);document.addEventListener('change',schedule);window.addEventListener('iss:applications-changed',schedule);
  const evidence=$('part570EvidenceGrid');if(evidence)new MutationObserver(schedule).observe(evidence,{subtree:true,childList:true,attributes:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,130)):setTimeout(render,130);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part571.js':'part571'});
})();
