from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
import json,re,sys
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
PAGE=ROOT/'pages'/'ctu-securing-calculator.html'
OUT=ROOT/'docs'/'verification'/'v1.3.103'; OUT.mkdir(parents=True,exist_ok=True)
raw=PAGE.read_text(encoding='utf-8'); soup=BeautifulSoup(raw,'html.parser')
styles=[]
for tag in soup.find_all(['link','style']):
    if tag.name=='link' and 'stylesheet' in (tag.get('rel') or []):
        href=tag.get('href','')
        if href.startswith(('http://','https://')): continue
        path=(PAGE.parent/urlsplit(href).path).resolve()
        if path.exists(): styles.append((href,path.read_text(encoding='utf-8')))
    elif tag.name=='style': styles.append(('inline',tag.get_text()))
ESSENTIAL=(
 'securing-msl-reference.js','ctu-code-rules-v1380.js','ctu-assessment-policy-v1381.js','v1392-ctu-direction-tie-label.js',
 'ctu-securing-calculator-core-v1398.js','v1386-ctu-dual-use-toggle.js','v1377-ctu-bracing-path.js','v1376-ctu-friction-sync.js',
 'v1394-ctu-gap-wall-assist.js','v1386-ctu-sticky-status.js','v1372-ctu-canonical-guard.js','v1375-ctu-confirm-all.js',
 'v1395-ctu-wall-result-sync.js','v1398-ctu-layout-wall-sync.js','v1398-ctu-usability.js','v13100-ctu-ui-consistency.js',
 'v13101-ctu-print-state.js','v13102-ctu-expanded-print-state.js','v13103-ctu-actionable-confirmation-guide.js')
scripts=[]
for tag in soup.find_all('script'):
    src=tag.get('src') or ''
    if src.startswith(('http://','https://')) or not any(x in src for x in ESSENTIAL): continue
    path=(PAGE.parent/urlsplit(src).path).resolve()
    if path.exists(): scripts.append((src,path.read_text(encoding='utf-8')))
harness=re.sub(r'<link\b[^>]*rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*>', '', raw, flags=re.I)
harness=re.sub(r'<style\b[^>]*>.*?</style\s*>','',harness,flags=re.I|re.S)
harness=re.sub(r'<script\b[^>]*>.*?</script\s*>','',harness,flags=re.I|re.S)
bootstrap=r'''(()=>{const mk=()=>{const m=new Map();return{getItem:k=>m.get(String(k))??null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}};const ls=mk(),ss=mk();Object.defineProperty(window,'localStorage',{value:ls,configurable:true});Object.defineProperty(window,'sessionStorage',{value:ss,configurable:true});ls.setItem('iss-api-token','t');ss.setItem('iss-api-token','t');ls.setItem('iss-api-user',JSON.stringify({id:'verify',name:'検証者',role:'admin',office:'川崎事業所'}));window.ISSAuthBridge={currentAuth:()=>({token:'t',user:{id:'verify',name:'検証者',role:'admin'}}),restore:()=>({token:'t'}),decorateAll:()=>{},withAuthFragment:u=>u,navigate:()=>{},refreshSessionClock:()=>{}};window.ISSStorage={listApplications:()=>[],getApplications:()=>[],updateApplication:()=>{},addPhoto:()=>({id:'p'})};window.ISSApplicationResults={list:()=>[],listApplications:()=>[],save:()=>({applicationYear:'2026',applicationNumber:'0000'}),createApplication:()=>({id:'a'})};window.XLSX={};})();'''

def setval(p,sel,val,event='input'):
    p.evaluate("""([s,v,t])=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.value=String(v);e.dispatchEvent(new Event(t,{bubbles:true}));}""",[sel,val,event])
def setcheck(p,sel,val):
    p.evaluate("""([s,v])=>{const e=document.querySelector(s);if(!e)throw new Error('missing '+s);e.checked=!!v;e.dispatchEvent(new Event('change',{bubbles:true}));}""",[sel,val])

