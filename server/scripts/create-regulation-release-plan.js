import fs from "node:fs";
import crypto from "node:crypto";

const [manifestPath, auditPath, releaseMode = "immediate", scheduledAt = "", rollbackRevisionId = ""] = process.argv.slice(2);
if (!manifestPath || !auditPath || !rollbackRevisionId) {
  console.error("Usage: node scripts/create-regulation-release-plan.js <manifest.json> <audit.json> <immediate|scheduled> [scheduledAt] <rollbackRevisionId>");
  process.exit(1);
}
const read = path => JSON.parse(fs.readFileSync(path, "utf8"));
const hash = value => crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
const manifest = read(manifestPath);
const audit = read(auditPath);
const preparedBy = manifest.approval?.preparedBy || "";
const approvedBy = manifest.approval?.approvedBy || "";
const checks = [
  ["audit", audit.status === "passed"],
  ["audit-hash", /^[a-f0-9]{64}$/.test(audit.reportSha256 || "")],
  ["identity", (!audit.regulationId || audit.regulationId === manifest.regulationId) && (!audit.editionLabel || audit.editionLabel === manifest.editionLabel)],
  ["separate-approver", Boolean(preparedBy && approvedBy && preparedBy !== approvedBy)],
  ["impact-reviewed", manifest.impactAssessment?.allAffectedTargetsReviewed === true],
  ["effective-date", /^\d{4}-\d{2}-\d{2}$/.test(manifest.effectiveFrom || "")],
  ["schedule", releaseMode === "immediate" || Boolean(scheduledAt)],
  ["rollback", Boolean(rollbackRevisionId)]
].map(([key, passed]) => ({ key, passed }));
const blocked = checks.filter(item => !item.passed);
if (blocked.length) {
  console.error(`Release blocked: ${blocked.map(item => item.key).join(", ")}`);
  process.exit(2);
}
const plan = {
  schemaVersion: "1.0",
  releaseId: `release-${Date.now()}`,
  regulationId: manifest.regulationId,
  editionLabel: manifest.editionLabel,
  manifestSha256: hash(manifest),
  integrityAuditSha256: audit.reportSha256,
  releaseMode,
  scheduledAt: releaseMode === "scheduled" ? new Date(scheduledAt).toISOString() : null,
  effectiveFrom: manifest.effectiveFrom,
  rollbackRevisionId,
  preparedBy,
  approvedBy,
  gateStatus: "ready",
  gateChecks: checks,
  createdAt: new Date().toISOString(),
  releasePlanSha256: ""
};
plan.releasePlanSha256 = hash(plan);
process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
