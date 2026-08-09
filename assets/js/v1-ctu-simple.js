(()=>{
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root=$('quickEntryPanel'); if(!root)return;
  const entry=root.querySelector('.quick-flow')||root.querySelector('.quick-entry'); if(!entry)return;
  const steps=[...entry.querySelectorAll('.quick-step')];
  if(steps[0]) steps[0].querySelector('.quick-step__head').innerHTML='<span class="quick-step__num">1</span>輸送条件と貨物';
  if(steps[1]) steps[1].querySelector('.quick-step__head').innerHTML='<span class="quick-step__num">4</span>不足項目だけ補う';
  if(steps[2]) steps[2].querySelector('.quick-step__head').innerHTML='<span class="quick-step__num">5</span>参考算出';

  // Friction is selected through the simple material/contact step, not by raw numeric controls.
  ['quickFriction','quickMu'].forEach(id=>{const el=$(id);const holder=el?.closest('div');if(holder)holder.hidden=true});
  // Device MSL, cargo-side attachment MSL and CTU-side attachment MSL are separate values.
  // Do not mirror one into another; the minimum confirmed value is the limiting MSL.

  // Application import shortcut inside step 1. Existing importer remains the source of truth.
  const step1Body=steps[0]?.querySelector('.quick-step__body');
  if(step1Body && !$('v1ApplicationImport')){
    const importBox=document.createElement('div');
    importBox.id='v1ApplicationImport';
    importBox.className='v1-inline-actions';
    importBox.innerHTML='<button class="btn" id="v1ImportApplication" type="button">申請書から貨物情報を読み込む</button><span class="v1-import-status" id="v1ImportStatus">申請書がある場合は、分かる項目だけ候補入力できます。</span>';
    step1Body.prepend(importBox);
    $('v1ImportApplication')?.addEventListener('click',()=>{
      const input=$('ctuExcelFile');
      if(input){ input.click(); $('v1ImportStatus').textContent='申請書を選択してください。取れない項目は後から手入力できます。'; }
      else $('v1ImportStatus').textContent='この環境では申請書読取を利用できません。必要項目を手入力してください。';
    });
    window.addEventListener('sk:ctu-excel-imported',()=>{
      const s=$('v1ImportStatus'); if(s)s.textContent='申請書の候補値を反映しました。内容を確認し、足りない項目だけ補ってください。';
    });
  }

  const photo=document.createElement('section');
  photo.className='v1-photo-step'; photo.id='v1PhotoStep';
  photo.innerHTML=`<div class="v1-step-head"><span class="v1-step-no">2</span><span>写真から入力を始める</span></div>
  <div class="v1-step-body"><div class="v1-photo-layout">
    <div><div class="v1-photo-picker" id="v1PhotoPicker"><div id="v1PhotoEmpty"><strong>貨物・固縛状態の写真を撮る／選ぶ</strong><br><button class="btn primary" id="v1PhotoButton" type="button">写真を撮る・選ぶ</button><p class="v1-photo-help">写真を見ながら材質・固縛材・本数・表示MSLなどを数タップで入力します。</p></div><img id="v1PhotoPreview" alt="固縛状態の確認写真" hidden></div><input id="v1PhotoInput" type="file" accept="image/*,.heic,.heif,image/heic,image/heif" capture="environment" hidden></div>
    <div class="v1-choice-grid">
      <label>写真で見える固縛材<select id="v1LashingType"><option value="">選択してください</option><option value="webbing">ベルト・ウェビング</option><option value="chain">チェーン</option><option value="wire">ワイヤ・ロープ</option><option value="tygard">TY-GARD等</option><option value="support">支保・当て材</option><option value="other">その他</option></select></label>
      <label>本数・個数<input id="v1LashingCount" type="number" min="0" step="1" placeholder="例：4"></label>
      <label>表示されているMSL（kN）<input id="v1VisibleMsl" type="number" min="0" step="0.1" placeholder="例：20"></label>
      <label>鉛直角のおおよそ<select id="v1Angle"><option value="">選択してください</option><option value="30">約30°</option><option value="45">約45°</option><option value="60">約60°</option><option value="75">約75°</option></select></label>
    </div></div><p class="v1-photo-help">写真からの入力は候補です。見えない項目は空欄のままで構いません。算出に必要な不足項目だけ次の画面で補います。</p></div>`;
  if(steps[1]) entry.insertBefore(photo,steps[1]); else entry.append(photo);

  const contact=document.createElement('section');
  contact.className='v1-contact-step'; contact.id='v1ContactStep';
  contact.innerHTML=`<div class="v1-step-head"><span class="v1-step-no">3</span><span>貨物底面とCTU床面</span></div>
  <div class="v1-step-body"><div class="v1-contact-grid">
    <label>貨物・パレット側<select id="v1CargoSurface"><option value="sawnWood">木・木製パレット（粗面）</option><option value="planedWood">平滑な木材</option><option value="plasticPallet">プラスチックパレット</option><option value="steelCrate">鋼製容器・鋼製架台</option><option value="rubber">ゴム面／滑り止め材</option><option value="other">その他・不明</option></select></label>
    <label>床・接触面側<select id="v1FloorSurface"><option value="plywood">合板・木質床</option><option value="groovedAluminium">溝付きアルミ床</option><option value="stainlessSteel">ステンレス・鋼板</option><option value="rubber">ゴムマット</option><option value="other">その他・不明</option></select></label>
    <label>表面状態<select id="v1SurfaceCondition"><option value="dry">乾燥・清浄</option><option value="wet">濡れている（清浄）</option><option value="unclean">清掃不十分・異物あり</option><option value="snow">霜・氷・雪</option><option value="oil">油・グリース・滑りシート</option></select></label>
  </div><div class="v1-mu-output"><div><span>CTU Code 参考摩擦係数</span><strong id="v1MuValue">μ = 0.45</strong></div><small id="v1MuNote"></small><div class="v137-source-actions"><a class="btn" href="https://wiki.unece.org/spaces/TransportSustainableCTUCode/pages/23102057/Appendix+2.+Friction+factors" target="_blank" rel="noopener">CTU Code 原典（摩擦係数）</a></div></div></div>`;
  if(steps[1]) entry.insertBefore(contact,steps[1]); else entry.append(contact);

  // CTU Code Annex 7, Appendix 2: recommended STATIC friction factors for swept-clean surfaces.
  const friction={
    'sawnWood|plywood':{dry:.45,wet:.45},'sawnWood|groovedAluminium':{dry:.40,wet:.40},'sawnWood|stainlessSteel':{dry:.30,wet:.30},
    'planedWood|plywood':{dry:.30,wet:.30},'planedWood|groovedAluminium':{dry:.25,wet:.25},'planedWood|stainlessSteel':{dry:.20,wet:.20},
    'plasticPallet|plywood':{dry:.20,wet:.20},'plasticPallet|groovedAluminium':{dry:.15,wet:.15},'plasticPallet|stainlessSteel':{dry:.15,wet:.15},
    'steelCrate|plywood':{dry:.45,wet:.45},'steelCrate|groovedAluminium':{dry:.30,wet:.30},'steelCrate|stainlessSteel':{dry:.20,wet:.20}
  };
  function coefficient(){
    const a=$('v1CargoSurface')?.value||'other',b=$('v1FloorSurface')?.value||'other',c=$('v1SurfaceCondition')?.value||'dry';
    let mu=(a==='rubber'||b==='rubber')?.60:(friction[`${a}|${b}`]?.[c==='wet'?'wet':'dry'] ?? .30);
    if(c==='unclean')mu=Math.min(mu,.30);
    if(c==='snow')mu=Math.min(mu,.20);
    if(c==='oil')mu=.10;
    return Math.max(0,Math.round(mu*100)/100);
  }
  function syncMu(){
    const mu=coefficient(),condition=$('v1SurfaceCondition')?.value||'dry';
    if($('quickMu'))$('quickMu').value=mu.toFixed(2);
    if($('quickFriction'))$('quickFriction').value=condition==='oil'?'oil':condition==='snow'?'snow':condition==='unclean'?'unclean':'verified';
    if($('v1MuValue'))$('v1MuValue').textContent=`μ = ${mu.toFixed(2)}`;
    const direct=$('quickMethod')?.value==='direct';
    const dyn=(mu*.75).toFixed(3);
    const conditionText=condition==='oil'?'油・グリース等：0.10':condition==='snow'?'霜・氷・雪：0.20以下':condition==='unclean'?'清掃不十分：0.30以下':'CTU Code Appendix 2 の静止摩擦係数';
    if($('v1MuNote'))$('v1MuNote').textContent=`${conditionText}。${direct?`直接固縛では計算時に75%（μ=${dyn}）を使用します。`:'トップオーバー／支保では静止摩擦係数を使用します。'} 候補値は現場状態を確認して採用してください。`;
    ['quickMu','quickFriction'].forEach(id=>$(id)?.dispatchEvent(new Event('change',{bubbles:true})));
    window.dispatchEvent(new CustomEvent('sk:v137-friction-updated',{detail:{mu,condition,dynamic:direct?mu*.75:mu}}));
  }
  ['v1CargoSurface','v1FloorSurface','v1SurfaceCondition','quickMethod'].forEach(id=>$(id)?.addEventListener('change',syncMu)); syncMu();

  // Photo preview and quick sync.
  $('v1PhotoButton')?.addEventListener('click',()=>$('v1PhotoInput')?.click());
  $('v1PhotoInput')?.addEventListener('change',e=>{
    const f=e.target.files?.[0]; if(!f)return; const img=$('v1PhotoPreview'),empty=$('v1PhotoEmpty');
    const url=URL.createObjectURL(f); img.src=url; img.hidden=false; if(empty)empty.hidden=true;
    img.onload=()=>URL.revokeObjectURL(url);
  });
  function set(id,value){const el=$(id);if(!el||value===''||value==null)return;el.value=String(value);el.dispatchEvent(new Event('change',{bubbles:true}));el.dispatchEvent(new Event('input',{bubbles:true}))}
  $('v1LashingCount')?.addEventListener('input',e=>set('quickCount',e.target.value));
  $('v1VisibleMsl')?.addEventListener('input',e=>set('quickStrength',e.target.value));
  $('v1Angle')?.addEventListener('change',e=>set('quickAngle',e.target.value));
  $('v1LashingType')?.addEventListener('change',e=>{
    const v=e.target.value;
    if(v==='support')set('quickMaterialCategory','support'); else if(v)set('quickMaterialCategory','tensile');
    const q=$('quickMaterial'); if(!q||!v)return;
    const needle={webbing:['web','belt','polyester'],chain:['chain'],wire:['wire','rope'],tygard:['ty','gard']}[v]||[];
    const opt=[...q.options].find(o=>needle.some(n=>(o.textContent+o.value).toLowerCase().includes(n))); if(opt)set('quickMaterial',opt.value);
  });

  // Make the visible result wording explicitly reference-only.
  const calc=$('quickCalcBtn'); if(calc)calc.textContent='参考算出する';
  const status=$('quickStatus'); if(status && !status.textContent.includes('参考'))status.textContent='分かる項目を入力し、「参考算出する」を押してください。';
})();
