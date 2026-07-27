import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const dataPath = path.join(rootDir, "data/un-data.js");
const reportPath = path.join(rootDir, "docs/Part209_SP重複正規化レポート.json");
const write = process.argv.includes("--write");

const source = fs.readFileSync(dataPath, "utf8");
const window = {};
vm.runInNewContext(source, { window, console }, { filename: dataPath, timeout: 15000 });
const records = window.UN_DATABASE;
if (!Array.isArray(records)) throw new Error("UN_DATABASE must be an array");

const changes = [];
for (const [index, record] of records.entries()) {
  if (!Array.isArray(record.specialProvisions)) continue;
  const before = [...record.specialProvisions];
  const after = [...new Set(before.map((value) => String(value).trim()).filter(Boolean))];
  if (before.length !== after.length || before.some((value, i) => value !== after[i])) {
    changes.push({
      index,
      unNumber: record.unNumber,
      properShippingNameJa: record.properShippingNameJa,
      sourcePage: record.sourcePage,
      sourceRow: record.sourceRow,
      before,
      after,
      removed: before.filter((value, i, list) => list.indexOf(value) !== i)
    });
    record.specialProvisions = after;
  }
}

const report = {
  generatedAt: new Date().toISOString(),
  mode: write ? "write" : "dry-run",
  recordCount: records.length,
  changedRecordCount: changes.length,
  removedDuplicateCount: changes.reduce((sum, item) => sum + item.before.length - item.after.length, 0),
  changes
};

console.log(JSON.stringify(report, null, 2));
if (write) {
  fs.writeFileSync(dataPath, `window.UN_DATABASE = ${JSON.stringify(records)};\n`, "utf8");
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  console.log(`Updated ${path.relative(rootDir, dataPath)}`);
  console.log(`Created ${path.relative(rootDir, reportPath)}`);
}
