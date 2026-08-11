from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
from pypdf import PdfReader
import json,re,sys

ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
PAGE=ROOT/'pages'/'ctu-securing-calculator.html'
OUT=ROOT/'docs'/'verification'/'v1.3.104'
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
 'v13103-ctu-actionable-confirmation-guide.js','v13103-ctu-material-strength-linkage.js','v13104-ctu-timber-dimensions-ai.js'
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

def setval(p,sel,v,event='input'):
    p.evaluate("([s,v,e])=>{const x=document.querySelector(s);if(!x)throw new Error('missing '+s);x.value=String(v);x.dispatchEvent(new Event(e,{bubbles:true}));}",[sel,v,event])
def setcheck(p,sel,v):
    p.evaluate("([s,v])=>{const x=document.querySelector(s);if(!x)throw new Error('missing '+s);x.checked=!!v;x.dispatchEvent(new Event('change',{bubbles:true}));}",[sel,v])

def open_page(pw):
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage','--no-sandbox'])
    c=b.new_context(viewport={'width':1720,'height':1100},device_scale_factor=1)
    p=c.new_page();p.set_default_timeout(6000)
    errors=[];p.on('pageerror',lambda exc:errors.append(str(exc)))
    p.set_content(harness,wait_until='domcontentloaded',timeout=15000);p.add_script_tag(content=bootstrap)
    for _,x in style_parts:p.add_style_tag(content=x)
    for _,x in script_parts:p.add_script_tag(content=x)
    p.evaluate("document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));window.dispatchEvent(new Event('DOMContentLoaded'))")
    p.wait_for_timeout(700)
    return b,p,errors

checks=[]
def ck(n,c):checks.append({'name':n,'pass':bool(c)})
res={}
with sync_playwright() as pw:
    b,p,errors=open_page(pw)
    # Screen: two column with real spec selections and support enabled.
    p.locator('#ctuLayoutTwo').click(force=True);p.wait_for_timeout(250)
    setval(p,'#quickTransport','seaA','change');setval(p,'#quickCtu','container','change');setval(p,'#quickMass','8.559')
    setval(p,'#quickFriction','unknown','change');setval(p,'#quickMu','0.20')
    setcheck(p,'#quickUseTensile',True);setcheck(p,'#quickUseSupport',True)
    setval(p,'#quickMethod','direct','change');setval(p,'#quickDirection','rear','change');setval(p,'#quickCount','2')
    p.select_option('#quickMaterial','chain');p.wait_for_timeout(100);p.select_option('#quickMaterialProfile','chain-g8-13');p.wait_for_timeout(180)
    setval(p,'#quickCargoMsl','120');setval(p,'#quickCtuMsl','120');setval(p,'#quickAngle','30')
    p.select_option('#quickSupportMaterial','timber');p.wait_for_timeout(100);p.select_option('#quickSupportProfile','timber-batten-75x100-l22');p.wait_for_timeout(180)
    setval(p,'#quickSupportDirection','left','change');setval(p,'#quickSupportCount','2')
    # Leave the auto-generated reference values in place and accept review for this verification scenario.
    if p.locator('#confirmAllBtn').count(): p.locator('#confirmAllBtn').click(force=True);p.wait_for_timeout(200)
    setval(p,'#wallCtuPresetQuick','container','change');setval(p,'#wallPayloadQuick','28')
    for sid in ['#wallUseForward','#wallUseLeft','#wallUseRight']:
        if p.locator(sid).count(): setcheck(p,sid,True)
    if p.locator('#wallUseRear').count():setcheck(p,'#wallUseRear',False)
    p.locator('#quickCalcBtn').click(force=True);p.wait_for_timeout(500)

    screen=p.evaluate("""() => {
      const r=s=>{const e=document.querySelector(s);if(!e)return null;const x=e.getBoundingClientRect(),c=getComputedStyle(e);return {x:x.x,y:x.y,w:x.width,h:x.height,b:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],shadow:c.boxShadow}};
      return {primary:r('#ctuPrimarySecuringPanel'),support:r('#ctuSupportSecuringPanel'),step5:r('.ctu-numbered-step-card[data-ctu-step="5"]'),step6:r('.ctu-numbered-step-card[data-ctu-step="6"]'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,material:document.getElementById('quickMaterial')?.value,profile:document.getElementById('quickMaterialProfile')?.value,msl:document.getElementById('quickStrength')?.value,supportProfile:document.getElementById('quickSupportProfile')?.value,supportForce:document.getElementById('quickSupportStrength')?.value,supportBasis:document.getElementById('quickSupportBasis')?.value||''};
    }""")
    ck('two-column screen has no horizontal overflow',not screen['overflow'])
    ck('Step 5 and Step 6 remain side by side in two-column screen',screen['step5']['x'] < screen['step6']['x'] and abs(screen['step5']['y']-screen['step6']['y']) < 2)
    ck('lashing and support subcards remain stacked inside Step 5',abs(screen['primary']['x']-screen['support']['x']) < 2 and screen['primary']['y'] < screen['support']['y'])
    ck('lashing card border is four-side symmetric',len(set(screen['primary']['b']))==1 and screen['primary']['shadow']=='none')
    ck('support card border is four-side symmetric',len(set(screen['support']['b']))==1 and screen['support']['shadow']=='none')
    ck('chain Grade 8 13mm selection reflects 100.0 kN',screen['profile']=='chain-g8-13' and screen['msl']=='100.0')
    ck('timber 75x100 w75 h100 L2.2 reflects 9.1 kN',screen['supportProfile']=='timber-batten-75x100-l22' and screen['supportForce']=='9.1')
    ck('support basis records Appendix 4', 'Appendix 4' in screen['supportBasis'])
    dims=p.evaluate("() => ({w:document.getElementById('quickTimberThicknessW')?.value,h:document.getElementById('quickTimberHeightH')?.value,L:document.getElementById('quickTimberFreeLengthL')?.value,confirmed:document.getElementById('quickTimberDimensionsConfirmed')?.checked})")
    ck('timber w/h/L direct fields are populated for selected profile',dims['w']=='75' and dims['h']=='100' and float(dims['L'])==2.2)
    # Clean real viewport screenshot at Step 5: sticky header remains naturally at top.
    p.evaluate("() => { const e=document.querySelector('.ctu-numbered-step-card[data-ctu-step=\"5\"]'); const y=e.getBoundingClientRect().top+window.scrollY; window.scrollTo(0, Math.max(0,y-150)); }");p.wait_for_timeout(180)
    p.screenshot(path=str(OUT/'v13104_material_support_two_column_actual.png'),full_page=False)

    # Print the support-enabled scenario.
    p.emulate_media(media='print')
    if p.evaluate("typeof window.SKDG_CTU_PRINT_SYNC_V13101 === 'function'"):p.evaluate("window.SKDG_CTU_PRINT_SYNC_V13101()")
    if p.evaluate("typeof window.SKDG_CTU_PRINT_EXPANDED_SYNC_V13102 === 'function'"):p.evaluate("window.SKDG_CTU_PRINT_EXPANDED_SYNC_V13102()")
    p.wait_for_timeout(120)
    audit=p.evaluate("""() => {
      const st=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return {display:c.display,breakBefore:c.breakBefore,breakInside:c.breakInside,b:[c.borderTopWidth,c.borderRightWidth,c.borderBottomWidth,c.borderLeftWidth],shadow:c.boxShadow}};
      return {classes:[...document.body.classList],support:st('#ctuSupportSecuringPanel'),step5:st('.ctu-numbered-step-card[data-ctu-step="5"]'),step6:st('.ctu-numbered-step-card[data-ctu-step="6"]'),step7:st('.ctu-numbered-step-card[data-ctu-step="7"]'),overflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,profileStatus:getComputedStyle(document.getElementById('quickMaterialProfileStatus')).display,supportStatus:getComputedStyle(document.getElementById('quickSupportProfileStatus')).display,earlyAi:getComputedStyle(document.getElementById('quickTimberUploadAiPanel')).display,step5Ai:getComputedStyle(document.getElementById('quickTimberAiPanel')).display,overall:document.getElementById('overall')?.innerText||''};
    }""")
    pdf=OUT/'v13104_material_support_A4.pdf'
    p.pdf(path=str(pdf),format='A4',print_background=True,prefer_css_page_size=True)
    res['errors']=errors
    b.close()

