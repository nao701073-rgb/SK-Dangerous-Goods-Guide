(()=>{
  'use strict';
  const meta=document.querySelector('meta[name="sk-build"]')?.content||'';
  const manifest=window.SK_BUILD_MANIFEST?.version||'';
  const technicalFamily=value=>{
    const m=String(value||'').trim().match(/^v?(\d+)\.(\d+)(?:\.\d+)?(?:[-+].*)?$/i);
    return m?`v${m[1]}.${m[2]}`:String(value||'').trim();
  };
  // User-facing "Version 1.0 試作版" is a display label and is intentionally
  // independent from the internal technical build. Hotfix patch differences
  // within the same technical family must not create a false mismatch banner.
  if(!meta||!manifest||technicalFamily(meta)===technicalFamily(manifest))return;
  const warning=document.createElement('div');
  warning.className='sk-version-warning';warning.setAttribute('role','alert');
  warning.textContent=`画面版（${meta}）とシステム版（${manifest}）の系統が一致していません。更新ファイルの適用状況を確認してください。`;
  document.body.prepend(warning);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/version-guard.js':'v1.3.9'});
