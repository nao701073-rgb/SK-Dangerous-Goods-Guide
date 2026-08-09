(function(){
'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search), resultKey=params.get('resultKey');
let dismissedFor='';
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function num(v,unit=''){const n=Number(v);return Number.isFinite(n)?`${n.toLocaleString('ja-JP',{maximumFractionDigits:3})}${unit}`:'―'}
function key(row){return String(row?.id||row?.resultId||row?.createdAt||'')}
function latest(id){try{return (window.ISSApplicationResults?.get?.(id)||[]).filter(r=>r.type==='ctu-securing'&&!r.cancelledAt).sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)))[0]||null}catch{return null}}
function selectedId(){return String($('ctuCaseApplicationSelect')?.value||'')}
function resultHref(id,row){const k=key(row);return `ctu-securing-calculator.html?applicationId=${encodeURIComponent(id)}${k?`&resultKey=${encodeURIComponent(k)}`:''}`}
function ensurePrevious(){
 const summary=$('ctuCaseSummary');if(!summary||$('part558PreviousResult'))return;
 const box=document.createElement('section');box.id='part558PreviousResult';box.className='part558-previous-result';box.hidden=true;summary.insertAdjacentElement('afterend',box);
}
function refreshPrevious(){
 ensurePrevious();const box=$('part558PreviousResult');if(!box)return;
 const id=selectedId();if(resultKey||!id||dismissedFor===id){box.hidden=true;return}
 const row=latest(id);if(!row){box.hidden=true;return}
 const p=row.payload||{},i=p.inputs||{},q=i.quickSecuring||{},worst=Number(p.worstMargin),hasWorst=Number.isFinite(worst);
 box.hidden=false;box.innerHTML=`<div class="part558-previous-head"><div><span>この申請には登録済みの固縛力算出があります</span><strong>最新版：${esc(p.overall||'要確認')}</strong><p>${row.createdAt?esc(new Date(row.createdAt).toLocaleString('ja-JP')):'日時不明'}に登録された条件を再利用できます。</p></div><span class="part558-previous-badge">再入力を省略</span></div><div class="part558-previous-grid"><div><span>貨物質量</span><strong>${num(i.mass,' t')}</strong></div><div><span>固縛方法</span><strong>${esc(q.method||'―')}</strong></div><div><span>本数・個数</span><strong>${num(q.count)}</strong></div><div><span>最厳方向</span><strong>${hasWorst?num(worst,' kN'):'―'}</strong></div></div><div class="part558-previous-actions"><a class="is-primary" href="${resultHref(id,row)}">最新版の条件を読み込んで再計算</a><button type="button" id="part558ContinueNew">新しい条件で続ける</button></div>`;
 $('part558ContinueNew')?.addEventListener('click',()=>{dismissedFor=id;box.hidden=true;$('quickEntryPanel')?.scrollIntoView({behavior:'smooth',block:'start'});});
}
function inputChecks(){
 const method=String($('quickMethod')?.value||''),category=String($('quickMaterialCategory')?.value||''),direct=method==='direct'&&category!=='support';
 const checks=[
  {id:'quickMass',label:'貨物質量を0より大きい値で入力',ok:Number($('quickMass')?.value)>0},
  {id:'quickCount',label:'本数・個数を1以上で入力',ok:Number.isInteger(Number($('quickCount')?.value))&&Number($('quickCount')?.value)>0},
  {id:'quickStrength',label:category==='support'?'確認済み支保力を入力':'確認済みMSL/STFを入力',ok:Number($('quickStrength')?.value)>0}
 ];
 if(direct){
  checks.push({id:'quickCargoMsl',label:'貨物側取付部MSLを確認',ok:Number($('quickCargoMsl')?.value)>0});
  checks.push({id:'quickCtuMsl',label:'CTU側固縛点MSLを確認',ok:Number($('quickCtuMsl')?.value)>0});
  const a=Number($('quickAngle')?.value);checks.push({id:'quickAngle',label:'鉛直角を0～90°で確認',ok:Number.isFinite(a)&&a>=0&&a<=90});
 }
 if(category==='combined'){
  checks.push({id:'quickSupportCount',label:'併用する支保材の個数を確認',ok:Number($('quickSupportCount')?.value)>0});
  checks.push({id:'quickSupportStrength',label:'併用する支保力を確認',ok:Number($('quickSupportStrength')?.value)>0});
 }
 return checks;
}
function ensureInputGuide(){
 const completion=$('part553Completion')||$('quickEntryPanel');if(!completion||$('part558InputGuide'))return;
 const box=document.createElement('section');box.id='part558InputGuide';box.className='part558-input-guide';box.setAttribute('aria-live','polite');box.innerHTML='<div class="part558-input-head"><div><span>入力ミス防止チェック</span><strong id="part558InputState">確認中</strong></div><button type="button" id="part558FocusIssue">要確認項目へ</button></div><div id="part558InputIssues" class="part558-input-issues"></div>';
 completion.appendChild(box);$('part558FocusIssue')?.addEventListener('click',()=>{const miss=inputChecks().find(x=>!x.ok),el=$(miss?.id);el?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el?.focus(),200);});
}
function refreshInputGuide(){
 ensureInputGuide();const box=$('part558InputGuide'),state=$('part558InputState'),items=$('part558InputIssues'),btn=$('part558FocusIssue');if(!box||!state||!items||!btn)return;
 const checks=inputChecks(),missing=checks.filter(x=>!x.ok);box.classList.toggle('is-ok',missing.length===0);box.classList.toggle('is-review',missing.length>0);state.textContent=missing.length?`${missing.length}項目 要確認`:'基本条件は入力済み';btn.hidden=missing.length===0;
 items.innerHTML=missing.length?missing.map(x=>`<button type="button" data-part558-focus="${esc(x.id)}">${esc(x.label)}</button>`).join(''):'<span class="is-ok">✓ 基本条件に明らかな入力不足はありません。算出結果と根拠資料を確認してください。</span>';
 items.querySelectorAll('[data-part558-focus]').forEach(b=>b.addEventListener('click',()=>{const el=$(b.dataset.part558Focus);el?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el?.focus(),200)}));
}
function setup(){
 ensurePrevious();ensureInputGuide();refreshPrevious();refreshInputGuide();
 $('ctuCaseApplicationSelect')?.addEventListener('change',()=>{dismissedFor='';setTimeout(refreshPrevious,150)});
 const shell=document.querySelector('.calc-shell');shell?.addEventListener('input',()=>setTimeout(refreshInputGuide,0));shell?.addEventListener('change',()=>setTimeout(refreshInputGuide,0));
 let tries=0;const t=setInterval(()=>{tries++;refreshPrevious();refreshInputGuide();if(tries>25)clearInterval(t)},160);
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,180)):setTimeout(setup,180);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part558.js':'part558'});
