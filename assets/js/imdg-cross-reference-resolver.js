
(() => {
  "use strict";

  const registry = window.IMDG_CROSS_REFERENCE || {};
  const categories = registry.categories || {};
  const specifics = registry.specificReferences || {};
  const domesticOriginals = window.DOMESTIC_CODE_ORIGINALS?.entries || {};
  const domesticPageRanges = window.DOMESTIC_CODE_PAGE_RANGES?.entries || {};

  const categoryFallbackPages = {
    packing: 281,
    largePacking: 338,
    ibc: 344,
    portableTank: 353,
    tankProvision: 365,
    bulk: 367,
    specialProvision: 367,
    stowage: 370,
    stowageCategory: 353,
    segregation: 373,
    unclassified: 1
  };

  const normalize = value => String(value ?? "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/^又は/, "")
    .replace(/^[（(]+|[）)]+$/g, "")
    .replace(/[、,]+$/g, "");

  const defaultDomesticReferences = {
    packing: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の4",
      "危告示 別表第1 小型容器包装要件欄"
    ],
    largePacking: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の4の2",
      "危告示 別表第1 大型容器包装要件欄"
    ],
    ibc: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の5",
      "危告示 別表第1 IBC包装要件欄"
    ],
    portableTank: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の6",
      "危告示 別表第1 ポータブルタンク要件欄"
    ],
    tankProvision: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の6",
      "危告示 別表第1 ポータブルタンク追加規定欄"
    ],
    bulk: [
      "危規則 第8条第3項第1号・第113条第3項",
      "危告示 第25条の3・第25条の6の3",
      "危告示 別表第1 フレキシブルバルクコンテナ欄"
    ],
    specialProvision: [
      "危規則 第8条第1項",
      "危告示 第3条第3項",
      "危告示 別表第1 備考10・特別規定欄"
    ],
    stowage: [
      "危規則 第20条",
      "危告示 第3条第3項",
      "危告示 別表第1 積載方法欄"
    ],
    stowageCategory: [
      "危規則 第20条",
      "危告示 第3条第3項",
      "危告示 別表第1 積載方法欄（区分A〜E）"
    ],
    segregation: [
      "危規則 第21条",
      "危告示 第3条第3項",
      "危告示 別表第1 隔離欄"
    ]
  };

  function normalizeReferenceText(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[（(]\s*[A-Z0-9.-]+\s*[）)]/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function selectDomesticReferences(reference, defaults) {
    const articleReferences = defaults.filter(item => /危規則|危告示\s*第\d+条/.test(item));
    const locationCandidates = [reference.domesticDisplay, ...defaults.filter(item => /別表第1/.test(item))]
      .map(value => String(value || "").trim())
      .filter(Boolean);
    const mostSpecificLocation = locationCandidates
      .sort((a, b) => {
        const aCode = a.includes(reference.code) ? 1 : 0;
        const bCode = b.includes(reference.code) ? 1 : 0;
        if (aCode !== bCode) return bCode - aCode;
        return b.length - a.length;
      })[0] || "";

    const result = [...articleReferences];
    if (mostSpecificLocation) result.push(mostSpecificLocation);
    const seen = new Set();
    return result.filter(item => {
      const key = normalizeReferenceText(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function extractDomesticImdgReferences(text) {
    const source = String(text || "").normalize("NFKC");
    const references = [];
    const addReference = value => {
      const section = String(value || "").trim().replace(/[、,。;；)）]+$/g, "");
      if (!section || references.includes(section)) return;
      references.push(section);
    };

    // 「IMDGコード4.1.4.1」のように、番号の直前にIMDG表記がある参照を抽出します。
    const directPattern = /IMDG\s*(?:コード|Code)\s*([0-9]+(?:\.[0-9A-Z]+){1,})/gi;
    let directMatch;
    while ((directMatch = directPattern.exec(source)) !== null) addReference(directMatch[1]);

    // 同じ文中で「4.1.4.1のP910若しくは4.1.4.3のLP905」のように、
    // 2つ目以降の番号からIMDG表記が省略されている場合もすべて抽出します。
    source.split(/[。\n]/).forEach(sentence => {
      if (!/IMDG\s*(?:コード|Code)/i.test(sentence)) return;
      const sectionPattern = /\b[0-9]+(?:\.[0-9A-Z]+){2,}\b/gi;
      let sectionMatch;
      while ((sectionMatch = sectionPattern.exec(sentence)) !== null) addReference(sectionMatch[0]);
    });

    return references.map(section => `IMDG Code ${section}`);
  }

  function buildDomesticDisplay(reference) {
    if (reference.domesticDisplay) return reference.domesticDisplay;
    const code = reference.code || "";
    const labels = {
      packing: `危告示 別表第1 小型容器包装要件欄（${code}）`,
      largePacking: `危告示 別表第1 大型容器包装要件欄（${code}）`,
      ibc: `危告示 別表第1 IBC容器包装要件欄（${code}）`,
      portableTank: `危告示 別表第1 ポータブルタンク要件欄（${code}）`,
      tankProvision: `危告示 別表第1 ポータブルタンク追加規定欄（${code}）`,
      bulk: `危告示 別表第1 フレキシブルバルクコンテナ・ばら積み容器欄（${code}）`,
      specialProvision: `危告示 別表第1 備考10・特別規定欄（${code}）`,
      stowage: `危告示 別表第1 積載方法欄（${code}）`,
      stowageCategory: `危告示 別表第1 積載方法欄（区分${code}）`,
      segregation: `危告示 別表第1 隔離欄（${code}）`
    };
    return labels[reference.categoryId] || "";
  }

  function withDomesticReferences(reference) {
    const domesticDisplay = buildDomesticDisplay(reference);
    const normalizedReference = { ...reference, domesticDisplay };
    const defaults = (defaultDomesticReferences[reference.categoryId] || [])
      .map(value => String(value || "").trim())
      .filter(Boolean);

    const exactCode = reference.code;
    const baseCode = String(exactCode || "").replace(/\([A-Z]\)$/i, "");
    const original = domesticOriginals[exactCode] || domesticOriginals[baseCode] || {};
    const rangeData = domesticPageRanges[exactCode] || domesticPageRanges[baseCode] || {};
    const fallbackPage = categoryFallbackPages[reference.categoryId] || categoryFallbackPages.unclassified;
    const page = rangeData.pageStart || original.pdfPage || reference.domesticOriginalPage || fallbackPage;
    const pages = Array.isArray(rangeData.pages) && rangeData.pages.length ? rangeData.pages : [page];
    const domesticOriginal = rangeData.domesticOriginal || original.domesticOriginal || reference.domesticOriginal || "";
    const domesticImdgReferences = extractDomesticImdgReferences(domesticOriginal);
    return {
      ...normalizedReference,
      domesticReferences: selectDomesticReferences(normalizedReference, defaults),
      domesticOriginal,
      domesticOriginalSource: original.source || reference.domesticOriginalSource || "船舶による危険物の運送基準等を定める告示",
      domesticOriginalTitle: original.title || reference.domesticOriginalTitle || "危告示の該当コード掲載箇所",
      domesticOriginalPage: page,
      domesticOriginalPages: pages,
      domesticOriginalPageEnd: pages[pages.length - 1],
      domesticOriginalAnchor: original.pdfAnchor || reference.domesticOriginalAnchor || `#page=${page}`,
      domesticOriginalExact: Boolean(original.pdfPage),
      domesticImdgReferences,
      hasDomesticImdgReference: domesticImdgReferences.length > 0
    };
  }

  function detectCategory(code) {
    const normalized = normalize(code);

    const candidates = Object.entries(categories)
      .flatMap(([categoryId, category]) =>
        (category.prefixes || []).map(prefix => ({
          categoryId,
          category,
          prefix: normalize(prefix)
        }))
      )
      .sort((a, b) => b.prefix.length - a.prefix.length);

    return candidates.find(item => normalized.startsWith(item.prefix)) || null;
  }

  function resolve(code) {
    const normalized = normalize(code);
    if (!normalized || normalized === "—" || normalized === "-") return null;

    if (/^PP\d+[A-Z]?$/.test(normalized)) {
      return withDomesticReferences({ code: normalized, categoryId: "packing", labelJa: "小型容器追加規定", domesticDisplay: `危告示 別表第1 備考6 小型容器追加規定 ${normalized}`, imdgLocation: "IMDG Code 4.1.4.1", detailLocation: "Packing special provision", englishExcerpt: "", commentaryJa: "小型容器の追加規定です。危告示の原文と対象国連番号・容器等級を確認します。", status: "domestic-original-registered", specific: true });
    }
    if (/^L\d+[A-Z]?$/.test(normalized)) {
      return withDomesticReferences({ code: normalized, categoryId: "largePacking", labelJa: "大型容器追加規定", domesticDisplay: `危告示 別表第1 備考6 大型容器追加規定 ${normalized}`, imdgLocation: "IMDG Code 4.1.4.3", detailLocation: "Large packing special provision", englishExcerpt: "", commentaryJa: "大型容器の追加規定です。危告示の原文を確認します。", status: "domestic-original-registered", specific: true });
    }
    if (/^B\d+[A-Z]?$/.test(normalized)) {
      return withDomesticReferences({ code: normalized, categoryId: "ibc", labelJa: "IBC容器追加規定", domesticDisplay: `危告示 別表第1 備考6 IBC容器追加規定 ${normalized}`, imdgLocation: "IMDG Code 4.1.4.2", detailLocation: "IBC special provision", englishExcerpt: "", commentaryJa: "IBC容器の追加規定です。危告示の原文を確認します。", status: "domestic-original-registered", specific: true });
    }
    if (/^H\d+[A-Z]?$/.test(normalized)) {
      return withDomesticReferences({ code: normalized, categoryId: "bulk", labelJa: "フレキシブルバルクコンテナ追加規定", domesticDisplay: `危告示 別表第1 備考6 フレキシブルバルクコンテナ追加規定 ${normalized}`, imdgLocation: "IMDG Code 4.3", detailLocation: "Flexible bulk container provision", englishExcerpt: "", commentaryJa: "フレキシブルバルクコンテナの追加規定です。危告示の原文を確認します。", status: "domestic-original-registered", specific: true });
    }

    if (/^[A-E]$/.test(normalized)) {
      return withDomesticReferences({
        code: normalized,
        categoryId: "stowageCategory",
        labelJa: "積載方法区分",
        domesticDisplay: `危告示 別表第1 積載方法欄（区分${normalized}）`,
        imdgLocation: "IMDG Code Part 7, Chapter 7.1 – General stowage provisions",
        detailLocation: "Stowage category A–E",
        englishExcerpt: "",
        commentaryJa: `積載方法区分${normalized}です。SWコード等の追加規定が併記されている場合は、それぞれ独立した規定として確認します。`,
        status: "location-registered",
        specific: true
      });
    }

    if (specifics[normalized]) {
      const specific = specifics[normalized];
      const category = categories[specific.category] || {};
      return withDomesticReferences({
        ...category,
        ...specific,
        code: normalized,
        categoryId: specific.category,
        specific: true
      });
    }

    const detected = detectCategory(normalized);
    if (!detected) {
      return withDomesticReferences({
        code: normalized,
        categoryId: "unclassified",
        labelJa: "参照区分未特定",
        imdgLocation: "",
        detailLocation: "",
        englishExcerpt: "",
        commentaryJa: "危告示本文のコード掲載箇所を確認してください。",
        domesticReferences: ["国内法令の条文対応は整備中です。"],
        status: "unclassified",
        specific: false
      });
    }

    return withDomesticReferences({
      code: normalized,
      categoryId: detected.categoryId,
      labelJa: detected.category.labelJa,
      imdgLocation: detected.category.imdgLocation,
      detailLocation: detected.category.detailLocation,
      englishExcerpt: "",
      commentaryJa: "コード固有の英語原文は、原典照合後に登録します。",
      status: detected.category.status,
      specific: false
    });
  }

  function splitCodes(...values) {
    return [...new Set(
      values
        .flatMap(value => Array.isArray(value) ? value : [value])
        .flatMap(value => String(value ?? "").split(/\s+/))
        .map(normalize)
        .filter(value =>
          value &&
          value !== "-" &&
          /^([A-E]|(P|PP|LP|L|IBC|B|T|TP|SP|SW|ES|SG|SGG|BK|H)[A-Z0-9.-]+)$/.test(value)
        )
    )];
  }

  window.IMDGCrossReferenceResolver = {
    resolve,
    resolveMany(...values) {
      return splitCodes(...values).map(resolve).filter(Boolean);
    },
    getRegistry() {
      return registry;
    }
  };
})();
