from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
import json, re, sys

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
PAGE=ROOT/'pages'/'ctu-securing-calculator.html'
OUT=ROOT/'docs'/'verification'/'v1.3.102'
OUT.mkdir(parents=True,exist_ok=True)
results={'errors':[]}

raw=PAGE.read_text(encoding='utf-8')
soup=BeautifulSoup(raw,'html.parser')

# Preserve exact stylesheet cascade order as separate Chromium stylesheets.
style_parts=[]
for tag in soup.find_all(['link','style']):
    if tag.name=='link' and 'stylesheet' in (tag.get('rel') or []):
        href=tag.get('href','')
        if href.startswith(('http://','https://')): continue
        path=(PAGE.parent/urlsplit(href).path).resolve()
        if path.exists(): style_parts.append((href,path.read_text(encoding='utf-8')))
    elif tag.name=='style': style_parts.append(('inline',tag.get_text()))

# Real calculation/layout runtime only; unrelated application/photo/navigation services are excluded.
ESSENTIAL=(
 'securing-msl-reference.js','ctu-code-rules-v1380.js','ctu-assessment-policy-v1381.js',
 'v1392-ctu-direction-tie-label.js','ctu-securing-calculator-core-v1398.js',
 'v1386-ctu-dual-use-toggle.js','v1377-ctu-bracing-path.js','v1376-ctu-friction-sync.js',
 'v1394-ctu-gap-wall-assist.js','v1386-ctu-sticky-status.js','v1372-ctu-canonical-guard.js',
 'v1375-ctu-confirm-all.js','v1395-ctu-wall-result-sync.js','v1398-ctu-layout-wall-sync.js',
 'v1398-ctu-usability.js','v13100-ctu-ui-consistency.js','v13101-ctu-print-state.js','v13102-ctu-expanded-print-state.js'
)
script_parts=[]
for tag in soup.find_all('script'):
    src=tag.get('src') or ''
    if src.startswith(('http://','https://')) or not any(x in src for x in ESSENTIAL): continue
    path=(PAGE.parent/urlsplit(src).path).resolve()
    if path.exists(): script_parts.append((src,path.read_text(encoding='utf-8')))

# Keep the actual page DOM, stripping only resource tags. Styles/scripts are inserted separately.
harness=re.sub(r'<link\b[^>]*rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*>', '', raw, flags=re.I)
harness=re.sub(r'<style\b[^>]*>.*?</style\s*>', '', harness, flags=re.I|re.S)
harness=re.sub(r'<script\b[^>]*>.*?</script\s*>', '', harness, flags=re.I|re.S)

bootstrap_js=r'''(() => {
  const makeStore=()=>{const m=new Map();return {getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}};
  const ls=makeStore(),ss=makeStore();
  Object.defineProperty(window,'localStorage',{value:ls,configurable:true}); Object.defineProperty(window,'sessionStorage',{value:ss,configurable:true});
  ls.setItem('iss-api-token','verification-token'); ss.setItem('iss-api-token','verification-token');
  ls.setItem('iss-api-user',JSON.stringify({id:'verify',name:'検証者',role:'admin',office:'川崎事業所'}));
  ls.removeItem('skdg.ctu.cardLayout.v1398');
  window.ISSAuthBridge={currentAuth:()=>({token:'verification-token',user:{id:'verify',name:'検証者',role:'admin',office:'川崎事業所'}}),restore:()=>({token:'verification-token'}),decorateAll:()=>{},withAuthFragment:u=>u,navigate:()=>{},refreshSessionClock:()=>{}};
  window.ISSStorage={listApplications:()=>[],getApplications:()=>[],updateApplication:()=>{},addPhoto:()=>({id:'verify-photo'})};
  window.ISSApplicationResults={list:()=>[],listApplications:()=>[],save:()=>({applicationYear:'2026',applicationNumber:'0000'}),createApplication:()=>({id:'verify-app',applicationYear:'2026',applicationNumber:'0000'})};
  window.XLSX={};
})();'''

