
(() => {
  "use strict";

  const documents = Array.isArray(window.REFERENCE_DOCUMENTS)
    ? window.REFERENCE_DOCUMENTS
    : [];

  const summaryMaster = window.AI_REFERENCE_SUMMARIES || {};
  const summaries = Array.isArray(summaryMaster.summaries)
    ? summaryMaster.summaries
    : [];
  const summaryCategories = summaryMaster.categories || {};

  const imdgMaster = window.IMDG_CONTAINER_INSPECTION_CLAUSES || {};
  const imdgClauses = Array.isArray(imdgMaster.clauses) ? imdgMaster.clauses : [];
  const imdgCategories = imdgMaster.categories || {};

  const queryInput = document.getElementById("referenceQuery");
  const categorySelect = document.getElementById("referenceCategory");
  const list = document.getElementById("referenceList");
  const count = document.getElementById("referenceCount");

  const aiQueryInput = document.getElementById("aiGuideQuery");
  const aiCategorySelect = document.getElementById("aiGuideCategory");
  const aiList = document.getElementById("aiGuideList");
  const aiCount = document.getElementById("aiGuideCount");
  const AI_GUIDE_PROGRESS_KEY = "iss-ai-guide-progress-v1";

  const imdgQueryInput = document.getElementById("imdgClauseQuery");
  const imdgCategorySelect = document.getElementById("imdgClauseCategory");
  const imdgList = document.getElementById("imdgClauseList");
  const imdgCount = document.getElementById("imdgClauseCount");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalize = value =>
    String(value ?? "").normalize("NFKC").toLowerCase();

  const normalizeProvisionText = value => {
    const source = String(value ?? "").replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    const lines = source.split("\n");
    const cleaned = [];
    let pendingBlank = false;
    for (const rawLine of lines) {
      let line = rawLine.replace(/\t/g, "  ").replace(/[ \u00a0]+$/g, "");
      if (!line.trim()) {
        pendingBlank = cleaned.length > 0;
        continue;
      }
      line = line.replace(/^ {8,}/, "").replace(/^ {2,7}(?=\S)/, "");
      if (pendingBlank && cleaned.length && cleaned[cleaned.length - 1] !== "") cleaned.push("");
      pendingBlank = false;
      cleaned.push(line);
    }
    return cleaned.join("\n").trim();
  };

  const buildAiProvisionalTranslation = item => {
    const points = (item.inspectionPoints || []).map(point => `・${point}`).join("\n");
    return [
      `【AI仮訳（参考）】 ${item.section || ""} ${item.titleJa || item.titleEn || ""}`.trim(),
      "",
      item.summaryJa || "登録された日本語要約はありません。",
      points ? "\n実務上の確認事項\n" + points : "",
      "",
      "※この表示は逐語訳ではなく、登録済み要約を基にした参考仮訳です。正式な判断では英語原文と公的資料を確認してください。"
    ].filter(Boolean).join("\n");
  };

  const sourceModal = document.createElement("div");
  sourceModal.className = "reference-source-modal";
  sourceModal.hidden = true;
  sourceModal.innerHTML = `
    <div class="reference-source-modal__backdrop" data-source-modal-close></div>
    <section class="reference-source-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="sourceModalTitle" tabindex="-1">
      <header class="reference-source-modal__header">
        <div>
          <p class="eyebrow" data-source-modal-eyebrow>Source Provision</p>
          <h2 id="sourceModalTitle" data-source-modal-title>該当規定</h2>
        </div>
        <button type="button" data-source-modal-close aria-label="閉じる">×</button>
      </header>
      <div class="reference-source-modal__body">
        <p class="reference-source-modal__note" data-source-modal-note></p>
        <div class="reference-source-modal__toolbar" data-source-modal-toolbar hidden>
          <button type="button" data-source-modal-translate>AI仮訳（参考）を表示</button>
          <button type="button" data-source-modal-original hidden>英語原文に戻る</button>
        </div>
        <p class="reference-source-modal__translation-note" data-source-modal-translation-note hidden>
          AI仮訳は参考情報です。正式な判断では英語原文と公的資料を確認してください。
        </p>
        <div class="reference-source-modal__view-tabs" data-source-modal-view-tabs hidden>
          <button type="button" data-source-modal-text-view class="is-active">条文テキスト</button>
          <button type="button" data-source-modal-page-view>原文ページ（表・図を含む）</button>
        </div>
        <pre class="reference-source-modal__text" data-source-modal-text></pre>
        <section class="reference-source-modal__page" data-source-modal-page hidden>
          <p>公式PDFの該当ページを表示しています。表、画像、配置を含む原文の見た目を確認できます。</p>
          <iframe data-source-modal-pdf title="IMDG Code原文ページ"></iframe>
          <a data-source-modal-pdf-open target="_blank" rel="noopener">PDFを別画面で開く</a>
        </section>
      </div>
    </section>`;
  document.body.appendChild(sourceModal);

  function closeSourceModal() {
    sourceModal.hidden = true;
    document.body.classList.remove("is-reference-source-modal-open");
  }

  let currentSourceModalState = null;

  function renderSourceModalText(mode = "original") {
    if (!currentSourceModalState) return;
    const textNode = sourceModal.querySelector("[data-source-modal-text]");
    const originalButton = sourceModal.querySelector("[data-source-modal-original]");
    const translateButton = sourceModal.querySelector("[data-source-modal-translate]");
    const translationNote = sourceModal.querySelector("[data-source-modal-translation-note]");
    const isTranslation = mode === "translation" && currentSourceModalState.provisionalTranslation;
    textNode.textContent = isTranslation
      ? normalizeProvisionText(currentSourceModalState.provisionalTranslation)
      : normalizeProvisionText(currentSourceModalState.text) || "該当規定のテキストが登録されていません。";
    textNode.lang = isTranslation ? "ja" : currentSourceModalState.language;
    textNode.dataset.viewMode = isTranslation ? "translation" : "original";
    originalButton.hidden = !isTranslation;
    translateButton.hidden = isTranslation || !currentSourceModalState.provisionalTranslation;
    translationNote.hidden = !isTranslation;
    sourceModal.querySelector(".reference-source-modal__body").scrollTop = 0;
  }

  function openSourceModal({ eyebrow, title, note, text, language = "en", provisionalTranslation = "", sourcePdfPath = "", sourcePdfPage = "" }) {
    currentSourceModalState = { text, language, provisionalTranslation, sourcePdfPath, sourcePdfPage };
    sourceModal.querySelector("[data-source-modal-eyebrow]").textContent = eyebrow || "Source Provision";
    sourceModal.querySelector("[data-source-modal-title]").textContent = title || "該当規定";
    const noteNode = sourceModal.querySelector("[data-source-modal-note]");
    noteNode.textContent = note || "";
    noteNode.hidden = !note;
    const toolbar = sourceModal.querySelector("[data-source-modal-toolbar]");
    toolbar.hidden = !(language === "en" && provisionalTranslation);
    const tabs = sourceModal.querySelector("[data-source-modal-view-tabs]");
    const pagePane = sourceModal.querySelector("[data-source-modal-page]");
    const textPane = sourceModal.querySelector("[data-source-modal-text]");
    const pdfFrame = sourceModal.querySelector("[data-source-modal-pdf]");
    const pdfOpen = sourceModal.querySelector("[data-source-modal-pdf-open]");
    const pdfUrl = sourcePdfPath ? `${sourcePdfPath}${sourcePdfPage ? `#page=${sourcePdfPage}&zoom=page-fit` : ""}` : "";
    tabs.hidden = !pdfUrl;
    pagePane.hidden = true;
    textPane.hidden = false;
    sourceModal.querySelector("[data-source-modal-text-view]")?.classList.add("is-active");
    sourceModal.querySelector("[data-source-modal-page-view]")?.classList.remove("is-active");
    if (pdfFrame) pdfFrame.src = pdfUrl;
    if (pdfOpen) { pdfOpen.href = pdfUrl; pdfOpen.hidden = !pdfUrl; }
    renderSourceModalText("original");
    sourceModal.hidden = false;
    document.body.classList.add("is-reference-source-modal-open");
    requestAnimationFrame(() => sourceModal.querySelector(".reference-source-modal__dialog")?.focus({ preventScroll: true }));
  }

  sourceModal.querySelector("[data-source-modal-translate]")?.addEventListener("click", () => renderSourceModalText("translation"));
  sourceModal.querySelector("[data-source-modal-original]")?.addEventListener("click", () => renderSourceModalText("original"));
  sourceModal.querySelector("[data-source-modal-text-view]")?.addEventListener("click", () => {
    sourceModal.querySelector("[data-source-modal-text]").hidden = false;
    sourceModal.querySelector("[data-source-modal-page]").hidden = true;
    sourceModal.querySelector("[data-source-modal-text-view]").classList.add("is-active");
    sourceModal.querySelector("[data-source-modal-page-view]").classList.remove("is-active");
  });
  sourceModal.querySelector("[data-source-modal-page-view]")?.addEventListener("click", () => {
    sourceModal.querySelector("[data-source-modal-text]").hidden = true;
    sourceModal.querySelector("[data-source-modal-page]").hidden = false;
    sourceModal.querySelector("[data-source-modal-page-view]").classList.add("is-active");
    sourceModal.querySelector("[data-source-modal-text-view]").classList.remove("is-active");
    sourceModal.querySelector("[data-source-modal-page]").scrollIntoView({ block: "start" });
  });

  sourceModal.querySelectorAll("[data-source-modal-close]").forEach(button => button.addEventListener("click", closeSourceModal));
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !sourceModal.hidden) closeSourceModal();
  });

  const categoryLabels = {
    "domestic-regulation": "国内省令",
    "domestic-notification": "国内告示",
    "international-code": "国際規則・行動規範",
    "ai-guide": "AI要約ガイド"
  };

  function renderDocuments() {
    const query = normalize(queryInput.value);
    const category = categorySelect.value;

    const filtered = documents.filter(doc => {
      if (category === "ai-guide") return false;
      if (category && doc.category !== category) return false;
      const haystack = normalize([
        doc.title,
        doc.fileName,
        ...(doc.tags || [])
      ].join(" "));
      return !query || haystack.includes(query);
    });

    filtered.sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));
    count.textContent = `${filtered.length}件`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <strong>該当する資料がありません</strong>
          <p>検索語または分類を変更してください。</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(doc => `
      <article class="reference-card">
        <div class="reference-meta">
          <span>${escapeHtml(categoryLabels[doc.category] || doc.category)}</span>
          <span>${escapeHtml((doc.language || "").toUpperCase())}</span>
          <span>${escapeHtml(doc.status || "")}</span>
        </div>
        <h3>${escapeHtml(doc.title)}</h3>
        <p class="reference-file">${escapeHtml(doc.fileName)}</p>
        <div class="reference-tags">
          ${(doc.tags || []).map(tag =>
            `<span class="reference-tag">${escapeHtml(tag)}</span>`
          ).join("")}
        </div>
        ${
          doc.filePath
            ? `<a class="reference-open-link"
                  href="${escapeHtml(doc.filePath)}"
                  target="_blank" rel="noopener">原資料を開く</a>`
            : ""
        }
      </article>
    `).join("");
  }


  function readAiProgress() {
    try { return JSON.parse(localStorage.getItem(AI_GUIDE_PROGRESS_KEY) || "{}"); } catch { return {}; }
  }

  function patchAiProgress(id, patch) {
    const all = readAiProgress();
    all[id] = { completed: false, favorite: false, note: "", ...(all[id] || {}), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(AI_GUIDE_PROGRESS_KEY, JSON.stringify(all));
  }

  function populateImdgCategories() {
    Object.entries(imdgCategories).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      imdgCategorySelect.appendChild(option);
    });
  }

  function renderImdgClauses() {
    const query = normalize(imdgQueryInput.value);
    const category = imdgCategorySelect.value;

    const filtered = imdgClauses.filter(item => {
      if (category && item.category !== category) return false;
      const haystack = normalize([
        item.section,
        item.titleJa,
        item.titleEn,
        item.selectionReason,
        item.summaryJa,
        ...(item.keywords || []),
        ...(item.inspectionPoints || []),
        ...(item.domesticReferences || [])
      ].join(" "));
      return !query || haystack.includes(query);
    });

    imdgCount.textContent = `${filtered.length}件`;

    if (!filtered.length) {
      imdgList.innerHTML = `
        <div class="empty-state">
          <strong>該当するIMDG Code条文がありません</strong>
          <p>条番号、項目名または区分を変更してください。</p>
        </div>
      `;
      return;
    }

    imdgList.innerHTML = filtered.map(item => `
      <details class="imdg-clause-card">
        <summary>
          <div class="imdg-clause-number">${escapeHtml(item.section)}</div>
          <div>
            <div class="imdg-clause-meta">
              <span>${escapeHtml(imdgCategories[item.category] || item.category)}</span>
              <span>42-24</span>
            </div>
            <h3>${escapeHtml(item.titleJa)}</h3>
            <p lang="en">${escapeHtml(item.titleEn)}</p>
          </div>
          <span class="imdg-clause-expand">詳細</span>
        </summary>

        <div class="imdg-clause-detail">
          <section>
            <h4>選定理由</h4>
            <p>${escapeHtml(item.selectionReason)}</p>
          </section>

          <section>
            <h4>条文の要点</h4>
            <p>${escapeHtml(item.summaryJa)}</p>
          </section>

          <section>
            <h4>収納検査で確認する項目</h4>
            <ul>
              ${(item.inspectionPoints || []).map(point =>
                `<li>${escapeHtml(point)}</li>`
              ).join("")}
            </ul>
          </section>

          <section class="imdg-domestic-reference">
            <h4>関連する国内法令</h4>
            <ul>
              ${(item.domesticReferences || []).map(ref =>
                `<li>${escapeHtml(ref)}</li>`
              ).join("")}
            </ul>
          </section>

          <button class="reference-open-link" type="button"
             data-imdg-source-section="${escapeHtml(item.section)}">
            該当する英語条文を表示
          </button>
        </div>
      </details>
    `).join("");
  }

  function populateAiCategories() {
    Object.entries(summaryCategories).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      aiCategorySelect.appendChild(option);
    });
  }

  function renderAiGuides() {
    const query = normalize(aiQueryInput.value);
    const category = aiCategorySelect.value;

    const filtered = summaries.filter(item => {
      if (category && item.category !== category) return false;
      const haystack = normalize([
        item.title,
        item.aiSummary,
        item.caution,
        ...(item.keywords || []),
        ...(item.inspectionPoints || []),
        ...(item.imdgRefs || [])
      ].join(" "));
      return !query || haystack.includes(query);
    });

    aiCount.textContent = `${filtered.length}件`;

    if (!filtered.length) {
      aiList.innerHTML = `
        <div class="empty-state">
          <strong>該当するAI要約がありません</strong>
          <p>検索語またはテーマを変更してください。</p>
        </div>
      `;
      return;
    }

    aiList.innerHTML = filtered.map(item => {
      const state = readAiProgress()[item.id] || {};
      return `
      <details class="ai-guide-card ${state.completed ? "is-completed" : ""} ${state.favorite ? "is-favorite" : ""}" data-ai-guide-id="${escapeHtml(item.id)}">
        <summary>
          <div>
            <div class="ai-guide-card-meta">
              <span class="ai-badge">AI要約</span>
              <span>${escapeHtml(summaryCategories[item.category] || item.category)}</span>
              <span>${escapeHtml(item.sourceDocument || "関連資料")}</span>
              <span>p.${escapeHtml((item.sourcePages || []).join("・"))}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.aiSummary)}</p>
          </div>
          <span class="ai-guide-expand">詳細</span>
        </summary>

        <div class="ai-guide-detail">
          <section>
            <h4>現場で確認するポイント</h4>
            <ul>
              ${(item.inspectionPoints || []).map(point =>
                `<li>${escapeHtml(point)}</li>`
              ).join("")}
            </ul>
          </section>

          <aside class="ai-guide-caution">
            <strong>注意</strong>
            <p>${escapeHtml(item.caution)}</p>
          </aside>

          <div class="ai-guide-references">
            <span>主なIMDG参照</span>
            ${(item.imdgRefs || []).map(ref =>
              `<code>${escapeHtml(ref)}</code>`
            ).join("")}
          </div>
          <button class="reference-open-link" type="button" data-ai-source-id="${escapeHtml(item.id)}">該当規定をウィンドウ表示</button>
          <div class="ai-guide-actions">
            <button type="button" data-ai-guide-complete="${escapeHtml(item.id)}">${state.completed ? "確認済みを解除" : "確認済みにする"}</button>
            <button type="button" data-ai-guide-favorite="${escapeHtml(item.id)}">${state.favorite ? "お気に入り解除" : "お気に入り"}</button>
          </div>
          <label>個人メモ<textarea class="ai-guide-note" data-ai-guide-note="${escapeHtml(item.id)}" placeholder="条文確認や社内運用メモ">${escapeHtml(state.note || "")}</textarea></label>
        </div>
      </details>
    `; }).join("");
  }

  imdgList.addEventListener("click", event => {
    const button = event.target.closest("[data-imdg-source-section]");
    if (!button) return;
    const item = imdgClauses.find(entry => entry.section === button.dataset.imdgSourceSection);
    if (!item) return;
    openSourceModal({
      eyebrow: `IMDG Code ${item.section}`,
      title: item.titleEn || item.titleJa,
      note: `${item.originalTextLabel || "IMDG Code Amendment 42-24"}。画面内で直接確認できるよう、該当箇所を抽出しています。`,
      text: item.originalTextEn,
      language: "en",
      provisionalTranslation: buildAiProvisionalTranslation(item)
    });
  });

  aiList.addEventListener("click", event => {
    const sourceButton = event.target.closest("[data-ai-source-id]");
    if (sourceButton) {
      const item = summaries.find(entry => entry.id === sourceButton.dataset.aiSourceId);
      if (!item) return;
      openSourceModal({
        eyebrow: "CTU Code 関連規定",
        title: item.sourceProvisionTitle || item.title,
        note: item.sourceProvisionNote || "登録済みCTU Code仮訳に基づく関連規定の要点です。",
        text: item.sourceProvisionTextJa,
        language: "ja"
      });
      return;
    }
    const complete = event.target.closest("[data-ai-guide-complete]");
    if (complete) { const all=readAiProgress(); const state=all[complete.dataset.aiGuideComplete]||{}; patchAiProgress(complete.dataset.aiGuideComplete,{completed:!state.completed}); renderAiGuides(); return; }
    const favorite = event.target.closest("[data-ai-guide-favorite]");
    if (favorite) { const all=readAiProgress(); const state=all[favorite.dataset.aiGuideFavorite]||{}; patchAiProgress(favorite.dataset.aiGuideFavorite,{favorite:!state.favorite}); renderAiGuides(); }
  });
  aiList.addEventListener("change", event => {
    const note=event.target.closest("[data-ai-guide-note]");
    if (note) patchAiProgress(note.dataset.aiGuideNote,{note:note.value});
  });

  queryInput.addEventListener("input", renderDocuments);
  categorySelect.addEventListener("change", () => {
    if (categorySelect.value === "ai-guide") {
      document.querySelector(".ai-guide-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      categorySelect.value = "";
    }
    renderDocuments();
  });

  aiQueryInput.addEventListener("input", renderAiGuides);
  aiCategorySelect.addEventListener("change", renderAiGuides);

  imdgQueryInput.addEventListener("input", renderImdgClauses);
  imdgCategorySelect.addEventListener("change", renderImdgClauses);

  populateImdgCategories();
  renderImdgClauses();
  populateAiCategories();
  renderAiGuides();
  renderDocuments();
})();
