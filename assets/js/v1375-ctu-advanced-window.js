(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  let advancedWindow=null;

  function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function cloneAdvancedMarkup(){
    return [...document.querySelectorAll('.advanced-section')].map(section=>section.outerHTML).join('\n');
  }
  function syncPopupControl(control){
    if(!control.id)return;
    const src=$(control.id);if(!src)return;
    if(control.type==='checkbox'||control.type==='radio')control.checked=src.checked;
    else control.value=src.value;
    if(src.disabled)control.disabled=true;
  }
  function applyToMain(control){
    if(!control.id)return;
    const dst=$(control.id);if(!dst)return;
    if(control.type==='checkbox'||control.type==='radio')dst.checked=control.checked;
    else dst.value=control.value;
    dst.dispatchEvent(new Event('input',{bubbles:true}));
    dst.dispatchEvent(new Event('change',{bubbles:true}));
  }
  function openAdvancedWindow(){
    if(advancedWindow&&!advancedWindow.closed){advancedWindow.focus();return}
    advancedWindow=window.open('','skdgCtuAdvancedSettings','width=1120,height=820,resizable=yes,scrollbars=yes');
    if(!advancedWindow){alert('別ウィンドウを開けませんでした。ブラウザのポップアップ許可をご確認ください。');return}
    const links=[...document.querySelectorAll('head link[rel="stylesheet"]')].map(x=>x.outerHTML).join('\n');
    const styles=[...document.querySelectorAll('head style')].map(x=>x.outerHTML).join('\n');
    advancedWindow.document.open();
    advancedWindow.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="${escapeHtml(document.baseURI)}"><title>固縛力参考算出 - 詳細設定</title>${links}${styles}<style>body{margin:0;background:#eef4f8;color:#173a5e}.advanced-popup-shell{max-width:1180px;margin:0 auto;padding:18px}.advanced-popup-head{position:sticky;top:0;z-index:1000;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;margin:0 0 14px;background:#0d4f82;color:#fff;border-radius:10px;box-shadow:0 3px 12px rgba(0,0,0,.14)}.advanced-popup-head h1{font-size:1.05rem;margin:0;color:#fff}.advanced-popup-head button{border:1px solid #fff;background:#fff;color:#0d4f82;border-radius:8px;padding:8px 14px;font-weight:800;cursor:pointer}.advanced-section{display:block!important}.advanced-section[hidden]{display:none!important}.advanced-popup-shell>.advanced-section{margin-bottom:14px}.advanced-popup-note{font-size:.84rem;opacity:.92}</style></head><body><main class="advanced-popup-shell"><div class="advanced-popup-head"><div><h1>詳細設定</h1><div class="advanced-popup-note">変更内容は元の「固縛力参考算出」画面へ即時反映されます。</div></div><button type="button" id="closeAdvancedWindow">閉じる</button></div>${cloneAdvancedMarkup()}</main></body></html>`);
    advancedWindow.document.close();
    const doc=advancedWindow.document;
    doc.querySelectorAll('input,select,textarea').forEach(control=>{
      syncPopupControl(control);
      control.addEventListener('input',()=>applyToMain(control));
      control.addEventListener('change',()=>applyToMain(control));
    });
    doc.querySelectorAll('button[id]').forEach(button=>{
      if(button.id==='closeAdvancedWindow')return;
      button.addEventListener('click',event=>{
        const original=$(button.id);if(original){event.preventDefault();original.click();setTimeout(()=>{doc.querySelectorAll('input,select,textarea').forEach(syncPopupControl)},30)}
      });
    });
    doc.getElementById('closeAdvancedWindow')?.addEventListener('click',()=>advancedWindow.close());
    advancedWindow.focus();
  }
  function bind(){
    const button=$('toggleAdvanced');if(!button||button.dataset.v1375Bound==='1')return;
    button.dataset.v1375Bound='1';
    button.textContent='詳細設定を表示';
    button.setAttribute('aria-expanded','false');
    // Capture phase blocks the legacy same-page toggle listener.
    document.addEventListener('click',event=>{
      const target=event.target.closest?.('#toggleAdvanced');if(!target)return;
      event.preventDefault();event.stopImmediatePropagation();openAdvancedWindow();
    },true);
    document.body.classList.remove('show-advanced');
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  window.SKCTUOpenAdvancedWindow=openAdvancedWindow;
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1375-ctu-advanced-window.js':'v1.3.75'});
})();
