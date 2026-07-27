(()=>{"use strict";
  if(!window.ISSApi||!ISSApi.isAuthenticated())return;
  const path=location.pathname.split('/').pop()||'index.html';
  const featureMap={
    'index.html':'home','dangerous-goods-search.html':'dangerous-goods-search','dangerous-goods-detail.html':'dangerous-goods-detail',
    'regulations.html':'regulations','references.html':'references','applications.html':'applications','search-history.html':'search-history',
    'favorites.html':'favorites','settings.html':'user-settings','system-settings.html':'system-settings','label-catalog.html':'labels','ems.html':'ems'
  };
  const feature=featureMap[path]||document.body.dataset.page||path.replace(/\.html$/,'');
  const sid=sessionStorage.getItem('iss_usage_session')||crypto.randomUUID();sessionStorage.setItem('iss_usage_session',sid);
  const send=(eventType,extra={})=>ISSApi.recordUsageEvent({eventType,feature,pagePath:location.pathname,sessionId:sid,...extra}).catch(()=>{});
  send('page-view',{details:{title:document.title}});
  document.addEventListener('click',e=>{const el=e.target.closest('a,button');if(!el)return;const text=(el.textContent||el.getAttribute('aria-label')||'').trim().slice(0,120);const href=el.tagName==='A'?el.getAttribute('href'):null;send('interaction',{targetType:el.tagName.toLowerCase(),targetId:el.id||null,details:{text,href}})});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')send('page-leave',{details:{durationSeconds:Math.round((performance.now())/1000)}})},{once:true});
})();