(OUT/'v13100_harness_sources.json').write_text(json.dumps({
    'stylesheetCount':len(style_parts),'scriptCount':len(script_parts),
    'stylesheets':[x[0] for x in style_parts],'scripts':[x[0] for x in script_parts],
    'finalCssPresent':any('v13100-ctu-complete-visual-system.css' in x[0] for x in style_parts),
    'finalJsPresent':any('v13100-ctu-ui-consistency.js' in x[0] for x in script_parts),
},ensure_ascii=False,indent=2),encoding='utf-8')

def open_page(pw,width,height=1000,mobile=False,touch=False):
    browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage','--no-sandbox'])
    context=browser.new_context(viewport={'width':width,'height':height},is_mobile=mobile,has_touch=touch,device_scale_factor=1)
    page=context.new_page(); page.set_default_timeout(5000)
    page.on('pageerror',lambda exc: results['errors'].append('pageerror:'+str(exc)))
    page.set_content(harness,wait_until='domcontentloaded',timeout=15000)
    page.add_script_tag(content=bootstrap_js)
    for _,content in style_parts: page.add_style_tag(content=content)
    for _,content in script_parts: page.add_script_tag(content=content)
    page.evaluate("document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true})); window.dispatchEvent(new Event('DOMContentLoaded'));")
    page.wait_for_timeout(500)
    return browser,context,page

def step_geometry(page):
    return page.evaluate("""() => {const o={};for(let n=1;n<=7;n++){const el=document.querySelector(`.ctu-numbered-step-card[data-ctu-step="${n}"]`);if(!el){o['s'+n]=null;continue}const r=el.getBoundingClientRect();o['s'+n]={x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),right:+r.right.toFixed(1),bottom:+r.bottom.toFixed(1)};}return o;}""")

def border_style(page,selector):
    return page.evaluate("""sel=>{const e=document.querySelector(sel);if(!e)return null;const s=getComputedStyle(e);return {bt:s.borderTopWidth,br:s.borderRightWidth,bb:s.borderBottomWidth,bl:s.borderLeftWidth,ct:s.borderTopColor,cr:s.borderRightColor,cb:s.borderBottomColor,cl:s.borderLeftColor,shadow:s.boxShadow,bg:s.backgroundColor}}""",selector)

def visual_audit(page):
    return page.evaluate("""() => {
      const rows=[];
      for(let n=1;n<=7;n++){
        const e=document.querySelector(`.ctu-numbered-step-card[data-ctu-step="${n}"]`); if(!e)continue;
        const s=getComputedStyle(e), b=[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth], c=[s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.borderLeftColor];
        const head=e.querySelector(':scope > .ctu-step-card__head,:scope > .quick-step__head');
        const body=e.querySelector(':scope > .quick-step__body,:scope > .ctu-step-card__body');
        let overlap=null,gap=null;
        if(head&&body){const hr=head.getBoundingClientRect(),br=body.getBoundingClientRect();gap=+(br.top-hr.bottom).toFixed(3);overlap=br.top < hr.bottom-0.25;}
        rows.push({step:n,borders:b,colors:c,symmetric:b.every(x=>x===b[0])&&c.every(x=>x===c[0]),shadow:s.boxShadow,overlap,gap});
      }
      const selectors=['#ctuPrimarySecuringPanel','#ctuSupportSecuringPanel','.v1394-wall-direction-card','.result-summary .metric','#overall'];
      const sub=[]; for(const sel of selectors){for(const e of document.querySelectorAll(sel)){const s=getComputedStyle(e),b=[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],c=[s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.borderLeftColor];sub.push({selector:sel,id:e.id||e.className,borders:b,colors:c,symmetric:b.every(x=>x===b[0])&&c.every(x=>x===c[0]),shadow:s.boxShadow});}}
      return {main:rows,sub,overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,innerWidth,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};
    }""")

def same_border(s):
    return bool(s) and len({s[k] for k in ('bt','br','bb','bl')})==1 and len({s[k] for k in ('ct','cr','cb','cl')})==1

def setval(page,sel,val,event='input'):
    page.evaluate("""([sel,val,event])=>{const e=document.querySelector(sel);if(!e)throw new Error('missing '+sel);e.value=String(val);e.dispatchEvent(new Event(event,{bubbles:true}));}""",[sel,val,event])

