(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id),qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  let timer=null;
  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function isHard(row){return row.classList.contains('part562-hard-issue')}
  function isHumanConfirmed(row){return row.classList.contains('part562-reviewed-warning')}
  function isPending(row){return row.classList.contains('part561-review')&&!isHard(row)&&!isHumanConfirmed(row)}
  function unresolvedRows(){return rows().filter(row=>isHard(row)||isPending(row))}
  function visibleFindingCount(id){const node=$(id);if(!node||node.hidden)return 0;return qa('li',node).filter(li=>{const text=String(li.textContent||'').trim();return text&&!/ありません|問題はありません|確認事項はありません/.test(text)}).length}
  function diffState(){
    const nav=$('part573DiffNavigator');
    if(!nav||nav.hidden)return {applicable:false,complete:true,label:'差分なし'};
    const progress=String($('part573DiffProgress')?.textContent||'').trim();
    const complete=nav.classList.contains('is-complete')||/チェック済み\s*(\d+)件/.test(progress)&&(()=>{const m=progress.match(/全差分\s*(\d+)件.*チェック済み\s*(\d+)件/);return Boolean(m&&Number(m[1])===Number(m[2]))})();
    return {applicable:true,complete,label:progress||'差分確認中'};
  }
  function state(){
    const issues=unresolvedRows(),hard=issues.filter(isHard).length,reviewer=String($('intakeReviewer')?.value||'').trim(),diff=diffState(),blockers=visibleFindingCount('intakeBlockers'),warnings=visibleFindingCount('intakeWarnings');
    const required=[
      {key:'rows',label:'危険物の要確認',ok:issues.length===0,detail:issues.length?`${issues.length}件（修正必須 ${hard}件）`:'0件'},
      {key:'reviewer',label:'原本照合者',ok:Boolean(reviewer),detail:reviewer||'未入力'}
    ];
    const supplemental=[
      {key:'diff',label:'前回との差分チェック',ok:diff.complete,detail:diff.applicable?diff.label:'対象なし'},
      {key:'global',label:'全体確認事項',ok:blockers===0,detail:blockers?`修正・確認 ${blockers}件${warnings?`／注意 ${warnings}件`:''}`:warnings?`注意 ${warnings}件`:'大きな未処理なし'}
    ];
    return {issues,hard,reviewer,diff,blockers,warnings,required,supplemental,ready:required.every(x=>x.ok)};
  }
  function ensure(){
    if($('part574CompletionGuide'))return;
    const anchor=$('part568RegistrationReadiness')||$('intakeRegisterState');if(!anchor)return;
    const box=document.createElement('section');box.id='part574CompletionGuide';box.className='part574-completion-guide';box.innerHTML=`<div class="part574-completion-guide__head"><div><span>確認完了ガイド</span><strong id="part574CompletionTitle">登録前の確認状態を集計中</strong><small>既存の登録可否判定は変更しません。必須確認と再確認補助を分けて表示します。</small></div><button type="button" id="part574CompletionFocus">未完了へ移動</button></div><div id="part574CompletionItems" class="part574-completion-items"></div><p id="part574CompletionStatus" class="part574-completion-status" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part574CompletionFocus')?.addEventListener('click',focusFirst);
  }
  function focusRow(row){if(!row)return;row.scrollIntoView?.({behavior:'smooth',block:'center'});row.classList.add('part574-completion-focus');setTimeout(()=>row.classList.remove('part574-completion-focus'),1400);const target=row.querySelector('input:not([type="hidden"]),select,textarea,button');setTimeout(()=>target?.focus?.({preventScroll:true}),180)}
  function focusFirst(){
    const s=state();
    if(s.issues.length){focusRow(s.issues[0]);return}
    if(!s.reviewer){const n=$('intakeReviewer');n?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>n?.focus?.({preventScroll:true}),180);return}
    if(s.diff.applicable&&!s.diff.complete){$('part573DiffNextUnchecked')?.click();return}
    if(s.blockers){const first=qa('#intakeBlockers li').find(li=>String(li.textContent||'').trim());first?.scrollIntoView?.({behavior:'smooth',block:'center'});return}
    $('intakeRegisterApplication')?.scrollIntoView?.({behavior:'smooth',block:'center'});
  }
  function render(){
    ensure();const box=$('part574CompletionGuide'),check=$('intakeCheckSection');if(!box||!check)return;box.hidden=check.hidden;if(box.hidden)return;
    const s=state(),requiredDone=s.required.filter(x=>x.ok).length,suppDone=s.supplemental.filter(x=>x.ok).length;
    box.classList.toggle('is-ready',s.ready);box.classList.toggle('is-warning',!s.ready);
    $('part574CompletionTitle').textContent=s.ready?`必須確認 ${requiredDone}/${s.required.length} 完了`:`必須確認 ${requiredDone}/${s.required.length}・未完了あり`;
    $('part574CompletionItems').innerHTML=[...s.required.map(x=>`<span class="${x.ok?'is-ok':'is-warning'}"><b>${x.ok?'✓':'!'}</b><small>${x.label}</small><strong>${x.detail}</strong></span>`),...s.supplemental.map(x=>`<span class="${x.ok?'is-ok':'is-note'}"><b>${x.ok?'✓':'○'}</b><small>${x.label}</small><strong>${x.detail}</strong></span>`)].join('');
    const status=$('part574CompletionStatus');if(status)status.textContent=!s.ready?'危険物の要確認と原本照合者を確認してください。差分チェックは再確認の補助で、登録可否には使用しません。':s.diff.applicable&&!s.diff.complete?`必須確認は完了しています。前回差分チェックは ${suppDone}/${s.supplemental.length} の補助確認として残っています。`:'必須確認は完了しています。既存の登録状態表示を確認して登録操作へ進めます。';
    const btn=$('part574CompletionFocus');if(btn){btn.disabled=s.ready&&(!s.diff.applicable||s.diff.complete)&&s.blockers===0;btn.textContent=s.ready&&(!s.diff.applicable||s.diff.complete)&&s.blockers===0?'主要確認完了':'未完了へ移動'}
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(render,55)}
  ['input','change'].forEach(ev=>document.addEventListener(ev,schedule));
  document.addEventListener('click',event=>{if(String(event.target?.id||'').startsWith('part573Diff'))schedule()});
  const observer=new MutationObserver(schedule);['intakeCargoBody','part573DiffNavigator','intakeBlockers','intakeWarnings','intakeCheckSection'].forEach(id=>{const n=$(id);if(n)observer.observe(n,{subtree:true,childList:true,attributes:true,characterData:true})});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,190)):setTimeout(render,190);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part574.js':'part574'});
})();
