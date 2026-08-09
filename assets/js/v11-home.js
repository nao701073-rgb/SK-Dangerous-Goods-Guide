(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='home'||document.getElementById('v11QuickLaunch'))return;
  const pref=()=>window.SKDGUserPreferencesV11?.read?.()||{homePrimary:'dangerous'};
  const items=[
    ['dangerous','危険物検索','国連番号・品名からすぐ確認','pages/dangerous-goods-search.html','search',''],
    ['intake','申請書取込・確認','申請書を読み込み、必要箇所だけ確認','pages/application-intake-workflow.html','file',''],
    ['applications','申請番号管理','案件・メモ・写真・添付を確認','pages/applications.html','case','applicationsRead'],
    ['ctu','固縛力参考算出','申請書と写真から参考算出','pages/ctu-securing-calculator.html','secure',''],
    ['regulations','関連法令','国内法令・IMDG参照へ','pages/regulations.html','law',''],
    ['references','関連資料','業務資料・ガイドを探す','pages/references.html','doc','']
  ];
  const icons={search:'⌕',file:'▤',case:'№',secure:'▣',law:'⚖',doc:'▧'};
  const section=document.createElement('section');section.id='v11QuickLaunch';section.className='v11-quick-launch';section.setAttribute('aria-labelledby','v11QuickLaunchTitle');
  section.innerHTML='<div class="v11-section-head"><div><h2 id="v11QuickLaunchTitle">よく使う機能</h2><p>現場で使う主要機能へすぐ移動できます。</p></div></div><div class="v11-quick-grid" id="v11QuickGrid"></div>';
  const anchor=document.querySelector('.home-search-card')||document.querySelector('main');anchor?.after?.(section);
  function render(){
    const primary=pref().homePrimary||'dangerous';const ordered=[...items].sort((a,b)=>(a[0]===primary?-1:b[0]===primary?1:0));
    const grid=document.getElementById('v11QuickGrid');if(!grid)return;
    grid.innerHTML=ordered.map(([id,title,desc,href,icon,perm],i)=>`<a class="v11-quick-card${i===0?' is-primary':''}" href="${href}" ${perm?`data-permission="${perm}"`:''} data-v11-feature="${id}"><span class="v11-quick-icon" aria-hidden="true">${icons[icon]}</span><span><strong>${title}</strong><small>${desc}</small></span>${i===0?'<em>よく使う</em>':''}</a>`).join('');
  }
  render();window.addEventListener('sk:user-preferences-changed',render);
})();
