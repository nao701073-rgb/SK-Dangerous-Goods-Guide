(()=>{
 'use strict';
 if(document.body?.dataset?.page!=='application-intake-workflow')return;
 const $=id=>document.getElementById(id);
 const check=$('intakeCheckSection');if(!check)return;
 const placeholder=document.createElement('div');placeholder.id='v131ImportSettling';placeholder.textContent='申請書の内容を確認しています。画面位置を固定したまま、確認結果をまとめて表示します。';
 check.parentNode?.insertBefore(placeholder,check);
 let timer=null,active=false,lastMut=0,hardStop=null;
 function finish(){active=false;document.body.classList.remove('v131-import-settling');clearTimeout(timer);clearTimeout(hardStop)}
 function schedule(){if(!active)return;lastMut=Date.now();clearTimeout(timer);timer=setTimeout(()=>{if(Date.now()-lastMut>=180)finish()},220)}
 function begin(){active=true;document.body.classList.add('v131-import-settling');lastMut=Date.now();clearTimeout(hardStop);hardStop=setTimeout(finish,2500);schedule()}
 $('intakeFileInput')?.addEventListener('change',begin,{passive:true});
 ['sk:intake-imported','sk:application-intake-imported','sk:intake-complete'].forEach(name=>window.addEventListener(name,schedule));
 const obs=new MutationObserver(schedule);obs.observe(check,{subtree:true,childList:true,attributes:true,characterData:true});
 window.addEventListener('beforeunload',()=>obs.disconnect());
})();
