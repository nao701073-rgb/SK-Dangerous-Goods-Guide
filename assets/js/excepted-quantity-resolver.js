
(() => {
  "use strict";

  const master = window.EXCEPTED_QUANTITY_MASTER || {};
  const codes = master.codes || {};

  function normalizeCode(value) {
    const text = String(value ?? "").normalize("NFKC").trim().toUpperCase();
    const match = text.match(/\bE[0-5]\b/);
    return match ? match[0] : "";
  }

  function detectPhysicalState(record) {
    const text = [
      record?.properShippingName,
      record?.properShippingNameJa,
      record?.item
    ].join(" ").toUpperCase();

    if (text.includes("LIQUID") || text.includes("液体") || text.includes("溶液")) {
      return "liquid";
    }

    if (text.includes("SOLID") || text.includes("固体") || text.includes("粉末")) {
      return "solid";
    }

    return "unknown";
  }

  function buildAiSummary(code, rule, state) {
    if (!rule?.permitted) {
      return `${code}は、微量危険物としての数量特例を利用できない区分です。`;
    }

    if (state === "liquid") {
      return `${code}では、液体は内装容器1個につき${rule.perInnerLiquidMl}mL以下、`
        + `外装容器1個に収納する合計量は${rule.perOuterLiquidMl}mL以下です。`
        + `両方の上限を同時に満たす必要があり、外装上限を内装容器1個に入れられるという意味ではありません。`;
    }

    if (state === "solid") {
      return `${code}では、固体は内装容器1個につき${rule.perInnerSolidG}g以下、`
        + `外装容器1個に収納する合計量は${rule.perOuterSolidG}g以下です。`
        + `両方の上限を同時に満たす必要があります。`;
    }

    return `${code}では、内装容器1個につき液体${rule.perInnerLiquidMl}mL又は固体${rule.perInnerSolidG}g以下、`
      + `外装容器1個の合計は液体${rule.perOuterLiquidMl}mL又は固体${rule.perOuterSolidG}g以下です。`
      + `物質の状態に応じて容量又は質量の上限を適用し、内装上限と外装合計上限の両方を確認します。`;
  }

  window.ExceptedQuantityResolver = {
    resolve(record) {
      const code = normalizeCode(record?.exceptedQuantity);
      if (!code || !codes[code]) return null;

      const rule = codes[code];
      const physicalState = detectPhysicalState(record);

      return {
        code,
        ...rule,
        physicalState,
        aiSummaryJa: buildAiSummary(code, rule, physicalState),
        source: master.source || {},
        internationalReference: master.internationalReference || {}
      };
    },

    resolveCode(code) {
      const normalized = normalizeCode(code);
      return normalized && codes[normalized]
        ? {code: normalized, ...codes[normalized]}
        : null;
    }
  };
})();
