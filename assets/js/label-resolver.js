
(() => {
  "use strict";

  const master = window.LABEL_MASTER?.labels || [];
  const basePath = "../images/labels/";

  const normalize = value =>
    String(value ?? "")
      .trim()
      .replace(/^class\s*/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "");

  function findExact(classValue) {
    const value = normalize(classValue);
    return master.find(item => normalize(item.class) === value) || null;
  }

  function findWithFallback(classValue) {
    const value = normalize(classValue);
    const exact = findExact(value);
    if (exact) return exact;

    // Division details may be absent in some records.
    // Only then fall back to the main class.
    const mainClass = value.split(".")[0];
    return master.find(item => normalize(item.class) === mainClass) || null;
  }

  function isLithiumBattery(record) {
    const name = [
      record?.properShippingName,
      record?.properShippingNameJa
    ].join(" ").toLowerCase();

    return name.includes("lithium") || name.includes("リチウム");
  }

  function withSource(label) {
    return label ? {...label, src: basePath + label.file} : null;
  }

  function hasMarinePollutantSuffix(record) {
    const values = [record?.properShippingNameJa, record?.properShippingName]
      .filter(Boolean)
      .map(value => String(value));

    return values.some(value => /P(?=[\s\-‐–—,，、)）]|$)/i.test(value));
  }

  function isMarinePollutantRecord(record) {
    const value = String(record?.marinePollutant ?? '').toLowerCase();
    const explicit = [
      'yes', 'true', '該当', 'marine pollutant', 'p'
    ].some(token => value === token || value.includes(token));

    const forcedUnNumbers = ['3077', '3082'];
    const forcedByUn = forcedUnNumbers.includes(String(record?.unNumber || '').padStart(4, '0'));
    const forcedByName = hasMarinePollutantSuffix(record);

    return explicit || forcedByUn || forcedByName;
  }

  window.LabelResolver = {
    resolvePrimary(record) {
      if (normalize(record?.class) === "9" && isLithiumBattery(record)) {
        return withSource(master.find(item => item.id === "class9-lithium"));
      }

      return withSource(findWithFallback(record?.class));
    },

    resolveSubsidiaries(record) {
      const raw = String(record?.subsidiaryRisk ?? "").trim();
      if (!raw || raw === "-" || raw === "なし") return [];

      // A record can contain more than one subsidiary-risk class, for example
      // "5.1・8", "6.1 8" or "3, 8". Extract every actual dangerous-goods
      // class and ignore non-class values such as SP numbers and page numbers.
      const matches = raw.match(/(?:1\.[1-6]|2\.[1-3]|4\.[1-3]|5\.[1-2]|6\.[1-2]|[3789])/g) || [];
      const uniqueClasses = [...new Set(matches.map(normalize))];

      return uniqueClasses
        .map(value => withSource(findWithFallback(value)))
        .filter(Boolean);
    },

    // Backward-compatible helper for older screens.
    resolveSubsidiary(record) {
      return this.resolveSubsidiaries(record)[0] || null;
    },

    resolveMarinePollutant(record) {
      if (!isMarinePollutantRecord(record)) return null;
      return withSource(master.find(item => item.id === "marine-pollutant"));
    },

    all() {
      return master.map(item => ({...item, src: basePath + item.file}));
    }
  };
})();
