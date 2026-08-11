/* SKDG v1.3.102 — print-only adaptive state for imported applications/photos.
   No calculation logic changes. */
(() => {
  'use strict';
  const body = () => document.querySelector('body[data-page="ctu-securing-calculator"]');
  const hasImportedApplication = () => {
    const result = document.getElementById('ctuExcelResult');
    const summary = document.getElementById('ctuExcelSummary');
    if (!result || !summary || result.hidden) return false;
    return Boolean(summary.querySelector('.import-summary-item') || summary.textContent.trim());
  };
  const photoCount = () => document.querySelectorAll('#part542PhotoQueue .v1382-photo-queue-list > li').length;

  function syncExpandedPrintState(){
    const b = body();
    if(!b) return;
    b.classList.toggle('ctu-print-application-expanded', hasImportedApplication());
    const count = photoCount();
    b.classList.toggle('ctu-print-photo-has-files', count > 0);
    b.dataset.ctuPrintPhotoCount = String(count);
  }

  window.addEventListener('beforeprint', syncExpandedPrintState);
  document.addEventListener('DOMContentLoaded', () => {
    syncExpandedPrintState();
    const targets = [document.getElementById('ctuExcelResult'), document.getElementById('ctuExcelSummary'), document.getElementById('part542PhotoQueue')].filter(Boolean);
    if(targets.length){
      const observer = new MutationObserver(syncExpandedPrintState);
      targets.forEach(target => observer.observe(target,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden']}));
    }
  });
  window.SKDG_CTU_PRINT_EXPANDED_SYNC_V13102 = syncExpandedPrintState;
})();
