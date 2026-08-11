from pathlib import Path
from urllib.parse import urlsplit
from bs4 import BeautifulSoup
import json,re,subprocess,sys,concurrent.futures
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
OUT=ROOT/'docs'/'verification'/'v1.3.103';OUT.mkdir(parents=True,exist_ok=True)
all_files=[p for p in ROOT.rglob('*') if p.is_file() and '.git' not in p.parts]
code=[p for p in all_files if p.suffix.lower() in {'.js','.mjs','.cjs'}]
jsons=[p for p in all_files if p.suffix.lower()=='.json']
htmls=[p for p in all_files if p.suffix.lower() in {'.html','.htm'}]
csss=[p for p in all_files if p.suffix.lower()=='.css']

def nodecheck(p):
    cp=subprocess.run(['node','--check',str(p)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    return None if cp.returncode==0 else {'file':str(p.relative_to(ROOT)),'error':cp.stderr[-1200:]}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as ex:
    syntax=[x for x in ex.map(nodecheck,code) if x]
json_err=[]
for p in jsons:
    try: json.loads(p.read_text(encoding='utf-8'))
    except Exception as e: json_err.append({'file':str(p.relative_to(ROOT)),'error':str(e)})

def local_target(base,raw):
    if not raw or raw.startswith(('#','data:','javascript:','mailto:','tel:','blob:','http://','https://','//')):return None
    u=urlsplit(raw).path
    if not u:return None
    # Ignore app API/router endpoints with no static extension.
    if u.startswith('/'):
        # root-relative static resource only if its suffix is file-like
        q=(ROOT/u.lstrip('/')).resolve()
    else:q=(base/u).resolve()
    try:q.relative_to(ROOT)
    except Exception:return None
    return q
html_refs=0;html_missing=[]
attrs={'script':['src'],'link':['href'],'img':['src'],'source':['src'],'a':['href'],'iframe':['src'],'object':['data']}
for p in htmls:
    try:soup=BeautifulSoup(p.read_text(encoding='utf-8',errors='replace'),'html.parser')
    except Exception:continue
    for tag,aa in attrs.items():
        for el in soup.find_all(tag):
            for a in aa:
                raw=el.get(a)
                q=local_target(p.parent,raw)
                if q is None:continue
                # Count/check likely static file references. Extensionless links are application routes, skip.
                if not q.suffix:continue
                html_refs+=1
                if not q.exists():html_missing.append({'file':str(p.relative_to(ROOT)),'ref':raw,'resolved':str(q.relative_to(ROOT)) if str(q).startswith(str(ROOT)) else str(q)})
css_refs=0;css_missing=[]
url_re=re.compile(r'url\(\s*["\']?([^"\')]+)')
for p in csss:
    txt=p.read_text(encoding='utf-8',errors='replace')
    for raw in url_re.findall(txt):
        q=local_target(p.parent,raw.strip())
        if q is None:continue
        css_refs+=1
        if not q.exists():css_missing.append({'file':str(p.relative_to(ROOT)),'ref':raw})
report={'files':len(all_files),'codeFiles':len(code),'jsonFiles':len(jsons),'jsonErrors':json_err,'htmlFiles':len(htmls),'htmlLocalRefs':html_refs,'htmlMissing':html_missing,'cssFiles':len(csss),'cssLocalRefs':css_refs,'cssMissing':css_missing,'codeSyntaxErrors':len(syntax),'codeSyntaxErrorDetails':syntax}
report['pass']=not(any([syntax,json_err,html_missing,css_missing]))
(OUT/'v13103_full_audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
log=[f"files={report['files']}",f"code={len(code)} syntax_errors={len(syntax)}",f"json={len(jsons)} parse_errors={len(json_err)}",f"html={len(htmls)} refs={html_refs} missing={len(html_missing)}",f"css={len(csss)} refs={css_refs} missing={len(css_missing)}",'PASS' if report['pass'] else 'FAIL']
(OUT/'v13103_full_audit.log').write_text('\n'.join(log)+'\n',encoding='utf-8')
print('\n'.join(log))
if not report['pass']:sys.exit(1)
