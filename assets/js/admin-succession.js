(()=>{
  "use strict";
  const KEY="iss.adminSuccessionPlan.v2";
  const form=document.getElementById("successionForm");
  const status=document.getElementById("successionStatus");
  const history=document.getElementById("successionHistory");
  const target=document.getElementById("targetUserId");
  const executionState=document.getElementById("executionState");
  const executionNotice=document.getElementById("executionNotice");
  const exportButton=document.getElementById("exportSuccession");
  let executionEnabled=false;

  const checks=()=>Object.fromEntries([...form.elements].filter(x=>x.type==="checkbox").map(x=>[x.name,x.checked]));
  const allChecked=()=>Object.values(checks()).every(Boolean);
  const isoLocal=value=>value?new Date(value).toISOString():null;
  const statusLabel=value=>({approved:"承認済み",scheduled:"切替予約",executed:"切替実行済み","rolled-back":"ロールバック済み",cancelled:"取消",completed:"移行完了"}[value]||value);
  const escape=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  function renderStatus(){
    const done=Object.values(checks()).filter(Boolean).length;
    status.textContent=`${done}/6項目確認済み。移行先は安全環境室長に限定されています。`;
    status.dataset.ready=done===6?"true":"false";
  }
  async function loadCandidates(){
    try{
      const data=await ISSApi.successionCandidates();
      target.innerHTML='<option value="">安全環境室長を選択</option>'+data.candidates.map(item=>`<option value="${escape(item.id)}">${escape(item.display_name)}（${escape(item.login_id)}）${item.mfa_required&&item.email_verified?"":"［MFA・メール確認未完了］"}</option>`).join("");
      if(!data.candidates.length) status.textContent="有効な安全環境室長アカウントが登録されていません。";
    }catch(error){status.textContent=error.message;}
  }
  async function loadHistory(){
    try{
      const data=await ISSApi.successionRequests();
      executionEnabled=Boolean(data.executionEnabled);
      executionState.textContent=executionEnabled?"有効":"無効";
      executionNotice.className=executionEnabled?"execution-ready":"execution-warning";
      executionNotice.textContent=executionEnabled?"正式切替が有効です。バックアップ、承認、切替日時を再確認してください。":"正式切替は現在無効です。移行申請と準備記録のみ作成できます。";
      history.innerHTML=data.requests.length?data.requests.map(item=>{
        const canExecute=executionEnabled&&["approved","scheduled"].includes(item.status);
        const canRollback=item.status==="executed"&&(!item.rollback_until||new Date(item.rollback_until)>new Date());
        const canReview=["executed","completed"].includes(item.status);
        const canFinalize=item.status==="executed";
        const canConfirmReduction=item.status==="completed"&&!item.former_admin_reduction_confirmed_at;
        return `<article class="succession-record"><header><div><strong>${escape(item.target_name)}（${escape(item.target_login_id)}）</strong><p>${escape(item.approver_title)} ${escape(item.approver_name)}承認・${escape(item.approval_date)}</p></div><span class="status-pill">${escape(statusLabel(item.status))}</span></header><p>登録: ${new Date(item.created_at).toLocaleString("ja-JP")}${item.scheduled_at?`／予定: ${new Date(item.scheduled_at).toLocaleString("ja-JP")}`:""}</p>${item.executed_at?`<p>実行: ${new Date(item.executed_at).toLocaleString("ja-JP")}／支援期限: ${item.support_until?new Date(item.support_until).toLocaleString("ja-JP"):"―"}／ロールバック期限: ${item.rollback_until?new Date(item.rollback_until).toLocaleString("ja-JP"):"―"}</p>`:""}${item.finalized_at?`<p>移行完了: ${new Date(item.finalized_at).toLocaleString("ja-JP")}／旧管理者権限縮小期限: ${item.former_admin_reduction_due?new Date(item.former_admin_reduction_due).toLocaleString("ja-JP"):"―"}</p>`:""}<p>安定稼働確認: ${Number(item.review_count||0)}件${item.former_admin_reduction_confirmed_at?`／旧管理者権限縮小確認済み: ${new Date(item.former_admin_reduction_confirmed_at).toLocaleString("ja-JP")}`:""}</p><p>${escape(item.note||"")}</p><div class="succession-actions">${canExecute?`<button data-execute="${escape(item.id)}">正式切替を実行</button>`:""}${canReview?`<button data-review="${escape(item.id)}">安定稼働確認を記録</button>`:""}${canFinalize?`<button data-finalize="${escape(item.id)}">移行完了を確定</button>`:""}${canConfirmReduction?`<button data-reduction="${escape(item.id)}">旧管理者の権限縮小を確認</button>`:""}${canRollback?`<button class="succession-danger" data-rollback="${escape(item.id)}">ロールバック</button>`:""}</div></article>`;
      }).join(""):"<p>移行申請はまだありません。</p>";
    }catch(error){history.innerHTML=`<p>${escape(error.message)}</p>`;}
  }

  form.addEventListener("change",renderStatus);
  form.addEventListener("submit",async e=>{
    e.preventDefault();
    if(!allChecked()) return alert("移行準備チェックをすべて確認してください。");
    try{
      const payload={targetUserId:target.value,checks:checks(),approverName:document.getElementById("approverName").value.trim(),approverTitle:document.getElementById("approverTitle").value.trim(),approvalDate:document.getElementById("approvalDate").value,scheduledAt:isoLocal(document.getElementById("scheduledAt").value),note:document.getElementById("successionNote").value.trim(),administratorPassword:document.getElementById("administratorPassword").value};
      await ISSApi.createSuccessionRequest(payload);
      localStorage.setItem(KEY,JSON.stringify({...payload,administratorPassword:"",updatedAt:new Date().toISOString()}));
      document.getElementById("administratorPassword").value="";
      alert("安全環境室長への管理者権限移行申請を登録しました。");
      await loadHistory();
    }catch(error){alert(error.message);}
  });

  history.addEventListener("click",async e=>{
    const execute=e.target.closest("[data-execute]");
    const review=e.target.closest("[data-review]");
    const finalize=e.target.closest("[data-finalize]");
    const reduction=e.target.closest("[data-reduction]");
    const rollback=e.target.closest("[data-rollback]");
    if(execute){
      const password=prompt("現行管理者の確認用パスワードを入力してください。"); if(!password)return;
      const confirmationText=prompt("確認のため「安全環境室長へ移行」と入力してください。"); if(!confirmationText)return;
      const supportDays=Number(prompt("旧管理者の移行支援期間（日数）を入力してください。","30")||30);
      try{const data=await ISSApi.executeSuccession(execute.dataset.execute,{administratorPassword:password,confirmationText,supportDays});alert(data.message);await loadHistory();}catch(error){alert(error.message);}
    }
    if(review){
      const incidentCount=Number(prompt("移行後に確認された重大インシデント件数を入力してください。","0")||0);
      const note=prompt("安定稼働確認の所見を入力してください。","主要機能、権限、監査、バックアップ、法令更新、障害対応を確認済み")||"";
      if(note.length<5)return alert("所見を5文字以上で入力してください。");
      try{const data=await ISSApi.createSuccessionReview(review.dataset.review,{reviewType:"stabilization",incidentCount,checks:{loginVerified:true,permissionsVerified:true,auditVerified:true,backupVerified:true,regulationUpdateVerified:true,incidentResponseVerified:true},note});alert(data.message);await loadHistory();}catch(error){alert(error.message);}
    }
    if(finalize){
      const password=prompt("安全環境室長の確認用パスワードを入力してください。"); if(!password)return;
      const confirmationText=prompt("確認のため「管理者権限移行を完了」と入力してください。"); if(!confirmationText)return;
      const note=prompt("移行完了の根拠と旧管理者の権限縮小予定を入力してください。"); if(!note)return;
      try{const data=await ISSApi.finalizeSuccession(finalize.dataset.finalize,{administratorPassword:password,confirmationText,note});alert(data.message);await loadHistory();}catch(error){alert(error.message);}
    }
    if(reduction){
      const note=prompt("旧管理者の変更後権限、実施者、確認日を入力してください。"); if(!note)return;
      try{const data=await ISSApi.confirmFormerAdminReduction(reduction.dataset.reduction,{note});alert(data.message);await loadHistory();}catch(error){alert(error.message);}
    }
    if(rollback){
      const password=prompt("現行管理者の確認用パスワードを入力してください。"); if(!password)return;
      const reason=prompt("ロールバック理由を5文字以上で入力してください。"); if(!reason)return;
      try{const data=await ISSApi.rollbackSuccession(rollback.dataset.rollback,{administratorPassword:password,reason});alert(data.message);await loadHistory();}catch(error){alert(error.message);}
    }
  });

  exportButton.addEventListener("click",()=>{
    const data={documentType:"administrator-succession-plan",version:"Part 201",targetRole:"safety-environment-director",targetLabel:"安全環境室長",targetUserId:target.value,approverName:document.getElementById("approverName").value.trim(),approverTitle:document.getElementById("approverTitle").value.trim(),approvalDate:document.getElementById("approvalDate").value,scheduledAt:isoLocal(document.getElementById("scheduledAt").value),checks:checks(),exportedAt:new Date().toISOString(),note:"正式切替には再認証・MFA・承認・監査ログ・バックアップが必要"};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="安全環境室長_システム管理者権限移行計画.json";a.click();URL.revokeObjectURL(a.href);
  });


  const reviewScopeLabel=value=>({"all-admins":"全管理者","succession-related":"移行関係者","emergency-accounts":"緊急復旧用アカウント"}[value]||value);
  const drillTypeLabel=value=>({"credential-check":"認証情報保管確認","login-drill":"ログイン訓練","full-recovery":"完全復旧訓練"}[value]||value);
  const drillResultLabel=value=>({passed:"合格",conditional:"条件付き合格",failed:"不合格"}[value]||value);
  let governanceCache={reviews:[],drills:[]};

  async function loadGovernance(){
    const reviewBox=document.getElementById("accessReviewHistory");
    const drillBox=document.getElementById("recoveryDrillHistory");
    try{
      const [reviewData,drillData]=await Promise.all([ISSApi.adminAccessReviews(),ISSApi.emergencyRecoveryDrills()]);
      governanceCache={reviews:reviewData.reviews||[],drills:drillData.drills||[]};
      reviewBox.innerHTML=governanceCache.reviews.length?governanceCache.reviews.map(item=>`<article class="succession-record"><header><strong>${escape(item.review_date)}・${escape(reviewScopeLabel(item.review_scope))}</strong><span class="status-pill">点検済み</span></header><p>管理者 ${Number(item.active_admin_count||0)}名／停止候補 ${Number(item.inactive_account_count||0)}件／過大権限 ${Number(item.excessive_permission_count||0)}件</p><p>${escape(item.findings||"所見なし")}</p><p>是正措置: ${escape(item.corrective_action||"なし")}／次回: ${escape(item.next_review_date||"未設定")}</p><small>実施者: ${escape(item.reviewed_by_name||"―")}</small></article>`).join(""):"<p>権限点検履歴はまだありません。</p>";
      drillBox.innerHTML=governanceCache.drills.length?governanceCache.drills.map(item=>`<article class="succession-record"><header><strong>${escape(item.drill_date)}・${escape(drillTypeLabel(item.drill_type))}</strong><span class="status-pill">${escape(drillResultLabel(item.result))}</span></header><p>アカウント ${item.emergency_account_verified?"確認済み":"未確認"}／MFA ${item.mfa_verified?"確認済み":"未確認"}／監査 ${item.audit_log_verified?"確認済み":"未確認"}／連絡体制 ${item.backup_contact_verified?"確認済み":"未確認"}</p><p>${escape(item.issue_summary||"問題なし")}</p><p>是正措置: ${escape(item.corrective_action||"なし")}／次回: ${escape(item.next_drill_date||"未設定")}</p><small>実施者: ${escape(item.performed_by_name||"―")}</small></article>`).join(""):"<p>緊急復旧点検履歴はまだありません。</p>";
    }catch(error){reviewBox.innerHTML=`<p>${escape(error.message)}</p>`;drillBox.innerHTML=`<p>${escape(error.message)}</p>`;}
  }

  document.getElementById("accessReviewForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const payload={reviewDate:document.getElementById("accessReviewDate").value,reviewScope:document.getElementById("accessReviewScope").value,activeAdminCount:Number(document.getElementById("activeAdminCount").value||0),inactiveAccountCount:Number(document.getElementById("inactiveAccountCount").value||0),excessivePermissionCount:Number(document.getElementById("excessivePermissionCount").value||0),findings:document.getElementById("accessReviewFindings").value.trim(),correctiveAction:document.getElementById("accessReviewAction").value.trim(),nextReviewDate:document.getElementById("nextAccessReviewDate").value||null};
    try{const data=await ISSApi.createAdminAccessReview(payload);alert(data.message);await loadGovernance();}catch(error){alert(error.message);}
  });

  document.getElementById("recoveryDrillForm")?.addEventListener("submit",async e=>{
    e.preventDefault();
    const payload={drillDate:document.getElementById("recoveryDrillDate").value,drillType:document.getElementById("recoveryDrillType").value,emergencyAccountVerified:document.getElementById("emergencyAccountVerified").checked,mfaVerified:document.getElementById("recoveryMfaVerified").checked,auditLogVerified:document.getElementById("recoveryAuditVerified").checked,backupContactVerified:document.getElementById("backupContactVerified").checked,result:document.getElementById("recoveryDrillResult").value,issueSummary:document.getElementById("recoveryIssueSummary").value.trim(),correctiveAction:document.getElementById("recoveryCorrectiveAction").value.trim(),nextDrillDate:document.getElementById("nextRecoveryDrillDate").value||null};
    if(payload.result==="passed"&&![payload.emergencyAccountVerified,payload.mfaVerified,payload.auditLogVerified,payload.backupContactVerified].every(Boolean)) return alert("合格にする場合は4項目すべてを確認してください。");
    try{const data=await ISSApi.createEmergencyRecoveryDrill(payload);alert(data.message);await loadGovernance();}catch(error){alert(error.message);}
  });

  document.getElementById("exportGovernanceReport")?.addEventListener("click",()=>{
    const data={documentType:"administrator-governance-audit-report",version:"Part 201",exportedAt:new Date().toISOString(),targetAdministrator:"安全環境室長",accessReviews:governanceCache.reviews,emergencyRecoveryDrills:governanceCache.drills,policy:"管理者権限は定期的に棚卸しし、緊急復旧用アカウントは通常業務に使用しない。"};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="管理者権限_定期点検・緊急復旧監査レポート.json";a.click();URL.revokeObjectURL(a.href);
  });

  const today=new Date().toISOString().slice(0,10);
  const nextQuarter=new Date();nextQuarter.setMonth(nextQuarter.getMonth()+3);
  const nextQuarterText=nextQuarter.toISOString().slice(0,10);
  const accessDate=document.getElementById("accessReviewDate");if(accessDate&&!accessDate.value)accessDate.value=today;
  const drillDate=document.getElementById("recoveryDrillDate");if(drillDate&&!drillDate.value)drillDate.value=today;
  const nextAccess=document.getElementById("nextAccessReviewDate");if(nextAccess&&!nextAccess.value)nextAccess.value=nextQuarterText;
  const nextDrill=document.getElementById("nextRecoveryDrillDate");if(nextDrill&&!nextDrill.value)nextDrill.value=nextQuarterText;

  const saved=(()=>{try{return JSON.parse(localStorage.getItem(KEY)||"{}")}catch{return {}}})();
  [...form.elements].filter(x=>x.type==="checkbox").forEach(x=>x.checked=!!saved.checks?.[x.name]);
  document.getElementById("approvalDate").value=saved.approvalDate||new Date().toISOString().slice(0,10);
  renderStatus();loadCandidates().then(()=>{if(saved.targetUserId)target.value=saved.targetUserId;});loadHistory();loadGovernance();
})();
