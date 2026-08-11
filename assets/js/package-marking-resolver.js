
(() => {
  "use strict";

  const master = window.PACKAGE_MARKING_MASTER || {};

  function isNos(record) {
    return /\bN\.O\.S\.\b/i.test(String(record?.properShippingName || ""));
  }

  function resolveCharacterHeight(packageInfo = {}) {
    const capacityLitres = Number(packageInfo.capacityLitres);
    const maxNetMassKg = Number(packageInfo.maxNetMassKg);
    const cylinderWaterCapacityLitres = Number(packageInfo.cylinderWaterCapacityLitres);

    if (
      (Number.isFinite(capacityLitres) && capacityLitres <= 5) ||
      (Number.isFinite(maxNetMassKg) && maxNetMassKg <= 5)
    ) {
      return {
        minimumHeightMm: null,
        labelJa: "適切な寸法",
        explanationJa: "5L以下または5kg以下の容器は、容器の大きさに応じて読みやすい適切な寸法とします。"
      };
    }

    if (
      (Number.isFinite(capacityLitres) && capacityLitres <= 30) ||
      (Number.isFinite(maxNetMassKg) && maxNetMassKg <= 30) ||
      (Number.isFinite(cylinderWaterCapacityLitres) && cylinderWaterCapacityLitres <= 60)
    ) {
      return {
        minimumHeightMm: 6,
        labelJa: "6mm以上",
        explanationJa: "30L以下、30kg以下、または水容量60L以下の高圧ガス容器では6mm以上です。"
      };
    }

    return {
      minimumHeightMm: 12,
      labelJa: "12mm以上",
      explanationJa: "上記の小型容器等に該当しない場合は12mm以上です。"
    };
  }

  function buildNosPlaceholder(record) {
    if (!isNos(record)) return null;
    const properShippingName = String(record?.properShippingName || "");
    const specialProvisions = (record?.specialProvisions || []).filter(Boolean);
    const remarks = String(record?.remarks || "");
    const hasTechnicalNameRule = specialProvisions.includes("SP274") || /SP274/i.test(remarks);
    if (!hasTechnicalNameRule) return null;

    return {
      placeholderDisplay: `${properShippingName} (技術名／Technical Name)`,
      specialProvisions
    };
  }

  window.PackageMarkingResolver = {
    resolve(record, packageInfo = {}) {
      const unNumber = String(record?.unNumber || "").padStart(4, "0");
      const properShippingName = String(record?.properShippingName || "");

      return {
        unNumber,
        properShippingName,
        displayLine: `UN ${unNumber} ${properShippingName}`,
        displayGuideLines: [properShippingName, `UN${unNumber}`],
        characterHeight: resolveCharacterHeight(packageInfo),
        nos: buildNosPlaceholder(record),
        specialProvisions: (record?.specialProvisions || []).filter(Boolean),
        rules: master.characterHeightRules || [],
        source: master.domesticSource || {},
        imdgReference: master.imdgReference || {},
        guideImage: master.guideImage || ""
      };
    },

    resolveCharacterHeight
  };
})();
