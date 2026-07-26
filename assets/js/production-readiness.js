(() => {
  "use strict";

  const STORAGE_KEYS = {
    checklist: "iss-production-release-checklist-v146",
    configurationSnapshot: "iss-production-configuration-snapshot-v146",
    decisions: "iss-production-release-decisions-v146"
  };

  const checklistItems = [
    { id: "users", label: "利用者・事業所管理者・管理者のアカウントと権限を確認した", required: true },
    { id: "passwords", label: "初期パスワード変更と二段階認証の試験を完了した", required: true },
    { id: "regulations", label: "現行法令版・施行日・PDF原本・構造化データを確認した", required: true },
    { id: "search", label: "UN番号・品名・条件検索と詳細画面の代表データを確認した", required: true },
    { id: "photos", label: "写真登録・自動圧縮・容量上限・権限制御を確認した", required: true },
    { id: "backup", label: "本番開始直前のバックアップを作成し、復元前検査を実施した", required: true },
    { id: "server", label: "社内API・データベース・写真保存先・HTTPS接続を確認した", required: true },
    { id: "pilot", label: "試験運用の担当者、問い合わせ先、障害時連絡先を周知した", required: true },
    { id: "manuals", label: "利用者向け・管理者向け手順書を配布した", required: true },
    { id: "rollback", label: "障害発生時の停止・旧版復帰・連絡手順を確認した", required: true }
  ];

  const localRoot = document.getElementById("localReadinessChecks");
  const serverRoot = document.getElementById("serverReadinessChecks");
  const badge = document.getElementById("readinessBadge");
  const title = document.getElementById("readinessTitle");
  const summary = document.getElementById("readinessSummary");
  const runButton = document.getElementById("runReadiness");
  const exportButton = document.getElementById("exportReadiness");
  const checklistRoot = document.getElementById("releaseChecklist");
  const checklistSaveButton = document.getElementById("saveReleaseChecklist");
  const checklistResetButton = document.getElementById("resetReleaseChecklist");
  const snapshotStatus = document.getElementById("configurationSnapshotStatus");
  const snapshotCreateButton = document.getElementById("createConfigurationSnapshot");
  const snapshotVerifyButton = document.getElementById("verifyConfigurationSnapshot");
  const snapshotExportButton = document.getElementById("exportConfigurationSnapshot");
  const decisionResult = document.getElementById("releaseDecisionResult");
  const ledger = document.getElementById("releaseDecisionLedger");

  let lastResult = null;
  let latestDecision = null;

  const endpoint = () => String(localStorage.getItem("iss-server-endpoint") || "").trim();
  const mode = () => localStorage.getItem("iss-operation-mode") || "offline";
  const tokenPresent = () => Boolean(sessionStorage.getItem("iss-api-token") || localStorage.getItem("iss-api-token"));

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const readJson = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch {
      return fallback;
    }
  };

  const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableStringify(value));
    if (!window.crypto?.subtle) return `fallback-${bytes.length}-${Date.now()}`;
    const digest = await window.crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function localChecks() {
    let storageOk = true;
    try {
      localStorage.setItem("iss-preflight-probe", "ok");
      localStorage.removeItem("iss-preflight-probe");
    } catch {
      storageOk = false;
    }
    return [
      { key: "browser-storage", label: "ブラウザ保存領域", ok: storageOk, detail: storageOk ? "localStorageを読み書きできます。" : "ブラウザ保存が制限されています。", severity: "required" },
      { key: "operation-mode", label: "運用方式", ok: mode() !== "offline", detail: `現在: ${mode()}`, severity: "recommended" },
      { key: "server-endpoint", label: "社内API接続先", ok: Boolean(endpoint()), detail: endpoint() || "未設定", severity: "required" },
      { key: "network", label: "ネットワーク", ok: navigator.onLine, detail: navigator.onLine ? "オンライン" : "オフライン", severity: "required" },
      { key: "login", label: "オンラインログイン", ok: tokenPresent(), detail: tokenPresent() ? "認証情報あり" : "未ログイン", severity: "required" },
      { key: "secure-context", label: "安全なブラウザ接続", ok: window.isSecureContext || location.hostname === "localhost", detail: window.isSecureContext ? "Secure Context" : "HTTPSではありません", severity: "required" }
    ];
  }

  function renderChecks(root, checks) {
    root.innerHTML = checks.map(item => `<div class="check-row ${item.ok ? "is-ok" : "is-ng"}"><span class="check-mark">${item.ok ? "✓" : "!"}</span><strong>${escapeHtml(item.label)}</strong><span>${escapeHtml(item.detail)}</span><span class="check-severity">${item.severity === "required" ? "必須" : "推奨"}</span></div>`).join("");
  }

  function getChecklistState() {
    return readJson(STORAGE_KEYS.checklist, {});
  }

  function renderChecklist() {
    const state = getChecklistState();
    checklistRoot.innerHTML = checklistItems.map(item => `<label class="check-row ${state[item.id] ? "is-ok" : "is-ng"}"><input type="checkbox" data-release-check="${escapeHtml(item.id)}" ${state[item.id] ? "checked" : ""}><strong>${escapeHtml(item.label)}</strong><span></span><span class="check-severity">必須</span></label>`).join("");
  }

  function saveChecklist() {
    const state = {};
    document.querySelectorAll("[data-release-check]").forEach(input => {
      state[input.dataset.releaseCheck] = input.checked;
    });
    state.savedAt = new Date().toISOString();
    writeJson(STORAGE_KEYS.checklist, state);
    renderChecklist();
    updateOverallStatus();
  }

  function checklistSummary() {
    const state = getChecklistState();
    const completed = checklistItems.filter(item => Boolean(state[item.id])).length;
    return { completed, total: checklistItems.length, allCompleted: completed === checklistItems.length, state };
  }

  function configurationValues() {
    const includedKeys = [
      "iss-operation-mode",
      "iss-server-endpoint",
      "iss-office-id",
      "iss-office-name",
      "iss-user-role",
      "iss-photo-limit-per-application",
      "iss-photo-limit-per-office",
      "iss-photo-max-file-size-mb",
      "iss-photo-storage-limit-mb",
      "iss-show-imdg-references",
      "iss-requirement-layout"
    ];
    return Object.fromEntries(includedKeys.map(key => [key, localStorage.getItem(key)]));
  }

  async function createConfigurationSnapshot() {
    const values = configurationValues();
    const snapshot = {
      schemaVersion: "1.0",
      snapshotId: `CONFIG-${Date.now()}`,
      createdAt: new Date().toISOString(),
      values,
      sha256: await sha256(values)
    };
    writeJson(STORAGE_KEYS.configurationSnapshot, snapshot);
    renderSnapshotStatus("設定スナップショットを作成しました。", "ok");
    updateOverallStatus();
  }

  async function verifyConfigurationSnapshot(showResult = true) {
    const snapshot = readJson(STORAGE_KEYS.configurationSnapshot, null);
    if (!snapshot) {
      if (showResult) renderSnapshotStatus("設定スナップショットがありません。", "error");
      return { exists: false, matches: false, changes: [] };
    }
    const current = configurationValues();
    const currentHash = await sha256(current);
    const changes = Object.keys({ ...snapshot.values, ...current }).filter(key => snapshot.values?.[key] !== current[key]);
    const matches = currentHash === snapshot.sha256 && changes.length === 0;
    if (showResult) {
      renderSnapshotStatus(matches ? "固定時から重要設定の変更はありません。" : `固定後に設定変更があります：${changes.join("、") || "ハッシュ不一致"}`, matches ? "ok" : "error");
    }
    return { exists: true, matches, changes, snapshot, currentHash };
  }

  function renderSnapshotStatus(text, type = "neutral") {
    snapshotStatus.textContent = text;
    snapshotStatus.classList.toggle("is-ok", type === "ok");
    snapshotStatus.classList.toggle("is-error", type === "error");
  }

  function summarize(local, server = []) {
    const all = [...local, ...server];
    const required = all.filter(item => item.severity === "required" && !item.ok).length;
    const recommended = all.filter(item => item.severity !== "required" && !item.ok).length;
    const state = required ? "blocked" : recommended ? "warning" : "ready";
    lastResult = { status: state, checkedAt: new Date().toISOString(), requiredFailures: required, recommendedFailures: recommended, localChecks: local, serverChecks: server };
    updateOverallStatus();
  }

  async function updateOverallStatus() {
    const checklist = checklistSummary();
    const snapshot = await verifyConfigurationSnapshot(false);
    const diagnosticsReady = Boolean(lastResult);
    const diagnosticsPassed = lastResult?.requiredFailures === 0;
    const ready = diagnosticsPassed && checklist.allCompleted && snapshot.matches;
    const blocked = diagnosticsReady && !diagnosticsPassed;

    badge.textContent = ready ? "承認判定可能" : blocked ? "導入不可" : "準備中";
    title.textContent = ready ? "本番導入判定に必要な条件を満たしています" : blocked ? "必須診断項目に未対応があります" : "診断・チェック・設定固定を完了してください";
    summary.textContent = `診断：${diagnosticsReady ? (diagnosticsPassed ? "必須項目合格" : `必須未対応 ${lastResult.requiredFailures}件`) : "未実行"}／チェック：${checklist.completed}/${checklist.total}／設定固定：${snapshot.matches ? "一致" : "未完了または変更あり"}`;
  }

  async function run() {
    const local = localChecks();
    renderChecks(localRoot, local);
    serverRoot.innerHTML = "<p>社内サーバーを診断しています…</p>";
    let server = [];
    try {
      const data = await window.ISSApi.preflight();
      server = data.checks || [];
      renderChecks(serverRoot, server);
    } catch (error) {
      server = [{ key: "server-preflight", label: "サーバー診断API", ok: false, detail: error.message || "接続できませんでした。", severity: "required" }];
      renderChecks(serverRoot, server);
    }
    summarize(local, server);
  }

  async function createReleaseDecision() {
    const releaseName = document.getElementById("releaseName").value.trim();
    const releaseVersion = document.getElementById("releaseVersion").value.trim();
    const preparedBy = document.getElementById("releasePreparedBy").value.trim();
    const approvedBy = document.getElementById("releaseApprovedBy").value.trim();
    const approverRole = document.getElementById("releaseApproverRole").value;
    const scheduledAtValue = document.getElementById("releaseScheduledAt").value;
    const comment = document.getElementById("releaseComment").value.trim();

    const errors = [];
    if (!releaseName) errors.push("リリース名称は必須です。");
    if (!releaseVersion) errors.push("対象バージョンは必須です。");
    if (!preparedBy) errors.push("判定作成者は必須です。");
    if (!approvedBy) errors.push("承認者は必須です。");
    if (preparedBy && approvedBy && preparedBy === approvedBy) errors.push("作成者本人による自己承認はできません。");
    if (!scheduledAtValue) errors.push("運用開始予定日時は必須です。");
    if (!lastResult) errors.push("総合診断を実行してください。");

    const checklist = checklistSummary();
    if (!checklist.allCompleted) errors.push(`運用開始チェックリストが未完了です（${checklist.completed}/${checklist.total}）。`);
    const snapshotVerification = await verifyConfigurationSnapshot(false);
    if (!snapshotVerification.matches) errors.push("本番設定が未固定、または固定後に変更されています。");
    if (lastResult?.requiredFailures) errors.push(`総合診断の必須未対応が${lastResult.requiredFailures}件あります。`);

    if (errors.length) {
      decisionResult.innerHTML = `<strong>リリース判定を作成できません。</strong><ul>${errors.map(error => `<li>${escapeHtml(error)}</li>`).join("")}</ul>`;
      decisionResult.classList.add("is-error");
      return;
    }

    const payload = {
      schemaVersion: "1.0",
      decisionId: `RELEASE-${Date.now()}`,
      releaseName,
      releaseVersion,
      status: "approved",
      preparedBy,
      preparedAt: new Date().toISOString(),
      approvedBy,
      approverRole,
      approvedAt: new Date().toISOString(),
      scheduledAt: new Date(scheduledAtValue).toISOString(),
      comment,
      diagnosis: lastResult,
      checklist: checklistItems.map(item => ({ id: item.id, label: item.label, completed: Boolean(checklist.state[item.id]) })),
      configurationSnapshot: snapshotVerification.snapshot,
      configurationVerifiedAt: new Date().toISOString()
    };
    payload.sha256 = await sha256(payload);

    const decisions = readJson(STORAGE_KEYS.decisions, []);
    decisions.unshift(payload);
    writeJson(STORAGE_KEYS.decisions, decisions.slice(0, 100));
    latestDecision = payload;
    decisionResult.innerHTML = `<strong>リリース承認済み</strong><p>判定ID：${escapeHtml(payload.decisionId)}／運用開始予定：${escapeHtml(new Date(payload.scheduledAt).toLocaleString("ja-JP"))}</p><p>検証ハッシュ：${escapeHtml(payload.sha256)}</p>`;
    decisionResult.classList.remove("is-error");
    renderLedger();
  }

  function renderLedger() {
    const decisions = readJson(STORAGE_KEYS.decisions, []);
    if (!decisions.length) {
      ledger.innerHTML = "<p>判定記録はありません。</p>";
      return;
    }
    ledger.innerHTML = decisions.slice(0, 10).map(item => `<div class="check-row is-ok"><span class="check-mark">✓</span><strong>${escapeHtml(item.releaseName)}</strong><span>${escapeHtml(item.releaseVersion)}／${escapeHtml(new Date(item.preparedAt).toLocaleString("ja-JP"))}<br>作成：${escapeHtml(item.preparedBy)}／承認：${escapeHtml(item.approvedBy)}（${item.approverRole === "admin" ? "管理者" : "事業所管理者"}）</span><button type="button" data-export-decision="${escapeHtml(item.decisionId)}">JSON</button></div>`).join("");
    document.querySelectorAll("[data-export-decision]").forEach(button => button.addEventListener("click", () => {
      const target = decisions.find(item => item.decisionId === button.dataset.exportDecision);
      if (target) downloadJson(`${target.decisionId}.json`, target);
    }));
  }

  runButton.addEventListener("click", run);
  exportButton.addEventListener("click", () => {
    if (!lastResult) return alert("先に診断を実行してください。");
    downloadJson(`本番導入準備確認_${new Date().toISOString().slice(0, 10)}.json`, lastResult);
  });
  checklistSaveButton.addEventListener("click", saveChecklist);
  checklistResetButton.addEventListener("click", () => {
    if (!confirm("運用開始チェックリストをリセットしますか？")) return;
    localStorage.removeItem(STORAGE_KEYS.checklist);
    renderChecklist();
    updateOverallStatus();
  });
  snapshotCreateButton.addEventListener("click", createConfigurationSnapshot);
  snapshotVerifyButton.addEventListener("click", () => verifyConfigurationSnapshot(true));
  snapshotExportButton.addEventListener("click", () => {
    const snapshot = readJson(STORAGE_KEYS.configurationSnapshot, null);
    if (!snapshot) return alert("設定スナップショットがありません。");
    downloadJson(`${snapshot.snapshotId}.json`, snapshot);
  });
  document.getElementById("createReleaseDecision").addEventListener("click", createReleaseDecision);
  document.getElementById("exportReleaseDecision").addEventListener("click", () => {
    if (!latestDecision) latestDecision = readJson(STORAGE_KEYS.decisions, [])[0] || null;
    if (!latestDecision) return alert("リリース判定がありません。");
    downloadJson(`${latestDecision.decisionId}.json`, latestDecision);
  });
  document.getElementById("printReleaseDecision").addEventListener("click", () => {
    if (!latestDecision) latestDecision = readJson(STORAGE_KEYS.decisions, [])[0] || null;
    if (!latestDecision) return alert("リリース判定がありません。");
    window.print();
  });

  const initial = localChecks();
  renderChecks(localRoot, initial);
  renderChecklist();
  renderLedger();
  const existingSnapshot = readJson(STORAGE_KEYS.configurationSnapshot, null);
  if (existingSnapshot) renderSnapshotStatus(`設定固定済み：${new Date(existingSnapshot.createdAt).toLocaleString("ja-JP")}／${existingSnapshot.snapshotId}`, "ok");
  summarize(initial, []);
})();
