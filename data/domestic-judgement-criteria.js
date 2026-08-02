(() => {
  "use strict";

  const createSection = ({ title, navLabel = title, pdfPath, page, law = "危告示" }) => ({
    title,
    navLabel,
    pdfPath,
    page,
    law
  });

  const resolve = currentRecord => {
    const classification = String(currentRecord?.classification || "").replace(/\s+/g, "").trim();
    const item = String(currentRecord?.item || "").replace(/\s+/g, "").trim();
    const hazardClass = String(currentRecord?.class || "").trim();
    const unNumber = String(currentRecord?.unNumber || "").padStart(4, "0");
    const sourcePage = Number(currentRecord?.sourcePage) || 1;
    const notificationPdf = "../references/originals/dangerous-goods-notification.pdf";
    const regulationPdf = "../references/originals/dangerous-goods-regulations.pdf";
    const radioactivePdf = "../references/originals/radioactive-materials-notification.pdf";

    const note2 = (clause, label, pages, criteriaKey) => ({
      kind: "note2",
      criteriaKey,
      references: [`危告示 別表第1 備考2${clause} ${label}`],
      sections: pages.map(page => createSection({
        title: `危告示 別表第1 備考2${clause} ${label}（PDF ${page}ページ）`,
        navLabel: `備考2${clause} ${label}（${page}頁）`,
        pdfPath: notificationPdf,
        page,
        law: "危告示"
      }))
    });

    if (hazardClass.startsWith("1") || classification === "火薬類") {
      return note2("(1)", "火薬類の判定基準", [268, 269], "note2-1");
    }
    if (hazardClass.startsWith("2") || classification === "高圧ガス") {
      if (/非引火性非毒性/.test(item)) return note2("(2)(ⅱ)", "非引火性非毒性高圧ガスの判定基準", [269], "note2-2-ii");
      if (/毒性/.test(item)) return note2("(2)(ⅲ)", "毒性高圧ガスの判定基準", [269], "note2-2-iii");
      return note2("(2)(ⅰ)", "引火性高圧ガスの判定基準", [269], "note2-2-i");
    }
    if (hazardClass === "3" || classification === "引火性液体類") {
      return note2("(3)", "引火性液体類の判定基準", [269, 270], "note2-3");
    }
    if (hazardClass === "4.1" || (classification === "可燃性物質類" && /可燃性物質/.test(item) && !/自然発火|水反応/.test(item))) {
      return note2("(4)(ⅰ)〜(ⅲ)", "可燃性物質・自己反応性物質・重合性物質の判定基準", [270, 271], "note2-4-i-iii");
    }
    if (hazardClass === "4.2" || /自然発火性/.test(item)) {
      return note2("(4)(ⅳ)", "自然発火性物質の判定基準", [271, 272], "note2-4-iv");
    }
    if (hazardClass === "4.3" || /水反応可燃性/.test(item)) {
      return note2("(4)(ⅴ)", "水反応可燃性物質の判定基準", [272], "note2-4-v");
    }
    if (hazardClass === "5.1" || (classification === "酸化性物質類" && /酸化性物質/.test(item))) {
      return note2("(5)(ⅰ)", "酸化性物質の判定基準", [272, 273], "note2-5-i");
    }
    if (hazardClass === "5.2" || /有機過酸化物/.test(item)) {
      return note2("(5)(ⅱ)", "有機過酸化物の判定基準", [273], "note2-5-ii");
    }
    if (hazardClass === "6.1" || (classification === "毒物類" && item === "毒物")) {
      return note2("(6)", "毒物の判定基準", [274], "note2-6");
    }
    if (hazardClass === "8" || classification === "腐食性物質") {
      return note2("(7)", "腐食性物質の判定基準", [275], "note2-7");
    }

    const isEnvironmentalHazard = Boolean(currentRecord?.marinePollutant)
      || ["3077", "3082"].includes(unNumber)
      || /環境有害|ENVIRONMENTALLY HAZARDOUS/i.test(`${currentRecord?.properShippingNameJa || ""} ${currentRecord?.properShippingName || ""}`);
    if (hazardClass === "9" && isEnvironmentalHazard) {
      return note2("(8)", "環境有害物質の判定基準", [275, 276], "note2-8");
    }

    if (hazardClass === "6.2" || /病毒をうつしやすい/.test(item)) {
      return {
        kind: "specific-definition",
        references: [
          "危規則 第2条第1号ヘ(2) 病毒をうつしやすい物質",
          `危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`
        ],
        sections: [
          createSection({
            title: "危規則 第2条第1号ヘ(2) 病毒をうつしやすい物質（PDF 3ページ）",
            navLabel: "危規則 第2条第1号ヘ(2)",
            pdfPath: regulationPdf,
            page: 3,
            law: "危規則"
          }),
          createSection({
            title: `危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`,
            navLabel: `国連番号${unNumber} 当該品名・備考`,
            pdfPath: notificationPdf,
            page: sourcePage,
            law: "危告示"
          })
        ]
      };
    }

    if (hazardClass === "7" || classification === "放射性物質等") {
      return {
        kind: "specific-definition",
        references: [
          "放告示 第1条の2 放射性物質等",
          `危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`
        ],
        sections: [
          createSection({
            title: "放告示 第1条の2 放射性物質等（PDF 1ページ）",
            navLabel: "放告示 第1条の2",
            pdfPath: radioactivePdf,
            page: 1,
            law: "放告示"
          }),
          createSection({
            title: `危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`,
            navLabel: `国連番号${unNumber} 当該品名・備考`,
            pdfPath: notificationPdf,
            page: sourcePage,
            law: "危告示"
          })
        ]
      };
    }

    // 備考2(8)は環境有害物質専用。その他の有害性物質は各品名固有の備考を参照する。
    return {
      kind: "listed-entry",
      references: [`危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`],
      sections: [createSection({
        title: `危告示 別表第1 国連番号${unNumber} 当該品名・備考（PDF ${sourcePage}ページ）`,
        navLabel: `国連番号${unNumber} 当該品名・備考`,
        pdfPath: notificationPdf,
        page: sourcePage,
        law: "危告示"
      })]
    };
  };

  window.DomesticJudgementCriteriaResolver = Object.freeze({ resolve });
})();
