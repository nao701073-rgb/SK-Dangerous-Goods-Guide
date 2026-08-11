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

(OUT/'v13102_harness_sources.json').write_text(json.dumps({
    'stylesheetCount':len(style_parts),'scriptCount':len(script_parts),
    'stylesheets':[x[0] for x in style_parts],'scripts':[x[0] for x in script_parts],
    'finalCssPresent':any('v13100-ctu-complete-visual-system.css' in x[0] for x in style_parts),
    'printPolishCssPresent':any('v13101-ctu-screen-print-polish.css' in x[0] for x in style_parts),
    'finalJsPresent':any('v13100-ctu-ui-consistency.js' in x[0] for x in script_parts),
    'printStateJsPresent':any('v13101-ctu-print-state.js' in x[0] for x in script_parts),
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
    # Normal PC: one column by default.
    b,c,p=open_page(pw,1720,1000)
    results['normalPc']={
      'layout':p.evaluate("document.body.dataset.ctuCardLayout"),
      'geometry':step_geometry(p),'visualBeforeCalc':visual_audit(p),
      'step5Primary':border_style(p,'#ctuPrimarySecuringPanel'),'step5Support':border_style(p,'#ctuSupportSecuringPanel'),
      'wallIdle':border_style(p,'.v1394-wall-direction-card'),
      'toolbarDisplay':p.evaluate("getComputedStyle(document.getElementById('ctuLayoutToolbar')).display"),
      'twoButtonDisplay':p.evaluate("getComputedStyle(document.getElementById('ctuLayoutTwo')).display"),
      'finalCssRuleSeen':p.evaluate("getComputedStyle(document.body).getPropertyValue('--ctu100-border').trim()==='#bfd1df'")
    }
    p.screenshot(path=str(OUT/'v13102_pc_one_column_top.png'),full_page=False)

    p.locator('#ctuLayoutTwo').click(force=True); p.wait_for_timeout(300)
    results['manualTwo']={'layout':p.evaluate("document.body.dataset.ctuCardLayout"),'geometry':step_geometry(p),'visual':visual_audit(p)}
    p.screenshot(path=str(OUT/'v13102_pc_manual_two_column_top.png'),full_page=False)
    p.locator('#ctuLayoutOne').click(force=True); p.wait_for_timeout(200)

    # Verified v1.3.98 calculation scenario.
    setval(p,'#quickTransport','seaA','change'); setval(p,'#quickCtu','container','change'); setval(p,'#quickMass','8.559')
    setval(p,'#quickFriction','unknown','change'); setval(p,'#quickMu','0.20')
    if p.locator('#quickUseTensile').count(): setcheck(p,'#quickUseTensile',True)
    if p.locator('#quickUseSupport').count(): setcheck(p,'#quickUseSupport',False)
    setval(p,'#quickMethod','direct','change'); setval(p,'#quickDirection','rear','change'); setval(p,'#quickCount','4')
    setval(p,'#quickStrength','12.1'); setval(p,'#quickCargoMsl','20'); setval(p,'#quickCtuMsl','10'); setval(p,'#quickAngle','17')
    if p.locator('#quickBasis').count(): setval(p,'#quickBasis','manufacturer verified')
    setval(p,'#wallCtuPresetQuick','container','change'); setval(p,'#wallPayloadQuick','28')
    p.wait_for_timeout(250)
    for sid in ['#wallUseForward','#wallUseLeft','#wallUseRight']:
      if p.locator(sid).count(): setcheck(p,sid,True)
    if p.locator('#wallUseRear').count(): setcheck(p,'#wallUseRear',False)
    p.wait_for_timeout(250); p.locator('#quickCalcBtn').click(force=True); p.wait_for_timeout(700)
    wall_styles={}
    for d in ['forward','rear','left','right']:
      wall_styles[d]=border_style(p,f'.v1394-wall-direction-card[data-wall-dir="{d}"]')
    results['calc']={
      'overall':p.locator('#overall').inner_text(),'metrics':p.locator('#metrics').inner_text(),'status':p.locator('#quickStatus').inner_text(),
      'step6':p.locator('#ctuStatusStep6').inner_text(),'step7':p.locator('#ctuStatusStep7').inner_text(),
      'overallStyle':border_style(p,'#overall'),'metricWorst':border_style(p,'.result-summary .metric-worst-direction'),'metricAssessment':border_style(p,'.result-summary .metric-assessment'),
      'wallSelected':wall_styles,'visualAfterCalc':visual_audit(p)
    }
    p.locator('.ctu-numbered-step-card[data-ctu-step="5"]').scroll_into_view_if_needed(); p.wait_for_timeout(100); p.screenshot(path=str(OUT/'v13102_step5_one_column.png'),full_page=False)
    p.locator('.ctu-numbered-step-card[data-ctu-step="6"]').scroll_into_view_if_needed(); p.wait_for_timeout(100); p.screenshot(path=str(OUT/'v13102_step6_wall.png'),full_page=False)
    p.locator('.ctu-numbered-step-card[data-ctu-step="7"]').scroll_into_view_if_needed(); p.wait_for_timeout(100); p.screenshot(path=str(OUT/'v13102_step7_result.png'),full_page=False)
    b.close()

    # Wide effective viewport: automatic two columns when no manual preference exists.
    b,c,p=open_page(pw,2600,1000)
    results['wideAuto']={'layout':p.evaluate("document.body.dataset.ctuCardLayout"),'geometry':step_geometry(p),'visual':visual_audit(p)}
    p.screenshot(path=str(OUT/'v13102_wide_auto_two_column.png'),full_page=False); b.close()

    # Mobile/touch: fixed one column.
    b,c,p=open_page(pw,390,844,mobile=True,touch=True)
    results['mobile']={'layout':p.evaluate("document.body.dataset.ctuCardLayout"),'twoButtonDisplay':p.evaluate("getComputedStyle(document.getElementById('ctuLayoutTwo')).display"),'visual':visual_audit(p),'geometry':step_geometry(p)}
    p.screenshot(path=str(OUT/'v13102_mobile_top.png'),full_page=False); b.close()

checks=[]
def check(name,cond): checks.append((name,bool(cond)))
check('v1.3.100 card CSS remains active',results['normalPc']['finalCssRuleSeen'])
check('v1.3.101 print polish CSS is loaded', any('v13101-ctu-screen-print-polish.css' in x[0] for x in style_parts))
check('v1.3.102 expanded print CSS is loaded', any('v13102-ctu-expanded-print-polish.css' in x[0] for x in style_parts))
check('v1.3.101 print state bridge is loaded', any('v13101-ctu-print-state.js' in x[0] for x in script_parts))
check('v1.3.102 expanded print state is loaded', any('v13102-ctu-expanded-print-state.js' in x[0] for x in script_parts))
check('normal PC defaults to one column',results['normalPc']['layout']=='one')
check('manual two-column works at desktop width',results['manualTwo']['layout']=='two')
check('wide effective viewport auto switches to two columns',results['wideAuto']['layout']=='two')
check('mobile is one column',results['mobile']['layout']=='one')
check('mobile two-column button hidden',results['mobile']['twoButtonDisplay']=='none')
for label,audit in [('normal',results['normalPc']['visualBeforeCalc']),('manualTwo',results['manualTwo']['visual']),('wideAuto',results['wideAuto']['visual']),('mobile',results['mobile']['visual']),('afterCalc',results['calc']['visualAfterCalc'])]:
  check(f'{label} no horizontal overflow',not audit['overflow'])
  check(f'{label} main card borders symmetric',all(x['symmetric'] for x in audit['main']))
  check(f'{label} no header/body overlap',all(x['overlap'] in (False,None) for x in audit['main']))
check('normal main cards are exactly 1px on all sides',all(x['borders']==['1px','1px','1px','1px'] for x in results['normalPc']['visualBeforeCalc']['main']))
check('normal main cards have no shadow',all(x['shadow']=='none' for x in results['normalPc']['visualBeforeCalc']['main']))
check('normal header/body boundary gap is zero',all(x['gap'] in (0,None) for x in results['normalPc']['visualBeforeCalc']['main']))
check('Step5 primary border symmetric',same_border(results['normalPc']['step5Primary']))
check('Step5 support border symmetric',same_border(results['normalPc']['step5Support']))
check('Step5 primary border is exactly 1px',all(results['normalPc']['step5Primary'][k]=='1px' for k in ['bt','br','bb','bl']))
check('Step5 support border is exactly 1px',all(results['normalPc']['step5Support'][k]=='1px' for k in ['bt','br','bb','bl']))
check('Step5 primary/support have no shadow',results['normalPc']['step5Primary']['shadow']=='none' and results['normalPc']['step5Support']['shadow']=='none')
check('wall idle border symmetric',same_border(results['normalPc']['wallIdle']))
for d,s in results['calc']['wallSelected'].items(): check(f'wall {d} border symmetric',same_border(s))
check('wall selected forward/left/right use 2px on all sides',all(all(results['calc']['wallSelected'][d][k]=='2px' for k in ['bt','br','bb','bl']) for d in ['forward','left','right']))
check('wall unselected rear remains 1px on all sides',all(results['calc']['wallSelected']['rear'][k]=='1px' for k in ['bt','br','bb','bl']))
check('wall cards have no inset or outer shadow',all(s['shadow']=='none' for s in results['calc']['wallSelected'].values()))
check('overall result border symmetric',same_border(results['calc']['overallStyle']))
check('worst-direction metric border symmetric',same_border(results['calc']['metricWorst']))
check('assessment metric border symmetric',same_border(results['calc']['metricAssessment']))
check('overall and result metrics remain exactly 1px',all(all(x[k]=='1px' for k in ['bt','br','bb','bl']) for x in [results['calc']['overallStyle'],results['calc']['metricWorst'],results['calc']['metricAssessment']]))
check('result cards have no shadow',all(x['shadow']=='none' for x in [results['calc']['overallStyle'],results['calc']['metricWorst'],results['calc']['metricAssessment']]))
check('calculation overall sufficient','参考上十分' in results['calc']['overall'])
check('calculation required resistance 25.2 kN','25.2 kN' in results['calc']['metrics'])
check('calculation evaluated resistance 44.5 kN','44.5 kN' in results['calc']['metrics'])
check('calculation margin 19.4 kN','19.4 kN' in results['calc']['metrics'])
check('Step6 status says 3 directions used','3方向使用' in results['calc']['step6'])
check('Step7 status calculated','算出済' in results['calc']['step7'])
check('no page errors',len(results['errors'])==0)
results['checks']=[{'name':n,'pass':v} for n,v in checks]; results['passCount']=sum(v for _,v in checks); results['failCount']=sum(not v for _,v in checks)
(OUT/'v13102_browser_verification.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
with (OUT/'v13102_browser_verify.log').open('w',encoding='utf-8') as f:
  for n,v in checks: f.write(('PASS ' if v else 'FAIL ')+n+'\n')
  f.write(f'TOTAL {len(checks)} / PASS {results["passCount"]} / FAIL {results["failCount"]}\n')
print((OUT/'v13102_browser_verify.log').read_text(encoding='utf-8'))
if results['failCount']: sys.exit(1)
