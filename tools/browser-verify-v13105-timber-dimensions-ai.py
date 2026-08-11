from playwright.sync_api import sync_playwright
from pathlib import Path
from bs4 import BeautifulSoup
from urllib.parse import urlsplit
import json,re,sys
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve();PAGE=ROOT/'pages'/'ctu-securing-calculator.html';OUT=ROOT/'docs'/'verification'/'v1.3.105';OUT.mkdir(parents=True,exist_ok=True)
raw=PAGE.read_text(encoding='utf-8');soup=BeautifulSoup(raw,'html.parser')
styles=[]
for tag in soup.find_all(['link','style']):
    if tag.name=='link' and 'stylesheet' in (tag.get('rel') or []):
        href=tag.get('href','');
        if href.startswith(('http://','https://')): continue
        p=(PAGE.parent/urlsplit(href).path).resolve()
        if p.exists(): styles.append((href,p.read_text(encoding='utf-8')))
    elif tag.name=='style': styles.append(('inline',tag.get_text()))
ESSENTIAL=(
 'image-format-support.js','securing-msl-reference.js','ctu-code-rules-v1380.js','ctu-assessment-policy-v1381.js','v1392-ctu-direction-tie-label.js','ctu-securing-calculator-core-v1398.js',
 'v1386-ctu-dual-use-toggle.js','v1377-ctu-bracing-path.js','v1376-ctu-friction-sync.js','v1379-ctu-msl-material-linkage.js','v1394-ctu-gap-wall-assist.js',
 'v1386-ctu-sticky-status.js','v1372-ctu-canonical-guard.js','v1375-ctu-confirm-all.js','v1395-ctu-wall-result-sync.js','v1398-ctu-layout-wall-sync.js','v1398-ctu-usability.js',
 'v13100-ctu-ui-consistency.js','v13101-ctu-print-state.js','v13102-ctu-expanded-print-state.js','v141-photo-ai-container-fit.js','v13103-ctu-actionable-confirmation-guide.js','v13103-ctu-material-strength-linkage.js','v13104-ctu-timber-dimensions-ai.js','v13105-ctu-guided-usability.js'
)
scripts=[]
for tag in soup.find_all('script'):
    src=tag.get('src') or ''
    if src.startswith(('http://','https://')) or not any(x in src for x in ESSENTIAL):continue
    p=(PAGE.parent/urlsplit(src).path).resolve()
    if p.exists():scripts.append((src,p.read_text(encoding='utf-8')))
harness=re.sub(r'<link\b[^>]*rel=["\'][^"\']*stylesheet[^"\']*["\'][^>]*>', '',raw,flags=re.I);harness=re.sub(r'<style\b[^>]*>.*?</style\s*>','',harness,flags=re.I|re.S);harness=re.sub(r'<script\b[^>]*>.*?</script\s*>','',harness,flags=re.I|re.S)
bootstrap="""(()=>{const mk=()=>{const m=new Map();return {getItem:k=>m.has(String(k))?m.get(String(k)):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(String(k)),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}}};Object.defineProperty(window,'localStorage',{value:mk(),configurable:true});Object.defineProperty(window,'sessionStorage',{value:mk(),configurable:true});window.ISSAuthBridge={currentAuth:()=>({token:'verify',user:{id:'verify',name:'検証者',role:'admin'}}),restore:()=>({token:'verify'}),decorateAll:()=>{},withAuthFragment:u=>u,navigate:()=>{},refreshSessionClock:()=>{}};window.ISSStorage={listApplications:()=>[],getApplications:()=>[]};window.ISSApplicationResults={list:()=>[]};window.XLSX={};})();"""
def open_page(pw,w=1720,h=1000):
    b=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--disable-dev-shm-usage','--no-sandbox']);c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=1);p=c.new_page();p.set_default_timeout(5000);errs=[];p.on('pageerror',lambda exc:errs.append(str(exc)));p.set_content(harness,wait_until='domcontentloaded',timeout=15000);p.add_script_tag(content=bootstrap)
    for _,x in styles:p.add_style_tag(content=x)
    for _,x in scripts:p.add_script_tag(content=x)
    p.evaluate("document.dispatchEvent(new Event('DOMContentLoaded',{bubbles:true}));window.dispatchEvent(new Event('DOMContentLoaded'))");p.wait_for_timeout(900);return b,p,errs
