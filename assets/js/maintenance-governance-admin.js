(() => {
  "use strict";
  const KEY = "skMaintenanceGovernancePart251";
  const checks = [
    ["accounts", "利用者・所属・権限を定期点検した"],
    ["authentication", "ログイン、MFA、パスワード再設定を確認した"],
    ["databaseBackup", "PostgreSQLバックアップの取得と保管を確認した"],
    ["photoBackup", "写真保存領域のバックアップを確認した"],
    ["restore", "復元手順または復元訓練を確認した"],
    ["security", "監査ログ、異常アクセス、秘密情報管理を確認した"],
    ["regulationWatch", "国内法令・国際規則の改定有無を確認した"],
    ["dataQuality", "危険物データの品質検査と公開判定を確認した"],
    ["performance", "容量、応答時間、エラー傾向を確認した"],
    ["documents", "仕様書・要領書・リリースノートを現行版に合わせた"],
    ["support", "問い合わせ・障害・改善要望の残件を確認した"],
    ["nextPlan", "次回点検日と次期版計画を確定した"]
  ];
  const $ = id => document.getElementById(id);
  const container = $("maintenanceChecklist");
  checks.forEach(([id, label]) => {
    const row = document.createElement("label");
    row.className = "check-row";
    row.innerHTML = `<input type="checkbox" data-check="${id}"><strong>${label}</strong><input type="text" data-evidence="${id}" placeholder="証跡・確認内容">`;
    container.appendChild(row);
  });
  function readChecks() {
    return Object.fromEntries(checks.map(([id]) => [id, {
      done: document.querySelector(`[data-check="${id}"]`).checked,
      evidence: document.querySelector(`[data-evidence="${id}"]`).value.trim()
    }]));
  }
  function collect() {
    return {
      version: "Part 251",
      environment: $("environment").value.trim(),
      targetVersion: $("targetVersion").value.trim(),
      operationsOwner: $("operationsOwner").value.trim(),
      regulationOwner: $("regulationOwner").value.trim(),
      backupOwner: $("backupOwner").value.trim(),
      regulationName: $("regulationName").value.trim(),
      regulationVersionChange: $("regulationVersionChange").value.trim(),
      regulationUpdatedAt: $("regulationUpdatedAt").value,
      regulationResult: $("regulationResult").value.trim(),
      openInquiryCount: Number($("openInquiryCount").value || 0),
      openIncidentCount: Number($("openIncidentCount").value || 0),
      criticalIncidentCount: Number($("criticalIncidentCount").value || 0),
      handoffNotes: $("handoffNotes").value.trim(),
      fiscalYear: Number($("fiscalYear").value || new Date().getFullYear()),
      annualSummary: $("annualSummary").value.trim(),
      nextVersion: $("nextVersion").value.trim(),
      nextVersionPlan: $("nextVersionPlan").value.trim(),
      nextReviewDate: $("nextReviewDate").value,
      decision: $("decision").value,
      decisionNotes: $("decisionNotes").value.trim(),
      checks: readChecks(),
      updatedAt: new Date().toISOString()
    };
  }
  function apply(data) {
    if (!data) { $("fiscalYear").value = new Date().getFullYear(); return; }
    ["environment","targetVersion","operationsOwner","regulationOwner","backupOwner","regulationName","regulationVersionChange","regulationUpdatedAt","regulationResult","openInquiryCount","openIncidentCount","criticalIncidentCount","handoffNotes","fiscalYear","annualSummary","nextVersion","nextVersionPlan","nextReviewDate","decision","decisionNotes"].forEach(k => {
      if (data[k] !== undefined) $(k).value = data[k];
    });
    checks.forEach(([id]) => {
      const v = data.checks?.[id];
      if (!v) return;
      document.querySelector(`[data-check="${id}"]`).checked = !!v.done;
      document.querySelector(`[data-evidence="${id}"]`).value = v.evidence || "";
    });
    $("maintenanceGovernanceStatus").textContent = data.updatedAt ? `最終保存：${new Date(data.updatedAt).toLocaleString("ja-JP")}` : "未保存";
  }
  function validate(data) {
    const allDone = Object.values(data.checks).every(v => v.done);
    if (["maintainable","annual-closed","next-release-ready"].includes(data.decision) && (!allDone || data.criticalIncidentCount > 0)) {
      return "継続運用可以降の判定には、全点検項目の完了と重大障害0件が必要です。";
    }
    if (["annual-closed","next-release-ready"].includes(data.decision) && !data.annualSummary) {
      return "年度更新完了以降の判定には、年度総括を入力してください。";
    }
    if (data.decision === "next-release-ready" && (!data.nextVersion || !data.nextVersionPlan)) {
      return "次期版準備完了には、次期バージョンと主要内容を入力してください。";
    }
    return "";
  }
  $("saveMaintenanceGovernance").addEventListener("click", () => {
    const data = collect();
    const error = validate(data);
    if (error) { alert(error); return; }
    localStorage.setItem(KEY, JSON.stringify(data));
    apply(data);
  });
  $("exportMaintenanceGovernance").addEventListener("click", () => {
    const data = collect();
    const error = validate(data);
    if (error) { alert(error); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Part251_継続保守年度更新_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  try { apply(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { apply(null); }
})();