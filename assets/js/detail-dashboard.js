
(() => {
  "use strict";

  const root = document.getElementById("dangerousGoodsDetail");
  const data = Array.isArray(window.UN_DATABASE) ? window.UN_DATABASE : [];
  const params = new URLSearchParams(window.location.search);
  const requestedUn = String(params.get("un") || "").replace(/\D/g, "").padStart(4, "0");
  const requestedPackingGroup = String(params.get("pg") || "").normalize("NFKC").trim().toUpperCase();
  const requestedSourceRow = Number(params.get("row"));

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");


  const labelMaster = Array.isArray(window.LABEL_MASTER?.labels) ? window.LABEL_MASTER.labels : [];

  const normalizeClassValue = value =>
    String(value ?? "")
      .trim()
      .replace(/^class\s*/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "");

  const resolveClassLabel = classValue => {
    const normalized = normalizeClassValue(classValue);
    if (!normalized || normalized === '-' || normalized === 'なし') return null;
    const exact = labelMaster.find(item => normalizeClassValue(item.class) === normalized);
    if (exact) return exact;
    const mainClass = normalized.split('.')[0];
    return labelMaster.find(item => normalizeClassValue(item.class) === mainClass) || null;
  };

  const formatSubsidiaryRisk = value => {
    const normalized = String(value ?? "").normalize("NFKC").trim();
    if (!normalized || normalized === "-" || normalized === "—" || normalized === "なし") return "なし";

    // 検索結果・危険物詳細では、等級欄と表記を揃えて数字だけを表示する。
    // 日本語名を含む旧データや複数の副次危険性等級にも対応する。
    const classCodes = normalized.match(/(?:1\.[1-6]|2\.[1-3]|4\.[1-3]|5\.[12]|6\.[12]|[3789])/g) || [];
    const uniqueCodes = [...new Set(classCodes)];
    return uniqueCodes.length ? uniqueCodes.join("・") : normalized;
  };
  const display = value => {
    const text = String(value ?? "").trim();
    return escapeHtml(text && text !== "-" ? text : "—");
  };

  const codeText = (...values) => {
    const codes = values
      .flatMap(value => Array.isArray(value) ? value : [value])
      .flatMap(value => String(value ?? "").split(/\s+/))
      .map(value => value.trim())
      .filter(value => value && value !== "-");
    return codes.length ? [...new Set(codes)].join(" ") : "—";
  };

  const splitCodeTokens = (...values) =>
    [...new Set(
      values
        .flatMap(value => Array.isArray(value) ? value : [value])
        .flatMap(value => String(value ?? "").normalize("NFKC").trim().split(/\s+/))
        .map(value => value.trim().toUpperCase())
        .filter(value => value && value !== "-" && value !== "—" && /[A-Z0-9]/.test(value))
    )];

  const parseStowage = value => {
    const tokens = splitCodeTokens(value);
    return {
      categoryCodes: tokens.filter(token => /^[A-E]$/.test(token)),
      provisionCodes: tokens.filter(token => /^(SW|ES)[A-Z0-9.-]+$/.test(token)),
      otherCodes: tokens.filter(token => !/^[A-E]$/.test(token) && !/^(SW|ES)[A-Z0-9.-]+$/.test(token))
    };
  };

  const makeCodeAnchorId = code => `code-detail-${String(code || "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  const stowageCategoryReferenceMap = Object.fromEntries(
    ["A", "B", "C", "D", "E"].map(code => [code, {
      code,
      categoryId: "stowage",
      labelJa: "積載方法区分",
      imdgLocation: "Part 7, Chapter 7.1 – General stowage provisions",
      detailLocation: "危告示 別表第1 積載方法欄（区分記号）",
      englishExcerpt: "",
      commentaryJa: `積載方法欄の先頭に示される積載方法区分記号です。${code} は、後続のSWコードとは独立した規定として確認します。区分記号と追加積載方法コードの両方を適用してください。`,
      domesticReferences: [
        "危規則 第20条",
        "危告示 第3条第3項",
        "危告示 別表第1 積載方法欄"
      ]
    }])
  );

  const renderCodeLinks = codes => {
    const normalizedCodes = splitCodeTokens(codes);
    if (!normalizedCodes.length) return '<strong>—</strong>';
    return `<div class="code-chip-links">${normalizedCodes
      .map(code => `<button type="button" class="code-chip-link" data-code-detail="${escapeHtml(code)}">${escapeHtml(code)}</button>`)
      .join('<span class="code-chip-separator">/</span>')}</div>`;
  };

  const renderInlineCode = value => {
    const codes = splitCodeTokens(value);
    if (!codes.length) return display(value);
    return renderCodeLinks(codes);
  };

  const renderStowageSummary = stowageInfo => {
    const groups = [];
    if (stowageInfo.categoryCodes.length) groups.push(stowageInfo.categoryCodes.join(" / "));
    const provisionSet = [...stowageInfo.provisionCodes, ...stowageInfo.otherCodes];
    if (provisionSet.length) groups.push(provisionSet.join(" / "));
    return groups.length ? groups.join(" / ") : "—";
  };

  const renderStowageRequirementCell = stowageInfo => {
    const summary = renderStowageSummary(stowageInfo);
    if (summary === "—") return "—";
    const note = [
      stowageInfo.categoryCodes.length ? "積載方法区分" : "",
      [...stowageInfo.provisionCodes, ...stowageInfo.otherCodes].length ? "積載方法コード" : ""
    ].filter(Boolean).join(" / ");
    return `<div class="requirement-code-stack">${renderCodeLinks([...stowageInfo.categoryCodes, ...stowageInfo.provisionCodes, ...stowageInfo.otherCodes])}${note ? `<small>${escapeHtml(note)}</small>` : ""}</div>`;
  };

  const packingGroupSortValue = value => {
    const normalized = String(value ?? "").normalize("NFKC").trim().toUpperCase();
    const order = { I: 1, II: 2, III: 3 };
    return order[normalized] || 99;
  };

  const renderContainerVariantCode = (record, instructionField, additionalField) => {
    const instruction = codeText(record?.[instructionField]);
    const additional = codeText(record?.[additionalField]);
    if (instruction === "—" && additional === "—") return '<span class="variant-code-empty">—</span>';
    const parts = [];
    if (instruction !== "—") parts.push(renderCodeLinks(instruction));
    if (additional !== "—") parts.push(`<div class="variant-code-additional">${renderCodeLinks(additional)}</div>`);
    return `<div class="variant-code-value">${parts.join("")}</div>`;
  };

  const renderContainerVariantTable = (variants, selectedRecord) => {
    const rows = variants.map(variant => {
      const isCurrent = Number(variant.sourceRow) === Number(selectedRecord.sourceRow);
      return `
        <tr class="${isCurrent ? "is-current" : ""}">
          <th scope="row">${escapeHtml(variant.packingGroup || "—")}${isCurrent ? '<span>選択中</span>' : ""}</th>
          <td>${renderContainerVariantCode(variant, "largePackingInstruction", "largePackingAdditional")}</td>
          <td>${renderContainerVariantCode(variant, "ibcInstruction", "ibcAdditional")}</td>
        </tr>
      `;
    }).join("");

    return `
      <article class="requirement-group-card requirement-group-card--full container-variant-card">
        <div class="container-variant-heading">
          <div>
            <h4>容器等級別 大型容器・IBC容器コード</h4>
            <p>別表第1の同一国連番号・同一正式輸送品名の該当行を比較します。</p>
          </div>
        </div>
        <div class="container-variant-table-wrap">
          <table class="container-variant-table">
            <thead>
              <tr><th>容器等級</th><th>大型容器</th><th>IBC容器</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
        <small class="container-variant-note">「—」は、該当する容器等級の別表第1にコード表示がないことを示します。</small>
      </article>
    `;
  };

  const renderCodeDetailSection = (entries, title) => {
    if (!entries.length) return '<div class="notice-box">該当するコード詳細はありません。</div>';
    return `
      <section class="code-detail-section">
        <div class="code-detail-heading">
          <strong>${escapeHtml(title)}</strong>
          <span>国内法令の条文番号を主表示し、難解なコードはAI要約で補足します。</span>
        </div>
        <div class="code-detail-list">
          ${entries.map(entry => `
            <article class="code-detail-card" id="${makeCodeAnchorId(entry.code)}">
              <div class="code-detail-card-head">
                <strong>${escapeHtml(entry.code)}</strong>
                <span>${escapeHtml(entry.labelJa || "コード")}</span>
              </div>
              <div class="code-detail-card-body">
                <div class="code-detail-card-block">
                  <small>国内法令の主な参照</small>
                  <ul>${(entry.domesticReferences || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                </div>
                ${entry.detailLocation ? `<div class="code-detail-card-block"><small>補足表示</small><p>${escapeHtml(entry.detailLocation)}</p></div>` : ""}
                ${entry.imdgLocation ? `<div class="code-detail-card-block"><small>IMDG Code</small><p>${escapeHtml(entry.imdgLocation)}</p></div>` : ""}
                <div class="code-detail-card-block code-detail-card-block--ai">
                  <small>AI解説</small>
                  <p>${escapeHtml(entry.commentaryJa || "国内法令の条文と原典を照合して適用条件を確認してください。")}</p>
                </div>
                ${entry.englishExcerpt ? `<blockquote lang="en">${escapeHtml(entry.englishExcerpt)}</blockquote>` : ""}
              </div>
            </article>
          `).join("")}
        </div>
      </section>
    `;
  };


  const resolveLimitedQuantityDetail = value => {
    const inner = String(value ?? "").normalize("NFKC").trim();
    if (!inner || inner === "-" || inner === "—" || inner === "0") return null;

    return {
      inner,
      outerTotal: "30kg",
      summary: `内装：${inner}以下／外装合計：30kg以下`
    };
  };

  const record =
    data.find(item =>
      item.unNumber === requestedUn &&
      Number.isFinite(requestedSourceRow) &&
      Number(item.sourceRow) === requestedSourceRow
    ) ||
    data.find(item =>
      item.unNumber === requestedUn &&
      requestedPackingGroup &&
      String(item.packingGroup || "").normalize("NFKC").trim().toUpperCase() === requestedPackingGroup
    ) ||
    data.find(item => item.unNumber === requestedUn) ||
    data[0];

  if (!record) {
    root.innerHTML = '<div class="panel"><div class="panel-body">危険物データがありません。</div></div>';
    return;
  }

  const relatedVariantRecords = data
    .filter(item => item.unNumber === record.unNumber && String(item.properShippingName || "") === String(record.properShippingName || ""))
    .sort((a, b) => packingGroupSortValue(a.packingGroup) - packingGroupSortValue(b.packingGroup));

  const containerVariantTable = renderContainerVariantTable(relatedVariantRecords, record);

  const limitedQuantityDetail = resolveLimitedQuantityDetail(record.limitedQuantity);
  const stowageInfo = parseStowage(record.stowage);
  const stowageSummary = renderStowageSummary(stowageInfo);
  const stowageProvisionCodes = [...stowageInfo.provisionCodes, ...stowageInfo.otherCodes];
  const segregationCodes = splitCodeTokens(record.segregation).filter(code => /^(SG|SGG)[A-Z0-9.-]+$/.test(code));
  const ems = window.EMSResolver?.resolve(record) || {};
  const primaryLabel = window.LabelResolver?.resolvePrimary(record);
  const subsidiaryLabels = window.LabelResolver?.resolveSubsidiaries(record) || [];
  const marineLabel = window.LabelResolver?.resolveMarinePollutant(record);

  const marinePollutantStatus = marineLabel
    ? {
        short: "別表第1にP表記あり",
        legal: "別表第1にP表記あり"
      }
    : {
        short: "別表第1にP表記なし",
        legal: "別表第1にP表記なし"
      };

  const exceptedQuantityDetail =
    window.ExceptedQuantityResolver?.resolve(record) || null;
  const packageMarkingDetail =
    window.PackageMarkingResolver?.resolve(record) || null;
  const subsidiary = record.subsidiaryRisk && record.subsidiaryRisk !== "-"
    ? record.subsidiaryRisk
    : "なし";

  const packingCode = codeText(
    record.smallPackingInstruction,
    record.smallPackingAdditional,
    record.largePackingInstruction,
    record.largePackingAdditional
  );
  const ibcCode = codeText(record.ibcInstruction, record.ibcAdditional);
  const portableTankCode = codeText(
    record.portableTankInstruction,
    record.portableTankAdditional
  );
  const flexibleBulkCode = codeText(record.flexibleBulkContainer);
  const specialProvisionCode = codeText(record.specialProvisions, record.remarks);

  const specialProvisionMaster = window.IMDG_REFERENCE_MASTER?.references || {};
  const specialProvisionDetails = (record.specialProvisions || [])
    .map(code => specialProvisionMaster[code])
    .filter(Boolean);

  const showImdgReferences =
    window.ISSStorage?.getShowImdgReferences?.() ?? true;

  const requirementLayout =
    window.ISSStorage?.getRequirementLayout?.() ?? "two-column";

  const crossReferences = window.IMDGCrossReferenceResolver?.resolveMany(
    record.smallPackingInstruction,
    record.smallPackingAdditional,
    record.largePackingInstruction,
    record.largePackingAdditional,
    record.ibcInstruction,
    record.ibcAdditional,
    record.portableTankInstruction,
    record.portableTankAdditional,
    record.flexibleBulkContainer,
    record.specialProvisions,
    record.stowage,
    record.segregation
  ) || [];

  const manualStowageReferences = stowageInfo.categoryCodes
    .map(code => stowageCategoryReferenceMap[code])
    .filter(Boolean);

  const codeReferenceEntries = [...crossReferences, ...manualStowageReferences]
    .filter(Boolean)
    .reduce((list, entry) => {
      if (list.some(item => item.code === entry.code)) return list;
      list.push(entry);
      return list;
    }, []);

  const packingCodeEntries = codeReferenceEntries.filter(entry =>
    ["packing", "largePacking", "ibc", "portableTank", "tankProvision", "bulk", "specialProvision"].includes(entry.categoryId)
  );
  const segregationCodeEntries = codeReferenceEntries.filter(entry =>
    ["stowage", "segregation"].includes(entry.categoryId)
  );

  function normalizeName(value) {
    return String(value || "")
      .toUpperCase()
      .replace(/\([^)]*\)/g, " ")
      .replace(/\b(SOLID|LIQUID|N\.O\.S\.|N O S|STABILIZED|SOLUTION|MIXTURE)\b/g, " ")
      .replace(/[、,，.]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function similarityScore(candidate) {
    if (candidate === record) return -1;

    let score = 0;
    if (candidate.unNumber === record.unNumber) score += 100;

    const currentTokens = new Set(normalizeName(record.properShippingName).split(" ").filter(Boolean));
    const candidateTokens = new Set(normalizeName(candidate.properShippingName).split(" ").filter(Boolean));
    const overlap = [...currentTokens].filter(token => candidateTokens.has(token)).length;
    score += overlap * 8;

    if (candidate.class === record.class) score += 3;
    if (candidate.properShippingName?.includes("ENVIRONMENTALLY HAZARDOUS SUBSTANCE")
        && record.properShippingName?.includes("ENVIRONMENTALLY HAZARDOUS SUBSTANCE")) {
      score += 40;
    }

    return score;
  }

  const relatedRows = data
    .map(item => ({item, score: similarityScore(item)}))
    .filter(entry => entry.score > 10)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(entry => entry.item);

  if (!relatedRows.length) relatedRows.push(record);

  const isNos = /\bN\.O\.S\.\b/i.test(record.properShippingName || "");
  const hasSp274 = (record.specialProvisions || []).includes("SP274");
  const technicalNameExamples =
    record.unNumber === "3077"
      ? [
          "国連番号 3077 ENVIRONMENTALLY HAZARDOUS SUBSTANCE, SOLID, N.O.S. (Technical Name)"
        ]
      : record.unNumber === "3082"
        ? [
            "国連番号 3082 ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S. (paint)",
            "国連番号 3082 ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S. (perfumery products)"
          ]
        : [
            `国連番号 ${record.unNumber} ${record.properShippingName}${isNos ? " (Technical Name)" : ""}`
          ];


  const classificationReferenceMap = {
    "火薬類": ["危規則 第2条第1号イ", "危告示 第2条第1項"],
    "高圧ガス": ["危規則 第2条第1号ロ", "危告示 第2条第2項"],
    "引火性液体類": ["危規則 第2条第1号ハ(1)〜(3)", "危告示 第2条第3項"],
    "可燃性物質類": ["危規則 第2条第1号ニ(1)〜(3)", "危告示 第2条第4項"],
    "酸化性物質類": ["危規則 第2条第1号ホ(1)・(2)", "危告示 第2条第5項・第6項"],
    "毒物類": ["危規則 第2条第1号ヘ(1)・(2)", "危告示 第2条第7項・第8項"],
    "腐食性物質": ["危規則 第2条第1号チ", "危告示 第2条第9項"],
    "有害性物質": ["危規則 第2条第1号リ", "危告示 第2条第10項"]
  };

  const classificationReferences = classificationReferenceMap[record.classification] || [
    "危規則 第8条第1項",
    "危告示 第3条第3項"
  ];

  const labelLegalReferences = [
    "危規則 第8条第1項・第9条",
    "危告示 第7条の2"
  ];

  const packageMarkingLegalReferences = [
    "危規則 第8条第1項・第9条",
    "危告示 第7条の3第1項・第2項",
    "危告示 第14条の2の2（オーバーパック表示）"
  ];

  const exceptedQuantityLegalReferences = exceptedQuantityDetail
    ? [
        "危告示 第7条の4第2項",
        String(exceptedQuantityDetail.source.domesticReference || ""),
        String(exceptedQuantityDetail.source.detailReference || "")
      ].filter(Boolean)
    : [];

  const sourceTabReferences = [
    ...classificationReferences,
    `危告示 別表第1 p.${record.sourcePage} 行${record.sourceRow}`,
    "危規則 第8条第1項"
  ];

  root.innerHTML = `
    <div class="dg-layout">
      <section class="dg-main-column">
        <article class="panel">
          <div class="panel-heading">
            <h2>基本情報</h2>
            <button id="favoriteButton" class="info-badge" type="button">☆ お気に入り</button>
          </div>
          <div class="panel-body">
            <div class="dg-identity">
              <div class="dg-label-symbol dg-label-symbol--image">
                ${
                  primaryLabel
                    ? `<img src="${escapeHtml(primaryLabel.src)}" alt="${escapeHtml(primaryLabel.nameJa)}">`
                    : `<span>${display(record.class)}</span>`
                }
              </div>
              <div>
                <div class="dg-un-number">国連番号 ${display(record.unNumber)}</div>
                <h2 class="dg-title-ja">${display(record.properShippingNameJa)}</h2>
                <p class="dg-title-en">${display(record.properShippingName)}</p>
                <div class="dg-class-row">
                  <span class="dg-class-chip is-primary">等級 ${display(record.class)}</span>
                  <span class="dg-class-chip">副次危険性等級 ${escapeHtml(formatSubsidiaryRisk(subsidiary))}</span>
                  <span class="dg-class-chip">容器等級 ${display(record.packingGroup)}</span>
                  <span class="dg-class-chip">海洋汚染物質 ${escapeHtml(marinePollutantStatus.short)}</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-heading"><h3>標札表示</h3></div>
          <div class="panel-body">
            <div class="label-grid">
              <div class="label-card label-card--actual">
                ${
                  primaryLabel
                    ? `<img src="${escapeHtml(primaryLabel.src)}" alt="${escapeHtml(primaryLabel.nameJa)}">
                       <strong>正標札</strong>
                       <small>${escapeHtml(primaryLabel.nameJa)}／等級 ${display(primaryLabel.class)}</small>`
                    : `<div class="label-empty">正標札画像未登録</div>`
                }
              </div>

              ${
                subsidiaryLabels.length
                  ? subsidiaryLabels.map((label, index) => `
                      <div class="label-card label-card--actual">
                        <img src="${escapeHtml(label.src)}" alt="${escapeHtml(label.nameJa)}">
                        <strong>${subsidiaryLabels.length > 1 ? `副標札 ${index + 1}` : "副標札"}</strong>
                        <small>${escapeHtml(label.nameJa)}／等級 ${display(label.class)}</small>
                      </div>
                    `).join("")
                  : `<div class="label-card label-card--actual">
                       <div class="label-empty">副標札なし</div>
                       <strong>副標札</strong>
                       <small>副次危険性等級なし</small>
                     </div>`
              }

              ${
                marineLabel
                  ? `<div class="label-card label-card--actual">
                       <img src="${escapeHtml(marineLabel.src)}" alt="${escapeHtml(marineLabel.nameJa)}">
                       <strong>海洋汚染物質</strong>
                       <small>Marine Pollutant</small>
                     </div>`
                  : ""
              }
            </div>

            <div class="legal-reference-box">
              <strong>国内法令の主な参照</strong>
              <ul>
                ${labelLegalReferences.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="tab-strip" role="tablist">
            <button class="tab-button is-active" data-tab="overview" type="button">概要</button>
            <button class="tab-button" data-tab="packing" type="button">包装要件</button>
            <button class="tab-button" data-tab="ems" type="button">EmS</button>
            <button class="tab-button" data-tab="segregation" type="button">隔離・積載方法</button>
            <button class="tab-button" data-tab="source" type="button">原文・解説</button>
          </div>

          <div class="tab-panel is-active" data-panel="overview">
            <section class="domestic-notification-section">
              <div class="domestic-notification-heading">
                <div>
                  <strong>別表第1</strong>
                  <span>別表第1の項目名に対応した表示</span>
                </div>
                <small>${display(record.source)}</small>
              </div>

              <div class="domestic-notification-grid">
                <div class="domestic-field domestic-field--wide">
                  <span>国連番号</span>
                  <strong>${display(record.unNumber)}</strong>
                </div>

                <div class="domestic-field domestic-field--wide">
                  <span>正式輸送品名</span>
                  <strong>${display(record.properShippingNameJa)}</strong>
                </div>

                <div class="domestic-field domestic-field--wide">
                  <span>英語名</span>
                  <strong lang="en">${display(record.properShippingName)}</strong>
                </div>

                <div class="domestic-field">
                  <span>分類</span>
                  <strong>${display(record.classification)}</strong>
                </div>

                <div class="domestic-field">
                  <span>項目</span>
                  <strong>${display(record.item)}</strong>
                </div>

                <div class="domestic-field">
                  <span>等級</span>
                  <strong>${display(record.class)}</strong>
                </div>

                <div class="domestic-field">
                  <span>隔離区分</span>
                  <strong>${display(record.segregationGroup)}</strong>
                </div>

                <div class="domestic-field">
                  <span>副次危険性等級</span>
                  <strong>${escapeHtml(formatSubsidiaryRisk(subsidiary))}</strong>
                </div>

                <div class="domestic-field">
                  <span>容器等級</span>
                  <strong>${display(record.packingGroup)}</strong>
                </div>

                <div class="domestic-field domestic-field--limited">
                  <span>少量危険物</span>
                  <strong>${display(record.limitedQuantity)}</strong>
                  ${
                    limitedQuantityDetail
                      ? `<small>
                           内装：${escapeHtml(limitedQuantityDetail.inner)}以下<br>
                           外装合計：${escapeHtml(limitedQuantityDetail.outerTotal)}以下
                         </small>`
                      : ""
                  }
                </div>

                <div class="domestic-field domestic-field--excepted">
                  <span>微量危険物</span>
                  <strong>${display(record.exceptedQuantity)}</strong>
                  ${
                    exceptedQuantityDetail
                      ? `<small>
                           ${
                             exceptedQuantityDetail.permitted
                               ? `内装：${exceptedQuantityDetail.perInnerLiquidMl}mL／${exceptedQuantityDetail.perInnerSolidG}g以下<br>
                                  外装合計：${exceptedQuantityDetail.perOuterLiquidMl}mL／${exceptedQuantityDetail.perOuterSolidG}g以下`
                               : "微量危険物として運送不可"
                           }
                         </small>`
                      : ""
                  }
                </div>
              </div>

              ${
                requirementLayout === "horizontal"
                  ? `
                    <div class="domestic-requirements-table-wrap">
                      <table class="domestic-requirements-table">
                        <thead>
                          <tr>
                            <th colspan="2">小型容器</th>
                            <th colspan="2">大型容器</th>
                            <th colspan="2">IBC容器</th>
                            <th colspan="2">ポータブルタンク</th>
                            <th rowspan="2">フレキシブルバルクコンテナ</th>
                            <th rowspan="2">積載方法</th>
                            <th rowspan="2">隔離</th>
                            <th rowspan="2">備考</th>
                          </tr>
                          <tr>
                            <th>包装要件</th>
                            <th>追加規定</th>
                            <th>包装要件</th>
                            <th>追加規定</th>
                            <th>包装要件</th>
                            <th>追加規定</th>
                            <th>要件</th>
                            <th>追加規定</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>${renderInlineCode(record.smallPackingInstruction)}</td>
                            <td>${renderInlineCode(record.smallPackingAdditional)}</td>
                            <td>${renderInlineCode(record.largePackingInstruction)}</td>
                            <td>${renderInlineCode(record.largePackingAdditional)}</td>
                            <td>${renderInlineCode(record.ibcInstruction)}</td>
                            <td>${renderInlineCode(record.ibcAdditional)}</td>
                            <td>${renderInlineCode(record.portableTankInstruction)}</td>
                            <td>${renderInlineCode(record.portableTankAdditional)}</td>
                            <td>${renderInlineCode(record.flexibleBulkContainer)}</td>
                            <td>${display(record.stowage)}</td>
                            <td>${renderInlineCode(record.segregation)}</td>
                            <td>${renderInlineCode(record.remarks)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  `
                  : `
                    <div class="domestic-requirements-cards">
                      <article class="requirement-group-card">
                        <h4>小型容器</h4>
                        <dl>
                          <div><dt>包装要件</dt><dd>${renderInlineCode(record.smallPackingInstruction)}</dd></div>
                          <div><dt>追加規定</dt><dd>${renderInlineCode(record.smallPackingAdditional)}</dd></div>
                        </dl>
                      </article>

                      <article class="requirement-group-card">
                        <h4>大型容器</h4>
                        <dl>
                          <div><dt>包装要件</dt><dd>${renderInlineCode(record.largePackingInstruction)}</dd></div>
                          <div><dt>追加規定</dt><dd>${renderInlineCode(record.largePackingAdditional)}</dd></div>
                        </dl>
                      </article>

                      <article class="requirement-group-card">
                        <h4>IBC容器</h4>
                        <dl>
                          <div><dt>包装要件</dt><dd>${renderInlineCode(record.ibcInstruction)}</dd></div>
                          <div><dt>追加規定</dt><dd>${renderInlineCode(record.ibcAdditional)}</dd></div>
                        </dl>
                      </article>

                      ${containerVariantTable}

                      <article class="requirement-group-card">
                        <h4>ポータブルタンク</h4>
                        <dl>
                          <div><dt>要件</dt><dd>${renderInlineCode(record.portableTankInstruction)}</dd></div>
                          <div><dt>追加規定</dt><dd>${renderInlineCode(record.portableTankAdditional)}</dd></div>
                        </dl>
                      </article>

                      <article class="requirement-group-card">
                        <h4>その他の容器・運送要件</h4>
                        <dl>
                          <div><dt>フレキシブルバルクコンテナ</dt><dd>${renderInlineCode(record.flexibleBulkContainer)}</dd></div>
                          <div><dt>積載方法</dt><dd>${renderStowageRequirementCell(stowageInfo)}</dd></div>
                        </dl>
                      </article>

                      <article class="requirement-group-card">
                        <h4>隔離・備考</h4>
                        <dl>
                          <div><dt>隔離</dt><dd>${renderInlineCode(record.segregation)}</dd></div>
                          <div><dt>備考</dt><dd>${renderInlineCode(record.remarks)}</dd></div>
                        </dl>
                      </article>
                    </div>
                  `
              }

            </section>
          </div>

          <div class="tab-panel" data-panel="packing">
            <div class="code-grid">
              <div class="code-box">
                <span>小型容器・大型容器 包装要件</span>
                ${renderCodeLinks([record.smallPackingInstruction, record.smallPackingAdditional, record.largePackingInstruction, record.largePackingAdditional])}
              </div>
              <div class="code-box">
                <span>IBC容器</span>
                ${renderCodeLinks([record.ibcInstruction, record.ibcAdditional])}
              </div>
              <div class="code-box">
                <span>ポータブルタンク</span>
                ${renderCodeLinks([record.portableTankInstruction, record.portableTankAdditional])}
              </div>
              <div class="code-box">
                <span>フレキシブルバルクコンテナ</span>
                ${renderCodeLinks([record.flexibleBulkContainer])}
              </div>
              <div class="code-box">
                <span>特別規定</span>
                ${renderCodeLinks([record.specialProvisions, record.remarks])}
              </div>
            </div>
            <div class="source-policy">
              <strong>参照方針</strong>
              <p>原則として危告示別表第1のコードを表示し、危告示でIMDG Codeを参照する箇所は該当条文の参照情報を併記します。コードを選択すると、下段の国内法令条文・AI解説へジャンプできます。</p>
            </div>
            ${renderCodeDetailSection(packingCodeEntries, "包装・容器コードの詳細")}
          </div>

          <div class="tab-panel" data-panel="ems">
            <div class="ems-pair">
              <div class="ems-block"><span>Fire Schedule</span><strong>${display(ems.fireCode)}</strong></div>
              <div class="ems-block"><span>Spillage Schedule</span><strong>${display(ems.spillageCode)}</strong></div>
            </div>
            <p class="notice-box">出典：${display(ems.source)}／IMDG Code Amendment ${display(ems.imdgAmendment)}</p>
          </div>

          <div class="tab-panel" data-panel="segregation">
            <table class="data-table">
              <tr><th>隔離</th><td>${renderCodeLinks(segregationCodes)}</td></tr>
              <tr><th>積載方法区分</th><td>${renderCodeLinks(stowageInfo.categoryCodes)}</td></tr>
              <tr><th>積載方法コード</th><td>${renderCodeLinks(stowageProvisionCodes)}</td></tr>
              <tr><th>表示まとめ</th><td>${escapeHtml(stowageSummary)}</td></tr>
            </table>
            <div class="source-policy">
              <strong>確認のポイント</strong>
              <p>積載方法欄に「E SW2」のように複数のコードがある場合、積載方法区分 E と積載方法コード SW2 は別々の規定として確認します。コードを選択すると、下段の国内法令条文・AI解説へジャンプできます。</p>
            </div>
            ${renderCodeDetailSection(segregationCodeEntries, "隔離・積載方法コードの詳細")}
          </div>

          <div class="tab-panel" data-panel="source">
            <div class="source-policy source-policy--primary">
              <strong>国内法令（主表示）</strong>
              <p>${display(record.source)}</p>
              <small>この画面では危規則・危告示を主たる表示根拠とし、必要に応じてIMDG Codeを併記します。</small>
            </div>

            <div class="legal-reference-box">
              <strong>国内法令の主な参照</strong>
              <ul>
                ${sourceTabReferences.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </div>

            ${
              showImdgReferences
                ? `
                  <section class="cross-reference-section">
                    <div class="cross-reference-section-heading">
                      <strong>国内法令・IMDG Code</strong>
                      <a href="settings.html">表示設定</a>
                    </div>
                    ${
                      crossReferences.length
                        ? `<div class="cross-reference-list">
                             ${crossReferences.map(reference => `
                               <article class="inline-reference-card">
                                 <div class="inline-reference-code">${escapeHtml(reference.code)}</div>
                                 <div>
                                   <strong>${escapeHtml(reference.labelJa || "IMDG Code参照")}</strong>
                                   <p>${escapeHtml(reference.imdgLocation || "参照先確認中")}</p>
                                   ${reference.detailLocation ? `<small>${escapeHtml(reference.detailLocation)}</small>` : ""}
                                   <div class="inline-reference-meta">
                                     <strong>国内法令の主な参照</strong>
                                     <ul>${(reference.domesticReferences || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
                                   </div>
                                   ${
                                     reference.englishExcerpt
                                       ? `<blockquote lang="en">${escapeHtml(reference.englishExcerpt)}</blockquote>`
                                       : `<small>英語原文は未登録です。原典照合後に追加します。</small>`
                                   }
                                 </div>
                               </article>
                             `).join("")}
                           </div>`
                        : `<div class="notice-box">参照対象コードはありません。</div>`
                    }
                  </section>

                  ${
                    specialProvisionDetails.length
                      ? specialProvisionDetails.map(detail => `
                          <article class="imdg-reference-card">
                            <div class="imdg-reference-heading">
                              <strong>${escapeHtml(detail.code)}</strong>
                              <span>${escapeHtml(detail.section)}</span>
                            </div>
                            <blockquote lang="en">${escapeHtml(detail.englishExcerpt)}</blockquote>
                            <p>${escapeHtml(detail.japaneseExplanation)}</p>
                            <ul>
                              ${(detail.examples || []).map(example => `<li><code>${escapeHtml(example)}</code></li>`).join("")}
                            </ul>
                            <small>${escapeHtml(detail.sourceNote)}</small>
                          </article>
                        `).join("")
                      : `<div class="notice-box">
                           現在の危告示データに、個別のIMDG Code原文参照情報は登録されていません。
                         </div>`
                  }
                `
                : `
                  <div class="imdg-reference-hidden">
                    <strong>IMDG Code参照先は非表示です</strong>
                    <p>設定画面で表示をONにできます。</p>
                    <a href="settings.html">表示設定を開く</a>
                  </div>
                `
            }
          </div>
        </article>

        <article class="panel">
          <div class="panel-heading"><h3>関連国連番号</h3></div>
          <div class="panel-body">
            <p class="related-note">
              同じ国連番号で容器等級などが異なるレコード、または類似する正式品名を優先して表示します。
            </p>
            <table class="related-table">
              <thead>
                <tr>
                  <th>国連番号</th>
                  <th>正式輸送品名</th>
                  <th>等級</th>
                  <th>容器等級</th>
                  <th>包装要件</th>
                </tr>
              </thead>
              <tbody>
                ${relatedRows.map(item => `
                  <tr>
                    <td><a href="dangerous-goods-detail.html?un=${encodeURIComponent(item.unNumber)}&pg=${encodeURIComponent(item.packingGroup || "")}&row=${encodeURIComponent(item.sourceRow || "")}">${display(item.unNumber)}</a></td>
                    <td>
                      <strong>${display(item.properShippingNameJa)}</strong><br>
                      <small>${display(item.properShippingName)}</small>
                    </td>
                    <td>${display(item.class)}</td>
                    <td>${display(item.packingGroup)}</td>
                    <td>${display(item.smallPackingInstruction)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        </article>
      </section>

      <aside class="dg-side-column">


        <article class="panel marking-panel">
          <div class="panel-heading"><h3>正式輸送品名・国連番号表示</h3></div>
          <div class="panel-body">
            <section class="character-height-guide">
              <div class="character-height-heading">
                <strong>国連番号・UNの文字高さ</strong>
                <span>危告示 第7条の3第2項／IMDG Code 5.2.1.1</span>
              </div>

              <div class="character-height-grid">
                <article class="character-height-card is-primary">
                  <strong>12mm以上</strong>
                  <span>原則</span>
                  <p>通常の容器に表示する国連番号およびUNの文字高さです。</p>
                </article>

                <article class="character-height-card">
                  <strong>6mm以上</strong>
                  <span>小型容器等</span>
                  <p>容量30L以下、最大正味質量30kg以下、または水容量60L以下の高圧ガス容器に適用します。</p>
                </article>

                <article class="character-height-card">
                  <strong>適切な寸法</strong>
                  <span>5L以下・5kg以下</span>
                  <p>容器の大きさに応じて、明瞭に読み取れる寸法とします。</p>
                </article>
              </div>

              <div class="character-height-caution">
                <strong>現場確認のポイント</strong>
                <p>
                  文字高さは、国連番号の数字とUNに適用します。
                  容器容量または最大正味質量を確認し、12mm・6mm・適切な寸法のいずれかを判断してください。
                </p>
              </div>
            </section>

            ${
              packageMarkingDetail
                ? `<details class="marking-guide-image" open>
                     <summary>正式輸送品名・国連番号の実寸比較</summary>
                     <div class="dynamic-marking-guide">
                       <div class="marking-actual-size" data-actual-size-panel>
                         <div class="marking-actual-size__heading">
                           <strong>スマホ画面で実寸比較</strong>
                           <span>設定画面で保存した実寸補正値を使用します。正式輸送品名と国連番号を、12mmまたは6mmの文字高さで確認できます。</span>
                         </div>
                         <div class="marking-calibration-summary">
                           <span>設定画面で保存した補正値：<strong data-calibration-value>100%</strong></span>
                           <button type="button" data-open-landscape>横画面で実寸比較を開く</button>
                         </div>
                         <div class="marking-size-selector" role="tablist" aria-label="文字高さの切替">
                           <button type="button" class="marking-size-selector__button is-active" data-marking-size-option="12">12mm</button>
                           <button type="button" class="marking-size-selector__button" data-marking-size-option="6">6mm</button>
                         </div>
                         <div class="marking-actual-size__preview">
                           <div class="marking-actual-size__card is-preview">
                             <div class="marking-actual-size__label">
                               <strong data-marking-size-label>12mm以上</strong>
                               <span data-marking-size-caption>原則</span>
                             </div>
                             <div class="marking-actual-size__sample-board">
                               <div class="marking-actual-size__sample-line" data-actual-size="12" data-actual-psn>${display(packageMarkingDetail?.nos?.placeholderDisplay || record.properShippingName)}</div>
                               <div class="marking-actual-size__sample-line marking-actual-size__sample-line--un" data-actual-size="12" data-actual-un>UN${display(record.unNumber)}</div>
                             </div>
                           </div>
                         </div>
                         <p class="marking-actual-size__note">ブラウザのページ拡大率は100%にしてください。補正値を変更する場合はホームの設定画面から調整してください。</p>
                       </div>
                     </div>
                   </details>`
                : ""
            }

            <div class="legal-reference-box">
              <strong>国内法令・IMDG Code</strong>
              <ul>
                ${packageMarkingLegalReferences.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
                <li>${escapeHtml(`IMDG Code ${packageMarkingDetail?.imdgReference?.section || "5.2.1.1"}`)}</li>
              </ul>
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-heading"><h3>関連情報</h3></div>
          <div class="panel-body">
            <table class="data-table">
              <tr><th>EmS</th><td>${display(ems.combinedCode)}</td></tr>
              <tr><th>海洋汚染物質</th><td>${escapeHtml(marinePollutantStatus.legal)}</td></tr>
              <tr><th>特別規定</th><td>${escapeHtml(specialProvisionCode)}</td></tr>
              <tr><th>国内法令</th><td>${classificationReferences.map(item => escapeHtml(item)).join("<br>")}</td></tr>
            </table>
          </div>
        </article>
      </aside>
    </div>
    <div class="code-detail-modal" data-code-modal hidden>
      <div class="code-detail-modal__backdrop" data-code-modal-close></div>
      <section class="code-detail-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="codeDetailModalTitle">
        <div class="code-detail-modal__header">
          <div>
            <span>国内法令・IMDG Code</span>
            <h3 id="codeDetailModalTitle" data-code-modal-title>コード詳細</h3>
          </div>
          <button type="button" data-code-modal-close aria-label="閉じる">×</button>
        </div>
        <div class="code-detail-modal__body" data-code-modal-body></div>
      </section>
    </div>
  `;

  root.querySelectorAll("[data-tab]").forEach(button => {
    button.addEventListener("click", () => {
      root.querySelectorAll("[data-tab]").forEach(item => item.classList.remove("is-active"));
      root.querySelectorAll("[data-panel]").forEach(item => item.classList.remove("is-active"));
      button.classList.add("is-active");
      root.querySelector(`[data-panel="${button.dataset.tab}"]`)?.classList.add("is-active");
    });
  });

  const actualSizePanel = root.querySelector("[data-actual-size-panel]");
  if (actualSizePanel) {
    const storageKey = "dangerousGoodsGuideActualSizeScale";
    const sizeKey = "dangerousGoodsGuideActualMarkingSize";
    const mmToCssPx = 96 / 25.4;
    const clampScale = value => Math.min(1.6, Math.max(0.6, value));
    let actualSizeScale = clampScale(Number(localStorage.getItem(storageKey)) || 1);
    let selectedSize = Number(localStorage.getItem(sizeKey)) === 6 ? 6 : 12;

    const applyActualSizeScale = () => {
      actualSizePanel.querySelectorAll("[data-actual-size]").forEach(sample => {
        const millimetres = Number(sample.dataset.actualSize) || selectedSize;
        sample.style.fontSize = `${millimetres * mmToCssPx * actualSizeScale}px`;
      });
      const value = actualSizePanel.querySelector("[data-calibration-value]");
      if (value) value.textContent = `${Math.round(actualSizeScale * 100)}%`;
      localStorage.setItem(storageKey, String(actualSizeScale));
    };

    const updateMarkingSizeMode = size => {
      selectedSize = size === 6 ? 6 : 12;
      actualSizePanel.querySelectorAll("[data-actual-size]").forEach(sample => {
        sample.dataset.actualSize = String(selectedSize);
      });
      const label = actualSizePanel.querySelector("[data-marking-size-label]");
      const caption = actualSizePanel.querySelector("[data-marking-size-caption]");
      if (label) label.textContent = selectedSize === 6 ? "6mm以上" : "12mm以上";
      if (caption) caption.textContent = selectedSize === 6 ? "小型容器等" : "原則";
      actualSizePanel.querySelector("[data-open-landscape]")?.addEventListener("click", async () => {
      actualSizePanel.classList.add("is-landscape-view");
      try { await actualSizePanel.requestFullscreen?.(); } catch {}
      try { await screen.orientation?.lock?.("landscape"); } catch {}
    });
    document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement) actualSizePanel.classList.remove("is-landscape-view"); });

    actualSizePanel.querySelectorAll("[data-marking-size-option]").forEach(button => {
        button.classList.toggle("is-active", Number(button.dataset.markingSizeOption) === selectedSize);
      });
      localStorage.setItem(sizeKey, String(selectedSize));
      applyActualSizeScale();
    };
    actualSizePanel.querySelectorAll("[data-marking-size-option]").forEach(button => {
      button.addEventListener("click", () => updateMarkingSizeMode(Number(button.dataset.markingSizeOption)));
    });
    updateMarkingSizeMode(selectedSize);
  }


  const codeModal = root.querySelector("[data-code-modal]");
  const codeModalTitle = root.querySelector("[data-code-modal-title]");
  const codeModalBody = root.querySelector("[data-code-modal-body]");

  const pdfImageLightbox = document.createElement("div");
  pdfImageLightbox.className = "pdf-image-lightbox";
  pdfImageLightbox.hidden = true;
  pdfImageLightbox.innerHTML = `
    <div class="pdf-image-lightbox__backdrop" data-pdf-lightbox-close></div>
    <div class="pdf-image-lightbox__dialog" role="dialog" aria-modal="true" aria-label="原文ページ画像の拡大表示" tabindex="-1">
      <div class="pdf-image-lightbox__header">
        <strong data-pdf-lightbox-title>原文ページ画像</strong>
        <div class="pdf-image-lightbox__controls" role="toolbar" aria-label="原文画像の拡大縮小操作">
          <button type="button" data-pdf-lightbox-zoom-out aria-label="縮小">－</button>
          <span class="pdf-image-lightbox__scale" data-pdf-lightbox-scale>100%</span>
          <button type="button" data-pdf-lightbox-zoom-in aria-label="拡大">＋</button>
          <button type="button" data-pdf-lightbox-fit aria-label="全体表示">全体表示</button>
          <button type="button" data-pdf-lightbox-reset aria-label="100%表示">100%</button>
          <button type="button" data-pdf-lightbox-close aria-label="拡大表示を閉じる">×</button>
        </div>
      </div>
      <div class="pdf-image-lightbox__body">
        <img data-pdf-lightbox-image alt="原文ページ拡大画像">
      </div>
    </div>`;
  document.body.appendChild(pdfImageLightbox);

  const pdfLightboxState = {
    naturalWidth: 0,
    naturalHeight: 0,
    fitScale: 1,
    scale: 1
  };

  const updatePdfLightboxScaleText = () => {
    const scaleLabel = pdfImageLightbox.querySelector("[data-pdf-lightbox-scale]");
    if (scaleLabel) scaleLabel.textContent = `${Math.round((pdfLightboxState.scale || 1) * 100)}%`;
  };

  const calculatePdfLightboxFitScale = () => {
    const body = pdfImageLightbox.querySelector(".pdf-image-lightbox__body");
    if (!body || !pdfLightboxState.naturalWidth || !pdfLightboxState.naturalHeight) {
      pdfLightboxState.fitScale = 1;
      return 1;
    }
    const padding = 16;
    const availableWidth = Math.max(body.clientWidth - padding, 120);
    const availableHeight = Math.max(body.clientHeight - padding, 120);
    const widthScale = availableWidth / pdfLightboxState.naturalWidth;
    const heightScale = availableHeight / pdfLightboxState.naturalHeight;
    pdfLightboxState.fitScale = Math.min(widthScale, heightScale, 1);
    return pdfLightboxState.fitScale;
  };

  const applyPdfLightboxScale = (nextScale, options = {}) => {
    const image = pdfImageLightbox.querySelector("[data-pdf-lightbox-image]");
    const body = pdfImageLightbox.querySelector(".pdf-image-lightbox__body");
    if (!image || !body || !pdfLightboxState.naturalWidth || !pdfLightboxState.naturalHeight) return;
    const preserveCenter = options.preserveCenter !== false;
    const minimumScale = Math.min(pdfLightboxState.fitScale || 1, 1);
    const maximumScale = 6;
    const previousScale = pdfLightboxState.scale || 1;
    const targetScale = Math.min(Math.max(nextScale, minimumScale), maximumScale);
    const previousCenterX = (body.scrollLeft + body.clientWidth / 2) / previousScale;
    const previousCenterY = (body.scrollTop + body.clientHeight / 2) / previousScale;
    pdfLightboxState.scale = targetScale;
    image.style.width = `${Math.round(pdfLightboxState.naturalWidth * targetScale)}px`;
    image.style.height = `${Math.round(pdfLightboxState.naturalHeight * targetScale)}px`;
    updatePdfLightboxScaleText();
    requestAnimationFrame(() => {
      if (!preserveCenter || Math.abs(targetScale - (pdfLightboxState.fitScale || 1)) < 0.001) {
        body.scrollLeft = 0;
        body.scrollTop = 0;
        return;
      }
      body.scrollLeft = Math.max(0, previousCenterX * targetScale - body.clientWidth / 2);
      body.scrollTop = Math.max(0, previousCenterY * targetScale - body.clientHeight / 2);
    });
  };

  const fitPdfLightboxImage = () => {
    calculatePdfLightboxFitScale();
    applyPdfLightboxScale(pdfLightboxState.fitScale || 1, { preserveCenter: false });
  };

  const closePdfImageLightbox = () => {
    pdfImageLightbox.hidden = true;
    document.body.classList.remove("is-pdf-lightbox-open");
  };

  const openPdfImageLightbox = (src, page) => {
    const image = pdfImageLightbox.querySelector("[data-pdf-lightbox-image]");
    const title = pdfImageLightbox.querySelector("[data-pdf-lightbox-title]");
    const dialog = pdfImageLightbox.querySelector(".pdf-image-lightbox__dialog");
    const body = pdfImageLightbox.querySelector(".pdf-image-lightbox__body");
    if (!image || !body) return;
    pdfLightboxState.naturalWidth = 0;
    pdfLightboxState.naturalHeight = 0;
    pdfLightboxState.fitScale = 1;
    pdfLightboxState.scale = 1;
    image.style.width = "";
    image.style.height = "";
    image.onload = () => {
      pdfLightboxState.naturalWidth = image.naturalWidth || image.width || 0;
      pdfLightboxState.naturalHeight = image.naturalHeight || image.height || 0;
      fitPdfLightboxImage();
    };
    image.src = src || "";
    if (title) title.textContent = page ? `国内法令原文 PDF ${page}ページ` : "国内法令原文ページ";
    pdfImageLightbox.hidden = false;
    document.body.classList.add("is-pdf-lightbox-open");
    body.scrollTop = 0;
    body.scrollLeft = 0;
    updatePdfLightboxScaleText();
    requestAnimationFrame(() => {
      pdfImageLightbox.style.zIndex = "5000";
      dialog?.focus({ preventScroll: true });
    });
  };

  pdfImageLightbox.querySelectorAll("[data-pdf-lightbox-close]").forEach(button => button.addEventListener("click", closePdfImageLightbox));
  pdfImageLightbox.querySelector("[data-pdf-lightbox-zoom-in]")?.addEventListener("click", () => applyPdfLightboxScale((pdfLightboxState.scale || 1) * 1.2));
  pdfImageLightbox.querySelector("[data-pdf-lightbox-zoom-out]")?.addEventListener("click", () => applyPdfLightboxScale((pdfLightboxState.scale || 1) / 1.2));
  pdfImageLightbox.querySelector("[data-pdf-lightbox-fit]")?.addEventListener("click", fitPdfLightboxImage);
  pdfImageLightbox.querySelector("[data-pdf-lightbox-reset]")?.addEventListener("click", () => applyPdfLightboxScale(1, { preserveCenter: false }));
  window.addEventListener("resize", () => {
    if (pdfImageLightbox.hidden) return;
    const beforeFitScale = pdfLightboxState.fitScale || 1;
    calculatePdfLightboxFitScale();
    if ((pdfLightboxState.scale || 1) <= beforeFitScale + 0.001) {
      applyPdfLightboxScale(pdfLightboxState.fitScale || 1, { preserveCenter: false });
    } else {
      updatePdfLightboxScaleText();
    }
  });

  const closeCodeModal = () => {
    if (!codeModal) return;
    codeModal.hidden = true;
    document.body.classList.remove("is-code-modal-open");
  };

  const renderPackingQuantityProfile = (code, packingGroup) => {
    const profile = window.DOMESTIC_PACKING_QUANTITY_PROFILES?.profiles?.[code];
    if (!profile) return "";
    const pg = ["I", "II", "III"].includes(String(packingGroup || "").trim()) ? String(packingGroup).trim() : "";
    const innerRows = (profile.innerRows || []).map(row => `<tr><th>${escapeHtml(row.container)}</th><td>${escapeHtml(row.limit)}</td></tr>`).join("");
    const outerRows = (profile.outerRows || []).map(row => `<tr><th>${escapeHtml(row.container)}</th><td>${escapeHtml(pg ? row[pg] : `${row.I} / ${row.II} / ${row.III}`)}</td></tr>`).join("");
    return `
      <section class="modal-reference-block modal-reference-block--quantity">
        <strong>${escapeHtml(profile.title)}</strong>
        <p class="packing-profile-current">対象危険物の容器等級：<b>${escapeHtml(pg || "指定なし")}</b></p>
        <div class="packing-profile-grid">
          <div><h4>内装容器</h4><table><tbody>${innerRows}</tbody></table></div>
          <div><h4>外装容器（${escapeHtml(pg ? `容器等級 ${pg}` : "I / II / III") }）</h4><table><tbody>${outerRows}</tbody></table></div>
        </div>
        <small>${escapeHtml(profile.note || "")}</small>
      </section>`;
  };

  const formatDomesticOriginalText = value => String(value || "")
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/g, "").replace(/^\s+/g, ""))
    .join("\n");

  const normalizeDomesticOriginalForSummary = value => {
    const lines = String(value || "")
      .normalize("NFKC")
      .replace(/（船舶による危険物の運送基準等を定める告示）/g, "")
      .replace(/-\s*\d+\s*-/g, "")
      .split(/\r?\n/)
      .map(line => line.replace(/\s+$/g, ""))
      .filter(line => line.trim());

    const blocks = [];
    let current = "";
    const startsNewBlock = line => {
      const trimmed = line.trim();
      return /^(?:[A-Z]{1,4}\d+[A-Z]?\s+|\(\d+\)|（\d+）|\d+[\.、\s]|注\s*\d+|備考\s*\d+|[一二三四五六七八九十]+\s+)/.test(trimmed);
    };
    const looksLikeTableRow = line => {
      const trimmed = line.trim();
      const withoutIndent = line.replace(/^\s+/, "");
      return /\S\s{3,}\S/.test(withoutIndent) && !/[。！？]$/.test(trimmed) && trimmed.length < 100;
    };

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (startsNewBlock(line) || looksLikeTableRow(line)) {
        if (current) blocks.push(current.trim());
        current = trimmed;
        return;
      }
      if (!current) {
        current = trimmed;
        return;
      }
      const needsSpace = /[A-Za-z0-9]$/.test(current) && /^[A-Za-z0-9]/.test(trimmed);
      current += `${needsSpace ? " " : ""}${trimmed}`;
    });
    if (current) blocks.push(current.trim());

    return blocks
      .map(block => block.replace(/\s{2,}/g, " ").trim())
      .filter(block => block.length >= 4);
  };

  const stripDuplicateCodePrefix = (block, code) => {
    const normalizedCode = String(code || "").normalize("NFKC").trim().toUpperCase();
    let value = String(block || "").normalize("NFKC").trim();
    if (!normalizedCode || !value) return value;
    const upperValue = value.toUpperCase();
    if (upperValue === normalizedCode) return "";
    if (upperValue.startsWith(`${normalizedCode} `) || upperValue.startsWith(`${normalizedCode}:`) || upperValue.startsWith(`${normalizedCode}：`)) {
      value = value.slice(normalizedCode.length).replace(/^[\s:：]+/, "").trim();
    }
    return value;
  };

  const summarizeDomesticOriginal = (value, code) => {
    const blocks = normalizeDomesticOriginalForSummary(value)
      .map(block => stripDuplicateCodePrefix(block, code))
      .filter(Boolean);
    if (!blocks.length) return null;

    const numberedBlocks = blocks.filter(block => /^(?:\(\d+\)|（\d+）|\d+[\.、\s])/.test(block));
    const noteBlocks = blocks.filter(block => /^(?:注\s*\d+|備考\s*\d+)/.test(block));
    const introductoryBlocks = blocks.filter(block =>
      !numberedBlocks.includes(block) &&
      !noteBlocks.includes(block) &&
      !/^部分\s+色彩/.test(block) &&
      !/^(?:地|線|記号)\s+/.test(block)
    );

    const priorityPatterns = [
      /してはならない|できない|禁止|限る|必要|なければならない|危険物に該当しない/,
      /適合|承認|確認|収納|積載|運送|表示|隔離|温度|容量|質量|試験|保護|落下/,
      /国連番号|容器等級|IBC|ポータブルタンク|小型容器|大型容器|リチウム/
    ];

    let selected;
    if (numberedBlocks.length && numberedBlocks.length <= 12) {
      selected = [...introductoryBlocks.slice(0, 1), ...numberedBlocks, ...noteBlocks.slice(0, 4)];
    } else {
      const ranked = blocks
        .map((block, index) => ({
          block,
          index,
          score: priorityPatterns.reduce((score, pattern, patternIndex) => score + (pattern.test(block) ? (4 - patternIndex) : 0), 0)
        }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
      selected = ranked.slice(0, 8).sort((a, b) => a.index - b.index).map(item => item.block);
    }

    const deduped = [];
    selected.forEach(block => {
      if (!block) return;
      if (deduped.some(existing => existing === block)) return;
      deduped.push(block);
    });

    return {
      title: `${code || "該当コード"}の国内法令原文テキストAI要約`,
      bullets: deduped,
      caution: "自動要約です。複数ページに続く条文は改ページ後の本文も結合して要約しています。表、図、注記および適用条件を含む正式な内容は、上の原文ページ画像と最新版の本文で確認してください。"
    };
  };

  const renderDomesticSummaryBullet = item => {
    const value = String(item || "").trim();
    const match = value.match(/^(\(\d+\)|（\d+）|\d+)(?:[\.、]?\s*)([\s\S]*)$/);
    if (!match || !match[2]) return `<li><span class="domestic-ai-summary__text">${escapeHtml(value)}</span></li>`;
    return `<li class="domestic-ai-summary__numbered"><span class="domestic-ai-summary__number">${escapeHtml(match[1])}</span><span class="domestic-ai-summary__text">${escapeHtml(match[2].trim())}</span></li>`;
  };

  const renderDomesticAiSummary = (originalText, code) => {
    const summary = summarizeDomesticOriginal(originalText, code);
    if (!summary) return "";
    return `
      <section class="domestic-ai-summary">
        <div class="domestic-ai-summary__heading">
          <span class="domestic-ai-summary__badge">AI</span>
          <strong>${escapeHtml(summary.title)}</strong>
        </div>
        <ul>${summary.bullets.map(renderDomesticSummaryBullet).join("")}</ul>
        <p>${escapeHtml(summary.caution)}</p>
      </section>`;
  };

  const renderDomesticPageVisual = (pages, pdfPath) => {
    const pageList = Array.isArray(pages) ? pages.filter(Boolean) : [pages].filter(Boolean);
    if (!pageList.length) return "";
    return pageList.map(page => {
      const imagePath = `../assets/pdf-page-images/dangerous-goods-notification/page-${encodeURIComponent(page)}.png`;
      const anchor = `#page=${page}`;
      return `
        <div class="pdf-preview-wrap pdf-preview-wrap--image">
          <div class="pdf-preview-toolbar">
            <span class="pdf-preview-title">原文ページの図表・イラスト表示（PDF ${escapeHtml(page)}ページ）</span>
            <div class="pdf-preview-actions">
              <button type="button" class="modal-reference-link pdf-image-expand-button" data-pdf-image-expand="${imagePath}" data-pdf-image-page="${escapeHtml(page)}">画像を拡大</button>
              <a class="modal-reference-link" href="${escapeHtml(pdfPath || "")}${anchor}" target="_blank" rel="noopener">PDF ${escapeHtml(page)}ページを開く</a>
            </div>
          </div>
          <button type="button" class="pdf-page-image-button" data-pdf-image-expand="${imagePath}" data-pdf-image-page="${escapeHtml(page)}" aria-label="PDF ${escapeHtml(page)}ページ画像を拡大表示">
            <img class="pdf-page-image" src="${imagePath}" alt="危告示 PDF ${escapeHtml(page)}ページの図表・表・本文" loading="lazy">
          </button>
        </div>`;
    }).join("");
  };

  const openCodeModal = code => {
    if (!codeModal || !codeModalBody || !codeModalTitle) return;
    const reference = window.IMDGCrossReferenceResolver?.resolve(code);
    if (!reference) return;
    const domesticPdfPath = "../references/originals/dangerous-goods-notification.pdf";
    const domesticAnchor = reference.domesticOriginalAnchor || "#page=1";
    codeModalTitle.textContent = `${reference.code} ${reference.labelJa || "コード詳細"}`;
    codeModalBody.innerHTML = `
      <section class="modal-reference-block modal-reference-block--primary">
        <strong>国内法令の主な参照</strong>
        <ul>${(reference.domesticReferences || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        <a class="modal-reference-link" href="${escapeHtml(domesticPdfPath)}${escapeHtml(domesticAnchor)}" target="_blank" rel="noopener">危告示のコード掲載ページを開く${reference.domesticOriginalPage ? `（PDF ${escapeHtml(reference.domesticOriginalPage)}ページ）` : ""}</a>
      </section>
      ${renderPackingQuantityProfile(reference.code, record.packingGroup)}
      <section class="modal-reference-block modal-reference-block--domestic-original">
        <a class="domestic-original-heading-link" href="${escapeHtml(domesticPdfPath)}${escapeHtml(domesticAnchor)}" target="_blank" rel="noopener">国内法令原文${reference.domesticOriginalPage ? `（PDF ${escapeHtml(reference.domesticOriginalPage)}${reference.domesticOriginalPageEnd && reference.domesticOriginalPageEnd !== reference.domesticOriginalPage ? `～${escapeHtml(reference.domesticOriginalPageEnd)}` : ""}ページ）` : ""} ↗</a>
        ${reference.domesticOriginal
          ? `${renderDomesticPageVisual(reference.domesticOriginalPages || [reference.domesticOriginalPage], domesticPdfPath)}${renderDomesticAiSummary(reference.domesticOriginal, reference.code)}`
          : `${renderDomesticPageVisual(reference.domesticOriginalPages || [reference.domesticOriginalPage], domesticPdfPath)}<p class="reference-pending">このコードの国内法令原文テキストはデータベースに未登録です。原文ページ画像または「危告示のコード掲載ページを開く」から確認してください。</p>`}
      </section>
      ${reference.hasDomesticImdgReference
        ? `<section class="modal-reference-block">
             <strong>IMDG Code参照先</strong>
             <ul>${(reference.domesticImdgReferences || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
           </section>`
        : ""}
      <p class="code-modal-caution">国内法令・IMDG Codeは参考情報です。実務判断では最新版の本文を確認してください。</p>
    `;
    codeModalBody.querySelectorAll("[data-pdf-image-expand]").forEach(button => {
      button.addEventListener("click", () => {
        openPdfImageLightbox(button.dataset.pdfImageExpand || "", button.dataset.pdfImagePage || "");
      });
    });
    codeModal.hidden = false;
    document.body.classList.add("is-code-modal-open");
  };

  root.querySelectorAll("[data-code-detail]").forEach(button => {
    button.addEventListener("click", event => {
      event.preventDefault();
      openCodeModal(button.dataset.codeDetail || button.textContent.trim());
    });
  });
  root.querySelectorAll("[data-code-modal-close]").forEach(button => button.addEventListener("click", closeCodeModal));
  document.addEventListener("keydown", event => {
    if (event.key !== "Escape") return;
    if (!pdfImageLightbox.hidden) {
      closePdfImageLightbox();
      return;
    }
    if (codeModal && !codeModal.hidden) closeCodeModal();
  });

  const favoriteButton = document.getElementById("favoriteButton");
  const refreshFavorite = () => {
    const favorite = window.ISSStorage?.isFavorite(record.unNumber);
    favoriteButton.textContent = favorite ? "★ お気に入り済み" : "☆ お気に入り";
  };
  favoriteButton?.addEventListener("click", () => {
    window.ISSStorage?.toggleFavorite(record.unNumber);
    refreshFavorite();
  });
  refreshFavorite();
})();
