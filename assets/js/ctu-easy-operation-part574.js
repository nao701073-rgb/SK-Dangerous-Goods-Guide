(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let last=null,timer=null;
  function raw(id){const n=$(id);if(!n)return '';return n.type==='checkbox'?(n.checked?'確認済み':'未確認'):String(n.value||'').trim()}
  function display(id){const n=$(id);if(!n)return '―';if(n.type==='checkbox')return n.checked?'確認済み':'未確認';if(n.tagName==='SELECT')return n.selectedOptions?.[0]?.textContent?.trim()||n.value||'―';return String(n.value||'').trim()||'―'}
  function validResult(){const text=String($('quickStatus')?.textContent||'').trim();return Boolean(text)&&!/必要事項を入力|入力してください|算出できません|エラー/.test(text)}
  function apps(){try{return window.ISSStorage?.getApplications?.({scope:window.ISSStorage?.isSafetyEnvironment?.()?'all':'office'})||[]}catch{return[]}}
  function currentApp(){const id=$('ctuCaseApplicationSelect')?.value||$('ctuApplicationSelect')?.value;return apps().find(a=>String(a.id)===String(id))||null}
  function appNo(a){if(!a)return '未連携';const no=a.numberType==='temporary'?(a.temporaryNumber||a.applicationNumber):a.applicationNumber;return [a.applicationYear,no].filter(Boolean).join('-')||'番号未設定'}
  function number(id){const n=Number($(id)?.value);return Number.isFinite(n)&&n>0?n:0}
  function snapshot(){
    const a=currentApp(),category=raw('quickMaterialCategory'),method=raw('quickMethod'),support=category==='support'||category==='combined';
    return {
      at:new Date(),application:appNo(a),caseTitle:a?.caseTitle||a?.caseData?.caseTitle||'',result:String($('quickStatus')?.textContent||'').replace(/\s+/g,' ').trim(),
      transport:display('quickTransport'),ctu:display('quickCtu'),mass:display('quickMass'),friction:display('quickFriction'),mu:display('quickMu'),
      category:display('quickMaterialCategory'),method:display('quickMethod'),material:display('quickMaterial'),direction:display('quickDirection'),count:display('quickCount'),strength:display('quickStrength'),basis:display('quickBasis'),
      cargoMsl:number('quickCargoMsl'),ctuMsl:number('quickCtuMsl'),adopted:String($('part567AdoptedMsl')?.textContent||'').trim()||'―',evidence:String($('part570EvidenceTitle')?.textContent||'').trim()||'根拠確認表示なし',
      support:support?{material:display('quickSupportMaterial'),direction:display('quickSupportDirection'),count:display('quickSupportCount'),strength:display('quickSupportStrength'),basis:display('quickSupportBasis'),combined:display('quickCombinationConfirmed'),isCombined:category==='combined'}:null
    };
  }
  function lines(s){
    if(!s)return [];
    const out=[`申請案件：${s.application}${s.caseTitle?`｜${s.caseTitle}`:''}`,`最終算出：${s.at.toLocaleString('ja-JP',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'})}`,`輸送条件：${s.transport}／CTU：${s.ctu}`,`貨物質量：${s.mass}／接触面：${s.friction}／摩擦係数：${s.mu}`,`固縛：${s.category}／${s.method}／${s.material}／${s.direction}／本数 ${s.count}`,`固縛材強度：${s.strength} kN／根拠：${s.basis}`,`貨物側MSL：${s.cargoMsl?s.cargoMsl.toFixed(1):'―'} kN／CTU側MSL：${s.ctuMsl?s.ctuMsl.toFixed(1):'―'} kN`,`採用MSL表示：${s.adopted}`,`MSL根拠確認：${s.evidence}`];
    if(s.support)out.push(`支保：${s.support.material}／${s.support.direction}／個数 ${s.support.count}／支保力 ${s.support.strength} kN`,`支保力根拠：${s.support.basis}${s.support.isCombined?`／併用成立条件：${s.support.combined}`:''}`);
    out.push(`算出結果：${s.result||'―'}`);return out;
  }
  function ensure(){
    const anchor=$('part573CalcChanges')||$('part572FinalGate');if(!anchor||$('part574EvidenceHandoff'))return;
    const box=document.createElement('section');box.id='part574EvidenceHandoff';box.className='part574-evidence-handoff no-print';box.innerHTML=`<div class="part574-evidence-handoff__head"><div><span>最終算出根拠メモ</span><strong id="part574EvidenceTitle">算出後に根拠要点をまとめます</strong><small id="part574EvidenceHint">コピーする内容は最後に正常算出した時点の画面内スナップショットです。計算式・保存結果は変更しません。</small></div><button type="button" id="part574CopyEvidence">根拠要点をコピー</button></div><div id="part574EvidenceGrid" class="part574-evidence-grid"></div><p id="part574EvidenceStatus" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part574CopyEvidence')?.addEventListener('click',copy);
  }
  function changedAfterCalc(){return Boolean(last&&$('part573CalcChanges')?.classList.contains('is-warning'))}
  function render(){
    ensure();const box=$('part574EvidenceHandoff'),title=$('part574EvidenceTitle'),hint=$('part574EvidenceHint'),grid=$('part574EvidenceGrid'),status=$('part574EvidenceStatus'),copyBtn=$('part574CopyEvidence');if(!box||!title||!grid)return;
    if(!last){box.classList.remove('is-ready','is-warning');title.textContent='まだ根拠メモの基準となる算出がありません';hint.textContent='「この条件で算出する」を実行すると、その時点の主要入力・MSL根拠表示・算出結果を要点化します。';grid.innerHTML='<p>参考算出後、現場引継ぎや確認記録用に要点をコピーできます。</p>';if(status)status.textContent='';if(copyBtn)copyBtn.disabled=true;return}
    const changed=changedAfterCalc();box.classList.toggle('is-ready',!changed);box.classList.toggle('is-warning',changed);title.textContent=changed?'算出後に条件変更あり・根拠メモは最終算出時点':'最終算出時点の根拠要点を保持';hint.textContent=changed?'現在入力とは異なる項目があります。再算出後に根拠メモも更新されます。':'現在入力は最終算出条件と一致しています。';
    const cards=[['申請案件',`${last.application}${last.caseTitle?`｜${last.caseTitle}`:''}`],['輸送・CTU',`${last.transport}／${last.ctu}`],['固縛条件',`${last.category}／${last.method}／${last.material}／${last.direction}`],['強度根拠',`${last.strength} kN／${last.basis}`],['採用MSL',last.adopted],['MSL根拠',last.evidence]];
    if(last.support)cards.push(['支保条件',`${last.support.material}／${last.support.direction}／${last.support.strength} kN`]);
    grid.innerHTML=cards.map(([k,v])=>`<span><small>${esc(k)}</small><strong>${esc(v||'―')}</strong></span>`).join('');if(status)status.textContent=changed?'「最終算出条件の追跡」で変更箇所を確認し、必要に応じて再算出してください。':'この表示は引継ぎ・照合用です。正式な登録結果は既存の登録操作で保存してください。';if(copyBtn)copyBtn.disabled=false;
  }
  async function copy(){if(!last)return;const text=lines(last).join('\n'),status=$('part574EvidenceStatus');try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}if(status)status.textContent='最終算出時点の根拠要点をコピーしました。'}catch{if(status)status.textContent='コピーできませんでした。画面の要点を参照してください。'}}
  function schedule(){clearTimeout(timer);timer=setTimeout(render,60)}
  $('quickCalcBtn')?.addEventListener('click',()=>setTimeout(()=>{if(validResult()){last=snapshot();render()}},60));
  ['quickTransport','quickCtu','quickMass','quickFriction','quickMu','quickMaterialCategory','quickMethod','quickMaterial','quickDirection','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickBasis','quickSupportMaterial','quickSupportDirection','quickSupportCount','quickSupportStrength','quickSupportBasis','quickCombinationConfirmed'].forEach(id=>{$(id)?.addEventListener('input',schedule);$(id)?.addEventListener('change',schedule)});
  const changeBox=$('part573CalcChanges');if(changeBox)new MutationObserver(schedule).observe(changeBox,{subtree:true,attributes:true,childList:true,characterData:true});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,210)):setTimeout(render,210);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part574.js':'part574'});
})();