reader=PdfReader(str(pdf));page_count=len(reader.pages);texts=[pg.extract_text() or '' for pg in reader.pages]
ck('support panel remains visible in print',audit['support']['display']!='none')
ck('Step 5 starts on a new print page',audit['step5']['breakBefore']=='page')
ck('Step 6 starts on a new print page',audit['step6']['breakBefore']=='page')
ck('Step 7 starts on a new print page',audit['step7']['breakBefore']=='page')
ck('print media has no horizontal overflow',not audit['overflow'])
ck('print Step 5 border remains symmetric',len(set(audit['step5']['b']))==1 and audit['step5']['shadow']=='none')
ck('print support border remains symmetric',len(set(audit['support']['b']))==1 and audit['support']['shadow']=='none')
ck('screen-only reference help is hidden in print',audit['profileStatus']=='none' and audit['supportStatus']=='none')
ck('photo-stage AI candidate panel is hidden in print',audit['earlyAi']=='none')
ck('duplicate Step5 AI candidate box is hidden in print',audit['step5Ai']=='none')
ck('printed report contains lashing spec selection',any('Grade 8' in t or '100.0' in t for t in texts))
ck('printed report contains support spec/force',any('75' in t and '9.1' in t for t in texts))
full_text='\n'.join(texts)
ck('printed report contains timber w/h/L',('75' in full_text and '100' in full_text and '2.2' in full_text and ('自由長' in full_text or 'L' in full_text)))
ck('support-enabled print is within reasonable page count',6 <= page_count <= 8)
ck('no page errors',len(res['errors'])==0)
res.update({'screen':screen,'printAudit':audit,'pageCount':page_count,'checks':checks,'passCount':sum(x['pass'] for x in checks),'failCount':sum(not x['pass'] for x in checks),'pdf':str(pdf)})
(OUT/'v13104_material_support_print.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
log='\n'.join(('PASS ' if x['pass'] else 'FAIL ')+x['name'] for x in checks)+f"\nTOTAL {len(checks)} / PASS {res['passCount']} / FAIL {res['failCount']}\n"
(OUT/'v13104_material_support_print.log').write_text(log,encoding='utf-8')
print(log)
if res['failCount']:raise SystemExit(1)
