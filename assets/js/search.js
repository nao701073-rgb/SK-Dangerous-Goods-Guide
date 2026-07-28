
(() => {
  "use strict";

  const allData = Array.isArray(window.UN_DATABASE) ? window.UN_DATABASE : [];
  const PAGE_SIZE = 20;

  const elements = {
    searchForm: document.getElementById("searchForm"),
    searchInput: document.getElementById("searchInput"),
    suggestionBox: document.getElementById("suggestionBox"),
    classFilter: document.getElementById("classFilter"),
    packingGroupFilter: document.getElementById("packingGroupFilter"),
    subsidiaryRiskOnly: document.getElementById("subsidiaryRiskOnly"),
    clearFilters: document.getElementById("clearFilters"),
    sortOrder: document.getElementById("sortOrder"),
    resultList: document.getElementById("resultList"),
    resultCount: document.getElementById("resultCount"),
    emptyState: document.getElementById("emptyState"),
    recordCount: document.getElementById("recordCount"),
    pagination: document.getElementById("pagination"),
    prevPage: document.getElementById("prevPage"),
    nextPage: document.getElementById("nextPage"),
    pageInfo: document.getElementById("pageInfo"),
    tabs: [...document.querySelectorAll(".search-tab")]
  };

  const state = {
    mode: "all",
    query: "",
    results: [],
    page: 1,
    favorites: new Set((window.ISSStorage?.getFavorites() || []).map(item => item.unNumber))
  };

  const normalize = value =>
    String(value ?? "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const normalizeUn = value =>
    normalize(value).replace(/^un\s*/i, "").replace(/\D/g, "").padStart(4, "0");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");


  const labelMaster = Array.isArray(window.LABEL_MASTER?.labels) ? window.LABEL_MASTER.labels : [];

  const normalizeClassValue = value =>
    String(value ?? "")
      .trim()
      .replace(/^class\s*/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "");

  const resolveClassLabel = classValue => {
    const normalized = normalizeClassValue(classValue);
    if (!normalized || normalized === '-' || normalized === 'なし') return null;
    const exact = labelMaster.find(item => normalizeClassValue(item.class) === normalized);
    if (exact) return exact;
    const mainClass = normalized.split('.')[0];
    return labelMaster.find(item => normalizeClassValue(item.class) === mainClass) || null;
  };

  const parseSubsidiaryRiskCodes = value => {
    const normalized = String(value ?? "").normalize("NFKC").toUpperCase().trim();
    if (!normalized || normalized === "-" || normalized === "—" || normalized === "なし") return [];

    // SP番号、注記番号、頁番号を副次危険性等級として誤認しない。
    const withoutSpecialProvisions = normalized.replace(/SP\s*\d+[A-Z]?/g, " ");
    const allowed = new Set(["1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "3", "4.1", "4.2", "4.3", "5.1", "6.1", "8"]);
    const tokens = withoutSpecialProvisions
      .split(/[\s,，、・/／;；()（）]+/)
      .map(token => token.trim())
      .filter(token => allowed.has(token))
      .map(token => /^1(?:\.[1-6])?$/.test(token) ? "1" : token);
    return [...new Set(tokens)];
  };

  const formatSubsidiaryRisk = value => {
    const classCodes = parseSubsidiaryRiskCodes(value);
    return classCodes.length ? classCodes.join("/") : "なし";
  };
  function populateClassFilter() {
    const classes = [...new Set(
      allData.map(item => item.class).filter(value => value && value !== "-")
    )].sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));

    for (const value of classes) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      elements.classFilter.append(option);
    }
  }

  function scoreItem(item, query, mode) {
    if (!query) return 1;

    const q = normalize(query);
    const qUn = normalizeUn(query);
    const un = normalize(item.unNumber);
    const ja = normalize(item.properShippingNameJa);
    const en = normalize(item.properShippingName);

    let score = 0;

    if (mode !== "name") {
      if (un === qUn) score += 100;
      else if (un.startsWith(qUn)) score += 60;
      else if (un.includes(qUn)) score += 30;
    }

    if (mode !== "un") {
      if (ja === q || en === q) score += 95;
      if (ja.startsWith(q) || en.startsWith(q)) score += 65;
      if (ja.includes(q) || en.includes(q)) score += 40;
    }

    return score;
  }

  function runSearch({ resetPage = true } = {}) {
    const query = elements.searchInput.value.trim();
    const selectedClass = elements.classFilter.value;
    const selectedPackingGroup = elements.packingGroupFilter.value;
    const subsidiaryOnly = elements.subsidiaryRiskOnly.checked;

    state.query = query;

    let results = allData
      .map(item => ({ item, score: scoreItem(item, query, state.mode) }))
      .filter(entry => query ? entry.score > 0 : true)
      .filter(entry => !selectedClass || entry.item.class === selectedClass)
      .filter(entry => !selectedPackingGroup || entry.item.packingGroup === selectedPackingGroup)
      .filter(entry => {
        if (!subsidiaryOnly) return true;
        const value = entry.item.subsidiaryRisk;
        return value && value !== "-";
      });

    const sortOrder = elements.sortOrder.value;
    results.sort((a, b) => {
      if (query && b.score !== a.score) return b.score - a.score;
      if (sortOrder === "un-desc") {
        return b.item.unNumber.localeCompare(a.item.unNumber, "ja", { numeric: true });
      }
      if (sortOrder === "name-ja") {
        return (a.item.properShippingNameJa || "").localeCompare(
          b.item.properShippingNameJa || "", "ja"
        );
      }
      if (sortOrder === "name-en") {
        return (a.item.properShippingName || "").localeCompare(
          b.item.properShippingName || "", "en"
        );
      }
      return a.item.unNumber.localeCompare(b.item.unNumber, "ja", { numeric: true });
    });

    state.results = results.map(entry => entry.item);
    if (resetPage) state.page = 1;

    if (window.ISSStorage && (query || selectedClass || selectedPackingGroup || subsidiaryOnly)) {
      window.ISSStorage.addSearchHistory({
        mode: state.mode,
        query,
        resultCount: state.results.length
      });
    }

    renderResults();
    hideSuggestions();
  }

  function renderResults() {
    const total = state.results.length;
    elements.resultCount.textContent = `${total.toLocaleString("ja-JP")}件`;

    if (!total) {
      elements.resultList.innerHTML = "";
      elements.emptyState.hidden = false;
      elements.emptyState.innerHTML = state.query
        ? "<strong>該当するデータがありません</strong><p>検索語や絞り込み条件を変更してください。</p>"
        : "<strong>検索ワードを入力してください</strong><p>条件だけで一覧を絞り込むこともできます。</p>";
      elements.pagination.hidden = true;
      return;
    }

    elements.emptyState.hidden = true;

    const totalPages = Math.ceil(total / PAGE_SIZE);
    state.page = Math.min(Math.max(state.page, 1), totalPages);
    const start = (state.page - 1) * PAGE_SIZE;
    const pageItems = state.results.slice(start, start + PAGE_SIZE);

    elements.resultList.innerHTML = pageItems.map(renderCard).join("");

    elements.pagination.hidden = totalPages <= 1;
    elements.pageInfo.textContent = `${state.page} / ${totalPages}ページ`;
    elements.prevPage.disabled = state.page <= 1;
    elements.nextPage.disabled = state.page >= totalPages;

    document.querySelectorAll(".favorite-button").forEach(button => {
      button.addEventListener("click", () => toggleFavorite(button.dataset.un));
    });

    document.querySelectorAll(".detail-button").forEach(button => {
      button.addEventListener("click", () => {
        const un = encodeURIComponent(button.dataset.un);
        if (window.ISSStorage) {
          const selected = allData.find(item => item.unNumber === button.dataset.un);
          window.ISSStorage.addSearchHistory({
            mode: state.mode,
            query: state.query,
            resultCount: state.results.length,
            openedUnNumber: selected?.unNumber || "",
            openedNameJa: selected?.properShippingNameJa || "",
            openedNameEn: selected?.properShippingName || ""
          });
        }
        window.location.href = `dangerous-goods-detail.html?un=${un}`;
      });
    });
  }

  function renderCard(item) {
    const favorite = state.favorites.has(item.unNumber);
    const subsidiary = item.subsidiaryRisk && item.subsidiaryRisk !== "-"
      ? item.subsidiaryRisk
      : "なし";
    const ems = window.EMSResolver?.resolve(item) || {
      fireCode: "", spillageCode: "", combinedCode: ""
    };

    return `
      <article class="result-card">
        <div class="result-card__top">
          <span class="un-number">UN${escapeHtml(item.unNumber)}</span>
          <button
            class="favorite-button ${favorite ? "is-favorite" : ""}"
            type="button"
            data-un="${escapeHtml(item.unNumber)}"
            aria-label="お気に入りを切り替える"
          >${favorite ? "★" : "☆"}</button>
        </div>

        <div>
          <h3>${escapeHtml(item.properShippingNameJa || "日本語名なし")}</h3>
          <p class="english-name">${escapeHtml(item.properShippingName || "English name unavailable")}</p>
        </div>

        <div class="result-meta">
          <span class="meta-chip">等級 ${escapeHtml(item.class || "-")}</span>
          <span class="meta-chip">容器等級 ${escapeHtml(item.packingGroup || "-")}</span>
        </div>

        <div class="result-summary">
          <div class="summary-item">
            <span>副次危険性等級</span>
            <strong>${escapeHtml(formatSubsidiaryRisk(subsidiary))}</strong>
          </div>
          <div class="summary-item">
            <span>包装要件</span>
            <strong>${escapeHtml(item.smallPackingInstruction || "-")}</strong>
          </div>
          <div class="summary-item">
            <span>特別規定</span>
            <strong>${escapeHtml(item.specialProvisions || "-")}</strong>
          </div>
          <div class="summary-item">
            <span>積載方法</span>
            <strong>${escapeHtml(item.stowage || "-")}</strong>
          </div>
          <div class="summary-item summary-item--ems">
            <span>EmS</span>
            <strong>${escapeHtml(ems.combinedCode || "未解決")}</strong>
          </div>
        </div>

        <div class="card-actions">
          <button class="detail-button" type="button" data-un="${escapeHtml(item.unNumber)}">
            詳細を表示 →
          </button>
        </div>
      </article>
    `;
  }

  function toggleFavorite(unNumber) {
    const item = allData.find(entry => entry.unNumber === unNumber);
    if (!item || !window.ISSStorage) return;
    const added = window.ISSStorage.toggleFavorite(item);
    if (added) state.favorites.add(unNumber);
    else state.favorites.delete(unNumber);
    renderResults();
  }

  function renderSuggestions() {
    const query = elements.searchInput.value.trim();
    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    const candidates = allData
      .map(item => ({ item, score: scoreItem(item, query, state.mode) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(entry => entry.item);

    if (!candidates.length) {
      hideSuggestions();
      return;
    }

    elements.suggestionBox.innerHTML = candidates.map(item => `
      <button class="suggestion-item" type="button" data-un="${escapeHtml(item.unNumber)}">
        <strong>UN${escapeHtml(item.unNumber)} ${escapeHtml(item.properShippingNameJa)}</strong>
        <small>${escapeHtml(item.properShippingName)}</small>
      </button>
    `).join("");

    elements.suggestionBox.hidden = false;

    elements.suggestionBox.querySelectorAll(".suggestion-item").forEach(button => {
      button.addEventListener("click", () => {
        elements.searchInput.value = button.dataset.un;
        state.mode = "un";
        updateTabs();
        runSearch();
      });
    });
  }

  function hideSuggestions() {
    elements.suggestionBox.hidden = true;
    elements.suggestionBox.innerHTML = "";
  }

  function updateTabs() {
    elements.tabs.forEach(tab => {
      tab.classList.toggle("active", tab.dataset.mode === state.mode);
    });
  }

  elements.searchForm.addEventListener("submit", event => {
    event.preventDefault();
    runSearch();
  });

  elements.searchInput.addEventListener("input", () => {
    renderSuggestions();
  });

  elements.searchInput.addEventListener("keydown", event => {
    if (event.key === "Escape") hideSuggestions();
  });

  document.addEventListener("click", event => {
    if (!elements.searchForm.contains(event.target)) hideSuggestions();
  });

  elements.tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      state.mode = tab.dataset.mode;
      updateTabs();
      runSearch();
    });
  });

  [
    elements.classFilter,
    elements.packingGroupFilter,
    elements.subsidiaryRiskOnly,
    elements.sortOrder
  ].forEach(element => {
    element.addEventListener("change", () => runSearch());
  });

  elements.clearFilters.addEventListener("click", () => {
    elements.searchInput.value = "";
    elements.classFilter.value = "";
    elements.packingGroupFilter.value = "";
    elements.subsidiaryRiskOnly.checked = false;
    elements.sortOrder.value = "un-asc";
    state.mode = "all";
    updateTabs();
    state.results = [];
    state.page = 1;
    elements.resultList.innerHTML = "";
    elements.resultCount.textContent = "0件";
    elements.emptyState.hidden = false;
    elements.emptyState.innerHTML =
      "<strong>検索ワードを入力してください</strong><p>UN番号は「UN1203」「1203」のどちらでも検索できます。</p>";
    elements.pagination.hidden = true;
  });

  elements.prevPage.addEventListener("click", () => {
    if (state.page > 1) {
      state.page -= 1;
      renderResults();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  elements.nextPage.addEventListener("click", () => {
    const totalPages = Math.ceil(state.results.length / PAGE_SIZE);
    if (state.page < totalPages) {
      state.page += 1;
      renderResults();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  elements.recordCount.textContent = allData.length.toLocaleString("ja-JP");
  populateClassFilter();

  const urlParams = new URLSearchParams(window.location.search);
  const initialQuery = urlParams.get("q");
  if (initialQuery) {
    elements.searchInput.value = initialQuery;
    runSearch();
  }
})();
