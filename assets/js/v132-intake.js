(()=>{
 'use strict';
 if(document.body?.dataset?.page!=='application-intake-workflow')return;
 const $=id=>document.getElementById(id);
 const file=$('intakeFileInput');
 const edit=$('intakeEditSection');
 const check=$('intakeCheckSection');
 const register=$('intakeRegisterSection');
 const cargo=$('intakeCargoBody');
 const status=$('intakeFileStatus');
 if(!file)return;

 // Remove all artifacts from the previous v1.3.1 approach.
 $('v131ImportSettling')?.remove();
 document.body.classList.remove('v131-import-settling');

 let active=false;
 let quietTimer=0;
 let hardTimer=0;
 let startedAt=0;
 let startScrollY=0;
 let userMoved=false;
 let internalRestore=false;
 const QUIET_MS=800;
 const MIN_ACTIVE_MS=650;
 const HARD_STOP_MS=30000;

 function clearTimers(){
   window.clearTimeout(quietTimer);
   window.clearTimeout(hardTimer);
 }
 function markMutation(){
   if(!active)return;
   window.clearTimeout(quietTimer);
   const elapsed=performance.now()-startedAt;
   const wait=Math.max(QUIET_MS, MIN_ACTIVE_MS-elapsed);
   quietTimer=window.setTimeout(finish,wait);
 }
 function finish(){
   if(!active)return;
   active=false;
   clearTimers();
   document.body.classList.add('v132-intake-reveal');
   document.body.classList.remove('v132-intake-settling');
   // Keep viewport exactly where the inspector left it. Do not fight manual scrolling.
   if(!userMoved){
     internalRestore=true;
     window.scrollTo({top:startScrollY,left:window.scrollX,behavior:'auto'});
     requestAnimationFrame(()=>{ internalRestore=false; });
   }
   requestAnimationFrame(()=>requestAnimationFrame(()=>document.body.classList.remove('v132-intake-reveal')));
 }
 function begin(){
   clearTimers();
   active=true;
   userMoved=false;
   startedAt=performance.now();
   startScrollY=window.scrollY;
   document.body.classList.remove('v132-intake-reveal');
   document.body.classList.add('v132-intake-settling');
   // Existing status area is the only visible live area. No second placeholder is inserted.
   hardTimer=window.setTimeout(finish,HARD_STOP_MS);
   markMutation();
 }

 window.addEventListener('scroll',()=>{
   if(!active||internalRestore)return;
   if(Math.abs(window.scrollY-startScrollY)>6)userMoved=true;
 },{passive:true});
 file.addEventListener('change',begin,{passive:true});

 const observer=new MutationObserver(markMutation);
 [edit,check,register,cargo,status].filter(Boolean).forEach(el=>observer.observe(el,{
   childList:true,subtree:true,attributes:true,characterData:true
 }));
 window.addEventListener('beforeunload',()=>{clearTimers();observer.disconnect()},{once:true});
})();
