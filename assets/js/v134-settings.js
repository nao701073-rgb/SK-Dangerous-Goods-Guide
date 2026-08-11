(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='user-settings'||document.getElementById('v134FieldOpsPanel'))return;
  const api=window.SKDGUserPreferencesV11;if(!api)return;
  const anchor=document.querySelector('.settings-page .panel');if(!anchor)return;
  const panel=document.createElement('section');panel.className='panel';panel.id='v134FieldOpsPanel';
  panel.innerHTML=`<div class="panel-heading"><h2>現場操作</h2></div><div class="panel-body settings-list">
    <label class="settings-row settings-row--toggle"><div><strong>追従する操作ボタンを表示</strong><p>長い申請書でも「自動確認」「登録」の操作を画面下部から実行できます。</p></div><span class="switch"><input id="v134FollowActions" type="checkbox"><span class="switch-slider"></span></span></label>
    <label class="settings-row settings-row--toggle"><div><strong>画面の自動スクロール</strong><p>申請書読込や確認後に次の欄へ自動移動します。画面が勝手に動かないよう既定はOFFです。</p></div><span class="switch"><input id="v134AutoScroll" type="checkbox"><span class="switch-slider"></span></span></label>
    <label class="settings-row settings-row--toggle"><div><strong>軽量表示を優先</strong><p>不要な画面アニメーションを抑え、画像等を必要になるまで遅延読込して初期表示を軽くします。</p></div><span class="switch"><input id="v134Lightweight" type="checkbox"><span class="switch-slider"></span></span></label>
  </div>`;
  anchor.insertAdjacentElement('afterend',panel);
  const follow=document.getElementById('v134FollowActions'),auto=document.getElementById('v134AutoScroll'),light=document.getElementById('v134Lightweight');
  function sync(){const p=api.read();follow.checked=p.followActions!==false;auto.checked=Boolean(p.autoScroll);light.checked=p.lightweightMode!==false}
  follow.addEventListener('change',()=>api.save({followActions:follow.checked}));
  auto.addEventListener('change',()=>api.save({autoScroll:auto.checked}));
  light.addEventListener('change',()=>api.save({lightweightMode:light.checked}));
  sync();
})();
