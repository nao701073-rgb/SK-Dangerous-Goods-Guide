(() => {
  "use strict";
  const form = document.getElementById("easyUpdateForm");
  if (!form) return;
  const result = document.getElementById("easyUpdateResult");
  const actions = document.getElementById("easyUpdateActions");
  let latestManifest = null;
  let latestReport = null;

  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const downloadJson = (name, value) => {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const sha256 = async file => {
    const buffer = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buffer);
    return [...new Uint8Array(digest)].map(v => v.toString(16).padStart(2, "0")).join("");
  };
  const parseCsvLine = line => {
    const cells = []; let current = ""; let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"' && line[i + 1] === '"' && quoted) { current += '"'; i += 1; }
      else if (ch === '"') quoted = !quoted;
      else if (ch === "," && !quoted) { cells.push(current.trim()); current = ""; }
      else current += ch;
    }
    cells.push(current.trim()); return cells;
  };
  const readRecords = async file => {
    if (!file) return null;
    const text = await file.text();
    if (file.name.toLowerCase().endsWith(".json")) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) return parsed;
      for (const key of ["records", "items", "data", "revisions"]) if (Array.isArray(parsed?.[key])) return parsed[key];
      throw new Error("JSON内に配列データが見つかりません。");
    }
    const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) return [];
    const headers = parseCsvLine(lines[0]);
    return lines.slice(1).map(line => Object.fromEntries(parseCsvLine(line).map((value, index) => [headers[index] || `column${index + 1}`, value])));
  };
  const indexRecords = (records, key) => {
    const map = new Map(); const duplicates = []; const missing = [];
    (records || []).forEach((item, index) => {
      const value = String(item?.[key] ?? "").trim();
      if (!value) missing.push(index + 1);
      else if (map.has(value)) duplicates.push(value);
      else map.set(value, item);
    });
    return { map, duplicates: [...new Set(duplicates)], missing };
  };

  form.addEventListener("submit", async event => {
    event.preventDefault();
    actions.hidden = true; result.className = "easy-update-result"; result.innerHTML = "検証中です…"; result.style.display = "block";
    try {
      const regulation = document.getElementById("easyRegulation").value;
      const edition = document.getElementById("easyEdition").value.trim();
      const effectiveFrom = document.getElementById("easyEffectiveFrom").value;
      const preparedBy = document.getElementById("easyPreparedBy").value.trim();
      const pdf = document.getElementById("easyPdf").files[0];
      const dataset = document.getElementById("easyDataset").files[0];
      const baseline = document.getElementById("easyBaseline").files[0];
      const recordKey = document.getElementById("easyRecordKey").value.trim() || "id";
      const summary = document.getElementById("easySummary").value.trim();
      const errors = []; const warnings = []; const checks = [];
      if (!regulation || !edition || !effectiveFrom || !preparedBy || !pdf) errors.push("必須項目を入力してください。");
      if (pdf && pdf.type !== "application/pdf" && !pdf.name.toLowerCase().endsWith(".pdf")) errors.push("最新版PDFにはPDFファイルを選択してください。");
      const pdfHash = pdf ? await sha256(pdf) : "";
      let records = null; let baselineRecords = null;
      if (dataset) records = await readRecords(dataset);
      if (baseline) baselineRecords = await readRecords(baseline);
      let diff = { added: 0, changed: 0, removed: 0 };
      if (records) {
        const idx = indexRecords(records, recordKey);
        checks.push({ label: "更新データ件数", value: `${records.length}件` });
        if (idx.missing.length) errors.push(`識別キー「${recordKey}」が空欄のレコードが${idx.missing.length}件あります。`);
        if (idx.duplicates.length) errors.push(`識別キー「${recordKey}」の重複があります：${idx.duplicates.slice(0, 10).join("、")}`);
        if (!records.length) warnings.push("更新用データが0件です。PDF原本のみの更新として扱います。");
        if (baselineRecords) {
          const oldIdx = indexRecords(baselineRecords, recordKey).map;
          for (const [key, value] of idx.map) {
            if (!oldIdx.has(key)) diff.added += 1;
            else if (JSON.stringify(value) !== JSON.stringify(oldIdx.get(key))) diff.changed += 1;
          }
          for (const key of oldIdx.keys()) if (!idx.map.has(key)) diff.removed += 1;
          if (diff.removed > 0) warnings.push(`旧版から${diff.removed}件削除される候補があります。原文照合が必要です。`);
        }
      } else warnings.push("構造化データが未選択です。PDFの登録候補のみを作成します。");
      checks.push({ label: "PDF", value: `${pdf?.name || "未選択"}（${pdf ? (pdf.size / 1024 / 1024).toFixed(2) : "0"} MB）` });
      checks.push({ label: "SHA-256", value: pdfHash || "-" });
      checks.push({ label: "差分候補", value: `追加 ${diff.added}／変更 ${diff.changed}／削除 ${diff.removed}` });
      latestReport = { schemaVersion: "1.0", checkedAt: new Date().toISOString(), status: errors.length ? "attention-required" : "candidate-ready", regulationId: regulation, editionLabel: edition, checks, errors, warnings, diff };
      latestManifest = { schemaVersion: "1.0", createdAt: new Date().toISOString(), status: "review-required", regulationId: regulation, editionLabel: edition, effectiveFrom, preparedBy, changeSummary: summary, sourceDocument: { fileName: pdf?.name || "", size: pdf?.size || 0, checksumSha256: pdfHash }, dataset: dataset ? { fileName: dataset.name, recordKey, recordCount: records?.length || 0 } : null, baseline: baseline ? { fileName: baseline.name, recordCount: baselineRecords?.length || 0 } : null, diffCandidate: diff, approval: { approved: false, approvedBy: "", sourceVerified: false } };
      result.className = `easy-update-result ${errors.length ? "is-error" : "is-ok"}`;
      result.innerHTML = `<h3>${errors.length ? "要確認：更新候補を確定できません" : "更新候補を作成しました"}</h3><ul>${checks.map(item => `<li><strong>${escapeHtml(item.label)}：</strong>${escapeHtml(item.value)}</li>`).join("")}</ul>${errors.length ? `<p><strong>エラー：</strong>${errors.map(escapeHtml).join("／")}</p>` : ""}${warnings.length ? `<p><strong>確認事項：</strong>${warnings.map(escapeHtml).join("／")}</p>` : ""}<p>次に、原文・別表・脚注を担当者が確認し、承認後に公開してください。</p>`;
      actions.hidden = false;
    } catch (error) {
      latestManifest = null; latestReport = null; actions.hidden = true;
      result.className = "easy-update-result is-error";
      result.innerHTML = `<h3>ファイルを読み込めませんでした</h3><p>${escapeHtml(error.message || error)}</p>`;
    }
  });
  document.getElementById("resetEasyUpdate").addEventListener("click", () => { form.reset(); document.getElementById("easyRecordKey").value = "id"; result.style.display = "none"; actions.hidden = true; latestManifest = null; latestReport = null; });
  document.getElementById("downloadEasyManifest").addEventListener("click", () => latestManifest && downloadJson(`regulation-update-${latestManifest.regulationId}-${latestManifest.editionLabel.replaceAll(/[^0-9A-Za-z_-]/g, "-")}.json`, latestManifest));
  document.getElementById("downloadEasyReport").addEventListener("click", () => latestReport && downloadJson(`regulation-validation-${Date.now()}.json`, latestReport));
})();
