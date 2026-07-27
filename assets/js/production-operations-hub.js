(() => {
  "use strict";
  const STORAGE_KEY = "iss-production-operations-hub-v232";
  const categories = [
    {title:"利用者・権限",description:"利用者登録、役割、権限変更、棚卸しを管理します。",links:[
      ["利用者管理","user-admin.html","利用者の登録・所属・役割を管理"],
      ["権限・承認・削除申請管理","access-governance-admin.html","削除申請、権限変更、定期棚卸し"],
      ["アクセス制御・監査","access-control.html","役割別の閲覧範囲と監査設定"]]},
    {title:"認証・セキュリティ",description:"ログイン、MFA、ロック、招待、認証状態を確認します。",links:[
      ["アカウント安全管理","account-security-admin.html","初回ログイン、MFA、ロック状況"],
      ["認証・試験運用管理","identity-operations-admin.html","認証試験と運用開始チェック"],
      ["正式運用準備・認証管理","production-identity-admin.html","招待、監査、バックアップ、開始判定"]]},
    {title:"法令・データ品質",description:"法令改定、差分、データ品質、公開可否を管理します。",links:[
      ["法令・データ更新管理","regulation-update-admin.html","PDF、CSV、JSONの更新候補を管理"],
      ["データ品質・公開判定","data-quality-admin.html","重複・欠損・形式・公開可否を検査"],
      ["社内検証管理","validation-admin.html","更新内容の検証と確認記録"]]},
    {title:"運用・障害・バックアップ",description:"稼働状況、障害、復元訓練、継続運用を管理します。",links:[
      ["運用監視・障害対応","operations-monitoring.html","障害・不具合・復旧状況を管理"],
      ["システム保守・バックアップ","system-maintenance.html","バックアップと保守作業を確認"],
      ["運用保証・継続管理","operations-assurance-admin.html","障害、復元訓練、運用指標を統合管理"]]},
    {title:"監査・利用履歴",description:"利用履歴、監査レビュー、定期レポートを確認します。",links:[
      ["利用履歴・不適切利用監視","user-activity-admin.html","利用者別・日次・週次・月次の利用記録"],
      ["管理運用ダッシュボード","admin-governance-dashboard.html","是正対応、通知、定期運用タスク"],
      ["統合運用センター","integrated-operations-center.html","利用者、法令、障害、監査を横断確認"]]},
    {title:"開始・移行・定着",description:"試験運用、正式運用判定、開始後レビューを管理します。",links:[
      ["正式運用最終確認","final-production-readiness.html","正式運用前の横断確認と判定"],
      ["運用開始・定着管理","post-launch-admin.html","開始後7・30・90日レビュー"],
      ["安全環境室長への管理者権限移行","admin-succession.html","将来の権限移行計画と記録"]]}
  ];
  const checks = [
    ["利用者・所属・役割","初期利用者と安全環境室の登録内容、所属、役割を確認した。"],
    ["権限マトリクス","ゲスト、事業所利用者、事業所管理者、安全環境室長、安全環境室職員、管理者の権限を確認した。"],
    ["ログイン・MFA","ログイン、初回パスワード変更、MFA、ロック解除、強制ログアウトを確認した。"],
    ["申請番号・写真","事業所別閲覧範囲、安全環境室長の登録・編集可／削除不可を確認した。"],
    ["危険物・法令データ","データ品質監査が合格し、関連法令・関連資料の表示を確認した。"],
    ["法令更新手順","PDF・構造化データの差分、検証、承認、公開、旧版保存の手順を確認した。"],
    ["バックアップ・復元","データベースと写真保存領域のバックアップおよび復元確認を実施した。"],
    ["障害対応","障害報告、影響範囲確認、暫定対応、復旧、再発防止の手順を確認した。"],
    ["監査・利用履歴","管理者専用の履歴確認、日次集計、監査レポート、閲覧履歴を確認した。"],
    ["50名・150名対応","初期50名と将来150名を想定した登録・検索・性能確認を実施した。"],
    ["運用資料","仕様書、実施要領書、役割別使用要領書が現行仕様と一致している。"],
    ["承認・周知","運用開始の承認、問い合わせ窓口、利用者への周知内容を確認した。"]
  ];
  const $ = id => document.getElementById(id);
  const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") } catch { return {} } };
  const save = state => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  let state = load();
  function renderCategories(){ $("hubCategoryGrid").innerHTML = categories.map(c=>`<article class="hub-category"><h3>${c.title}</h3><p>${c.description}</p><div class="hub-category-links">${c.links.map(l=>`<a href="${l[1]}">${l[0]}<small>${l[2]}</small></a>`).join("")}</div></article>`).join(""); }
  function renderChecklist(){ const completed = new Set(state.completed || []); $("hubChecklistForm").innerHTML = checks.map((c,i)=>`<label class="hub-check-item ${completed.has(i)?"is-complete":""}"><input type="checkbox" data-index="${i}" ${completed.has(i)?"checked":""}><strong>${c[0]}</strong><span>${c[1]}</span></label>`).join(""); updateProgress(); }
  function updateProgress(){ const count=(state.completed||[]).length,total=checks.length,pct=Math.round(count/total*100); $("hubProgressText").textContent=`${count} / ${total}`; $("hubProgressBar").style.width=`${pct}%`; const badge=$("hubStatusBadge"); badge.textContent=count===total?"全項目確認済み":count?`確認中 ${pct}%`:"未確認"; }
  function restoreReview(){ $("hubConclusion").value=state.conclusion||"hold"; $("hubNextReview").value=state.nextReview||""; $("hubReviewNote").value=state.note||""; $("hubSavedStatus").textContent=state.savedAt?`最終保存：${new Date(state.savedAt).toLocaleString("ja-JP")}`:"未保存"; }
  function downloadJson(){ const payload={version:"Part 232",exportedAt:new Date().toISOString(),completedChecks:(state.completed||[]).map(i=>({title:checks[i][0],detail:checks[i][1]})),pendingChecks:checks.filter((_,i)=>!(state.completed||[]).includes(i)).map(c=>({title:c[0],detail:c[1]})),review:{conclusion:state.conclusion||"hold",nextReview:state.nextReview||null,note:state.note||"",savedAt:state.savedAt||null},notice:"本システムの利用は任意です。"}; const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`正式運用統合確認_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href); }
  document.addEventListener("DOMContentLoaded",()=>{ renderCategories(); renderChecklist(); restoreReview(); $("hubChecklistForm").addEventListener("change",e=>{ if(!e.target.matches("input[type=checkbox]"))return; const set=new Set(state.completed||[]),i=Number(e.target.dataset.index); e.target.checked?set.add(i):set.delete(i); state.completed=[...set].sort((a,b)=>a-b); save(state); renderChecklist(); }); $("hubReviewForm").addEventListener("submit",e=>{ e.preventDefault(); if($("hubConclusion").value==="production"&&(state.completed||[]).length!==checks.length){ alert("正式運用可を保存するには、すべての確認項目を完了してください。"); return; } state={...state,conclusion:$("hubConclusion").value,nextReview:$("hubNextReview").value,note:$("hubReviewNote").value.trim(),savedAt:new Date().toISOString()}; save(state); restoreReview(); }); $("exportHubReport").addEventListener("click",downloadJson); $("resetHubChecklist").addEventListener("click",()=>{ if(!confirm("確認状態と記録を初期化しますか？"))return; state={}; save(state); renderChecklist(); restoreReview(); }); });
})();
