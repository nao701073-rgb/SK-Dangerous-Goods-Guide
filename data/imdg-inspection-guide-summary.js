window.IMDG_INSPECTION_GUIDE_SUMMARY = {
  title: "IMDGコードに基づく検査・検品業務に関する資料（初版）AI要約",
  sourceNote: "横浜大黒事業所で作成された資料を、検査・検品業務で参照しやすい単位に再構成した要約です。原PDF表示機能は設けず、元資料に含まれる図・写真・表を参考画像として掲載します。",
  caution: "AI要約は理解を補助する参考情報です。実務判断では、危規則・危告示・IMDG Code最新版および所轄官庁の指示を確認してください。",
  categories: {
    "legal-framework": "法規制と基本体系",
    "general-provisions": "一般規定・訓練・保安",
    "classification": "分類・国連番号・正式輸送品名",
    "packaging": "容器包装・試験・包装要件",
    "consignment": "表示・文書・委託手続き",
    "transport-operations": "積載・隔離・CTU・緊急対応"
  },
  sections: [
    {
      id: "guide-legal-framework",
      category: "legal-framework",
      title: "IMDG Codeの目的、法的枠組み、改正周期",
      sourcePages: "6-12",
      summary: "IMDG Codeは、人命保護、海洋汚染防止、危険物の円滑な国際移動を目的とする海上危険物輸送の国際規則です。国連モデル規則を基礎に、SOLAS・MARPOLなどの条約と結び付き、日本では船舶安全法、危規則、危告示などにより国内実施されます。危険物リストを中心に、分類、包装、表示、書類、積載、隔離、緊急対応までを一体的に規定し、原則2年周期で改正されます。",
      keyPoints: [
        "危険物の分類・識別から船上の積載・隔離まで、サプライチェーン全体が規制対象になる。",
        "国際規則だけでなく、日本国内の危規則・危告示を優先して確認する。",
        "危険物リストは国連番号順で、各列のコードから包装・表示・積載・隔離要件をたどる。",
        "改正の移行年と強制適用年を確認し、使用中の版を明確にする。"
      ],
      inspectionPoints: [
        "申告された国連番号と正式輸送品名が最新のリストに存在するか。",
        "適用するIMDG Code改正版と国内法令の施行日が一致しているか。",
        "無申告・誤申告・不適切な甲板下積載など重大事故につながる不適合がないか。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-7.jpg", page: 7, caption: "国際規制と国内法令の体系図"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-8.jpg", page: 8, caption: "危険物の形態と危険物標札の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-12.jpg", page: 12, caption: "IMDG Codeの巻構成と対象者"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-13.jpg", page: 13, caption: "改正周期と移行期間の図"}
      ]
    },
    {
      id: "guide-general-provisions",
      category: "general-provisions",
      title: "適用範囲、法的地位、訓練、保安および放射性物質",
      sourcePages: "13-24",
      summary: "IMDG Codeは危険物を運搬する船舶と、その輸送準備を行う陸上関係者に適用されます。所轄官庁は、条件を満たす場合に承認・免除・代替措置を認めることがありますが、関係国の受入れが必要です。業務従事者には職務に応じた訓練が求められ、危険物の悪用防止、重大影響危険物、放射性物質については追加の保安管理が必要です。",
      keyPoints: [
        "訓練は一般理解、職務別訓練、安全訓練に分け、担当業務に応じて実施する。",
        "承認・免除は通常要件を外す根拠ではなく、所轄官庁の正式な文書と適用条件が必要。",
        "保安計画、アクセス管理、情報管理、異常時報告などを組織的に整備する。",
        "放射性物質は通常の危険物規定に加え、専用の分類・包装・表示・輸送指数等を確認する。"
      ],
      inspectionPoints: [
        "検査担当者が必要な教育を受け、記録が維持されているか。",
        "承認書・適用除外文書に対象貨物、期間、条件、発行機関が明記されているか。",
        "コンテナ、保管場所、書類への不正アクセスを防ぐ管理があるか。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-16.jpg", page: 16, caption: "SOLAS・MARPOL・CSCの関係"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-18.jpg", page: 18, caption: "所轄官庁、承認、免除に関する説明"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-21.jpg", page: 21, caption: "訓練と関係者の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-24.jpg", page: 24, caption: "貨物輸送ユニットと放射性物質の例"}
      ]
    },
    {
      id: "guide-classification",
      category: "classification",
      title: "危険物の分類、容器等級、海洋汚染物質、国連番号と正式輸送品名",
      sourcePages: "25-51",
      summary: "危険物は主危険性に基づき等級1から9に分類され、必要に応じて副次危険性等級が付与されます。危険度に応じて容器等級I・II・IIIが定められ、海洋環境への有害性があるものは海洋汚染物質として扱われます。国連番号と正式輸送品名は輸送手続きの基礎であり、N.O.S.品名では技術名の追記、混合物・廃棄物・サンプルでは適切な修飾語が必要です。",
      keyPoints: [
        "主危険性と副次危険性をSDSや試験結果から正しく決定する。",
        "容器等級は物質の危険度を示し、使用可能な容器や許容数量に影響する。",
        "N.O.S.品名は括弧内に危険性に寄与する技術名を記載する。",
        "少量危険物・微量危険物は適用除外ではなく、専用の数量・包装・表示条件を満たす必要がある。"
      ],
      inspectionPoints: [
        "危険物明細書、SDS、容器表示の国連番号・正式輸送品名が一致するか。",
        "正標札と副標札が分類結果と一致するか。",
        "海洋汚染物質マーク、技術名、廃棄物・高温物質等の追加記載が必要か。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-26.jpg", page: 26, caption: "危険物分類の概要と輸送形態"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-31.jpg", page: 31, caption: "危険等級の分類表"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-44.jpg", page: 44, caption: "海洋汚染物質マークの例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-47.jpg", page: 47, caption: "国連番号と正式輸送品名の考え方"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-50.jpg", page: 50, caption: "正式輸送品名を補足する表示例"}
      ]
    },
    {
      id: "guide-packaging",
      category: "packaging",
      title: "容器包装の選択、国連包装マーク、包装要件、タンク・IBC・バルク",
      sourcePages: "53-69",
      summary: "危険物の容器包装は、物質の性状、容器等級、数量、輸送形態に適合するものを選びます。容器は国連試験に合格した設計型式で、国連包装マークにより材質、型式、性能水準、製造年、承認国、製造者などを識別します。危険物リストのP、IBC、LP、T、TP、BK等のコードから、使用可能な容器、追加規定、最大容量、試験条件を確認します。",
      keyPoints: [
        "容器と内容物の化学的適合性、充塡率、内圧、温度、閉鎖方法を確認する。",
        "国連包装マークは危険物そのものの使用許可ではなく、容器設計型式の性能証明である。",
        "包装要件コードと追加包装規定をセットで確認する。",
        "IBC、ポータブルタンク、MEGC、バルクコンテナでは検査期限・試験・構造要件も確認する。"
      ],
      inspectionPoints: [
        "包装コードが危険物リストの指定と一致するか。",
        "国連包装マークが判読でき、容器等級と比重・固体質量・水圧試験等の条件を満たすか。",
        "容器の腐食、変形、漏れ、閉鎖不良、期限切れ検査がないか。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-57.jpg", page: 57, caption: "容器包装と国連試験の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-63.jpg", page: 63, caption: "包装の選択手順とコード表"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-66.jpg", page: 66, caption: "ポータブルタンク・MEGCの規定例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-69.jpg", page: 69, caption: "タンク・バルク輸送形態の例"}
      ]
    },
    {
      id: "guide-consignment",
      category: "consignment",
      title: "マーク、ラベル、プラカード、危険物輸送文書とコンテナ収納証明",
      sourcePages: "72-100",
      summary: "委託手続きでは、容器包装への国連番号・正式輸送品名・危険物ラベル、オーバーパック表示、少量・微量危険物マーク、リチウム電池マークを適切に表示します。貨物輸送ユニットにはプラカード、国連番号、海洋汚染物質等の必要なマークを所定位置に表示します。危険物輸送文書には規定順序で品名、等級、副次危険性、容器等級、数量等を記載し、コンテナ収納証明を含め、実貨物との一致を確認します。",
      keyPoints: [
        "ラベル・マークは耐候性、視認性、寸法、位置、重複表示の要否を確認する。",
        "オーバーパック内の表示が外から見えない場合は、外側に再表示しOVERPACKを表示する。",
        "プラカードはCTUの各側面に必要数を表示し、不要となった表示は除去・遮蔽する。",
        "危険物輸送文書の記載順序と追加文言を確認し、容器数・種類・総数量を現物と照合する。"
      ],
      inspectionPoints: [
        "国連番号、正式輸送品名、標札、海洋汚染物質マークが書類と現物で一致するか。",
        "コンテナ収納証明の署名、日付、収納・固定・隔離の宣言が整っているか。",
        "向き矢印、燻蒸警告、高温物質、環境有害性等の追加表示が必要か。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-74.jpg", page: 74, caption: "容器包装へのマーク・ラベル表示例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-83.jpg", page: 83, caption: "少量危険物・微量危険物の表示表"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-85.jpg", page: 85, caption: "リチウム電池等の表示例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-90.jpg", page: 90, caption: "追加警告マークの例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-94.jpg", page: 94, caption: "危険物輸送文書の記載例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-98.jpg", page: 98, caption: "コンテナ収納証明に関する説明"}
      ]
    },
    {
      id: "guide-transport-operations",
      category: "transport-operations",
      title: "積載方法、隔離、CTU収納、CSC、事故・火災・医療・港湾対応",
      sourcePages: "102-128",
      summary: "輸送業務では、危険物リストの積載方法、SW等の特別規定、隔離表、SG・SGGコードを使って船上の積載位置と危険物相互の隔離を決定します。CTUへの収納では、コンテナの適合性、重量配分、荷崩れ防止、固縛、換気、汚染防止を確認します。事故時にはEmS、MFAG、船舶・港湾の緊急対応手順を参照し、火災、漏えい、曝露に応じた初動を行います。",
      keyPoints: [
        "積載区分と特別規定は、貨物の危険性、船型、旅客船・貨物船の別を考慮する。",
        "隔離は等級間の表だけでなく、SG・SGG、同一物質の反応性、食品との隔離も確認する。",
        "CTUは損傷・水密性・床強度・清浄性を確認し、重量を分散し、移動・転倒・圧壊を防止する。",
        "CSC安全承認板と定期検査状態を確認し、異常コンテナを使用しない。",
        "事故対応では物質を特定し、EmS火災・流出手順、MFAG医療措置、港湾通報体制を活用する。"
      ],
      inspectionPoints: [
        "積載方法コード、SW、SG、SGGの要件が収納計画に反映されているか。",
        "危険物間・食品間の隔離距離や隔壁条件を満たすか。",
        "貨物の重量配分、固縛、空隙処理、扉付近の荷崩れ防止が適切か。",
        "CSCプレート、次回検査日、構造損傷、床・扉・屋根の状態に問題がないか。"
      ],
      images: [
        {src: "../assets/reference-images/imdg-inspection-guide/page-103.jpg", page: 103, caption: "積載方法と船型の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-107.jpg", page: 107, caption: "隔離用語と船上配置の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-111.jpg", page: 111, caption: "隔離表の例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-116.jpg", page: 116, caption: "貨物輸送ユニットの収納例"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-119.jpg", page: 119, caption: "CSCとコンテナ安全確認"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-122.jpg", page: 122, caption: "船上緊急対応手順の説明"},
        {src: "../assets/reference-images/imdg-inspection-guide/page-126.jpg", page: 126, caption: "港湾区域の危険物取扱表"}
      ]
    }
  ]
};
