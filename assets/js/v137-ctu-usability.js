(()=>{
'use strict';
if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const text=(id, fallback='―')=>$(id)?.selectedOptions?.[0]?.textContent?.trim()||$(id)?.value?.trim()||fallback;
const num=id=>Math.max(0,Number($(id)?.value)||0);

function makeCollapsible(section, label){
 if(!section||section.dataset.v137Collapsible==='1')return;section.dataset.v137Collapsible='1';section.classList.add('v137-collapsible','v137-is-collapsed');
 const heading=section.querySelector(':scope > h2,:scope > .part541-heading,:scope > .msl-point-registry__head,:scope > .case-section__heading')||section.firstElementChild;
 heading?.classList?.add('v137-collapse-head');
 const btn=document.createElement('button');btn.type='button';btn.className='btn v137-collapse-toggle';btn.setAttribute('aria-expanded','false');btn.textContent=`${label}を開く`;
 (heading||section).append(btn);btn.addEventListener('click',()=>{const closed=section.classList.toggle('v137-is-collapsed');btn.setAttribute('aria-expanded',String(!closed));btn.textContent=closed?`${label}を開く`:`${label}を閉じる`;});
}
function initCollapsibles(){
 makeCollapsible($('ctuCommonCasePanel'),'登録済み案件');
 makeCollapsible(document.querySelector('.msl-point-registry'),'取付点MSL詳細台帳');
 makeCollapsible($('fieldCargoUnitPanel'),'現場貨物ユニット・拘束構成');
 makeCollapsible($('deficiencySupportPanel'),'不足内容・現場説明サポート');
}

function ensureDefaults(){
 const ctu=$('quickCtu');if(ctu && !new URLSearchParams(location.search).get('applicationId')){ctu.value='container';ctu.dispatchEvent(new Event('change',{bubbles:true}));}
 const cargo=$('quickCargoDescription');if(cargo && !new URLSearchParams(location.search).get('applicationId'))cargo.value='';
 const title=$('ctuNewCaseTitle');if(title)title.removeAttribute('placeholder');
}

const materialMap={aslash:'aslash',web:'web',steel:'steel',wire:'wire',tygard:'tygard',pet:'web',pp:'other',other:'other'};
function selectedProfile(){
 const cat=window.ISS_SECURING_MSL_REFERENCE;const material=materialMap[$('quickMaterial')?.value]||'';
 if(!cat||!material)return null;const profiles=cat.roles?.device?.profiles||[];const mode=$('quickTransport')?.value||'';
 return profiles.find(p=>p.material===material && (!p.railOnly||['rail','railShock'].includes(mode)))||null;
}
function syncDeviceEstimator(){
 const map=materialMap[$('quickMaterial')?.value]||'';const sel=$('quickDeviceMslMaterial');
 // v1.3.108: calc/transport synchronization may call this even when the material is unchanged.
 // A duplicate change event must not be emitted because downstream MSL logic correctly clears the old MSL only for a real material change.
 if(sel&&map&&[...sel.options].some(o=>o.value===map)&&sel.value!==map){sel.value=map;sel.dispatchEvent(new Event('change',{bubbles:true}));}
 setTimeout(refreshMslAssist,0);
}
function refreshMslAssist(){const box=$('v137MslAssist');if(box)box.remove();}


const SRC={
 ctuTransport:'../references/originals/ctu-code-ja.pdf#page=17',
 ctuSeaAreas:'../references/originals/ctu-code-ja.pdf#page=18',
 ctuDirectFriction:'../references/originals/ctu-code-ja.pdf#page=81',
 ctuMsl:'../references/originals/ctu-code-ja.pdf#page=85',
 ctuWebbing:'../references/originals/ctu-code-ja.pdf#page=86',
 ctuModularLashing:'../references/originals/ctu-code-ja.pdf#page=89',
 ctuPrinciple:'../references/originals/ctu-code-ja.pdf#page=93',
 ctuCombination:'../references/originals/ctu-code-ja.pdf#page=94',
 ctuDirect:'../references/originals/ctu-code-ja.pdf#page=98',
 ctuAssessment:'../references/originals/ctu-code-ja.pdf#page=101',
 ctuFriction:'../references/originals/ctu-code-ja.pdf#page=109',
 ctuFrictionConditions:'../references/originals/ctu-code-ja.pdf#page=110',
 cssTable1:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=3',
 cssScope:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=2',
 cssAdvanced:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=5',
 cssTable2:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=5',
 cssTable3:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=7',
 cssTable4:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=8',
 cssTable5:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=9',
 cssTable6:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=10',
 cssAlternative:'https://www.register-iri.com/wp-content/uploads/MSC.1-Circ.1623.pdf#page=11',
 cssPart478Index:'../references/originals/css-code-annex13-part478-source-index.html'
};
function source(url,label){return url?{url,label:label||'原典ページへジャンプ'}:null}
function sourceList(...items){return items.flat().filter(Boolean)}
function transportBasis(label){
 const t=String(label||'');
 if(/海域A/.test(t))return {text:'CTU Code 第5章5.3 海上輸送表：海域Aは Hs ≤ 8 m。加速度係数は縦方向 cx=0.3、横方向 cy=0.5。',sources:sourceList(source(SRC.ctuTransport,'原典ページへジャンプ'))};
 if(/海域B/.test(t))return {text:'CTU Code 第5章5.3 海上輸送表：海域Bは 8 m < Hs ≤ 12 m。加速度係数は縦方向 cx=0.3、横方向 cy=0.7。※「標準」は本システムの初期選択表記です。',sources:sourceList(source(SRC.ctuTransport,'原典ページへジャンプ'))};
 if(/海域C/.test(t))return {text:'CTU Code 第5章5.3 海上輸送表：海域Cは Hs > 12 m。加速度係数は縦方向 cx=0.4、横方向 cy=0.8。',sources:sourceList(source(SRC.ctuTransport,'原典ページへジャンプ'))};
 if(/道路/.test(t))return {text:'CTU Code 第5章5.3 道路輸送の加速度係数表を参照。',sources:sourceList(source(SRC.ctuTransport,'原典ページへジャンプ'))};
 if(/鉄道/.test(t))return {text:'CTU Code 第5章5.3 鉄道輸送（複合輸送）の加速度係数表を参照。',sources:sourceList(source(SRC.ctuTransport,'原典ページへジャンプ'))};
 return {text:'画面選択値',sources:[]};
}
function frictionBasis(d){
 const condition=String(d.surfaceCondition||'');
 const surface=`${d.cargoSurface||''} ${d.floorSurface||''}`;
 if(/霜|氷|雪|油|グリース|滑り|不明/.test(condition)||/ゴム/.test(surface))return {text:'CTU Code Annex 7 Appendix 2。例外条件・ゴム等を含むため PDF page 110 を参照。',sources:sourceList(source(SRC.ctuFrictionConditions,'原典ページへジャンプ'))};
 return {text:'CTU Code Annex 7 Appendix 2 推奨摩擦係数表（PDF page 109）。',sources:sourceList(source(SRC.ctuFriction,'原典ページへジャンプ'))};
}
function basisData(){
 const mu=num('quickMu'), direct=$('quickMethod')?.value==='direct', effective=direct?mu*.75:mu;
 const device=num('quickStrength'),cargo=num('quickCargoMsl'),ctu=num('quickCtuMsl');const positives=[device,cargo,ctu].filter(v=>v>0);const adopted=positives.length?Math.min(...positives):0;
 const supportOn=$('v13UseSupport')?.checked||$('quickMaterialCategory')?.value==='support'||$('quickMaterialCategory')?.value==='combined';
 return {
  transport:text('quickTransport'),ctu:text('quickCtu'),cargo:text('quickCargoDescription','未入力'),mass:num('quickMass'),
  cargoSurface:text('v1CargoSurface'),floorSurface:text('v1FloorSurface'),surfaceCondition:text('v1SurfaceCondition'),mu,effectiveMu:effective,direct,
  method:text('quickMethod'),material:text('quickMaterial'),deviceMsl:device,count:num('quickCount'),mslTotal:device*num('quickCount'),cargoMsl:cargo,ctuMsl:ctu,adoptedMsl:adopted,angle:num('quickAngle'),
  supportOn,supportMaterial:text('quickSupportMaterial'),supportCount:num('quickSupportCount'),supportStrength:num('quickSupportStrength'),supportTotal:num('quickSupportCount')*num('quickSupportStrength'),
  containerReference:window.SKCTUContainerReference?.snapshot?.()||null
 };
}
function renderBasisSummary(){
 const d=basisData();let box=$('v137BasisSummary');const result=$('resultPanel')||document.querySelector('.result-panel')||$('metrics')?.parentElement;if(!result)return;
 if(!box){box=document.createElement('section');box.id='v137BasisSummary';box.className='v137-basis-summary';result.append(box);}
 box.innerHTML=`<div class="v137-basis-head"><div><strong>この参考算出に使用した主な根拠</strong><p>画面には要点だけを表示します。詳細は別ウィンドウで確認できます。</p></div><button class="btn" id="v137OpenBasis" type="button">算出根拠を開く</button></div><div class="v137-basis-chips"><span>${esc(d.transport)}</span><span>${esc(d.ctu)}</span>${d.containerReference?.containerLabel?`<span>${esc(d.containerReference.containerLabel)}</span>`:''}<span>摩擦 μ=${d.mu.toFixed(2)}${d.direct?` → 計算時 ${d.effectiveMu.toFixed(3)}`:''}</span><span>${esc(d.material)} ${d.deviceMsl.toFixed(1)} kN×${d.count.toFixed(0)}本</span><span>採用MSL ${d.adoptedMsl.toFixed(1)} kN</span><span>鉛直角 ${d.angle.toFixed(0)}°</span>${d.supportOn?`<span>支保 ${d.supportStrength.toFixed(1)} kN×${d.supportCount.toFixed(0)}</span>`:''}</div>`;
 $('v137OpenBasis')?.addEventListener('click',openBasisWindow);
}
function openBasisWindow(){
 const d=basisData();const w=window.open('','_blank');if(!w)return;const cr=d.containerReference;
 const tb=transportBasis(d.transport),fb=frictionBasis(d);
 const weakestSources=sourceList(
  source(SRC.ctuDirect,'原典ページへジャンプ（CTU Code）'),
  source(SRC.cssTable1,'原典ページへジャンプ（CSS Code）')
 );
 const rows=[
  ['輸送条件',d.transport,tb.text,tb.sources],
  ['CTU構造区分',d.ctu,'画面選択値。CTU構造区分自体には原典ジャンプを表示しません。',[]],
  ...(cr?.containerLabel?[
    ['コンテナサイズ・種類',cr.containerLabel,'入力者選択値。写真寸法補助の基準として使用。',[]],
    ['参考内寸（L×W×H）',cr.insideDimensionsM?`${Number(cr.insideDimensionsM.l).toFixed(3)} × ${Number(cr.insideDimensionsM.w).toFixed(3)} × ${Number(cr.insideDimensionsM.h).toFixed(3)} m`:'―','メーカー例示寸法。実機仕様を優先。原典ジャンプは表示しません。',[]],
    ['貨物寸法（L×W×H）',cr.cargoDimensionsM?`${Number(cr.cargoDimensionsM.length||0).toFixed(3)} × ${Number(cr.cargoDimensionsM.width||0).toFixed(3)} × ${Number(cr.cargoDimensionsM.height||0).toFixed(3)} m`:'―','申請書・実測・写真AI候補。',[]]
  ]:[]),
  ['貨物質量',`${d.mass.toFixed(3)} t`,'申請書候補／手入力。',[]],
  ['貨物名・品名',d.cargo,'申請書候補／手入力。',[]],
  ['接触面',`${d.cargoSurface} × ${d.floorSurface}（${d.surfaceCondition}）`,fb.text,fb.sources],
  ['静止摩擦係数',d.mu.toFixed(2),fb.text,fb.sources],
  ['計算使用摩擦係数',d.effectiveMu.toFixed(3),d.direct?'CTU Code Annex 7 2.2.2.2：直接固定では適用可能な静摩擦の75%を動摩擦係数として使用。':'静止摩擦係数を使用。',d.direct?sourceList(source(SRC.ctuDirectFriction,'原典ページへジャンプ')):fb.sources],
  ['固縛方法',d.method,'画面選択値。固縛方法自体には原典ジャンプを表示しません。',[]],
  ['固縛材',d.material,'CSS Code Annex 13 4.1-4.4 / Table 1。材質別MSL換算・表示MSL・直列要素の最小MSLを確認。',sourceList(source(SRC.cssTable1,'原典ページへジャンプ'))],
  ['1本当たりMSL',`${d.deviceMsl.toFixed(1)} kN`,'CSS Code Annex 13 4.2-4.4 / Table 1。刻印・証明済みMSLまたは破断強度からの換算を優先。',sourceList(source(SRC.cssTable1,'原典ページへジャンプ'))],
  ['本数',`${d.count.toFixed(0)} 本`,'現場確認。',[]],
  ['MSL合計表示',`${d.mslTotal.toFixed(1)} kN`,'1本当たりMSL×本数の表示補助。',[]],
  ['貨物側取付部MSL',`${d.cargoMsl.toFixed(1)} kN`,'CTU Code Annex 7 4.3.2.1：貨物側・CTU側の固定位置を含む最弱要素が実効強度を制限。CSS Code Annex 13 4.4：直列要素は最小MSLを採用。実機の刻印・図面・仕様・試験成績を優先。',weakestSources],
  ['CTU側固縛点MSL',`${d.ctuMsl.toFixed(1)} kN`,'CTU Code Annex 7 4.3.2.1：CTU固定位置を含む最弱要素が実効強度を制限。CSS Code Annex 13 4.4では deckeye を含む直列要素の最小MSLを採用。CTU仕様・承認資料を優先。',weakestSources],
  ['採用MSL',`${d.adoptedMsl.toFixed(1)} kN`,'固縛材・貨物側取付部・CTU側固縛点の確認値のうち最小値を採用。CTU Code Annex 7 4.3.2.1およびCSS Code Annex 13 4.4に対応。',weakestSources]
 ];
 if(d.direct)rows.push(['鉛直角',`${d.angle.toFixed(0)}°`,'CTU Code Annex 7 4.3.2.2：滑り防止の直接ラッシングは鉛直角30°～60°が好ましい。',sourceList(source(SRC.ctuDirect,'原典ページへジャンプ'))]);
 if(d.supportOn)rows.push(['支保・当て材',`${d.supportMaterial} ${d.supportStrength.toFixed(1)} kN×${d.supportCount.toFixed(0)} = ${d.supportTotal.toFixed(1)} kN`,d.direct?'CTU Code Annex 7 4.1.6：木製根止め材と直接ラッシングを併用する場合、より堅い根止め材が予想荷重に単独で耐えられるようにする。':'CTU Code Annex 7 4.1.3-4.1.6：直接固定・摩擦固定・支保の成立条件を確認。',sourceList(source(d.direct?SRC.ctuCombination:SRC.ctuPrinciple,'原典ページへジャンプ'))]);
 const absolute=url=>{try{return new URL(url,location.href).href}catch(_e){return url||''}};
 const jump=sources=>{const list=Array.isArray(sources)?sources.filter(Boolean):[];if(!list.length)return'';return `<div class="jump-list">${list.map(item=>`<a class="jump-btn" href="${absolute(item.url)}" target="_blank" rel="noopener">${esc(item.label||'原典ページへジャンプ')}</a>`).join('')}</div>`};
 w.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>参考算出根拠</title><style>body{font-family:Arial,'Noto Sans JP',sans-serif;margin:28px;color:#14273b}h1{font-size:22px}p{line-height:1.7}table{width:100%;border-collapse:collapse;margin:18px 0}th,td{border:1px solid #c7d5e2;padding:9px;text-align:left;vertical-align:top}th{background:#eef5fb}.jump-list{display:flex;flex-wrap:wrap;gap:6px}.jump-btn{display:inline-flex;align-items:center;justify-content:center;padding:8px 11px;border:1px solid #126fbd;border-radius:8px;background:#126fbd;color:#fff;text-decoration:none;font-weight:700}.note{background:#fff8df;border-left:4px solid #c28a00;padding:12px}@media(max-width:700px){body{margin:14px}table{font-size:12px;display:block;overflow-x:auto}.jump-btn{font-size:11px;padding:7px 9px}}</style></head><body><h1>固縛力参考算出 ― 使用根拠</h1><p class="note">本表示は参考算出に使用した入力値・候補値の追跡用です。MSL・取付点強度・施工条件は、刻印、メーカー仕様、証明書、試験成績、Cargo Securing Manual等の確認済み資料を優先してください。「原典ページへジャンプ」は、各項目を直接確認できる当該ページだけに表示します。海域A/B/Cの根拠はCTU Code第5章5.3、CSS CodeのMSL根拠はPart478で照合したMSC.1/Circ.1623 Annex 13 4節/Table 1を使用しています。</p><table><thead><tr><th>項目</th><th>算出使用値</th><th>根拠・確認方法</th><th>原典</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td><td>${jump(r[3])}</td></tr>`).join('')}</tbody></table></body></html>`);w.document.close();
}
function init(){initCollapsibles();ensureDefaults();syncDeviceEstimator();refreshMslAssist();['quickMaterial','quickTransport'].forEach(id=>$(id)?.addEventListener('change',syncDeviceEstimator));['quickStrength','quickCount'].forEach(id=>$(id)?.addEventListener('input',refreshMslAssist));$('quickCalcBtn')?.addEventListener('click',()=>setTimeout(renderBasisSummary,0));window.addEventListener('sk:v137-friction-updated',()=>{if($('v137BasisSummary'))renderBasisSummary()});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
