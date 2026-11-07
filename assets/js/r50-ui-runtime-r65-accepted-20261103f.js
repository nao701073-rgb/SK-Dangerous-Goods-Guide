(() => {
  'use strict';

  const STYLE_ID = 'r50-ui-runtime-style';
  const MAIN_COMBINED_URL = '../references/excerpts/domestic-bundles/label-and-package-domestic-laws.pdf#page=1';
  const JUDGEMENT_VIEWER_URL = '../references/excerpts/domestic-bundles/judgement-combined.html';
  const OPEN_LABEL = '統合条文を別画面で開く';
  const RIGHTS_PENDING_LABEL = '権利確認中';
  const norm = value => String(value || '').replace(/\s+/g, '').trim();

  const judgementTitleByKey = {
    'note2-1': '備考2(1) 火薬類の判定基準',
    'note2-2-i': '備考2(2)(ⅰ) 高圧ガスの判定基準',
    'note2-2-ii': '備考2(2)(ⅱ) 高圧ガスの判定基準',
    'note2-2-iii': '備考2(2)(ⅲ) 高圧ガスの判定基準',
    'note2-3': '備考2(3) 引火性液体類の判定基準',
    'note2-4-i-iii': '備考2(4)(ⅰ)〜(ⅲ) 可燃性物質の判定基準',
    'note2-4-iv': '備考2(4)(ⅳ) 自然発火性物質の判定基準',
    'note2-4-v': '備考2(4)(ⅴ) 水反応可燃性物質の判定基準',
    'note2-5-i': '備考2(5)(ⅰ) 酸化性物質の判定基準',
    'note2-5-ii': '備考2(5)(ⅱ) 有機過酸化物の判定基準',
    'note2-6': '備考2(6) 毒物の判定基準',
    'note2-7': '備考2(7) 腐食性物質の判定基準',
    'note2-8': '備考2(8) 環境有害物質の判定基準'
  };

  const externalIcon = () => `
    <svg class="r50-external-doc-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3.5h8.5L18 7v13.5H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M14.5 3.5V7H18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M10 11h3M10 14h4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M14.5 10.5H20v5.5M20 10.5l-7 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const ensureStyle = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .r50-domestic-law-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:14px}
      .r50-domestic-law-actions .domestic-law-open-button,
      .r50-domestic-law-external-link{
        margin-top:0;min-height:44px;padding:10px 16px;border:1px solid #8fb4d8;border-radius:10px;
        background:#fff;color:#075ca8;font:inherit;font-weight:800;line-height:1.3;text-decoration:none;
        display:inline-flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;box-sizing:border-box
      }
      .r50-domestic-law-actions .domestic-law-open-button:hover,
      .r50-domestic-law-actions .domestic-law-open-button:focus-visible,
      .r50-domestic-law-external-link:hover,
      .r50-domestic-law-external-link:focus-visible{background:#eef6fd;border-color:#4f91c9}
      .r50-domestic-law-external-link:focus-visible{outline:3px solid rgba(18,112,184,.22);outline-offset:2px}
      .r50-external-doc-icon{width:20px;height:20px;display:block;flex:0 0 auto}
      .domestic-law-fullscreen__bundle-toolbar .r50-domestic-law-external-link{min-height:38px;padding:7px 10px;font-size:.72rem;white-space:nowrap}
      @media(max-width:640px){
        .r50-domestic-law-actions{display:grid;grid-template-columns:1fr;gap:8px}
        .r50-domestic-law-actions .domestic-law-open-button,
        .r50-domestic-law-actions .r50-domestic-law-external-link{width:100%;text-align:center}
        .domestic-law-fullscreen__bundle-toolbar .r50-domestic-law-external-link{width:100%;white-space:normal}
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  };

  const setExternalContent = (anchor, label = OPEN_LABEL) => {
    const alreadyReady = anchor.getAttribute('data-r50-external-law') === '1' &&
      norm(anchor.textContent) === norm(label) &&
      anchor.querySelector('.r50-external-doc-icon');
    anchor.classList.add('r50-domestic-law-external-link');
    anchor.setAttribute('data-r50-external-law', '1');
    anchor.setAttribute('target', '_blank');
    anchor.setAttribute('rel', 'noopener');
    anchor.setAttribute('aria-label', label);
    anchor.title = label;
    if (!alreadyReady) anchor.innerHTML = `${externalIcon()}<span>${label}</span>`;
    return anchor;
  };

  const highestExactTextContainer = start => {
    let target = start;
    let current = start;
    for (let i = 0; i < 4; i += 1) {
      const parent = current?.parentElement;
      if (!parent || parent === document.body || parent === document.documentElement) break;
      if (norm(parent.textContent) !== RIGHTS_PENDING_LABEL) break;
      target = parent;
      current = parent;
    }
    return target;
  };

  const scrubRightsPendingBadges = root => {
    const scopes = [];
    if (root?.nodeType === Node.ELEMENT_NODE) scopes.push(root);
    if (root?.querySelectorAll) scopes.push(...root.querySelectorAll('*'));
    for (const el of scopes) {
      if (!(el instanceof Element)) continue;
      if (['SCRIPT','STYLE','OPTION','SELECT','TEXTAREA'].includes(el.tagName)) continue;
      if (norm(el.textContent) !== RIGHTS_PENDING_LABEL) continue;
      highestExactTextContainer(el).remove();
    }
  };

  const hasPrototypeApprovalText = el => {
    if (!(el instanceof Element)) return false;
    if (['HTML','BODY','MAIN','SCRIPT','STYLE','OPTION','SELECT','TEXTAREA'].includes(el.tagName)) return false;
    const text = norm(el.textContent);
    return text.length <= 420 && text.includes('試作・参考表示') && text.includes('原典照合') && text.includes('承認待ち');
  };

  const scrubPrototypeApprovalBanner = root => {
    const scopes = [];
    if (root?.nodeType === Node.ELEMENT_NODE) scopes.push(root);
    if (root?.querySelectorAll) scopes.push(...root.querySelectorAll('*'));
    const classHint = /warning|notice|banner|alert|approval|pending|prototype/i;
    for (const el of scopes) {
      if (!hasPrototypeApprovalText(el)) continue;
      let target = null;
      if (classHint.test(String(el.className || ''))) target = el;
      if (!target && ['STRONG','SPAN','P'].includes(el.tagName)) {
        const parent = el.parentElement;
        if (parent && hasPrototypeApprovalText(parent) && parent.children.length <= 4) target = parent;
      }
      if (target && !['HTML','BODY','MAIN'].includes(target.tagName)) target.remove();
    }
  };

  const removeLegacyCombinedPdfLinks = root => {
    if (!root?.querySelectorAll) return;
    for (const node of root.querySelectorAll('a,button')) {
      const text = norm(node.textContent);
      if (text.includes('結合PDFを別画面で開く') || text.includes('統合PDFを別画面で開く') || text === '結合ファイル') {
        if (node.matches('[data-r50-external-law]')) continue;
        node.remove();
      }
    }
  };

  const resolveJudgementKey = root => {
    const text = String(root?.textContent || '');
    const entries = window.DOMESTIC_JUDGEMENT_CRITERIA_TEXTS?.entries || {};
    for (const [key, entry] of Object.entries(entries)) {
      if (!/^note2-/.test(key) || !entry?.title) continue;
      if (norm(text).includes(norm(entry.title))) return key;
    }
    const patterns = [
      [/備考2\(1\)/, 'note2-1'],
      [/備考2\(2\).*?(?:\(ⅰ\)|\(i\)|\(1\))/, 'note2-2-i'],
      [/備考2\(2\).*?(?:\(ⅱ\)|\(ii\)|\(2\))/, 'note2-2-ii'],
      [/備考2\(2\).*?(?:\(ⅲ\)|\(iii\)|\(3\))/, 'note2-2-iii'],
      [/備考2\(3\)/, 'note2-3'],
      [/備考2\(4\).*?(?:ⅰ.*ⅲ|i.*iii|1.*3)/, 'note2-4-i-iii'],
      [/備考2\(4\).*?(?:\(ⅳ\)|\(iv\)|\(4\))/, 'note2-4-iv'],
      [/備考2\(4\).*?(?:\(ⅴ\)|\(v\)|\(5\))/, 'note2-4-v'],
      [/備考2\(5\).*?(?:\(ⅰ\)|\(i\)|\(1\))/, 'note2-5-i'],
      [/備考2\(5\).*?(?:\(ⅱ\)|\(ii\)|\(2\))/, 'note2-5-ii'],
      [/備考2\(6\)/, 'note2-6'],
      [/備考2\(7\)/, 'note2-7'],
      [/備考2\(8\)/, 'note2-8']
    ];
    const hit = patterns.find(([re]) => re.test(text));
    return hit ? hit[1] : '';
  };

  const judgementViewerUrl = key => {
    const title = judgementTitleByKey[key] || '判定基準の国内法令';
    return `${JUDGEMENT_VIEWER_URL}?key=${encodeURIComponent(key)}&title=${encodeURIComponent(title)}`;
  };

  const judgementImageUrl = key => new URL(`../assets/domestic-law-bundles/judgement-criteria/${key}.png`, document.baseURI || location.href).href;

  // R50: do not prefetch judgement images on the source screen.
  // The external viewer is deliberately lightweight and paints its shell first,
  // then loads the image. This avoids background image fetches competing with UI work.
  const prewarmJudgementImage = () => {};

  const prewarmMainCombinedHtml = () => {
    const run = () => {
      try { fetch(MAIN_COMBINED_URL, { cache: 'force-cache', credentials: 'same-origin' }).catch(() => {}); } catch (_) {}
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(run, { timeout: 1800 });
    else window.setTimeout(run, 1000);
  };

  const buttonOrLinkByText = (root, labels) => {
    const wanted = labels.map(norm);
    return Array.from(root.querySelectorAll('a,button')).find(el => {
      const text = norm(el.textContent);
      return wanted.some(label => text.includes(label));
    }) || null;
  };

  const toExternalAnchor = (node, href, marker, label = OPEN_LABEL) => {
    let anchor = node;
    if (!anchor || anchor.tagName !== 'A') {
      anchor = document.createElement('a');
      if (node?.parentNode) node.parentNode.replaceChild(anchor, node);
    }
    anchor.removeAttribute('data-pdf-image-expand');
    anchor.removeAttribute('data-pdf-image-page');
    anchor.removeAttribute('type');
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener';
    anchor.setAttribute('data-r50-href', href);
    if (marker) anchor.setAttribute(marker, '1');
    return setExternalContent(anchor, label);
  };

  // The single combined PDF link is rendered by detail-dashboard.js itself.
  // No extra R50 side-by-side link: it would duplicate the same reference.
  const installMainReferenceActions = () => {
    const card = document.querySelector('.legal-reference-box--combined');
    const primary = card?.querySelector('a[data-domestic-law-group="combined"]');
    if (!primary) return;
    if (primary.getAttribute('href') !== MAIN_COMBINED_URL) primary.setAttribute('href', MAIN_COMBINED_URL);
    if (primary.getAttribute('target') !== '_blank') primary.setAttribute('target', '_blank');
    if (primary.getAttribute('rel') !== 'noopener') primary.setAttribute('rel', 'noopener');
  };

  const installClassificationActions = () => {
    const primary = document.querySelector('[data-domestic-law-group="classification"]');
    if (!primary) return;
    const cell = primary.closest('td') || primary.parentElement;
    if (!cell) return;
    const key = resolveJudgementKey(primary.closest('tr') || cell || document);
    if (!key || !Object.hasOwn(judgementTitleByKey, key)) return; // Preserve old fallback when resolution fails.

    // Open the category-specific judgement PDF directly (not the label/marking PDF).
    // PDF files are restored as a set from the verified R65 Desktop copy.
    const url = `../references/excerpts/domestic-bundles/judgement-criteria/${key}.pdf#page=1`;
    const anchor = toExternalAnchor(primary, url, 'data-r50-classification-pdf', '判定基準の国内法令PDFを開く');
    anchor.setAttribute('data-domestic-law-group', 'classification');
    anchor.setAttribute('data-r50-judgement-key', key);
    cell.querySelectorAll('[data-r50-classification-external]').forEach(n => n.remove());

    let actions = cell.querySelector('[data-r50-domestic-actions="classification"]');
    if (!actions) {
      actions = document.createElement('div');
      actions.className = 'r50-domestic-law-actions';
      actions.setAttribute('data-r50-domestic-actions', 'classification');
      cell.appendChild(actions);
    }
    if (anchor.parentElement !== actions) actions.appendChild(anchor);
    prewarmJudgementImage(key);
  };

  const installJudgementFullscreenLink = view => {
    const toolbar = view.querySelector('.domestic-law-html-view__toolbar, .domestic-law-fullscreen__bundle-toolbar');
    if (!toolbar) return;
    const key = resolveJudgementKey(view);
    if (!key) return;

    removeLegacyCombinedPdfLinks(toolbar);
    let external = toolbar.querySelector('[data-r50-judgement-external]');
    external = toExternalAnchor(external, judgementViewerUrl(key), 'data-r50-judgement-external');
    external.setAttribute('data-r50-judgement-key', key);
    if (external.parentElement !== toolbar) toolbar.appendChild(external);
    prewarmJudgementImage(key);
  };

  const installNativeTabGuard = () => {
    if (document.documentElement.dataset.r49NativeTabGuard === '1') return;
    document.documentElement.dataset.r49NativeTabGuard = '1';

    // R50 uses the browser's native <a target="_blank"> behavior so Edge opens
    // exactly one normal tab in the current browser window. The listener is
    // installed on window capture only to prevent older document-level click
    // handlers from also opening a popup or navigating the source screen.
    window.addEventListener('click', event => {
      const anchor = event.target instanceof Element
        ? event.target.closest('a[data-r50-external-law="1"]')
        : null;
      if (!anchor) return;
      event.stopImmediatePropagation();
      // Do not call preventDefault(): the anchor's native target=_blank action
      // must remain intact.
    }, true);
  };

  const refresh = root => {
    ensureStyle();
    scrubRightsPendingBadges(root || document);
    scrubPrototypeApprovalBanner(root || document);
    removeLegacyCombinedPdfLinks(root || document);
    if (document.body?.dataset?.page === 'detail' || document.querySelector('.legal-reference-box--combined')) {
      installMainReferenceActions();
      installClassificationActions();
      document.querySelectorAll('.domestic-law-html-view--judgement').forEach(installJudgementFullscreenLink);
    }
  };

  let queued = false;
  const queueRefresh = root => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      refresh(root || document);
    });
  };

  const start = () => {
    installNativeTabGuard();
    // The five-page PDF is fetched only when the user opens it.
    refresh(document);
    setTimeout(() => refresh(document), 100);
    setTimeout(() => refresh(document), 400);
    setTimeout(() => refresh(document), 1000);
    const observer = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            scrubRightsPendingBadges(node);
            scrubPrototypeApprovalBanner(node);
            removeLegacyCombinedPdfLinks(node);
          }
        }
      }
      queueRefresh(document);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
