/* SKDG v1.3.101 — print-only state bridge. No calculation logic changes. */
(() => {
  'use strict';
  const BODY_SELECTOR = 'body[data-page="ctu-securing-calculator"]';
  const body = () => document.querySelector(BODY_SELECTOR);
  const checked = id => Boolean(document.getElementById(id)?.checked);
  function syncPrintState(){
    const b = body();
    if(!b) return;
    b.classList.toggle('ctu-print-support-off', !checked('quickUseSupport'));
    b.classList.toggle('ctu-print-tensile-off', !checked('quickUseTensile'));
    const overall = document.getElementById('overall');
    const text = (overall?.textContent || '').trim();
    const sufficient = Boolean(overall && (overall.classList.contains('ok') || text.startsWith('参考上十分')));
    b.classList.toggle('ctu-print-result-sufficient', sufficient);
  }
  window.addEventListener('beforeprint', syncPrintState);
  document.addEventListener('DOMContentLoaded', () => {
    syncPrintState();
    ['quickUseSupport','quickUseTensile'].forEach(id => document.getElementById(id)?.addEventListener('change', syncPrintState));
    document.getElementById('quickCalcBtn')?.addEventListener('click', () => setTimeout(syncPrintState, 0));
  });
  window.SKDG_CTU_PRINT_SYNC_V13101 = syncPrintState;
})();
