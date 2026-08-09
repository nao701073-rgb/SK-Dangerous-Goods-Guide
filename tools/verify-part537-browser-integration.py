#!/usr/bin/env python3
from __future__ import annotations
import contextlib, functools, hashlib, http.server, json, mimetypes, os, socket, tempfile, threading, time
from pathlib import Path
from urllib.parse import urlparse, unquote
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError

ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'docs'/'part537_ブラウザ統合試験レポート.json'

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

@contextlib.contextmanager
def serve(root:Path):
    with socket.socket() as s:
        s.bind(('127.0.0.1',0)); port=s.getsockname()[1]
    handler=functools.partial(QuietHandler,directory=str(root))
    server=http.server.ThreadingHTTPServer(('127.0.0.1',port),handler)
    thread=threading.Thread(target=server.serve_forever,daemon=True); thread.start()
    try: yield f'http://127.0.0.1:{port}'
    finally: server.shutdown(); thread.join(timeout=5)

def user(role:str):
    return {'id':f'test-{role}','loginId':f'test-{role}','displayName':f'統合試験 {role}','role':role,'officeId':'kawasaki','officeName':'川崎事業所'}

def init_script(role:str):
    u=json.dumps(user(role),ensure_ascii=False)
    return f"""localStorage.setItem('iss-api-token','part537-test-token');sessionStorage.setItem('iss-api-token','part537-test-token');localStorage.setItem('iss-api-user',JSON.stringify({u}));localStorage.setItem('iss-office-id','kawasaki');localStorage.setItem('iss-office-name','川崎事業所');localStorage.setItem('iss-user-role','{role}');localStorage.setItem('iss-local-access-policy-v365',JSON.stringify({{authenticationRequired:true}}));"""

def overflow(page):
    return page.evaluate("""()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,bodyScroll:document.body.scrollWidth,innerWidth:window.innerWidth,overflow:document.documentElement.scrollWidth>window.innerWidth+4||document.body.scrollWidth>window.innerWidth+4})""")

