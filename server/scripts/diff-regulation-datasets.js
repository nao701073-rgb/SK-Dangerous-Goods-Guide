import fs from 'node:fs';
import crypto from 'node:crypto';

const [baselinePath, nextPath, keyArg = 'id'] = process.argv.slice(2);
if (!baselinePath || !nextPath) {
  console.error('Usage: node scripts/diff-regulation-datasets.js <baseline.json> <next.json> [recordKey]');
  process.exit(2);
}
const load = path => {
  const value = JSON.parse(fs.readFileSync(path, 'utf8'));
  const records = Array.isArray(value) ? value : value.records;
  if (!Array.isArray(records)) throw new Error(`${path}: array or records array is required`);
  return records;
};
const stable = value => {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
};
const hash = value => crypto.createHash('sha256').update(stable(value)).digest('hex');
const baseline = load(baselinePath), next = load(nextPath);
const getKey = (item, i) => String(item?.[keyArg] ?? item?.unNumber ?? item?.code ?? item?.id ?? i);
const a = new Map(baseline.map((v,i)=>[getKey(v,i),v]));
const b = new Map(next.map((v,i)=>[getKey(v,i),v]));
const added=[], changed=[], deleted=[];
for (const [id,value] of b) { if (!a.has(id)) added.push(id); else if (hash(a.get(id)) !== hash(value)) changed.push(id); }
for (const id of a.keys()) if (!b.has(id)) deleted.push(id);
const result={recordKey:keyArg,baselineCount:a.size,nextCount:b.size,addedCount:added.length,changedCount:changed.length,deletedCount:deleted.length,added,changed,deleted};
console.log(JSON.stringify(result,null,2));
process.exitCode = deleted.length ? 1 : 0;
