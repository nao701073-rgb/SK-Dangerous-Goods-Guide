(() => {
  "use strict";
  const regulations = Array.isArray(window.REGULATION_REGISTRY) ? window.REGULATION_REGISTRY : [];
  const revisions = window.REGULATION_REVISION_REGISTRY?.revisions || [];
  const byId = new Map(regulations.map(item => [item.regulationId, item]));
  const form = document.getElementById("snapshotForm");
  const result = document.getElementById("snapshotResult");
  const downloadButton = document.getElementById("downloadSnapshot");
  const regulationId = document.getElementById("regulationId");
  const asOfDate = document.getElementById("asOfDate");
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  let currentSnapshot = null;

  regulationId.innerHTML = '<option value="">選択してください</option>' + regulations.map(item => `<option value="${escapeHtml(item.regulationId)}">${escapeHtml(item.shortName)}｜${escapeHtml(item.officialName)}</option>`).join("");
  asOfDate.value = new Date().toISOString().slice(0, 10);

  function resolveRevision(id, date) {
    return revisions.filter(item => item.regulationId === id && item.effectiveFrom && item.effectiveFrom <= date && (!item.effectiveTo || item.effectiveTo >= date) && ["approved", "published", "superseded"].includes(item.status));
  }

  async function digestJson(value) {
    const text = JSON.stringify(value);
    if (!crypto?.subtle) return "server-calculation-required";
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest)).map(byte => byte.toString(16).padStart(2, "0")).join("");
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    const id = regulationId.value;
    const date = asOfDate.value;
    const matches = resolveRevision(id, date);
    const errors = [];
    if (!document.getElementById("caseReference").value.trim()) errors.push("案件番号が未入力です。");
    if (!date) errors.push("判定基準日が未入力です。");
    if (!id) errors.push("対象法令が未選択です。");
    if (!document.getElementById("decisionSummary").value.trim()) errors.push("判定・確認内容が未入力です。");
    if (!document.getElementById("recordedBy").value.trim()) errors.push("記録者が未入力です。");
    if (matches.length === 0 && id && date) errors.push("基準日に適用できる承認済み法令版がありません。");
    if (matches.length > 1) errors.push("適用期間が重複しているため、採用版を一意に決定できません。");
    if (errors.length) {
      currentSnapshot = null;
      downloadButton.disabled = true;
      result.className = "validation-result is-error";
      result.innerHTML = `<h3>スナップショットを作成できません</h3><ul>${errors.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      return;
    }
    const revision = matches[0];
    const regulation = byId.get(id) || {};
    const createdAt = new Date().toISOString();
    const core = {
      schemaVersion: "1.0",
      snapshotId: `snapshot-${Date.now()}`,
      caseReference: document.getElementById("caseReference").value.trim(),
      purpose: document.getElementById("purpose").value,
      asOfDate: date,
      subject: {
        unNumber: document.getElementById("unNumber").value.trim() || null,
        properShippingName: document.getElementById("properShippingName").value.trim() || null
      },
      regulation: {
        regulationId: id,
        shortName: regulation.shortName || id,
        officialName: regulation.officialName || "",
        revisionId: revision.revisionId,
        editionLabel: revision.editionLabel,
        effectiveFrom: revision.effectiveFrom,
        effectiveTo: revision.effectiveTo,
        statusAtCapture: revision.status
      },
      evidence: {
        sourceDocument: revision.sourceDocument || {},
        dataset: revision.dataset || {},
        decisionSummary: document.getElementById("decisionSummary").value.trim(),
        sourceReferences: document.getElementById("sourceReferences").value.split("\n").map(value => value.trim()).filter(Boolean)
      },
      audit: {
        recordedBy: document.getElementById("recordedBy").value.trim(),
        reviewedBy: document.getElementById("reviewedBy").value.trim() || null,
        createdAt,
        immutableAfterApproval: true
      }
    };
    core.snapshotSha256 = await digestJson(core);
    currentSnapshot = core;
    downloadButton.disabled = false;
    result.className = "validation-result is-ok";
    result.innerHTML = `<h3>判定根拠スナップショットを作成しました</h3><p><strong>採用版：</strong>${escapeHtml(revision.editionLabel)}</p><p><strong>適用期間：</strong>${escapeHtml(revision.effectiveFrom)} ～ ${escapeHtml(revision.effectiveTo || "継続")}</p><p><strong>原本PDF：</strong>${escapeHtml(revision.sourceDocument?.fileName || "未登録")}</p><p><strong>原本SHA-256：</strong><code>${escapeHtml(revision.sourceDocument?.checksumSha256 || "サーバー登録時に算出")}</code></p><p><strong>スナップショットSHA-256：</strong><code>${escapeHtml(core.snapshotSha256)}</code></p><div class="gate-summary">この記録は案件時点の根拠として保存できます。本番運用ではサーバー側で連番、署名、承認状態を付与します。</div>`;
  });

  downloadButton.addEventListener("click", () => {
    if (!currentSnapshot) return;
    const blob = new Blob([JSON.stringify(currentSnapshot, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentSnapshot.caseReference}-regulation-evidence.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
})();
