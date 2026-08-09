(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='user-settings'||document.getElementById('v11HomePreference'))return;
  const api=window.SKDGUserPreferencesV11;if(!api)return;const usability=document.getElementById('v101UsabilityPanel');
  const row=document.createElement('div');row.className='settings-row settings-row--select';row.id='v11HomePreference';row.innerHTML='<div><strong>ホームで最初に表示する機能</strong><p class="v101-setting-note">「よく使う機能」の先頭に表示します。機能自体を非表示にはしません。</p></div><select id="v11HomePrimary" aria-label="ホームで最初に表示する機能"><option value="dangerous">危険物検索</option><option value="intake">申請書取込・確認</option><option value="applications">申請番号管理</option><option value="ctu">固縛力参考算出</option><option value="regulations">関連法令</option><option value="references">関連資料</option></select>';
  usability?.querySelector('.panel-body')?.append(row);const sel=document.getElementById('v11HomePrimary');if(sel){sel.value=api.read().homePrimary||'dangerous';sel.addEventListener('change',()=>api.save({homePrimary:sel.value}))}
})();
