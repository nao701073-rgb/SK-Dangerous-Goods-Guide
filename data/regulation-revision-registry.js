window.REGULATION_REVISION_REGISTRY = {
  schemaVersion: "1.0",
  workflow: ["draft", "source-registered", "data-prepared", "reviewed", "approved", "published", "superseded"],
  updatePolicy: {
    sourceOfTruth: "registered-pdf",
    directProductionEdit: false,
    approvalRequired: true,
    retainSupersededVersions: true,
    rollbackSupported: true,
    checksumAlgorithm: "SHA-256"
  },
  revisions: [
    {
      revisionId: "imdg-42-24",
      regulationId: "international-imdg",
      editionLabel: "Amendment 42-24",
      publicationDate: "2024-05-23",
      effectiveFrom: "2026-01-01",
      effectiveTo: null,
      status: "published",
      sourceDocument: {
        fileName: "imdg-code-amendment-42-24-msc556-108.pdf",
        filePath: "../references/originals/imdg-code-amendment-42-24-msc556-108.pdf",
        language: "en",
        checksumSha256: "register-on-server"
      },
      dataset: {
        format: "json",
        schemaVersion: "1.0",
        targetKeys: ["UN_DATA", "IMDG_REFERENCE_MASTER", "IMDG_CROSS_REFERENCE"],
        recordCount: null
      },
      changeSummary: "IMDG Code Amendment 42-24を現行版として登録。",
      approvedBy: "安全環境室管理者",
      publishedAt: "2026-07-26"
    },
    {
      revisionId: "dangerous-goods-regulations-current",
      regulationId: "domestic-ship-dangerous-goods",
      editionLabel: "現行登録版",
      publicationDate: null,
      effectiveFrom: null,
      effectiveTo: null,
      status: "source-registered",
      sourceDocument: {
        fileName: "dangerous-goods-regulations.pdf",
        filePath: "../references/originals/dangerous-goods-regulations.pdf",
        language: "ja",
        checksumSha256: "register-on-server"
      },
      dataset: { format: "json", schemaVersion: "1.0", targetKeys: ["DOMESTIC_CODE_ORIGINALS"], recordCount: null },
      changeSummary: "改正履歴情報を今後登録するための初期レコード。"
    },
    {
      revisionId: "dangerous-goods-notification-current",
      regulationId: "domestic-dangerous-goods-notification",
      editionLabel: "現行登録版",
      publicationDate: null,
      effectiveFrom: null,
      effectiveTo: null,
      status: "source-registered",
      sourceDocument: {
        fileName: "dangerous-goods-notification.pdf",
        filePath: "../references/originals/dangerous-goods-notification.pdf",
        language: "ja",
        checksumSha256: "register-on-server"
      },
      dataset: { format: "json", schemaVersion: "1.0", targetKeys: ["UN_DATA", "DOMESTIC_PACKING_QUANTITY_PROFILES"], recordCount: null },
      changeSummary: "改正履歴情報を今後登録するための初期レコード。"
    }
  ]
};