def main():
    checks=[]; artifacts={}; errors=[]
    def record(name,ok,detail=None):
        item={'name':name,'status':'passed' if ok else 'failed'}
        if detail is not None:item['detail']=detail
        checks.append(item); print(('PASS' if ok else 'FAIL'),name,detail or '')
    base='https://skdg.local'
    def route_handler(route):
        parsed=urlparse(route.request.url)
        if parsed.hostname!='skdg.local':
            route.abort(); return
        rel=unquote(parsed.path).lstrip('/') or 'index.html'
        target=(ROOT/rel).resolve()
        try:
            target.relative_to(ROOT.resolve())
        except ValueError:
            route.fulfill(status=403,body='forbidden'); return
        if not target.is_file():
            route.fulfill(status=404,body='not found'); return
        content_type=mimetypes.guess_type(target.name)[0] or 'application/octet-stream'
        route.fulfill(status=200,body=target.read_bytes(),content_type=content_type)
    def new_page(ctx):
        page=ctx.new_page(); page.route('**/*',route_handler); return page
    with sync_playwright() as pw:
        browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
        # Guest access and role separation
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP')
        ctx.add_init_script(init_script('guest'))
        page=new_page(ctx)
        page.goto(base+'/index.html',wait_until='domcontentloaded'); page.wait_for_timeout(500)
        record('Guest home shows unified intake',page.get_by_text('申請書取込・確認',exact=True).count()>0)
        record('Guest home hides application management',page.locator("a[href*='applications.html']:visible").count()==0)
        page.goto(base+'/pages/application-intake-workflow.html',wait_until='domcontentloaded'); page.wait_for_timeout(500)
        record('Guest can open intake verification', '権限がありません' not in page.locator('body').inner_text())
        record('Guest registration controls hidden',page.locator('#intakeRegisterNew:visible').count()==0)
        page.goto(base+'/pages/applications.html',wait_until='domcontentloaded'); page.wait_for_timeout(500)
        record('Guest direct application access denied','この画面を利用する権限がありません' in page.locator('body').inner_text())
        ctx.close()

        # Office-user end-to-end flow
        ctx=browser.new_context(viewport={'width':1440,'height':1000},locale='ja-JP',accept_downloads=True)
        ctx.add_init_script(init_script('office-user'))
        page=new_page(ctx)
        internal_failures=[]
        page.on('requestfailed',lambda req: internal_failures.append(req.url) if req.url.startswith(base) else None)
        page.goto(base+'/index.html',wait_until='domcontentloaded'); page.wait_for_timeout(500)
        record('Office user home unified entry',page.get_by_text('申請書取込・確認',exact=True).count()>0)
        page.goto(base+'/pages/application-intake-workflow.html',wait_until='domcontentloaded'); page.wait_for_timeout(500)
        record('Office user write mode enabled',page.evaluate("()=>document.documentElement.dataset.intakeWriteAllowed==='true'"))
        csv='''申請年度,2026\n申請番号,12345\n申請日,2026-08-06\n申請者,統合試験申請者\n荷主,統合試験荷主\n船名,TEST VESSEL\n航海番号,V001\n積地,YOKOHAMA\n揚地,KOBE\nコンテナ番号,ABCD1234567\nコンテナ種類,40HC\n\n国連番号,品名,等級,容器等級,容器コード,個数,N/W(kg),G/W(kg),包装要件,許容容量・許容質量\n1170,ETHANOL,3,II,1A1,10,100,120,P001,450 L\n'''
        sample=Path(tempfile.gettempdir())/'part537_application.csv'; sample.write_text(csv,encoding='utf-8')
        page.locator('#intakeFileInput').set_input_files(str(sample)); page.wait_for_timeout(800)
        record('CSV application parsed','危険物 1件' in page.locator('#intakeFileStatus').inner_text())
        record('Application number extracted',page.locator('#intakeApplicationNumber').input_value()=='12345')
        page.locator('#intakeRunCheck').click(); page.wait_for_timeout(300)
        record('Precheck displayed',page.locator('#intakeCheckSection').is_visible())
        record('Office user registration controls visible after precheck',page.locator('#intakeRegisterNew').is_visible())
        page.locator('#intakeReviewer').fill('統合試験確認者')
        page.locator('#intakeRegisterNew').click(); page.wait_for_timeout(500)
        msg=page.locator('#intakeRegisterMessage').inner_text()
        record('Application registered','登録しました' in msg,msg)
        app_id=page.evaluate("""()=>{try{const a=JSON.parse(localStorage.getItem('iss-applications')||'[]');return a[0]?.id||''}catch(e){return''}}""")
        record('Registered application stored',bool(app_id),app_id)
        page.goto(base+'/pages/applications.html',wait_until='domcontentloaded'); page.wait_for_timeout(700)
        record('Application management shows registered case',page.locator('.application-card').count()>=1)
        desktop_over=overflow(page); record('Application management desktop no horizontal overflow',not desktop_over['overflow'],desktop_over)
        page.goto(base+f'/pages/ctu-securing-calculator.html?applicationId={app_id}',wait_until='domcontentloaded'); page.wait_for_timeout(700)
        record('CTU case summary loaded','2026' in page.locator('#ctuCaseSummary').inner_text())
        record('CTU dangerous goods review card visible',page.locator('#ctuCaseReview .ctu-case-review-card').count()==1)
        record('No internal resource request failures',len(internal_failures)==0,internal_failures[:10])
        ctx.close()

        # Mobile view with existing registered data seeded
        ctx=browser.new_context(viewport={'width':390,'height':844},locale='ja-JP')
        ctx.add_init_script(init_script('office-user'))
        ctx.add_init_script("""localStorage.setItem('iss-applications',JSON.stringify([{id:'mobile-case',applicationYear:'2026',applicationNumber:'54321',numberType:'official',status:'received',officeId:'kawasaki',office:'川崎事業所',blockName:'川崎',containerNumber:'MOBI1234567',vesselName:'MOBILE VESSEL',cargoItems:[{id:'cargo-1',unNumber:'1170',originalName:'ETHANOL',hazardClass:'3',packingGroup:'II',containerCode:'1A1',packageCount:10,totalNetMassKg:100,totalGrossMassKg:120,packingInstruction:'P001',allowableCapacityOrMass:'450 L'}],caseData:{cargoItems:[{id:'cargo-1',unNumber:'1170',originalName:'ETHANOL',hazardClass:'3',packingGroup:'II',containerCode:'1A1',packageCount:10,totalNetMassKg:100,totalGrossMassKg:120,packingInstruction:'P001',allowableCapacityOrMass:'450 L'}]}}]));""")
        page=new_page(ctx)
        for rel,name in [('index.html','Home mobile'),('pages/application-intake-workflow.html','Intake mobile'),('pages/applications.html','Applications mobile'),('pages/ctu-securing-calculator.html?applicationId=mobile-case','CTU mobile')]:
            page.goto(base+'/'+rel,wait_until='domcontentloaded'); page.wait_for_timeout(600)
            ov=overflow(page); record(name+' no horizontal overflow',not ov['overflow'],ov)
        record('Mobile application card visible',page.locator('#ctuCaseReview .ctu-case-review-card').count()==1)
        ctx.close(); browser.close()

    failed=[x for x in checks if x['status']=='failed']
    report={'release':'part537','generatedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'status':'failed' if failed else 'passed','passed':len(checks)-len(failed),'total':len(checks),'checks':checks,'manualVerificationRequired':['本番相当PostgreSQLへの接続・マイグレーション','実SMTPによるMFA・招待・再設定メール受信','申請書・写真保存領域の書込・読込・削除・復元','実際のExcel（.xls／.xlsx）様式による取込','社内PC・iPhone／Android実端末とEdge・Chrome・Safariでの確認','50名・150名想定の実負荷試験','バックアップ復元・ロールバック訓練']}
    REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    if failed: raise SystemExit(1)

if __name__=='__main__': main()
