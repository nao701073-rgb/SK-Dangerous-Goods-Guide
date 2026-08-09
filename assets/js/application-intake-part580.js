(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id),qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  let timer=null;
  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function isHard(row){return row.classList.contains('part562-hard-issue')}
  function isHumanConfirmed(row){return row.classList.contains('part562-reviewed-warning')}
  function isPending(row){return row.classList.contains('part561-review')&&!isHard(row)&&!isHumanConfirmed(row)}
  function unresolved(){return rows().filter(row=>isHard(row)||isPending(row))}
  function blockerCount(){const node=$('intakeBlockers');if(!node||node.hidden)return 0;return qa('li',node).filter(li=>{const t=String(li.textContent||'').trim();return t&&!/ありません|問題はありません|確認事項はありません/.test(t)}).length}
  function diff(){const nav=$('part573DiffNavigator');if(!nav||nav.hidden)return {applicable:false,total:0,done:0,complete:true};const text=String($('part573DiffProgress')?.textContent||'');const m=text.match(/全差分\s*(\d+)件.*チェック済み\s*(\d+)件/);const total=m?Number(m[1]):0,done=m?Number(m[2]):0;return {applicable:true,total,done,complete:nav.classList.contains('is-complete')||(total>0&&total===done)}}
  function state(){
    const issues=unresolved(),hard=issues.filter(isHard).length,d=diff(),reviewer=String($('intakeReviewer')?.value||'').trim(),blockers=blockerCount(),register=$('intakeRegisterApplication'),registerReady=Boolean(register&&!register.disabled&&!register.hidden);
    let next={key:'register',label:'登録位置へ',hint:'主要確認が完了しています。登録先と内容を確認してください.'};
    if(issues.length)next={key:'issue',label:'次の要確認へ',hint:`危険物の要確認が ${issues.length}件あります。`};
    else if(!reviewer)next={key:'reviewer',label:'照合者を入力',hint:'原本照合者が未入力です。'};
    else if(blockers)next={key:'blocker',label:'全体確認事項へ',hint:`全体確認事項が ${blockers}件あります。`};
    else if(d.applicable&&!d.complete)next={key:'diff',label:'次の差分へ',hint:`前回との差分チェックが ${d.total-d.done}件残っています（再確認補助）。`};
    else if(!registerReady)next={key:'registerState',label:'登録状態を確認',hint:'既存の登録可否表示を確認してください。'};
    return {issues,hard,d,reviewer,blockers,registerReady,next};
  }
  function ensure(){
    if($('part580IntakeWorkbench'))return;
    const anchor=$('part574CompletionGuide')||$('part573DiffNavigator')||$('part568RegistrationReadiness')||$('intakeRegisterState');if(!anchor)return;
    const box=document.createElement('section');box.id='part580IntakeWorkbench';box.className='part580-intake-workbench';box.innerHTML=`<div class="part580-intake-workbench__head"><div><span>まとめ確認ナビ</span><strong id="part580IntakeTitle">確認状態を集計中</strong><small id="part580IntakeHint">未確認・差分・照合者・登録状態を1か所で確認します。既存の判定・登録可否は変更しません。</small></div><div class="part580-intake-workbench__actions"><button type="button" class="primary-action" id="part580IntakeNext">次の確認へ</button><button type="button" id="part580CopyIntakeSummary">確認要点をコピー</button></div></div><div id="part580IntakeStages" class="part580-intake-stages"></div><p id="part580IntakeStatus" class="part580-intake-status" aria-live="polite"></p>`;
    anchor.insertAdjacentElement('afterend',box);$('part580IntakeNext')?.addEventListener('click',goNext);$('part580CopyIntakeSummary')?.addEventListener('click',copySummary);
  }
  function stage(label,ok,detail,tone='required'){return `<span class="${ok?'is-ok':tone==='support'?'is-support':'is-warning'}"><b>${ok?'✓':tone==='support'?'○':'!'}</b><small>${label}</small><strong>${detail}</strong></span>`}
  function render(){
    ensure();const box=$('part580IntakeWorkbench'),check=$('intakeCheckSection');if(!box||!check)return;box.hidden=check.hidden;if(box.hidden)return;
    const s=state(),d=s.d,remaining=Math.max(0,d.total-d.done),requiredOk=s.issues.length===0&&Boolean(s.reviewer)&&s.blockers===0;
    box.classList.toggle('is-ready',requiredOk&&s.registerReady);box.classList.toggle('is-warning',!requiredOk||!s.registerReady);
    $('part580IntakeTitle').textContent=s.registerReady?'登録操作へ進める状態です':requiredOk?'主要確認完了・登録状態を確認':'確認作業が残っています';
    $('part580IntakeHint').textContent=s.next.hint;
    $('part580IntakeStages').innerHTML=[stage('危険物要確認',s.issues.length===0,s.issues.length?`${s.issues.length}件（修正必須 ${s.hard}件）`:'0件'),stage('原本照合者',Boolean(s.reviewer),s.reviewer||'未入力'),stage('全体確認事項',s.blockers===0,s.blockers?`${s.blockers}件`:'大きな未処理なし'),stage('前回との差分',d.complete,d.applicable?(d.complete?'チェック済み':`${remaining}件残り`):'対象なし','support'),stage('既存の登録状態',s.registerReady,s.registerReady?'登録可能':'未完了')].join('');
    const next=$('part580IntakeNext');if(next){next.textContent=s.next.label;next.disabled=false}
    $('part580IntakeStatus').textContent=d.applicable&&!d.complete?'差分チェックは再確認の補助です。未チェックでも既存の登録可否判定へは流用しません。':'このナビは表示・移動補助のみです。確認結果や保存内容を自動変更しません。';
  }
  function focusNode(node){if(!node)return;node.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>node.focus?.({preventScroll:true}),200)}
  function goNext(){const s=state();switch(s.next.key){case'issue':if($('part568NextIssue'))$('part568NextIssue').click();else focusNode(s.issues[0]);break;case'reviewer':focusNode($('intakeReviewer'));break;case'blocker':focusNode(qa('#intakeBlockers li').find(li=>String(li.textContent||'').trim()));break;case'diff':$('part573DiffNextUnchecked')?.click();break;case'registerState':focusNode($('intakeRegisterState')||$('part574CompletionGuide'));break;default:focusNode($('intakeRegisterApplication'));}}
  function summary(){const s=state(),v=id=>String($(id)?.value||'').trim()||'―',d=s.d;return [`申請書確認 要点`,`申請年度：${v('intakeApplicationYear')}`,`申請番号：${v('intakeApplicationNumber')}`,`案件名：${v('intakeCaseTitle')}`,`船名：${v('intakeVesselName')}`,`コンテナ番号：${v('intakeContainerNumber')}`,`危険物明細：${rows().length}件`,`要確認：${s.issues.length}件（修正必須 ${s.hard}件）`,`原本照合者：${s.reviewer||'未入力'}`,`全体確認事項：${s.blockers}件`,`前回差分：${d.applicable?`${d.done}/${d.total}件チェック済み`:'対象なし'}`,`既存登録状態：${s.registerReady?'登録可能':'未完了'}`,`次の確認：${s.next.label}`].join('\n')}
  async function copySummary(){const status=$('part580IntakeStatus');try{const text=summary();if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(text);else{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}if(status)status.textContent='現在の確認要点をコピーしました。保存内容は変更していません。'}catch{if(status)status.textContent='コピーできませんでした。画面表示を参照してください。'}}
  function schedule(){clearTimeout(timer);timer=setTimeout(render,55)}
  ['input','change'].forEach(ev=>document.addEventListener(ev,schedule));document.addEventListener('click',event=>{const id=String(event.target?.id||'');if(/^part(568|570|573|574)/.test(id))schedule()});
  const obs=new MutationObserver(schedule);['intakeCargoBody','part573DiffNavigator','intakeBlockers','intakeWarnings','intakeCheckSection','intakeRegisterApplication'].forEach(id=>{const n=$(id);if(n)obs.observe(n,{subtree:true,childList:true,attributes:true,characterData:true})});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,240)):setTimeout(render,240);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part580.js':'part580'});
})();
