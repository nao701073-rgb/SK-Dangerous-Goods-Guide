import fs from "node:fs";
import vm from "node:vm";
import path from "node:path";
import crypto from "node:crypto";

const [oldFile,newFile,outputFile] = process.argv.slice(2);
if(!oldFile || !newFile){ console.error("Usage: node scripts/compare-un-datasets.js <old-un-data.js> <new-un-data.js> [report.json]"); process.exit(2); }
function load(file){const source=fs.readFileSync(file,"utf8");const window={};vm.runInNewContext(source,{window,console},{filename:file,timeout:20000});if(!Array.isArray(window.UN_DATABASE))throw new Error(`${file}: UN_DATABASE not found`);return {records:window.UN_DATABASE,hash:crypto.createHash("sha256").update(source).digest("hex")};}
function key(r){return [r.unNumber,r.properShippingNameJa,r.properShippingName,r.sourcePage,r.sourceRow].join("|");}
function stable(r){const copy={...r};delete copy.rawText;return JSON.stringify(copy);}
const oldData=load(path.resolve(oldFile)), newData=load(path.resolve(newFile));
const oldMap=new Map(oldData.records.map(r=>[key(r),r])), newMap=new Map(newData.records.map(r=>[key(r),r]));
const added=[],removed=[],changed=[];
for(const [k,r] of newMap){if(!oldMap.has(k)) added.push({key:k,record:r}); else if(stable(oldMap.get(k))!==stable(r)) changed.push({key:k,before:oldMap.get(k),after:r});}
for(const [k,r] of oldMap){if(!newMap.has(k)) removed.push({key:k,record:r});}
const report={generatedAt:new Date().toISOString(),old:{file:path.resolve(oldFile),hash:oldData.hash,count:oldData.records.length},new:{file:path.resolve(newFile),hash:newData.hash,count:newData.records.length},summary:{added:added.length,changed:changed.length,removed:removed.length},added,changed,removed};
const json=JSON.stringify(report,null,2)+"\n"; if(outputFile){fs.writeFileSync(path.resolve(outputFile),json,"utf8");console.log(`Created ${outputFile}`);} else console.log(json);
