from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
import json,re,sys

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
PAGE=ROOT/'pages'/'ctu-securing-calculator.html'
OUT=ROOT/'docs'/'verification'/'v1.3.105'
OUT.mkdir(parents=True,exist_ok=True)
raw=PAGE.read_text(encoding='utf-8')
soup=BeautifulSoup(raw,'html.parser')

style_parts=[]
for tag in soup.find_all(['link','style']):
    if tag.name=='link' and 'stylesheet' in (tag.get('rel') or []):
        href=tag.get('href','')
        if href.startswith(('http://','https://')): continue
        path=(PAGE.parent/urlsplit(href).path).resolve()
        if path.exists(): style_parts.append((href,path.read_text(encoding='utf-8')))
    elif tag.name=='style': style_parts.append(('inline',tag.get_text()))

ESSENTIAL=(
 'securing-msl-reference.js','ctu-code-rules-v1380.js','ctu-assessment-policy-v1381.js',
 'v1392-ctu-direction-tie-label.js','ctu-securing-calculator-core-v1398.js',
 'v1386-ctu-dual-use-toggle.js','v1377-ctu-bracing-path.js','v1376-ctu-friction-sync.js',
 'v1379-ctu-msl-material-linkage.js','v1394-ctu-gap-wall-assist.js','v1386-ctu-sticky-status.js',
 'v1372-ctu-canonical-guard.js','v1375-ctu-confirm-all.js','v1395-ctu-wall-result-sync.js',
 'v1398-ctu-layout-wall-sync.js','v1398-ctu-usability.js','v13100-ctu-ui-consistency.js',
 'v13101-ctu-print-state.js','v13102-ctu-expanded-print-state.js',
 'v13103-ctu-actionable-confirmation-guide.js','v13103-ctu-material-strength-linkage.js'
)
script_parts=[]
for tag in soup.find_all('script'):
    src=tag.get('src') or ''
    if src.startswith(('http://','https://')) or not any(x in src for x in ESSENTIAL): continue
    path=(PAGE.parent/urlsplit(src).path).resolve()
    if path.exists(): script_parts.append((src,path.read_text(encoding='utf-8')))

harness=re.sub(r'<link\b[^>]*rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*>', '', raw, flags=re.I)
harness=re.sub(r'<style\b[^>]*>.*?</style\s*>', '', harness, flags=re.I|re.S)
harness=re.sub(r'<script\b[^>]*>.*?</script\s*>', '', harness, flags=re.I|re.S)
bootstrap=r'''(() => {
 const mk=()=>{const m=new Map();return {getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}};
 Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});
 window.ISSAuthBridge={currentAuth:()=>({token:'verify',user:{id:'verify',name:'検証者',role:'admin'}}),restore:()=>({token:'verify'}),decorateAll:()=>{},withAuthFragment:u=>u,navigate:()=>{},refreshSessionClock:()=>{}};
 window.ISSStorage={listApplications:()=>[],getApplications:()=>[]};window.ISSApplicationResults={list:()=>[]};window.XLSX={};
})();'''

def open_page(pw,w=1720,h=1000):
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage','--no-sandbox'])
    c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1)
    p=c.new_page();p.set_default_timeout(5000)
    errors=[];p.on('pageerror',lambda exc: errors.append(str(exc)))
    p.set_content(harness,wait_until='domcontentloaded',timeout=15000)
    p.add_script_tag(content=bootstrap)
    for _,x in style_parts:p.add_style_tag(content=x)
    for _,x in script_parts:p.add_script_tag(content=x)
    p.evaluate("document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));window.dispatchEvent(new Event('DOMContentLoaded'))")
    p.wait_for_timeout(700)
    return b,p,errors

def choose(p,sel,val):
    p.select_option(sel,val);p.wait_for_timeout(160)

def val(p,sel):return p.locator(sel).input_value()
def options(p,sel):return p.locator(sel+' option').all_text_contents()
def status(p,sel):return p.locator(sel).inner_text()

def symmetric(p,sel):
    return p.eval_on_selector(sel,"e=>{const s=getComputedStyle(e),b=[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],c=[s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.borderLeftColor];return {b,c,ok:b.every(x=>x===b[0])&&c.every(x=>x===c[0]),shadow:s.boxShadow}}")

res={'errors':[],'cases':{}}
checks=[]
def ck(n,c):checks.append({'name':n,'pass':bool(c)})

