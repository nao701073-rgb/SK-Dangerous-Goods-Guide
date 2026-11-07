/* R65 v43 P1: IMDG reference visibility for ALL UN numbers / code modals.
 * Display-only UI preference; does not change data, validation, permissions or law text.
 */
(() => {
  'use strict';
  if (document.body?.dataset.page !== 'detail') return;

  const STORAGE_KEY = 'iss-show-imdg-references';
  const HIDE_ATTRIBUTE = 'data-r65-imdg-hidden';
  const CSS_ID = 'r65-imdg-all-codes-policy-css';
  const IMDG_BLOCKS = [
    '[data-source-group="imdg"]',
    '.code-direct-source-links--imdg',
    '.imdg-reference-card',
    '.cross-reference-section',
    '.imdg-reference-section',
    '.imdg-code-reference',
    '.imdg-original-reference',
    '.imdg-original-link',
    '[data-imdg-only]',
    '[data-imdg-reference]',
    '[data-reference-type="imdg"]',
    '[data-source="imdg"]',
    '.imdg-reference-hidden'
  ];

  const isEnabled = () => {
    try {
      const fromStorage = window.ISSStorage?.getShowImdgReferences?.();
      if (typeof fromStorage === 'boolean') return fromStorage;
      const saved = window.localStorage.getItem(STORAGE_KEY);
      return saved === null ? true : saved === 'true';
    } catch (_error) {
      return true; // Do not silently suppress cited material when storage is unavailable.
    }
  };

  const isImdgOriginalUrl = href => {
    // Handles direct PDF URLs and stable-pdf-viewer.html?src=... paths.
    let value = String(href || '').toLowerCase();
    try { value = decodeURIComponent(value); } catch (_error) { /* retain raw */ }
    return /(?:imdg-code-amendment|imdg-code\b|\/imdg[-/])/.test(value);
  };

  const markHidden = (element, hide) => {
    if (!element) return;
    if (hide) {
      if (!element.hasAttribute(HIDE_ATTRIBUTE)) element.setAttribute(HIDE_ATTRIBUTE, '1');
    } else if (element.hasAttribute(HIDE_ATTRIBUTE)) {
      element.removeAttribute(HIDE_ATTRIBUTE);
    }
  };

  const convertInlineImdgLinks = enabled => {
    // Keep the exact code text in the domestic-law table, without an IMDG PDF link when OFF.
    document.querySelectorAll('a[data-code-inline-reference]').forEach(link => {
      const following = link.nextElementSibling;
      const copy = following?.matches?.('[data-r65-imdg-text-only="1"]') ? following : null;
      if (enabled) {
        if (copy) copy.remove();
        markHidden(link, false);
      } else {
        if (!copy) {
          const plain = document.createElement('span');
          plain.setAttribute('data-r65-imdg-text-only', '1');
          plain.textContent = link.textContent;
          link.insertAdjacentElement('afterend', plain);
        } else if (copy.textContent !== link.textContent) {
          copy.textContent = link.textContent;
        }
        markHidden(link, true);
      }
    });
  };

  const apply = () => {
    const enabled = isEnabled();
    document.documentElement.dataset.r65ImdgReferences = enabled ? 'on' : 'off';
    document.querySelectorAll(IMDG_BLOCKS.join(',')).forEach(el => markHidden(el, !enabled));
    // The shared per-code cards also expose IMDG locations and English excerpts.
    // Retain each card's code and domestic-law references; suppress only its IMDG rows.
    document.querySelectorAll('.code-detail-card-body > .code-detail-card-block').forEach(block => {
      const label = block.querySelector('small');
      if (label && /^IMDG\s*Code$/i.test(String(label.textContent || '').trim())) {
        markHidden(block, !enabled);
      }
    });
    document.querySelectorAll('.code-detail-card-body > blockquote[lang="en"]').forEach(block => {
      markHidden(block, !enabled);
    });
    convertInlineImdgLinks(enabled);
    document.querySelectorAll('a[href]').forEach(link => {
      if (link.hasAttribute('data-code-inline-reference')) return;
      if (isImdgOriginalUrl(link.getAttribute('href'))) markHidden(link, !enabled);
    });
    document.querySelectorAll('.code-detail-modal__header span').forEach(label => {
      if (!label.hasAttribute('data-r65-imdg-full-title')) {
        label.setAttribute('data-r65-imdg-full-title', label.textContent || '国内法令・IMDG Code');
      }
      const value = enabled ? label.getAttribute('data-r65-imdg-full-title') : '国内法令';
      if (label.textContent !== value) label.textContent = value;
    });
    document.querySelectorAll('.source-policy p').forEach(note => {
      if (!note.hasAttribute('data-r65-imdg-full-policy')) {
        note.setAttribute('data-r65-imdg-full-policy', note.textContent || '');
      }
      const value = enabled
        ? note.getAttribute('data-r65-imdg-full-policy')
        : '原則として危告示別表第1のコードを表示し、コードを選択すると下段の国内法令条文を確認できます。';
      if (note.textContent !== value) note.textContent = value;
    });
    document.querySelectorAll('.sidebar-foot').forEach(note => {
      if (!note.hasAttribute('data-r65-imdg-full-footer')) {
        note.setAttribute('data-r65-imdg-full-footer', note.textContent || '');
      }
      const value = enabled
        ? note.getAttribute('data-r65-imdg-full-footer')
        : '国内法令は参考情報です。実務判断では最新版の本文を確認してください。';
      if (note.textContent !== value) note.textContent = value;
    });
    window.R65IMDGDetailPolicy.status = { enabled, mode: enabled ? 'on' : 'off' };
  };

  const style = document.createElement('style');
  style.id = CSS_ID;
  style.textContent = '[' + HIDE_ATTRIBUTE + '="1"]{display:none!important}';
  if (!document.getElementById(CSS_ID)) document.head.appendChild(style);

  let queued = false;
  const schedule = () => {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(() => { queued = false; apply(); });
  };

  window.R65IMDGDetailPolicy = { apply, status: { enabled: isEnabled(), mode: 'init' } };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('focus', schedule);
  window.addEventListener('storage', event => { if (event.key === STORAGE_KEY) schedule(); });
  window.addEventListener('iss:imdg-visibility-change', schedule);
  schedule();
})();
