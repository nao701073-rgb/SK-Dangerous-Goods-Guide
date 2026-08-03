(() => {
  "use strict";

  const PROHIBITED = "禁止";
  const solidAllowed = op8 => ({
    op1: "0.5kg",
    op2Inner: "0.5kg",
    op2Outer: "10kg",
    op3: "5kg",
    op4Inner: "5kg",
    op4Outer: "25kg",
    op5: "25kg",
    op6: "50kg",
    op7: "50kg",
    op8
  });
  const solidProhibited = op8 => ({
    op1: PROHIBITED,
    op2Inner: PROHIBITED,
    op2Outer: PROHIBITED,
    op3: PROHIBITED,
    op4Inner: PROHIBITED,
    op4Outer: PROHIBITED,
    op5: PROHIBITED,
    op6: PROHIBITED,
    op7: "50kg",
    op8
  });
  const liquidAllowed = op8 => ({
    op1: "0.5L",
    op2: PROHIBITED,
    op3: "5L",
    op4: PROHIBITED,
    op5: "30L",
    op6: "60L",
    op7: "60L",
    op8
  });
  const liquidProhibited = op8 => ({
    op1: PROHIBITED,
    op2: PROHIBITED,
    op3: PROHIBITED,
    op4: PROHIBITED,
    op5: PROHIBITED,
    op6: PROHIBITED,
    op7: "60L",
    op8
  });
  const makeRows = (groups, allowedCodes, allowedFactory, prohibitedFactory) => groups.flatMap(group =>
    group.codes.map(container => ({
      container,
      ...(allowedCodes.has(container) ? allowedFactory(group.op8) : prohibitedFactory(group.op8))
    }))
  );

  const solidCombinationGroups = [
    { codes: ["1A1", "1A2", "1B1", "1B2", "1G", "1H1", "1H2", "1D"], op8: "400kg" },
    { codes: ["3A1", "3A2", "3B1", "3B2", "3H1", "3H2"], op8: "60kg" },
    { codes: ["4A", "4B", "4N", "4C1", "4C2", "4D", "4F", "4G", "4H1", "4H2"], op8: "200kg" }
  ];
  const solidCombinationAllowed = new Set(["1G", "1H1", "1H2", "1D", "3H1", "3H2", "4C1", "4C2", "4D", "4F", "4G", "4H1", "4H2"]);

  const solidSingleGroups = [
    { codes: ["1A1", "1A2", "1B1", "1B2", "1G", "1H1", "1H2", "1D"], op8: "400kg" },
    { codes: ["3A1", "3A2", "3B1", "3B2", "3H1", "3H2"], op8: "60kg" },
    { codes: ["6HA1", "6HA2", "6HB1", "6HB2", "6HC", "6HD1", "6HD2", "6HG1", "6HG2", "6HH1", "6HH2"], op8: "400kg" }
  ];
  const solidSingleAllowed = new Set(["1G", "1H1", "1H2", "1D", "3H1", "3H2", "6HC", "6HD1", "6HD2", "6HG1", "6HG2", "6HH1", "6HH2"]);

  const liquidSingleGroups = [
    { codes: ["1A1", "1A2", "1B1", "1B2", "1G", "1H1", "1H2", "1D"], op8: "225L" },
    { codes: ["3A1", "3A2", "3B1", "3B2", "3H1", "3H2"], op8: "60L" },
    { codes: ["6HA1", "6HA2", "6HB1", "6HB2", "6HC", "6HD1", "6HD2", "6HG1", "6HG2", "6HH1", "6HH2"], op8: "225L" }
  ];
  const liquidSingleAllowed = new Set(["1G", "1H1", "1H2", "1D", "3H1", "3H2", "6HC", "6HD1", "6HD2", "6HG1", "6HG2", "6HH1", "6HH2"]);

  window.DOMESTIC_COMPLEX_PACKING_PROFILES = {
    schemaVersion: "1.0",
    updatedAt: "2026-08-03",
    source: "船舶による危険物の運送基準等を定める告示 PDF 320～323ページ",
    profiles: {
      P520: {
        title: "P520 包装要件",
        sourcePages: [320, 321, 322, 323],
        summary: "収納方法OP1～OP8ごとの許容質量又は許容容量を、容器の種類と収納形態別に整理しています。",
        sections: [
          {
            id: "solid-combination",
            title: "固体 - 組合せ容器",
            description: "固体の危険物を収納する組合せ容器。内装容器は適当な容器を使用します（注7）。",
            mode: "expanded",
            rows: makeRows(solidCombinationGroups, solidCombinationAllowed, solidAllowed, solidProhibited)
          },
          {
            id: "solid-single-composite",
            title: "固体 - 単一容器・複合容器",
            description: "固体の危険物を収納する単一容器又は複合容器。",
            mode: "expanded",
            rows: makeRows(solidSingleGroups, solidSingleAllowed, solidAllowed, solidProhibited)
          },
          {
            id: "liquid-single-composite",
            title: "液体 - 単一容器・複合容器",
            description: "液体の危険物を収納する単一容器又は複合容器。",
            mode: "simple",
            rows: makeRows(liquidSingleGroups, liquidSingleAllowed, liquidAllowed, liquidProhibited)
          }
        ],
        notes: [
          "別表第1の備考1(2)及び(3)の表中、収納方法の欄の記号は、この表に規定するOP1からOP8までの記号に対応する。",
          "金属製容器（内装容器を含む）は、OP7及びOP8の収納方法に限り使用できる。",
          "組合せ容器の内装容器としてガラス製容器を使用する場合には、許容質量又は許容容量はそれぞれ0.5kg又は0.5Lとする。",
          "組合せ容器の緩衝材は、難燃性のものでなければならない。",
          "火薬類の副次危険性を要求されている有機過酸化物又は自己反応性物質の容器は、IMDGコード4.1.5.10及び4.1.5.11の規定に適合しなければならない。",
          "追加規定の欄に掲げる記号の意義は、次に定めるとおりとする。",
          "収納方法がOP8であって、外装容器が4C1、4C2、4D、4F、4G、4H1及び4H2である25kg以下のプラスチック製又はファイバ製の内装容器を使用する場合においては、許容質量を400kgとすることができる。"
        ],
        additionalProvisions: [
          {
            code: "PP21",
            text: "自己反応性物質B又は自己反応性物質Cである国連番号3221、3222、3223、3224、3231、3232、3233及び3234の危険物に関しては、IMDGコード4.1.7及び2.4.2.3.2.3の規定に従い、収納方法OP5又はOP6により許可されている許容質量又は許容容量を超えない容器を使用すること。"
          },
          {
            code: "PP22",
            text: "国連番号3241の危険物に関しては、OP6に従って収納すること。"
          },
          {
            code: "PP94",
            text: "国連番号3223及び3224の極めて少量の危険物であって試験用のエネルギー物質（見本）を運送する場合は、以下の要件に適合すること。",
            requirements: [
              "外装容器は4A、4B、4N、4C1、4C2、4D、4F、4G、4H1又は4H2の組合せ容器を使用すること。",
              "プラスチック、ガラス、磁器又は炻器製のマイクロプレートを内装容器として使用すること。",
              "各内装容器に収納される危険物の量が、固体にあっては0.01g、また、液体にあっては0.01ml以下であること。",
              "輸送物に収納される危険物の量が、固体にあっては20g、液体にあっては20ml、固体と液体を混包した場合は、固体部分の質量をグラムで表した値及び液体部分の容積をミリリットルで表した値の合計が20以下であること。",
              "ドライアイス又は液体窒素を冷却剤として使用する場合には、IMDGコード5.5.3の要件に適合しなければならない。内装容器は緩衝材により保護されていること。内装容器及び外装容器は、冷却剤が消失した後でも損傷を防止できるものでなければならない。"
            ]
          },
          {
            code: "PP95",
            text: "国連番号3223及び3224の少量の危険物であって試験用のエネルギー物質（見本）（PP94の規定が適用される場合を除く。）を運送する場合は、以下の要件に適合すること。",
            requirements: [
              "外装容器は、長さ60cm以上、幅40.5cm以上、高さ30cm以上のものとし、厚さ1.3cm以上の4G（波型のものに限る。）を使用すること。",
              "危険物は密度18±1g/Lで厚さ130mm以上の発泡ポリエチレンに収められた最大容量30mlのガラス又はプラスチック製の内装容器に収納すること。",
              "発泡ポリエチレンに収納する内装容器は、互いに40mm以上、外装容器の内側表面からは70mm以上離すこと。発泡ポリエチレンを積み重ねて運送する場合は、輸送物1個につき2個以下とすること。内装容器の数は、発泡ポリエチレン1個につき28個以下とすること。",
              "各内装容器に収納される危険物の量が、固体にあっては1g、また、液体にあっては1ml以下であること。",
              "輸送物に収納される危険物の量が、固体にあっては56g、液体にあっては56ml、固体と液体を混包した場合は固体部分の質量をグラムで表した値及び液体部分の容積をミリリットルで表した値の合計が56以下であること。",
              "ドライアイス又は液体窒素を冷却剤として使用する場合には、IMDGコード5.5.3の要件に適合しなければならない。内装容器は緩衝材により保護されていること。内装容器及び外装容器は、冷却剤が消失した後でも損傷を防止できるものでなければならない。"
            ]
          }
        ]
      }
    }
  };
})();
