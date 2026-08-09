(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  let activeRow=null;
  let refreshTimer=null;
  const storageKey='skdg-part568-intake-issue-only';

  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function isHumanConfirmed(row){return row.classList.contains('part562-reviewed-warning')}
  function isHard(row){return row.classList.contains('part562-hard-issue')}
  function isPending(row){return row.classList.contains('part561-review')&&!isHard(row)&&!isHumanConfirmed(row)}
  function isIssue(row){return isHard(row)||isPending(row)}
  function unNumber(row){return String(row.querySelector('[data-cargo-field="unNumber"]')?.value||'').trim()}
  function issueOnly(){try{return sessionStorage.getItem(storageKey)!=='0'}catch{return true}}
  function setIssueOnly(value){try{sessionStorage.setItem(storageKey,value?'1':'0')}catch{};applyFilter()}
  function globalIssueCount(){
    let count=0;
    ['intakeBlockers','intakeWarnings'].forEach(id=>{
      const node=$(id);if(!node||node.hidden)return;
      qa('li',node).forEach(li=>{const text=li.textContent.trim();if(text&&!/ありません|問題はありません|確認事項はありません/.test(text))count++});
    });
    return count;
  }
  function ensureToolbar(){
    const section=$('intakeCheckSection');if(!section||$('part568ReviewToolbar'))return;
    const heading=section.querySelector('.intake-heading');
    const bar=document.createElement('section');bar.id='part568ReviewToolbar';bar.className='part568-review-toolbar';bar.innerHTML=`
      <div class="part568-review-progress"><span>要確認ナビ</span><strong id="part568ReviewProgress">確認状態を集計中</strong><small id="part568ReviewHint">判定結果は変更せず、要確認箇所への移動だけを簡単にします。</small></div>
      <div class="part568-review-actions">
        <button type="button" id="part568PrevIssue">← 前の要確認</button>
        <button type="button" class="primary-action" id="part568NextIssue">次の要確認 →</button>
        <button type="button" id="part568IssueOnlyToggle" aria-pressed="true">全件表示</button>
      </div>`;
    heading?.insertAdjacentElement('afterend',bar) || section.prepend(bar);
    $('part568PrevIssue')?.addEventListener('click',()=>move(-1));
    $('part568NextIssue')?.addEventListener('click',()=>move(1));
    $('part568IssueOnlyToggle')?.addEventListener('click',()=>setIssueOnly(!issueOnly()));
  }
  function issueRows(){return rows().filter(isIssue)}
  function clearActive(){rows().forEach(row=>row.classList.remove('part568-current-issue'));activeRow=null}
  function focusRow(row){
    if(!row)return;
    rows().forEach(item=>item.classList.toggle('part568-current-issue',item===row));
    activeRow=row;
    row.scrollIntoView?.({behavior:'smooth',block:'center'});
    const target=row.querySelector('input:not([type="hidden"]),select,textarea,button');
    setTimeout(()=>target?.focus?.({preventScroll:true}),220);
  }
  function move(delta){
    const list=issueRows();if(!list.length){clearActive();update();return}
    let index=list.indexOf(activeRow);
    if(index<0)index=delta<0?0:-1;
    index=(index+delta+list.length)%list.length;
    focusRow(list[index]);update();
  }
  function applyFilter(){
    const section=$('intakeCheckSection'),active=Boolean(section&&!section.hidden);
    const only=issueOnly();
    rows().forEach(row=>row.classList.toggle('part568-filter-hidden',active&&only&&!isIssue(row)));
    const toggle=$('part568IssueOnlyToggle');if(toggle){toggle.setAttribute('aria-pressed',String(only));toggle.textContent=only?'全件表示':'要確認だけ表示'}
    if(activeRow&&!isIssue(activeRow)){activeRow.classList.remove('part568-current-issue');activeRow=null}
  }
  function update(){
    ensureToolbar();
    const all=rows(),pending=all.filter(isIssue),hard=all.filter(isHard),human=all.filter(isHumanConfirmed),auto=Math.max(0,all.length-pending.length-human.length);
    const out=$('part568ReviewProgress'),hint=$('part568ReviewHint');
    if(out)out.textContent=all.length?`未確認 ${pending.length}件／人確認済み ${human.length}件／自動確認 ${auto}件`:'危険物明細を確認中';
    if(hint){
      const global=globalIssueCount();
      hint.textContent=pending.length?`${hard.length?`修正必須 ${hard.length}件を含みます。`:'確認待ちがあります。'}「次の要確認」で順番に移動できます。${global?` 全体確認事項 ${global}件。`:''}`:`危険物明細の要確認は完了しています。${global?`全体確認事項が ${global}件あります。`:'登録前の確認者・メモを確認してください。'}`;
    }
    const prev=$('part568PrevIssue'),next=$('part568NextIssue');if(prev)prev.disabled=!pending.length;if(next)next.disabled=!pending.length;
    applyFilter();
    updateRegistrationReadiness(pending.length,hard.length);
  }
  function updateRegistrationReadiness(pendingCount,hardCount){
    const state=$('intakeRegisterState');if(!state)return;
    let box=$('part568RegistrationReadiness');
    if(!box){box=document.createElement('div');box.id='part568RegistrationReadiness';box.className='part568-registration-readiness';state.insertAdjacentElement('afterend',box)}
    const check=$('intakeCheckSection');box.hidden=!check||check.hidden;if(box.hidden)return;
    const reviewer=String($('intakeReviewer')?.value||'').trim();
    const ready=pendingCount===0&&Boolean(reviewer);
    box.classList.toggle('is-ready',ready);box.classList.toggle('is-warning',!ready);
    if(pendingCount){box.innerHTML=`<strong>登録前：要確認 ${pendingCount}件</strong><span>${hardCount?`うち修正必須 ${hardCount}件。`:''}要確認箇所を処理してから登録してください。</span>`}
    else if(!reviewer){box.innerHTML='<strong>登録前：原本照合者を入力</strong><span>危険物明細の要確認は完了しています。確認者名を入力してください。</span>'}
    else box.innerHTML='<strong>登録準備：確認済み</strong><span>現在の確認状態では、登録操作へ進めます。</span>';
  }
  function schedule(){clearTimeout(refreshTimer);refreshTimer=setTimeout(update,35)}
  document.addEventListener('input',schedule);
  document.addEventListener('change',schedule);
  document.addEventListener('keydown',event=>{
    if(!event.altKey)return;
    if(event.key==='ArrowDown'){event.preventDefault();move(1)}
    if(event.key==='ArrowUp'){event.preventDefault();move(-1)}
  });
  const body=$('intakeCargoBody'),check=$('intakeCheckSection');
  const observer=new MutationObserver(schedule);if(body)observer.observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});if(check)observer.observe(check,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class']});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(update,0)):setTimeout(update,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part568.js':'part568'});
})();
