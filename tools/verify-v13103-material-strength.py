from pathlib import Path
import json,sys
ROOT=Path(sys.argv[1] if len(sys.argv)>1 else '.').resolve()
p=ROOT/'data'/'securing-msl-reference.js'
s=p.read_text(encoding='utf-8')
js=s[s.index('const catalog=')+len('const catalog='):s.index(';\n  global.ISS_SECURING_MSL_REFERENCE')]
c=json.loads(js)
checks=[]
def ck(name,cond,detail=''): checks.append((name,bool(cond),detail))
f=c['factors']
for key,val in [('shackle',.5),('fibre',.33),('webSingle',.75),('webReusable',.5),('wireSingle',.8),('wireReusable',.3),('steelBand',.7),('steelBandRecommended',.5),('chain',.5)]:
    ck(f'factor {key}={val}',abs(f[key]['value']-val)<1e-9)
prof={x['id']:x for x in c['roles']['device']['profiles']}
ck('chain Grade8 13mm = 100 kN',prof['chain-g8-13']['candidateMslKn']==100)
for mm in [8,10,12,14,16,18,20]:
    exp=round(40*(mm/10)**2,1); ck(f'wire {mm}mm MSL=40d2',abs(prof[f'wire-oneway-{mm}']['candidateMslKn']-exp)<1e-9)
for mm in [10,12,14,16,18,20,24]:
    exp=round(4*(mm/10)**2,1); ck(f'PP {mm}mm MSL=4d2',abs(prof[f'pp-rope-{mm}']['candidateMslKn']-exp)<1e-9)
sp={x['id']:x for x in c['supportReference']['profiles']}
for id,w,h,L in [('timber-batten-50x100-l22',5,10,2.2),('timber-batten-50x100-l24',5,10,2.4),('timber-batten-50x150-l22',5,15,2.2),('timber-batten-75x100-l22',7.5,10,2.2),('timber-batten-75x150-l22',7.5,15,2.2),('timber-batten-100x100-l22',10,10,2.2)]:
    exp=round(w*w*h/(28*L),2); ck(f'{id} F=n*w2*h/(28L)',abs(sp[id]['candidateStrengthKn']-exp)<0.011)
for id,pf in prof.items():
    if pf.get('manual'): continue
    ck(f'{id} has source',bool(pf.get('source')))
    if pf['material'] in {'steel','wire','chain','web','ppRope','aslash','tygard'}:
        ck(f'{id} auto value stays confirmation-aware',bool(pf.get('referenceOnly') or pf.get('requiresConditionReview') or pf.get('requiresConfirmedEvidence')) or pf.get('factorKey')=='marked')
ck('PET band is manual-only',all(x.get('manual') for x in c['roles']['device']['profiles'] if x['material']=='petBand'))
ck('FRP support is manual-only',all(x.get('manual') for x in c['supportReference']['profiles'] if x['material']=='frp'))
page=(ROOT/'pages'/'ctu-securing-calculator.html').read_text(encoding='utf-8')
ck('visible lashing profile select exists','id="quickMaterialProfile"' in page)
ck('visible support profile select exists','id="quickSupportProfile"' in page)
ck('lashing strength stale default removed','id="quickStrength" min="0" step="0.1" type="number" value=""' in page)
ck('support strength stale default removed','id="quickSupportStrength" min="0" step="0.1" type="number" value=""' in page)
core=(ROOT/'assets/js/ctu-securing-calculator-core-v1398.js').read_text(encoding='utf-8')
ck('calculation result stores selected lashing profile',"materialProfile:$('quickMaterialProfile')?.value||''" in core)
ck('calculation result stores selected support profile',"profile:$('quickSupportProfile')?.value||''" in core)
restore=(ROOT/'assets/js/v1385-ctu-case-restore.js').read_text(encoding='utf-8')
ck('registered result restores lashing profile id','v13103RestoreValue=q.materialProfile' in restore)
ck('registered result restores support profile id','v13103RestoreValue=support.profile' in restore)
for n,ok,d in checks: print(('PASS ' if ok else 'FAIL ')+n+((' :: '+d) if d and not ok else ''))
print(f'TOTAL {len(checks)} / PASS {sum(x[1] for x in checks)} / FAIL {sum(not x[1] for x in checks)}')
if any(not x[1] for x in checks): sys.exit(1)
