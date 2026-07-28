(() => {
  "use strict";
  const KEY = "skPostDeploymentOperationsPart250";
  const stabilization = [
    ["login", "ログイン、MFA、パスワード再設定が正常に利用できる"],
    ["roles", "役割別の閲覧・登録・編集・削除制御が正しく動作する"],
    ["applications", "申請番号・写真の登録、編集、閲覧が正常に動作する"],
    ["search", "危険物検索、関連法令、関連資料が正常に利用できる"],
    ["mail", "招待・認証・パスワード再設定メールが正常に届く"],
    ["performance", "50名想定の応答時間と安定性に問題がない"],
    ["backup", "データベース・写真のバックアップが取得されている"],
    ["restore", "復元手順とロールバック手順を確認している"],
    ["audit", "監査ログ・利用履歴が必要な範囲で記録されている"],
    ["support", "問い合わせ窓口と障害連絡経路が機能している"]
  ];
  const handoff = [
    ["operationManual", "仕様書・実施要領書・役割別使用要領書を引き継いだ"],
    ["accounts", "管理者アカウント、MFA、緊急復旧手順を引き継いだ"],
    ["backupOwner", "バックアップ・復元の担当者と周期を確定した"],
    ["regulationUpdate", "法令・データ更新を1回以上通しで確認した"],
    ["incidentResponse", "障害対応、連絡先、エスカレーション手順を引き継いだ"],
    ["userAdministration", "利用者追加・異動・停止・権限変更の手順を引き継いだ"],
    ["monitoring", "監査・利用履歴・運用指標の確認方法を引き継いだ"],
    ["nextReview", "次回点検日と責任者を確定した"]
  ];
  const $ = id => document.getElementById(id);
  function build(container, items, prefix) {
    items.forEach(([id, label]) => {
      const row = document.createElement("label");
      row.className = "check-row";
      row.innerHTML = `<input type="checkbox" data-${prefix}-check="${id}"><strong>${label}</strong><input type="text" data-${prefix}-evidence="${id}" placeholder="証跡・確認内容">`;
      container.appendChild(row);
    });
  }
  build($("stabilizationChecklist"), stabilization, "stabilization");
  build($("handoffChecklist"), handoff, "handoff");
  function readItems(items, prefix) {
    return Object.fromEntries(items.map(([id]) => [id, {
      done: document.querySelector(`[data-${prefix}-check="${id}"]`).checked,
      evidence: document.querySelector(`[data-${prefix}-evidence="${id}"]`).value.trim()
    }]));
  }
  function collect() {
    return {
      version: "Part 250",
      environment: $("environment").value.trim(),
      targetVersion: $("targetVersion").value.trim(),
      launchDate: $("launchDate").value,
      owner: $("owner").value.trim(),
      inquiryCount: Number($("inquiryCount").value || 0),
      openIncidentCount: Number($("openIncidentCount").value || 0),
      criticalIncidentCount: Number($("criticalIncidentCount").value || 0),
      supportNotes: $("supportNotes").value.trim(),
      decision: $("decision").value,
      summary: $("summary").value.trim(),
      stabilization: readItems(stabilization, "stabilization"),
      handoff: readItems(handoff, "handoff"),
      updatedAt: new Date().toISOString()
    };
  }
  function apply(data) {
    if (!data) return;
    ["environment", "targetVersion", "launchDate", "owner", "inquiryCount", "openIncidentCount", "criticalIncidentCount", "supportNotes", "decision", "summary"].forEach(k => {
      if (data[k] !== undefined) $(k).value = data[k];
    });
    [[stabilization, "stabilization", data.stabilization], [handoff, "handoff", data.handoff]].forEach(([items, prefix, values]) => {
      items.forEach(([id]) => {
        const value = values?.[id];
        if (!value) return;
        document.querySelector(`[data-${prefix}-check="${id}"]`).checked = !!value.done;
        document.querySelector(`[data-${prefix}-evidence="${id}"]`).value = value.evidence || "";
      });
    });
    $("postDeploymentStatus").textContent = data.updatedAt ? `最終保存：${new Date(data.updatedAt).toLocaleString("ja-JP")}` : "未保存";
  }
  function validate(data) {
    const allStabilization = Object.values(data.stabilization).every(v => v.done);
    const allHandoff = Object.values(data.handoff).every(v => v.done);
    if (["stable", "handoff-ready", "handoff-completed"].includes(data.decision) && (!allStabilization || data.criticalIncidentCount > 0)) {
      return "安定運用以降の判定には、初期安定化項目の完了と重大障害0件が必要です。";
    }
    if (["handoff-ready", "handoff-completed"].includes(data.decision) && !allHandoff) {
      return "引継ぎ準備完了または引継ぎ完了には、運用引継ぎ項目をすべて完了してください。";
    }
    return "";
  }
  $("savePostDeployment").addEventListener("click", () => {
    const data = collect();
    const error = validate(data);
    if (error) { alert(error); return; }
    localStorage.setItem(KEY, JSON.stringify(data));
    apply(data);
  });
  $("exportPostDeployment").addEventListener("click", () => {
    const data = collect();
    const error = validate(data);
    if (error) { alert(error); return; }
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Part250_切替後運用引継ぎ_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  try { apply(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { apply(null); }
})();