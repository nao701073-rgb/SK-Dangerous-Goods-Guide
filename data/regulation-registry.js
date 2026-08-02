window.REGULATION_REGISTRY = [
  {
    "regulationId": "domestic-ship-dangerous-goods",
    "category": "domestic",
    "officialName": "危険物船舶運送及び貯蔵規則",
    "shortName": "危規則",
    "documentType": "ministerial-ordinance",
    "jurisdiction": "Japan",
    "status": "reference",
    "lawNumber": "昭和32年運輸省令第30号",
    "lawId": "332M50000800030",
    "officialSource": {
      "publisher": "e-Gov法令検索",
      "sourceOwner": "国土交通省",
      "url": "https://laws.e-gov.go.jp/law/332M50000800030"
    },
    "sourceNote": "危険物船舶運送及び貯蔵規則（昭和32年運輸省令第30号）",
    "dataPath": "domestic/ship-dangerous-goods/articles.json"
  },
  {
    "regulationId": "domestic-dangerous-goods-notification",
    "category": "domestic",
    "officialName": "船舶による危険物の運送基準等に関する告示",
    "shortName": "危告示",
    "documentType": "notification",
    "jurisdiction": "Japan",
    "status": "reference",
    "officialSource": {"publisher":"国土交通省","sourceOwner":"国土交通省","url":"../references/originals/dangerous-goods-notification.pdf"},
    "sourceNote": "船舶による危険物の運送基準等に関する告示（システム登録済み原典PDF）",
    "dataPath": "domestic/dangerous-goods-notification/articles.json"
  },
  {
    "regulationId": "domestic-high-pressure-gas-safety",
    "category": "domestic",
    "officialName": "高圧ガス保安法",
    "shortName": "高圧ガス保安法",
    "documentType": "law",
    "jurisdiction": "Japan",
    "status": "future",
    "dataPath": "domestic/high-pressure-gas-safety/articles.json"
  },
  {
    "regulationId": "domestic-radioactive-material-transport",
    "category": "domestic",
    "officialName": "船舶による放射性物質等の運送基準の細目等を定める告示",
    "shortName": "放告示",
    "documentType": "notification",
    "jurisdiction": "Japan",
    "status": "reference",
    "officialSource": {"publisher":"国土交通省","sourceOwner":"国土交通省","url":"../references/originals/radioactive-materials-notification.pdf"},
    "sourceNote": "船舶による放射性物質等の運送基準の細目等を定める告示（システム登録済み原典PDF）",
    "dataPath": "domestic/radioactive-material-transport/articles.json",
    "sourceDocuments": [
      {
        "title": "船舶による放射性物質等の運送基準の細目等を定める告示",
        "fileName": "radioactive-materials-notification.pdf",
        "filePath": "../references/originals/radioactive-materials-notification.pdf",
        "sourceType": "included-pdf"
      }
    ]
  },
  {
    "regulationId": "international-imdg",
    "category": "international",
    "officialName": "International Maritime Dangerous Goods (IMDG) Code",
    "officialNameJa": "国際海上危険物規定",
    "shortName": "IMDG Code",
    "documentType": "international-code",
    "jurisdiction": "International",
    "status": "reference",
    "officialSource": {
      "publisher": "IMO",
      "sourceOwner": "IMO",
      "url": "../references/originals/imdg-code-amendment-42-24-msc556-108.pdf"
    },
    "sourceNote": "IMO公表のIMDG Code Amendment 42-24（MSC.556(108)）",
    "sourceDocuments": [
      {
        "title": "IMDG Code Amendment 42-24（MSC.556(108)）",
        "fileName": "imdg-code-amendment-42-24-msc556-108.pdf",
        "filePath": "../references/originals/imdg-code-amendment-42-24-msc556-108.pdf",
        "sourceType": "included-pdf"
      }
    ],
    "dataPath": "international/imdg/clauses.json"
  },
  {
    "regulationId": "international-ctu",
    "category": "international",
    "officialName": "IMO/ILO/UNECE Code of Practice for Packing of Cargo Transport Units",
    "officialNameJa": "貨物輸送ユニットの収納のための行動規範",
    "shortName": "CTU Code",
    "documentType": "international-code",
    "jurisdiction": "International",
    "status": "reference",
    "officialSource": {
      "publisher": "国土交通省",
      "sourceOwner": "国土交通省",
      "url": "../references/originals/ctu-code-ja.pdf"
    },
    "sourceNote": "国土交通省公表の改訂版 CTU Code 仮訳",
    "sourceDocuments": [
      {
        "title": "IMO/ILO/UNECE 貨物輸送ユニットの収納のための行動規範（仮訳）",
        "fileName": "ctu-code-ja.pdf",
        "filePath": "../references/originals/ctu-code-ja.pdf",
        "sourceType": "included-pdf"
      }
    ],
    "dataPath": "international/ctu/clauses.json"
  },
  {
    "regulationId": "international-marpol",
    "category": "international",
    "officialName": "International Convention for the Prevention of Pollution from Ships, 1973, as modified by the Protocol of 1978 relating thereto",
    "officialNameJa": "1973年の船舶による汚染の防止のための国際条約に関する1978年の議定書",
    "shortName": "MARPOL 73/78",
    "documentType": "international-convention",
    "jurisdiction": "International",
    "status": "reference",
    "officialSource": {
      "publisher": "国土交通省",
      "sourceOwner": "国土交通省",
      "url": "../references/originals/marpol-73-78-annex-ii-ja.pdf"
    },
    "sourceNote": "国土交通省公表の改訂版 MARPOL 73/78 附属書II仮訳",
    "sourceDocuments": [
      {
        "title": "改訂版 MARPOL 73/78 附属書II仮訳",
        "fileName": "marpol-73-78-annex-ii-ja.pdf",
        "filePath": "../references/originals/marpol-73-78-annex-ii-ja.pdf",
        "sourceType": "included-pdf"
      }
    ],
    "dataPath": "international/marpol/clauses.json"
  },
  {
    "regulationId": "international-csc",
    "category": "international",
    "officialName": "The International Convention for Safe Containers",
    "officialNameJa": "安全なコンテナーに関する国際条約",
    "shortName": "CSC",
    "documentType": "international-convention",
    "jurisdiction": "International",
    "status": "reference",
    "dataPath": "international/csc/clauses.json",
    "officialSource": {
      "publisher": "外務省",
      "sourceOwner": "外務省",
      "url": "https://www.mofa.go.jp/mofaj/gaiko/treaty/pdfs/B-S54-0123.pdf"
    },
    "sourceNote": "外務省公表「安全なコンテナーに関する国際条約（CSC）」"
  },
  {
    "regulationId": "domestic-ship-safety-act",
    "category": "domestic",
    "officialName": "船舶安全法",
    "shortName": "船舶安全法",
    "documentType": "law",
    "jurisdiction": "Japan",
    "lawNumber": "昭和8年法律第11号",
    "lawId": "308AC0000000011",
    "status": "reference",
    "officialSource": {
      "publisher": "e-Gov法令検索",
      "sourceOwner": "国土交通省",
      "url": "https://laws.e-gov.go.jp/law/308AC0000000011"
    },
    "sourceNote": "e-Gov法令検索掲載（船舶安全法）",
    "dataPath": "domestic/ship-safety-act/articles.json"
  }
];
