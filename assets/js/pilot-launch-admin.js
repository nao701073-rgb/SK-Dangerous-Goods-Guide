(()=>{"use strict";
let state={summary:{},checks:[],batches:[],tests:[],invitationRuns:[],progressSnapshots:[],decisions:[]};
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const num=id=>Math.max(0,Number($(id).value||0));
function apiBase(){return(localStorage.getItem("iss-server-endpoint")||"").replace(/\/$/,"")}
function token(){return localStorage.getItem("iss-access-token")||sessionStorage.getItem("iss-access-token")||""}
async function request(path,opt={}){const r=await fetch(apiBase()+path,{...opt,headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`,...opt.headers}});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||"処理に失敗しました。");return data}
function msg(t){$("pageMessage").textContent=t}
const decisionLabels={hold:"保留","continue-pilot":"試験継続","expand-150":"150名拡張可","ready-for-production":"正式運用準備可"};
const checklistItems=[
 ["users","初期利用者の登録・本人確認"],["roles","事業所・安全環境室の権限確認"],["login","初回ログイン・パスワード変更"],["mfa","MFA必須対象者の設定"],["mail","招待・再設定メール"],["load50","50名性能試験"],["load150","150名性能確認"],["photos","写真保存・閲覧"],["backup","DB・写真のバックアップ／復元"],["audit","監査ログ・強制ログアウト"],["support","問い合わせ・障害対応体制"]
];
function renderChecklist(){if($("acceptanceChecklist").children.length)return;$("acceptanceChecklist").innerHTML=checklistItems.map(([k,l])=>`<label><input type="checkbox" data-acceptance-check="${k}"><span>${esc(l)}</span></label>`).join("")}
function batchOptions(){return'<option value="">指定なし</option>'+state.batches.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("")}
function latestProgress(){return state.progressSnapshots[0]||{}}
function pct(a,b){return b?Math.min(100,Math.round((a/b)*100)):0}
function render(){renderChecklist();const s=state.summary,p=latestProgress();$("summaryCards").innerHTML=[
 ["登録",s.total||0],["有効",s.active||0],["ログイン確認",s.loginVerified||0],["安全環境室長",s.safetyDirectors||0],["安全環境室職員",s.safetyStaff||0],["MFA未設定",s.mfaMissing||0],["招待到達",s.invitationDelivered||0],["未解決課題",s.openIssueCount||0]
].map(x=>`<article class="summary-card"><strong>${x[0]}</strong><span>${x[1]}</span></article>`).join("");
const all=state.checks.length&&state.checks.every(x=>x.passed);const failed=state.tests.some(x=>x.status==="failed");$("pilotBanner").dataset.status=all&&!failed?"ready":"attention";$("pilotBanner").textContent=all&&!failed?"試験運用の必須条件を満たしています。受入判定を実施できます。":"未完了条件または不合格試験があります。証跡と対応状況を確認してください。";
$("readinessChecks").innerHTML=state.checks.map(x=>`<article class="check-card" data-status="${x.passed?'passed':'open'}"><strong>${x.passed?'✓':'!'} ${esc(x.label)}</strong><small>${esc(x.detail)}</small></article>`).join("");
$("batchList").innerHTML=state.batches.length?state.batches.map(x=>`<div class="record"><div class="record-head"><strong>${esc(x.name)}</strong><small>${esc(x.status)}</small></div><p>対象 ${x.target_user_count}名／開始 ${esc(x.start_date||'未定')}</p></div>`).join(""):"<p>登録はありません。</p>";
["testBatch","inviteBatch","progressBatch","decisionBatch"].forEach(id=>$(id).innerHTML=batchOptions());
$("testList").innerHTML=state.tests.length?state.tests.map(x=>`<div class="record"><div class="record-head"><strong>${esc(x.test_type)}</strong><small class="status-${x.status}">${esc(x.status)}</small></div><p>${esc(x.evidence||'証跡なし')}</p><small>${new Date(x.executed_at).toLocaleString('ja-JP')}／${esc(x.executed_by_name||'')}</small></div>`).join(""):"<p>試験結果はありません。</p>";
$("invitationList").innerHTML=state.invitationRuns.length?state.invitationRuns.slice(0,8).map(x=>`<div class="record"><div class="record-head"><strong>送信 ${x.sent_count}／到達 ${x.delivered_count}</strong><small>${new Date(x.executed_at).toLocaleString('ja-JP')}</small></div><p>失敗 ${x.failed_count}、期限切れ ${x.expired_count}、対象 ${esc(x.target_role||'all')}</p><small>${esc(x.evidence||'')}</small></div>`).join(""):"<p>招待実行記録はありません。</p>";
$("progressList").innerHTML=state.progressSnapshots.length?state.progressSnapshots.slice(0,8).map(x=>`<div class="record"><div class="record-head"><strong>初回ログイン ${x.first_login_completed}/${x.total_users}</strong><small>${new Date(x.captured_at).toLocaleString('ja-JP')}</small></div><div class="progress-meter"><span style="width:${pct(x.first_login_completed,x.total_users)}%"></span></div><p>PW変更 ${x.password_changed}／MFA ${x.mfa_completed}／権限確認 ${x.permission_verified}／支援必要 ${x.support_required}</p><small>${esc(x.notes||'')}</small></div>`).join(""):"<p>進捗記録はありません。</p>";
$("decisionList").innerHTML=state.decisions.length?state.decisions.slice(0,8).map(x=>`<div class="record"><div class="record-head"><strong class="status-${x.decision}">${esc(decisionLabels[x.decision]||x.decision)}</strong><small>${new Date(x.decided_at).toLocaleString('ja-JP')}</small></div><p>未解決 ${x.open_issue_count}件／次回 ${esc(x.next_review_date||'未定')}</p><small>${esc(x.decision_reason||'')}</small></div>`).join(""):"<p>受入判定はありません。</p>";
if(p.total_users){$("progressTotal").value=p.total_users}
}
async function load(){try{state=await request('/api/admin/pilot-launch/summary');render();msg('最新状態を読み込みました。')}catch(e){msg(e.message)}}
$("reloadData").onclick=load;
$("createBatch").onclick=async()=>{try{await request('/api/admin/pilot-launch/batches',{method:'POST',body:JSON.stringify({name:$("batchName").value.trim(),targetUserCount:num("targetUserCount"),startDate:$("startDate").value||null,notes:$("batchNotes").value.trim()})});await load()}catch(e){msg(e.message)}};
$("saveTest").onclick=async()=>{try{await request('/api/admin/pilot-launch/tests',{method:'POST',body:JSON.stringify({batchId:$("testBatch").value||null,testType:$("testType").value,status:$("testStatus").value,evidence:$("testEvidence").value.trim(),metrics:{recordedFrom:'Part 215 UI'}})});$("testEvidence").value='';await load()}catch(e){msg(e.message)}};
$("saveInvitationRun").onclick=async()=>{try{await request('/api/admin/pilot-launch/invitations',{method:'POST',body:JSON.stringify({batchId:$("inviteBatch").value||null,targetRole:$("inviteRole").value,targetCount:num("inviteTarget"),sentCount:num("inviteSent"),deliveredCount:num("inviteDelivered"),failedCount:num("inviteFailed"),expiredCount:num("inviteExpired"),evidence:$("inviteEvidence").value.trim()})});await load()}catch(e){msg(e.message)}};
$("saveProgress").onclick=async()=>{try{await request('/api/admin/pilot-launch/progress',{method:'POST',body:JSON.stringify({batchId:$("progressBatch").value||null,totalUsers:num("progressTotal"),invitedUsers:num("progressInvited"),firstLoginCompleted:num("progressLogin"),passwordChanged:num("progressPassword"),mfaCompleted:num("progressMfa"),permissionVerified:num("progressPermission"),lockedUsers:num("progressLocked"),supportRequired:num("progressSupport"),notes:$("progressNotes").value.trim()})});await load()}catch(e){msg(e.message)}};
$("saveDecision").onclick=async()=>{try{const checklist={};document.querySelectorAll('[data-acceptance-check]').forEach(x=>checklist[x.dataset.acceptanceCheck]=x.checked);await request('/api/admin/pilot-launch/decisions',{method:'POST',body:JSON.stringify({batchId:$("decisionBatch").value||null,decision:$("decision").value,checklist,openIssueCount:num("openIssueCount"),decisionReason:$("decisionReason").value.trim(),nextReviewDate:$("nextReviewDate").value||null})});await load()}catch(e){msg(e.message)}};
$("exportReport").onclick=()=>{const blob=new Blob([JSON.stringify({version:'Part 215',exportedAt:new Date().toISOString(),...state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='Part215_クラウド試験運用統合レポート.json';a.click();URL.revokeObjectURL(a.href)};
load();
})();
