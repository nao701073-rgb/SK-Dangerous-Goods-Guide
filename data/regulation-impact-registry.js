window.REGULATION_IMPACT_REGISTRY = {
  schemaVersion: "1.0",
  relations: [
    { regulationId:"domestic-ship-dangerous-goods", affectedRegulations:["domestic-dangerous-goods-notification"], defaultTargetKeys:["DOMESTIC_CODE_ORIGINALS","DOMESTIC_PACKING_QUANTITY_PROFILES"], reviewDomains:["条文","容器・包装","積載方法","標札・表示"] },
    { regulationId:"domestic-dangerous-goods-notification", affectedRegulations:["domestic-ship-dangerous-goods","international-imdg"], defaultTargetKeys:["UN_DATA","DOMESTIC_CODE_ORIGINALS","DOMESTIC_PACKING_QUANTITY_PROFILES"], reviewDomains:["別表","UN番号","品名","分類","容器等級","包装要件","特別規定"] },
    { regulationId:"international-imdg", affectedRegulations:["domestic-dangerous-goods-notification"], defaultTargetKeys:["UN_DATA","IMDG_REFERENCE_MASTER","IMDG_CROSS_REFERENCE","EMS_ASSIGNMENTS","EMS_SCHEDULE_MASTER"], reviewDomains:["UN番号","分類","副次危険性","海洋汚染物質","包装要件","特別規定","積付け","隔離","EmS"] }
  ],
  publicationGate: {
    requireImpactAssessment: true,
    requireAllAffectedTargetsReviewed: true,
    requireIndependentApprover: true,
    minimumApprovals: 1,
    prohibitSelfApproval: true
  }
};