res={'checks':[],'errors':[],'cases':{}}
def ck(name,c):res['checks'].append({'name':name,'pass':bool(c)})
def val(p,s):return p.locator(s).input_value()
with sync_playwright() as pw:
    b,p,errs=open_page(pw);res['errors']+=errs
    for id in ['quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL','quickTimberDimensionsConfirmed','quickTimberAiApply','quickTimberUploadAiPanel','quickTimberUploadAiCandidate','quickTimberUploadAiJump']:
        ck(f'{id} exists',p.locator('#'+id).count()==1)
    # Initial photo upload must predict at Step 2 even before timber is selected in Step 5.
    p.evaluate("()=>{const e=document.getElementById('quickSupportMaterial');e.value='frp';e.dispatchEvent(new Event('change',{bubbles:true}));}");p.wait_for_timeout(120)
    p.evaluate("['quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL'].forEach(id=>{const e=document.getElementById(id);e.value='';delete e.dataset.v13104AutoAiStage;})")
    test_png=str(OUT/'timber_ai_upload_test.png');p.set_input_files('#photoInput',test_png);p.wait_for_timeout(1900)
    early_text=p.locator('#quickTimberUploadAiCandidate').inner_text();early_state=p.locator('#quickTimberUploadAiState').inner_text();res['cases']['initialUploadEarlyAiText']=early_text;res['cases']['initialUploadEarlyAiState']=early_state
    ck('initial upload shows timber w/h/L candidate in Step2','w ' in early_text and 'h ' in early_text and 'L ' in early_text)
    ck('initial upload stages candidate before Step5 timber selection',all(float(val(p,'#'+fid))>0 for fid in ['quickTimberThicknessW','quickTimberHeightH','quickTimberFreeLengthL']))
    ck('initial upload labels candidate as unconfirmed','未確認' in early_state or '実測' in early_state)
    ck('initial upload enables jump to Step5',p.locator('#quickTimberUploadAiJump').is_enabled())
    p.locator('#quickTimberUploadAiPanel').scroll_into_view_if_needed();p.wait_for_timeout(100);p.screenshot(path=str(OUT/'v13105_initial_upload_ai_step2.png'),full_page=False)
    p.click('#quickTimberUploadAiJump');p.wait_for_timeout(520)
    ck('jump from Step2 expands optional support',p.locator('#quickUseSupport').is_checked());ck('jump from Step2 points to support material before timber selection',p.evaluate("document.activeElement?.id==='quickSupportMaterial'"))
    p.select_option('#quickSupportMaterial','timber');p.wait_for_timeout(180);p.locator('#quickTimberThicknessW').scroll_into_view_if_needed();p.wait_for_timeout(100);p.screenshot(path=str(OUT/'v13105_initial_upload_ai_step5_staged.png'),full_page=False)
    ck('staged AI dimensions are visible after selecting timber',float(val(p,'#quickTimberThicknessW'))>0 and float(val(p,'#quickTimberHeightH'))>0 and float(val(p,'#quickTimberFreeLengthL'))>0)
    p.select_option('#quickSupportProfile','timber-batten-50x100-l22');p.wait_for_timeout(250)
    ck('profile fills w=50mm',val(p,'#quickTimberThicknessW')=='50')
    ck('profile fills h=100mm',val(p,'#quickTimberHeightH')=='100')
    ck('profile fills L=2.2m',float(val(p,'#quickTimberFreeLengthL'))==2.2)
    ck('profile recalculates 4.1kN per unit',val(p,'#quickSupportStrength')=='4.1')
    ck('linked n shows current support count', '2' in p.locator('#quickTimberLinkedCount').inner_text())
    ck('profile leaves dimensions unconfirmed',not p.locator('#quickTimberDimensionsConfirmed').is_checked())
    prog=p.evaluate('window.SKCTUProgressAPI?.evaluate?.()||null');labels=[x.get('label','') for x in (prog or {}).get('review',[])]
    ck('progress includes timber dimension/installation confirmation',any('木材支保の寸法' in x for x in labels))
    # direct edit instantly recalculates
    p.fill('#quickTimberThicknessW','75');p.wait_for_timeout(180)
    ck('manual w edit recalculates per-unit strength to 9.1kN',val(p,'#quickSupportStrength')=='9.1')
    ck('manual edit clears confirmation',not p.locator('#quickTimberDimensionsConfirmed').is_checked())
    p.fill('#quickSupportCount','3');p.wait_for_timeout(120)
    ck('n follows support count after edit','3' in p.locator('#quickTimberLinkedCount').inner_text())
    ck('total output follows n','27.4' in p.locator('#quickTimberStrengthTotal').inner_text())
    # AI: preserve current values until explicit apply. synthetic timber-looking rectangle aspect ~22.
    before=(val(p,'#quickTimberThicknessW'),val(p,'#quickTimberHeightH'),val(p,'#quickTimberFreeLengthL'))
    p.evaluate("""()=>{const c=document.getElementById('photoCanvas');c.width=800;c.height=500;c.hidden=false;const x=c.getContext('2d');x.fillStyle='rgb(232,235,238)';x.fillRect(0,0,c.width,c.height);x.fillStyle='rgb(150,92,48)';x.fillRect(70,260,660,30);window.dispatchEvent(new CustomEvent('sk:ctu-photo-ai-requested',{detail:{source:'test',prediction:{brownFrac:.08}}}));}""")
    p.wait_for_timeout(500)
    ai_text=p.locator('#quickTimberAiCandidate').inner_text();res['cases']['aiText']=ai_text
    ck('photo AI produces w/h/L candidate','w ' in ai_text and 'h ' in ai_text and 'L ' in ai_text)
    ck('AI candidate is visibly low/medium confidence','信頼度' in ai_text)
    after=(val(p,'#quickTimberThicknessW'),val(p,'#quickTimberHeightH'),val(p,'#quickTimberFreeLengthL'))
    ck('photo AI does not overwrite measurements before apply',before==after)
    ck('AI apply button enabled',p.locator('#quickTimberAiApply').is_enabled())
    # actual file upload path: canvas load -> v141 photo AI event -> timber AI refresh
    p.set_input_files('#photoInput',test_png);p.wait_for_timeout(1900);actual_ai=p.locator('#quickTimberAiCandidate').inner_text();res['cases']['actualUploadAiText']=actual_ai
    ck('actual photo upload triggers timber AI prediction','w ' in actual_ai and 'h ' in actual_ai and 'L ' in actual_ai)
    p.click('#quickTimberAiApply');p.wait_for_timeout(180)
    ck('AI apply still leaves confirmation unchecked',not p.locator('#quickTimberDimensionsConfirmed').is_checked())
    ck('AI applied dimensions remain editable',not p.locator('#quickTimberThicknessW').is_disabled())
    # confirm and snapshot
    p.check('#quickTimberDimensionsConfirmed');p.wait_for_timeout(120);snap=p.evaluate('window.SKCTUTimberDimensions?.snapshot?.()||null');res['cases']['snapshot']=snap
    ck('snapshot stores w/h/L',bool(snap and snap.get('wMm') and snap.get('hMm') and snap.get('freeLengthM')))
    ck('snapshot stores confirmation',bool(snap and snap.get('confirmed')))
    # restore simulation
    p.evaluate("""()=>{window.SKCTUTimberRestorePayload={wMm:80,hMm:120,freeLengthM:1.8,confirmed:true,source:'restore-test'};window.dispatchEvent(new CustomEvent('sk:ctu-restored',{detail:{}}));}""");p.wait_for_timeout(250)
    ck('restore brings back w',val(p,'#quickTimberThicknessW')=='80')
    ck('restore brings back h',val(p,'#quickTimberHeightH')=='120')
    ck('restore brings back L',float(val(p,'#quickTimberFreeLengthL'))==1.8)
    ck('restore brings back confirmation',p.locator('#quickTimberDimensionsConfirmed').is_checked())
    # screenshot of actual two-column Step5 at wide viewport
    p.set_viewport_size({'width':2600,'height':1200});p.wait_for_timeout(280);p.locator('.ctu-numbered-step-card[data-ctu-step="5"]').scroll_into_view_if_needed();p.wait_for_timeout(120);p.screenshot(path=str(OUT/'v13105_timber_whl_ai_step5.png'),full_page=False)
    ck('no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=document.documentElement.clientWidth'))
    # print media: visible dimensions and no AI buttons
    p.emulate_media(media='print');p.wait_for_timeout(120)
    ck('timber dimensions remain printable',p.locator('#quickTimberDimensionPanel').is_visible())
    ck('AI action buttons hidden in print',p.locator('.v13104-timber-ai__actions').evaluate("e=>getComputedStyle(e).display")=='none')
    res['errors']+=errs;b.close()
res['passCount']=sum(x['pass'] for x in res['checks']);res['failCount']=len(res['checks'])-res['passCount']
(OUT/'v13105_timber_dimensions_ai_browser.json').write_text(json.dumps(res,ensure_ascii=False,indent=2),encoding='utf-8')
log='\n'.join(('PASS ' if x['pass'] else 'FAIL ')+x['name'] for x in res['checks'])+f"\nTOTAL {len(res['checks'])} / PASS {res['passCount']} / FAIL {res['failCount']}\nERRORS {len(res['errors'])}\n";(OUT/'v13105_timber_dimensions_ai_browser.log').write_text(log,encoding='utf-8');print(log)
if res['failCount'] or res['errors']:sys.exit(1)
