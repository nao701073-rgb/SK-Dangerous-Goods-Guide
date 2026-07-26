import fs from "node:fs";
const [file, regulationId, asOf] = process.argv.slice(2);
if (!file || !regulationId || !asOf) { console.error("Usage: node resolve-regulation-version.js registry.json regulationId YYYY-MM-DD"); process.exit(1); }
const raw=JSON.parse(fs.readFileSync(file,"utf8")); const revisions=raw.revisions||raw;
const hits=revisions.filter(r=>r.regulationId===regulationId && r.effectiveFrom && r.effectiveFrom<=asOf && (!r.effectiveTo||r.effectiveTo>=asOf) && ["approved","published","superseded"].includes(r.status));
if(hits.length!==1){ console.error(hits.length?`ERROR: ${hits.length} overlapping versions`:`ERROR: no applicable version`); process.exit(2);}
console.log(JSON.stringify(hits[0],null,2));
