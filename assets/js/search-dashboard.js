(() => {
  "use strict";

  const data = Array.isArray(window.UN_DATABASE) ? window.UN_DATABASE : [];
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  const root = document.getElementById("searchResults");
  const count = document.getElementById("resultCount");
  const favoriteFilter = document.getElementById("favoriteFilter");
  const historyButton = document.getElementById("historyButton");
  const advancedToggle = document.getElementById("advancedSearchToggle");
  const advancedPanel = document.getElementById("advancedSearchPanel");
  const resetButton = document.getElementById("resetSearch");
  const activeConditions = document.getElementById("activeConditions");
  const presetSelect = document.getElementById("searchPresetSelect");
  const loadPresetButton = document.getElementById("loadSearchPreset");
  const savePresetButton = document.getElementById("saveSearchPreset");
  const deletePresetButton = document.getElementById("deleteSearchPreset");
  const exportCsvButton = document.getElementById("exportSearchCsv");

  const fields = {
    unNumber: document.getElementById("filterUnNumber"),
    class: document.getElementById("filterClass"),
    subsidiary: document.getElementById("filterSubsidiary"),
    packingGroup: document.getElementById("filterPackingGroup"),
    marine: document.getElementById("filterMarine"),
    limited: document.getElementById("filterLimited"),
    excepted: document.getElementById("filterExcepted"),
    packingCode: document.getElementById("filterPackingCode"),
    specialProvision: document.getElementById("filterSpecialProvision"),
    ems: document.getElementById("filterEms"),
    transportCode: document.getElementById("filterTransportCode"),
    resultSort: document.getElementById("resultSort"),
    resultLimit: document.getElementById("resultLimit")
  };

  let favoritesOnly = false;
  const SEARCH_STATE_KEY = "issDangerousGoodsSearchStateV1";
  const SEARCH_PRESET_KEY = "issDangerousGoodsSearchPresetsV1";
  let lastMatchedRows = [];
  let lastRenderedCount = 0;
  const searchIndex = new WeakMap();

  function buildSearchIndex(item) {
    const cached = searchIndex.get(item);
    if (cached) return cached;
    const ems = window.EMSResolver?.resolve(item) || {};
    const index = {
      text: normalizeSearchText([
        item.unNumber, item.properShippingName, item.properShippingNameJa,
        item.class, item.packingGroup,
        item.specialProvisions, item.remarks
      ].join(" ")),
      unNumber: String(item.unNumber || "").padStart(4, "0"),
      classValue: normalizeClassValue(item.class),
      subsidiaryValues: parseSubsidiaryRiskCodes(item.subsidiaryRisk),
      hasLimited: hasValue(item.limitedQuantity),
      hasExcepted: hasValue(item.exceptedQuantity),
      packingCodes: normalizeCode([
        item.smallPackingInstruction, item.smallPackingAdditional,
        item.largePackingInstruction, item.largePackingAdditional,
        item.ibcInstruction, item.ibcAdditional,
        item.portableTankInstruction, item.portableTankAdditional,
        item.flexibleBulkContainer
      ].flat().join(" ")),
      specialCodes: normalizeCode([item.specialProvisions, item.remarks].flat().join(" ")),
      emsCode: normalizeCode(ems.combinedCode || item.ems),
      transportCodes: normalizeCode([item.stowage, item.segregation, item.segregationGroup].flat().join(" "))
    };
    searchIndex.set(item, index);
    return index;
  }

  function prepareConditions(conditions) {
    return {
      ...conditions,
      queryNormalized: normalizeSearchText(conditions.query),
      unNumberNormalized: conditions.unNumber ? normalizeSearchText(conditions.unNumber).padStart(4, "0") : "",
      classNormalized: normalizeClassValue(conditions.class),
      subsidiaryNormalized: normalizeClassValue(conditions.subsidiary),
      packingTokens: normalizeCode(conditions.packingCode).split(" ").filter(Boolean),
      specialTokens: normalizeCode(conditions.specialProvision).split(" ").filter(Boolean),
      emsNormalized: normalizeCode(conditions.ems),
      transportTokens: normalizeCode(conditions.transportCode).split(" ").filter(Boolean)
    };
  }

  function saveSearchState(extra = {}) {
    try {
      const state = {
        conditions: currentConditions(),
        favoritesOnly,
        advancedOpen: !advancedPanel.hidden,
        scrollY: window.scrollY || 0,
        savedAt: Date.now(),
        ...extra
      };
      sessionStorage.setItem(SEARCH_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn("検索条件を保存できませんでした。", error);
    }
  }

  function restoreSearchState() {
    try {
      const raw = sessionStorage.getItem(SEARCH_STATE_KEY);
      if (!raw) return null;
      const state = JSON.parse(raw);
      const conditions = state?.conditions || {};
      input.value = conditions.query || "";
      Object.entries(conditions).forEach(([key, value]) => {
        if (key === "query" || !fields[key]) return;
        fields[key].value = value || (key === "resultLimit" ? "40" : key === "resultSort" ? "un-asc" : "");
      });
      favoritesOnly = Boolean(state.favoritesOnly);
      favoriteFilter.textContent = favoritesOnly ? "★ お気に入りのみ" : "☆ お気に入り";
      const shouldOpen = Boolean(state.advancedOpen) || Object.entries(conditions).some(([key, value]) => key !== "query" && key !== "resultLimit" && Boolean(value));
      advancedPanel.hidden = !shouldOpen;
      advancedToggle.setAttribute("aria-expanded", String(shouldOpen));
      advancedToggle.textContent = shouldOpen ? "詳細検索を閉じる" : "詳細検索を開く";
      return state;
    } catch (error) {
      console.warn("保存済み検索条件を復元できませんでした。", error);
      sessionStorage.removeItem(SEARCH_STATE_KEY);
      return null;
    }
  }

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
      .normalize("NFKC")
      .trim()
      .replace(/^class\s*/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "");

  const resolveClassLabel = classValue => {
    const normalized = normalizeClassValue(classValue);
    if (!normalized || normalized === "-" || normalized === "なし") return null;
    const exact = labelMaster.find(item => normalizeClassValue(item.class) === normalized);
    if (exact) return exact;
    const mainClass = normalized.split(".")[0];
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

  const normalizeSearchText = value =>
    String(value ?? "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/^un\s*/i, "");

  const normalizeCode = value =>
    String(value ?? "")
      .normalize("NFKC")
      .toUpperCase()
      .replace(/[、,，／/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const hasValue = value => {
    const normalized = String(value ?? "").normalize("NFKC").trim();
    return Boolean(normalized && normalized !== "-" && normalized !== "—" && normalized !== "なし");
  };

  const fieldValue = key => fields[key]?.value?.trim?.() || "";

  function populateSelect(select, values, formatter = value => value) {
    const unique = [...new Set(values.map(value => String(value ?? "").trim()).filter(value => value && value !== "-"))]
      .sort((a, b) => a.localeCompare(b, "ja", { numeric: true }));
    select.insertAdjacentHTML("beforeend", unique.map(value => `<option value="${escapeHtml(value)}">${escapeHtml(formatter(value))}</option>`).join(""));
  }

  const isDangerousGoodsClass = value => {
    const normalized = normalizeClassValue(value);
    return /^(?:1\.[1-6]|2\.[1-3]|3|4\.[1-3]|5\.[12]|6\.[12]|7|8|9)$/.test(normalized);
  };

  const hazardClassMaster = window.HAZARD_CLASS_MASTER || {};
  const classOptionLabels = hazardClassMaster.labels || {};
  const primaryClassOptions = hazardClassMaster.options
    ? hazardClassMaster.options(hazardClassMaster.primaryValues || [])
    : [];
  const subsidiaryClassOptions = hazardClassMaster.options
    ? hazardClassMaster.options(hazardClassMaster.subsidiaryValues || []).map(option => ({
        ...option,
        label: option.value === "1" ? "1．火薬類" : option.label
      }))
    : [];

  const populateClassSelect = (select, options) => {
    select.insertAdjacentHTML("beforeend", options.map(option =>
      `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`
    ).join(""));
  };

  const formatClassFilterLabel = value => classOptionLabels[normalizeClassValue(value)] || formatSubsidiaryRisk(value);

  populateClassSelect(fields.class, primaryClassOptions);
  populateClassSelect(fields.subsidiary, subsidiaryClassOptions);

  function currentConditions() {
    return {
      query: input.value,
      unNumber: fieldValue("unNumber"),
      class: fieldValue("class"),
      subsidiary: fieldValue("subsidiary"),
      packingGroup: fieldValue("packingGroup"),
      marine: fieldValue("marine"),
      limited: fieldValue("limited"),
      excepted: fieldValue("excepted"),
      packingCode: fieldValue("packingCode"),
      specialProvision: fieldValue("specialProvision"),
      ems: fieldValue("ems"),
      transportCode: fieldValue("transportCode"),
      resultSort: fieldValue("resultSort") || "un-asc",
      resultLimit: fieldValue("resultLimit") || "40"
    };
  }

  function matchesIndexedTokens(tokens, haystack) {
    return !tokens.length || tokens.every(token => haystack.includes(token));
  }

  function matches(item, conditions) {
    if (favoritesOnly && !window.ISSStorage?.isFavorite(item.unNumber)) return false;

    const index = buildSearchIndex(item);
    if (conditions.queryNormalized && !index.text.includes(conditions.queryNormalized)) return false;
    if (conditions.unNumberNormalized && index.unNumber !== conditions.unNumberNormalized) return false;
    if (conditions.classNormalized) {
      if (["1", "2", "4", "5", "6"].includes(conditions.classNormalized) ? !index.classValue.startsWith(`${conditions.classNormalized}.`) : index.classValue !== conditions.classNormalized) return false;
    }
    if (conditions.subsidiaryNormalized && !index.subsidiaryValues.includes(conditions.subsidiaryNormalized)) return false;
    if (conditions.packingGroup && String(item.packingGroup || "-") !== conditions.packingGroup) return false;
    if (conditions.marine === "yes" && !item.marinePollutant) return false;
    if (conditions.marine === "no" && item.marinePollutant) return false;
    if (conditions.limited === "yes" && !index.hasLimited) return false;
    if (conditions.limited === "no" && index.hasLimited) return false;
    if (conditions.excepted === "yes" && !index.hasExcepted) return false;
    if (conditions.excepted === "no" && index.hasExcepted) return false;
    if (!matchesIndexedTokens(conditions.packingTokens, index.packingCodes)) return false;
    if (!matchesIndexedTokens(conditions.specialTokens, index.specialCodes)) return false;
    if (conditions.emsNormalized && !index.emsCode.includes(conditions.emsNormalized)) return false;
    if (!matchesIndexedTokens(conditions.transportTokens, index.transportCodes)) return false;
    return true;
  }

  function renderActiveConditions(conditions) {
    const labels = [];
    const add = (key, label, value, display = value) => {
      if (value) labels.push({ key, text: `${label}: ${display}` });
    };
    add("query", "キーワード", conditions.query);
    add("unNumber", "国連番号", conditions.unNumber);
    add("class", "等級", conditions.class, conditions.class ? formatClassFilterLabel(conditions.class) : "");
    add("subsidiary", "副次危険性等級", conditions.subsidiary, conditions.subsidiary ? formatClassFilterLabel(conditions.subsidiary) : "");
    add("packingGroup", "容器等級", conditions.packingGroup);
    add("marine", "海洋汚染物質", conditions.marine, conditions.marine === "yes" ? "別表第1にP表記あり" : "別表第1にP表記なし");
    add("limited", "少量危険物", conditions.limited, conditions.limited === "yes" ? "規定あり" : "規定なし");
    add("excepted", "微量危険物", conditions.excepted, conditions.excepted === "yes" ? "規定あり" : "規定なし");
    add("packingCode", "包装・容器コード", conditions.packingCode);
    add("specialProvision", "備考・特別規定", conditions.specialProvision);
    add("ems", "EmS", conditions.ems);
    add("transportCode", "積載方法・隔離", conditions.transportCode);
    if (conditions.resultSort && conditions.resultSort !== "un-asc") {
      const sortLabels = {
        "un-desc": "国連番号 降順",
        "name-ja-asc": "日本語名 昇順",
        "name-ja-desc": "日本語名 降順",
        "name-en-asc": "英語名 昇順",
        "name-en-desc": "英語名 降順",
        "class-asc": "等級 昇順",
        "class-desc": "等級 降順",
        "packing-group-asc": "容器等級 I→III",
        "packing-group-desc": "容器等級 III→I",
        "subsidiary-asc": "副次危険性等級 昇順",
        "subsidiary-desc": "副次危険性等級 降順"
      };
      add("resultSort", "並び順", conditions.resultSort, sortLabels[conditions.resultSort] || conditions.resultSort);
    }

    activeConditions.hidden = labels.length === 0;
    activeConditions.innerHTML = labels.length
      ? `<strong>適用中の条件</strong><div>${labels.map(item => `<button type="button" class="condition-chip" data-clear-condition="${escapeHtml(item.key)}" title="この条件を解除">${escapeHtml(item.text)}<span aria-hidden="true">×</span></button>`).join("")}</div>`
      : "";
  }

  function clearSingleCondition(key) {
    if (key === "query") input.value = "";
    else if (fields[key]) fields[key].value = key === "resultSort" ? "un-asc" : key === "resultLimit" ? "40" : "";
    render();
  }

  function sortRows(rows, mode) {
    const copy = [...rows];
    const unValue = item => Number(String(item.unNumber || "").replace(/\D/g, "")) || 0;
    const jaName = item => String(item.properShippingNameJa || "");
    const enName = item => String(item.properShippingName || "");
    const classValue = item => normalizeClassValue(item.class);
    const subsidiaryValue = item => parseSubsidiaryRiskCodes(item.subsidiaryRisk).join("/");
    const packingRank = item => ({ I: 1, II: 2, III: 3, "-": 9, "": 9 })[String(item.packingGroup || "-").trim()] ?? 9;
    const byUnAsc = (a, b) => unValue(a) - unValue(b);
    const compareText = (a, b, locale = "ja") => a.localeCompare(b, locale, { numeric: true, sensitivity: "base" });

    if (mode === "un-desc") return copy.sort((a, b) => unValue(b) - unValue(a));
    if (mode === "name-ja" || mode === "name-ja-asc") return copy.sort((a, b) => compareText(jaName(a), jaName(b), "ja") || byUnAsc(a, b));
    if (mode === "name-ja-desc") return copy.sort((a, b) => compareText(jaName(b), jaName(a), "ja") || byUnAsc(a, b));
    if (mode === "name-en-asc") return copy.sort((a, b) => compareText(enName(a), enName(b), "en") || byUnAsc(a, b));
    if (mode === "name-en-desc") return copy.sort((a, b) => compareText(enName(b), enName(a), "en") || byUnAsc(a, b));
    if (mode === "class" || mode === "class-asc") return copy.sort((a, b) => compareText(classValue(a), classValue(b)) || byUnAsc(a, b));
    if (mode === "class-desc") return copy.sort((a, b) => compareText(classValue(b), classValue(a)) || byUnAsc(a, b));
    if (mode === "packing-group-asc") return copy.sort((a, b) => packingRank(a) - packingRank(b) || byUnAsc(a, b));
    if (mode === "packing-group-desc") return copy.sort((a, b) => packingRank(b) - packingRank(a) || byUnAsc(a, b));
    if (mode === "subsidiary-asc") return copy.sort((a, b) => compareText(subsidiaryValue(a), subsidiaryValue(b)) || byUnAsc(a, b));
    if (mode === "subsidiary-desc") return copy.sort((a, b) => compareText(subsidiaryValue(b), subsidiaryValue(a)) || byUnAsc(a, b));
    return copy.sort(byUnAsc);
  }

  function readPresets() {
    try { return JSON.parse(localStorage.getItem(SEARCH_PRESET_KEY) || "[]"); } catch { return []; }
  }

  function writePresets(items) {
    localStorage.setItem(SEARCH_PRESET_KEY, JSON.stringify(items.slice(0, 30)));
    renderPresetOptions();
  }

  function renderPresetOptions(selectedId = "") {
    const items = readPresets();
    presetSelect.innerHTML = '<option value="">選択してください</option>' + items.map(item =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`
    ).join("");
    if (selectedId) presetSelect.value = selectedId;
  }

  function applyConditions(conditions = {}) {
    input.value = conditions.query || "";
    Object.entries(fields).forEach(([key, field]) => {
      if (!field) return;
      field.value = conditions[key] || (key === "resultLimit" ? "40" : key === "resultSort" ? "un-asc" : "");
    });
    const hasAdvanced = Object.entries(conditions).some(([key, value]) => !["query", "resultLimit", "resultSort"].includes(key) && Boolean(value));
    advancedPanel.hidden = !hasAdvanced;
    advancedToggle.setAttribute("aria-expanded", String(hasAdvanced));
    advancedToggle.textContent = hasAdvanced ? "詳細検索を閉じる" : "詳細検索を開く";
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCurrentResults() {
    if (!lastMatchedRows.length) { alert("出力できる検索結果がありません。"); return; }
    const header = ["国連番号", "日本語名", "英語名", "等級", "副次危険性等級", "容器等級", "EmS"];
    const lines = [header, ...lastMatchedRows.map(item => {
      const ems = window.EMSResolver?.resolve(item) || {};
      return [item.unNumber, item.properShippingNameJa, item.properShippingName, item.class, formatSubsidiaryRisk(item.subsidiaryRisk), item.packingGroup, ems.combinedCode || item.ems || ""];
    })].map(row => row.map(csvEscape).join(","));
    const blob = new Blob(["\ufeff" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `危険物検索結果_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function render() {
    const conditions = currentConditions();
    const preparedConditions = prepareConditions(conditions);
    const matchedRows = sortRows(data.filter(item => matches(item, preparedConditions)), conditions.resultSort);
    lastMatchedRows = matchedRows;
    const limit = conditions.resultLimit === "all" ? matchedRows.length : Number(conditions.resultLimit || 40);
    const rows = matchedRows.slice(0, limit);

    count.textContent = matchedRows.length > rows.length
      ? `検索結果 ${matchedRows.length}件（${rows.length}件表示）`
      : `検索結果 ${matchedRows.length}件`;
    renderActiveConditions(conditions);

    if (!rows.length) {
      const restrictiveKeys = ["unNumber", "class", "subsidiary", "packingGroup", "marine", "limited", "excepted", "packingCode", "specialProvision", "ems", "transportCode"];
      const hasAdvancedConditions = restrictiveKeys.some(key => Boolean(conditions[key]));
      root.innerHTML = `
        <div class="panel no-results-panel" role="status" aria-live="polite">
          <div class="panel-body">
            <h2>該当する危険物がありません</h2>
            <p>入力内容や絞り込み条件を確認してください。複数の詳細条件を指定している場合は、一部を解除すると見つかることがあります。</p>
            <div class="no-results-actions">
              ${hasAdvancedConditions ? '<button type="button" data-no-result-action="clear-advanced">詳細条件だけ解除</button>' : ''}
              <button type="button" class="advanced-reset" data-no-result-action="clear-all">すべての条件を解除</button>
            </div>
          </div>
        </div>`;
      saveSearchState();
      return;
    }

    lastRenderedCount = rows.length;
    root.innerHTML = rows.map(item => {
      const ems = window.EMSResolver?.resolve(item) || {};
      const label = window.LabelResolver?.resolvePrimary(item);
      const marineLabel = window.LabelResolver?.resolveMarinePollutant(item);
      const favorite = Boolean(window.ISSStorage?.isFavorite(item.unNumber));
      const detailUrl = `dangerous-goods-detail.html?un=${encodeURIComponent(item.unNumber)}&pg=${encodeURIComponent(item.packingGroup || "")}&row=${encodeURIComponent(item.sourceRow || "")}`;
      return `
        <article class="result-card" data-un-number="${escapeHtml(item.unNumber)}">
          <a class="result-card__main" href="${detailUrl}">
            <div class="result-label-stack">
              <div class="result-label result-label--image">
                ${label ? `<img src="${escapeHtml(label.src)}" alt="${escapeHtml(label.nameJa)}">` : `<span>${escapeHtml(item.class || "—")}</span>`}
              </div>
              ${marineLabel ? `<div class="result-label result-label--image result-label--secondary"><img src="${escapeHtml(marineLabel.src)}" alt="${escapeHtml(marineLabel.nameJa)}"></div>` : ""}
            </div>
            <div>
              <span class="result-un">国連番号 ${escapeHtml(item.unNumber)}</span>
              <h2>${escapeHtml(item.properShippingNameJa || "日本語名未登録")}</h2>
              <p>${escapeHtml(item.properShippingName || "")}</p>
            </div>
            <div class="result-facts">
              <div class="result-fact"><span>等級</span><strong>${escapeHtml(item.class || "—")}</strong></div>
              <div class="result-fact"><span>容器等級</span><strong>${escapeHtml(item.packingGroup || "—")}</strong></div>
              <div class="result-fact"><span>副次危険性等級</span><strong>${escapeHtml(formatSubsidiaryRisk(item.subsidiaryRisk))}</strong></div>
              <div class="result-fact"><span>EmS</span><strong>${escapeHtml(ems.combinedCode || "—")}</strong></div>
            </div>
          </a>
          <div class="result-card__actions" aria-label="国連番号${escapeHtml(item.unNumber)}の操作">
            <button type="button" data-result-action="favorite" aria-pressed="${favorite}" title="お気に入りを切り替える">${favorite ? "★ お気に入り済み" : "☆ お気に入り"}</button>
            <button type="button" data-result-action="copy" title="国連番号をコピー">国連番号をコピー</button>
          </div>
        </article>`;
    }).join("");
    saveSearchState();
  }


  function clearAdvancedConditions() {
    Object.entries(fields).forEach(([key, field]) => {
      if (!field || ["resultLimit", "resultSort"].includes(key)) return;
      field.value = "";
    });
    render();
  }

  function resetSearch() {
    input.value = "";
    Object.entries(fields).forEach(([key, field]) => {
      if (!field) return;
      field.value = key === "resultLimit" ? "40" : key === "resultSort" ? "un-asc" : "";
    });
    favoritesOnly = false;
    favoriteFilter.textContent = "☆ お気に入り";
    sessionStorage.removeItem(SEARCH_STATE_KEY);
    render();
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    render();
    window.ISSStorage?.addSearchHistory({
      mode: "advanced",
      query: input.value,
      conditions: currentConditions(),
      resultCount: lastMatchedRows.length
    });
  });

  input.addEventListener("input", render);
  fields.unNumber?.addEventListener("input", () => {
    const normalized = fields.unNumber.value.normalize("NFKC").replace(/\D/g, "").slice(0, 4);
    if (fields.unNumber.value !== normalized) fields.unNumber.value = normalized;
    render();
  });
  Object.values(fields).forEach(field => field?.addEventListener("change", render));

  advancedToggle.addEventListener("click", () => {
    const open = advancedPanel.hidden;
    advancedPanel.hidden = !open;
    advancedToggle.setAttribute("aria-expanded", String(open));
    advancedToggle.textContent = open ? "詳細検索を閉じる" : "詳細検索を開く";
    saveSearchState();
  });

  resetButton.addEventListener("click", resetSearch);

  activeConditions.addEventListener("click", event => {
    const button = event.target.closest("[data-clear-condition]");
    if (!button) return;
    clearSingleCondition(button.dataset.clearCondition);
  });

  favoriteFilter.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    favoriteFilter.textContent = favoritesOnly ? "★ お気に入りのみ" : "☆ お気に入り";
    render();
  });

  root.addEventListener("click", event => {
    const actionButton = event.target.closest("[data-no-result-action]");
    if (actionButton) {
      if (actionButton.dataset.noResultAction === "clear-advanced") clearAdvancedConditions();
      else if (actionButton.dataset.noResultAction === "clear-all") resetSearch();
      return;
    }
    const action = event.target.closest("[data-result-action]");
    if (action) {
      const card = action.closest(".result-card");
      const unNumber = card?.dataset.unNumber || "";
      const item = data.find(row => String(row.unNumber) === String(unNumber));
      if (!item) return;
      if (action.dataset.resultAction === "favorite") {
        const added = window.ISSStorage?.toggleFavorite(item);
        action.setAttribute("aria-pressed", String(Boolean(added)));
        action.textContent = added ? "★ お気に入り済み" : "☆ お気に入り";
        if (favoritesOnly && !added) render();
      } else if (action.dataset.resultAction === "copy") {
        const text = `UN${String(item.unNumber || "").padStart(4, "0")}`;
        const copy = navigator.clipboard?.writeText ? navigator.clipboard.writeText(text) : Promise.reject(new Error("clipboard unavailable"));
        copy.then(() => {
          action.textContent = "コピーしました";
          setTimeout(() => { action.textContent = "国連番号をコピー"; }, 1400);
        }).catch(() => {
          const area = document.createElement("textarea");
          area.value = text; area.setAttribute("readonly", ""); area.style.position = "fixed"; area.style.opacity = "0";
          document.body.appendChild(area); area.select();
          const ok = document.execCommand("copy"); area.remove();
          action.textContent = ok ? "コピーしました" : "コピーできませんでした";
          setTimeout(() => { action.textContent = "国連番号をコピー"; }, 1400);
        });
      }
      return;
    }
    const cardLink = event.target.closest("a.result-card__main");
    if (!cardLink) return;
    saveSearchState({ scrollY: window.scrollY || 0 });
  });

  window.addEventListener("pagehide", () => saveSearchState({ scrollY: window.scrollY || 0 }));

  historyButton.addEventListener("click", () => {
    const history = window.ISSStorage?.getSearchHistory?.() || [];
    const latest = history[0];
    input.value = latest?.query || latest || "";
    if (latest?.conditions) {
      Object.entries(latest.conditions).forEach(([key, value]) => {
        if (key === "query") return;
        if (fields[key]) fields[key].value = value || (key === "resultLimit" ? "40" : key === "resultSort" ? "un-asc" : "");
      });
      advancedPanel.hidden = false;
      advancedToggle.setAttribute("aria-expanded", "true");
      advancedToggle.textContent = "詳細検索を閉じる";
    }
    render();
  });

  savePresetButton?.addEventListener("click", () => {
    const name = prompt("保存する検索条件の名前を入力してください。", "詳細検索");
    if (!name?.trim()) return;
    const items = readPresets();
    const preset = { id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, name: name.trim(), conditions: currentConditions(), createdAt: new Date().toISOString() };
    items.unshift(preset); writePresets(items); presetSelect.value = preset.id;
  });

  loadPresetButton?.addEventListener("click", () => {
    const preset = readPresets().find(item => item.id === presetSelect.value);
    if (!preset) return; applyConditions(preset.conditions); render();
  });

  deletePresetButton?.addEventListener("click", () => {
    if (!presetSelect.value) return;
    const preset = readPresets().find(item => item.id === presetSelect.value);
    if (!confirm(`「${preset?.name || "選択した条件"}」を削除しますか？`)) return;
    writePresets(readPresets().filter(item => item.id !== presetSelect.value));
  });

  exportCsvButton?.addEventListener("click", exportCurrentResults);
  renderPresetOptions();

  const restoredState = restoreSearchState();
  render();
  if (restoredState && Number.isFinite(Number(restoredState.scrollY))) {
    requestAnimationFrame(() => {
      window.scrollTo({ top: Number(restoredState.scrollY), behavior: "auto" });
    });
  }
})();
