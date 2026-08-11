(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  let advancedWindow=null;

  function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function textOf(id,fallback='－'){const e=$(id);const v=e?.value??e?.textContent??'';return String(v).trim()||fallback}
  function numOf(id){const n=Number($(id)?.value);return Number.isFinite(n)?n:null}
  function adoptedMsl(){const method=$('quickMethod')?.value||'direct';if(method!=='direct'){const s=numOf('quickStrength');return s!=null&&s>0?s:null}const vals=['quickStrength','quickCargoMsl','quickCtuMsl'].map(numOf);return vals.every(v=>v!=null&&v>0)?Math.min(...vals):null}
  function currentSummaryMarkup(){
    const min=adoptedMsl();
    return `<section class="advanced-popup-overview" aria-label="現在の主な算出条件">
      <div><span>貨物質量</span><strong>${escapeHtml(textOf('quickMass'))} t</strong></div>
      <div><span>参考摩擦係数</span><strong>μ = ${escapeHtml(textOf('quickMu'))}</strong></div>
      <div><span>固縛方法</span><strong>${escapeHtml($('quickMethod')?.selectedOptions?.[0]?.textContent||'－')}</strong></div>
      <div><span>採用MSL</span><strong>${min!=null?`${min.toFixed(1)} kN`:'要確認'}</strong></div>
    </section>`;
  }
  function currentResultMarkup(){
    const status=$('quickStatus');
    const parts=['.quick-status-breakdown','.quick-resistance-rule','.quick-combination-note','.quick-topover-note'].map(sel=>status?.querySelector(sel)?.outerHTML||'').filter(Boolean).join('');
    const body=parts||'<p class="advanced-popup-empty">まだ算出していません。通常画面で「この条件で算出する」を実行すると、ここに抵抗力の内訳と評価式を表示します。</p>';
    return `<details class="advanced-popup-section is-current-result" ${parts?'open':''}><summary><span>現在の算出内訳</span><small>抵抗力・評価式</small></summary><div class="advanced-popup-section__body">${body}</div></details>`;
  }
  function sectionMarkup(section,index){
    const clone=section.cloneNode(true);
    const heading=clone.querySelector(':scope > h2, :scope > h3, :scope > header h2, :scope > header h3, :scope > .ctu-bracing-assist__head h3');
    const title=heading?.textContent?.trim()||`詳細項目 ${index+1}`;
    heading?.remove();
    const basis=section.classList.contains('calculation-basis-panel');
    return `<details class="advanced-popup-section${basis?' is-basis':''}" ${basis?'open':''}><summary><span>${escapeHtml(title.replace(/^詳細設定：/,''))}</span><small>${basis?'計算式・採用ルール':'必要な場合だけ確認・変更'}</small></summary><div class="advanced-popup-section__body">${clone.innerHTML}</div></details>`;
  }
  function cloneAdvancedMarkup(){
    const sections=[...document.querySelectorAll('section.advanced-section')];
    sections.sort((a,b)=>Number(!a.classList.contains('calculation-basis-panel'))-Number(!b.classList.contains('calculation-basis-panel')));
    const markup=sections.map(sectionMarkup);
    if(markup.length)markup.splice(1,0,currentResultMarkup());else markup.push(currentResultMarkup());
    return markup.join('\n');
  }
  function syncPopupControl(control){
    if(!control.id)return;
    const src=$(control.id);if(!src)return;
    if(control.type==='checkbox'||control.type==='radio')control.checked=src.checked;
    else control.value=src.value;
    control.disabled=Boolean(src.disabled);
  }
  function applyToMain(control){
    if(!control.id)return;
    const dst=$(control.id);if(!dst)return;
    if(control.type==='checkbox'||control.type==='radio')dst.checked=control.checked;
    else dst.value=control.value;
    dst.dispatchEvent(new Event('input',{bubbles:true}));
    dst.dispatchEvent(new Event('change',{bubbles:true}));
    window.dispatchEvent(new CustomEvent('sk:ctu-system-applied',{detail:{source:'advanced-window',fields:[control.id]}}));
  }
  function openAdvancedWindow(){
    if(advancedWindow&&!advancedWindow.closed){advancedWindow.focus();return}
    advancedWindow=window.open('','skdgCtuAdvancedSettings','width=1180,height=860,resizable=yes,scrollbars=yes');
    if(!advancedWindow){alert('別ウィンドウを開けませんでした。ブラウザのポップアップ許可をご確認ください。');return}
    const links=[...document.querySelectorAll('head link[rel="stylesheet"]')].map(x=>x.outerHTML).join('\n');
    const styles=[...document.querySelectorAll('head style')].map(x=>x.outerHTML).join('\n');
    advancedWindow.document.open();
    advancedWindow.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(document.baseURI)}"><title>固縛力参考算出 - 計算の詳細</title>${links}${styles}<style>
      body{margin:0;background:#eef4f8;color:#173a5e;font-family:inherit}.advanced-popup-shell{max-width:1180px;margin:0 auto;padding:18px}.advanced-popup-head{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:13px 16px;margin:0 0 14px;background:#0d4f82;color:#fff;border:1px solid #0d4f82;border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,.14)}.advanced-popup-head h1{font-size:1.08rem;margin:0 0 3px;color:#fff}.advanced-popup-head button{flex:0 0 auto;white-space:nowrap;border:1px solid #fff;background:#fff;color:#0d4f82;border-radius:8px;padding:8px 14px;font-weight:800;cursor:pointer}.advanced-popup-note{font-size:.82rem;opacity:.94;line-height:1.5}.advanced-popup-intro{margin:0 0 12px;padding:12px 14px;border:1px solid #b9d3e5;border-radius:10px;background:#f6fbff;line-height:1.65}.advanced-popup-intro strong{color:#0b4e7d}.advanced-popup-overview{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 14px}.advanced-popup-overview>div{padding:10px 12px;border:1px solid #c7d8e5;border-radius:9px;background:#fff}.advanced-popup-overview span{display:block;color:#61778a;font-size:.76rem}.advanced-popup-overview strong{display:block;margin-top:3px;color:#153f63;font-size:.94rem}.advanced-popup-section{margin:0 0 10px;border:1px solid #c8d8e4;border-radius:10px;background:#fff;overflow:hidden}.advanced-popup-section>summary{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:pointer;padding:12px 14px;background:#f7fafc;color:#173f60;font-weight:800;list-style:none}.advanced-popup-section>summary::-webkit-details-marker{display:none}.advanced-popup-section>summary:after{content:'＋';font-size:1.1rem}.advanced-popup-section[open]>summary:after{content:'−'}.advanced-popup-section>summary small{margin-left:auto;color:#6d8090;font-size:.72rem;font-weight:600}.advanced-popup-section.is-basis{border-color:#8bb8d7}.advanced-popup-section.is-basis>summary{background:#eaf4fb;color:#0b4e7d}.advanced-popup-section__body{padding:14px}.advanced-popup-empty{margin:0;color:#61778a;line-height:1.65}.advanced-popup-section__body>.advanced-section{display:block!important;margin:0!important;border:0!important;box-shadow:none!important;padding:0!important}.advanced-popup-section__body .advanced-section[hidden]{display:none!important}.advanced-popup-shell input,.advanced-popup-shell select,.advanced-popup-shell textarea{max-width:100%;box-sizing:border-box}@media(max-width:760px){.advanced-popup-shell{padding:10px}.advanced-popup-head{align-items:flex-start}.advanced-popup-overview{grid-template-columns:repeat(2,minmax(0,1fr))}.advanced-popup-section>summary{align-items:flex-start;flex-wrap:wrap}.advanced-popup-section>summary small{width:100%;margin-left:0}}
    </style></head><body><main class="advanced-popup-shell"><div class="advanced-popup-head"><div><h1>計算の詳細・専門設定</h1><div class="advanced-popup-note">通常は変更不要です。計算式・係数・MSL採用理由を確認したい場合だけ使用してください。</div></div><button type="button" id="closeAdvancedWindow">閉じる</button></div><div class="advanced-popup-intro"><strong>通常画面の入力だけで算出できます。</strong> この画面では、裏側で使っている計算式・方向別係数・MSLの採用方法・専門条件を確認できます。入力値を変更した場合は元の画面へ即時反映されます。</div>${currentSummaryMarkup()}${cloneAdvancedMarkup()}</main></body></html>`);
    advancedWindow.document.close();
    const doc=advancedWindow.document;
    doc.querySelectorAll('input,select,textarea').forEach(control=>{syncPopupControl(control);control.addEventListener('input',()=>applyToMain(control));control.addEventListener('change',()=>applyToMain(control))});
    doc.querySelectorAll('button[id]').forEach(button=>{if(button.id==='closeAdvancedWindow')return;button.addEventListener('click',event=>{const original=$(button.id);if(original){event.preventDefault();original.click();setTimeout(()=>doc.querySelectorAll('input,select,textarea').forEach(syncPopupControl),30)}})});
    doc.getElementById('closeAdvancedWindow')?.addEventListener('click',()=>advancedWindow.close());
    advancedWindow.focus();
    window.dispatchEvent(new CustomEvent('sk:ctu-advanced-window-opened'));
  }
  function bind(){
    const button=$('toggleAdvanced');if(!button||button.dataset.v1375Bound==='1')return;
    button.dataset.v1375Bound='1';button.textContent='計算の詳細を見る';button.setAttribute('aria-expanded','false');button.setAttribute('title','計算式・係数・MSL採用理由・専門設定を別画面で確認');
    document.addEventListener('click',event=>{const target=event.target.closest?.('#toggleAdvanced');if(!target)return;event.preventDefault();event.stopImmediatePropagation();openAdvancedWindow()},true);
    document.body.classList.remove('show-advanced');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.SKCTUOpenAdvancedWindow=openAdvancedWindow;
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1376-ctu-advanced-window.js':'v1.3.105'});
})();
