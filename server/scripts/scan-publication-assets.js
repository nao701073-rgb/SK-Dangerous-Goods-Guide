import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const roots=[
  'references',
  'assets/pdf-page-images',
  'assets/reference-images',
  'assets/domestic-law-pages',
  'assets/domestic-law-bundles',
  'database/reference',
  'database/references'
];
const mimeByExt={'.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.json':'application/json'};
const sha256=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel=file=>path.relative(root,file).split(path.sep).join('/');
const walk=dir=>fs.existsSync(dir)?fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]):[];

function classify(filePath){
  const p=filePath.toLowerCase();
  const isImdg=/imdg/.test(p);
  const isDomestic=/dangerous-goods-(regulations|notification)|radioactive-materials-notification|domestic-law|notification-article|regulation-article/.test(p);
  const isCtu=/ctu/.test(p);
  const isMarpol=/marpol/.test(p);
  const isAi=/\/ai-|ai-summaries/.test(p);
  const isOriginal=/^references\/originals\//.test(p);
  const isExcerpt=/^references\/excerpts\//.test(p);
  if(isImdg) return {
    assetCategory:isOriginal?'原典PDF':isExcerpt?'抜粋PDF':'原典ページ画像',
    sourceClass:'licensed-international-code',
    rightsStatus:'unreviewed',
    recommendedScope:'internal-restricted',
    publicTreatment:'metadata-only',
    riskLevel:'high',
    reason:'IMDG Code等の国際規則資料。契約・利用条件の確認が完了するまで公開配布しない。'
  };
  if(isCtu||isMarpol) return {
    assetCategory:isOriginal?'原典PDF':isExcerpt?'抜粋PDF':'参考画像',
    sourceClass:'international-guidance',
    rightsStatus:'unreviewed',
    recommendedScope:'internal-authenticated',
    publicTreatment:'external-link-only',
    riskLevel:'medium',
    reason:'国際機関等の資料。公式公開条件、転載条件および社内利用条件を確認する。'
  };
  if(isDomestic) return {
    assetCategory:isOriginal?'国内法令原典':isExcerpt?'国内法令抜粋':'国内法令表示画像',
    sourceClass:'official-domestic-law',
    rightsStatus:'unreviewed',
    recommendedScope:'internal-authenticated',
    publicTreatment:'external-link-only',
    riskLevel:'medium',
    reason:'法令本文と、提供元PDFの編集・レイアウト・画像利用条件を分けて確認する。'
  };
  if(isAi) return {
    assetCategory:'整理情報・AI要約',
    sourceClass:'internal-created-source-dependent',
    rightsStatus:'unreviewed',
    recommendedScope:'internal-authenticated',
    publicTreatment:'blocked',
    riskLevel:'medium',
    reason:'協会内で作成した整理情報。根拠原典、引用範囲、正確性および公開可否を確認する。'
  };
  return {
    assetCategory:isOriginal?'参考資料原典':isExcerpt?'参考資料抜粋':'参考資料画像',
    sourceClass:'third-party-or-unknown',
    rightsStatus:'unreviewed',
    recommendedScope:'internal-restricted',
    publicTreatment:'blocked',
    riskLevel:'high',
    reason:'権利者・利用条件が未確定。確認が完了するまで外部公開しない。'
  };
}

const files=roots.flatMap(dir=>walk(path.join(root,dir))).filter(file=>fs.statSync(file).isFile()).sort();
const items=files.map(file=>{
  const filePath=rel(file);const stat=fs.statSync(file);const info=classify(filePath);
  return {
    assetKey:`asset:${filePath}`,
    filePath,
    displayLabel:path.basename(filePath),
    fileSize:stat.size,
    mimeType:mimeByExt[path.extname(file).toLowerCase()]||'application/octet-stream',
    checksumSha256:sha256(file),
    ...info,
    allowedScopes:[],
    rightsHolder:'',
    rightsBasis:'',
    licenseReference:'',
    sourceUrl:'',
    attributionText:'',
    reviewNote:'',
    catalogedAt:new Date().toISOString()
  };
});
const summary=items.reduce((acc,item)=>{acc.total++;acc.byClass[item.sourceClass]=(acc.byClass[item.sourceClass]||0)+1;acc.byRisk[item.riskLevel]=(acc.byRisk[item.riskLevel]||0)+1;acc.totalBytes+=item.fileSize;return acc;},{total:0,totalBytes:0,byClass:{},byRisk:{}});
const catalog={release:'part509',generatedAt:new Date().toISOString(),root:'content-assets',summary,items};
fs.writeFileSync(path.join(root,'data/publication-rights-catalog.json'),JSON.stringify(catalog,null,2));
console.log(JSON.stringify(summary,null,2));
