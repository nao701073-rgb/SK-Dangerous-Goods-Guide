(() => {
  "use strict";
  const selectors = [".training-guide-card"];
  const modal = document.createElement("div");
  modal.className = "reference-detail-window";
  modal.hidden = true;
  modal.innerHTML = `
    <div class="reference-detail-window__backdrop" data-detail-window-close></div>
    <section class="reference-detail-window__dialog" role="dialog" aria-modal="true" aria-labelledby="referenceDetailWindowTitle" tabindex="-1">
      <header class="reference-detail-window__header">
        <div><span data-detail-window-eyebrow>詳細</span><h2 id="referenceDetailWindowTitle" data-detail-window-title>詳細</h2></div>
        <button type="button" data-detail-window-close aria-label="詳細ウィンドウを閉じる">×</button>
      </header>
      <div class="reference-detail-window__body" data-detail-window-body></div>
    </section>`;
  document.body.appendChild(modal);

  let lastTrigger = null;
  const body = modal.querySelector("[data-detail-window-body]");
  const title = modal.querySelector("[data-detail-window-title]");
  const eyebrow = modal.querySelector("[data-detail-window-eyebrow]");

  const close = () => {
    modal.hidden = true;
    document.body.classList.remove("is-reference-detail-window-open");
    body.innerHTML = "";
    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus({ preventScroll: true });
  };

  function categoryFor(card) {
    return "検査・検品業務資料 AI要約";
  }

  function wireClonedActions(clone, original) {
    clone.querySelectorAll("button,textarea,input,select,a").forEach(node => {
      if (node.matches("a[href]")) return;
      const dataKey = [...node.attributes].find(attr => attr.name.startsWith("data-"))?.name;
      if (!dataKey) return;
      const value = node.getAttribute(dataKey);
      const selector = value ? `[${dataKey}="${CSS.escape(value)}"]` : `[${dataKey}]`;
      const source = original.querySelector(selector);
      if (!source) return;
      if (node.matches("textarea,input,select")) {
        node.addEventListener("change", () => {
          source.value = node.value;
          source.dispatchEvent(new Event("change", { bubbles: true }));
        });
      } else {
        node.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const isSourceOpen = node.matches("[data-imdg-source-section], [data-ai-source-id]");
          if (isSourceOpen) {
            modal.hidden = true;
            document.body.classList.remove("is-reference-detail-window-open");
            requestAnimationFrame(() => source.click());
            return;
          }
          source.click();
        });
      }
    });
  }

  function open(card, trigger) {
    const heading = card.querySelector("summary h3")?.textContent?.trim() || "詳細";
    const detail = card.querySelector(":scope > .training-guide-detail, :scope > .imdg-clause-detail, :scope > .ai-guide-detail");
    if (!detail) return;
    lastTrigger = trigger;
    title.textContent = heading;
    eyebrow.textContent = categoryFor(card);
    const clone = detail.cloneNode(true);
    clone.classList.add("reference-detail-window__content");
    clone.hidden = false;
    clone.querySelectorAll("[hidden]").forEach(el => el.hidden = false);
    body.replaceChildren(clone);
    wireClonedActions(clone, card);
    modal.hidden = false;
    document.body.classList.add("is-reference-detail-window-open");
    body.scrollTop = 0;
    requestAnimationFrame(() => modal.querySelector(".reference-detail-window__dialog")?.focus({ preventScroll: true }));
  }

  document.addEventListener("click", event => {
    const summary = event.target.closest(".training-guide-card > summary");
    if (!summary) return;
    const card = summary.parentElement;
    if (!selectors.some(selector => card.matches(selector))) return;
    event.preventDefault();
    open(card, summary);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !modal.hidden) close();
    if ((event.key === "Enter" || event.key === " ") && event.target.matches(".training-guide-card > summary")) {
      event.preventDefault();
      open(event.target.parentElement, event.target);
    }
  });

  modal.querySelectorAll("[data-detail-window-close]").forEach(el => el.addEventListener("click", close));
})();
