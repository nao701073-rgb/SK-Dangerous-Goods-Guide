(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='user-settings'||document.getElementById('v12PhotoAiPreference'))return;const api=window.SKDGUserPreferencesV12;if(!api)return;
  const base=document.getElementById('v101UsabilityPanel')?.querySelector('.panel-body')||document.querySelector('.settings-page .panel .panel-body');if(!base)return;
  const row=document.createElement('label');row.id='v12PhotoAiPreference';row.className='settings-row settings-row--toggle';row.innerHTML='<div><strong>写真撮影後、AI候補へ自動で移動</strong><p class="v101-setting-note">固縛力参考算出で写真を撮影・選択した後、候補が表示された位置へ自動で移動します。</p></div><span class="switch"><input id="v12AutoAiFocus" type="checkbox"><span class="switch-slider"></span></span>';
  base.append(row);const box=document.getElementById('v12AutoAiFocus');box.checked=api.read().autoAiFocus!==false;box.addEventListener('change',()=>api.save({autoAiFocus:box.checked}));
})();