def setcheck(page,sel,checked):
    page.evaluate("""([sel,checked])=>{const e=document.querySelector(sel);if(!e)throw new Error('missing '+sel);e.checked=Boolean(checked);e.dispatchEvent(new Event('change',{bubbles:true}));}""",[sel,checked])

with sync_playwright() as pw:
    b,c,p=open_page(pw,1720,1100)
    p.locator('#ctuLayoutTwo').click(force=True); p.wait_for_timeout(250)

    # Same verified calculation scenario, while remaining in two-column mode.
    setval(p,'#quickTransport','seaA','change'); setval(p,'#quickCtu','container','change'); setval(p,'#quickMass','8.559')
    setval(p,'#quickFriction','unknown','change'); setval(p,'#quickMu','0.20')
    if p.locator('#quickUseTensile').count(): setcheck(p,'#quickUseTensile',True)
    if p.locator('#quickUseSupport').count(): setcheck(p,'#quickUseSupport',False)
    setval(p,'#quickMethod','direct','change'); setval(p,'#quickDirection','rear','change'); setval(p,'#quickCount','4')
    setval(p,'#quickStrength','12.1'); setval(p,'#quickCargoMsl','20'); setval(p,'#quickCtuMsl','10'); setval(p,'#quickAngle','17')
    if p.locator('#quickBasis').count(): setval(p,'#quickBasis','manufacturer verified')
    setval(p,'#wallCtuPresetQuick','container','change'); setval(p,'#wallPayloadQuick','28')
    p.wait_for_timeout(200)
    for sid in ['#wallUseForward','#wallUseLeft','#wallUseRight']:
        if p.locator(sid).count(): setcheck(p,sid,True)
    if p.locator('#wallUseRear').count(): setcheck(p,'#wallUseRear',False)
    p.wait_for_timeout(200); p.locator('#quickCalcBtn').click(force=True); p.wait_for_timeout(600)

    out=ROOT/'docs'/'verification'/'v1.3.102'; out.mkdir(parents=True,exist_ok=True)
    p.emulate_media(media='print')
    if p.evaluate("typeof window.SKDG_CTU_PRINT_SYNC_V13101 === 'function'"):
        p.evaluate("window.SKDG_CTU_PRINT_SYNC_V13101()")
    p.wait_for_timeout(120)

    audit=p.evaluate("""() => {
      const disp=s=>{const e=document.querySelector(s); return e?getComputedStyle(e).display:null};
      const sty=s=>{const e=document.querySelector(s); if(!e)return null; const c=getComputedStyle(e); return {display:c.display,breakBefore:c.breakBefore,breakInside:c.breakInside,grid:c.gridTemplateColumns,borders:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],shadow:c.boxShadow}};
      const cardRows=[];
      for(let n=1;n<=7;n++){const e=document.querySelector(`[data-ctu-step="${n}"]`);if(!e)continue;const c=getComputedStyle(e);cardRows.push({step:n,display:c.display,breakBefore:c.breakBefore,borders:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],shadow:c.boxShadow});}
      const wall=[...document.querySelectorAll('.v1394-wall-direction-card')].map(e=>{const c=getComputedStyle(e);return {display:c.display,borders:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],shadow:c.boxShadow}});
      return {
        classes:[...document.body.classList],
        headerDisplay:disp('.sk-v1338-header'), stickyDisplay:disp('#ctuStickyStatus'), toolbarDisplay:disp('#ctuLayoutToolbar'), commonCaseDisplay:disp('#ctuCommonCasePanel'),
        supportDisplay:disp('#ctuSupportSecuringPanel'), bracingDisplay:disp('#ctuBracingAssist'), deficiencyDisplay:disp('#deficiencySupportPanel'),
        closedDetailsDisplays:[...document.querySelectorAll('details:not([open])')].slice(0,8).map(e=>getComputedStyle(e).display),
        pairDisplay:disp('.v1398-pair--step34'), step3:sty('[data-ctu-step="3"]'), step5:sty('[data-ctu-step="5"]'), step6:sty('#wallGapAssistPanel'), step7:sty('[data-ctu-step="7"]'),
        resultGrid:sty('.result-summary'), directional:sty('.ctu-directional-load-audit'), wall,
        overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        overall:document.getElementById('overall')?.innerText||'', metrics:document.getElementById('metrics')?.innerText||''
      };
    }""")

    pdf_path=out/'v13102_standard_A4_print.pdf'
    p.pdf(path=str(pdf_path),format='A4',print_background=True,prefer_css_page_size=True)
    b.close()

