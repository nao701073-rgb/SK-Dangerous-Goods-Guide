// SKDG R65 v43: fail-closed STATIC webroot packager. REVIEW ONLY until rights and ITDX approval.
// Unlisted files and catalog defaults NEVER grant publication rights.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = {};
for (let i = 2; i < process.argv.length; ++i) {
  const key = process.argv[i];
  if (!key.startsWith('--') || !['--decisions','--output','--scope','--dry-run'].includes(key) || key in args) throw new Error(`Invalid/duplicate argument: ${key}`);
  if (key === '--dry-run') args[key] = true;
  else { if (!process.argv[i+1] || process.argv[i+1].startsWith('--')) throw new Error(`Missing ${key} argument`); args[key] = process.argv[++i]; }
}
if ((args['--scope'] || 'public-approved') !== 'public-approved') throw new Error('AUTHENTICATED_STATIC_WEBROOT_NOT_SUPPORTED: only public-approved; protect all internal content with separately approved authentication');
const dry = Boolean(args['--dry-run']);
if (!dry && (!args['--decisions'] || !args['--output'])) throw new Error('EXPLICIT_DECISIONS_AND_OUTPUT_REQUIRED');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex').toUpperCase();
const validPath = s => typeof s === 'string' && s.length > 0 && !s.includes('\\') && !s.startsWith('/') && !s.includes('//') && !s.split('/').some(x => x === '' || x === '.' || x === '..') && !/\0/.test(s);
const forbidden = rel => !validPath(rel) || rel.split('/').some(s => s.startsWith('.')) || /(^|\/)(server|tools|docs|database|references|schemas|backups|node_modules)(\/|$)/i.test(rel) || /(?:^|\/)(?:publication-rights-catalog|system-file-manifest)\.json$/i.test(rel);
const allowedExt = new Set(['.html','.js','.css','.json','.png','.jpg','.jpeg','.webp','.gif','.ico','.woff','.woff2']);
const staticRoots = ['index.html','assets','pages','images','data'];
const candidates = new Map();
function scan(abs, rel) {
  const st = fs.lstatSync(abs);
  if (st.isSymbolicLink()) throw new Error('SYMLINK_IN_WEB_SOURCE: '+rel);
  if (st.isDirectory()) { for (const name of fs.readdirSync(abs).sort()) scan(path.join(abs,name),rel ? rel+'/'+name : name); return; }
  if (!st.isFile()) throw new Error('NONREGULAR_WEB_SOURCE: '+rel);
  if (forbidden(rel) || !allowedExt.has(path.extname(rel).toLowerCase())) return;
  const bytes = fs.readFileSync(abs);
  candidates.set(rel,{abs,sha256:sha(bytes),size:bytes.length});
}
for (const name of staticRoots) { const p=path.join(root,name); if(fs.existsSync(p)) scan(p,name); }
let items=[];
if (args['--decisions']) {
  const data=JSON.parse(fs.readFileSync(path.resolve(args['--decisions']),'utf8'));
  items=Array.isArray(data)?data:data?.items;
  if (!Array.isArray(items)) throw new Error('DECISIONS_MUST_BE_ARRAY_OR_ITEMS_ARRAY');
}
const authorized=new Map(); const errors=[]; const seen=new Set();
for (const entry of items) {
  const rel=entry?.path; if (!validPath(rel) || seen.has(rel)) { errors.push('INVALID_OR_DUPLICATE_DECISION_PATH: '+rel); continue; }
  seen.add(rel);
  const actual=candidates.get(rel);
  if (!actual) { errors.push('DECISION_FILE_NOT_ELIGIBLE: '+rel); continue; }
  if (entry.status !== 'approved') continue; // denied / pending are never packaged
  const reviewer=String(entry.reviewedBy||'').trim(); const approver=String(entry.approvedBy||'').trim();
  const rights=String(entry.rightsBasis||'').trim(); const stamp=String(entry.approvedAt||'').trim();
  if (entry.publicTreatment !== 'full' || !Array.isArray(entry.allowedScopes) || !entry.allowedScopes.includes('public-approved') ||
      reviewer.length < 2 || approver.length < 2 || reviewer === approver || rights.length < 3 ||
      !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(stamp) || !Number.isFinite(Date.parse(stamp)) ||
      !/^[A-Fa-f0-9]{64}$/.test(String(entry.sha256||'')) || String(entry.sha256).toUpperCase()!==actual.sha256) {
    errors.push('APPROVAL_INCOMPLETE_OR_SHA_MISMATCH: '+rel); continue;
  }
  authorized.set(rel,actual);
}
// Browser shell cannot be released without its minimum entrypoints.
for (const rel of ['index.html','data/build-manifest.js']) if (!authorized.has(rel)) errors.push('REQUIRED_ENTRYPOINT_NOT_APPROVED: '+rel);
if (![...authorized].some(([x])=>x.startsWith('assets/'))) errors.push('APP_ASSETS_NOT_APPROVED');
if (![...authorized].some(([x])=>x.startsWith('pages/'))) errors.push('APP_PAGES_NOT_APPROVED');
// Warn/fail when an included HTML page references a local asset that is not approved.
const refErrors=[];
for (const [rel,item] of authorized) if (rel.endsWith('.html')) {
  const html=fs.readFileSync(item.abs,'utf8');
  const re=/\b(?:href|src)\s*=\s*["']([^"']+)["']/ig; let m;
  while ((m=re.exec(html))) {
    const raw=m[1].trim();
    if (!raw || /^(?:#|https?:|mailto:|tel:|data:|blob:|javascript:|\/\/|\{)/i.test(raw)) continue;
    let base=raw.split(/[?#]/)[0]; if (!base || /\{/.test(base)) continue;
    try { base=decodeURIComponent(base); } catch { refErrors.push(rel+': BAD_URL_ENCODING'); continue; }
    if (base.startsWith('/api/')) continue;
    const target=path.posix.normalize(base.startsWith('/')?base.slice(1):path.posix.join(path.posix.dirname(rel),base));
    if (target==='.' || target==='') continue;
    if (target.startsWith('../') || forbidden(target) || !authorized.has(target)) refErrors.push(`${rel}: ${raw} => ${target}`);
  }
}
if (refErrors.length) errors.push('BROKEN_OR_UNAPPROVED_HTML_REFERENCES: '+refErrors.length);
const report={result:errors.length?'BLOCKED':'APPROVED_FILE_SET_STATIC_CHECK_PASS',dryRun:dry,scope:'public-approved',release:'v43_WEB_GATED',
  candidateCount:candidates.size,decisionCount:seen.size,approvedFiles:authorized.size,unapprovedFiles:candidates.size-authorized.size,
  errors,referenceErrors:refErrors.slice(0,75),files:[...authorized].sort(([a],[b])=>a.localeCompare(b)).map(([p,x])=>({path:p,sha256:x.sha256,bytes:x.size})),
  authorizationNote:'STATIC_CHECK_ONLY; rights approvals and source review are human actions; authentication, real browser, and production are NOT tested'};
// Never exit immediately after an async stdout write: large review reports may be truncated.
if (errors.length || dry) {
  process.stdout.write(JSON.stringify(report,null,2)+'\n');
  process.exitCode = errors.length ? 2 : 0;
} else {
const outputArg=args['--output'];
if (!path.isAbsolute(outputArg)) throw new Error('OUTPUT_MUST_BE_ABSOLUTE_PATH');
const output=path.resolve(outputArg); const src=fs.realpathSync(root);
const inside=(p,a)=>p===a || p.startsWith(a+path.sep);
if (inside(output,src) || inside(src,output)) throw new Error('OUTPUT_OVERLAPS_PROJECT');
if (fs.existsSync(output)) throw new Error('OUTPUT_MUST_NOT_EXIST');
const parent=fs.realpathSync(path.dirname(output));
if (inside(parent,src)) throw new Error('OUTPUT_PARENT_OVERLAPS_PROJECT');
if (!fs.statSync(parent).isDirectory()) throw new Error('OUTPUT_PARENT_NOT_DIRECTORY');
const temp=fs.mkdtempSync(path.join(parent,'.skdg-webroot-temp-'));
try {
  for (const [rel,x] of authorized) {
    const dest=path.join(temp,...rel.split('/'));
    fs.mkdirSync(path.dirname(dest),{recursive:true});
    const bytes=fs.readFileSync(x.abs);
    if (sha(bytes)!==x.sha256) throw new Error('SOURCE_CHANGED_DURING_COPY: '+rel);
    fs.writeFileSync(dest,bytes,{flag:'wx'});
  }
  fs.renameSync(temp,output);
  console.log(JSON.stringify({...report,output,productionCutover:'NO',companyIdPMFA:'DEFERRED'},null,2));
} catch(e) { fs.rmSync(temp,{recursive:true,force:true}); throw e; }
}
