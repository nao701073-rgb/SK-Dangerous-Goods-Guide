(() => {
  "use strict";
  const regulations = Array.isArray(window.REGULATION_REGISTRY) ? window.REGULATION_REGISTRY : [];
  const revisionRegistry = window.REGULATION_REVISION_REGISTRY || { revisions: [] };
  const impactRegistry = window.REGULATION_IMPACT_REGISTRY || { relations: [], publicationGate: {} };
  const form = document.getElementById("revisionForm");
  const regulationId = document.getElementById("regulationId");
  const result = document.getElementById("validationResult");
  const diffPreview = document.getElementById("diffPreview");
  const rows = document.getElementById("revisionRows");
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const todayIso = new Date().toISOString().slice(0, 10);
  const statusLabels = { draft:"下書き", "source-registered":"原本登録済み", "data-prepared":"データ作成済み", reviewed:"照合済み", approved:"承認済み", published:"公開中", superseded:"旧版" };
  const byId = new Map(regulations.map(item => [item.regulationId, item]));
  const impactByRegulation = new Map((impactRegistry.relations || []).map(item => [item.regulationId, item]));

  regulationId.innerHTML = '<option value="">選択してください</option>' + regulations.map(item => `<option value="${escapeHtml(item.regulationId)}">${escapeHtml(item.shortName)}｜${escapeHtml(item.officialName)}</option>`).join("");
  
  const asOfRegulation = document.getElementById("asOfRegulation");
  const asOfDate = document.getElementById("asOfDate");
  asOfRegulation.innerHTML = regulationId.innerHTML;
  asOfDate.value = todayIso;

  function selectedImpactDomains() { return [...document.querySelectorAll('[name="impactDomain"]:checked')].map(el => el.value); }
  function applyImpactCandidates() {
    const relation = impactByRegulation.get(regulationId.value);
    const affected = document.getElementById("affectedRegulations");
    const targetKeys = document.getElementById("targetKeys");
    const container = document.getElementById("impactDomains");
    if (!relation) { container.innerHTML = '<span class="muted-note">個別に影響先を入力し、すべて原文照合してください。</span>'; return; }
    affected.value = (relation.affectedRegulations || []).join(", ");
    if (!targetKeys.value.trim()) targetKeys.value = (relation.defaultTargetKeys || []).join(", ");
    container.innerHTML = `<div class="impact-domain-grid">${(relation.reviewDomains || []).map(domain => `<label><input type="checkbox" name="impactDomain" value="${escapeHtml(domain)}" checked>${escapeHtml(domain)}</label>`).join("")}</div>`;
  }
  regulationId.addEventListener("change", applyImpactCandidates);

  rows.innerHTML = revisionRegistry.revisions.map(item => {
    const regulation = byId.get(item.regulationId) || {};
    return `<tr><td><strong>${escapeHtml(regulation.shortName || item.regulationId)}</strong></td><td>${escapeHtml(item.editionLabel)}</td><td>${escapeHtml(item.effectiveFrom || "未登録")} ～ ${escapeHtml(item.effectiveTo || "継続")}</td><td><span class="revision-status revision-status--${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</span></td><td>${escapeHtml(item.sourceDocument?.fileName || "-")}</td><td>${escapeHtml((item.dataset?.targetKeys || []).join("、") || "-")}</td></tr>`;
  }).join("") || '<tr><td colspan="6">履歴がありません。</td></tr>';

  async function sha256(file) {
    if (!crypto?.subtle) return "ブラウザ非対応";
    const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  function parseTargetKeys() { return document.getElementById("targetKeys").value.split(",").map(v => v.trim()).filter(Boolean); }
  function checkedItems() { return [...document.querySelectorAll('[name="checkedItem"]:checked')].map(el => el.value); }
  async function parseDataset(file) {
    if (!file) return null;
    if (!file.name.toLowerCase().endsWith(".json")) return { format:"csv", records:null };
    const parsed = JSON.parse(await file.text());
    const records = Array.isArray(parsed) ? parsed : Array.isArray(parsed.records) ? parsed.records : null;
    return { format:"json", raw:parsed, records };
  }
  function stable(value) {
    if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
    if (value && typeof value === "object") return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(",")}}`;
    return JSON.stringify(value);
  }
  function makeDiff(baseRecords, nextRecords, key) {
    const getKey = (item, index) => String(item?.[key] ?? item?.unNumber ?? item?.code ?? item?.id ?? index);
    const base = new Map(baseRecords.map((item, i) => [getKey(item, i), item]));
    const next = new Map(nextRecords.map((item, i) => [getKey(item, i), item]));
    const added = [], changed = [], deleted = [];
    next.forEach((value, id) => { if (!base.has(id)) added.push(id); else if (stable(base.get(id)) !== stable(value)) changed.push(id); });
    base.forEach((_, id) => { if (!next.has(id)) deleted.push(id); });
    return { added, changed, deleted, baseCount:base.size, nextCount:next.size };
  }
  function renderDiff(diff) {
    if (!diff) { diffPreview.className = "diff-preview"; diffPreview.innerHTML = ""; return; }
    const sample = values => values.slice(0, 8).map(escapeHtml).join("、") || "なし";
    diffPreview.className = "diff-preview is-visible";
    diffPreview.innerHTML = `<h3>構造化データ差分プレビュー</h3><div class="diff-cards"><article><strong>${diff.added.length}</strong><span>追加</span></article><article><strong>${diff.changed.length}</strong><span>変更</span></article><article><strong>${diff.deleted.length}</strong><span>削除</span></article><article><strong>${diff.baseCount} → ${diff.nextCount}</strong><span>総件数</span></article></div><details><summary>差分IDの例</summary><p><b>追加：</b>${sample(diff.added)}</p><p><b>変更：</b>${sample(diff.changed)}</p><p><b>削除：</b>${sample(diff.deleted)}</p></details><p class="warning-note">削除件数がある場合は、法令上の削除か抽出漏れかをPDF原文で確認してください。</p>`;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const pdf = document.getElementById("sourcePdf").files[0];
    const dataset = document.getElementById("datasetFile").files[0];
    const baseline = document.getElementById("baselineFile").files[0];
    const checks = [];
    checks.push(["法令を選択", Boolean(regulationId.value)]);
    checks.push(["版・改正番号", Boolean(document.getElementById("editionLabel").value.trim())]);
    const effectiveFrom = document.getElementById("effectiveFrom").value;
    const effectiveTo = document.getElementById("effectiveTo").value;
    checks.push(["適用開始日", Boolean(effectiveFrom)]);
    checks.push(["適用期間", Boolean(!effectiveTo || !effectiveFrom || effectiveTo >= effectiveFrom)]);
    const overlaps = (revisionRegistry.revisions || []).filter(r => r.regulationId === regulationId.value && r.status !== "superseded" && r.effectiveFrom && (!effectiveTo || r.effectiveFrom <= effectiveTo) && (!r.effectiveTo || r.effectiveTo >= effectiveFrom));
    checks.push(["適用期間の重複なし", overlaps.length === 0]);
    checks.push(["対象データ", parseTargetKeys().length > 0]);
    checks.push(["影響分野", selectedImpactDomains().length > 0]);
    const preparedBy = document.getElementById("preparedBy").value.trim();
    const approvedBy = document.getElementById("approvedBy").value.trim();
    checks.push(["データ作成者", Boolean(preparedBy)]);
    checks.push(["公開承認者", Boolean(approvedBy)]);
    checks.push(["作成者と承認者の分離", Boolean(preparedBy && approvedBy && preparedBy !== approvedBy)]);
    checks.push(["PDF形式", Boolean(pdf && (pdf.type === "application/pdf" || pdf.name.toLowerCase().endsWith(".pdf")))]);
    if (dataset) checks.push(["新データ形式", /\.(json|csv)$/i.test(dataset.name)]);
    if (baseline) checks.push(["比較元形式", /\.(json|csv)$/i.test(baseline.name)]);
    let datasetDetail = "構造化データは未選択です。原本登録後に追加できます。";
    let diff = null;
    try {
      const nextParsed = await parseDataset(dataset);
      const baseParsed = await parseDataset(baseline);
      if (nextParsed?.format === "json") {
        checks.push(["JSON構文", true]);
        checks.push(["レコード配列", Array.isArray(nextParsed.records)]);
        datasetDetail = Array.isArray(nextParsed.records) ? `新データ ${nextParsed.records.length}件を読み込みました。` : "JSONは配列、またはrecords配列を持つ形式にしてください。";
      } else if (dataset) datasetDetail = "CSVを選択しました。サーバー側の列定義検証対象です。";
      if (nextParsed?.records && baseParsed?.records) diff = makeDiff(baseParsed.records, nextParsed.records, document.getElementById("recordKey").value.trim() || "id");
    } catch (error) {
      checks.push(["JSON構文", false]); datasetDetail = `JSON構文エラー：${error.message}`;
    }
    const checksum = pdf ? await sha256(pdf) : "-";
    const ok = checks.every(([, passed]) => passed);
    result.className = `validation-result ${ok ? "is-ok" : "is-error"}`;
    result.innerHTML = `<h3>${ok ? "登録前検査に合格" : "修正が必要です"}</h3><ul>${checks.map(([label, passed]) => `<li>${passed ? "✓" : "×"} ${escapeHtml(label)}</li>`).join("")}</ul><p>${escapeHtml(datasetDetail)}</p><p><strong>PDF SHA-256：</strong><code>${escapeHtml(checksum)}</code></p><div class="gate-summary ${ok ? "" : "is-blocked"}"><strong>公開判定：</strong>${ok ? "公開申請へ進めます（本番反映は未実施）。" : "公開不可。未確認項目を解消してください。"}</div><p>${ok ? "本番データはまだ変更されません。差分確認、原文照合、承認後に公開してください。" : "未入力または形式不正の項目を確認してください。"}</p>`;
    renderDiff(diff);
  });

  document.getElementById("resolveAsOf").addEventListener("click", () => {
    const date = asOfDate.value;
    const id = asOfRegulation.value;
    const target = document.getElementById("asOfResult");
    const candidates = (revisionRegistry.revisions || []).filter(r => r.regulationId === id && r.effectiveFrom && r.effectiveFrom <= date && (!r.effectiveTo || r.effectiveTo >= date) && ["approved","published","superseded"].includes(r.status));
    candidates.sort((a,b) => String(b.effectiveFrom).localeCompare(String(a.effectiveFrom)));
    if (!id || !date) { target.className="validation-result is-error"; target.innerHTML="<p>法令と基準日を指定してください。</p>"; return; }
    if (candidates.length === 0) { target.className="validation-result is-error"; target.innerHTML=`<h3>適用版なし</h3><p>${escapeHtml(date)}時点で承認済みの適用版が登録されていません。</p>`; return; }
    if (candidates.length > 1) { target.className="validation-result is-error"; target.innerHTML=`<h3>適用期間重複</h3><p>${candidates.length}件が同時に適用対象です。公開前に期間を修正してください。</p>`; return; }
    const r=candidates[0]; target.className="validation-result is-ok"; target.innerHTML=`<h3>${escapeHtml(r.editionLabel)}</h3><p><strong>適用期間：</strong>${escapeHtml(r.effectiveFrom)} ～ ${escapeHtml(r.effectiveTo || "継続")}</p><p><strong>状態：</strong>${escapeHtml(statusLabels[r.status] || r.status)}</p><p>この版を基準日の判定根拠として参照します。</p>`;
  });


  let latestAuditReport = null;
  async function hashJsonValue(value) {
    const bytes = new TextEncoder().encode(JSON.stringify(value));
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }
  document.getElementById("runIntegrityAudit").addEventListener("click", async () => {
    const target = document.getElementById("integrityAuditResult");
    const manifestFile = document.getElementById("auditManifest").files[0];
    const pdfFile = document.getElementById("auditPdf").files[0];
    const datasetFile = document.getElementById("auditDataset").files[0];
    const issues = []; const checks = [];
    if (!manifestFile) issues.push("更新マニフェストを選択してください。");
    if (!pdfFile) issues.push("原本PDFを選択してください。");
    if (!datasetFile) issues.push("構造化データを選択してください。");
    let manifest = null; let records = null;
    try { if (manifestFile) manifest = JSON.parse(await manifestFile.text()); } catch (error) { issues.push(`マニフェストJSON構文エラー：${error.message}`); }
    try {
      if (datasetFile) {
        const parsed = JSON.parse(await datasetFile.text());
        records = Array.isArray(parsed) ? parsed : parsed.records;
        if (!Array.isArray(records)) issues.push("構造化データに配列またはrecords配列がありません。");
      }
    } catch (error) { issues.push(`構造化データJSON構文エラー：${error.message}`); }
    if (manifest && pdfFile) {
      const actual = await sha256(pdfFile); const expected = manifest.sourceDocument?.checksumSha256 || "";
      const passed = !expected || actual === expected.toLowerCase();
      checks.push({ label:"原本PDF SHA-256", passed, actual, expected:expected || null });
      if (!passed) issues.push("原本PDFのSHA-256が登録値と一致しません。");
      if (manifest.sourceDocument?.fileName && manifest.sourceDocument.fileName !== pdfFile.name) issues.push("原本PDFのファイル名がマニフェストと一致しません。");
    }
    if (manifest && datasetFile) {
      const actual = await sha256(datasetFile); const expected = manifest.dataset?.checksumSha256 || "";
      const passed = !expected || actual === expected.toLowerCase();
      checks.push({ label:"構造化データ SHA-256", passed, actual, expected:expected || null });
      if (!passed) issues.push("構造化データのSHA-256が登録値と一致しません。");
      if (manifest.dataset?.fileName && manifest.dataset.fileName !== datasetFile.name) issues.push("構造化データのファイル名がマニフェストと一致しません。");
    }
    if (manifest && Array.isArray(records)) {
      const expected = manifest.dataset?.expectedRecordCount;
      const passed = expected == null || Number(expected) === records.length;
      checks.push({ label:"レコード件数", passed, actual:records.length, expected:expected ?? null });
      if (!passed) issues.push(`レコード件数が一致しません（登録 ${expected}件／現在 ${records.length}件）。`);
      const key = manifest.dataset?.recordKey || "id"; const seen = new Set(); const duplicates = []; let missing = 0;
      records.forEach(item => { const value = String(item?.[key] ?? ""); if (!value) missing += 1; else if (seen.has(value)) duplicates.push(value); else seen.add(value); });
      checks.push({ label:`識別キー ${key}`, passed:missing === 0 && duplicates.length === 0, actual:`欠落 ${missing}件／重複 ${duplicates.length}件`, expected:"欠落・重複なし" });
      if (missing) issues.push(`識別キー ${key} の欠落が${missing}件あります。`);
      if (duplicates.length) issues.push(`識別キー ${key} の重複があります：${[...new Set(duplicates)].slice(0,8).join("、")}`);
    }
    latestAuditReport = { schemaVersion:"1.0", auditedAt:new Date().toISOString(), manifestFile:manifestFile?.name || null, regulationId:manifest?.regulationId || null, editionLabel:manifest?.editionLabel || null, status:issues.length ? "attention-required" : "passed", checks, issues, reportSha256:"" };
    latestAuditReport.reportSha256 = await hashJsonValue(latestAuditReport);
    document.getElementById("downloadAuditReport").disabled = false;
    target.className = `validation-result ${issues.length ? "is-error" : "is-ok"}`;
    target.innerHTML = `<h3>${issues.length ? "要確認：公開版の整合性に問題があります" : "監査合格：登録内容と一致しています"}</h3><ul class="audit-check-list">${checks.map(item => `<li class="${item.passed ? "" : "is-failed"}">${item.passed ? "✓" : "×"} <strong>${escapeHtml(item.label)}</strong><br><span class="audit-hash">現在：${escapeHtml(item.actual)}${item.expected !== null ? `<br>登録：${escapeHtml(item.expected)}` : ""}</span></li>`).join("")}</ul>${issues.length ? `<p><strong>検出事項：</strong>${issues.map(escapeHtml).join("／")}</p>` : "<p>原本差し替え、データ欠落、件数不一致、識別キー重複は検出されませんでした。</p>"}<p><strong>監査結果SHA-256：</strong><code>${escapeHtml(latestAuditReport.reportSha256)}</code></p>`;
  });
  document.getElementById("downloadAuditReport").addEventListener("click", () => {
    if (!latestAuditReport) return;
    const blob = new Blob([JSON.stringify(latestAuditReport, null, 2)], { type:"application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `regulation-integrity-audit-${Date.now()}.json`; link.click(); URL.revokeObjectURL(link.href);
  });

  document.getElementById("downloadManifest").addEventListener("click", () => {
    const manifest = {
      schemaVersion: "1.3", regulationId: regulationId.value || "domestic-dangerous-goods-notification",
      updateType: document.getElementById("updateType").value, editionLabel: document.getElementById("editionLabel").value,
      publicationDate: document.getElementById("publicationDate").value || "YYYY-MM-DD", effectiveFrom: document.getElementById("effectiveFrom").value || "YYYY-MM-DD", effectiveTo: document.getElementById("effectiveTo").value || null,
      sourceDocument: { fileName: document.getElementById("sourcePdf").files[0]?.name || "", language: "ja", publisher: "", sourceUrl: "", checksumSha256: "" },
      dataset: { fileName: document.getElementById("datasetFile").files[0]?.name || "", format: "json", schemaVersion: "1.0", targetKeys: parseTargetKeys(), recordKey: document.getElementById("recordKey").value || "id", expectedRecordCount: null },
      temporalPolicy: { asOfDateRequired: true, overlapProhibited: true, retainHistoricalVersions: true },
      comparison: { baselineRevisionId: "", baselineFileName: document.getElementById("baselineFile").files[0]?.name || "", expectedMaximumDeletionCount: 0 },
      impactAssessment: { affectedRegulations: document.getElementById("affectedRegulations").value.split(",").map(v => v.trim()).filter(Boolean), reviewDomains: selectedImpactDomains(), allAffectedTargetsReviewed: false },
      approval: { preparedBy: document.getElementById("preparedBy").value, approvedBy: document.getElementById("approvedBy").value, selfApprovalProhibited: true },
      changeSummary: document.getElementById("changeSummary").value, verification: { reviewer: "", checkedItems: checkedItems(), sourcePageReferences: [] }
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "regulation-update-manifest-template.json"; link.click(); URL.revokeObjectURL(link.href);
  });
})();
