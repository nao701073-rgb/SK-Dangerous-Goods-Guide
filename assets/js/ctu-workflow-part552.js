(function(){
'use strict';
const byId=id=>document.getElementById(id);
function wrapFieldsInDetails(ids, summaryText, detailId, className){
  if(byId(detailId)) return byId(detailId);
  const nodes=ids.map(byId).filter(Boolean);
  if(!nodes.length) return null;
  const first=nodes[0];
  const parent=first.parentElement;
  if(!parent) return null;
  const details=document.createElement('details');
  details.id=detailId;
  details.className=className;
  details.innerHTML=`<summary>${summaryText}</summary><div class="part552-detail-grid"></div>`;
  parent.parentNode.insertBefore(details,parent);
  const host=details.querySelector('.part552-detail-grid');
  nodes.forEach(node=>host.appendChild(node));
  return details;
}
function setupFrictionDetail(){
  const mu=byId('quickMu');
  if(!mu||byId('part552FrictionDetail')) return;
  const field=mu.parentElement;
  const details=document.createElement('details');
  details.id='part552FrictionDetail';
  details.className='part552-inline-details';
  details.innerHTML='<summary>摩擦係数の数値を確認</summary><div class="part552-detail-grid"></div>';
  field.parentNode.insertBefore(details,field);
  details.querySelector('.part552-detail-grid').appendChild(field);
  const summary=details.querySelector('summary');
  const refresh=()=>summary.textContent=`摩擦係数の数値を確認（現在 μ=${mu.value||'―'}）`;
  mu.addEventListener('input',refresh);refresh();
}
function setupSecuringDetail(){
  const existing=byId('part551OptionalSecuring');
  if(existing){
    existing.id='part552OptionalSecuring';
    existing.classList.add('part552-optional-details');
    const host=existing.querySelector('.part551-optional-grid')||existing.querySelector('div');
    ['quickCargoMslField','quickCtuMslField'].forEach(id=>{const el=byId(id);if(el&&host&&!host.contains(el))host.insertBefore(el,host.firstChild)});
    const angle=byId('quickAngle'),cargo=byId('quickCargoMsl'),ctu=byId('quickCtuMsl'),summary=existing.querySelector('summary');
    const refresh=()=>{if(summary)summary.textContent=`取付点MSL・角度・強度根拠を確認（貨物側 ${cargo?.value||'―'} kN／CTU側 ${ctu?.value||'―'} kN／角度 ${angle?.value||'―'}°）`};
    [angle,cargo,ctu].forEach(el=>el?.addEventListener('input',refresh));refresh();
    return;
  }
  const d=wrapFieldsInDetails(['quickCargoMslField','quickCtuMslField','quickAngleField','quickBasisField'],'取付点MSL・角度・強度根拠を確認','part552OptionalSecuring','part552-optional-details');
  if(!d)return;
}
function requiredState(){
  const mass=Number(byId('quickMass')?.value)||0;
  const material=String(byId('quickMaterial')?.value||'').trim();
  const count=Number(byId('quickCount')?.value)||0;
  const strength=Number(byId('quickStrength')?.value)||0;
  const missing=[];
  if(!(mass>0)) missing.push({id:'quickMass',label:'貨物質量'});
  if(!material) missing.push({id:'quickMaterial',label:'材質'});
  if(!(count>0)) missing.push({id:'quickCount',label:'本数・個数'});
  if(!(strength>0)) missing.push({id:'quickStrength',label:'確認済みMSL'});
  return {mass,material,count,strength,missing};
}
function focusMissing(item){
  const el=byId(item?.id); if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.focus(),250);
}
function setupGuidedNavigation(){
  const panel=byId('quickEntryPanel'); if(!panel)return;
  const steps=[...panel.querySelectorAll('.quick-step')];
  const nexts=[...panel.querySelectorAll('.part551-next')];
  if(nexts[0]){
    const replacement=nexts[0].cloneNode(true);nexts[0].replaceWith(replacement);
    replacement.addEventListener('click',()=>{const s=requiredState();if(!(s.mass>0)){focusMissing({id:'quickMass'});showGuide('貨物質量を入力すると次へ進めます。','warn');return}steps[1]?.scrollIntoView({behavior:'smooth',block:'start'});});
  }
  if(nexts[1]){
    const replacement=nexts[1].cloneNode(true);nexts[1].replaceWith(replacement);
    replacement.addEventListener('click',()=>{const s=requiredState();const miss=s.missing.find(x=>x.id!=='quickMass');if(miss){focusMissing(miss);showGuide(`${miss.label}を確認すると算出へ進めます。`,'warn');return}steps[2]?.scrollIntoView({behavior:'smooth',block:'start'});});
  }
}
function showGuide(text,type='info'){
  let box=byId('part552GuideMessage');
  if(!box){box=document.createElement('div');box.id='part552GuideMessage';box.className='part552-guide-message';byId('part551QuickProgress')?.insertAdjacentElement('afterend',box)}
  if(!box)return;box.className=`part552-guide-message is-${type}`;box.textContent=text;
}
function setupConditionSummary(){
  const host=byId('quickSupportNote')?.parentElement||byId('quickEntryPanel');if(!host||byId('part552ConditionSummary'))return;
  const box=document.createElement('div');box.id='part552ConditionSummary';box.className='part552-condition-summary';
  const anchor=byId('quickMslEstimatorPanel');anchor?.parentNode?.insertBefore(box,anchor);
  const refresh=()=>{const method=byId('quickMethod')?.selectedOptions?.[0]?.textContent||'―',mat=byId('quickMaterial')?.selectedOptions?.[0]?.textContent||'―',count=byId('quickCount')?.value||'―',strength=byId('quickStrength')?.value||'―',direction=byId('quickDirection')?.selectedOptions?.[0]?.textContent||'―';box.innerHTML=`<span>現在の基本条件</span><strong>${method}／${mat}／${count}本・個／MSL ${strength} kN</strong><small>${direction}</small>`};
  ['quickMethod','quickMaterial','quickCount','quickStrength','quickDirection'].forEach(id=>byId(id)?.addEventListener('input',refresh));refresh();
}
function setupCalcAndProceed(){
  const actions=byId('quickCalcBtn')?.closest('.quick-actions');if(!actions||byId('part552CalcProceed'))return;
  const btn=document.createElement('button');btn.type='button';btn.id='part552CalcProceed';btn.className='btn part552-calc-proceed';btn.textContent='算出して登録確認へ進む';actions.appendChild(btn);
  btn.addEventListener('click',()=>{
    const s=requiredState();if(s.missing.length){focusMissing(s.missing[0]);showGuide(`${s.missing[0].label}を入力・確認してください。`,'warn');return}
    byId('quickCalcBtn')?.click();
    setTimeout(()=>{const review=byId('ctuReviewSection');if(review){review.scrollIntoView({behavior:'smooth',block:'start'});showGuide('算出しました。内容を確認し、確認者と最終確認を完了すると登録できます。','ok')}},160);
  });
}
function setupReviewRegistrationGuide(){
  const review=byId('ctuReviewSection'),reg=byId('ctuRegistrationSection');if(!review||!reg||byId('part552ReviewGuide'))return;
  const guide=document.createElement('div');guide.id='part552ReviewGuide';guide.className='part552-review-guide';
  guide.innerHTML='<strong>登録まであと1段階です。</strong><span>算出内容を確認し、確認者と最終確認を完了すると登録ボタンが有効になります。</span>';
  review.insertBefore(guide,review.children[2]||null);
  const checkbox=review.querySelector('[data-ctu-review="final"]'),reviewer=byId('ctuReviewer'),register=byId('ctuRegisterSimple');
  const refresh=()=>{
    const reviewerOk=Boolean(String(reviewer?.value||'').trim()),checked=Boolean(checkbox?.checked),ready=reviewerOk&&checked&&!register?.disabled;
    guide.classList.toggle('is-ready',ready);
    guide.querySelector('strong').textContent=ready?'登録できます。':'登録まであと1段階です。';
    guide.querySelector('span').textContent=!reviewerOk?'確認者を確認してください。':!checked?'「入力値・強度根拠・算出結果を確認しました」をチェックしてください。':register?.disabled?'取付点MSLなど、登録に必要な確認事項が残っています。':'下のボタンから申請番号管理へ登録できます。';
  };
  [checkbox,reviewer].forEach(el=>el?.addEventListener('input',refresh));if(register)new MutationObserver(refresh).observe(register,{attributes:true,attributeFilter:['disabled']});refresh();
}
function setupModeBadge(){
  const panel=byId('quickEntryPanel');if(!panel||byId('part552ModeBadge'))return;
  const badge=document.createElement('div');badge.id='part552ModeBadge';badge.className='part552-mode-badge';badge.innerHTML='<strong>簡易モード</strong><span>通常は青い基本項目だけ入力してください。専門的な確認項目は必要な場合だけ開けます。</span>';
  panel.querySelector('h2')?.insertAdjacentElement('afterend',badge);
}
function setupPart552(){setupModeBadge();setupFrictionDetail();setTimeout(setupSecuringDetail,0);setupConditionSummary();setupGuidedNavigation();setupCalcAndProceed();setupReviewRegistrationGuide();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setupPart552,30)):setTimeout(setupPart552,30);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part552.js':'part552'});
