(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const ui={showReviewOnly:false,issueCursor:-1,scheduled:false,lastStage:''};
  function isVisible(node){return Boolean(node&&!node.hidden&&node.getClientRects().length)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureGuide(){
    if($('part561EasyGuide'))return;
    const intro=q('.intake-intro'); if(!intro)return;
    const section=document.createElement('section');
    section.id='part561EasyGuide';section.className='part561-easy-guide';
    section.innerHTML=`<div class="part561-easy-guide__head"><div><h2>申請書確認 かんたん操作</h2><p>申請書を取り込み、要確認だけを確認して申請番号管理へ登録します。</p></div><span class="part561-easy-guide__state" id="part561GuideState">申請書を取り込んでください</span></div><div class="part561-steps" aria-label="申請書確認の進行状況"><div class="part561-step" data-step="1"><span>STEP 1</span><strong>申請書取込</strong></div><div class="part561-step" data-step="2"><span>STEP 2</span><strong>自動確認</strong></div><div class="part561-step" data-step="3"><span>STEP 3</span><strong>要確認を確認</strong></div><div class="part561-step" data-step="4"><span>STEP 4</span><strong>申請番号管理へ登録</strong></div></div><div class="part561-overview"><div><span>対象危険物</span><strong id="part561CargoCount">0件</strong></div><div class="is-ok"><span>確認済み</span><strong id="part561OkCount">0件</strong></div><div class="is-review"><span>要確認</span><strong id="part561ReviewCount">0件</strong></div></div><div class="part561-points"><div class="part561-points__title"><strong>今回の確認ポイント</strong><span id="part561GlobalIssueCount"></span></div><div class="part561-point-chips" id="part561PointChips"><span class="part561-point-chip is-clear">申請書取込後に表示します</span></div></div><div class="part561-guide-actions"><button class="part561-guide-primary" id="part561PrimaryAction" type="button">ファイルを選択</button><button class="part561-guide-secondary" id="part561FilterAction" type="button" hidden>要確認だけ表示</button><button class="part561-guide-secondary" id="part561RegisterShortcut" type="button" hidden>登録欄へ進む</button><span class="part561-guide-hint" id="part561GuideHint">ExcelまたはCSVの申請書を選択してください。</span></div>`;
    intro.insertAdjacentElement('afterend',section);
    const mobile=document.createElement('div');mobile.className='part561-mobile-action';mobile.id='part561MobileAction';mobile.innerHTML='<span id="part561MobileStatus">申請書を取り込んでください</span><button id="part561MobileButton" type="button">ファイルを選択</button>';document.body.appendChild(mobile);
    $('part561PrimaryAction').addEventListener('click',primaryAction);
    $('part561MobileButton').addEventListener('click',primaryAction);
    $('part561FilterAction').addEventListener('click',toggleReviewOnly);
    $('part561RegisterShortcut').addEventListener('click',()=>$('intakeRegisterSection')?.scrollIntoView({behavior:'smooth',block:'start'}));
    arrangeOptionalCaseFields();arrangeSecondaryTools();ensureCargoToolbar();
  }
  function arrangeOptionalCaseFields(){
    if($('part561OptionalCase'))return;
    const grid=q('#intakeEditSection .intake-grid');if(!grid)return;
    const optionalIds=['intakeInspectionDate','intakeShipper','intakeVoyageNumber','intakeContainerType','intakeLoadingPort','intakeDischargePort','intakeNote'];
    const labels=optionalIds.map(id=>$(id)?.closest('label')).filter(Boolean);if(!labels.length)return;
    const details=document.createElement('details');details.id='part561OptionalCase';details.className='part561-optional-case';details.innerHTML='<summary id="part561OptionalSummary">その他の案件情報</summary><div class="part561-optional-case__grid"></div>';
    grid.insertAdjacentElement('afterend',details);const inner=q('.part561-optional-case__grid',details);labels.forEach(label=>inner.appendChild(label));updateOptionalSummary();
    inner.addEventListener('input',updateOptionalSummary);inner.addEventListener('change',updateOptionalSummary);
  }
  function updateOptionalSummary(){const d=$('part561OptionalCase');if(!d)return;const filled=qa('input,textarea,select',d).filter(el=>String(el.value||'').trim()).length;const s=$('part561OptionalSummary');if(s)s.textContent=`その他の案件情報${filled?`（入力済み ${filled}項目）`:''}`}
  function arrangeSecondaryTools(){const actions=q('#intakeRegisterSection .intake-actions--secondary');if(!actions||actions.closest('.part561-secondary-tools'))return;const d=document.createElement('details');d.className='part561-secondary-tools';d.innerHTML='<summary>JSON・CSV出力など</summary>';actions.parentNode.insertBefore(d,actions);d.appendChild(actions)}
  function ensureCargoToolbar(){
    if($('part561CargoToolbar'))return;const wrap=q('.intake-cargo-wrap');if(!wrap)return;
    const bar=document.createElement('div');bar.id='part561CargoToolbar';bar.className='part561-cargo-toolbar';bar.innerHTML='<strong id="part561CargoToolbarText">危険物明細</strong><div class="part561-cargo-toolbar__actions"><button type="button" id="part561NextIssue">次の要確認</button><button type="button" id="part561CargoFilter">要確認だけ表示</button></div>';
    wrap.parentNode.insertBefore(bar,wrap);$('part561NextIssue').addEventListener('click',nextIssue);$('part561CargoFilter').addEventListener('click',toggleReviewOnly);
  }
  function rowInfo(row){
    const review=q('.part544-review',row);const text=(review?.textContent||row.textContent||'').replace(/\s+/g,' ');
    const un=q('[data-cargo-field="unNumber"]',row)?.value?.trim();
    const reviewClass=Boolean(review&&(review.classList.contains('is-over')||review.classList.contains('is-review')));
    const issue=Boolean(!un||reviewClass||/要確認|規定量超過|不一致|許可が必要|原文照合/.test(text));
    return{row,review,text,issue,un,index:Number(row.dataset.cargoIndex||0)};
  }
  function rowsInfo(){return qa('#intakeCargoBody tr[data-cargo-index]').map(rowInfo)}
  function listIssues(id){const node=$(id);if(!isVisible(node))return[];return qa('li',node).map(li=>li.textContent.trim()).filter(t=>t&&!/ありません|問題はありません|確認事項はありません/.test(t))}
  function categories(infos,globalIssues){
    const counts=new Map(),add=k=>counts.set(k,(counts.get(k)||0)+1);
    infos.filter(i=>i.issue).forEach(i=>{const t=i.text;if(/P200/.test(t)&&/許可|x|要確認/.test(t))add('P200・許可');else if(/IBC/.test(t))add('IBC');else if(/ポータブルタンク|参照ポータブルタンク|\bT\d{1,3}\b/.test(t))add('ポータブルタンク');else if(/包装要件.*不一致|不一致.*包装要件/.test(t))add('包装要件');else if(/容量比較|規定量超過|許容容量|許容質量/.test(t))add('容量・質量');else if(/容器コード/.test(t))add('容器コード');else add('その他');});
    globalIssues.forEach(t=>{if(/申請番号/.test(t))add('申請番号');else if(/国連番号|品名/.test(t))add('危険物情報');else if(/数量|質量|個数/.test(t))add('数量');else add('その他')});
    return counts;
  }
  function markRows(infos){infos.forEach(i=>{i.row.classList.toggle('part561-review',i.issue);i.row.classList.toggle('part561-confirmed',!i.issue);i.row.dataset.part561Status=i.issue?'review':'confirmed'})}
  function setSteps(stage){qa('#part561EasyGuide [data-step]').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('is-done',n<stage||stage===5);node.classList.toggle('is-current',n===stage)})}
  function currentStage({imported,checked,registered,issues,blockers,reviewer,registerEnabled}){
    if(registered)return 5;if(!imported)return 1;if(!checked)return 2;if(issues+blockers>0)return 3;if(!reviewer||registerEnabled)return 4;return 4
  }
  function actionModel(ctx){
    if(ctx.registered)return{label:'登録した申請を詳細確認',hint:'申請番号管理の詳細画面を新しいタブで開けます。',kind:'open'};
    if(!ctx.imported)return{label:'ファイルを選択',hint:'ExcelまたはCSVの申請書を選択してください。',kind:'file'};
    if(!ctx.checked)return{label:'自動確認を実行',hint:'取込内容を確認したら、自動確認を実行します。',kind:'check'};
    if(ctx.blockers>0)return{label:'修正が必要な項目を確認',hint:`登録前に修正が必要な項目が ${ctx.blockers}件あります。`,kind:'blocker'};
    if(ctx.issues>0)return{label:'次の要確認を確認',hint:`要確認の危険物が ${ctx.issues}件あります。必要箇所だけ順番に確認できます。`,kind:'issue'};
    if(!ctx.reviewer)return{label:'原本照合者を入力',hint:'全危険物の確認が完了しました。原本照合者を入力してください。',kind:'reviewer'};
    if(ctx.registerEnabled)return{label:ctx.registerLabel||'申請番号管理へ登録',hint:'確認が完了しました。申請番号管理へ1操作で登録できます。',kind:'register'};
    return{label:'登録内容を確認',hint:'登録条件を確認してください。',kind:'registerArea'};
  }
  function collect(){
    const infos=rowsInfo(),imported=isVisible($('intakeEditSection')),checked=isVisible($('intakeCheckSection')),registered=isVisible($('intakeOpenApplication'));
    const blockerTexts=checked?listIssues('intakeBlockers'):[],warningTexts=checked?listIssues('intakeWarnings'):[];
    const issueRows=checked?infos.filter(i=>i.issue):[];
    const reviewer=String($('intakeReviewer')?.value||'').trim();const reg=$('intakeRegisterApplication');
    return{infos,imported,checked,registered,issueRows,issues:issueRows.length,ok:checked?infos.length-issueRows.length:0,blockers:blockerTexts.length,warnings:warningTexts.length,globalIssues:[...blockerTexts,...warningTexts],reviewer,registerEnabled:Boolean(reg&&!reg.disabled),registerLabel:reg?.textContent?.trim()||'',cargoCount:infos.length};
  }
  function render(){
    ui.scheduled=false;ensureGuide();const ctx=collect();markRows(ctx.infos);const stage=currentStage(ctx),action=actionModel(ctx);ui.lastStage=action.kind;
    setSteps(stage);$('part561CargoCount').textContent=`${ctx.cargoCount}件`;$('part561OkCount').textContent=ctx.checked?`${ctx.ok}件`:'―';$('part561ReviewCount').textContent=ctx.checked?`${ctx.issues}件`:'―';
    const stateText=ctx.registered?'登録済み':!ctx.imported?'申請書待ち':!ctx.checked?'取込内容を確認':ctx.blockers?'修正が必要':ctx.issues?'要確認あり':ctx.registerEnabled?'登録できます':'確認完了';$('part561GuideState').textContent=stateText;
    const counts=categories(ctx.issueRows,ctx.globalIssues),chips=$('part561PointChips');if(!ctx.checked)chips.innerHTML='<span class="part561-point-chip is-clear">自動確認後に確認ポイントを表示します</span>';else if(!counts.size)chips.innerHTML='<span class="part561-point-chip is-clear">追加の要確認はありません</span>';else chips.innerHTML=[...counts.entries()].map(([k,v])=>`<span class="part561-point-chip">${esc(k)} ${v}件</span>`).join('');
    const totalGlobal=ctx.blockers+ctx.warnings;$('part561GlobalIssueCount').textContent=ctx.checked?(totalGlobal?`全体確認 ${totalGlobal}件`:'') :'';
    $('part561PrimaryAction').textContent=action.label;$('part561GuideHint').textContent=action.hint;$('part561MobileButton').textContent=action.label;$('part561MobileStatus').textContent=action.hint;
    const filter=$('part561FilterAction');filter.hidden=!(ctx.checked&&ctx.cargoCount>0);filter.textContent=ui.showReviewOnly?'すべて表示':'要確認だけ表示';const cf=$('part561CargoFilter');if(cf){cf.hidden=filter.hidden;cf.textContent=filter.textContent}const ni=$('part561NextIssue');if(ni)ni.disabled=!ctx.checked||ctx.issues===0;
    const shortcut=$('part561RegisterShortcut');shortcut.hidden=!(ctx.checked&&ctx.registerEnabled&&ctx.issues>0);shortcut.textContent='登録欄へ進む';
    document.body.classList.toggle('part561-show-review-only',ui.showReviewOnly&&ctx.checked);
    const tb=$('part561CargoToolbarText');if(tb)tb.textContent=ctx.checked?`危険物 ${ctx.cargoCount}件｜確認済み ${ctx.ok}件｜要確認 ${ctx.issues}件`:`危険物 ${ctx.cargoCount}件`;
    updateOptionalSummary();
  }
  function nextIssue(){const issues=collect().issueRows;if(!issues.length){$('intakeCheckSection')?.scrollIntoView({behavior:'smooth',block:'start'});return}ui.issueCursor=(ui.issueCursor+1)%issues.length;qa('#intakeCargoBody tr.part561-focus').forEach(r=>r.classList.remove('part561-focus'));const target=issues[ui.issueCursor].row;target.classList.add('part561-focus');target.setAttribute('tabindex','-1');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.focus({preventScroll:true}),350);setTimeout(()=>target.classList.remove('part561-focus'),2400)}
  function toggleReviewOnly(){ui.showReviewOnly=!ui.showReviewOnly;if(!ui.showReviewOnly)ui.issueCursor=-1;render()}
  function primaryAction(){
    const ctx=collect();const action=actionModel(ctx);
    if(action.kind==='open'){const a=$('intakeOpenApplication');if(a)a.click();return}
    if(action.kind==='file'){$('intakeSelectFile')?.click();return}
    if(action.kind==='check'){$('intakeRunCheck')?.click();setTimeout(schedule,80);return}
    if(action.kind==='blocker'){$('intakeBlockers')?.closest('.intake-finding')?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(action.kind==='issue'){nextIssue();return}
    if(action.kind==='reviewer'){$('intakeReviewer')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('intakeReviewer')?.focus(),350);return}
    if(action.kind==='register'){$('intakeRegisterApplication')?.click();setTimeout(schedule,120);return}
    $('intakeRegisterSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function schedule(){if(ui.scheduled)return;ui.scheduled=true;setTimeout(render,40)}
  document.addEventListener('input',e=>{if(e.target.closest('#intakeEditSection,#intakeCheckSection'))schedule()});document.addEventListener('change',e=>{if(e.target.closest('#intakeEditSection,#intakeCheckSection'))schedule()});document.addEventListener('click',e=>{if(e.target.closest('#intakeRunCheck,#intakeRegisterApplication,#intakeClear,#intakeAddCargo,[data-remove-cargo],#intakeOpenApplication'))setTimeout(schedule,100)});
  const observer=new MutationObserver(schedule);['intakeEditSection','intakeCheckSection','intakeRegisterSection','intakeCargoBody','intakeRegisterMessage'].forEach(id=>{const n=$(id);if(n)observer.observe(n,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class','href']})});
  ensureGuide();render();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part561.js':'part561'});
})();
