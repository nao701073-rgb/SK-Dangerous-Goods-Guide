(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='user-settings')return;
  const api=window.SKDGUserPreferences;if(!api)return;
  const panels=[...document.querySelectorAll('main.settings-page > section.panel')];
  if(document.getElementById('v101UsabilityPanel'))return;
  const panel=document.createElement('section');panel.className='panel';panel.id='v101UsabilityPanel';
  panel.innerHTML=`<div class="panel-heading"><h2>見やすさ・操作しやすさ</h2></div><div class="panel-body settings-list">
    <div class="settings-row settings-row--layout"><div><strong>文字サイズ</strong><p class="v101-setting-note">危険物検索、法令、申請書確認などの本文と入力欄を読みやすくします。</p></div><div class="segmented-control" id="v101TextSize"><button type="button" data-value="standard">標準</button><button type="button" data-value="large">大きめ</button></div></div>
    <label class="settings-row settings-row--toggle"><div><strong>操作ボタン・入力欄を大きくする</strong><p class="v101-setting-note">スマートフォンや現場でタップしやすい高さにします。</p></div><span class="switch"><input id="v101LargeControls" type="checkbox"><span class="switch-slider"></span></span></label>
    <label class="settings-row settings-row--toggle"><div><strong>画面の動きを少なくする</strong><p class="v101-setting-note">スクロール演出やアニメーションを抑え、落ち着いた操作にします。</p></div><span class="switch"><input id="v101ReduceMotion" type="checkbox"><span class="switch-slider"></span></span></label>
  </div>`;
  (panels[0]||document.querySelector('main.settings-page')?.firstElementChild)?.after(panel);
  const refresh=()=>{const p=api.read();document.querySelectorAll('#v101TextSize button').forEach(b=>b.classList.toggle('active',b.dataset.value===p.textSize));document.getElementById('v101LargeControls').checked=Boolean(p.largeControls);document.getElementById('v101ReduceMotion').checked=Boolean(p.reduceMotion)};
  document.getElementById('v101TextSize')?.addEventListener('click',e=>{const b=e.target.closest('button[data-value]');if(!b)return;api.save({textSize:b.dataset.value});refresh()});
  document.getElementById('v101LargeControls')?.addEventListener('change',e=>api.save({largeControls:e.target.checked}));
  document.getElementById('v101ReduceMotion')?.addEventListener('change',e=>api.save({reduceMotion:e.target.checked}));
  refresh();
})();
