import fs from "node:fs";
import crypto from "node:crypto";

const [registryPath, regulationId, asOfDate, caseReference] = process.argv.slice(2);
if (!registryPath || !regulationId || !asOfDate || !caseReference) {
  console.error("Usage: node scripts/create-evidence-snapshot.js registry.json regulationId YYYY-MM-DD caseReference");
  process.exit(1);
}
const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
const revisions = Array.isArray(registry) ? registry : registry.revisions || [];
const matches = revisions.filter(item => item.regulationId === regulationId && item.effectiveFrom && item.effectiveFrom <= asOfDate && (!item.effectiveTo || item.effectiveTo >= asOfDate) && ["approved", "published", "superseded"].includes(item.status));
if (matches.length !== 1) {
  console.error(matches.length ? `Overlapping revisions: ${matches.length}` : "No applicable approved revision");
  process.exit(2);
}
const revision = matches[0];
const snapshot = {
  schemaVersion: "1.0",
  snapshotId: crypto.randomUUID(),
  caseReference,
  asOfDate,
  regulation: {
    regulationId,
    revisionId: revision.revisionId,
    editionLabel: revision.editionLabel,
    effectiveFrom: revision.effectiveFrom,
    effectiveTo: revision.effectiveTo || null,
    statusAtCapture: revision.status
  },
  evidence: { sourceDocument: revision.sourceDocument || {}, dataset: revision.dataset || {} },
  audit: { createdAt: new Date().toISOString(), immutableAfterApproval: true }
};
const canonical = JSON.stringify(snapshot);
snapshot.snapshotSha256 = crypto.createHash("sha256").update(canonical).digest("hex");
process.stdout.write(`${JSON.stringify(snapshot, null, 2)}\n`);
