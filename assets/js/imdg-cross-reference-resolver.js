
(() => {
  "use strict";

  const registry = window.IMDG_CROSS_REFERENCE || {};
  const categories = registry.categories || {};
  const specifics = registry.specificReferences || {};
  const domesticOriginals = window.DOMESTIC_CODE_ORIGINALS?.entries || {};
  const domesticPageRanges = window.DOMESTIC_CODE_PAGE_RANGES?.entries || {};
  const imdgSectionPages = window.IMDG_SECTION_PAGE_MAP?.entries || {};
  const codeCorrections = {
    P112: { pages: [289, 290], page: 289, domesticOriginal: 'P111\n    内装容器の種類                       中間容器の種類                 外装容器の種類              外装容器の許容容量又は許容質量\n紙袋（防水性のものに限る。）、                      －             1A1、1A2、1B1、1B2、1H1、 1H2、         100kg\nプラスチック製袋、                                          1N1、1N2、4A、4B又は4N\nゴム引き織布製袋、                                          4C1又は4C2                          70kg\nプラスチック製シート、                                        1D、4D、4F、4H1又は4H2                 50kg\nゴム引き織布製シート又は木製容\n                                                   1G又は4G                            30kg\n器\n注 追加規定の欄に掲げる記号の意義は、次に定めるとおりとする。\n   PP43 国連番号が0159の危険物に関して、1A1、1A2、1B1、1B2、1N1、1N2、1H1又は1H2を外装容器として使用する場合には、内装容器を必要\nとしない。\n\nP112(a)\n     内装容器の種類                     中間容器の種類                  外装容器の種類              外装容器の許容容量又は許容質量\n紙袋（多層で防水性のものに限              プラスチック製袋、              1A1、1A2、1B1、1B2、1H1、 1H2、         100kg\nる。）、                        織布製袋（プラスチックでコーテ        1N1、1N2、4A、4B又は4N\nプラスチック製袋、                   ィングされているもの又はプラス        4C1又は4C2                          70kg\n織布製袋、                       チック製内張り付きのものに限\nゴム引き織布製袋、                   る。）、                   1D、4D、4F、4H1又は4H2                 50kg\n樹脂クロス製袋、                    金属製容器、\n金属製容器、                      プラスチック製容器又は木製容器        1G又は4G                            30kg\nプラスチック製容器又は木製容器\n注      1     湿性固体のものであって、等級及び隔離区分が、それぞれ、1.1及びDのものに適用する。\n       2     外装容器に気密性の天板取外し式ドラムを使用している場合には、中間容器は必要としない。\n       3     追加規定の欄に掲げる記号の意義は、次に定めるとおりとする。\n           PP26 国連番号が0004、0076、0078、0154、0219及び0394の危険物に関して、容器は鉛を含有しないものであること。\n           PP45 国連番号が0072及び0226の危険物に関しては、中間容器を必要としない。\n\nP112(b)\n\n            内装容器の種類               中間容器の種類                   外装容器の種類            外装容器の許容容量又は許容質量\n\nクラフト紙袋、                     プラスチック製袋（国連番号が         1A1、1A2、1B1、1B2、1H2、 1N1、         100kg\n紙袋（多層で防水性のものに限              0150の危険物に限る。）又は織布      1N2、4A、4B又は4N\nる。）、                        製袋（プラスチックでコーティン        4C1又は4C2                          70kg\nプラスチック製袋、                   グされているもの又はプラスチッ\n織布製袋、                       ク製内張り付きのものに限る。）        1D、4D、4F、4H1又は4H2                 50kg\n\n\n\n                                             - 289 -\n\x0cゴム引き織布製袋又は樹脂クロス            （ 国 連 番 号 が 0150 の 危 険 物 に 限   1G、4G、5H2、5H3、5H4、5L2、5L3         30kg\n製袋                         る。）                            又は5M2\n注      1    乾性固体（粉末のものを除く。）であって、等級及び隔離区分が、それぞれ、1.1及びDのものに適用する。\n       2    追加規定の欄に掲げる記号の意義は、次に定めるとおりとする。\n           PP26 国連番号が0004、0076、0078、0154、0216、0219及び0386の危険物に関して、容器は鉛を含有しないものであること。\n           PP46 国連番号が0209の危険物に関して、フレーク状又はプリル状のTNT（乾性のもの）には5H2を使用し、許容質量は30kgとすること。\n           PP47 国連番号が0222の危険物に関しては、外装容器に袋を使用する場合に限り、内装容器を必要としない。\n\nP112(c)\n\n            内装容器の種類               中間容器の種類                          外装容器の種類            外装容器の許容容量又は許容質量\n\n紙袋（多層で防水性のものに限             紙袋（内張り付き、多層で防水性                1A1、1A2、1B1、1B2、1H1、 1H2、         100kg\nる。）、                       のものに限る。）、                      1N1、1N2、4A、4B又は4N\nプラスチック製袋、                  プラスチック製袋、                      4C1又は4C2                          70kg\n樹脂クロス製袋、                   金属製容器、\nファイバ板製容器、                  プラスチック製容器又は木製容器                1D、4D、4F又は4H2                     50kg\n金属製容器、\nプラスチック製容器又は木製容器                                           1G又は4G                            30kg\n\n注      1     乾性固体（粉末のもの）であって、等級及び隔離区分が、それぞれ、1.1及びDのものに適用する。\n       2     外装容器にドラムを使用する場合には、内装容器は必要としない。\n       3     容器は粉末不漏性のものでなければならない。\n       4     追加規定の欄に掲げる記号の意義は、次に定めるとおりとする。\n           PP26 国連番号が0004、0076、0078、0154、0216、0219及び0386の危険物に関して、容器は鉛を含有しないものであること。\n           PP46 国連番号が0209の危険物に関して、フレーク状又はプリル状のTNT（乾性のもの）には5H2を使用し、許容質量は30kgとすること。\n           PP48 国連番号が 0504 の危険物に関しては、金属製の容器（金属製の閉鎖装置等を有するものであって、危険物との接触面が金属製でない\n                ものを除く。）を使用しないこと。\n\nP113\n    内装容器の種類                       中間容器の種類                        外装容器の種類              外装容器の許容容量又は許容質量\n紙袋、                                  －                    1A1、1A2、1B1、1B2、1H1、 1H2、         100kg\nプラスチック製袋、                                                 1N1、1N2、4A、4B又は4N\nゴム引き織布製袋、                                                 4C1又は4C2                          70kg\nファイバ板製容器、\n金属製容器、                                                    1D、4D、4F又は4H2                     50kg\nプラスチック製容器又は木製容器\n                                                          1G又は4G                            30kg\n\n\n\n                                                   - 290 -\n （船舶による危険物の運送基準等を定める告示）', labelJa: "小型容器包装要件" },
    SGG2: { pages: [377], page: 377, domesticOriginal: 'SGG2     備考9（2）のアンモニウム化合物を示す。\n                                                      - 377 -\n                                                                                       （船舶による危険物の運送基準等を定める告示）', labelJa: "隔離グループコード" },
    SP373: { pages: [421, 422], page: 421 },
    P200: { pages: [298, 299, 300, 301, 302, 303, 304, 305, 306, 307], page: 298 }
  };

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
    .replace(/^区分/, "")
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

    return references.map(section => {
      const mapped = imdgSectionPages[section] || {};
      return {
        section,
        label: `IMDG Code ${section}`,
        page: Number.isFinite(mapped.page) ? mapped.page : null,
        note: mapped.note || ""
      };
    });
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
    const correction = codeCorrections[exactCode] || codeCorrections[baseCode] || {};
    const fallbackPage = categoryFallbackPages[reference.categoryId] || categoryFallbackPages.unclassified;
    const page = correction.page || original.pdfPage || rangeData.pageStart || reference.domesticOriginalPage || fallbackPage;
    const pages = Array.isArray(correction.pages) && correction.pages.length
      ? correction.pages
      : (Array.isArray(rangeData.pages) && rangeData.pages.length ? rangeData.pages : [page]);
    const domesticOriginal = correction.domesticOriginal || original.domesticOriginal || rangeData.domesticOriginal || reference.domesticOriginal || "";
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
    // 「(A),(B)」「又は(C)」などは包装要件コードの補足記号であり、
    // 独立した法令コードではないため原典ページへ遷移させない。
    if (/[()（）,，]/.test(normalized) || normalized.includes("又ハ") || normalized.includes("又は")) return null;

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
      labelJa: (codeCorrections[normalized]?.labelJa || detected.category.labelJa),
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
