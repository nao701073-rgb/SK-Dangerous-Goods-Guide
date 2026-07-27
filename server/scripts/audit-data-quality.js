import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(scriptDir, "../..");
const outputPath = path.join(rootDir, "docs/Part211_データ品質監査レポート.json");
const args = new Set(process.argv.slice(2));
const write = args.has("--write");
const strict = args.has("--strict");
const errors = [];
const warnings = [];
const findings = [];

function loadBrowserScript(relativePath) {
  const filename = path.join(rootDir, relativePath);
  const source = fs.readFileSync(filename, "utf8");
  const window = {};
  vm.runInNewContext(source, { window, console }, { filename, timeout: 20000 });
  return { window, filename, source };
}
function hash(source) { return crypto.createHash("sha256").update(source).digest("hex"); }
function add(severity, category, message, context={}) {
  const item={severity, category, message, ...context}; findings.push(item);
  (severity === "error" ? errors : warnings).push(item);
}
function cleanArray(values) { return Array.isArray(values) ? values.map(v=>String(v).trim()).filter(Boolean) : []; }
function duplicates(values) { const seen=new Set(); return [...new Set(values.filter(v=>seen.has(v) || !seen.add(v)))]; }
function validCodeList(text, prefix) {
  if (!text || text === "-") return [];
  return String(text).split(/[\s,、]+/).map(v=>v.trim()).filter(v=>v.startsWith(prefix));
}

const unLoaded = loadBrowserScript("data/un-data.js");
const records = unLoaded.window.UN_DATABASE;
if (!Array.isArray(records)) throw new Error("UN_DATABASE must be an array");
const sourceLocations=new Map();
const exactRecords=new Map();
const unCounts=new Map();
const classPattern=/^(1(?:\.[1-6])?|2(?:\.[123])?|3|4(?:\.[123])?|5(?:\.[12])?|6(?:\.[12])?|7|8|9)$/;

records.forEach((record,index)=>{
  const id=`UN_DATABASE[${index}]`;
  const context={index,unNumber:record?.unNumber,sourcePage:record?.sourcePage,sourceRow:record?.sourceRow};
  if (!record || typeof record !== "object" || Array.isArray(record)) { add("error","record-shape","Record must be an object",context); return; }
  for (const key of ["unNumber","properShippingNameJa","properShippingName","classification","class","source"]) {
    if (typeof record[key] !== "string" || !record[key].trim()) add("error","required-field",`${key} is empty`,context);
  }
  if (!/^\d{4}$/.test(record.unNumber || "")) add("error","un-number","UN number must contain four digits",context);
  if (!classPattern.test(String(record.class||"").trim()) && !(record.unNumber === "0190" && String(record.class).trim() === "x")) add("warning","class-format",`Class format requires review: ${record.class}`,context);
  if (!Number.isInteger(record.sourcePage) || record.sourcePage < 1 || !Number.isInteger(record.sourceRow) || record.sourceRow < 1) add("error","source-location","Source page/row is invalid",context);
  const location=`${record.sourcePage}:${record.sourceRow}`;
  if (sourceLocations.has(location)) add("error","duplicate-source",`Source location duplicates record ${sourceLocations.get(location)}`,context); else sourceLocations.set(location,index);
  const exactKey=[record.unNumber,record.properShippingNameJa,record.properShippingName,record.class,record.packingGroup,record.sourcePage,record.sourceRow].join("|");
  if (exactRecords.has(exactKey)) add("error","duplicate-record",`Exact record duplicates record ${exactRecords.get(exactKey)}`,context); else exactRecords.set(exactKey,index);
  unCounts.set(record.unNumber,(unCounts.get(record.unNumber)||0)+1);
  for (const [field,values] of [["specialProvisions",record.specialProvisions],["labels",record.labels]]) {
    if (!Array.isArray(values)) { add("error","array-shape",`${field} must be an array`,context); continue; }
    const dup=duplicates(cleanArray(values)); if (dup.length) add("warning",`duplicate-${field}`,`${field} contains duplicates: ${dup.join(", ")}`,context);
  }
  const badSp=cleanArray(record.specialProvisions).filter(v=>!/^\d{1,4}$/.test(v.replace(/^SP/i,"")));
  if (badSp.length) add("warning","sp-format",`SP format requires review: ${badSp.join(", ")}`,context);
  const bulkCodes = String(record.flexibleBulkContainer || "-").split(/[\s,、/]+/).filter(v=>v && v !== "-");
  const badBulk = bulkCodes.filter(v=>!/^BK\d+$/.test(v));
  if (badBulk.length) add("warning","bulk-format",`B/BK format requires review: ${badBulk.join(", ")}`,context);
  const bulkDup=duplicates(bulkCodes); if (bulkDup.length) add("warning","duplicate-bulk",`B/BK contains duplicates: ${bulkDup.join(", ")}`,context);
  const sw=validCodeList(record.stowage,"SW").filter(v=>!/^SW\d+[A-Z]?$/.test(v));
  if (sw.length) add("warning","sw-format",`SW format requires review: ${sw.join(", ")}`,context);
  const sg=String(record.segregation||"").split(/[\s,、]+/).filter(Boolean).filter(v=>/^(SG|SGG)/.test(v) && !/^(SG\d+[A-Z]?|SGG\d+[A-Z]?)$/.test(v));
  if (sg.length) add("warning","segregation-format",`SG/SGG format requires review: ${sg.join(", ")}`,context);
  if (typeof record.marinePollutant !== "boolean") add("error","type","marinePollutant must be boolean",context);
});

const orgLoaded=loadBrowserScript("data/organization-master.js");
const master=orgLoaded.window.ISSOrganizationMaster;
if (!master || !Array.isArray(master.blocks)) add("error","organization-master","Organization master is invalid");
else {
  const ids=new Set(), codes=new Set();
  const addUnique=(value,type,label)=>{ if(!value) add("error","organization-master",`${label} ${type} is empty`); else if((type==="id"?ids:codes).has(value)) add("error","organization-master",`Duplicate ${type}: ${value}`); else (type==="id"?ids:codes).add(value); };
  if (master.headquarters) addUnique(master.headquarters.id,"id","headquarters");
  master.blocks.forEach((block,bi)=>{ addUnique(block.id,"id",`block[${bi}]`); addUnique(block.code,"code",`block[${bi}]`); (block.offices||[]).forEach((office,oi)=>{addUnique(office.id,"id",`office[${bi}:${oi}]`);addUnique(office.code,"code",`office[${bi}:${oi}]`);}); });
}

const categoryCounts=findings.reduce((o,f)=>{o[f.category]=(o[f.category]||0)+1;return o;},{});
const report={
  schemaVersion:1,
  generatedAt:new Date().toISOString(),
  systemPart:211,
  releaseDecision: errors.length ? "blocked" : warnings.length ? "review-required" : "pass",
  summary:{recordCount:records.length,uniqueUnCount:unCounts.size,multipleEntryUnCount:[...unCounts.values()].filter(v=>v>1).length,errorCount:errors.length,warningCount:warnings.length},
  categoryCounts,
  fileHashes:{"data/un-data.js":hash(unLoaded.source),"data/organization-master.js":hash(orgLoaded.source)},
  findings
};
console.log(JSON.stringify(report,null,2));
if(write) { fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+"\n","utf8"); console.error(`Created ${path.relative(rootDir,outputPath)}`); }
if(errors.length || (strict && warnings.length)) process.exitCode=1;