with sync_playwright() as pw:
    b,p,errs=open_page(pw);res['errors']+=errs
    ck('visible material spec dropdown exists',p.locator('#quickMaterialProfile').count()==1)
    ck('visible support spec dropdown exists',p.locator('#quickSupportProfile').count()==1)
    ck('initial lashing MSL is not a stale fixed default',val(p,'#quickStrength')=='')
    ck('initial support force is not a stale fixed default',val(p,'#quickSupportStrength')=='')
    ck('chain is selectable', 'チェーン' in options(p,'#quickMaterial'))

    # steel recommended 50%
    choose(p,'#quickMaterial','steel');
    ck('steel profiles include CTU 50% recommendation',any('50%' in x and '8.7' in x for x in options(p,'#quickMaterialProfile')))
    choose(p,'#quickMaterialProfile','steel-31-08-rec50')
    res['cases']['steel']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus'),'reference':p.locator('#quickStrength').get_attribute('data-v13103-reference-candidate')}
    ck('steel 31.75x0.80 recommended profile reflects 8.7 kN',val(p,'#quickStrength')=='8.7')
    ck('steel candidate stays review-required',p.locator('#quickStrength').get_attribute('data-v13103-reference-candidate')=='1')

    # chain
    choose(p,'#quickMaterial','chain');choose(p,'#quickMaterialProfile','chain-g8-13')
    res['cases']['chain']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus')}
    ck('Grade 8 13mm chain reflects 100.0 kN',val(p,'#quickStrength')=='100.0')

    # wire
    choose(p,'#quickMaterial','wire');choose(p,'#quickMaterialProfile','wire-oneway-16')
    res['cases']['wire']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus')}
    ck('16mm one-way wire CTU formula reflects 102.4 kN',val(p,'#quickStrength')=='102.4')

    # PP
    choose(p,'#quickMaterial','pp');choose(p,'#quickMaterialProfile','pp-rope-16')
    res['cases']['pp']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus')}
    ck('16mm PP rope CTU formula reflects 10.2 kN',val(p,'#quickStrength')=='10.2')

    # web label template; evidence remains required
    choose(p,'#quickMaterial','web');choose(p,'#quickMaterialProfile','web-marked-25')
    res['cases']['web']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus')}
    ck('web labelled LC/MSL 25 reflects 25.0 kN',val(p,'#quickStrength')=='25.0')
    ck('web label template remains review-required',p.locator('#quickStrength').get_attribute('data-v13103-reference-candidate')=='1')

    # PET manual: no invented number
    choose(p,'#quickMaterial','pet');choose(p,'#quickMaterialProfile','pet-band-manual')
    res['cases']['pet']={'msl':val(p,'#quickStrength'),'status':status(p,'#quickMaterialProfileStatus')}
    ck('PET band does not invent material-only MSL',val(p,'#quickStrength')=='')

    # support timber
    p.check('#quickUseSupport',force=True);p.dispatch_event('#quickUseSupport','change');p.wait_for_timeout(180);choose(p,'#quickSupportMaterial','timber');choose(p,'#quickSupportProfile','timber-batten-50x100-l22')
    res['cases']['timber']={'force':val(p,'#quickSupportStrength'),'basis':val(p,'#quickSupportBasis'),'status':status(p,'#quickSupportProfileStatus')}
    ck('timber 50x100 L2.2 reflects 4.1 kN per batten',val(p,'#quickSupportStrength')=='4.1')
    ck('timber reference writes basis', 'Appendix 4' in val(p,'#quickSupportBasis'))
    ck('timber candidate remains review-required',p.locator('#quickSupportStrength').get_attribute('data-v13103-reference-candidate')=='1')

    # FRP manual
    choose(p,'#quickSupportMaterial','frp');choose(p,'#quickSupportProfile','frp-manual')
    res['cases']['frp']={'force':val(p,'#quickSupportStrength'),'status':status(p,'#quickSupportProfileStatus')}
    ck('FRP does not invent material-only support force',val(p,'#quickSupportStrength')=='')

    # final visible scenario for screenshot: chain + timber
    choose(p,'#quickMaterial','chain');choose(p,'#quickMaterialProfile','chain-g8-13')
    choose(p,'#quickSupportMaterial','timber');choose(p,'#quickSupportProfile','timber-batten-75x100-l22')
    p.evaluate("() => { const e=document.querySelector('.ctu-numbered-step-card[data-ctu-step=\"5\"]'); window.scrollTo(0, Math.max(0,e.getBoundingClientRect().top+scrollY-165)); }");p.wait_for_timeout(200)
    p.screenshot(path=str(OUT/'v13103_step5_material_strength_one_column.png'),full_page=False)
    bs=symmetric(p,'#ctuPrimarySecuringPanel');ss=symmetric(p,'#ctuSupportSecuringPanel')
    ck('Step5 lashing card border remains symmetric',bs['ok'] and bs['shadow']=='none')
    ck('Step5 support card border remains symmetric',ss['ok'] and ss['shadow']=='none')
    ck('one-column no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))

    # Progress/action guide must identify auto reference as review, not confirmed.
    p.wait_for_timeout(250)
    prog=p.evaluate("window.SKCTUProgressAPI?.evaluate?.()||null")
    res['progress']=prog
    if prog:
        labels=[x.get('label','') for x in (prog.get('review') or [])]
        ck('reference lashing candidate appears as review',any('固縛材MSL' in x for x in labels))
        ck('reference support candidate appears as review',any('支保力' in x for x in labels))
    else:
        ck('progress API available',False)
    res['errors']+=errs
    b.close()

    # Fresh wide viewport: automatic two-column rendering with the new fields visible.
    b2,p2,errs2=open_page(pw,2600,1000)
    choose(p2,'#quickMaterial','chain');choose(p2,'#quickMaterialProfile','chain-g8-13')
    p2.check('#quickUseSupport',force=True);p2.dispatch_event('#quickUseSupport','change');p2.wait_for_timeout(180);choose(p2,'#quickSupportMaterial','timber');choose(p2,'#quickSupportProfile','timber-batten-75x100-l22')
    p2.locator('.ctu-numbered-step-card[data-ctu-step="5"]').screenshot(path=str(OUT/'v13103_step5_material_strength_two_column.png'))
    ck('wide two-column no horizontal overflow',p2.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    ck('wide two-column mode is active',p2.evaluate("document.body.dataset.ctuCardLayout")=='two')
    res['errors']+=errs2
    b2.close()

res['checks']=checks;res['passCount']=sum(x['pass'] for x in checks);res['failCount']=len(checks)-res['passCount']
(OUT/'v13105_material_strength_browser.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
log='\n'.join(('PASS ' if x['pass'] else 'FAIL ')+x['name'] for x in checks)+f"\nTOTAL {len(checks)} / PASS {res['passCount']} / FAIL {res['failCount']}\nERRORS {len(res['errors'])}\n"
(OUT/'v13105_material_strength_browser.log').write_text(log,encoding='utf-8')
print(log)
if res['failCount'] or res['errors']:sys.exit(1)
