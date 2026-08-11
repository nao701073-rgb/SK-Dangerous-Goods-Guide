(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const overall = $("maintenanceOverall");
  const storageSummary = $("maintenanceStorage");
  const warningSummary = $("maintenanceWarnings");
  const lastBackup = $("maintenanceLastBackup");
  const diagnosisMessage = $("maintenanceDiagnosisMessage");
  const checkList = $("maintenanceCheckList");
  const exportDiagnosisButton = $("exportMaintenanceDiagnosis");
  const exportCsvButton = $("exportMaintenanceCsv");
  const restoreButton = $("restoreSystemBackup");
  const restorePreview = $("restorePreview");

  const TEMPORARY_KEY_PATTERNS = [
    /session/i, /token/i, /auth-code/i, /password/i, /mfa/i, /reset/i
  ];
  const ARRAY_REFERENCE_RULES = [
    { childKey: "iss-photos", parentKey: "iss-applications", field: "applicationId", parentField: "id", label: "写真→申請番号" },
    { childKey: "iss-photo-purge-plans", parentKey: "iss-photos", field: "photoIds", parentField: "id", label: "完全削除計画→写真", allowMissing: true },
    { childKey: "iss-photo-audit-logs", parentKey: "iss-photos", field: "photoId", parentField: "id", label: "写真監査履歴→写真", allowMissing: true }
  ];

  let latestDiagnosis = null;
  let inspectedBackup = null;

  const nowIso = () => new Date().toISOString();
  const bytesToText = bytes => {
    const value = Number(bytes || 0);
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)}MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(1)}KB`;
    return `${value}B`;
  };

  function showMessage(element, text, isError = false) {
    element.textContent = text;
    element.classList.toggle("is-error", isError);
  }

  function stableStringify(value) {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  async function sha256(value) {
    const bytes = new TextEncoder().encode(typeof value === "string" ? value : stableStringify(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(cell => {
      const text = String(cell ?? "");
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function collectStorage(includeSession = false) {
    const data = {};
    const excludedKeys = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const temporary = TEMPORARY_KEY_PATTERNS.some(pattern => pattern.test(key));
      if (temporary && !includeSession) {
        excludedKeys.push(key);
        continue;
      }
      data[key] = localStorage.getItem(key);
    }
    return { data, excludedKeys };
  }

  function parseStoredValue(raw) {
    try {
      return { ok: true, value: JSON.parse(raw) };
    } catch {
      return { ok: false, value: raw };
    }
  }

  function findDuplicateIds(value) {
    if (!Array.isArray(value)) return [];
    const counts = new Map();
    value.forEach(item => {
      if (!item || typeof item !== "object" || item.id === undefined || item.id === null || item.id === "") return;
      const id = String(item.id);
      counts.set(id, (counts.get(id) || 0) + 1);
    });
    return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([id, count]) => ({ id, count }));
  }

  function getParsedStorageMap() {
    const map = new Map();
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key) continue;
      const raw = localStorage.getItem(key) || "";
      map.set(key, { raw, ...parseStoredValue(raw) });
    }
    return map;
  }

  function diagnoseReferences(parsedMap) {
    const findings = [];
    for (const rule of ARRAY_REFERENCE_RULES) {
      const children = parsedMap.get(rule.childKey)?.value;
      const parents = parsedMap.get(rule.parentKey)?.value;
      if (!Array.isArray(children) || !Array.isArray(parents)) continue;
      const parentIds = new Set(parents.map(item => String(item?.[rule.parentField] ?? "")).filter(Boolean));
      let missing = 0;
      for (const child of children) {
        const rawReference = child?.[rule.field];
        const references = Array.isArray(rawReference) ? rawReference : [rawReference];
        references.filter(Boolean).forEach(reference => {
          if (!parentIds.has(String(reference))) missing += 1;
        });
      }
      findings.push({
        name: rule.label,
        status: missing && !rule.allowMissing ? "error" : missing ? "warning" : "pass",
        detail: missing ? `${missing}件の参照先が現在の保存データにありません。論理削除・完全削除済み記録の場合は監査履歴を確認してください。` : "参照切れは検出されませんでした。"
      });
    }
    return findings;
  }

  async function runDiagnosis() {
    showMessage(diagnosisMessage, "全体整合性を診断しています…");
    const parsedMap = getParsedStorageMap();
    const checks = [];
    let totalBytes = 0;
    let parseErrors = 0;
    let duplicateCount = 0;

    parsedMap.forEach((entry, key) => {
      totalBytes += new Blob([key, entry.raw]).size;
      if (!entry.ok && /^[\[{]/.test(String(entry.raw).trim())) parseErrors += 1;
      const duplicates = entry.ok ? findDuplicateIds(entry.value) : [];
      duplicateCount += duplicates.length;
      if (duplicates.length) {
        checks.push({ name: `${key} ID重複`, status: "error", detail: `${duplicates.length}種類の重複IDを検出しました。` });
      }
    });

    checks.unshift({
      name: "保存データ構文",
      status: parseErrors ? "error" : "pass",
      detail: parseErrors ? `${parseErrors}件のJSON構文不整合を検出しました。` : `${parsedMap.size}件の保存項目を読み取りました。`
    });
    checks.push({
      name: "識別子一意性",
      status: duplicateCount ? "error" : "pass",
      detail: duplicateCount ? `${duplicateCount}種類の重複識別子があります。` : "配列データのID重複は検出されませんでした。"
    });
    checks.push(...diagnoseReferences(parsedMap));

    const quotaWarning = totalBytes >= 4 * 1024 * 1024;
    checks.push({
      name: "ブラウザ保存容量",
      status: quotaWarning ? "warning" : "pass",
      detail: `${bytesToText(totalBytes)}を使用しています。ブラウザ保存は端末差があるため、本番では写真本体をサーバーストレージへ保存してください。`
    });

    const operationMode = localStorage.getItem("iss-operation-mode") || "offline";
    const endpoint = localStorage.getItem("iss-server-endpoint") || "";
    checks.push({
      name: "運用方式・接続先",
      status: operationMode !== "offline" && !endpoint ? "warning" : "pass",
      detail: `運用方式：${operationMode}${endpoint ? `／接続先：${endpoint}` : "／接続先未設定"}`
    });

    const critical = checks.filter(item => item.status === "error").length;
    const warnings = checks.filter(item => item.status === "warning").length;
    const context = window.ISSStorage?.getCurrentContext?.() || {};
    const reportCore = {
      schemaVersion: "1.0",
      type: "system-integrity-diagnosis",
      diagnosedAt: nowIso(),
      officeId: context.officeId || "",
      officeName: context.officeName || "",
      role: context.role || "",
      storageKeyCount: parsedMap.size,
      storageBytes: totalBytes,
      summary: { critical, warnings, passed: checks.filter(item => item.status === "pass").length },
      checks
    };
    latestDiagnosis = { ...reportCore, verificationHash: await sha256(reportCore) };

    overall.textContent = critical ? "要修正" : warnings ? "要確認" : "正常";
    storageSummary.textContent = bytesToText(totalBytes);
    warningSummary.textContent = `${critical + warnings}件`;
    exportDiagnosisButton.disabled = false;
    exportCsvButton.disabled = false;
    checkList.innerHTML = checks.map(item => `
      <article class="maintenance-check">
        <span class="maintenance-check__badge is-${item.status}">${item.status === "pass" ? "正常" : item.status === "warning" ? "要確認" : "要修正"}</span>
        <div><h3>${item.name}</h3><p>${item.detail}</p></div>
      </article>
    `).join("");
    showMessage(diagnosisMessage, `診断完了：正常${latestDiagnosis.summary.passed}件／要確認${warnings}件／要修正${critical}件`, Boolean(critical));
  }

  async function createBackup() {
    const label = $("backupLabel").value.trim() || `システムバックアップ ${new Date().toLocaleDateString("ja-JP")}`;
    const createdBy = $("backupCreatedBy").value.trim();
    if (!createdBy) return showMessage($("backupMessage"), "作成者を入力してください。", true);
    const includeSession = $("backupIncludeSession").checked;
    const collected = collectStorage(includeSession);
    const context = window.ISSStorage?.getCurrentContext?.() || {};
    const parsedCounts = {};
    Object.entries(collected.data).forEach(([key, raw]) => {
      const parsed = parseStoredValue(raw);
      parsedCounts[key] = Array.isArray(parsed.value) ? parsed.value.length : 1;
    });
    const payloadHash = await sha256(collected.data);
    const core = {
      schemaVersion: "1.0",
      type: "inspection-support-system-backup",
      systemVersion: "v1-part145",
      backupId: `backup-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      createdAt: nowIso(),
      createdBy,
      note: $("backupNote").value.trim(),
      officeId: context.officeId || "",
      officeName: context.officeName || "",
      role: context.role || "",
      includesTemporarySessionData: includeSession,
      excludedKeys: collected.excludedKeys,
      itemCounts: parsedCounts,
      payloadHash,
      payload: collected.data
    };
    const backup = { ...core, verificationHash: await sha256(core) };
    localStorage.setItem("iss-last-system-backup-at", backup.createdAt);
    lastBackup.textContent = new Date(backup.createdAt).toLocaleString("ja-JP");
    downloadJson(`inspection-support-backup-${backup.createdAt.slice(0, 10)}.json`, backup);
    showMessage($("backupMessage"), `${Object.keys(collected.data).length}項目のバックアップを作成しました。検証ハッシュ：${backup.verificationHash.slice(0, 16)}…`);
  }

  async function inspectBackup() {
    const file = $("restoreBackupFile").files?.[0];
    if (!file) return showMessage($("restoreMessage"), "バックアップJSONを選択してください。", true);
    try {
      const backup = JSON.parse(await file.text());
      const errors = [];
      const warnings = [];
      if (backup.type !== "inspection-support-system-backup") errors.push("対応するシステムバックアップ形式ではありません。");
      if (!backup.payload || typeof backup.payload !== "object" || Array.isArray(backup.payload)) errors.push("payloadがありません。");
      if (!backup.verificationHash) errors.push("検証ハッシュがありません。");
      if (!backup.payloadHash) errors.push("データハッシュがありません。");

      if (!errors.length) {
        const verificationTarget = { ...backup };
        delete verificationTarget.verificationHash;
        const calculatedVerificationHash = await sha256(verificationTarget);
        const calculatedPayloadHash = await sha256(backup.payload);
        if (calculatedVerificationHash !== backup.verificationHash) errors.push("バックアップ全体の検証ハッシュが一致しません。");
        if (calculatedPayloadHash !== backup.payloadHash) errors.push("保存データのハッシュが一致しません。");
      }

      const currentContext = window.ISSStorage?.getCurrentContext?.() || {};
      if (backup.officeId && currentContext.officeId && backup.officeId !== currentContext.officeId && currentContext.role !== "safety-environment-admin") {
        errors.push("所属事業所が異なるバックアップです。管理者による復元が必要です。");
      }
      if (backup.includesTemporarySessionData) warnings.push("一時的なログイン・セッション情報を含むバックアップです。");

      inspectedBackup = errors.length ? null : backup;
      restoreButton.disabled = Boolean(errors.length);
      restorePreview.hidden = false;
      restorePreview.innerHTML = `
        <strong>${errors.length ? "復元不可" : "復元前検査合格"}</strong>
        <dl>
          <div><dt>バックアップID</dt><dd>${backup.backupId || "-"}</dd></div>
          <div><dt>作成日時</dt><dd>${backup.createdAt ? new Date(backup.createdAt).toLocaleString("ja-JP") : "-"}</dd></div>
          <div><dt>作成者</dt><dd>${backup.createdBy || "-"}</dd></div>
          <div><dt>対象事業所</dt><dd>${backup.officeName || backup.officeId || "-"}</dd></div>
          <div><dt>保存項目数</dt><dd>${backup.payload ? Object.keys(backup.payload).length : 0}件</dd></div>
          <div><dt>警告</dt><dd>${warnings.length ? warnings.join("／") : "なし"}</dd></div>
          <div><dt>エラー</dt><dd>${errors.length ? errors.join("／") : "なし"}</dd></div>
        </dl>`;
      showMessage($("restoreMessage"), errors.length ? `復元前検査で${errors.length}件のエラーを検出しました。` : "復元前検査に合格しました。復元前に現在のバックアップを作成してください。", Boolean(errors.length));
    } catch (error) {
      inspectedBackup = null;
      restoreButton.disabled = true;
      showMessage($("restoreMessage"), `JSONを読み込めませんでした：${error.message}`, true);
    }
  }

  async function restoreBackup() {
    if (!inspectedBackup) return showMessage($("restoreMessage"), "復元前検査に合格したバックアップがありません。", true);
    const role = window.ISSStorage?.getUserRole?.() || "office-user";
    if (!['office-admin', 'safety-environment-admin'].includes(role)) {
      return showMessage($("restoreMessage"), "復元は事業所管理者または管理者のみ実行できます。", true);
    }
    const confirmation = prompt("復元を実行すると現在の対象データが置き換わります。実行するには「復元」と入力してください。");
    if (confirmation !== "復元") return;

    const preRestore = collectStorage(false).data;
    const emergency = {
      schemaVersion: "1.0",
      type: "pre-restore-emergency-backup",
      createdAt: nowIso(),
      payload: preRestore,
      payloadHash: await sha256(preRestore)
    };
    downloadJson(`pre-restore-emergency-${new Date().toISOString().slice(0, 10)}.json`, emergency);

    Object.entries(inspectedBackup.payload).forEach(([key, value]) => localStorage.setItem(key, String(value)));
    localStorage.setItem("iss-last-system-restore-at", nowIso());
    localStorage.setItem("iss-last-system-restore-backup-id", inspectedBackup.backupId || "");
    showMessage($("restoreMessage"), "復元が完了しました。整合性診断を実行してから業務利用を再開してください。");
    restoreButton.disabled = true;
    inspectedBackup = null;
    setTimeout(() => location.reload(), 1200);
  }

  async function createHandoverReport() {
    if (!latestDiagnosis) await runDiagnosis();
    const context = window.ISSStorage?.getCurrentContext?.() || {};
    const applications = window.ISSStorage?.getApplications?.({ scope: "all" }) || [];
    const photos = window.ISSStorage?.getPhotos?.({ scope: "all" }) || [];
    const reportCore = {
      schemaVersion: "1.0",
      type: "system-operation-handover-report",
      generatedAt: nowIso(),
      systemVersion: "v1-part145",
      organization: context,
      operationMode: localStorage.getItem("iss-operation-mode") || "offline",
      serverEndpointConfigured: Boolean(localStorage.getItem("iss-server-endpoint")),
      recordCounts: {
        applications: applications.length,
        photos: photos.length,
        syncQueue: window.ISSStorage?.getSyncQueue?.().length || 0,
        localStorageItems: localStorage.length
      },
      lastBackupAt: localStorage.getItem("iss-last-system-backup-at") || null,
      lastRestoreAt: localStorage.getItem("iss-last-system-restore-at") || null,
      integrityDiagnosis: latestDiagnosis,
      requiredHandoverChecks: [
        "管理者・事業所管理者アカウントの引継ぎ",
        "法令PDF原本と更新マニフェストの保存先確認",
        "社内API・データベース・写真ストレージのバックアップ確認",
        "承認待ち・期限超過・要確認案件の確認",
        "直近の整合性診断と復元試験の結果確認"
      ]
    };
    return { ...reportCore, verificationHash: await sha256(reportCore) };
  }

  $("runMaintenanceDiagnosis").addEventListener("click", runDiagnosis);
  exportDiagnosisButton.addEventListener("click", () => latestDiagnosis && downloadJson(`system-integrity-${new Date().toISOString().slice(0, 10)}.json`, latestDiagnosis));
  exportCsvButton.addEventListener("click", () => {
    if (!latestDiagnosis) return;
    downloadCsv(`system-integrity-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["判定", "検査項目", "結果"],
      ...latestDiagnosis.checks.map(item => [item.status, item.name, item.detail])
    ]);
  });
  $("createSystemBackup").addEventListener("click", createBackup);
  $("inspectSystemBackup").addEventListener("click", inspectBackup);
  restoreButton.addEventListener("click", restoreBackup);
  $("restoreBackupFile").addEventListener("change", () => {
    inspectedBackup = null;
    restoreButton.disabled = true;
    restorePreview.hidden = true;
    $("restoreMessage").textContent = "";
  });
  $("exportHandoverReport").addEventListener("click", async () => downloadJson(`system-handover-${new Date().toISOString().slice(0, 10)}.json`, await createHandoverReport()));
  $("printHandoverReport").addEventListener("click", async () => {
    const report = await createHandoverReport();
    const popup = window.open("", "_blank", "width=900,height=720");
    if (!popup) return;
    popup.document.write(`<html lang="ja"><head><title>運用引継ぎ報告</title><style>body{font-family:sans-serif;padding:28px;color:#172334}h1{border-bottom:2px solid #172334;padding-bottom:8px}pre{white-space:pre-wrap;word-break:break-word;background:#f3f6f9;padding:16px;border-radius:10px}</style></head><body><h1>検査・検品業務サポートシステム 運用引継ぎ報告</h1><pre>${JSON.stringify(report, null, 2).replaceAll("&", "&amp;").replaceAll("<", "&lt;")}</pre></body></html>`);
    popup.document.close();
    popup.print();
  });

  const savedBackupAt = localStorage.getItem("iss-last-system-backup-at");
  if (savedBackupAt) lastBackup.textContent = new Date(savedBackupAt).toLocaleString("ja-JP");
})();
