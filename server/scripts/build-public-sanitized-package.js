import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const args=Object.fromEntries(process.argv.slice(2).map((v,i,a)=>v.startsWith('--')?[v.slice(2),a[i+1]&&!a[i+1].startsWith('--')?a[i+1]:true]:null).filter(Boolean));
const scope=String(args.scope||'public-approved');
const output=path.resolve(args.output||path.join(root,'server/data/public-release',scope));
const dryRun=Boolean(args['dry-run']);
const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/publication-rights-catalog.json'),'utf8'));
let decisions={};
if(args.decisions){const raw=JSON.parse(fs.readFileSync(path.resolve(args.decisions),'utf8'));const items=Array.isArray(raw)?raw:(raw.items||[]);decisions=Object.fromEntries(items.map(x=>[x.assetKey||x.asset_key,x]));}
const catalogMap=new Map(catalog.items.map(x=>[x.filePath,x]));
const staticRoots=['index.html','pages','assets','data','database','images','references'];
const excludedTop=new Set(['server','tools','docs','schemas','templates','SHA256SUMS.txt','SHA256SUMS_PART507.txt','SHA256SUMS_PART508.txt']);
const report={release:'part509',scope,dryRun,generatedAt:new Date().toISOString(),included:[],excluded:[],metadataOnly:[],warnings:[]};
const canInclude=(rel,item)=>{
  if(!item)return {include:true,treatment:'full'};
  const decision=decisions[item.assetKey]||{};const status=decision.status||item.rightsStatus;const scopes=decision.allowedScopes||decision.allowed_scopes||item.allowedScopes||[];const treatment=decision.publicTreatment||decision.public_treatment||item.publicTreatment||'blocked';
  if(scope==='public-approved'){
    if(!['approved','metadata-only'].includes(status)||!scopes.includes('public-approved'))return {include:false,treatment:'blocked',reason:'外部公開の明示承認なし'};
    if(['metadata-only','external-link-only','blocked'].includes(treatment))return {include:false,treatment,reason:'バイナリ配布対象外'};
    return {include:true,treatment};
  }
  if(scope==='internal-authenticated'){
    if(!['approved','restricted','metadata-only'].includes(status)||!scopes.includes('internal-authenticated'))return {include:false,treatment:'blocked',reason:'社内利用承認なし'};
  }
  if(scope==='internal-restricted'){
    if(!['approved','restricted','metadata-only'].includes(status)||!scopes.some(x=>['internal-restricted','internal-authenticated'].includes(x)))return {include:false,treatment:'blocked',reason:'権限者利用承認なし'};
  }
  return {include:!['metadata-only','external-link-only','blocked'].includes(treatment),treatment};
};
const copy=(src,dst)=>{fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);};
const walk=(abs,rel='')=>{for(const entry of fs.readdirSync(abs,{withFileTypes:true})){const childRel=rel?`${rel}/${entry.name}`:entry.name;if(excludedTop.has(childRel))continue;const child=path.join(abs,entry.name);if(entry.isDirectory())walk(child,childRel);else{const item=catalogMap.get(childRel);const decision=canInclude(childRel,item);if(decision.include){report.included.push(childRel);if(!dryRun)copy(child,path.join(output,childRel));}else{report.excluded.push({path:childRel,reason:decision.reason||decision.treatment});if(['metadata-only','external-link-only'].includes(decision.treatment))report.metadataOnly.push({path:childRel,treatment:decision.treatment,asset:item});}}}};
if(!dryRun){fs.rmSync(output,{recursive:true,force:true});fs.mkdirSync(output,{recursive:true});}
for(const item of staticRoots){const abs=path.join(root,item);if(!fs.existsSync(abs))continue;if(fs.statSync(abs).isDirectory())walk(abs,item);else{report.included.push(item);if(!dryRun)copy(abs,path.join(output,item));}}
const manifest={scope,generatedAt:report.generatedAt,includedCount:report.included.length,excludedCount:report.excluded.length,metadataOnly:report.metadataOnly.map(x=>({path:x.path,treatment:x.treatment,displayLabel:x.asset?.displayLabel||path.basename(x.path),sourceUrl:(decisions[x.asset?.assetKey]||{}).sourceUrl||x.asset?.sourceUrl||''}))};
if(!dryRun){fs.writeFileSync(path.join(output,'publication-release-manifest.json'),JSON.stringify(manifest,null,2));}
const reportPath=path.join(root,`docs/part509_${scope}_公開パッケージ検証.json`);fs.writeFileSync(reportPath,JSON.stringify({...report,summary:{included:report.included.length,excluded:report.excluded.length,metadataOnly:report.metadataOnly.length}},null,2));console.log(JSON.stringify({output,dryRun,summary:{included:report.included.length,excluded:report.excluded.length,metadataOnly:report.metadataOnly.length},reportPath},null,2));
