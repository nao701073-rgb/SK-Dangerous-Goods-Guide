(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  // v1.3 intentionally has no mutation-driven auto-scroll or auto-collapse after import.
  ['v11IntakeDock','v12ChangeFile','v12ReviewImported','v101IntakeLayoutNote'].forEach(id=>$(id)?.remove());
  document.documentElement.style.scrollBehavior='auto';
  document.body.style.overflowX='hidden';
  const wrap=document.querySelector('.intake-cargo-wrap');if(wrap){wrap.style.maxWidth='100%';wrap.style.minWidth='0'}
  // Keep focus where the inspector put it. File import only updates content; it does not move the viewport.
  $('intakeFileInput')?.addEventListener('change',()=>{document.activeElement?.blur?.()},{passive:true});
})();
