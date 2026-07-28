import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(import.meta.dirname, "../..");
const requiredFiles = [
  "index.html",
  "VERSION.json",
  "release-manifest.json",
  "server/package.json",
  "server/.env.cloud.example",
  "server/src/server.js",
  "server/data/users-pilot-50-template.csv",
  "docs/Part243_完成版文書更新・統合要領.md"
];
const checks = requiredFiles.map(relative => {
  const file = path.join(root, relative);
  return {relative, exists: fs.existsSync(file), size: fs.existsSync(file) ? fs.statSync(file).size : 0};
});
const versionFile = path.join(root, "VERSION.json");
const version = fs.existsSync(versionFile) ? JSON.parse(fs.readFileSync(versionFile, "utf8")) : null;
const digest = crypto.createHash("sha256").update(JSON.stringify(checks)).digest("hex");
const report = {
  generatedAt: new Date().toISOString(),
  version,
  status: checks.every(item => item.exists && item.size > 0) ? "pass" : "fail",
  checks,
  checklistDigest: digest,
  note: "外部クラウド接続、メール送信、負荷試験、復元試験は配置環境で別途確認してください。"
};
const output = path.join(root, "docs/Part249_配置前検査レポート.json");
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report, null, 2));
if (report.status !== "pass") process.exitCode = 1;