from pypdf import PdfReader
reader=PdfReader(str(pdf_path))
page_count=len(reader.pages)
checks=[]
def ck(name,cond): checks.append((name,bool(cond)))
ck('print state has support-off class','ctu-print-support-off' in audit['classes'])
ck('print state has sufficient-result class','ctu-print-result-sufficient' in audit['classes'])
ck('app header hidden',audit['headerDisplay']=='none')
ck('sticky progress hidden',audit['stickyDisplay']=='none')
ck('layout toolbar hidden',audit['toolbarDisplay']=='none')
ck('registered-case UI hidden',audit['commonCaseDisplay']=='none')
ck('unused support panel hidden',audit['supportDisplay']=='none')
ck('unused support load-path helper hidden',audit['bracingDisplay']=='none')
ck('deficiency support hidden for sufficient result',audit['deficiencyDisplay']=='none')
ck('closed details hidden',all(x=='none' for x in audit['closedDetailsDisplays']))
ck('print pair uses single flow',audit['pairDisplay']=='block')
ck('Step 3 starts new print page',audit['step3']['breakBefore']=='page')
ck('Step 5 starts new print page',audit['step5']['breakBefore']=='page')
ck('Step 6 starts new print page',audit['step6']['breakBefore']=='page')
ck('Step 7 starts new print page',audit['step7']['breakBefore']=='page')
ck('result summary has three print columns',len([x for x in audit['resultGrid']['grid'].split(' ') if x and x!='0px'])==3)
ck('directional load detail starts new print page',audit['directional']['breakBefore']=='page')
ck('no horizontal overflow in print media',not audit['overflow'])
ck('print main card borders remain symmetric',all(len(set(x['borders']))==1 for x in audit['wall']) and all(len(set(audit[k]['borders']))==1 for k in ['step3','step5','step6','step7']))
ck('print cards have no shadows',all(x['shadow']=='none' for x in audit['wall']) and all(audit[k]['shadow']=='none' for k in ['step3','step5','step6','step7']))
ck('calculation remains sufficient','参考上十分' in audit['overall'])
ck('required resistance remains 25.2 kN','25.2 kN' in audit['metrics'])
ck('evaluated resistance remains 44.5 kN','44.5 kN' in audit['metrics'])
ck('margin remains 19.4 kN','19.4 kN' in audit['metrics'])
ck('standard A4 report remains six pages',page_count==6)
ck('standard state has no application-expanded class','ctu-print-application-expanded' not in audit['classes'])
ck('v1.3.102 adaptive print CSS is loaded', any('v13102-ctu-expanded-print-polish.css' in x[0] for x in style_parts))
ck('v1.3.102 adaptive print JS is loaded', any('v13102-ctu-expanded-print-state.js' in x[0] for x in script_parts))

result={'audit':audit,'pageCount':page_count,'checks':[{'name':n,'pass':v} for n,v in checks],'passCount':sum(v for _,v in checks),'failCount':sum(not v for _,v in checks),'pdf':str(pdf_path)}
(out/'v13102_standard_print_verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
with (out/'v13102_standard_print_verify.log').open('w',encoding='utf-8') as f:
  for n,v in checks: f.write(('PASS ' if v else 'FAIL ')+n+'\n')
  f.write(f'TOTAL {len(checks)} / PASS {result["passCount"]} / FAIL {result["failCount"]}\n')
print((out/'v13102_standard_print_verify.log').read_text(encoding='utf-8'))
if result['failCount']: raise SystemExit(1)
