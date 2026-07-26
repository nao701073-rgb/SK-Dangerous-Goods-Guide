(() => {
  "use strict";
  const registry = window.REGULATION_RELEASE_REGISTRY || { policy: {}, releases: [] };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const releaseRows = $("releaseRows");
  let latestPlan = null;

  function renderRows() {
    const items = Array.isArray(registry.releases) ? registry.releases : [];
    releaseRows.innerHTML = items.map(item => `<tr><td>${esc(item.releaseId)}</td><td>${esc(item.regulationId)}</td><td>${esc(item.editionLabel)}</td><td>${esc(item.releaseMode)}</td><td>${esc(item.scheduledAt || item.publishedAt || "-")}</td><td>${esc(item.status)}</td></tr>`).join("") || '<tr><td colspan="6">公開履歴はまだありません。</td></tr>';
  }

  async function readJson(file, label) {
    if (!file) throw new Error(`${label}を選択してください。`);
    try { return JSON.parse(await file.text()); }
    catch { throw new Error(`${label}が正しいJSONではありません。`); }
  }

  async function hashJson(value) {
    const normalized = JSON.stringify(value);
    const buffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
    return [...new Uint8Array(buffer)].map(v => v.toString(16).padStart(2, "0")).join("");
  }

  function gateChecks(manifest, audit, mode, scheduledAt, rollbackRevisionId) {
    const checks = [];
    const preparedBy = manifest.approval?.preparedBy?.trim() || "";
    const approvedBy = manifest.approval?.approvedBy?.trim() || "";
    checks.push({ key:"audit", label:"整合性監査が合格", passed:audit.status === "passed" });
    checks.push({ key:"audit-hash", label:"監査結果ハッシュが記録済み", passed:/^[a-f0-9]{64}$/.test(audit.reportSha256 || "") });
    checks.push({ key:"identity", label:"監査対象と更新対象が一致", passed:(!audit.regulationId || audit.regulationId === manifest.regulationId) && (!audit.editionLabel || audit.editionLabel === manifest.editionLabel) });
    checks.push({ key:"approval", label:"作成者と承認者が別人", passed:Boolean(preparedBy && approvedBy && preparedBy !== approvedBy) });
    checks.push({ key:"impact", label:"影響先の確認が完了", passed:manifest.impactAssessment?.allAffectedTargetsReviewed === true });
    checks.push({ key:"effective", label:"適用開始日が登録済み", passed:/^\d{4}-\d{2}-\d{2}$/.test(manifest.effectiveFrom || "") });
    checks.push({ key:"schedule", label:"公開日時が有効", passed:mode === "immediate" || Boolean(scheduledAt) });
    checks.push({ key:"rollback", label:"ロールバック先が指定済み", passed:Boolean(rollbackRevisionId) });
    return checks;
  }

  $("releaseMode").addEventListener("change", event => {
    $("scheduledAtWrap").hidden = event.target.value !== "scheduled";
  });

  $("evaluateReleaseGate").addEventListener("click", async () => {
    const target = $("releaseGateResult");
    try {
      const manifest = await readJson($("releaseManifest").files[0], "更新マニフェスト");
      const audit = await readJson($("releaseAudit").files[0], "監査結果");
      const mode = $("releaseMode").value;
      const scheduledAt = $("releaseScheduledAt").value || null;
      const rollbackRevisionId = $("rollbackRevisionId").value.trim();
      const checks = gateChecks(manifest, audit, mode, scheduledAt, rollbackRevisionId);
      const blocked = checks.filter(item => !item.passed);
      latestPlan = {
        schemaVersion: "1.0",
        releaseId: `release-${Date.now()}`,
        regulationId: manifest.regulationId,
        editionLabel: manifest.editionLabel,
        manifestSha256: await hashJson(manifest),
        integrityAuditSha256: audit.reportSha256,
        releaseMode: mode,
        scheduledAt: mode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
        effectiveFrom: manifest.effectiveFrom,
        rollbackRevisionId,
        preparedBy: manifest.approval?.preparedBy || "",
        approvedBy: manifest.approval?.approvedBy || "",
        gateStatus: blocked.length ? "blocked" : "ready",
        gateChecks: checks,
        createdAt: new Date().toISOString(),
        releasePlanSha256: ""
      };
      latestPlan.releasePlanSha256 = await hashJson(latestPlan);
      $("downloadReleasePlan").disabled = blocked.length > 0;
      target.className = `validation-result ${blocked.length ? "is-error" : "is-ok"}`;
      target.innerHTML = `<h3>${blocked.length ? "公開不可：未完了条件があります" : "公開準備完了"}</h3><ul class="audit-check-list">${checks.map(item => `<li class="${item.passed ? "" : "is-failed"}">${item.passed ? "✓" : "×"} ${esc(item.label)}</li>`).join("")}</ul>${blocked.length ? "<p>未完了項目を修正し、新しい監査・承認記録を作成してください。</p>" : `<p>公開計画SHA-256：<code>${esc(latestPlan.releasePlanSha256)}</code></p>`}`;
    } catch (error) {
      latestPlan = null;
      $("downloadReleasePlan").disabled = true;
      target.className = "validation-result is-error";
      target.innerHTML = `<h3>公開判定を実行できません</h3><p>${esc(error.message)}</p>`;
    }
  });

  $("downloadReleasePlan").addEventListener("click", () => {
    if (!latestPlan || latestPlan.gateStatus !== "ready") return;
    const blob = new Blob([JSON.stringify(latestPlan, null, 2)], { type:"application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${latestPlan.releaseId}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });

  renderRows();
})();
