(() => {
  'use strict';
  if (location.pathname !== '/pages/dangerous-goods-detail.html') return;
  const REV = '20261103f';
  const LABEL = '国内法令の主な参照';
  const verifier = new URLSearchParams(location.search).get('r65verify') === '1';
  let queued = false;
  function checkAndFix() {
    const root = document.getElementById('dangerousGoodsDetail');
    const side = root?.querySelector('.dg-side-column');
    // Source-of-truth is a single combined reference card in the main column.
    // Never remove the separate classification criterion in the related-info table.
    if (side) {
      side.querySelectorAll('.legal-reference-box').forEach(box => {
        if (box.textContent?.includes(LABEL)) box.remove();
      });
    }
    // Approval decision/permissions remain in the application; only the unwanted banner is removed.
    document.querySelectorAll('section.regulation-approval-banner').forEach(banner => banner.remove());
    const combined = root?.querySelectorAll('.dg-main-column .legal-reference-box--combined').length || 0;
    const redundant = Array.from(side?.querySelectorAll('.legal-reference-box') || []).filter(
      node => node.textContent?.includes(LABEL)
    ).length;
    const banners = document.querySelectorAll('section.regulation-approval-banner').length;
    const ready = Boolean(root?.querySelector('.dg-layout'));
    const pass = ready && combined === 1 && redundant === 0 && banners === 0;
    window.__SKDG_R65_DETAIL_CHECK__ = { revision:REV, ready, combined, redundant, banners, pass };
    document.documentElement.dataset.r65DetailAcceptedRevision = REV;
    if (verifier) {
      let el = document.getElementById('r65DetailAcceptanceResult');
      if (!el) {
        el = document.createElement('div');el.id='r65DetailAcceptanceResult';
        el.setAttribute('role','status');
        el.style.cssText='position:fixed;left:10px;bottom:12px;z-index:2147483600;background:#fff;border:2px solid #385b87;border-radius:7px;padding:7px 11px;color:#17324e;font:600 13px/1.5 sans-serif;box-shadow:0 2px 9px #9998;max-width:calc(100vw - 40px)';
        document.body.appendChild(el);
      }
      const status = pass ? 'PASS' : (ready ? 'FAIL' : 'WAIT');
      const message = `R65 ${REV} ${status} | 統合参照:${combined} | 右側重複:${redundant} | 承認帯:${banners}`;
      if (el.textContent !== message) el.textContent = message;
      el.style.borderColor = pass ? '#23815a' : '#a35523';
    }
  }
  function schedule() {
    if (queued) return; queued=true;
    requestAnimationFrame(() => { queued=false; checkAndFix(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once:true});
  else schedule();
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
})();
