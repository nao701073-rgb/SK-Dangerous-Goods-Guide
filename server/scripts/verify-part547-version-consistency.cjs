const fs=require('fs');
const path=require('path');
const root=path.resolve(__dirname,'../..');
const walk=(dir)=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const html=walk(root).filter(f=>f.endsWith('.html')&&!f.includes(path.sep+'node_modules'+path.sep));
const checks=[];
const check=(name,fn)=>{try{fn();checks.push({name,status:'passed'});}catch(e){checks.push({name,status:'failed',message:e.message});}};
const assert=(v,m)=>{if(!v)throw new Error(m)};
check('HTML count',()=>assert(html.length===73,`expected 73, got ${html.length}`));
for(const file of html){
  const rel=path.relative(root,file).replace(/\\/g,'/');
  const text=fs.readFileSync(file,'utf8');
  check(`${rel}: sk-build part547`,()=>assert(/<meta\b[^>]*name=["']sk-build["'][^>]*content=["']part547["']|<meta\b[^>]*content=["']part547["'][^>]*name=["']sk-build["']/.test(text),'sk-build not part547'));
  check(`${rel}: build manifest cache key`,()=>assert(/build-manifest\.js\?v=547/.test(text),'build-manifest cache key not 547'));
  if(text.includes('version-guard.js')) check(`${rel}: version guard cache key`,()=>assert(/version-guard\.js\?v=547/.test(text),'version-guard cache key not 547'));
}
const manifest=fs.readFileSync(path.join(root,'data/build-manifest.js'),'utf8');
check('system build manifest part547',()=>assert(/version:\s*"part547",\s*part:\s*547/.test(manifest),'manifest not part547'));
const guard=fs.readFileSync(path.join(root,'assets/js/version-guard.js'),'utf8');
check('version guard one-time retry',()=>assert(guard.includes('sessionStorage')&&guard.includes('sk-version-reload:'),'retry state missing'));
check('version guard cache bust',()=>assert(guard.includes('__skv')&&guard.includes('__skt'),'cache-bust params missing'));
check('warning retained after retry',()=>assert(guard.includes('更新ファイルの適用状況を確認してください'),'real mismatch warning missing'));
const failed=checks.filter(c=>c.status==='failed');
const report={release:'part547',generatedAt:new Date().toISOString(),passed:checks.length-failed.length,total:checks.length,failed:failed.length,htmlCount:html.length,checks};
if(process.env.SKDG_WRITE_REPORT==='1')fs.writeFileSync(path.join(root,'docs/part547_版整合性検証レポート.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.failed,htmlCount:html.length}));
if(failed.length)process.exit(1);
