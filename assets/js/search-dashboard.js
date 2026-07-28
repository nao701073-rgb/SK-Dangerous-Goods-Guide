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

  const classOptionLabels = {
    "1": "1．火薬類（1.1～1.6）",
    "1.1": "1.1 火薬類",
    "1.2": "1.2 火薬類",
    "1.3": "1.3 火薬類",
    "1.4": "1.4 火薬類",
    "1.5": "1.5 火薬類",
    "1.6": "1.6 火薬類",
    "2": "2．高圧ガス（2.1～2.3）",
    "2.1": "2.1 引火性高圧ガス",
    "2.2": "2.2 非引火性・非毒性高圧ガス",
    "2.3": "2.3 毒性高圧ガス",
    "3": "3 引火性液体類",
    "4": "4 可燃性物質類（4.1～4.3）",
    "4.1": "4.1 可燃性物質",
    "4.2": "4.2 自然発火性物質",
    "4.3": "4.3 水反応可燃性物質",
    "5": "5 酸化性物質類（5.1～5.2）",
    "5.1": "5.1 酸化性物質",
    "5.2": "5.2 有機過酸化物",
    "6": "6 毒物類（6.1～6.2）",
    "6.1": "6.1 毒物",
    "6.2": "6.2 病毒をうつしやすい物質",
    "7": "7 放射性物質",
    "8": "8 腐食性物質",
    "9": "9 有害性物質"
  };

  // 他の詳細検索項目と同じ通常のプルダウン形式で表示する。
  // 4・5・6は各区分の一括検索、4.1～6.2は個別検索として同じ一覧に並べる。
  const primaryClassOptions = [
    "1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6",
    "2", "2.1", "2.2", "2.3",
    "3", "4", "4.1", "4.2", "4.3",
    "5", "5.1", "5.2",
    "6", "6.1", "6.2",
    "7", "8", "9"
  ].map(value => ({ value, label: classOptionLabels[value] }));

  // 国内法令上、副次危険性等級として実在する選択肢だけを表示する。
  // 火薬類の副標札は区分1.1～1.6を分けず、共通の「1」1種類とする。
  const subsidiaryClassOptions = ["1", "2.1", "3", "4.1", "4.2", "4.3", "5.1", "6.1", "8"]
    .map(value => ({ value, label: classOptionLabels[value] }));

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
    const add = (label, value, display = value) => { if (value) labels.push(`${label}: ${display}`); };
    add("キーワード", conditions.query);
    add("国連番号", conditions.unNumber);
    add("等級", conditions.class, conditions.class ? formatClassFilterLabel(conditions.class) : "");
    add("副次危険性等級", conditions.subsidiary, conditions.subsidiary ? formatClassFilterLabel(conditions.subsidiary) : "");
    add("容器等級", conditions.packingGroup);
    add("海洋汚染物質", conditions.marine, conditions.marine === "yes" ? "別表第1にP表記あり" : "別表第1にP表記なし");
    add("少量危険物", conditions.limited, conditions.limited === "yes" ? "規定あり" : "規定なし");
    add("微量危険物", conditions.excepted, conditions.excepted === "yes" ? "規定あり" : "規定なし");
    add("包装・容器コード", conditions.packingCode);
    add("備考・特別規定", conditions.specialProvision);
    add("EmS", conditions.ems);
    add("積載方法・隔離", conditions.transportCode);
    if (conditions.resultSort && conditions.resultSort !== "un-asc") {
      const sortLabels = { "un-desc": "国連番号 降順", "name-ja": "日本語名順", "class": "等級順" };
      add("並び順", conditions.resultSort, sortLabels[conditions.resultSort] || conditions.resultSort);
    }

    activeConditions.hidden = labels.length === 0;
    activeConditions.innerHTML = labels.length
      ? `<strong>適用中の条件</strong><div>${labels.map(label => `<span>${escapeHtml(label)}</span>`).join("")}</div>`
      : "";
  }

  function sortRows(rows, mode) {
    const copy = [...rows];
    const unValue = item => Number(String(item.unNumber || "").replace(/\D/g, "")) || 0;
    if (mode === "un-desc") return copy.sort((a, b) => unValue(b) - unValue(a));
    if (mode === "name-ja") return copy.sort((a, b) => String(a.properShippingNameJa || "").localeCompare(String(b.properShippingNameJa || ""), "ja"));
    if (mode === "class") return copy.sort((a, b) => normalizeClassValue(a.class).localeCompare(normalizeClassValue(b.class), "ja", { numeric: true }) || unValue(a) - unValue(b));
    return copy.sort((a, b) => unValue(a) - unValue(b));
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
      root.innerHTML = '<div class="panel"><div class="panel-body">該当する危険物がありません。条件を変更して再検索してください。</div></div>';
      return;
    }

    root.innerHTML = rows.map(item => {
      const ems = window.EMSResolver?.resolve(item) || {};
      const label = window.LabelResolver?.resolvePrimary(item);
      const marineLabel = window.LabelResolver?.resolveMarinePollutant(item);
      return `
        <a class="result-card" href="dangerous-goods-detail.html?un=${encodeURIComponent(item.unNumber)}&pg=${encodeURIComponent(item.packingGroup || "")}&row=${encodeURIComponent(item.sourceRow || "")}">
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
        </a>`;
    }).join("");
    saveSearchState();
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
      resultCount: root.querySelectorAll(".result-card").length
    });
  });

  input.addEventListener("input", render);
  Object.values(fields).forEach(field => field?.addEventListener("change", render));

  advancedToggle.addEventListener("click", () => {
    const open = advancedPanel.hidden;
    advancedPanel.hidden = !open;
    advancedToggle.setAttribute("aria-expanded", String(open));
    advancedToggle.textContent = open ? "詳細検索を閉じる" : "詳細検索を開く";
    saveSearchState();
  });

  resetButton.addEventListener("click", resetSearch);

  favoriteFilter.addEventListener("click", () => {
    favoritesOnly = !favoritesOnly;
    favoriteFilter.textContent = favoritesOnly ? "★ お気に入りのみ" : "☆ お気に入り";
    render();
  });

  root.addEventListener("click", event => {
    const card = event.target.closest("a.result-card");
    if (!card) return;
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
