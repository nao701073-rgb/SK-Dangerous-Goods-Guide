(() => {
  "use strict";
  const STORAGE_KEY = "iss-operations-acceptance-v237";
  const LEGACY_STORAGE_KEY = "iss-operations-acceptance-v236";
  const domains = [
    ["利用者・権限","役割、所属、閲覧・登録・編集・削除範囲を確認します。"],
    ["ログイン・認証","初回ログイン、パスワード変更、MFA、ロック解除を確認します。"],
    ["申請番号・写真","事業所別範囲と安全環境室長の登録・編集可／削除不可を確認します。"],
    ["危険物・法令データ","検索、詳細、関連法令、関連資料、データ品質を確認します。"],
    ["法令・データ更新","PDF・構造化データの差分、検証、承認、公開手順を確認します。"],
    ["バックアップ・復元","データベース、写真、設定のバックアップと復元証跡を確認します。"],
    ["障害・セキュリティ","障害対応、監査ログ、利用履歴、秘密情報管理を確認します。"],
    ["性能・運用資料","50名・150名想定の性能と、仕様書・要領書の整合を確認します。"]
  ];
  const $ = id => document.getElementById(id);
  const emptyStore = () => ({draft:{},history:[],approvals:[],correctiveActions:[],periodReports:[],improvementPlans:[],improvementGovernance:[],annualClosings:[]});
  const load = () => { try { const raw=localStorage.getItem(STORAGE_KEY)||localStorage.getItem(LEGACY_STORAGE_KEY)||'{}'; return {...emptyStore(), ...JSON.parse(raw)}; } catch { return emptyStore(); } };
  const persist = data => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  let store = load();
  const today = () => new Date().toISOString().slice(0,10);
  const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const labelType=v=>({initial:"初回受入","major-update":"大規模更新後",quarterly:"四半期点検",annual:"年次点検"}[v]||v);
  const labelDecision=v=>({hold:"保留",conditional:"条件付き受入",accepted:"正式運用可"}[v]||v);
  const labelApproval=v=>({pending:"未判断",approved:"承認",returned:"差戻し"}[v]||v);
  const labelStatus=v=>({open:"未着手",working:"対応中",completed:"完了"}[v]||v);
  const labelPriority=v=>({normal:"通常",high:"高",urgent:"緊急"}[v]||v);
  function draft(){ return store.draft || {}; }
  function renderDomains(){
    const values=draft().domains||{};
    $("acceptanceDomainList").innerHTML=domains.map((d,i)=>{const v=values[i]||{status:"pending",evidence:""};return `<article class="acceptance-domain" data-status="${v.status}"><div><h3>${d[0]}</h3><p>${d[1]}</p></div><label>確認結果<select data-domain-status="${i}"><option value="pending" ${v.status==='pending'?'selected':''}>未確認</option><option value="pass" ${v.status==='pass'?'selected':''}>合格</option><option value="fail" ${v.status==='fail'?'selected':''}>不合格</option></select></label><label>証跡・確認内容<textarea rows="3" maxlength="2000" data-domain-evidence="${i}">${escapeHtml(v.evidence||'')}</textarea></label></article>`}).join("");
    updateProgress();
  }
  function updateProgress(){ const vals=draft().domains||{}; const passed=domains.filter((_,i)=>vals[i]?.status==='pass').length; $("acceptanceProgress").textContent=`${passed} / ${domains.length}`; const failed=domains.some((_,i)=>vals[i]?.status==='fail'); $("acceptanceStatusBadge").textContent=failed?"不合格あり":passed===domains.length?"全分野合格":`確認中 ${passed}/${domains.length}`; }
  function captureDraft(){
    const d=draft(); d.reviewType=$("reviewType").value; d.targetVersion=$("targetVersion").value.trim(); d.targetUsers=Number($("targetUsers").value||0); d.reviewDate=$("reviewDate").value; d.overallDecision=$("overallDecision").value; d.nextReviewDate=$("nextReviewDate").value; d.overallNote=$("overallNote").value.trim(); d.followUpNote=$("followUpNote").value.trim(); d.domains=d.domains||{}; store.draft=d; persist(store); return d;
  }
  function restore(){ const d=draft(); $("reviewType").value=d.reviewType||"initial"; $("targetVersion").value=d.targetVersion||"Part 237"; $("targetUsers").value=d.targetUsers||50; $("reviewDate").value=d.reviewDate||today(); $("overallDecision").value=d.overallDecision||"hold"; $("nextReviewDate").value=d.nextReviewDate||""; $("overallNote").value=d.overallNote||""; $("followUpNote").value=d.followUpNote||""; renderDomains(); }
  function approvalFor(id){ return [...(store.approvals||[])].reverse().find(a=>a.recordId===id); }
  function isLocked(id){ return approvalFor(id)?.status === "approved"; }
  function renderHistory(){ const history=store.history||[]; $("acceptanceHistory").innerHTML=history.length?history.slice(0,20).map(r=>{const a=approvalFor(r.id);const locked=a?.status==='approved';return `<article data-locked="${locked}"><header><strong>${labelType(r.reviewType)}／${escapeHtml(r.targetVersion||'版未記入')}${locked?'<span class="record-lock">確定</span>':''}</strong><span>${labelDecision(r.overallDecision)}・${labelApproval(a?.status||'pending')}</span></header><p>点検日：${r.reviewDate||'-'}　対象：${r.targetUsers||0}名　保存：${new Date(r.savedAt).toLocaleString('ja-JP')}</p><p>${escapeHtml(r.overallNote||'所見なし')}</p></article>`}).join(""):"<p>保存された点検記録はありません。</p>"; renderRecordOptions(); renderUpcoming(); renderSummary(); renderPeriodSummary(); }
  function renderRecordOptions(){ const approvalOpts=(store.history||[]).filter(r=>!isLocked(r.id)).map(r=>`<option value="${r.id}">${r.reviewDate||'-'}／${labelType(r.reviewType)}／${escapeHtml(r.targetVersion||'版未記入')}</option>`).join(''); const allOpts=(store.history||[]).map(r=>`<option value="${r.id}">${r.reviewDate||'-'}／${labelType(r.reviewType)}／${escapeHtml(r.targetVersion||'版未記入')}</option>`).join(''); $("approvalRecordId").innerHTML=`<option value="">${approvalOpts?'選択してください':'承認対象はありません'}</option>${approvalOpts}`; $("correctiveRecordId").innerHTML=`<option value="">関連なし</option>${allOpts}`; if($("improvementReviewId")) $("improvementReviewId").innerHTML=`<option value="">関連なし</option>${allOpts}`; }
  function renderCorrective(){ const list=store.correctiveActions||[]; const open=list.filter(x=>x.status!=="completed").length; $("correctiveSummary").textContent=`未完了 ${open}件`; $("correctiveActionList").innerHTML=list.length?list.slice(0,30).map(x=>`<article><header><strong>${labelPriority(x.priority)}／${labelStatus(x.status)}</strong><span>${x.dueDate||'期限未設定'}</span></header><p>${escapeHtml(x.detail)}</p><p>${x.evidence?`証跡：${escapeHtml(x.evidence)}`:'証跡未記入'}　保存：${new Date(x.savedAt).toLocaleString('ja-JP')}</p></article>`).join(''):"<p>登録された是正対応はありません。</p>"; }
  function renderUpcoming(){ const now=today(); const rows=(store.history||[]).filter(r=>r.nextReviewDate).sort((a,b)=>a.nextReviewDate.localeCompare(b.nextReviewDate)); $("upcomingReviewList").innerHTML=rows.length?rows.slice(0,20).map(r=>`<article><header><strong>${labelType(r.reviewType)}／${escapeHtml(r.targetVersion||'版未記入')}</strong><span>${r.nextReviewDate<now?'期限超過':r.nextReviewDate}</span></header><p>前回点検日：${r.reviewDate||'-'}　次回点検日：${r.nextReviewDate}</p></article>`).join(''):"<p>次回点検日が登録された記録はありません。</p>"; }

  const labelImprovementStatus=v=>({planned:"計画",working:"対応中",completed:"完了","carried-over":"次期へ引継ぎ"}[v]||v);
  const labelImprovementCategory=v=>({operation:"運用",security:"セキュリティ",data:"法令・データ",training:"教育・周知",performance:"性能・拡張",other:"その他"}[v]||v);
  function renderImprovementPlans(){
    if(!$("improvementPlanList")) return;
    const list=store.improvementPlans||[], open=list.filter(x=>x.status!=="completed").length, overdue=list.filter(x=>x.status!=="completed"&&x.dueDate&&x.dueDate<today()).length;
    $("improvementPlanSummary").textContent=overdue?`期限超過 ${overdue}件`:`未完了 ${open}件`;
    $("improvementPlanList").innerHTML=list.length?list.slice(0,40).map(x=>`<article><header><strong>${labelImprovementCategory(x.category)}／${labelImprovementStatus(x.status)}</strong><span>${x.dueDate||'期限未設定'}</span></header><p>${escapeHtml(x.detail)}</p><p>責任者：${escapeHtml(x.owner||'未設定')}　${x.evidence?`証跡・引継ぎ：${escapeHtml(x.evidence)}`:'証跡未記入'}</p></article>`).join(''):"<p>登録された改善計画はありません。</p>";
  }
  function annualData(year){
    const from=`${year}-01-01`,to=`${year}-12-31`;
    const reviews=(store.history||[]).filter(r=>r.reviewDate>=from&&r.reviewDate<=to);
    const ids=new Set(reviews.map(r=>r.id));
    const actions=(store.correctiveActions||[]).filter(x=>!x.recordId||ids.has(x.recordId));
    const plans=(store.improvementPlans||[]).filter(x=>!x.reviewId||ids.has(x.reviewId));
    return {year,from,to,reviews,actions,plans,approved:reviews.filter(r=>isLocked(r.id)).length,openActions:actions.filter(x=>x.status!=="completed").length,openPlans:plans.filter(x=>x.status!=="completed").length,carriedOver:plans.filter(x=>x.status==="carried-over").length};
  }
  function renderAnnualClosing(){
    if(!$("annualClosingSummary")) return;
    const year=Number($("annualClosingYear").value||new Date().getFullYear()),d=annualData(year);
    $("annualClosingSummary").innerHTML=`<p><strong>${year}年度集計</strong></p><p>点検 ${d.reviews.length}件／承認済み ${d.approved}件／未完了是正 ${d.openActions}件</p><p>改善計画 ${d.plans.length}件／未完了 ${d.openPlans}件／次期引継ぎ ${d.carriedOver}件</p>`;
    const rows=(store.annualClosings||[]).sort((a,b)=>b.year-a.year);
    $("annualClosingHistory").innerHTML=rows.length?rows.map(x=>`<article><header><strong>${x.year}年度／${escapeHtml(x.decisionLabel)}</strong><span>${new Date(x.savedAt).toLocaleString('ja-JP')}</span></header><p>${escapeHtml(x.note||'総括未記入')}</p><p>次年度引継ぎ：${escapeHtml(x.carryOverNote||'なし')}　次回点検：${x.nextReviewDate||'未設定'}</p></article>`).join(''):"<p>年度総括はまだありません。</p>";
  }
  function exportAnnualClosing(){
    const year=Number($("annualClosingYear").value||new Date().getFullYear()), summary=annualData(year), closing=(store.annualClosings||[]).find(x=>x.year===year)||null;
    const payload={version:"Part 237",exportedAt:new Date().toISOString(),summary,closing,notice:"本システムの利用は任意です。"};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`運用受入_年度総括_${year}.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function filteredImprovementPlans(){
    const owner=($("improvementOwnerFilter")?.value||"").trim().toLowerCase();
    const category=$("improvementCategoryFilter")?.value||"";
    const status=$("improvementStatusFilter")?.value||"";
    return (store.improvementPlans||[]).filter(x=>(!owner||String(x.owner||"").toLowerCase().includes(owner))&&(!category||x.category===category)&&(!status||x.status===status));
  }
  function renderImprovementDashboard(){
    if(!$("improvementDashboardCards")) return;
    const all=store.improvementPlans||[], now=today(), limit=new Date(); limit.setDate(limit.getDate()+30); const soon=limit.toISOString().slice(0,10);
    const active=all.filter(x=>x.status!=="completed"), overdue=active.filter(x=>x.dueDate&&x.dueDate<now), carried=all.filter(x=>x.status==="carried-over"), unassigned=active.filter(x=>!String(x.owner||"").trim()), dueSoon=active.filter(x=>x.dueDate&&x.dueDate>=now&&x.dueDate<=soon);
    const cards=[[active.length,"未完了",""],[overdue.length,"期限超過",overdue.length?"is-danger":"is-ok"],[carried.length,"次期引継ぎ",carried.length?"is-warning":"is-ok"],[unassigned.length,"責任者未設定",unassigned.length?"is-warning":"is-ok"],[dueSoon.length,"30日以内期限",dueSoon.length?"is-warning":"is-ok"]];
    $("improvementDashboardCards").innerHTML=cards.map(([n,l,c])=>`<article class="acceptance-summary-card ${c}"><strong>${n}</strong><span>${l}</span></article>`).join("");
    $("improvementDashboardStatus").textContent=overdue.length?`期限超過 ${overdue.length}件`:active.length?`未完了 ${active.length}件`:"要対応なし";
    const rows=filteredImprovementPlans().sort((a,b)=>(a.status==="completed")-(b.status==="completed")||String(a.dueDate||"9999").localeCompare(String(b.dueDate||"9999")));
    $("improvementDashboardList").innerHTML=rows.length?rows.slice(0,100).map(x=>`<article data-plan-id="${x.id}"><header><strong>${labelImprovementCategory(x.category)}／${labelImprovementStatus(x.status)}</strong><span>${x.dueDate||"期限未設定"}</span></header><p>${escapeHtml(x.detail)}</p><p>責任者：${escapeHtml(x.owner||"未設定")}</p><div class="readiness-actions improvement-quick-actions">${x.status!=="working"&&x.status!=="completed"?'<button type="button" data-plan-status="working">対応中</button>':''}${x.status!=="completed"?'<button type="button" data-plan-status="completed">完了</button>':''}${x.status!=="carried-over"&&x.status!=="completed"?'<button type="button" data-plan-status="carried-over">次期へ引継ぎ</button>':''}</div></article>`).join(""):"<p>条件に一致する改善計画はありません。</p>";
    renderAnnualComparison();
  }
  function renderAnnualComparison(){
    if(!$("annualComparison")) return;
    const year=Number($("annualClosingYear")?.value||new Date().getFullYear()), current=annualData(year), previous=annualData(year-1);
    const delta=(a,b)=>a-b;
    $("annualComparison").innerHTML=`<p><strong>${year}年度と${year-1}年度の比較</strong></p><p>改善計画：${current.plans.length}件（前年差 ${delta(current.plans.length,previous.plans.length)>=0?"+":""}${delta(current.plans.length,previous.plans.length)}）／未完了：${current.openPlans}件（前年差 ${delta(current.openPlans,previous.openPlans)>=0?"+":""}${delta(current.openPlans,previous.openPlans)}）</p><p>次期引継ぎ：${current.carriedOver}件（前年差 ${delta(current.carriedOver,previous.carriedOver)>=0?"+":""}${delta(current.carriedOver,previous.carriedOver)}）／承認済み点検：${current.approved}件</p>`;
  }
  function updateImprovementPlan(id,status){
    const plan=(store.improvementPlans||[]).find(x=>x.id===id); if(!plan) return;
    plan.status=status; plan.updatedAt=new Date().toISOString(); if(status==="completed"&&!plan.evidence) plan.evidence="完了（簡易更新。必要に応じて証跡を追記してください。）";
    persist(store); renderImprovementPlans(); renderImprovementDashboard(); renderAnnualClosing();
  }
  function renderImprovementGovernance(){
    if(!$('improvementGovernancePlan')) return;
    const plans=store.improvementPlans||[];
    $('improvementGovernancePlan').innerHTML=`<option value="">選択してください</option>${plans.map(p=>`<option value="${p.id}">${escapeHtml(p.detail.slice(0,40))}／${escapeHtml(p.owner||'担当未設定')}</option>`).join('')}`;
    const rows=store.improvementGovernance||[];
    $('improvementGovernanceStatus').textContent=`記録 ${rows.length}件`;
    const labels={approve:'承認', 'change-owner':'担当者変更','change-due-date':'期限変更','accept-handoff':'引継ぎ受領',return:'差戻し'};
    $('improvementGovernanceList').innerHTML=rows.length?rows.slice(0,100).map(r=>`<article><header><strong>${labels[r.action]||r.action}</strong><span>${new Date(r.savedAt).toLocaleString('ja-JP')}</span></header><p>${escapeHtml(r.planDetail||'対象計画')}</p><p>${escapeHtml(r.note)}</p><p>担当者：${escapeHtml(r.owner||'変更なし')}　期限：${r.dueDate||'変更なし'}</p></article>`).join(''):'<p>承認・変更・引継ぎの記録はありません。</p>';
  }
  function saveImprovementGovernance(){
    const plan=(store.improvementPlans||[]).find(p=>p.id===$('improvementGovernancePlan').value);
    if(!plan){alert('対象計画を選択してください。');return;}
    const action=$('improvementGovernanceAction').value, owner=$('improvementGovernanceOwner').value.trim(), dueDate=$('improvementGovernanceDueDate').value, note=$('improvementGovernanceNote').value.trim();
    if(!note){alert('理由・引継ぎ内容を入力してください。');return;}
    if(action==='change-owner'&&!owner){alert('新しい担当者を入力してください。');return;}
    if(action==='change-due-date'&&!dueDate){alert('新しい期限を入力してください。');return;}
    if(action==='change-owner') plan.owner=owner;
    if(action==='change-due-date') plan.dueDate=dueDate;
    if(action==='accept-handoff'){plan.status='working'; if(owner) plan.owner=owner; if(dueDate) plan.dueDate=dueDate;}
    if(action==='approve') plan.approvalStatus='approved';
    if(action==='return') plan.approvalStatus='returned';
    plan.updatedAt=new Date().toISOString();
    const record={id:`IGV-${Date.now()}`,planId:plan.id,planDetail:plan.detail,action,owner:owner||plan.owner||'',dueDate:dueDate||plan.dueDate||'',note,savedAt:new Date().toISOString()};
    store.improvementGovernance=[record,...(store.improvementGovernance||[])].slice(0,300);persist(store);
    $('improvementGovernanceForm').reset();renderImprovementPlans();renderImprovementDashboard();renderImprovementGovernance();
  }
  function exportImprovementProgressReport(){
    const payload={version:'Part 238',exportedAt:new Date().toISOString(),summary:{plans:(store.improvementPlans||[]).length,open:(store.improvementPlans||[]).filter(p=>p.status!=='completed').length,overdue:(store.improvementPlans||[]).filter(p=>p.status!=='completed'&&p.dueDate&&p.dueDate<today()).length,governanceRecords:(store.improvementGovernance||[]).length},plans:store.improvementPlans||[],governance:store.improvementGovernance||[],notice:'本システムの利用は任意です。'};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`改善計画_進捗_${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function exportImprovementHandoff(){
    const rows=(store.improvementPlans||[]).filter(x=>x.status!=="completed");
    const byOwner=rows.reduce((acc,x)=>{const key=x.owner||"責任者未設定";(acc[key]||(acc[key]=[])).push(x);return acc;},{});
    const payload={version:"Part 237",exportedAt:new Date().toISOString(),summary:{open:rows.length,overdue:rows.filter(x=>x.dueDate&&x.dueDate<today()).length,carriedOver:rows.filter(x=>x.status==="carried-over").length,unassigned:rows.filter(x=>!x.owner).length},byOwner,notice:"本システムの利用は任意です。"};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`改善計画_引継ぎ_${today()}.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function dateRange(){
    const year=Number($("acceptancePeriodYear")?.value||new Date().getFullYear());
    const type=$("acceptancePeriodType")?.value||"quarterly";
    if(type==="annual") return {type,year,from:`${year}-01-01`,to:`${year}-12-31`,label:`${year}年`};
    const q=Number($("acceptancePeriodQuarter")?.value||1), start=(q-1)*3+1, end=start+2;
    const last=new Date(year,end,0).getDate();
    return {type,year,quarter:q,from:`${year}-${String(start).padStart(2,'0')}-01`,to:`${year}-${String(end).padStart(2,'0')}-${last}`,label:`${year}年第${q}四半期`};
  }
  function periodData(){
    const range=dateRange();
    const reviews=(store.history||[]).filter(r=>r.reviewDate>=range.from&&r.reviewDate<=range.to);
    const ids=new Set(reviews.map(r=>r.id));
    const actions=(store.correctiveActions||[]).filter(x=>!x.recordId||ids.has(x.recordId));
    const overdue=actions.filter(x=>x.status!=="completed"&&x.dueDate&&x.dueDate<today());
    return {range,reviews,actions,approved:reviews.filter(r=>isLocked(r.id)).length,accepted:reviews.filter(r=>r.overallDecision==="accepted").length,openActions:actions.filter(x=>x.status!=="completed").length,overdueActions:overdue.length};
  }
  function renderSummary(){
    const history=store.history||[], actions=store.correctiveActions||[];
    const approved=history.filter(r=>isLocked(r.id)).length, pending=history.filter(r=>!approvalFor(r.id)||approvalFor(r.id).status==='pending').length;
    const open=actions.filter(x=>x.status!=="completed").length, overdue=actions.filter(x=>x.status!=="completed"&&x.dueDate&&x.dueDate<today()).length;
    const upcoming=history.filter(r=>r.nextReviewDate&&r.nextReviewDate>=today()).length;
    const cards=[[history.length,'点検記録',''],[approved,'承認済み','is-ok'],[pending,'承認待ち',pending?'is-warning':'is-ok'],[open,'未完了是正',open?'is-warning':'is-ok'],[overdue,'期限超過',overdue?'is-danger':'is-ok']];
    $("acceptanceSummaryCards").innerHTML=cards.map(([n,l,c])=>`<article class="acceptance-summary-card ${c}"><strong>${n}</strong><span>${l}</span></article>`).join('');
    $("acceptanceSummaryStatus").textContent=overdue?`期限超過 ${overdue}件`:open?`未完了 ${open}件`:upcoming?`次回予定 ${upcoming}件`:'要対応なし';
  }
  function renderPeriodSummary(){
    if(!$("acceptancePeriodSummary")) return; const d=periodData();
    $("acceptancePeriodQuarter").disabled=d.range.type==='annual';
    $("acceptancePeriodSummary").innerHTML=`<p><strong>${d.range.label}</strong>（${d.range.from}～${d.range.to}）</p><p>点検 ${d.reviews.length}件／承認済み ${d.approved}件／正式運用可 ${d.accepted}件</p><p>是正対応 ${d.actions.length}件／未完了 ${d.openActions}件／期限超過 ${d.overdueActions}件</p>`;
  }
  function exportPeriodReport(){
    const d=periodData(); const payload={version:"Part 237",generatedAt:new Date().toISOString(),period:d.range,summary:{reviewCount:d.reviews.length,approvedCount:d.approved,acceptedCount:d.accepted,correctiveCount:d.actions.length,openCorrectiveCount:d.openActions,overdueCorrectiveCount:d.overdueActions},reviews:d.reviews.map(r=>({...r,approval:approvalFor(r.id)})),correctiveActions:d.actions,notice:"本システムの利用は任意です。"};
    store.periodReports=[{id:`PER-${Date.now()}`,period:d.range,summary:payload.summary,generatedAt:payload.generatedAt},...(store.periodReports||[])].slice(0,50);persist(store);
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`運用受入_${d.range.label}.json`;a.click();URL.revokeObjectURL(a.href);
  }

  function exportJson(record){ const payload={version:"Part 237",exportedAt:new Date().toISOString(),record,approval:approvalFor(record.id),correctiveActions:(store.correctiveActions||[]).filter(x=>!record.id||x.recordId===record.id),notice:"本システムの利用は任意です。"}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`運用受入定期点検_${record.reviewDate||today()}.json`; a.click(); URL.revokeObjectURL(a.href); }
  document.addEventListener("DOMContentLoaded",()=>{
    restore(); renderHistory(); renderCorrective(); renderImprovementPlans();
    ["acceptanceMetaForm","acceptanceDecisionForm"].forEach(id=>$(id).addEventListener("input",captureDraft));
    $("acceptanceDomainList").addEventListener("input",e=>{ const d=draft(); d.domains=d.domains||{}; const status=e.target.dataset.domainStatus,evidence=e.target.dataset.domainEvidence; if(status!==undefined){d.domains[status]=d.domains[status]||{};d.domains[status].status=e.target.value;} if(evidence!==undefined){d.domains[evidence]=d.domains[evidence]||{};d.domains[evidence].evidence=e.target.value;} store.draft=d;persist(store);renderDomains(); });
    $("acceptanceDecisionForm").addEventListener("submit",e=>{e.preventDefault();const d=captureDraft();const values=d.domains||{};const allPass=domains.every((_,i)=>values[i]?.status==='pass');if(d.overallDecision==='accepted'&&!allPass){alert('正式運用可を保存するには、全分野を合格にしてください。');return;}const record={...d,id:`ACC-${Date.now()}`,savedAt:new Date().toISOString()};store.history=[record,...(store.history||[])].slice(0,50);store.draft={...d};persist(store);$("acceptanceMessage").textContent=`保存しました：${new Date(record.savedAt).toLocaleString('ja-JP')}`;renderHistory();});
    $("acceptanceApprovalForm").addEventListener("submit",e=>{e.preventDefault();const recordId=$("approvalRecordId").value;if(!recordId){alert('対象記録を選択してください。');return;}if(isLocked(recordId)){alert('承認済みの確定記録は変更できません。');return;}const approval={id:`APR-${Date.now()}`,recordId,status:$("approvalStatus").value,comment:$("approvalComment").value.trim(),savedAt:new Date().toISOString()};store.approvals=[...(store.approvals||[]),approval].slice(-100);persist(store);$("approvalComment").value='';renderHistory();});
    $("correctiveActionForm").addEventListener("submit",e=>{e.preventDefault();const detail=$("correctiveDetail").value.trim();if(!detail)return;const action={id:`COR-${Date.now()}`,recordId:$("correctiveRecordId").value||null,priority:$("correctivePriority").value,dueDate:$("correctiveDueDate").value,status:$("correctiveStatus").value,detail,evidence:$("correctiveEvidence").value.trim(),savedAt:new Date().toISOString()};store.correctiveActions=[action,...(store.correctiveActions||[])].slice(0,100);persist(store);e.target.reset();renderCorrective();});
    $("exportAcceptanceReport").addEventListener("click",()=>{const latest=store.history?.[0]||{...captureDraft(),id:null};exportJson(latest);});
    $("acceptancePeriodYear").value=new Date().getFullYear();
    ["acceptancePeriodType","acceptancePeriodYear","acceptancePeriodQuarter"].forEach(id=>$(id).addEventListener("change",renderPeriodSummary));
    $("exportPeriodReport").addEventListener("click",exportPeriodReport);
    $("improvementPlanForm").addEventListener("submit",e=>{e.preventDefault();const detail=$("improvementDetail").value.trim();if(!detail)return;const plan={id:`IMP-${Date.now()}`,reviewId:$("improvementReviewId").value||null,category:$("improvementCategory").value,owner:$("improvementOwner").value.trim(),dueDate:$("improvementDueDate").value,status:$("improvementStatus").value,detail,evidence:$("improvementEvidence").value.trim(),savedAt:new Date().toISOString()};store.improvementPlans=[plan,...(store.improvementPlans||[])].slice(0,200);persist(store);e.target.reset();renderImprovementPlans();renderAnnualClosing();});
    $("annualClosingYear").value=new Date().getFullYear();
    $("annualClosingYear").addEventListener("change",()=>{renderAnnualClosing();renderImprovementDashboard();});
    $("annualClosingForm").addEventListener("submit",e=>{e.preventDefault();const year=Number($("annualClosingYear").value),decision=$("annualClosingDecision").value;const labels={stable:"安定",observe:"要観察","improvement-required":"改善必要"};const closing={id:`ANN-${Date.now()}`,year,decision,decisionLabel:labels[decision],nextReviewDate:$("annualNextReviewDate").value,note:$("annualClosingNote").value.trim(),carryOverNote:$("annualCarryOverNote").value.trim(),summary:annualData(year),savedAt:new Date().toISOString()};store.annualClosings=[closing,...(store.annualClosings||[]).filter(x=>x.year!==year)].slice(0,20);persist(store);renderAnnualClosing();});
    $("exportAnnualClosing").addEventListener("click",exportAnnualClosing);
    ["improvementOwnerFilter","improvementCategoryFilter","improvementStatusFilter"].forEach(id=>$(id)?.addEventListener("input",renderImprovementDashboard));
    $("improvementDashboardList")?.addEventListener("click",e=>{const button=e.target.closest("button[data-plan-status]");if(!button)return;const article=button.closest("[data-plan-id]");updateImprovementPlan(article?.dataset.planId,button.dataset.planStatus);});
    $("exportImprovementHandoff")?.addEventListener("click",exportImprovementHandoff);
    $("improvementGovernanceForm")?.addEventListener("submit",e=>{e.preventDefault();saveImprovementGovernance();});
    $("exportImprovementProgressReport")?.addEventListener("click",exportImprovementProgressReport);
    renderSummary(); renderPeriodSummary(); renderAnnualClosing(); renderImprovementDashboard(); renderImprovementGovernance();
  });
})();
