import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const context = { window: {} };
vm.createContext(context);
for (const file of ["data/domestic-code-originals.js", "data/domestic-code-page-ranges.js", "data/imdg-cross-reference-registry.js", "data/imdg-section-page-map.js", "assets/js/imdg-cross-reference-resolver.js"]) {
  const full = path.join(root, file);
  if (fs.existsSync(full)) vm.runInContext(fs.readFileSync(full, "utf8"), context, { filename: file });
}
const entries = context.window.DOMESTIC_CODE_ORIGINALS?.entries || {};
const failures = [];
for (const [code, item] of Object.entries(entries)) {
  if (!String(item.domesticOriginal || "").trim()) failures.push(`${code}: 原文なし`);
  const resolved = context.window.IMDGCrossReferenceResolver?.resolve(code);
  if (!resolved) failures.push(`${code}: resolver未解決`);
}
const p112 = context.window.IMDGCrossReferenceResolver?.resolve("P112")?.domesticOriginal || "";
if (!/P112\(a\)/.test(p112) || !/P112\(c\)/.test(p112)) failures.push("P112: a～cの原文不足");
const required = ["P002", "P112", "P200", "ES04", "SGG2", "SP373"];
for (const code of required) if (!context.window.IMDGCrossReferenceResolver?.resolve(code)) failures.push(`${code}: 必須コード未解決`);
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`OK: ${Object.keys(entries).length}コード原文を確認`);
