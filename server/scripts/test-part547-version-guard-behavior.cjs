const fs=require('fs');
const vm=require('vm');
const path=require('path');
const code=fs.readFileSync(path.resolve(__dirname,'../../assets/js/version-guard.js'),'utf8');
function storage(seed={}){const m=new Map(Object.entries(seed));return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]||null,get length(){return m.size}}}
function run(meta,manifest,seed={},url='https://example.test/index.html'){
  const prepended=[];let replaced='';let history='';const ss=storage(seed);
  const document={
    querySelector:()=>({content:meta}),
    createElement:()=>({className:'',setAttribute(){},textContent:''}),
    body:{prepend:n=>prepended.push(n)}
  };
  const window={
    SK_BUILD_MANIFEST:{version:manifest},
    location:{href:url,replace:u=>{replaced=u}},
    history:{replaceState:(_a,_b,u)=>{history=u}},
    __SK_ASSET_BUILD__:{},
  };
  const ctx={window,document,sessionStorage:ss,URL,Date,Object};
  vm.createContext(ctx);vm.runInContext(code,ctx);
  return {prepended,replaced,history,ss};
}
const tests=[];const ok=(name,cond)=>{tests.push({name,status:cond?'passed':'failed'});if(!cond)console.error('FAIL',name)};
let r=run('part547','part547');
ok('match has no warning',r.prepended.length===0);
ok('match has no reload',!r.replaced);
r=run('part546','part547');
ok('first mismatch auto reloads',r.replaced.includes('__skv=part547')&&r.replaced.includes('__skt='));
ok('first mismatch no warning',r.prepended.length===0);
r=run('part546','part547',{'sk-version-reload:part546:part547':'1'});
ok('second mismatch no auto reload',!r.replaced);
ok('second mismatch warns',r.prepended.length===1&&r.prepended[0].textContent.includes('更新ファイルの適用状況を確認してください'));
r=run('part547','part547',{},'https://example.test/index.html?__skv=part547&__skt=123&x=1');
ok('matching page cleans cache params',r.history.includes('x=1')&&!r.history.includes('__skv')&&!r.history.includes('__skt'));
const failed=tests.filter(x=>x.status==='failed');
const report={release:'part547-version-guard-behavior',generatedAt:new Date().toISOString(),passed:tests.length-failed.length,total:tests.length,failed:failed.length,tests};
if(process.env.SKDG_WRITE_REPORT==='1')fs.writeFileSync(path.resolve(__dirname,'../../docs/part547_版チェック動作検証.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({passed:report.passed,total:report.total,failed:report.failed}));
if(failed.length)process.exit(1);
