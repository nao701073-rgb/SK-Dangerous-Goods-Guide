(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='home')return;
  const remove=()=>document.getElementById('v11QuickLaunch')?.remove();
  remove();
  const q=document.getElementById('homeUnifiedQuery');
  if(q)q.placeholder='例：UN1203、1203、GASOLINE、ガソリン、法令名、資料名、申請番号';
  // In case an older cached quick-launch script runs late, remove only that duplicate block.
  let tries=0;const timer=setInterval(()=>{remove();if(++tries>12)clearInterval(timer)},120);
})();
