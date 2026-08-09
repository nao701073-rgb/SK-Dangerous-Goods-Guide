(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const q=(sel,root=document)=>root.querySelector(sel);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  const ui={showReviewOnly:false,issueCursor:-1,scheduled:false,lastStage:'',reviewed:new Set(),reviewerCandidateApplied:false};
  function isVisible(node){return Boolean(node&&!node.hidden&&node.getClientRects().length)}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function ensureGuide(){
    if($('part561EasyGuide'))return;
    const intro=q('.intake-intro'); if(!intro)return;
    const section=document.createElement('section');
    section.id='part561EasyGuide';section.className='part561-easy-guide';
    section.innerHTML=`<div class="part561-easy-guide__head"><div><h2>申請書確認 かんたん操作</h2><p>申請書を取り込み、要確認だけを確認して申請番号管理へ登録します。</p></div><span class="part561-easy-guide__state" id="part561GuideState">申請書を取り込んでください</span></div><div class="part561-steps" aria-label="申請書確認の進行状況"><div class="part561-step" data-step="1"><span>STEP 1</span><strong>申請書取込</strong></div><div class="part561-step" data-step="2"><span>STEP 2</span><strong>自動確認</strong></div><div class="part561-step" data-step="3"><span>STEP 3</span><strong>要確認を確認</strong></div><div class="part561-step" data-step="4"><span>STEP 4</span><strong>申請番号管理へ登録</strong></div></div><div class="part561-overview"><div><span>対象危険物</span><strong id="part561CargoCount">0件</strong></div><div class="is-ok"><span>確認済み</span><strong id="part561OkCount">0件</strong></div><div class="is-reviewed"><span>要確認を確認済み</span><strong id="part562AckCount">0件</strong></div><div class="is-review"><span>未確認・要修正</span><strong id="part561ReviewCount">0件</strong></div></div><div class="part561-points"><div class="part561-points__title"><strong>今回の確認ポイント</strong><span id="part561GlobalIssueCount"></span></div><div class="part561-point-chips" id="part561PointChips"><span class="part561-point-chip is-clear">申請書取込後に表示します</span></div></div><div class="part562-review-guidance"><strong>要確認の扱い</strong><span>原文・許可内容などを確認した項目は「確認済みにする」で次へ進めます。規定量超過・包装要件不一致など、入力修正が必要な項目は修正するまで確認済みにはできません。法令判定・警告表示そのものは変更しません。</span></div><div class="part561-guide-actions"><button class="part561-guide-primary" id="part561PrimaryAction" type="button">ファイルを選択</button><button class="part561-guide-secondary" id="part561FilterAction" type="button" hidden>要確認だけ表示</button><button class="part561-guide-secondary" id="part561RegisterShortcut" type="button" hidden>登録欄へ進む</button><span class="part561-guide-hint" id="part561GuideHint">ExcelまたはCSVの申請書を選択してください。</span></div>`;
    intro.insertAdjacentElement('afterend',section);
    const mobile=document.createElement('div');mobile.className='part561-mobile-action';mobile.id='part561MobileAction';mobile.innerHTML='<span id="part561MobileStatus">申請書を取り込んでください</span><button id="part561MobileButton" type="button">ファイルを選択</button>';document.body.appendChild(mobile);
    $('part561PrimaryAction').addEventListener('click',primaryAction);
    $('part561MobileButton').addEventListener('click',primaryAction);
    $('part561FilterAction').addEventListener('click',toggleReviewOnly);
    $('part561RegisterShortcut').addEventListener('click',()=>$('intakeRegisterSection')?.scrollIntoView({behavior:'smooth',block:'start'}));
    arrangeOptionalCaseFields();arrangeSecondaryTools();ensureCargoToolbar();ensureReviewerAssist();ensureReviewBoard();ensureFinalSummary();
  }
  function ensureReviewBoard(){
    if($('part563ReviewBoard'))return;const guide=$('part561EasyGuide');if(!guide)return;
    const board=document.createElement('details');board.id='part563ReviewBoard';board.className='part563-review-board';board.hidden=true;
    board.innerHTML='<summary><span><strong>確認対象一覧</strong><small>未確認・要修正をまとめて確認</small></span><b id="part563ReviewBoardCount">0件</b></summary><div class="part563-review-board__body"><p class="part563-review-board__lead">入力修正が必要な項目と、人による原文・許可・条件確認が必要な項目を分けて表示します。各項目から該当する危険物へ直接移動できます。</p><div id="part563ReviewList"></div></div>';
    guide.insertAdjacentElement('afterend',board);
  }
  function ensureFinalSummary(){
    if($('part563FinalSummary'))return;const reg=$('intakeRegisterSection');if(!reg)return;
    const card=document.createElement('section');card.id='part563FinalSummary';card.className='part563-final-summary';card.hidden=true;
    card.innerHTML='<div class="part563-final-summary__head"><div><span>登録前の最終確認</span><strong id="part563FinalTitle">全件確認が完了しました</strong></div><span class="part563-final-ready">登録準備</span></div><div class="part563-final-grid"><div><span>申請番号</span><strong id="part563FinalApplication">―</strong></div><div><span>危険物</span><strong id="part563FinalCargo">―</strong></div><div><span>人による確認</span><strong id="part563FinalAck">―</strong></div><div><span>原本照合者</span><strong id="part563FinalReviewer">―</strong></div></div><div class="part563-final-actions"><button type="button" id="part563FinalRegister">申請番号管理へ登録</button><span id="part563FinalHint">登録内容を確認してください。</span></div>';
    reg.parentNode.insertBefore(card,reg);
    $('part563FinalRegister').addEventListener('click',()=>{syncAcknowledgementNote();$('intakeRegisterApplication')?.click();setTimeout(schedule,120)});
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
    const bar=document.createElement('div');bar.id='part561CargoToolbar';bar.className='part561-cargo-toolbar';bar.innerHTML='<strong id="part561CargoToolbarText">危険物明細</strong><div class="part561-cargo-toolbar__actions"><button type="button" id="part562PrevIssue">前の要確認</button><button type="button" id="part561NextIssue">次の要確認</button><button type="button" id="part561CargoFilter">要確認だけ表示</button></div>';
    wrap.parentNode.insertBefore(bar,wrap);$('part562PrevIssue').addEventListener('click',prevIssue);$('part561NextIssue').addEventListener('click',nextIssue);$('part561CargoFilter').addEventListener('click',toggleReviewOnly);
  }
  function ensureReviewerAssist(){
    const input=$('intakeReviewer');if(!input||$('part562ReviewerAssist'))return;
    const note=document.createElement('small');note.id='part562ReviewerAssist';note.className='part562-reviewer-assist';note.textContent='ログイン利用者名を候補として自動入力します。必要に応じて変更できます。';input.insertAdjacentElement('afterend',note);
  }
  function rowReviewKey(row,index){
    const fields=['unNumber','packingGroup','containerCode','packingInstruction','packageCount','totalNetMassKg','totalGrossMassKg'];
    return [index,...fields.map(f=>q(`[data-cargo-field="${f}"]`,row)?.value?.trim()||'')].join('|');
  }
  function issueReasons(text,un){
    const r=[];const add=v=>{if(v&&!r.includes(v))r.push(v)};
    if(!un)add('国連番号');
    if(/規定量超過/.test(text))add('規定量超過');
    if(/包装要件.*不一致|不一致.*包装要件/.test(text))add('包装要件不一致');
    if(/P200/.test(text)&&/許可|「x」|\bx\b/.test(text))add('P200・許可');
    if(/容量比較/.test(text))add('容量比較');
    if(/原文照合|原文確認/.test(text))add('原文確認');
    if(/IBC/.test(text)&&/要確認|確認/.test(text))add('IBC条件');
    if(/ポータブルタンク|参照ポータブルタンク/.test(text)&&/要確認|確認/.test(text))add('ポータブルタンク条件');
    if(/容器コード/.test(text)&&/要確認|確認してください/.test(text))add('容器コード');
    if(!r.length&&/要確認/.test(text))add('要確認');
    return r;
  }
  function rowInfo(row){
    const review=q('.part544-review',row);const text=(review?.textContent||row.textContent||'').replace(/\s+/g,' ');
    const un=q('[data-cargo-field="unNumber"]',row)?.value?.trim();const index=Number(row.dataset.cargoIndex||0);
    const reviewOver=Boolean(review?.classList.contains('is-over'));const reviewWarn=Boolean(review?.classList.contains('is-review'));
    const systemIssue=Boolean(!un||reviewOver||reviewWarn||/要確認|規定量超過|不一致|許可が必要|原文照合/.test(text));
    const hard=Boolean(!un||reviewOver||/規定量超過|包装要件.*不一致|不一致.*包装要件|容器コードを確認してください|国連番号 要確認/.test(text));
    const key=rowReviewKey(row,index);const acknowledged=Boolean(systemIssue&&!hard&&ui.reviewed.has(key));
    const issue=Boolean(systemIssue&&!acknowledged);const reasons=issueReasons(text,un);
    return{row,review,text,issue,systemIssue,hard,acknowledged,reasons,un,index,key};
  }
  function rowsInfo(){return qa('#intakeCargoBody tr[data-cargo-index]').map(rowInfo)}
  function listIssues(id){const node=$(id);if(!isVisible(node))return[];return qa('li',node).map(li=>li.textContent.trim()).filter(t=>t&&!/ありません|問題はありません|確認事項はありません/.test(t))}
  function categories(infos,globalIssues){
    const counts=new Map(),add=k=>counts.set(k,(counts.get(k)||0)+1);
    infos.filter(i=>i.issue).forEach(i=>{const t=i.text;if(/P200/.test(t)&&/許可|x|要確認/.test(t))add('P200・許可');else if(/IBC/.test(t))add('IBC');else if(/ポータブルタンク|参照ポータブルタンク|\bT\d{1,3}\b/.test(t))add('ポータブルタンク');else if(/包装要件.*不一致|不一致.*包装要件/.test(t))add('包装要件');else if(/容量比較|規定量超過|許容容量|許容質量/.test(t))add('容量・質量');else if(/容器コード/.test(t))add('容器コード');else add('その他');});
    globalIssues.filter(t=>!/危険物No\.\d+/.test(t)).forEach(t=>{if(/申請番号/.test(t))add('申請番号');else if(/国連番号|品名/.test(t))add('危険物情報');else if(/数量|質量|個数/.test(t))add('数量');else add('その他')});
    return counts;
  }
  function decorateReview(i){
    const review=i.review;if(!review)return;review.querySelector('.part562-human-review')?.remove();
    const box=document.createElement('div');box.className=`part562-human-review ${i.hard?'is-hard':i.acknowledged?'is-ack':i.systemIssue?'is-pending':'is-clear'}`;
    const reason=i.reasons.length?i.reasons.map(r=>`<span>${esc(r)}</span>`).join(''):'';
    if(!i.systemIssue){box.innerHTML='<div><strong>✓ 追加の要確認なし</strong><small>自動確認上、追加確認が必要な項目はありません。</small></div>';}
    else if(i.hard){box.innerHTML=`<div><strong>入力内容の修正が必要です</strong><div class="part562-reasons">${reason}</div><small>この項目は確認済み扱いにはできません。内容を修正して再度自動確認してください。</small></div><button type="button" data-part562-fix>入力欄を確認</button>`;}
    else if(i.acknowledged){box.innerHTML=`<div><strong>✓ 要確認内容を確認済み</strong><div class="part562-reasons">${reason}</div><small>法令上の警告・参照案内はそのまま保持しています。</small></div><button type="button" data-part562-unack>確認済みを取り消す</button>`;}
    else{box.innerHTML=`<div><strong>人による確認が必要です</strong><div class="part562-reasons">${reason}</div><small>原文・許可内容・条件等を確認したら、確認済みにしてください。</small></div><button type="button" data-part562-ack>内容を確認済みにする</button>`;}
    review.appendChild(box);
  }
  function markRows(infos){infos.forEach(i=>{i.row.classList.toggle('part561-review',i.issue);i.row.classList.toggle('part561-confirmed',!i.issue);i.row.classList.toggle('part562-reviewed-warning',i.acknowledged);i.row.classList.toggle('part562-hard-issue',i.hard);i.row.dataset.part561Status=i.issue?'review':'confirmed';decorateReview(i)})}
  function setSteps(stage){qa('#part561EasyGuide [data-step]').forEach(node=>{const n=Number(node.dataset.step);node.classList.toggle('is-done',n<stage||stage===5);node.classList.toggle('is-current',n===stage)})}
  function currentStage({imported,checked,registered,issues,blockers,reviewer}){if(registered)return 5;if(!imported)return 1;if(!checked)return 2;if(issues+blockers>0)return 3;if(!reviewer)return 4;return 4}
  function actionModel(ctx){
    if(ctx.registered)return{label:'登録した申請を詳細確認',hint:'申請番号管理の詳細画面を新しいタブで開けます。',kind:'open'};
    if(!ctx.imported)return{label:'ファイルを選択',hint:'ExcelまたはCSVの申請書を選択してください。',kind:'file'};
    if(!ctx.checked)return{label:'自動確認を実行',hint:'取込内容を確認したら、自動確認を実行します。',kind:'check'};
    if(ctx.blockers>0)return{label:'修正が必要な項目を確認',hint:`登録前に修正が必要な項目が ${ctx.blockers}件あります。`,kind:'blocker'};
    if(ctx.issues>0)return{label:'次の要確認を確認',hint:`未確認・要修正の危険物が ${ctx.issues}件あります。確認が必要な箇所だけ順番に確認できます。`,kind:'issue'};
    if(!ctx.reviewer)return{label:'原本照合者を入力',hint:'危険物の確認が完了しました。原本照合者を確認してください。',kind:'reviewer'};
    if(ctx.registerEnabled)return{label:ctx.registerLabel||'申請番号管理へ登録',hint:'確認が完了しました。申請番号管理へ1操作で登録できます。',kind:'register'};
    return{label:'登録内容を確認',hint:'登録条件を確認してください。',kind:'registerArea'};
  }
  function collect(){
    const infos=rowsInfo(),imported=isVisible($('intakeEditSection')),checked=isVisible($('intakeCheckSection')),registered=isVisible($('intakeOpenApplication'));
    const blockerTexts=checked?listIssues('intakeBlockers'):[],warningTexts=checked?listIssues('intakeWarnings'):[];
    const issueRows=checked?infos.filter(i=>i.issue):[],ackRows=checked?infos.filter(i=>i.acknowledged):[];
    const reviewer=String($('intakeReviewer')?.value||'').trim();const reg=$('intakeRegisterApplication');
    const hardRows=checked?infos.filter(i=>i.hard):[],humanPending=checked?infos.filter(i=>i.issue&&!i.hard):[],autoOk=checked?infos.filter(i=>!i.systemIssue).length:0;return{infos,imported,checked,registered,issueRows,ackRows,hardRows,humanPending,issues:issueRows.length,acknowledged:ackRows.length,autoOk,ok:checked?infos.length-issueRows.length:0,blockers:blockerTexts.length,warnings:warningTexts.length,globalIssues:[...blockerTexts,...warningTexts],reviewer,registerEnabled:Boolean(reg&&!reg.disabled),registerLabel:reg?.textContent?.trim()||'',cargoCount:infos.length};
  }
  function reviewerCandidate(){try{const user=window.ISSAuthBridge?.currentAuth?.().user||{};return String(user.displayName||user.name||user.loginId||'').trim()}catch{return''}}
  function applyReviewerCandidate(checked){if(!checked||ui.reviewerCandidateApplied)return;ui.reviewerCandidateApplied=true;const input=$('intakeReviewer');const name=reviewerCandidate();if(input&&!String(input.value||'').trim()&&name){input.value=name;input.dataset.part562AutoReviewer='true';input.dispatchEvent(new Event('input',{bubbles:true}));const n=$('part562ReviewerAssist');if(n)n.textContent=`ログイン利用者「${name}」を候補入力しました。必要に応じて変更できます。`;}}
  function jumpToInfo(info){
    if(!info?.row)return;qa('#intakeCargoBody tr.part561-focus').forEach(r=>r.classList.remove('part561-focus'));info.row.classList.add('part561-focus');info.row.setAttribute('tabindex','-1');info.row.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>info.row.focus({preventScroll:true}),300);setTimeout(()=>info.row.classList.remove('part561-focus'),2600);
  }
  function renderReviewBoard(ctx){
    const board=$('part563ReviewBoard'),list=$('part563ReviewList'),count=$('part563ReviewBoardCount');if(!board||!list||!count)return;
    board.hidden=!ctx.checked||ctx.cargoCount===0;if(board.hidden)return;
    const rowTargets=ctx.infos.filter(i=>i.systemIssue);const global=ctx.globalIssues.filter(t=>!/危険物No\.\d+/.test(t));count.textContent=`${ctx.issues+global.length}件`;
    if(!rowTargets.length&&!global.length){list.innerHTML='<div class="part563-review-empty"><strong>✓ 確認対象はありません</strong><span>危険物の自動確認と人による確認が完了しています。</span></div>';return}
    const rows=rowTargets.map(i=>{const state=i.hard?'要修正':i.acknowledged?'確認済み':'人確認待ち';const cls=i.hard?'is-hard':i.acknowledged?'is-ack':'is-pending';const reasons=(i.reasons.length?i.reasons:['要確認']).map(r=>`<span>${esc(r)}</span>`).join('');let actions=`<button type="button" data-part563-jump="${i.index}">該当箇所を開く</button>`;if(i.hard)actions+=`<button type="button" class="is-main" data-part563-fix="${i.index}">入力欄を修正</button>`;else if(i.acknowledged)actions+=`<button type="button" data-part563-unack="${i.index}">確認済みを取消</button>`;else actions+=`<button type="button" class="is-main" data-part563-ack="${i.index}">確認済みにする</button>`;return `<article class="part563-review-item ${cls}"><div class="part563-review-item__main"><div class="part563-review-item__title"><strong>危険物No.${i.index+1} ${i.un?`UN${esc(i.un)}`:''}</strong><b>${state}</b></div><div class="part563-review-item__reasons">${reasons}</div></div><div class="part563-review-item__actions">${actions}</div></article>`}).join('');
    const globals=global.length?`<div class="part563-global-issues"><strong>申請全体の確認事項</strong>${global.map(t=>`<p>${esc(t)}</p>`).join('')}</div>`:'';list.innerHTML=globals+rows;
  }
  function applicationLabel(){const y=String($('intakeApplicationYear')?.value||'').trim(),n=String($('intakeApplicationNumber')?.value||'').trim(),t=String($('intakeNumberType')?.value||'').trim();return [y,t,n].filter(Boolean).join('-')||'未入力'}
  function renderFinalSummary(ctx){
    const card=$('part563FinalSummary');if(!card)return;const ready=ctx.checked&&ctx.issues===0&&ctx.blockers===0&&!ctx.registered;card.hidden=!ready;document.body.classList.toggle('part563-final-ready',ready);
    if(!ready)return;$('part563FinalApplication').textContent=applicationLabel();$('part563FinalCargo').textContent=`${ctx.cargoCount}件`;$('part563FinalAck').textContent=ctx.acknowledged?`${ctx.acknowledged}件確認済み`:'追加確認なし';$('part563FinalReviewer').textContent=ctx.reviewer||'未入力';
    const btn=$('part563FinalRegister');btn.disabled=!ctx.registerEnabled||!ctx.reviewer;btn.textContent=ctx.registerLabel||'申請番号管理へ登録';const hint=$('part563FinalHint');hint.textContent=!ctx.reviewer?'原本照合者を確認してください。':ctx.registerEnabled?'確認内容をこの申請番号へ登録します。':'登録条件を確認してください。';
  }
  function render(){
    ui.scheduled=false;ensureGuide();let ctx=collect();applyReviewerCandidate(ctx.checked);ctx=collect();markRows(ctx.infos);const stage=currentStage(ctx),action=actionModel(ctx);ui.lastStage=action.kind;
    setSteps(stage);$('part561CargoCount').textContent=`${ctx.cargoCount}件`;$('part561OkCount').textContent=ctx.checked?`${ctx.ok}件`:'―';$('part562AckCount').textContent=ctx.checked?`${ctx.acknowledged}件`:'―';$('part561ReviewCount').textContent=ctx.checked?`${ctx.issues}件`:'―';
    const stateText=ctx.registered?'登録済み':!ctx.imported?'申請書待ち':!ctx.checked?'取込内容を確認':ctx.blockers?'修正が必要':ctx.issues?'要確認あり':ctx.registerEnabled?'登録できます':'確認完了';$('part561GuideState').textContent=stateText;
    const counts=categories(ctx.issueRows,ctx.globalIssues),chips=$('part561PointChips');if(!ctx.checked)chips.innerHTML='<span class="part561-point-chip is-clear">自動確認後に確認ポイントを表示します</span>';else if(!counts.size&&!ctx.acknowledged)chips.innerHTML='<span class="part561-point-chip is-clear">追加の要確認はありません</span>';else{const pending=[...counts.entries()].map(([k,v])=>`<span class="part561-point-chip">${esc(k)} ${v}件</span>`).join('');const done=ctx.acknowledged?`<span class="part561-point-chip is-reviewed">確認済み警告 ${ctx.acknowledged}件</span>`:'';chips.innerHTML=pending+done;}
    const nonCargoGlobal=ctx.globalIssues.filter(t=>!/危険物No\.\d+/.test(t)).length;$('part561GlobalIssueCount').textContent=ctx.checked?(nonCargoGlobal?`全体確認 ${nonCargoGlobal}件`:'') :'';
    $('part561PrimaryAction').textContent=action.label;$('part561GuideHint').textContent=action.hint;$('part561MobileButton').textContent=action.label;$('part561MobileStatus').textContent=action.hint;
    const filter=$('part561FilterAction');filter.hidden=!(ctx.checked&&ctx.cargoCount>0);filter.textContent=ui.showReviewOnly?'すべて表示':'未確認だけ表示';const cf=$('part561CargoFilter');if(cf){cf.hidden=filter.hidden;cf.textContent=filter.textContent}
    const ni=$('part561NextIssue'),pi=$('part562PrevIssue');if(ni)ni.disabled=!ctx.checked||ctx.issues===0;if(pi)pi.disabled=!ctx.checked||ctx.issues===0;
    const shortcut=$('part561RegisterShortcut');shortcut.hidden=!(ctx.checked&&ctx.registerEnabled&&ctx.issues===0);shortcut.textContent='登録欄へ進む';
    document.body.classList.toggle('part561-show-review-only',ui.showReviewOnly&&ctx.checked);
    const tb=$('part561CargoToolbarText');if(tb)tb.textContent=ctx.checked?`危険物 ${ctx.cargoCount}件｜確認済み ${ctx.ok}件（要確認確認済み ${ctx.acknowledged}件）｜未確認・要修正 ${ctx.issues}件`:`危険物 ${ctx.cargoCount}件`;
    renderReviewBoard(ctx);renderFinalSummary(ctx);updateOptionalSummary();
  }
  function focusIssue(direction){const issues=collect().issueRows;if(!issues.length){$('intakeCheckSection')?.scrollIntoView({behavior:'smooth',block:'start'});return}if(direction<0)ui.issueCursor=(ui.issueCursor<=0?issues.length:ui.issueCursor)-1;else ui.issueCursor=(ui.issueCursor+1)%issues.length;qa('#intakeCargoBody tr.part561-focus').forEach(r=>r.classList.remove('part561-focus'));const target=issues[ui.issueCursor].row;target.classList.add('part561-focus');target.setAttribute('tabindex','-1');target.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>target.focus({preventScroll:true}),350);const current=issues[ui.issueCursor];const reason=current.reasons.join('・')||'要確認';const hint=`要確認 ${ui.issueCursor+1}/${issues.length}：危険物No.${current.index+1} ${current.un?`UN${current.un}`:''}（${reason}）`;if($('part561GuideHint'))$('part561GuideHint').textContent=hint;if($('part561MobileStatus'))$('part561MobileStatus').textContent=hint;setTimeout(()=>target.classList.remove('part561-focus'),2600)}
  function nextIssue(){focusIssue(1)}
  function prevIssue(){focusIssue(-1)}
  function toggleReviewOnly(){ui.showReviewOnly=!ui.showReviewOnly;if(!ui.showReviewOnly)ui.issueCursor=-1;render()}
  function focusFixField(info){const row=info.row,t=info.text;let f;if(/容器コード/.test(t))f=q('[data-cargo-field="containerCode"]',row);else if(/包装要件/.test(t))f=q('[data-cargo-field="packingInstruction"]',row);else if(/国連番号/.test(t))f=q('[data-cargo-field="unNumber"]',row);else if(/規定量超過|許容容量|許容質量|容量比較/.test(t))f=q('[data-cargo-field="totalNetMassKg"]',row)||q('[data-cargo-field="packageCount"]',row);f=f||q('input,select,textarea',row);f?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>f?.focus(),300)}
  function syncAcknowledgementNote(){
    const note=$('intakeReviewNote');if(!note)return;const infos=rowsInfo().filter(i=>i.acknowledged);const marker='[かんたん確認]';let value=String(note.value||'').replace(/\n?\[かんたん確認\][^\n]*/g,'').trim();if(infos.length){const nums=infos.map(i=>`No.${i.index+1}`).join('、');const line=`${marker} 要確認事項を確認済み：${nums}（${infos.length}件）`;value=[value,line].filter(Boolean).join('\n');}note.value=value.slice(0,1000);note.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function primaryAction(){
    const ctx=collect();const action=actionModel(ctx);
    if(action.kind==='open'){const a=$('intakeOpenApplication');if(a)a.click();return}
    if(action.kind==='file'){$('intakeSelectFile')?.click();return}
    if(action.kind==='check'){$('intakeRunCheck')?.click();setTimeout(schedule,80);return}
    if(action.kind==='blocker'){$('intakeBlockers')?.closest('.intake-finding')?.scrollIntoView({behavior:'smooth',block:'center'});return}
    if(action.kind==='issue'){nextIssue();return}
    if(action.kind==='reviewer'){$('intakeReviewer')?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>$('intakeReviewer')?.focus(),350);return}
    if(action.kind==='register'){syncAcknowledgementNote();$('intakeRegisterApplication')?.click();setTimeout(schedule,120);return}
    $('intakeRegisterSection')?.scrollIntoView({behavior:'smooth',block:'start'});
  }
  function schedule(){if(ui.scheduled)return;ui.scheduled=true;setTimeout(render,40)}
  document.addEventListener('click',e=>{
    const row=e.target.closest('#intakeCargoBody tr[data-cargo-index]');
    if(row&&e.target.closest('[data-part562-ack]')){const i=rowInfo(row);if(i.systemIssue&&!i.hard){ui.reviewed.add(i.key);ui.issueCursor=-1;render();setTimeout(()=>{if(collect().issues)nextIssue()},120)}return}
    if(row&&e.target.closest('[data-part562-unack]')){const i=rowInfo(row);ui.reviewed.delete(i.key);ui.issueCursor=-1;render();return}
    if(row&&e.target.closest('[data-part562-fix]')){focusFixField(rowInfo(row));return}
    const boardIndexAttr=e.target.closest('[data-part563-jump],[data-part563-fix],[data-part563-ack],[data-part563-unack]');if(boardIndexAttr){const idx=Number(boardIndexAttr.dataset.part563Jump??boardIndexAttr.dataset.part563Fix??boardIndexAttr.dataset.part563Ack??boardIndexAttr.dataset.part563Unack);const info=rowsInfo().find(i=>i.index===idx);if(!info)return;if(boardIndexAttr.hasAttribute('data-part563-jump')){jumpToInfo(info);return}if(boardIndexAttr.hasAttribute('data-part563-fix')){focusFixField(info);return}if(boardIndexAttr.hasAttribute('data-part563-ack')&&info.systemIssue&&!info.hard){ui.reviewed.add(info.key);ui.issueCursor=-1;render();return}if(boardIndexAttr.hasAttribute('data-part563-unack')){ui.reviewed.delete(info.key);ui.issueCursor=-1;render();return}}
  });
  document.addEventListener('click',e=>{if(e.target.closest('#intakeRegisterApplication'))syncAcknowledgementNote()},{capture:true});
  document.addEventListener('input',e=>{if(e.target.id==='intakeReviewer'&&e.isTrusted){ui.reviewerCandidateApplied=true;e.target.dataset.part562AutoReviewer='false'}if(e.target.closest('#intakeEditSection,#intakeCheckSection'))schedule()});
  document.addEventListener('change',e=>{if(e.target.closest('#intakeEditSection,#intakeCheckSection'))schedule()});
  document.addEventListener('click',e=>{if(e.target.closest('#intakeRunCheck,#intakeRegisterApplication,#intakeClear,#intakeAddCargo,[data-remove-cargo],#intakeOpenApplication'))setTimeout(schedule,100)});
  const observer=new MutationObserver(schedule);['intakeEditSection','intakeCheckSection','intakeRegisterSection','intakeCargoBody','intakeRegisterMessage'].forEach(id=>{const n=$(id);if(n)observer.observe(n,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','disabled','class','href']})});
  ensureGuide();render();
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part563.js':'part563'});
})();
