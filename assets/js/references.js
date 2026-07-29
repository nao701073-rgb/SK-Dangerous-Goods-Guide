
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
  const languageSelect = document.getElementById("referenceLanguage");
  const formatSelect = document.getElementById("referenceFormat");
  const favoriteSelect = document.getElementById("referenceFavorite");
  const openedSelect = document.getElementById("referenceOpened");
  const procedureSelect = document.getElementById("referenceProcedure");
  const procedureAgeSelect = document.getElementById("referenceProcedureAge");
  const procedureDueSelect = document.getElementById("referenceProcedureDue");
  const reviewSelect = document.getElementById("referenceReview");
  const openedPeriodSelect = document.getElementById("referenceOpenedPeriod");
  const sortSelect = document.getElementById("referenceSort");
  const resetButton = document.getElementById("referenceReset");
  const clearHistoryButton = document.getElementById("referenceClearHistory");
  const clearFavoritesButton = document.getElementById("referenceClearFavorites");
  const bulkProcedureStartButton = document.getElementById("referenceBulkProcedureStart");
  const bulkProcedureCompleteButton = document.getElementById("referenceBulkProcedureComplete");
  const bulkProcedureResetButton = document.getElementById("referenceBulkProcedureReset");
  const bulkDueSetButton = document.getElementById("referenceBulkDueSet");
  const bulkDue7Button = document.getElementById("referenceBulkDue7");
  const bulkDue30Button = document.getElementById("referenceBulkDue30");
  const bulkDue90Button = document.getElementById("referenceBulkDue90");
  const bulkDueClearButton = document.getElementById("referenceBulkDueClear");
  const clearReviewsButton = document.getElementById("referenceClearReviews");
  const clearNotesButton = document.getElementById("referenceClearNotes");
  const exportProgressButton = document.getElementById("referenceExportProgress");
  const importProgressInput = document.getElementById("referenceImportProgress");
  const exportCsvButton = document.getElementById("referenceExportCsv");
  const exportDueReportButton = document.getElementById("referenceExportDueReport");
  const printButton = document.getElementById("referencePrint");
  const printDueReportButton = document.getElementById("referencePrintDueReport");
  const referenceSummary = document.getElementById("referenceSummary");
  const activeFilters = document.getElementById("referenceActiveFilters");
  const list = document.getElementById("referenceList");
  const count = document.getElementById("referenceCount");

  const aiQueryInput = document.getElementById("aiGuideQuery");
  const aiCategorySelect = document.getElementById("aiGuideCategory");
  const aiList = document.getElementById("aiGuideList");
  const aiCount = document.getElementById("aiGuideCount");
  const AI_GUIDE_PROGRESS_KEY = "iss-ai-guide-progress-v1";
  const REFERENCE_PROGRESS_KEY = "iss-reference-document-progress-v1";

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

  const formatLocalDate = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  function getDueInfo(state = {}) {
    const dueDate = String(state.procedureDueDate || "");
    const status = state.procedureStatus || "unconfirmed";
    if (!dueDate) return { dueDate: "", status: "unset", days: null, label: "期限未設定", rank: 5 };
    if (status === "completed") return { dueDate, status: "completed", days: null, label: "確認済み", rank: 4 };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const due = new Date(`${dueDate}T00:00:00`);
    const days = Math.round((due.getTime() - today.getTime()) / 86400000);
    if (days < 0) return { dueDate, status: "overdue", days, label: `${Math.abs(days)}日超過`, rank: 0 };
    if (days === 0) return { dueDate, status: "today", days, label: "本日期限", rank: 1 };
    if (days <= 7) return { dueDate, status: "soon", days, label: `残り${days}日`, rank: 2 };
    return { dueDate, status: "future", days, label: `残り${days}日`, rank: 3 };
  }

  const addDaysToToday = days => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + Number(days || 0));
    return formatLocalDate(date);
  };

  const isValidDateInput = value => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  };

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
    const reading = (item.readingGuide || []).map(point => `・${point}`).join("\n");
    return [
      `【AI解説（参考）】 ${item.section || ""} ${item.titleJa || item.titleEn || ""}`.trim(),
      "",
      "■ 条文の趣旨",
      item.detailedExplanationJa || item.summaryJa || "登録された日本語解説はありません。",
      reading ? "\n■ 原文確認の進め方\n" + reading : "",
      points ? "\n■ 収納検査での確認事項\n" + points : "",
      "",
      "※逐語訳ではありません。表・図・脚注を含む原文ページと英語本文を確認し、国内法令と照合してください。"
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
          <h2 id="sourceModalTitle" data-source-modal-title>該当規定</h2>
        </div>
        <button type="button" data-source-modal-close aria-label="閉じる">×</button>
      </header>
      <div class="reference-source-modal__body">
        <p class="reference-source-modal__note" data-source-modal-note></p>
        <div class="reference-source-modal__toolbar" data-source-modal-toolbar hidden>
          <button type="button" data-source-modal-translate>AI解説（参考）を表示</button>
          <button type="button" data-source-modal-original hidden>英語原文に戻る</button>
        </div>
        <p class="reference-source-modal__translation-note" data-source-modal-translation-note hidden>
          AI解説は理解補助です。正式な判断では英語原文、表・図、脚注および公的資料を確認してください。
        </p>
        <div class="reference-source-modal__view-tabs" data-source-modal-view-tabs hidden>
          <button type="button" data-source-modal-text-view class="is-active">条文テキスト</button>
          <button type="button" data-source-modal-page-view>原文ページ（表・図を含む）</button>
        </div>
        <pre class="reference-source-modal__text" data-source-modal-text></pre>
        <section class="reference-source-modal__page" data-source-modal-page hidden>
          <p>公式PDFの該当ページ画像です。表、図、段組み、脚注を含む原文レイアウトを確認してください。画像を押すと拡大表示できます。</p>
          <div class="reference-source-modal__page-gallery" data-source-modal-page-gallery></div>
          <iframe data-source-modal-pdf title="IMDG Code原文ページ" hidden></iframe>
          <a data-source-modal-pdf-open target="_blank" rel="noopener">公式PDFを別画面で開く</a>
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

  function openSourceModal({ eyebrow, title, note, text, language = "en", provisionalTranslation = "", sourcePdfPath = "", sourcePdfPage = "", visualPages = [], preferPageView = false }) {
    currentSourceModalState = { text, language, provisionalTranslation, sourcePdfPath, sourcePdfPage, visualPages };
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
    const pageGallery = sourceModal.querySelector("[data-source-modal-page-gallery]");
    const pdfUrl = sourcePdfPath ? `${sourcePdfPath}${sourcePdfPage ? `#page=${sourcePdfPage}&zoom=page-fit` : ""}` : "";
    const hasVisualPages = Array.isArray(visualPages) && visualPages.length > 0;
    if (pageGallery) {
      pageGallery.innerHTML = hasVisualPages ? visualPages.map(page => `
        <figure class="reference-source-page-figure">
          <a href="${escapeHtml(page.src)}" target="_blank" rel="noopener" aria-label="${escapeHtml(page.caption || `PDF ${page.page}ページ`)}を拡大表示">
            <img src="${escapeHtml(page.src)}" alt="${escapeHtml(page.caption || `PDF ${page.page}ページ`)}" loading="lazy">
          </a>
          <figcaption>${escapeHtml(page.caption || `PDF ${page.page}ページ`)}</figcaption>
        </figure>`).join("") : "";
    }
    tabs.hidden = !(pdfUrl || hasVisualPages);
    const showPageInitially = Boolean((hasVisualPages || pdfUrl) && preferPageView);
    pagePane.hidden = !showPageInitially;
    textPane.hidden = showPageInitially;
    sourceModal.querySelector("[data-source-modal-text-view]")?.classList.toggle("is-active", !showPageInitially);
    sourceModal.querySelector("[data-source-modal-page-view]")?.classList.toggle("is-active", showPageInitially);
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
    "domestic-regulation": "危規則",
    "domestic-notification": "危告示",
    "international-code": "IMDG Code",
    "international-convention": "国際条約",
    "ctu-code": "CTU Code",
    "ai-guide": "AI要約ガイド"
  };

  const languageLabels = { ja: "日本語", en: "英語" };
  const formatLabels = { pdf: "PDF", word: "Word", excel: "Excel", csv: "CSV", text: "テキスト", image: "画像", other: "その他" };
  const statusLabels = {
    "primary-law": "法令原典",
    "primary-source": "原典資料",
    "ai-summary-available": "AI要約あり",
    "selected-clauses-registered": "関連条文収録"
  };



  function downloadJson(fileName, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function normalizeImportedProgress(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("JSON形式が正しくありません。");
    const source = value.progress && typeof value.progress === "object" ? value.progress : value;
    const allowedIds = new Set(documents.map(doc => doc.documentId));
    const normalized = {};
    Object.entries(source).forEach(([id, state]) => {
      if (!allowedIds.has(id) || !state || typeof state !== "object" || Array.isArray(state)) return;
      normalized[id] = {
        favorite: Boolean(state.favorite),
        review: Boolean(state.review),
        procedureStatus: ["unconfirmed", "in-progress", "completed"].includes(state.procedureStatus) ? state.procedureStatus : "unconfirmed",
        procedureStartedAt: Number.isNaN(Date.parse(state.procedureStartedAt || "")) ? "" : String(state.procedureStartedAt),
        procedureCompletedAt: Number.isNaN(Date.parse(state.procedureCompletedAt || "")) ? "" : String(state.procedureCompletedAt),
        procedureDueDate: /^\d{4}-\d{2}-\d{2}$/.test(String(state.procedureDueDate || "")) ? String(state.procedureDueDate) : "",
        note: String(state.note || "").slice(0, 2000),
        lastOpenedAt: Number.isNaN(Date.parse(state.lastOpenedAt || "")) ? "" : String(state.lastOpenedAt),
        updatedAt: new Date().toISOString()
      };
    });
    return normalized;
  }

  function readReferenceProgress() {
    try { return JSON.parse(localStorage.getItem(REFERENCE_PROGRESS_KEY) || "{}"); } catch { return {}; }
  }

  function patchReferenceProgress(id, patch) {
    const all = readReferenceProgress();
    all[id] = { favorite: false, review: false, procedureStatus: "unconfirmed", procedureStartedAt: "", procedureCompletedAt: "", procedureDueDate: "", note: "", lastOpenedAt: "", ...(all[id] || {}), ...patch, updatedAt: new Date().toISOString() };
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(all));
  }

  function formatReferenceOpenedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
  }

  function getDocumentFormat(doc) {
    const fileName = String(doc.fileName || doc.filePath || "").toLowerCase();
    const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
    if (extension === "pdf") return "pdf";
    if (["doc", "docx"].includes(extension)) return "word";
    if (["xls", "xlsx"].includes(extension)) return "excel";
    if (extension === "csv") return "csv";
    if (["txt", "md"].includes(extension)) return "text";
    if (["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) return "image";
    return "other";
  }

  function populateReferenceCategories() {
    if (!categorySelect) return;
    const existing = new Set(Array.from(categorySelect.options).map(option => option.value));
    [...new Set(documents.map(doc => doc.category).filter(Boolean))]
      .sort((a, b) => String(categoryLabels[a] || a).localeCompare(String(categoryLabels[b] || b), "ja"))
      .forEach(value => {
        if (existing.has(value)) return;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = categoryLabels[value] || value;
        categorySelect.appendChild(option);
      });
  }

  function csvCell(value) {
    return `"${String(value ?? "").replaceAll('"', '""')}"`;
  }

  function getFilteredDocuments() {
    const query = normalize(queryInput.value);
    const category = categorySelect.value;
    const language = languageSelect?.value || "";
    const format = formatSelect?.value || "";
    const favorite = favoriteSelect?.value || "";
    const opened = openedSelect?.value || "";
    const openedPeriod = openedPeriodSelect?.value || "";
    const review = reviewSelect?.value || "";
    const procedure = procedureSelect?.value || "";
    const procedureAge = procedureAgeSelect?.value || "";
    const procedureDue = procedureDueSelect?.value || "";
    const progress = readReferenceProgress();
    return documents.filter(doc => {
      if (category && doc.category !== category) return false;
      if (language && normalize(doc.language) !== language) return false;
      if (format && getDocumentFormat(doc) !== format) return false;
      if (favorite === "favorites" && !progress[doc.documentId]?.favorite) return false;
      if (review === "review" && !progress[doc.documentId]?.review) return false;
      if (review === "noted" && !String(progress[doc.documentId]?.note || "").trim()) return false;
      const procedureStatus = progress[doc.documentId]?.procedureStatus || "unconfirmed";
      if (procedure && procedureStatus !== procedure) return false;
      if (procedureAge) {
        if (procedureStatus !== "in-progress") return false;
        const startedAt = Date.parse(progress[doc.documentId]?.procedureStartedAt || "") || 0;
        if (!startedAt) return false;
        const elapsedDays = Math.floor((Date.now() - startedAt) / 86400000);
        if (elapsedDays < Number(procedureAge)) return false;
      }
      if (procedureDue) {
        const dueDate = String(progress[doc.documentId]?.procedureDueDate || "");
        if (procedureDue === "unset") return !dueDate;
        if (procedureDue === "set") return Boolean(dueDate);
        if (!dueDate) return false;
        const dueInfo = getDueInfo(progress[doc.documentId] || {});
        if (procedureDue === "overdue" && dueInfo.status !== "overdue") return false;
        if (procedureDue === "today" && dueInfo.status !== "today") return false;
        if (["3", "7", "14", "30"].includes(procedureDue) && !(procedureStatus !== "completed" && dueInfo.days >= 0 && dueInfo.days <= Number(procedureDue))) return false;
      }
      const hasOpened = Boolean(progress[doc.documentId]?.lastOpenedAt);
      if (opened === "opened" && !hasOpened) return false;
      if (opened === "unopened" && hasOpened) return false;
      if (openedPeriod) {
        const openedAt = Date.parse(progress[doc.documentId]?.lastOpenedAt || "") || 0;
        if (!openedAt) return false;
        const now = new Date();
        let cutoff = 0;
        if (openedPeriod === "today") cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        else cutoff = now.getTime() - Number(openedPeriod) * 86400000;
        if (openedAt < cutoff) return false;
      }
      const haystack = normalize([doc.title, doc.fileName, ...(doc.tags || []), progress[doc.documentId]?.note || ""].join(" "));
      return !query || haystack.includes(query);
    });
  }

  function renderReferenceSummary() {
    if (!referenceSummary) return;
    const progress = readReferenceProgress();
    const total = documents.length;
    const favorites = documents.filter(doc => progress[doc.documentId]?.favorite).length;
    const opened = documents.filter(doc => progress[doc.documentId]?.lastOpenedAt).length;
    const unopened = Math.max(0, total - opened);
    const reviewCount = documents.filter(doc => progress[doc.documentId]?.review).length;
    const noteCount = documents.filter(doc => String(progress[doc.documentId]?.note || "").trim()).length;
    const procedureCompleted = documents.filter(doc => (progress[doc.documentId]?.procedureStatus || "unconfirmed") === "completed").length;
    const procedureInProgress = documents.filter(doc => progress[doc.documentId]?.procedureStatus === "in-progress").length;
    const procedureOverdue = documents.filter(doc => getDueInfo(progress[doc.documentId] || {}).status === "overdue").length;
    const procedureDueToday = documents.filter(doc => getDueInfo(progress[doc.documentId] || {}).status === "today").length;
    const procedureDueSoon = documents.filter(doc => { const info = getDueInfo(progress[doc.documentId] || {}); return info.days !== null && info.days >= 0 && info.days <= 7 && info.status !== "completed"; }).length;
    const procedureDueUnset = documents.filter(doc => !String(progress[doc.documentId]?.procedureDueDate || "")).length;
    referenceSummary.innerHTML = [
      ["all", "登録資料", total],
      ["favorites", "お気に入り", favorites],
      ["opened", "閲覧済み", opened],
      ["unopened", "未閲覧", unopened],
      ["review", "要確認", reviewCount],
      ["noted", "メモあり", noteCount],
      ["procedure-in-progress", "確認中", procedureInProgress],
      ["procedure-completed", "確認済み", procedureCompleted],
      ["procedure-overdue", "期限超過", procedureOverdue],
      ["procedure-due-today", "本日期限", procedureDueToday],
      ["procedure-due-soon", "7日以内", procedureDueSoon],
      ["procedure-due-unset", "期限未設定", procedureDueUnset]
    ].map(([key,label,value]) => `<button type="button" data-reference-summary="${key}"><span>${label}</span><strong>${value}件</strong></button>`).join("");
  }

  function renderDocuments() {
    const query = normalize(queryInput.value);
    const category = categorySelect.value;
    const language = languageSelect?.value || "";
    const format = formatSelect?.value || "";
    const favorite = favoriteSelect?.value || "";
    const opened = openedSelect?.value || "";
    const openedPeriod = openedPeriodSelect?.value || "";
    const review = reviewSelect?.value || "";
    const procedure = procedureSelect?.value || "";
    const procedureAge = procedureAgeSelect?.value || "";
    const procedureDue = procedureDueSelect?.value || "";
    const sort = sortSelect?.value || "recommended";
    const progress = readReferenceProgress();

    const filtered = getFilteredDocuments();

    const byTitle = (a, b) => String(a.title || "").localeCompare(String(b.title || ""), "ja", { numeric: true });
    if (sort === "recent") filtered.sort((a, b) => {
      const aTime = Date.parse(progress[a.documentId]?.lastOpenedAt || "") || 0;
      const bTime = Date.parse(progress[b.documentId]?.lastOpenedAt || "") || 0;
      return bTime - aTime || byTitle(a, b);
    });
    else if (sort === "review-first") filtered.sort((a, b) => {
      const reviewCompare = Number(Boolean(progress[b.documentId]?.review)) - Number(Boolean(progress[a.documentId]?.review));
      return reviewCompare || byTitle(a, b);
    });
    else if (sort === "procedure") filtered.sort((a, b) => {
      const rank = { "in-progress": 0, "unconfirmed": 1, "completed": 2 };
      return (rank[progress[a.documentId]?.procedureStatus || "unconfirmed"] - rank[progress[b.documentId]?.procedureStatus || "unconfirmed"]) || byTitle(a, b);
    });
    else if (sort === "procedure-oldest" || sort === "procedure-newest") {
      filtered.sort((a, b) => {
        const aTime = Date.parse(progress[a.documentId]?.procedureStartedAt || "") || 0;
        const bTime = Date.parse(progress[b.documentId]?.procedureStartedAt || "") || 0;
        const direction = sort === "procedure-oldest" ? 1 : -1;
        if (!aTime && !bTime) return byTitle(a, b);
        if (!aTime) return 1;
        if (!bTime) return -1;
        return direction * (aTime - bTime) || byTitle(a, b);
      });
    }
    else if (sort === "due-urgency") filtered.sort((a, b) => {
      const aInfo = getDueInfo(progress[a.documentId] || {});
      const bInfo = getDueInfo(progress[b.documentId] || {});
      return aInfo.rank - bInfo.rank || (aInfo.days ?? Number.MAX_SAFE_INTEGER) - (bInfo.days ?? Number.MAX_SAFE_INTEGER) || byTitle(a, b);
    });
    else if (sort === "due-date") filtered.sort((a, b) => {
      const aDue = Date.parse(`${progress[a.documentId]?.procedureDueDate || "9999-12-31"}T00:00:00`) || Number.MAX_SAFE_INTEGER;
      const bDue = Date.parse(`${progress[b.documentId]?.procedureDueDate || "9999-12-31"}T00:00:00`) || Number.MAX_SAFE_INTEGER;
      return aDue - bDue || byTitle(a, b);
    });
    else if (sort === "note-recent") filtered.sort((a, b) => {
      const aHasNote = Boolean(String(progress[a.documentId]?.note || "").trim());
      const bHasNote = Boolean(String(progress[b.documentId]?.note || "").trim());
      const noteCompare = Number(bHasNote) - Number(aHasNote);
      const aTime = aHasNote ? (Date.parse(progress[a.documentId]?.updatedAt || "") || 0) : 0;
      const bTime = bHasNote ? (Date.parse(progress[b.documentId]?.updatedAt || "") || 0) : 0;
      return noteCompare || bTime - aTime || byTitle(a, b);
    });
    else if (sort === "favorite-first") filtered.sort((a, b) => {
      const favoriteCompare = Number(Boolean(progress[b.documentId]?.favorite)) - Number(Boolean(progress[a.documentId]?.favorite));
      const aTime = Date.parse(progress[a.documentId]?.lastOpenedAt || "") || 0;
      const bTime = Date.parse(progress[b.documentId]?.lastOpenedAt || "") || 0;
      return favoriteCompare || bTime - aTime || byTitle(a, b);
    });
    else if (sort === "title-asc") filtered.sort(byTitle);
    else if (sort === "title-desc") filtered.sort((a, b) => byTitle(b, a));
    else if (sort === "category") filtered.sort((a, b) => {
      const categoryCompare = String(categoryLabels[a.category] || a.category).localeCompare(String(categoryLabels[b.category] || b.category), "ja");
      return categoryCompare || byTitle(a, b);
    });
    else if (sort === "language") filtered.sort((a, b) => {
      const languageCompare = String(languageLabels[a.language] || a.language).localeCompare(String(languageLabels[b.language] || b.language), "ja");
      return languageCompare || byTitle(a, b);
    });
    else if (sort === "format") filtered.sort((a, b) => {
      const formatCompare = String(formatLabels[getDocumentFormat(a)]).localeCompare(String(formatLabels[getDocumentFormat(b)]), "ja");
      return formatCompare || byTitle(a, b);
    });
    else filtered.sort((a, b) => Number(a.sortOrder || 999) - Number(b.sortOrder || 999));

    count.textContent = `${filtered.length}件`;
    renderReferenceSummary();
    if (activeFilters) {
      const labels = [];
      if (language) labels.push({ key: "language", text: `言語：${languageLabels[language] || language}` });
      if (format) labels.push({ key: "format", text: `形式：${formatLabels[format] || format}` });
      if (favorite) labels.push({ key: "favorite", text: "お気に入りのみ" });
      if (opened) labels.push({ key: "opened", text: opened === "opened" ? "閲覧済み" : "未閲覧" });
      if (review) labels.push({ key: "review", text: review === "review" ? "要確認のみ" : "メモあり" });
      if (procedure) labels.push({ key: "procedure", text: `確認手続き：${procedureSelect.options[procedureSelect.selectedIndex]?.textContent || procedure}` });
      if (procedureAge) labels.push({ key: "procedureAge", text: `確認中期間：${procedureAge}日以上` });
      if (procedureDue) labels.push({ key: "procedureDue", text: `確認期限：${procedureDueSelect.options[procedureDueSelect.selectedIndex]?.textContent || procedureDue}` });
      if (openedPeriod) labels.push({ key: "openedPeriod", text: `閲覧時期：${openedPeriodSelect.options[openedPeriodSelect.selectedIndex]?.textContent || openedPeriod}` });
      if (sort !== "recommended") labels.push({ key: "sort", text: `並び順：${sortSelect.options[sortSelect.selectedIndex]?.textContent || sort}` });
      if (queryInput.value.trim()) labels.unshift({ key: "query", text: `検索：${queryInput.value.trim()}` });
      if (category) labels.splice(queryInput.value.trim() ? 1 : 0, 0, { key: "category", text: `分類：${categoryLabels[category] || category}` });
      activeFilters.innerHTML = labels.length
        ? `<span>適用中の条件</span>${labels.map(item => `<button type="button" data-reference-clear="${escapeHtml(item.key)}">${escapeHtml(item.text)} <span aria-hidden="true">×</span></button>`).join("")}`
        : "";
    }

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <strong>該当する資料がありません</strong>
          <p>検索語、分類、言語またはファイル形式を変更してください。</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(doc => {
      const state = progress[doc.documentId] || {};
      const openedAt = formatReferenceOpenedAt(state.lastOpenedAt);
      const procedureStatus = state.procedureStatus || "unconfirmed";
      const procedureLabels = { unconfirmed: "未確認", "in-progress": "確認中", completed: "確認済み" };
      const procedureElapsedDays = procedureStatus === "in-progress" && state.procedureStartedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(state.procedureStartedAt)) / 86400000)) : null;
      const dueInfo = getDueInfo(state);
      const dueDate = dueInfo.dueDate;
      const isOverdue = dueInfo.status === "overdue";
      return `
      <article class="reference-card ${state.favorite ? "is-favorite" : ""} ${state.review ? "is-review" : ""} ${isOverdue ? "is-overdue" : ""}">
        <div class="reference-meta">
          <span>${escapeHtml(categoryLabels[doc.category] || doc.category)}</span>
          <span>${escapeHtml(languageLabels[doc.language] || (doc.language || "").toUpperCase())}</span>
          <span>${escapeHtml(formatLabels[getDocumentFormat(doc)])}</span>
          <span>${escapeHtml(statusLabels[doc.status] || doc.status || "登録資料")}</span>
        </div>
        <h3>${escapeHtml(doc.title)}</h3>
        <p class="reference-file">${escapeHtml(doc.fileName)}</p>
        <div class="reference-tags">
          ${(doc.tags || []).map(tag =>
            `<span class="reference-tag">${escapeHtml(tag)}</span>`
          ).join("")}
        </div>
        ${openedAt ? `<p class="reference-last-opened">最終閲覧：${escapeHtml(openedAt)}</p>` : ""}
        ${state.note ? `<p class="reference-note-preview">メモ：${escapeHtml(state.note)}</p>` : ""}
        <p class="reference-procedure-status">確認手続き：<strong>${procedureLabels[procedureStatus]}</strong>${procedureStatus === "in-progress" && state.procedureStartedAt ? `<span>開始：${escapeHtml(formatReferenceOpenedAt(state.procedureStartedAt))}</span><span>経過：${procedureElapsedDays}日</span>` : ""}${dueDate ? `<span class="${isOverdue ? "is-overdue-text" : ""}">期限：${escapeHtml(dueDate)}（${escapeHtml(dueInfo.label)}）</span>` : ""}${procedureStatus === "completed" && state.procedureCompletedAt ? `<span>完了：${escapeHtml(formatReferenceOpenedAt(state.procedureCompletedAt))}</span>` : ""}</p>
        <div class="reference-card-actions">
          ${doc.filePath
            ? `<a class="reference-open-link" data-reference-open="${escapeHtml(doc.documentId)}"
                  href="${escapeHtml(doc.filePath)}"
                  target="_blank" rel="noopener">原資料を開く</a>`
            : ""}
          <button type="button" class="reference-procedure-button" data-reference-procedure="${escapeHtml(doc.documentId)}">${procedureStatus === "unconfirmed" ? "確認を開始" : procedureStatus === "in-progress" ? "確認済みにする" : "未確認に戻す"}</button>
          <button type="button" class="reference-review-button" data-reference-review="${escapeHtml(doc.documentId)}" aria-pressed="${state.review ? "true" : "false"}">${state.review ? "確認済みにする" : "要確認"}</button>
          <button type="button" class="reference-due-button" data-reference-due="${escapeHtml(doc.documentId)}">確認期限</button>
          <button type="button" class="reference-note-button" data-reference-note="${escapeHtml(doc.documentId)}">メモ</button>
          <button type="button" class="reference-favorite-button" data-reference-favorite="${escapeHtml(doc.documentId)}" aria-pressed="${state.favorite ? "true" : "false"}">${state.favorite ? "★ お気に入り解除" : "☆ お気に入り"}</button>
        </div>
      </article>
    `; }).join("");
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
              <span>IMDG Code</span>
              <span>${escapeHtml(item.sourceDocument || imdgData.edition || "IMDG Code Amendment 42-24")}</span>
              ${item.sourcePdfPage ? `<span>p.${escapeHtml(item.sourcePdfPage)}</span>` : ""}
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

          ${item.detailedExplanationJa ? `<section><h4>概要</h4><p>${escapeHtml(item.detailedExplanationJa)}</p></section>` : ""}
          ${Array.isArray(item.readingGuide) ? `<section><h4>原文確認の進め方</h4><ol>${item.readingGuide.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ol></section>` : ""}

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
            原文ページ・英語条文を確認
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
          ${item.expandedSummary ? `<section><h4>概要</h4><p>${escapeHtml(item.expandedSummary)}</p></section>` : ""}
          ${item.whyItMatters ? `<section><h4>なぜ重要か</h4><p>${escapeHtml(item.whyItMatters)}</p></section>` : ""}
          ${Array.isArray(item.checkProcedure) ? `<section><h4>確認の手順</h4><ol>${item.checkProcedure.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ol></section>` : ""}
          <section>
            <h4>現場で確認するポイント</h4>
            <ul>
              ${(item.inspectionPoints || []).map(point =>
                `<li>${escapeHtml(point)}</li>`
              ).join("")}
            </ul>
          </section>

          ${Array.isArray(item.commonMistakes) ? `<section class="ai-guide-mistakes"><h4>よくある誤り</h4><ul>${item.commonMistakes.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}

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
      provisionalTranslation: buildAiProvisionalTranslation(item),
      sourcePdfPath: item.sourcePdfPath,
      sourcePdfPage: item.sourcePdfPage,
      visualPages: item.visualPages || []
    });
  });

  aiList.addEventListener("click", event => {
    const sourceButton = event.target.closest("[data-ai-source-id]");
    if (sourceButton) {
      const item = summaries.find(entry => entry.id === sourceButton.dataset.aiSourceId);
      if (!item) return;
      const isImdg = item.category === "imdg" || item.sourceType === "imdg";
      openSourceModal({
        eyebrow: isImdg ? "IMDG Code 関連規定" : "CTU Code 関連規定",
        title: item.sourceProvisionTitle || item.title,
        note: item.sourceProvisionNote || (isImdg
          ? "IMO公表のIMDG Code Amendment 42-24の該当ページを表示します。要約は理解補助であり、判断時は英語原文・表・図・脚注を確認してください。"
          : "国土交通省公表『CTU Code（仮訳）』の該当ページを表示します。要約は理解補助であり、判断時はPDF本文・図・表・注記を確認してください。"),
        text: item.sourceProvisionTextJa,
        language: "ja",
        sourcePdfPath: item.sourcePdfPath || (isImdg ? "../references/originals/imdg-code-amendment-42-24-msc556-108.pdf" : "../references/originals/ctu-code-ja.pdf"),
        sourcePdfPage: item.sourcePdfPage || (Array.isArray(item.sourcePages) && item.sourcePages.length ? item.sourcePages[0] : ""),
        preferPageView: true
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
  categorySelect.addEventListener("change", renderDocuments);
  languageSelect?.addEventListener("change", renderDocuments);
  formatSelect?.addEventListener("change", renderDocuments);
  favoriteSelect?.addEventListener("change", renderDocuments);
  openedSelect?.addEventListener("change", renderDocuments);
  procedureSelect?.addEventListener("change", renderDocuments);
  procedureAgeSelect?.addEventListener("change", renderDocuments);
  reviewSelect?.addEventListener("change", renderDocuments);
  openedPeriodSelect?.addEventListener("change", renderDocuments);
  sortSelect?.addEventListener("change", renderDocuments);
  list?.addEventListener("click", event => {
    const procedureButton = event.target.closest("[data-reference-procedure]");
    if (procedureButton) {
      const id = procedureButton.dataset.referenceProcedure;
      const current = readReferenceProgress()[id] || {};
      const next = current.procedureStatus === "in-progress" ? "completed" : current.procedureStatus === "completed" ? "unconfirmed" : "in-progress";
      const now = new Date().toISOString();
      patchReferenceProgress(id, {
        procedureStatus: next,
        procedureStartedAt: next === "in-progress" ? (current.procedureStartedAt || now) : next === "unconfirmed" ? "" : current.procedureStartedAt || now,
        procedureCompletedAt: next === "completed" ? now : ""
      });
      renderDocuments();
      return;
    }
    const reviewButton = event.target.closest("[data-reference-review]");
    if (reviewButton) {
      const id = reviewButton.dataset.referenceReview;
      const current = readReferenceProgress()[id] || {};
      patchReferenceProgress(id, { review: !current.review });
      renderDocuments();
      return;
    }
    const dueButton = event.target.closest("[data-reference-due]");
    if (dueButton) {
      const id = dueButton.dataset.referenceDue;
      const current = readReferenceProgress()[id] || {};
      const value = window.prompt("確認期限をYYYY-MM-DD形式で入力してください。空欄で保存すると解除されます。", current.procedureDueDate || "");
      if (value !== null) {
        const dueDate = value.trim();
        if (dueDate && !isValidDateInput(dueDate)) return window.alert("実在する確認期限をYYYY-MM-DD形式で入力してください。");
        patchReferenceProgress(id, { procedureDueDate: dueDate });
        renderDocuments();
      }
      return;
    }
    const noteButton = event.target.closest("[data-reference-note]");
    if (noteButton) {
      const id = noteButton.dataset.referenceNote;
      const current = readReferenceProgress()[id] || {};
      const note = window.prompt("この資料のメモを入力してください。空欄で保存すると削除されます。", current.note || "");
      if (note !== null) { patchReferenceProgress(id, { note: note.trim() }); renderDocuments(); }
      return;
    }
    const favoriteButton = event.target.closest("[data-reference-favorite]");
    if (favoriteButton) {
      const id = favoriteButton.dataset.referenceFavorite;
      const current = readReferenceProgress()[id] || {};
      patchReferenceProgress(id, { favorite: !current.favorite });
      renderDocuments();
      return;
    }
    const openLink = event.target.closest("[data-reference-open]");
    if (openLink) patchReferenceProgress(openLink.dataset.referenceOpen, { lastOpenedAt: new Date().toISOString() });
  });
  activeFilters?.addEventListener("click", event => {
    const button = event.target.closest("[data-reference-clear]");
    if (!button) return;
    const key = button.dataset.referenceClear;
    if (key === "query") queryInput.value = "";
    if (key === "category") categorySelect.value = "";
    if (key === "language" && languageSelect) languageSelect.value = "";
    if (key === "format" && formatSelect) formatSelect.value = "";
    if (key === "favorite" && favoriteSelect) favoriteSelect.value = "";
    if (key === "opened" && openedSelect) openedSelect.value = "";
    if (key === "review" && reviewSelect) reviewSelect.value = "";
    if (key === "procedure" && procedureSelect) procedureSelect.value = "";
    if (key === "procedureAge" && procedureAgeSelect) procedureAgeSelect.value = "";
    if (key === "procedureDue" && procedureDueSelect) procedureDueSelect.value = "";
    if (key === "openedPeriod" && openedPeriodSelect) openedPeriodSelect.value = "";
    if (key === "sort" && sortSelect) sortSelect.value = "recommended";
    renderDocuments();
  });
  resetButton?.addEventListener("click", () => {
    queryInput.value = "";
    categorySelect.value = "";
    if (languageSelect) languageSelect.value = "";
    if (formatSelect) formatSelect.value = "";
    if (favoriteSelect) favoriteSelect.value = "";
    if (openedSelect) openedSelect.value = "";
    if (procedureSelect) procedureSelect.value = "";
    if (procedureAgeSelect) procedureAgeSelect.value = "";
    if (procedureDueSelect) procedureDueSelect.value = "";
    if (reviewSelect) reviewSelect.value = "";
    if (openedPeriodSelect) openedPeriodSelect.value = "";
    if (sortSelect) sortSelect.value = "recommended";
    renderDocuments();
    queryInput.focus();
  });



  referenceSummary?.addEventListener("click", event => {
    const button = event.target.closest("[data-reference-summary]");
    if (!button) return;
    const key = button.dataset.referenceSummary;
    if (favoriteSelect) favoriteSelect.value = key === "favorites" ? "favorites" : "";
    if (openedSelect) openedSelect.value = key === "opened" ? "opened" : key === "unopened" ? "unopened" : "";
    if (reviewSelect) reviewSelect.value = key === "review" ? "review" : "";
    if (procedureDueSelect) procedureDueSelect.value = key === "procedure-overdue" ? "overdue" : key === "procedure-due-today" ? "today" : key === "procedure-due-soon" ? "7" : key === "procedure-due-unset" ? "unset" : "";
    renderDocuments();
  });

  exportCsvButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const rows = [["資料名","分類","言語","形式","ファイル名","お気に入り","要確認","確認手続き","確認開始日時","確認期限","期限状態","確認完了日時","メモ","最終閲覧日時"]];
    getFilteredDocuments().forEach(doc => rows.push([
      doc.title, categoryLabels[doc.category] || doc.category, languageLabels[doc.language] || doc.language,
      formatLabels[getDocumentFormat(doc)], doc.fileName, progress[doc.documentId]?.favorite ? "はい" : "いいえ",
      progress[doc.documentId]?.review ? "はい" : "いいえ",
      ({unconfirmed:"未確認","in-progress":"確認中",completed:"確認済み"})[progress[doc.documentId]?.procedureStatus || "unconfirmed"],
      formatReferenceOpenedAt(progress[doc.documentId]?.procedureStartedAt),
      progress[doc.documentId]?.procedureDueDate || "",
      (() => {
        const state = progress[doc.documentId] || {};
        const due = String(state.procedureDueDate || "");
        if (!due) return "未設定";
        if ((state.procedureStatus || "unconfirmed") === "completed") return "確認済み";
        const end = new Date(`${due}T23:59:59`).getTime();
        if (end < Date.now()) return "期限超過";
        if (formatLocalDate(new Date()) === due) return "本日期限";
        return "期限内";
      })(),
      formatReferenceOpenedAt(progress[doc.documentId]?.procedureCompletedAt),
      progress[doc.documentId]?.note || "",
      formatReferenceOpenedAt(progress[doc.documentId]?.lastOpenedAt)
    ]));
    const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `関連資料一覧_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });


  function getDueReportDocuments() {
    const progress = readReferenceProgress();
    return documents
      .filter(doc => {
        const state = progress[doc.documentId] || {};
        const info = getDueInfo(state);
        return Boolean(info.dueDate) && info.status !== "completed";
      })
      .sort((a, b) => {
        const aInfo = getDueInfo(progress[a.documentId] || {});
        const bInfo = getDueInfo(progress[b.documentId] || {});
        return aInfo.rank - bInfo.rank || (aInfo.days ?? Number.MAX_SAFE_INTEGER) - (bInfo.days ?? Number.MAX_SAFE_INTEGER) || String(a.title || "").localeCompare(String(b.title || ""), "ja", { numeric: true });
      });
  }

  exportDueReportButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const targets = getDueReportDocuments();
    if (!targets.length) return window.alert("確認期限が設定された未完了資料はありません。");
    const rows = [["期限状態","確認期限","残日数・超過日数","資料名","分類","確認手続き","確認開始日時","要確認","メモ"]];
    targets.forEach(doc => {
      const state = progress[doc.documentId] || {};
      const info = getDueInfo(state);
      rows.push([
        info.status === "overdue" ? "期限超過" : info.status === "today" ? "本日期限" : "期限内",
        info.dueDate,
        info.label,
        doc.title,
        categoryLabels[doc.category] || doc.category,
        ({unconfirmed:"未確認","in-progress":"確認中",completed:"確認済み"})[state.procedureStatus || "unconfirmed"],
        formatReferenceOpenedAt(state.procedureStartedAt),
        state.review ? "はい" : "いいえ",
        state.note || ""
      ]);
    });
    const csv = "\uFEFF" + rows.map(row => row.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `関連資料_確認期限レポート_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  printDueReportButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const targets = getDueReportDocuments();
    if (!targets.length) return window.alert("確認期限が設定された未完了資料はありません。");
    const rows = targets.map(doc => {
      const state = progress[doc.documentId] || {};
      const info = getDueInfo(state);
      const statusLabel = info.status === "overdue" ? "期限超過" : info.status === "today" ? "本日期限" : "期限内";
      return `<tr><td>${escapeHtml(statusLabel)}</td><td>${escapeHtml(info.dueDate)}</td><td>${escapeHtml(info.label)}</td><td>${escapeHtml(doc.title)}</td><td>${escapeHtml(categoryLabels[doc.category] || doc.category)}</td><td>${escapeHtml(({unconfirmed:"未確認","in-progress":"確認中",completed:"確認済み"})[state.procedureStatus || "unconfirmed"])}</td><td>${escapeHtml(state.note || "")}</td></tr>`;
    }).join("");
    const overdueCount = targets.filter(doc => getDueInfo(progress[doc.documentId] || {}).status === "overdue").length;
    const todayCount = targets.filter(doc => getDueInfo(progress[doc.documentId] || {}).status === "today").length;
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return window.alert("印刷画面を開けませんでした。ブラウザのポップアップ設定をご確認ください。");
    w.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>関連資料 確認期限一覧</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px}p{font-size:12px;color:#555}.summary{margin:12px 0;padding:10px;background:#f3f4f6}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:6px;text-align:left;vertical-align:top}th{background:#f3f4f6}@media print{button{display:none}}</style></head><body><h1>関連資料 確認期限一覧</h1><p>出力日時：${new Date().toLocaleString("ja-JP")}</p><div class="summary">対象 ${targets.length}件／期限超過 ${overdueCount}件／本日期限 ${todayCount}件</div><table><thead><tr><th>期限状態</th><th>確認期限</th><th>残日数</th><th>資料名</th><th>分類</th><th>確認手続き</th><th>メモ</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  });


  printButton?.addEventListener("click", () => {
    const filtered = getFilteredDocuments();
    if (!filtered.length) return window.alert("印刷できる資料がありません。");
    const progress = readReferenceProgress();
    const rows = filtered.map(doc => `<tr><td>${escapeHtml(doc.title)}</td><td>${escapeHtml(categoryLabels[doc.category] || doc.category)}</td><td>${escapeHtml(languageLabels[doc.language] || doc.language)}</td><td>${escapeHtml(formatLabels[getDocumentFormat(doc)])}</td><td>${progress[doc.documentId]?.favorite ? "★" : ""}</td><td>${escapeHtml(({unconfirmed:"未確認","in-progress":"確認中",completed:"確認済み"})[progress[doc.documentId]?.procedureStatus || "unconfirmed"])}</td><td>${escapeHtml(formatReferenceOpenedAt(progress[doc.documentId]?.procedureCompletedAt) || "")}</td><td>${escapeHtml(formatReferenceOpenedAt(progress[doc.documentId]?.lastOpenedAt) || "未閲覧")}</td></tr>`).join("");
    const w = window.open("", "_blank", "noopener,noreferrer");
    if (!w) return window.alert("印刷画面を開けませんでした。ブラウザのポップアップ設定をご確認ください。");
    w.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>関連資料一覧</title><style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px}p{font-size:12px;color:#555}table{width:100%;border-collapse:collapse;font-size:11px}th,td{border:1px solid #aaa;padding:6px;text-align:left;vertical-align:top}th{background:#f3f4f6}@media print{button{display:none}}</style></head><body><h1>関連資料一覧</h1><p>出力日時：${new Date().toLocaleString("ja-JP")}／${filtered.length}件</p><table><thead><tr><th>資料名</th><th>分類</th><th>言語</th><th>形式</th><th>お気に入り</th><th>確認手続き</th><th>確認完了</th><th>最終閲覧</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>window.print()<\/script></body></html>`);
    w.document.close();
  });


  function bulkUpdateProcedure(targetStatus) {
    const filtered = getFilteredDocuments();
    if (!filtered.length) return window.alert("対象となる資料がありません。");
    const label = ({ "in-progress": "確認中", completed: "確認済み", unconfirmed: "未確認" })[targetStatus];
    if (!window.confirm(`現在表示中の資料 ${filtered.length}件を「${label}」へ変更します。よろしいですか？`)) return;
    const progress = readReferenceProgress();
    const now = new Date().toISOString();
    filtered.forEach(doc => {
      const current = progress[doc.documentId] || {};
      progress[doc.documentId] = {
        favorite: false, review: false, procedureDueDate: "", note: "", lastOpenedAt: "",
        ...current,
        procedureStatus: targetStatus,
        procedureStartedAt: targetStatus === "in-progress" ? (current.procedureStartedAt || now) : targetStatus === "unconfirmed" ? "" : (current.procedureStartedAt || now),
        procedureCompletedAt: targetStatus === "completed" ? now : "",
        updatedAt: now
      };
    });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    renderDocuments();
  }

  bulkProcedureStartButton?.addEventListener("click", () => bulkUpdateProcedure("in-progress"));
  bulkProcedureCompleteButton?.addEventListener("click", () => bulkUpdateProcedure("completed"));
  bulkProcedureResetButton?.addEventListener("click", () => bulkUpdateProcedure("unconfirmed"));

  function bulkUpdateDueDate(mode, presetDays = 0) {
    const filtered = getFilteredDocuments();
    if (!filtered.length) return window.alert("対象となる資料がありません。");
    let dueDate = "";
    if (mode === "set") {
      if (presetDays) {
        dueDate = addDaysToToday(presetDays);
      } else {
        const value = window.prompt("現在表示中の資料へ設定する確認期限をYYYY-MM-DD形式で入力してください。", "");
        if (value === null) return;
        dueDate = String(value).trim();
      }
      if (!isValidDateInput(dueDate)) {
        return window.alert("実在する確認期限をYYYY-MM-DD形式で入力してください。");
      }
    }
    const action = mode === "set" ? `確認期限を「${dueDate}」に設定` : "確認期限を解除";
    if (!window.confirm(`現在表示中の資料 ${filtered.length}件の${action}します。よろしいですか？`)) return;
    const progress = readReferenceProgress();
    const now = new Date().toISOString();
    filtered.forEach(doc => {
      const current = progress[doc.documentId] || {};
      progress[doc.documentId] = {
        favorite: false, review: false, procedureStatus: "unconfirmed", procedureStartedAt: "", procedureCompletedAt: "", note: "", lastOpenedAt: "",
        ...current,
        procedureDueDate: mode === "set" ? dueDate : "",
        updatedAt: now
      };
    });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    renderDocuments();
  }

  bulkDueSetButton?.addEventListener("click", () => bulkUpdateDueDate("set"));
  bulkDue7Button?.addEventListener("click", () => bulkUpdateDueDate("set", 7));
  bulkDue30Button?.addEventListener("click", () => bulkUpdateDueDate("set", 30));
  bulkDue90Button?.addEventListener("click", () => bulkUpdateDueDate("set", 90));
  bulkDueClearButton?.addEventListener("click", () => bulkUpdateDueDate("clear"));

  clearReviewsButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const reviewCount = Object.values(progress).filter(item => item?.review).length;
    if (!reviewCount) return window.alert("解除できる要確認資料はありません。");
    if (!window.confirm(`要確認 ${reviewCount}件を一括解除します。メモ・お気に入り・閲覧履歴は残ります。よろしいですか？`)) return;
    Object.keys(progress).forEach(id => { progress[id] = { ...progress[id], review: false, updatedAt: new Date().toISOString() }; });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    if (reviewSelect) reviewSelect.value = "";
    renderDocuments();
  });

  clearNotesButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const noteCount = Object.values(progress).filter(item => String(item?.note || "").trim()).length;
    if (!noteCount) return window.alert("削除できる資料メモはありません。");
    if (!window.confirm(`資料メモ ${noteCount}件を一括削除します。要確認・お気に入り・閲覧履歴は残ります。よろしいですか？`)) return;
    Object.keys(progress).forEach(id => { progress[id] = { ...progress[id], note: "", updatedAt: new Date().toISOString() }; });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    if (reviewSelect?.value === "noted") reviewSelect.value = "";
    renderDocuments();
  });

  exportProgressButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const payload = {
      format: "sk-dangerous-goods-guide-reference-progress",
      version: 1,
      exportedAt: new Date().toISOString(),
      documentCount: documents.length,
      progress
    };
    downloadJson(`関連資料_個人設定_${new Date().toISOString().slice(0,10)}.json`, payload);
  });

  importProgressInput?.addEventListener("change", async event => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return window.alert("JSONファイルは2MB以下にしてください。");
    try {
      const parsed = JSON.parse(await file.text());
      const imported = normalizeImportedProgress(parsed);
      const importCount = Object.keys(imported).length;
      if (!importCount) throw new Error("現在の登録資料に対応する個人設定がありません。");
      if (!window.confirm(`個人設定 ${importCount}件を読み込みます。現在の設定へ上書きします。よろしいですか？`)) return;
      const current = readReferenceProgress();
      localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify({ ...current, ...imported }));
      renderDocuments();
      window.alert(`個人設定 ${importCount}件を読み込みました。`);
    } catch (error) {
      window.alert(error?.message || "JSONファイルを読み込めませんでした。");
    }
  });

  clearFavoritesButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const count = Object.values(progress).filter(item => item?.favorite).length;
    if (!count) return window.alert("解除できるお気に入りはありません。");
    if (!window.confirm(`お気に入り ${count}件をすべて解除します。閲覧履歴は残ります。よろしいですか？`)) return;
    Object.keys(progress).forEach(id => { progress[id] = { ...progress[id], favorite: false, updatedAt: new Date().toISOString() }; });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    if (favoriteSelect) favoriteSelect.value = "";
    renderDocuments();
  });

  clearHistoryButton?.addEventListener("click", () => {
    const progress = readReferenceProgress();
    const openedCount = Object.values(progress).filter(item => item?.lastOpenedAt).length;
    if (!openedCount) {
      window.alert("消去できる閲覧履歴はありません。");
      return;
    }
    if (!window.confirm(`登録資料の閲覧履歴 ${openedCount}件を消去します。お気に入りは残ります。よろしいですか？`)) return;
    Object.keys(progress).forEach(id => {
      progress[id] = { ...progress[id], lastOpenedAt: "", updatedAt: new Date().toISOString() };
    });
    localStorage.setItem(REFERENCE_PROGRESS_KEY, JSON.stringify(progress));
    renderDocuments();
  });

  aiQueryInput.addEventListener("input", renderAiGuides);
  aiCategorySelect.addEventListener("change", renderAiGuides);

  imdgQueryInput.addEventListener("input", renderImdgClauses);
  imdgCategorySelect.addEventListener("change", renderImdgClauses);

  populateReferenceCategories();
  populateImdgCategories();
  renderImdgClauses();
  populateAiCategories();
  renderAiGuides();
  renderDocuments();
})();