results={'errors':[]}
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage','--no-sandbox'])
    c=b.new_context(viewport={'width':1720,'height':1000},device_scale_factor=1)
    p=c.new_page(); p.set_default_timeout(5000); p.on('pageerror',lambda e:results['errors'].append(str(e)))
    p.set_content(harness,wait_until='domcontentloaded',timeout=15000); p.add_script_tag(content=bootstrap)
    for _,x in styles:p.add_style_tag(content=x)
    for _,x in scripts:p.add_script_tag(content=x)
    p.evaluate("document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));window.dispatchEvent(new Event('DOMContentLoaded'));")
    p.wait_for_timeout(700)
    # Reproduce: Step 5 has a concrete missing field while the result is also 要確認.
    setval(p,'#quickTransport','seaA','change'); setval(p,'#quickCtu','container','change'); setval(p,'#quickMass','8.559')
    setcheck(p,'#quickUseTensile',True); setcheck(p,'#quickUseSupport',True); setval(p,'#quickMethod','direct','change')
    setval(p,'#quickDirection','rear','change'); setval(p,'#quickCount','4'); setval(p,'#quickStrength','12.1'); setval(p,'#quickCargoMsl','20'); setval(p,'#quickCtuMsl','10'); setval(p,'#quickAngle','45')
    setval(p,'#quickSupportMaterial','timber','change'); setval(p,'#quickSupportDirection','rear','change'); setval(p,'#quickSupportCount','2'); setval(p,'#quickSupportStrength','10'); setval(p,'#quickSupportBasis','')
    # Mimic the operator having confirmed all currently populated values first.
    p.evaluate("window.SKCTUProgressAPI&&window.SKCTUProgressAPI.confirmAllCurrent&&window.SKCTUProgressAPI.confirmAllCurrent()")
    # Then create the exact confusing state: one Step 5 missing field plus a separate result confirmation item.
    setval(p,'#quickMaterial','', 'change')
    p.wait_for_timeout(250); p.locator('#quickCalcBtn').click(force=True); p.wait_for_timeout(700)
    guide=p.locator('#ctuActionGuide')
    results['overall']=p.locator('#overall').inner_text()
    results['stickyHeadline']=p.locator('#ctuStickyHeadline').inner_text()
    results['stickyDetail']=p.locator('#ctuStickyDetail').inner_text()
    results['guideHidden']=guide.get_attribute('hidden') is not None
    results['guideTitle']=p.locator('#ctuActionGuideTitle').inner_text()
    results['guideText']=p.locator('#ctuActionGuideItems').inner_text()
    results['guideCount']=p.locator('#ctuActionGuideItems .ctu-action-guide__item').count()
    results['missingCount']=p.locator('#ctuActionGuideItems .is-missing').count()
    results['reviewCount']=p.locator('#ctuActionGuideItems .is-review').count()
    results['targetButtons']=p.locator('#ctuActionGuideItems button').all_inner_texts()
    results['guideStyle']=p.evaluate("""()=>{const e=document.getElementById('ctuActionGuide'),s=getComputedStyle(e);return{b:[s.borderTopWidth,s.borderRightWidth,s.borderBottomWidth,s.borderLeftWidth],c:[s.borderTopColor,s.borderRightColor,s.borderBottomColor,s.borderLeftColor],shadow:s.boxShadow}}""")
    p.locator('#ctuActionGuide').scroll_into_view_if_needed();p.wait_for_timeout(120);p.screenshot(path=str(OUT/'v13103_action_guide_result.png'),full_page=False)
    # Navigate to the CTU-side MSL item.
    btn=p.locator('[data-ctu-action-target="quickSupportBasis"]')
    results['reviewButtonCount']=btn.count()
    if btn.count():
        btn.first.click(force=True);p.wait_for_timeout(650)
        results['activeAfterReviewJump']=p.evaluate("document.activeElement&&document.activeElement.id")
        results['reviewFocusOutline']=p.evaluate("getComputedStyle(document.getElementById('quickSupportBasis')).outlineWidth")
        p.screenshot(path=str(OUT/'v13103_action_guide_jump_review.png'),full_page=False)
    # Navigate to missing material.
    btn2=p.locator('[data-ctu-action-target="quickMaterial"]')
    results['materialButtonCount']=btn2.count()
    if btn2.count():
        btn2.first.click(force=True);p.wait_for_timeout(650)
        results['activeAfterMaterialJump']=p.evaluate("document.activeElement&&document.activeElement.id")
        p.screenshot(path=str(OUT/'v13103_action_guide_jump_material.png'),full_page=False)
    b.close()

checks=[]
def ck(n,v): checks.append({'name':n,'pass':bool(v)})
ck('overall is 要確認','要確認' in results['overall'])
ck('sticky identifies Step 5 missing','⑤' in results['stickyDetail'] or '不足' in results['stickyHeadline'])
ck('action guide visible',not results['guideHidden'])
ck('guide separates input missing','入力不足' in results['guideTitle'] and results['missingCount']>=1)
ck('guide separates review waiting','確認待ち' in results['guideTitle'] and results['reviewCount']>=1)
ck('guide shows concrete material input','固縛材質' in results['guideText'])
ck('guide shows concrete support-basis confirmation','支保力の根拠' in results['guideText'])
ck('support-basis has direct navigation button',results['reviewButtonCount']==1)
ck('material has direct navigation button',results['materialButtonCount']==1)
ck('support-basis receives focus after navigation',results.get('activeAfterReviewJump')=='quickSupportBasis')
ck('material receives focus after navigation',results.get('activeAfterMaterialJump')=='quickMaterial')
ck('guide border symmetric',len(set(results['guideStyle']['b']))==1 and len(set(results['guideStyle']['c']))==1)
ck('guide has no box shadow',results['guideStyle']['shadow']=='none')
ck('no page errors',not results['errors'])
results['checks']=checks;results['passCount']=sum(x['pass'] for x in checks);results['failCount']=sum(not x['pass'] for x in checks)
(OUT/'v13103_action_guide_verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
with (OUT/'v13103_action_guide_verify.log').open('w',encoding='utf-8') as f:
    for x in checks:f.write(('PASS ' if x['pass'] else 'FAIL ')+x['name']+'\n')
    f.write(f"TOTAL {len(checks)} / PASS {results['passCount']} / FAIL {results['failCount']}\n")
print((OUT/'v13103_action_guide_verify.log').read_text(encoding='utf-8'))
if results['failCount']: sys.exit(1)
