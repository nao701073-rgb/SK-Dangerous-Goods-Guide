(() => {
  "use strict";
  const KEY = "skDeploymentExecutionPart249";
  const phases = [
    ["preflight", "配置前検査・環境変数・秘密情報の確認"],
    ["database", "PostgreSQL作成・SQLマイグレーション・接続確認"],
    ["storage", "写真保存領域・アクセス制御・容量確認"],
    ["api", "Node.js API配置・HTTPS・CORS・ヘルスチェック"],
    ["frontend", "画面配置・API URL設定・キャッシュ更新"],
    ["mail", "招待・MFA・パスワード再設定メールの実送信"],
    ["users", "初期利用者CSV検証・登録・初期認証情報の安全な配布"],
    ["roles", "ゲストからシステム管理者までの権限確認"],
    ["backup", "切替直前バックアップ・復元手順・ロールバック資材"],
    ["smoke", "ログイン・検索・申請番号・写真・法令・監査の通し試験"],
    ["performance", "50名想定および150名想定の性能確認"],
    ["notice", "利用者周知・問い合わせ窓口・障害連絡経路の確認"]
  ];
  const post = [
    ["day1", "開始後1日：ログイン、同期、メール、重大障害を確認"],
    ["day7", "開始後7日：権限、バックアップ、問い合わせ、性能を確認"],
    ["day30", "開始後30日：運用定着、監査、法令更新手順、改善事項を確認"]
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
  build($("executionChecklist"), phases, "phase");
  build($("postLaunchChecks"), post, "post");
  function readItems(items, prefix) {
    return Object.fromEntries(items.map(([id]) => [id, {
      done: document.querySelector(`[data-${prefix}-check="${id}"]`).checked,
      evidence: document.querySelector(`[data-${prefix}-evidence="${id}"]`).value.trim()
    }]));
  }
  function collect() {
    return {
      version: "Part 249",
      environment: $("environment").value.trim(),
      targetVersion: $("targetVersion").value.trim(),
      switchAt: $("switchAt").value,
      owner: $("owner").value.trim(),
      decision: $("decision").value,
      notes: $("notes").value.trim(),
      phases: readItems(phases, "phase"),
      postLaunch: readItems(post, "post"),
      updatedAt: new Date().toISOString()
    };
  }
  function apply(data) {
    if (!data) return;
    ["environment", "targetVersion", "switchAt", "owner", "decision", "notes"].forEach(k => {
      if (data[k] !== undefined) $(k).value = data[k];
    });
    [[phases, "phase", data.phases], [post, "post", data.postLaunch]].forEach(([items, prefix, values]) => {
      items.forEach(([id]) => {
        const v = values?.[id];
        if (!v) return;
        document.querySelector(`[data-${prefix}-check="${id}"]`).checked = !!v.done;
        document.querySelector(`[data-${prefix}-evidence="${id}"]`).value = v.evidence || "";
      });
    });
    $("executionStatus").textContent = data.updatedAt ? `最終保存：${new Date(data.updatedAt).toLocaleString("ja-JP")}` : "未保存";
  }
  $("saveExecution").addEventListener("click", () => {
    const data = collect();
    const allPhases = Object.values(data.phases).every(v => v.done);
    if (["go", "completed"].includes(data.decision) && !allPhases) {
      alert("切替可または切替完了にするには、実行フェーズをすべて完了してください。");
      return;
    }
    localStorage.setItem(KEY, JSON.stringify(data));
    apply(data);
  });
  $("exportExecution").addEventListener("click", () => {
    const data = collect();
    const blob = new Blob([JSON.stringify(data, null, 2)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Part249_導入切替実行_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });
  try { apply(JSON.parse(localStorage.getItem(KEY) || "null")); } catch { apply(null); }
})();
