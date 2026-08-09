import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import { fileURLToPath } from 'node:url';

const root = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const context = { window: {} };
vm.createContext(context);
for (const file of [
  "data/un-data.js",
  "data/domestic-code-originals.js",
  "data/domestic-code-page-ranges.js",
  "data/imdg-cross-reference.js",
  "data/imdg-section-page-map.js",
  "assets/js/imdg-cross-reference-resolver.js"
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const records = context.window.UN_DATABASE || [];
const resolver = context.window.IMDGCrossReferenceResolver;
const fields = [
  "smallPackingInstruction", "smallPackingAdditional",
  "largePackingInstruction", "largePackingAdditional",
  "ibcInstruction", "ibcAdditional",
  "portableTankInstruction", "portableTankAdditional",
  "flexibleBulkContainer", "specialProvisions", "stowage", "segregation", "remarks"
];
const codes = new Set();
for (const record of records) {
  for (const field of fields) {
    for (const raw of (Array.isArray(record[field]) ? record[field] : [record[field]])) {
      const value = String(raw || "").normalize("NFKC").toUpperCase();
      for (const match of value.matchAll(/\b(?:P|PP|LP|L|IBC|B|T|TP|SP|SW|SGG?|ES|E|BK|H)\d+[A-Z]?\b|\b[A-E]\b/g)) {
        codes.add(match[0]);
      }
    }
  }
}

const failures = [];
for (const code of [...codes].sort()) {
  const reference = resolver.resolve(code);
  if (!reference) failures.push(`${code}: resolver未解決`);
  else if (!String(reference.domesticOriginal || "").trim()) failures.push(`${code}: 国内法令原文なし`);
  else if (!(reference.domesticOriginalPages || [reference.domesticOriginalPage]).filter(Boolean).length) failures.push(`${code}: 掲載ページなし`);
}
for (const code of ["P110", "P112", "P114", "P132", "P200", "SG72A", "SG72B", "SG72C", "SG72D", "TP33", "ES04", "SP373", "SGG2"]) {
  const reference = resolver.resolve(code);
  if (!reference || !String(reference.domesticOriginal || "").trim()) failures.push(`${code}: 必須確認コード未登録`);
}
if (records.some(record => String(record.portableTankAdditional || "").trim() === "T33")) failures.push("portableTankAdditional: T33が残っています（TP33へ訂正が必要）");
const p110 = resolver.resolve("P110")?.domesticOriginal || "";
if (/\nP111\b/.test(p110) || p110.length > 10000) failures.push("P110: 前後コードを含む不正な抽出範囲");
const p112 = resolver.resolve("P112")?.domesticOriginal || "";
if (!/P112\(a\)/.test(p112) || !/P112\(b\)/.test(p112) || !/P112\(c\)/.test(p112)) failures.push("P112: a～cの原文不足");
const p200 = resolver.resolve("P200");
if ((p200?.domesticOriginalPages || []).length < 10) failures.push("P200: 全掲載ページが登録されていません");

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(`OK: 危険物データ${records.length}行／使用コード${codes.size}件を全件確認`);
