(() => {
  const STORAGE_KEY = "skPrototypeCompletionReviewV241";
  const prototypeItems = [
    ["navigation", "メニュー・画面構成", "ユーザー設定とシステム設定、役割別メニューが整理されている。"],
    ["roles", "ログイン・役割別権限", "ゲスト、事業所利用者、事業所管理者、安全環境室長、安全環境室職員、システム管理者の権限が確定している。"],
    ["business", "主要業務機能", "危険物検索、関連法令、関連資料、申請番号、写真の主要導線が動作する。"],
    ["data", "危険物・法令データ品質", "分類・SP・B欄を含むデータ監査がエラー0件・警告0件で合格している。"],
    ["updates", "法令・データ更新", "PDF、CSV、JSONの登録、検証、差分、承認、履歴の手順が整理されている。"],
    ["audit", "利用履歴・監査", "管理者専用の履歴確認、日次・週次・月次集計、監査証跡が整理されている。"],
    ["recovery", "保全・障害対応", "バックアップ、復元確認、障害記録、是正対応の仕様が整理されている。"],
    ["verification", "総合自動検査", "静的参照、権限、データ品質、JavaScript構文の一括検査が合格している。"],
    ["documents", "仕様書・要領書", "仕様書、実施要領書、役割別使用要領書の更新対象が整理されている。"]
  ];
  const deploymentItems = [
    ["provider", "クラウド配置先の決定", "静的Web、Node.js API、PostgreSQL、写真保存、メール配信の利用サービスを決定する。"],
    ["domain", "専用URL・HTTPS", "公開URL、API URL、証明書、CORSを設定する。"],
    ["mail", "認証メール", "招待、MFA、パスワード再設定メールを実環境で確認する。"],
    ["users", "初期利用者登録", "約50名の氏名、メール、所属、役割を確定し、一括登録する。"],
    ["load", "実環境性能試験", "50名想定および将来150名想定の負荷試験を行う。"],
    ["storage", "写真保存・復元試験", "実ストレージへの保存、バックアップ、復元を確認する。"],
    ["devices", "実端末確認", "PC、スマートフォン、主要ブラウザーで確認する。"],
    ["approval", "職制承認・利用者周知", "運用開始承認、利用案内、問い合わせ先を確定する。"]
  ];
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { state = {}; }
  state.prototype ||= {};
  state.deployment ||= {};

  const renderChecks = (containerId, items, bucket) => {
    $(containerId).innerHTML = items.map(([id, title, note]) => {
      const value = state[bucket][id] || {};
      return `<div class="check-row ${value.done ? "is-ok" : "is-ng"}"><span class="check-mark">${value.done ? "✓" : "!"}</span><label><input type="checkbox" data-bucket="${bucket}" data-check="${id}" ${value.done ? "checked" : ""}> <strong>${escapeHtml(title)}</strong></label><span>${escapeHtml(note)}</span><input data-bucket-evidence="${bucket}" data-evidence="${id}" value="${escapeHtml(value.evidence || "")}" placeholder="証跡・残課題"></div>`;
    }).join("");
  };

  const countDone = (items, bucket) => items.filter(([id]) => state[bucket][id]?.done).length;
  const renderSummary = () => {
    const prototypeDone = countDone(prototypeItems, "prototype");
    const deploymentDone = countDone(deploymentItems, "deployment");
    const allPrototypeDone = prototypeDone === prototypeItems.length;
    $("prototypeProgress").textContent = `${prototypeDone} / ${prototypeItems.length}`;
    $("deploymentProgress").textContent = `${deploymentDone} / ${deploymentItems.length}`;
    $("completionBadge").textContent = allPrototypeDone ? "試作完成判定可能" : "統合確認中";
    $("completionSummary").innerHTML = [
      ["試作必須条件", `${prototypeDone}/${prototypeItems.length}`, allPrototypeDone ? "全項目完了" : "確認継続"],
      ["配置後作業", `${deploymentDone}/${deploymentItems.length}`, "試作判定とは分離"],
      ["総合自動検査", "Part 240", "5項目合格・不合格0"],
      ["危険物データ", "2,725件", "公開判定 合格"]
    ].map(([label, value, note]) => `<article class="admin-summary-card"><strong>${label}</strong><span>${value}</span><small>${note}</small></article>`).join("");
  };

  const render = () => {
    renderChecks("prototypeChecks", prototypeItems, "prototype");
    renderChecks("deploymentChecks", deploymentItems, "deployment");
    $("prototypeDecision").value = state.decision || "in-progress";
    $("completionNotes").value = state.notes || "";
    $("nextReviewDate").value = state.nextReviewDate || "";
    renderSummary();
  };

  const collect = () => {
    document.querySelectorAll("[data-check]").forEach(input => {
      const bucket = input.dataset.bucket;
      const id = input.dataset.check;
      const evidence = document.querySelector(`[data-bucket-evidence="${bucket}"][data-evidence="${id}"]`)?.value || "";
      state[bucket][id] = { done: input.checked, evidence };
    });
    state.decision = $("prototypeDecision").value;
    state.notes = $("completionNotes").value;
    state.nextReviewDate = $("nextReviewDate").value;
  };

  $("saveCompletionReview").addEventListener("click", () => {
    collect();
    const allPrototypeDone = prototypeItems.every(([id]) => state.prototype[id]?.done);
    if (state.decision === "complete" && !allPrototypeDone) {
      $("completionMessage").textContent = "試作必須条件をすべて完了してから「試作完成」を選択してください。";
      return;
    }
    state.savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("completionMessage").textContent = "試作完成判定と残課題を保存しました。";
    render();
  });

  $("downloadCompletionReport").addEventListener("click", () => {
    collect();
    const report = {
      version: "Part 241",
      generatedAt: new Date().toISOString(),
      decision: state.decision || "in-progress",
      prototypeRequirements: prototypeItems.map(([id, title, note]) => ({ id, title, note, ...(state.prototype[id] || { done: false, evidence: "" }) })),
      postDeploymentTasks: deploymentItems.map(([id, title, note]) => ({ id, title, note, ...(state.deployment[id] || { done: false, evidence: "" }) })),
      notes: state.notes || "",
      nextReviewDate: state.nextReviewDate || "",
      policies: {
        voluntaryUse: true,
        watermarkImplemented: false,
        screenshotTrackingImplemented: false,
        automaticScreenCaptureImplemented: false
      }
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Part241_試作完成判定_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  render();
})();
