
(() => {
  "use strict";
  // Part 505: P520（原典PDF 320～323ページ）を構造化し、PC表・狭幅カード表示へ改善。
  // Part 499: EmS見出しの日本語併記と、火薬類標札名の重複等級表示を整理。
  // Part 498: 隔離・積載方法画面の重複表示、AI解説、未登録案内を削除し、積載方法表記へ統一。
  // Part 490: コード詳細を原典文言の整理表示と原典PDF直リンクへ統一。
  // PDF本文画像・原文テキスト再表示・AI要約・中間PDF表示ページは使用しない。

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

  const formatLabelDisplayName = label => {
    const classValue = normalizeClassValue(label?.class);
    return /^1(?:\.[1-6])?$/.test(classValue) ? "火薬類" : String(label?.nameJa || "").trim();
  };

  const formatLabelCaption = (label, classValue) => {
    const normalizedClass = normalizeClassValue(classValue);
    const classText = String(classValue ?? "").trim() || "—";
    const separator = /^1(?:\.[1-6])?$/.test(normalizedClass) ? " ／" : "／";
    return `${formatLabelDisplayName(label)}${separator}等級 ${classText}`;
  };

  const parseSubsidiaryRiskCodes = value => {
    const normalized = String(value ?? "").normalize("NFKC").toUpperCase().trim();
    if (!normalized || normalized === "-" || normalized === "—" || normalized === "なし") return [];

    // SP番号、注記番号、頁番号を副次危険性等級として誤認しない。
    const withoutSpecialProvisions = normalized.replace(/SP\s*\d+[A-Z]?/g, " ");
    const allowed = new Set(["1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "3", "4.1", "4.2", "4.3", "5.1", "6.1", "8"]);
    const tokens = withoutSpecialProvisions
      .split(/[\s,，、・/／;；()（）]+/)
      .map(token => token.trim())
      .filter(token => allowed.has(token))
      .map(token => /^1(?:\.[1-6])?$/.test(token) ? "1" : token);
    return [...new Set(tokens)];
  };

  const formatSubsidiaryRisk = value => {
    const classCodes = parseSubsidiaryRiskCodes(value);
    return classCodes.length ? classCodes.join("/") : "なし";
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

  const normalizeCodeToken = value => String(value ?? "").normalize("NFKC").trim().toUpperCase();
  const isReferenceCodeToken = value => {
    const token = normalizeCodeToken(value);
    return /^(?:[A-E]|(?:P|PP|LP|L|IBC|B|T|TP|SP|SW|ES|SG|SGG|BK|H|VV|CV|V|S)[A-Z0-9.-]+)$/.test(token);
  };

  const splitCodeTokens = (...values) =>
    [...new Set(
      values
        .flatMap(value => Array.isArray(value) ? value : [value])
        .flatMap(value => String(value ?? "").normalize("NFKC").trim().split(/\s+/))
        .map(normalizeCodeToken)
        .filter(value => value && value !== "-" && value !== "—" && isReferenceCodeToken(value))
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


  const renderCodeLinks = codes => {
    const normalizedCodes = splitCodeTokens(codes);
    if (!normalizedCodes.length) return '<strong>—</strong>';
    return `<div class="code-chip-links">${normalizedCodes
      .map(code => `<button type="button" class="code-chip-link" data-code-detail="${escapeHtml(code)}">${escapeHtml(code)}</button>`)
      .join('<span class="code-chip-separator">/</span>')}</div>`;
  };

  const renderInlineCode = value => {
    const raw = String(value ?? "").normalize("NFKC").trim();
    if (!raw || raw === "-" || raw === "—") return "—";

    const parts = raw.split(/(\s+)/);
    let hasReferenceCode = false;
    const html = parts.map(part => {
      if (/^\s+$/.test(part)) return " ";
      const token = normalizeCodeToken(part);
      if (isReferenceCodeToken(token)) {
        hasReferenceCode = true;
        return `<button type="button" class="code-chip-link" data-code-detail="${escapeHtml(token)}">${escapeHtml(part)}</button>`;
      }
      return `<span class="code-chip-qualifier">${escapeHtml(part)}</span>`;
    }).join("");

    return hasReferenceCode ? `<div class="code-chip-links code-chip-links--inline">${html}</div>` : display(value);
  };

  const renderStowageSummary = stowageInfo => {
    const groups = [];
    if (stowageInfo.categoryCodes.length) groups.push(stowageInfo.categoryCodes.join(" / "));
    const provisionSet = [...stowageInfo.provisionCodes, ...stowageInfo.otherCodes];
    if (provisionSet.length) groups.push(provisionSet.join(" / "));
    return groups.length ? groups.join(" / ") : "—";
  };

  const renderStowageRequirementCell = stowageInfo => {
    const codes = [...stowageInfo.categoryCodes, ...stowageInfo.provisionCodes, ...stowageInfo.otherCodes];
    return codes.length ? `<div class="requirement-code-stack">${renderCodeLinks(codes)}</div>` : "—";
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
          <span>国内法令の条文番号と、原典文言を整理した情報を表示します。</span>
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
  const actualPsnCandidates = extractActualPsnCandidates(record.properShippingName);
  const actualPsnDefault = actualPsnCandidates[0] || String(record.properShippingName || "").trim();
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

  const crossReferences = (window.IMDGCrossReferenceResolver?.resolveMany(
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
  ) || []).filter(reference => reference.categoryId !== "stowageCategory");

  const codeReferenceEntries = [...crossReferences]
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

  function normalizeActualPsnCandidate(value) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;:／/+-]+|[\s,;:／/+-]+$/g, "")
      .trim();
  }

  function extractActualPsnCandidates(value) {
    const source = String(value || "").normalize("NFKC");
    const matches = source.match(/[A-Z0-9][A-Z0-9\s.,'’／/+\-]*/g) || [];
    const candidates = matches
      .map(normalizeActualPsnCandidate)
      .filter(candidate => candidate && /[A-Z]/.test(candidate))
      .filter(candidate => !/^(?:OR|AND)$/.test(candidate));
    const unique = [...new Set(candidates)];
    return unique.length ? unique : [normalizeActualPsnCandidate(source) || "正式輸送品名を確認してください"];
  }

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


  // part494: 判定基準の参照先は、全危険物共通の判定基準リゾルバーで決定する。
  const judgementCriteria = window.DomesticJudgementCriteriaResolver?.resolve(record) || { references: [], sections: [] };
  const classificationReferences = judgementCriteria.references || [];
  if (!classificationReferences.length || !judgementCriteria.sections?.length) {
    console.error(`判定基準の国内法令が未設定です: UN${record.unNumber} / ${record.classification}`);
  }

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

  const renderDomesticLawButton = (group, label) => `
    <button type="button" class="domestic-law-open-button" data-domestic-law-group="${escapeHtml(group)}">
      ${escapeHtml(label)}
    </button>`;

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
                       <small>${escapeHtml(formatLabelCaption(primaryLabel, record.class))}</small>`
                    : `<div class="label-empty">正標札画像未登録</div>`
                }
              </div>

              ${
                subsidiaryLabels.length
                  ? subsidiaryLabels.map((label, index) => `
                      <div class="label-card label-card--actual">
                        <img src="${escapeHtml(label.src)}" alt="${escapeHtml(label.nameJa)}">
                        <strong>${subsidiaryLabels.length > 1 ? `副標札 ${index + 1}` : "副標札"}</strong>
                        <small>${escapeHtml(formatLabelCaption(label, label.class))}</small>
                      </div>
                    `).join("")
                  : ""
              }

              ${
                marineLabel
                  ? `<div class="label-card label-card--actual">
                       <img src="${escapeHtml(marineLabel.src)}" alt="${escapeHtml(marineLabel.nameJa)}">
                       <strong>標札</strong>
                       <small>海洋汚染物質</small>
                     </div>`
                  : ""
              }
            </div>

            <div class="legal-reference-box">
              <strong>国内法令の主な参照</strong>
              <ul>
                ${labelLegalReferences.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
              ${renderDomesticLawButton("label", "該当する国内法令だけを全画面で続けて表示")}
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
              <p>原則として危告示別表第1のコードを表示し、危告示でIMDG Codeを参照する箇所は該当条文の参照情報を併記します。コードを選択すると、下段の国内法令条文へジャンプできます。</p>
            </div>
            ${renderCodeDetailSection(packingCodeEntries, "包装・容器コードの詳細")}
          </div>

          <div class="tab-panel" data-panel="ems">
            <div class="ems-pair">
              <div class="ems-block"><span>火災用スケジュール（Fire Schedules）</span><strong>${display(ems.fireCode)}</strong></div>
              <div class="ems-block"><span>漏洩用スケジュール（Spillage Schedules）</span><strong>${display(ems.spillageCode)}</strong></div>
            </div>
            <p class="notice-box">出典：${display(ems.source)}／IMDG Code Amendment ${display(ems.imdgAmendment)}</p>
          </div>

          <div class="tab-panel" data-panel="segregation">
            <table class="data-table">
              <tr><th>隔離</th><td>${renderCodeLinks(segregationCodes)}</td></tr>
              <tr><th>積載方法</th><td>${renderCodeLinks(stowageProvisionCodes)}</td></tr>
            </table>
            ${renderCodeDetailSection(segregationCodeEntries, "隔離・積載方法の詳細")}
          </div>

          <div class="tab-panel" data-panel="source">
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
                                   ${reference.englishExcerpt ? `<blockquote lang="en">${escapeHtml(reference.englishExcerpt)}</blockquote>` : ""}
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
                <span>危告示 第7条の3第2項</span>
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
                           <button type="button" class="marking-landscape-close" data-close-landscape hidden aria-label="横画面表示を閉じる">× 閉じる</button>
                         </div>
                         ${actualPsnCandidates.length > 1 ? `<label class="marking-psn-selector">
                           <span>表示する正式輸送品名</span>
                           <select data-actual-psn-select aria-label="実寸比較に表示する正式輸送品名">
                             ${actualPsnCandidates.map((candidate, index) => `<option value="${escapeHtml(candidate)}"${index === 0 ? " selected" : ""}>${escapeHtml(candidate)}</option>`).join("")}
                           </select>
                         </label>` : ""}
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
                               <div class="marking-actual-size__sample-line marking-actual-size__sample-line--un" data-actual-size="12" data-actual-un>UN${display(record.unNumber)}</div>
                               <div class="marking-actual-size__sample-line marking-actual-size__sample-line--psn" data-actual-size="12" data-actual-psn>${escapeHtml(actualPsnDefault)}</div>
                             </div>
                           </div>
                         </div>
                         <p class="marking-actual-size__note">ブラウザのページ拡大率は100%にしてください。補正値を変更する場合はホームの設定画面から調整してください。</p>
                       </div>
                     </div>
                   </details>`
                : ""
            }

            <div class="legal-reference-box legal-reference-box--package-marking">
              <strong>国内法令の主な参照</strong>
              <ul>
                ${packageMarkingLegalReferences.map(item => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
              ${renderDomesticLawButton("package-marking", "該当する国内法令を全画面で続けて表示")}
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
              <tr><th>国内法令</th><td>${classificationReferences.map(item => escapeHtml(item)).join("<br>")}${renderDomesticLawButton("classification", "判定基準の国内法令を全画面表示")}</td></tr>
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
      const openLandscapeButton = actualSizePanel.querySelector("[data-open-landscape]");
      const closeLandscapeButton = actualSizePanel.querySelector("[data-close-landscape]");

      const closeLandscapeView = async () => {
        actualSizePanel.classList.remove("is-landscape-view");
        document.body.classList.remove("is-marking-landscape-open");
        if (closeLandscapeButton) closeLandscapeButton.hidden = true;
        if (openLandscapeButton) openLandscapeButton.hidden = false;
        try { await screen.orientation?.unlock?.(); } catch {}
        try {
          if (document.fullscreenElement === actualSizePanel) await document.exitFullscreen?.();
        } catch {}
      };

      openLandscapeButton?.addEventListener("click", async () => {
        actualSizePanel.classList.add("is-landscape-view");
        document.body.classList.add("is-marking-landscape-open");
        if (closeLandscapeButton) closeLandscapeButton.hidden = false;
        if (openLandscapeButton) openLandscapeButton.hidden = true;

        // iPhone Safariなど画面方向の固定に非対応の環境では、CSSで横画面を再現します。
        try { await actualSizePanel.requestFullscreen?.(); } catch {}
        try { await screen.orientation?.lock?.("landscape"); } catch {}
        actualSizePanel.scrollTop = 0;
        actualSizePanel.scrollLeft = 0;
      });

      closeLandscapeButton?.addEventListener("click", closeLandscapeView);
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && actualSizePanel.classList.contains("is-landscape-view")) {
          closeLandscapeView();
        }
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape" && actualSizePanel.classList.contains("is-landscape-view")) closeLandscapeView();
      });

    actualSizePanel.querySelectorAll("[data-marking-size-option]").forEach(button => {
        button.classList.toggle("is-active", Number(button.dataset.markingSizeOption) === selectedSize);
      });
      localStorage.setItem(sizeKey, String(selectedSize));
      applyActualSizeScale();
    };
    actualSizePanel.querySelectorAll("[data-marking-size-option]").forEach(button => {
      button.addEventListener("click", () => updateMarkingSizeMode(Number(button.dataset.markingSizeOption)));
    });
    const actualPsnSelect = actualSizePanel.querySelector("[data-actual-psn-select]");
    actualPsnSelect?.addEventListener("change", () => {
      actualSizePanel.querySelectorAll("[data-actual-psn]").forEach(sample => {
        sample.textContent = actualPsnSelect.value;
      });
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
          <div class="packing-profile-panel packing-profile-panel--inner">
            <h4>内装容器</h4>
            <div class="packing-profile-table-wrap" tabindex="0">
              <table class="packing-profile-table packing-profile-table--inner">
                <colgroup><col class="packing-profile-col--container"><col class="packing-profile-col--limit"></colgroup>
                <tbody>${innerRows}</tbody>
              </table>
            </div>
          </div>
          <div class="packing-profile-panel packing-profile-panel--outer">
            <h4>外装容器（${escapeHtml(pg ? `容器等級 ${pg}` : "I / II / III") }）</h4>
            <div class="packing-profile-table-wrap" tabindex="0">
              <table class="packing-profile-table packing-profile-table--outer">
                <colgroup><col class="packing-profile-col--container"><col class="packing-profile-col--limit"></colgroup>
                <tbody>${outerRows}</tbody>
              </table>
            </div>
          </div>
        </div>
        ${profile.note ? `<small>${escapeHtml(profile.note)}</small>` : ""}
      </section>`;
  };


  const renderP520Value = value => {
    const text = String(value || "—");
    const className = text === "禁止" ? " p520-value--prohibited" : "";
    return `<span class="p520-value${className}">${escapeHtml(text)}</span>`;
  };

  const renderP520DesktopTable = section => {
    const expanded = section.mode === "expanded";
    const header = expanded
      ? `<thead>
          <tr><th rowspan="2">外装容器</th><th rowspan="2">OP1</th><th colspan="2">OP2</th><th rowspan="2">OP3</th><th colspan="2">OP4</th><th rowspan="2">OP5</th><th rowspan="2">OP6</th><th rowspan="2">OP7</th><th rowspan="2">OP8</th></tr>
          <tr><th>内装容器</th><th>外装容器</th><th>内装容器</th><th>外装容器</th></tr>
        </thead>`
      : `<thead><tr><th>容器</th><th>OP1</th><th>OP2</th><th>OP3</th><th>OP4</th><th>OP5</th><th>OP6</th><th>OP7</th><th>OP8</th></tr></thead>`;
    const rows = (section.rows || []).map(row => {
      const values = expanded
        ? [row.op1, row.op2Inner, row.op2Outer, row.op3, row.op4Inner, row.op4Outer, row.op5, row.op6, row.op7, row.op8]
        : [row.op1, row.op2, row.op3, row.op4, row.op5, row.op6, row.op7, row.op8];
      return `<tr><th scope="row">${escapeHtml(row.container)}</th>${values.map(value => `<td>${renderP520Value(value)}</td>`).join("")}</tr>`;
    }).join("");
    return `<div class="p520-table-view" role="region" aria-label="${escapeHtml(section.title)}の許容質量又は許容容量">
      <table class="p520-requirement-table${expanded ? " is-expanded" : " is-simple"}">${header}<tbody>${rows}</tbody></table>
    </div>`;
  };

  const renderP520MobileCards = section => {
    const expanded = section.mode === "expanded";
    const renderPair = (label, value) => `<div class="p520-card__item"><dt>${escapeHtml(label)}</dt><dd>${renderP520Value(value)}</dd></div>`;
    const renderDouble = (label, inner, outer) => `<div class="p520-card__item p520-card__item--double"><dt>${escapeHtml(label)}</dt><dd><span><small>内装容器</small>${renderP520Value(inner)}</span><span><small>外装容器</small>${renderP520Value(outer)}</span></dd></div>`;
    return `<div class="p520-card-view" aria-label="${escapeHtml(section.title)}のカード表示">
      ${(section.rows || []).map(row => `<article class="p520-row-card">
        <h5><span>容器</span>${escapeHtml(row.container)}</h5>
        <dl class="p520-card__grid">
          ${renderPair("OP1", row.op1)}
          ${expanded ? renderDouble("OP2", row.op2Inner, row.op2Outer) : renderPair("OP2", row.op2)}
          ${renderPair("OP3", row.op3)}
          ${expanded ? renderDouble("OP4", row.op4Inner, row.op4Outer) : renderPair("OP4", row.op4)}
          ${renderPair("OP5", row.op5)}
          ${renderPair("OP6", row.op6)}
          ${renderPair("OP7", row.op7)}
          ${renderPair("OP8", row.op8)}
        </dl>
      </article>`).join("")}
    </div>`;
  };

  const renderComplexPackingProfile = code => {
    const profile = window.DOMESTIC_COMPLEX_PACKING_PROFILES?.profiles?.[String(code || "").toUpperCase()];
    if (!profile) return "";
    const sourcePages = profile.sourcePages || [];
    const pageText = sourcePages.length > 1 ? `${sourcePages[0]}～${sourcePages[sourcePages.length - 1]}` : String(sourcePages[0] || "");
    return `<section class="p520-profile" aria-label="${escapeHtml(profile.title)}">
      <header class="p520-profile__header">
        <div><strong>${escapeHtml(profile.title)}</strong><p>${escapeHtml(profile.summary || "")}</p></div>
        <span>原典PDF ${escapeHtml(pageText)}ページ</span>
      </header>
      <div class="p520-profile__guide">
        <strong>表の見方</strong>
        <p>容器の種類を行から選び、収納方法OP1～OP8の欄で許容質量又は許容容量を確認してください。「禁止」は、その収納方法では使用できないことを示します。</p>
      </div>
      <div class="p520-profile__sections">
        ${(profile.sections || []).map((section, index) => `<details class="p520-section" ${index === 0 ? "open" : ""}>
          <summary><span>${escapeHtml(section.title)}</span><small>${escapeHtml(String((section.rows || []).length))}種類の容器</small></summary>
          <div class="p520-section__body">
            <p class="p520-section__description">${escapeHtml(section.description || "")}</p>
            ${renderP520DesktopTable(section)}
            ${renderP520MobileCards(section)}
          </div>
        </details>`).join("")}
      </div>
      ${(profile.notes || []).length ? `<section class="p520-notes"><h4>注記</h4><ol>${profile.notes.map(note => `<li>${escapeHtml(note)}</li>`).join("")}</ol></section>` : ""}
      ${(profile.additionalProvisions || []).length ? `<section class="p520-additional"><h4>追加規定</h4>${profile.additionalProvisions.map(item => `<article><h5>${escapeHtml(item.code)}</h5><p>${escapeHtml(item.text)}</p>${(item.requirements || []).length ? `<ol>${item.requirements.map(req => `<li>${escapeHtml(req)}</li>`).join("")}</ol>` : ""}</article>`).join("")}</section>` : ""}
    </section>`;
  };

  const renderIbcMaximumContentReference = (code, packingGroup) => {
    if (!/^IBC\d+/i.test(String(code || ""))) return "";
    const pg = ["I", "II", "III"].includes(String(packingGroup || "").trim()) ? String(packingGroup).trim() : "指定なし";
    const rows = [
      ["金属製IBC容器", "I", "固体", "3000L"],
      ["硬質プラスチック製IBC容器、プラスチック製内容器付複合IBC容器、フレキシブルIBC容器、ファイバ板製IBC容器、木製IBC容器", "I", "固体", "1500L"],
      ["液体用のプラスチック製内容器付複合IBC容器（外装容器の材質が鋼又はプラスチック材で、内容器がフレキシブルプラスチック製のものに限る。）以外のIBC容器", "II又はIII", "固体又は液体", "3000L"],
      ["液体用のプラスチック製内容器付複合IBC容器（外装容器の材質が鋼又はプラスチック材で、内容器がフレキシブルプラスチック製のものに限る。）", "II又はIII", "液体", "1250L"]
    ];
    return `<section class="modal-reference-block modal-reference-block--quantity modal-reference-block--ibc-capacity">
      <strong>IBC容器の最大内容積（参考）</strong>
      <p class="packing-profile-current">対象危険物の容器等級：<b>${escapeHtml(pg)}</b></p>
      <div class="domestic-source-table-scroll" tabindex="0">
        <table class="domestic-source-table" aria-label="IBC容器の最大内容積">
          <thead><tr><th>IBC容器の種類</th><th>収納する危険物の容器等級</th><th>収納する危険物の性状</th><th>最大内容積</th></tr></thead>
          <tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
      <small>危告示 別表第1 備考6(3)(iii)。IBC容器は、容器の種類、容器等級および性状に応じて最大内容積が定められています。</small>
    </section>`;
  };

  const portableTankRequirementRows = {
    T1:  ["0.15", "－", "N",  "A"],
    T2:  ["0.15", "－", "N",  "B"],
    T3:  ["0.265", "－", "N",  "A"],
    T4:  ["0.265", "－", "N",  "B"],
    T5:  ["0.265", "－", "NF", "C"],
    T6:  ["0.4", "－", "N",  "A"],
    T7:  ["0.4", "－", "N",  "B"],
    T8:  ["0.4", "－", "N",  "C"],
    T9:  ["0.4", "6mm", "N",  "C"],
    T10: ["0.4", "6mm", "NF", "C"],
    T11: ["0.6", "－", "N",  "B"],
    T12: ["0.6", "－", "NF", "B"],
    T13: ["0.6", "6mm", "N",  "C"],
    T14: ["0.6", "6mm", "NF", "C"],
    T15: ["1", "－", "N",  "B"],
    T16: ["1", "－", "NF", "B"],
    T17: ["1", "6mm", "N",  "B"],
    T18: ["1", "6mm", "NF", "B"],
    T19: ["1", "6mm", "NF", "C"],
    T20: ["1", "8mm", "NF", "C"],
    T21: ["1", "10mm", "N", "C"],
    T22: ["1", "10mm", "NF", "C"]
  };

  const portableTankAlternativeCodes = {
    T1: "T2、T3、T4、T5、T6、T7、T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T2: "T4、T5、T7、T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T3: "T4、T5、T6、T7、T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T4: "T5、T7、T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T5: "T10、T14、T19、T20、T22",
    T6: "T7、T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T7: "T8、T9、T10、T11、T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T8: "T9、T10、T13、T14、T19、T20、T21、T22",
    T9: "T10、T13、T14、T19、T20、T21、T22",
    T10: "T14、T19、T20、T22",
    T11: "T12、T13、T14、T15、T16、T17、T18、T19、T20、T21、T22",
    T12: "T14、T16、T18、T19、T20、T22",
    T13: "T14、T19、T20、T21、T22",
    T14: "T19、T20、T22",
    T15: "T16、T17、T18、T19、T20、T21、T22",
    T16: "T18、T19、T20、T22",
    T17: "T18、T19、T20、T21、T22",
    T18: "T19、T20、T22",
    T19: "T20、T22",
    T20: "T22",
    T21: "T22",
    T22: "なし"
  };

  const portableTankReliefDescriptions = {
    N: "ばね式圧力安全弁（容積1,900L未満の容器又は区画室では、ばね式圧力安全弁又は破裂板）",
    NF: "破裂板を直列に設けたばね式圧力安全弁"
  };

  const portableTankBottomDescriptions = {
    A: "底部開口を設けることができ、互いに独立な二重の閉鎖装置を備えるもの",
    B: "互いに独立な三重の閉鎖装置を備えた底部開口を設けるもの",
    C: "底部開口を設けないもの（通常の運送状態で固体の危険物には危告示の例外規定あり）"
  };

  const renderPortableTankRequirementReference = code => {
    const normalizedCode = String(code || "").toUpperCase();
    const row = portableTankRequirementRows[normalizedCode];
    if (!row) return "";
    const [testPressure, shellThickness, relief, bottom] = row;
    const shellNote = shellThickness === "－"
      ? "「－」の最小板厚は、直径1.8m以下では5mm、直径1.8m超では6mmです。ただし、容器等級II又はIIIの粉状又は粒状固体物質を収納する場合は5mmとすることができます。"
      : `タンク外板の最小板厚（基準鋼）は${shellThickness}です。`;
    return `<section class="modal-reference-block modal-reference-block--quantity modal-reference-block--portable-tank">
      <strong>${escapeHtml(normalizedCode)} ポータブルタンク要件</strong>
      <div class="portable-tank-requirement-grid">
        <table class="domestic-source-table portable-tank-requirement-table portable-tank-requirement-table--vertical" aria-label="${escapeHtml(normalizedCode)} ポータブルタンク要件">
          <tbody>
            <tr><th scope="row">タンクの記号</th><td>${escapeHtml(normalizedCode)}</td></tr>
            <tr><th scope="row">最小試験圧力（MPa）</th><td>${escapeHtml(testPressure)}</td></tr>
            <tr><th scope="row">タンク外板の最小板厚（基準鋼）</th><td>${escapeHtml(shellThickness)}</td></tr>
            <tr><th scope="row">圧力安全装置の種類</th><td>${escapeHtml(relief)}</td></tr>
            <tr><th scope="row">底部開口</th><td>${escapeHtml(bottom)}</td></tr>
            <tr><th scope="row">代替使用可能なTコード</th><td>${escapeHtml(portableTankAlternativeCodes[normalizedCode] || "なし")}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="portable-tank-requirement-notes">
        <p><strong>外板の最小板厚：</strong>${escapeHtml(shellNote)}</p>
        <p><strong>${escapeHtml(relief)}：</strong>${escapeHtml(portableTankReliefDescriptions[relief] || "危告示の定義を確認してください。")}</p>
        <p><strong>${escapeHtml(bottom)}：</strong>${escapeHtml(portableTankBottomDescriptions[bottom] || "危告示の定義を確認してください。")}</p>
      </div>
      <small>危告示 別表第1 備考6(4)(i)〜(iii)に基づく表示です。Tコードの基本要件と、より厳しい要件のポータブルタンクへの代替可否を横スクロールなしで確認できます。</small>
    </section>`;
  };

  const formatDomesticOriginalText = value => String(value || "")
    .split(/\r?\n/)
    .map(line => line.replace(/\s+$/g, "").replace(/^\s+/g, ""))
    .join("\n");

  const cleanDomesticOriginalForDisplay = value => String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/\f/g, "\n")
    .replace(/^\s+|\s+$/g, "");

  const codeHeadingPattern = /^(P|PP|LP|L|IBC|B|T|TP|SP|SW|SGG?|E|ES|BK|H|VV|CV|V|S)\d+[A-Z]?(?:\([a-z0-9]+\))?\b/i;
  const sourcePageNoisePattern = /^[-－ー\s]*\d+[-－ー\s]*$|^（船舶による危険物の運送基準等を定める告示）$/;

  const isTabularDomesticOriginal = value => {
    const source = cleanDomesticOriginalForDisplay(value);
    if (!source) return false;
    if (/内装容器の種類|中間容器の種類|外装容器の種類|許容容量|許容質量|国連番号\s+品\s*名|旅客船以外の船舶/.test(source)) return true;
    const lines = source.split("\n").filter(line => line.trim());
    const alignedLines = lines.filter(line => (line.match(/\s{2,}/g) || []).length >= 2 && line.trim().length >= 18).length;
    return alignedLines >= 3 && alignedLines / Math.max(lines.length, 1) >= 0.18;
  };

  const repairProseSoftWraps = value => {
    const lines = cleanDomesticOriginalForDisplay(value).split("\n");
    const output = [];
    lines.forEach(rawLine => {
      const line = rawLine.replace(/[ \t]+$/g, "");
      const trimmed = line.trim();
      if (!trimmed) {
        if (output.length && output[output.length - 1] !== "") output.push("");
        return;
      }
      if (sourcePageNoisePattern.test(trimmed)) return;
      const isIndentedContinuation = /^\s{3,}\S/.test(line);
      const startsStructuredItem = /^(?:\(?\d+\)?|（\d+）|注\s*\d*|備考\s*\d*|[A-Z]{1,4}\d+)/i.test(trimmed);
      const previous = output[output.length - 1] || "";
      const previousCanJoin = previous && !/[。！？：:；;）)】」』]$/.test(previous.trim());
      if (isIndentedContinuation && !startsStructuredItem && previousCanJoin) {
        const needsSpace = /[A-Za-z0-9]$/.test(previous) && /^[A-Za-z0-9]/.test(trimmed);
        output[output.length - 1] = `${previous}${needsSpace ? " " : ""}${trimmed}`;
      } else {
        output.push(trimmed);
      }
    });
    return output.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  };

  const prepareDomesticOriginalSource = originalText => {
    const source = cleanDomesticOriginalForDisplay(originalText);
    const tabular = isTabularDomesticOriginal(source);
    return {
      source: tabular ? source : repairProseSoftWraps(source),
      tabular
    };
  };

  const domesticDisplayWidth = value => [...String(value || "")].reduce((width, char) => {
    const codePoint = char.codePointAt(0) || 0;
    const isWide =
      codePoint >= 0x1100 && (
        codePoint <= 0x115f || codePoint === 0x2329 || codePoint === 0x232a ||
        (codePoint >= 0x2e80 && codePoint <= 0xa4cf) ||
        (codePoint >= 0xac00 && codePoint <= 0xd7a3) ||
        (codePoint >= 0xf900 && codePoint <= 0xfaff) ||
        (codePoint >= 0xfe10 && codePoint <= 0xfe19) ||
        (codePoint >= 0xfe30 && codePoint <= 0xfe6f) ||
        (codePoint >= 0xff00 && codePoint <= 0xff60) ||
        (codePoint >= 0xffe0 && codePoint <= 0xffe6)
      );
    return width + (isWide ? 2 : 1);
  }, 0);

  const domesticDisplayColumn = (line, search, fromIndex = 0) => {
    const index = String(line || "").indexOf(search, fromIndex);
    return index < 0 ? -1 : domesticDisplayWidth(String(line).slice(0, index));
  };

  const domesticSliceByDisplayColumn = (line, start, end = Number.POSITIVE_INFINITY) => {
    let width = 0;
    let output = "";
    for (const char of String(line || "")) {
      const charWidth = domesticDisplayWidth(char);
      const next = width + charWidth;
      if (next > start && width < end) output += char;
      width = next;
      if (width >= end) break;
    }
    return output.trim();
  };

  const mergeDomesticCellFragments = fragments => {
    const values = fragments.map(item => String(item || "").trim()).filter(Boolean);
    if (!values.length) return "—";
    let output = values[0];
    values.slice(1).forEach(next => {
      const previous = output.trimEnd();
      const joinWithoutSpace =
        /[一-龯々ぁ-んァ-ヶー]$/.test(previous) &&
        /^[一-龯々ぁ-んァ-ヶー。、）)]/.test(next) &&
        !/[。、；;：:]$/.test(previous);
      const joinWithSpace = /[A-Za-z0-9]$/.test(previous) && /^[A-Za-z0-9]/.test(next);
      output = `${previous}${joinWithoutSpace ? "" : joinWithSpace ? " " : "\n"}${next}`;
    });
    return output;
  };

  const imdgInlineCodePattern = /(?<![A-Z0-9])(?:IBC|LP|PP|TP|BK|VV|CV|SW|SP|SGG|SG|ES|P|L|B|T|H|V|S)\d+[A-Z]?(?:\([a-z0-9]+\))?(?![A-Z0-9])/gi;

  const renderInlineCodeLinks = (value, options = {}) => {
    const source = String(value || "");
    const entries = window.IMDG_CODE_PAGE_MAP?.entries || {};
    const suppressedPrefixes = (options.suppressPrefixes || []).map(prefix => String(prefix || "").toUpperCase());
    const disableLinks = options.disableLinks === true;
    let output = "";
    let lastIndex = 0;
    imdgInlineCodePattern.lastIndex = 0;
    let match;
    while ((match = imdgInlineCodePattern.exec(source))) {
      output += escapeHtml(source.slice(lastIndex, match.index));
      const visibleCode = match[0];
      const lookupCode = visibleCode.toUpperCase().replace(/\([^)]+\)$/, "");
      const suppressLink = disableLinks || suppressedPrefixes.some(prefix => lookupCode.startsWith(prefix));
      const entry = entries[lookupCode];
      if (!suppressLink && entry?.page) {
        const href = `../references/originals/imdg-code-amendment-42-24-msc556-108.pdf#page=${encodeURIComponent(entry.page)}&zoom=page-width`;
        output += `<a class="code-inline-reference-link" data-code-inline-reference="${escapeHtml(lookupCode)}" href="${escapeHtml(href)}" target="_blank" rel="noopener" title="IMDG Code ${escapeHtml(lookupCode)} 原文（PDF ${escapeHtml(entry.page)}ページ）">${escapeHtml(visibleCode)}</a>`;
      } else {
        output += escapeHtml(visibleCode);
      }
      lastIndex = match.index + visibleCode.length;
    }
    output += escapeHtml(source.slice(lastIndex));
    return output;
  };

  const renderDomesticCell = (value, options = {}) => renderInlineCodeLinks(String(value || "—"), options).replaceAll("\n", "<br>");

  const splitDomesticCodeSections = source => {
    const lines = cleanDomesticOriginalForDisplay(source).split("\n");
    const sections = [];
    let current = null;
    const flush = () => {
      if (!current) return;
      current.lines = current.lines.filter(line => !sourcePageNoisePattern.test(line.trim()));
      sections.push(current);
      current = null;
    };
    lines.forEach(line => {
      const trimmed = line.trim();
      const heading = trimmed.match(/^((?:P|LP|IBC|T)\d+[A-Z]?(?:\([a-z0-9]+\))?)$/i);
      if (heading) {
        flush();
        current = { title: heading[1], lines: [] };
        return;
      }
      if (!current) current = { title: "", lines: [] };
      current.lines.push(line);
    });
    flush();
    return sections;
  };

  const parsePackingTableSection = section => {
    const lines = section.lines || [];
    const headerIndex = lines.findIndex(line =>
      line.includes("内装容器の種類") &&
      line.includes("外装容器の種類") &&
      /許容容量|許容質量/.test(line)
    );
    if (headerIndex < 0) return null;
    const header = lines[headerIndex];
    const firstIndex = header.indexOf("内装容器の種類");
    const secondIndex = header.indexOf("中間容器の種類");
    const thirdIndex = header.indexOf("外装容器の種類");
    const fourthIndex = Math.max(header.lastIndexOf("外装容器の許容容量又は許容質量"), header.lastIndexOf("許容容量又は許容質量"));
    if ([firstIndex, secondIndex, thirdIndex, fourthIndex].some(index => index < 0)) return null;
    const noteIndex = lines.findIndex((line, index) => index > headerIndex && /^\s*注(?:\s|$)/.test(line));
    const bodyEnd = noteIndex >= 0 ? noteIndex : lines.length;
    const bodyLines = lines.slice(headerIndex + 1, bodyEnd).filter(line => line.trim() && !sourcePageNoisePattern.test(line.trim()));

    const locateSeparatedChunks = line => {
      const chunks = [];
      let cursor = 0;
      String(line || "").split(/(\s{2,})/).forEach(part => {
        if (!part) return;
        if (/^\s{2,}$/.test(part)) {
          cursor += part.length;
          return;
        }
        const leading = (part.match(/^\s+/) || [""])[0].length;
        const text = part.trim();
        if (text) chunks.push({ text, column: cursor + leading });
        cursor += part.length;
      });
      return chunks;
    };

    const headerStarts = [firstIndex, secondIndex, thirdIndex, fourthIndex];
    const boundaries = [
      (headerStarts[0] + headerStarts[1]) / 2,
      (headerStarts[1] + headerStarts[2]) / 2,
      (headerStarts[2] + headerStarts[3]) / 2
    ];
    const resolveColumn = column => column < boundaries[0] ? 0 : column < boundaries[1] ? 1 : column < boundaries[2] ? 2 : 3;
    const capacityPattern = /^(.*?)(?:\s+)(\d[\d,.]*(?:\.\d+)?\s*(?:kg|g|L|mL|MPa)|使用禁止|[xｘ])$/i;
    const physicalRows = bodyLines.map(line => {
      const cells = ["", "", "", ""];
      locateSeparatedChunks(line).forEach(chunk => {
        const index = resolveColumn(chunk.column);
        cells[index] = cells[index] ? `${cells[index]} ${chunk.text}` : chunk.text;
      });
      for (let index = 2; index >= 1 && !cells[3]; index -= 1) {
        const match = cells[index].match(capacityPattern);
        if (match && match[1].trim()) {
          cells[index] = match[1].trim();
          cells[3] = match[2].trim();
        }
      }
      return cells;
    }).filter(cells => cells.some(Boolean));

    const rows = [];
    let group = [[], [], [], []];
    let groupHasValue = false;
    const flush = () => {
      if (!groupHasValue) return;
      rows.push(group.map(mergeDomesticCellFragments));
      group = [[], [], [], []];
      groupHasValue = false;
    };
    physicalRows.forEach(cells => {
      const capacity = cells[3];
      if (capacity && groupHasValue && group[3].some(Boolean)) flush();
      cells.forEach((cell, index) => {
        if (cell) {
          group[index].push(cell);
          groupHasValue = true;
        }
      });
    });
    flush();

    const repairCrossRowWrap = columnIndex => {
      for (let index = 1; index < rows.length; index += 1) {
        const previous = String(rows[index - 1][columnIndex] || "");
        const current = String(rows[index][columnIndex] || "");
        if (!previous || previous === "—" || !current || current === "—") continue;
        if (/[。、，,；;：:）)]$/.test(previous.trim()) || !/[一-龯々ぁ-んァ-ヶー]$/.test(previous.trim()) || !/^[ぁ-んァ-ヶー]/.test(current.trim())) continue;
        const boundary = current.search(/[。、，,；;：:）)]/);
        const continuationEnd = boundary >= 0 ? boundary + 1 : current.length;
        const continuation = current.slice(0, continuationEnd).trim();
        const remainder = current.slice(continuationEnd).trim();
        rows[index - 1][columnIndex] = `${previous.trimEnd()}${continuation}`;
        rows[index][columnIndex] = remainder || "—";
      }
    };
    repairCrossRowWrap(0);
    repairCrossRowWrap(1);
    if (!rows.length) return null;

    const noteLines = noteIndex >= 0 ? lines.slice(noteIndex) : [];
    return {
      title: section.title,
      rows,
      notes: repairProseSoftWraps(noteLines.join("\n"))
    };
  };

  const renderStructuredPackingOriginal = (originalText, label, inlineLinkOptions = {}) => {
    const source = cleanDomesticOriginalForDisplay(originalText);
    const parsed = splitDomesticCodeSections(source)
      .map(parsePackingTableSection)
      .filter(Boolean);
    if (!parsed.length) return "";
    return `
      <section class="domestic-original-verbatim domestic-original-verbatim--structured">
        ${label ? `<div class="domestic-original-verbatim__heading">${escapeHtml(label)}</div>` : ""}
        <div class="domestic-structured-original">
          ${parsed.map(section => `
            <section class="domestic-source-section">
              ${section.title ? `<h4>${escapeHtml(section.title)}</h4>` : ""}
              <div class="domestic-source-table-scroll" tabindex="0">
                <table class="domestic-source-table">
                  <thead><tr><th>内装容器の種類</th><th>中間容器の種類</th><th>外装容器の種類</th><th>外装容器の許容容量又は許容質量</th></tr></thead>
                  <tbody>${section.rows.map(row => `<tr>${row.map(cell => `<td>${renderDomesticCell(cell, inlineLinkOptions)}</td>`).join("")}</tr>`).join("")}</tbody>
                </table>
              </div>
              ${section.notes ? `<div class="domestic-source-notes"><strong>注</strong><p>${renderInlineCodeLinks(section.notes.replace(/^\s*注\s*/, ""), inlineLinkOptions).replaceAll("\n", "<br>")}</p></div>` : ""}
            </section>`).join("")}
        </div>
      </section>`;
  };

  const renderVerbatimDomesticOriginal = (originalText, { label = "原文テキスト", compact = false } = {}) => {
    const structured = renderStructuredPackingOriginal(originalText, label);
    if (structured) return structured;
    const prepared = prepareDomesticOriginalSource(originalText);
    if (!prepared.source) return "";
    return `
      <section class="domestic-original-verbatim${compact ? " domestic-original-verbatim--compact" : ""}">
        <div class="domestic-original-verbatim__heading">${escapeHtml(label)}</div>
        <div class="domestic-original-verbatim__scroll" tabindex="0" aria-label="${escapeHtml(label)}">
          <pre class="domestic-original-verbatim__text ${prepared.tabular ? "is-tabular" : "is-prose"}">${escapeHtml(prepared.source)}</pre>
        </div>
      </section>`;
  };

  const buildExactPdfPageUrl = (pdfPath, page) => {
    const source = String(pdfPath || "").split("#")[0];
    return `${source}#page=${encodeURIComponent(page || 1)}&zoom=page-width`;
  };

  const renderDomesticPageVisual = (pages, pdfPath) => {
    const pageList = Array.isArray(pages) ? pages.filter(Boolean) : [pages].filter(Boolean);
    if (!pageList.length) return "";
    return pageList.map(page => {
      const imagePath = `../assets/pdf-page-images/dangerous-goods-notification/page-${encodeURIComponent(page)}.png`;
      const exactPageUrl = buildExactPdfPageUrl(pdfPath, page);
      return `
        <div class="pdf-preview-wrap pdf-preview-wrap--image">
          <div class="pdf-preview-toolbar">
            <span class="pdf-preview-title">原文ページの図表・イラスト表示（PDF ${escapeHtml(page)}ページ）</span>
            <div class="pdf-preview-actions">
              <button type="button" class="modal-reference-link pdf-image-expand-button" data-pdf-image-expand="${imagePath}" data-pdf-image-page="${escapeHtml(page)}">画像を拡大</button>
              <a class="modal-reference-link" href="${escapeHtml(exactPageUrl)}" target="_blank" rel="noopener">PDF ${escapeHtml(page)}ページを開く</a>
            </div>
          </div>
          <button type="button" class="pdf-page-image-button" data-pdf-image-expand="${imagePath}" data-pdf-image-page="${escapeHtml(page)}" aria-label="PDF ${escapeHtml(page)}ページ画像を拡大表示">
            <img class="pdf-page-image" src="${imagePath}" alt="危告示 PDF ${escapeHtml(page)}ページの図表・表・本文" loading="lazy">
          </button>
        </div>`;
    }).join("");
  };


  const domesticLawFullscreen = document.createElement("div");
  domesticLawFullscreen.className = "domestic-law-fullscreen";
  domesticLawFullscreen.hidden = true;
  domesticLawFullscreen.innerHTML = `
    <div class="domestic-law-fullscreen__backdrop" data-domestic-law-close></div>
    <section class="domestic-law-fullscreen__dialog" role="dialog" aria-modal="true" aria-labelledby="domesticLawFullscreenTitle" tabindex="-1">
      <header class="domestic-law-fullscreen__header">
        <div>
          <span>国内法令の該当箇所</span>
          <h2 id="domesticLawFullscreenTitle" data-domestic-law-title>国内法令原文</h2>
        </div>
        <button type="button" data-domestic-law-close aria-label="閉じる">×</button>
      </header>
      <div class="domestic-law-fullscreen__body" data-domestic-law-body></div>
    </section>`;
  document.body.appendChild(domesticLawFullscreen);

  const domesticArticlePagesByCategory = {
    packing: {
      regulation: [4, 67, 68, 69],
      notification: [20, 21, 22]
    },
    largePacking: {
      regulation: [4, 67, 68, 69],
      notification: [20, 21, 22, 23, 24]
    },
    ibc: {
      regulation: [4, 67, 68, 69],
      notification: [20, 21, 22, 23, 24]
    },
    portableTank: {
      regulation: [4, 67, 68, 69],
      notification: [20, 24, 25]
    },
    tankProvision: {
      regulation: [4, 67, 68, 69],
      notification: [20, 24, 25]
    },
    bulk: {
      regulation: [4, 67, 68, 69],
      notification: [20, 24, 25]
    },
    specialProvision: {
      regulation: [4],
      notification: [2]
    },
    stowage: {
      regulation: [18],
      notification: [2]
    },
    stowageCategory: {
      regulation: [18],
      notification: [2]
    },
    segregation: {
      regulation: [18],
      notification: [2]
    }
  };

  const uniquePageList = values => [...new Set((values || []).map(Number).filter(Number.isFinite))];

  const buildDomesticLawPageSection = ({ title, pdfPath, page, law, panelId = "", active = false }) => {
    const kind = law === "危規則" || String(pdfPath || "").includes("regulations")
      ? "regulation"
      : law === "放告示" || String(pdfPath || "").includes("radioactive")
        ? "radioactive"
        : "notification";
    const imagePath = `../assets/domestic-law-pages/${kind}/page-${page}.png`;
    return `
      <section class="domestic-law-fullscreen__page-section" data-domestic-law-panel="${escapeHtml(panelId)}" ${active ? '' : 'hidden'}>
        <div class="domestic-law-fullscreen__page-heading">
          <strong>${escapeHtml(title)}</strong>
          <a href="${escapeHtml(buildExactPdfPageUrl(pdfPath, page))}" target="_blank" rel="noopener">原文PDFを開く</a>
        </div>
        <div class="domestic-law-fullscreen__image-wrap">
          <button type="button" class="domestic-law-fullscreen__image-button" data-pdf-image-expand="${escapeHtml(imagePath)}" data-pdf-image-page="${escapeHtml(title)}" aria-label="${escapeHtml(title)}の表・図・本文を全画面拡大">
            <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(title)}" loading="lazy">
          </button>
          <p class="domestic-law-fullscreen__image-hint">表・図・細かい注記は、画像をタップすると全画面で拡大できます。</p>
        </div>
      </section>`;
  };

  const renderDomesticLawPageDeck = sections => {
    if (!sections.length) {
      return '<p class="reference-pending">該当する原文ページを特定できませんでした。</p>';
    }
    const normalized = sections.map((section, index) => ({
      ...section,
      panelId: `domestic-law-panel-${index + 1}`,
      navLabel: section.navLabel || `${section.law || '資料'} ${section.page}p`
    }));
    return `
      <div class="domestic-law-fullscreen__nav" role="tablist" aria-label="国内法令ページ選択">
        ${normalized.map((section, index) => `
          <button
            type="button"
            class="domestic-law-fullscreen__nav-button ${index === 0 ? 'is-active' : ''}"
            data-domestic-law-nav="${escapeHtml(section.panelId)}"
            role="tab"
            aria-selected="${index === 0 ? 'true' : 'false'}"
          >${escapeHtml(section.navLabel)}</button>`).join('')}
      </div>
      <div class="domestic-law-fullscreen__panels">
        ${normalized.map((section, index) => buildDomesticLawPageSection({ ...section, panelId: section.panelId, active: index === 0 })).join('')}
      </div>`;
  };


  const domesticLawPageRules = [
    { law: "危規則", pattern: /第8条第3項第1号・第113条第3項/, pages: [["第8条第3項第1号",4],["第113条第3項",67]] },
    { law: "危規則", pattern: /第8条第1項・第9条|第8条・第9条/, pages: [
      ["第8条第1項",4,"../references/excerpts/domestic/regulation-article-8.pdf"],
      ["第9条",5,"../references/excerpts/domestic/regulation-article-9.pdf"]
    ] },
    { law: "危規則", pattern: /第8条・第20条/, pages: [["第8条",4],["第20条",18]] },
    { law: "危規則", pattern: /第16条の2・第20条/, pages: [["第16条の2",15],["第20条",18]] },
    { law: "危規則", pattern: /第16条・第21条/, pages: [["第16条",15],["第21条",19]] },
    { law: "危規則", pattern: /第2条第1号[イロ]/, pages: [["第2条",2,"../references/excerpts/domestic/regulation-article-2.pdf"]] },
    { law: "危規則", pattern: /第2条第1号[ハニ]/, pages: [["第2条",2,"../references/excerpts/domestic/regulation-article-2.pdf"]] },
    { law: "危規則", pattern: /第2条第1号[ホヘチリト]/, pages: [["第2条",3,"../references/excerpts/domestic/regulation-article-2.pdf"]] },
    { law: "危規則", pattern: /第8条第2項/, pages: [["第8条第2項",4]] },
    { law: "危規則", pattern: /第8条第1項|第8条/, pages: [["第8条",4,"../references/excerpts/domestic/regulation-article-8.pdf"]] },
    { law: "危規則", pattern: /第9条/, pages: [["第9条",5,"../references/excerpts/domestic/regulation-article-9.pdf"]] },
    { law: "危規則", pattern: /第15条/, pages: [["第15条",14]] },
    { law: "危規則", pattern: /第16条の2/, pages: [["第16条の2",15]] },
    { law: "危規則", pattern: /第16条/, pages: [["第16条",15]] },
    { law: "危規則", pattern: /第17条/, pages: [["第17条",16]] },
    { law: "危規則", pattern: /第20条/, pages: [["第20条",18]] },
    { law: "危規則", pattern: /第21条/, pages: [["第21条",19]] },
    { law: "危規則", pattern: /第113条/, pages: [["第113条",67]] },

    { law: "危告示", pattern: /第25条の4・第25条の4の2・第25条の5/, pages: [["第25条の4",21],["第25条の4の2",22],["第25条の5",23]] },
    { law: "危告示", pattern: /第25条の3・第25条の4の2/, pages: [["第25条の3",20],["第25条の4の2",22]] },
    { law: "危告示", pattern: /第25条の3・第25条の5/, pages: [["第25条の3",20],["第25条の5",23]] },
    { law: "危告示", pattern: /第25条の3・第25条の6の3/, pages: [["第25条の3",20],["第25条の6の3",25]] },
    { law: "危告示", pattern: /第25条の3・第25条の6/, pages: [["第25条の3",20],["第25条の6",24]] },
    { law: "危告示", pattern: /第25条の3・第25条の4/, pages: [["第25条の3",20],["第25条の4",21]] },
    { law: "危告示", pattern: /備考2\(1\)/, pages: [["別表第1 備考2(1) 火薬類の判定基準",268],["別表第1 備考2(1) 続き",269]] },
    { law: "危告示", pattern: /備考2\(2\)/, pages: [["別表第1 備考2(2) 高圧ガスの判定基準",269]] },
    { law: "危告示", pattern: /備考2\(3\)/, pages: [["別表第1 備考2(3) 引火性液体類の判定基準",269],["別表第1 備考2(3) 続き",270]] },
    { law: "危告示", pattern: /備考2\(4\)\(ⅰ\)〜\(ⅲ\)/, pages: [["別表第1 備考2(4)(ⅰ)〜(ⅲ)",270],["別表第1 備考2(4)(ⅰ)〜(ⅲ) 続き",271]] },
    { law: "危告示", pattern: /備考2\(4\)\(ⅳ\)/, pages: [["別表第1 備考2(4)(ⅳ) 自然発火性物質",271],["別表第1 備考2(4)(ⅳ) 続き",272]] },
    { law: "危告示", pattern: /備考2\(4\)\(ⅴ\)/, pages: [["別表第1 備考2(4)(ⅴ) 水反応可燃性物質",272]] },
    { law: "危告示", pattern: /備考2\(5\)\(ⅰ\)/, pages: [["別表第1 備考2(5)(ⅰ) 酸化性物質",272],["別表第1 備考2(5)(ⅰ) 続き",273]] },
    { law: "危告示", pattern: /備考2\(5\)\(ⅱ\)/, pages: [["別表第1 備考2(5)(ⅱ) 有機過酸化物",273]] },
    { law: "危告示", pattern: /備考2\(6\)/, pages: [["別表第1 備考2(6) 毒物",274]] },
    { law: "危告示", pattern: /備考2\(7\)/, pages: [["別表第1 備考2(7) 腐食性物質",275]] },
    { law: "危告示", pattern: /備考2\(8\)/, pages: [["別表第1 備考2(8) 環境有害物質",275],["別表第1 備考2(8) 続き",276]] },
    { law: "危告示", pattern: /第2条第5項・第6項/, pages: [["第2条第5項・第6項",1]] },
    { law: "危告示", pattern: /第2条第7項・第8項/, pages: [["第2条第7項・第8項",1]] },
    { law: "危告示", pattern: /第7条の3第1項・第2項/, pages: [["第7条の3第1項・第2項",6]] },
    { law: "危告示", pattern: /第7条の2・第15条/, pages: [["第7条の2",7],["第15条",16]] },
    { law: "危告示", pattern: /第7条の3・第15条/, pages: [["第7条の3",8],["第15条",16]] },
    { law: "危告示", pattern: /第2条第\d+項/, pages: [["第2条（危険物の定義）",1,"../references/excerpts/domestic/notification-article-2.pdf"]] },
    { law: "危告示", pattern: /第3条第3項/, pages: [["第3条第3項",3]] },
    { law: "危告示", pattern: /第7条の2/, pages: [["第7条の2",7,"../references/excerpts/domestic/notification-article-7-2.pdf"]] },
    { law: "危告示", pattern: /第7条の3/, pages: [["第7条の3",6]] },
    { law: "危告示", pattern: /第7条の4第2項/, pages: [["第7条の4第2項",9]] },
    { law: "危告示", pattern: /第14条の2の2/, pages: [["第14条の2の2",10]] },
    { law: "危告示", pattern: /第14条/, pages: [["第14条",14]] },
    { law: "危告示", pattern: /第15条/, pages: [["第15条",16]] },
    { law: "危告示", pattern: /第16条/, pages: [["第16条",17]] },
    { law: "危告示", pattern: /第25条の3/, pages: [["第25条の3",20]] },
    { law: "危告示", pattern: /第25条の4の2/, pages: [["第25条の4の2",22]] },
    { law: "危告示", pattern: /第25条の4/, pages: [["第25条の4",21]] },
    { law: "危告示", pattern: /第25条の5/, pages: [["第25条の5",23]] },
    { law: "危告示", pattern: /第25条の6の3/, pages: [["第25条の6の3",25]] },
    { law: "危告示", pattern: /第25条の6/, pages: [["第25条の6",24]] },
    { law: "放告示", pattern: /第1条の2/, pages: [["第1条の2",1]] }
  ];

  const resolveDomesticLawTargets = references => {
    const targets = [];
    const seen = new Set();
    (references || []).forEach(reference => {
      const value = String(reference || "").replace(/\u3000/g," ").trim();
      const law = value.startsWith("危規則") ? "危規則" : value.startsWith("危告示") ? "危告示" : value.startsWith("放告示") ? "放告示" : "";
      if (!law) return;
      const rule = domesticLawPageRules.find(item => item.law === law && item.pattern.test(value));
      if (!rule) return;
      rule.pages.forEach(([label,page,excerptPdfPath]) => {
        const key = `${law}:${page}`;
        if (seen.has(key)) return;
        seen.add(key);
        targets.push({law,label,page,excerptPdfPath: excerptPdfPath || ""});
      });
    });
    return targets;
  };

  const openDomesticLawByReferences = ({ title, references, includeSourcePage = true }) => {
    const regulationPdf = "../references/originals/dangerous-goods-regulations.pdf";
    const notificationPdf = "../references/originals/dangerous-goods-notification.pdf";
    const radioactivePdf = "../references/originals/radioactive-materials-notification.pdf";
    const sections = resolveDomesticLawTargets(references).map(target => ({
      title: `${target.law} ${target.label}（該当箇所のみ）`,
      navLabel: `${target.law} ${target.label}`,
      pdfPath: target.law === "危規則" ? regulationPdf : target.law === "放告示" ? radioactivePdf : notificationPdf,
      page: target.page,
      law: target.law
    }));
    // 全画面表示では条文の該当箇所だけを表示し、別表第1のページ全体は追加しない。
    const titleNode = domesticLawFullscreen.querySelector("[data-domestic-law-title]");
    const body = domesticLawFullscreen.querySelector("[data-domestic-law-body]");
    if (titleNode) titleNode.textContent = title;
    if (body) body.innerHTML = renderDomesticLawPageDeck(sections);
    domesticLawFullscreen.hidden = false;
    document.body.classList.add("is-domestic-law-fullscreen-open");
    requestAnimationFrame(() => domesticLawFullscreen.querySelector(".domestic-law-fullscreen__dialog")?.focus({preventScroll:true}));
  };

  const buildJudgementCriteriaSourceLinks = criteria => {
    const seen = new Set();
    const links = (Array.isArray(criteria?.sections) ? criteria.sections : []).reduce((items, section) => {
      const pdfPath = String(section?.pdfPath || "");
      const page = Number(section?.page);
      if (!pdfPath || !Number.isFinite(page)) return items;
      const key = `${pdfPath}:${page}`;
      if (seen.has(key)) return items;
      seen.add(key);
      items.push({
        law: section?.law || "危告示",
        label: `${section?.navLabel || section?.title || "判定基準"} 原文を開く（PDF ${page}ページ）`,
        href: buildExactPdfPageUrl(pdfPath, page)
      });
      return items;
    }, []);
    if (!links.length) return "";
    return `<div class="code-direct-source-links code-direct-source-links--domestic judgement-criteria-source-links" data-source-group="domestic" aria-label="判定基準の国内法令原文リンク">
      ${links.map((link, index) => `<a class="modal-reference-link code-direct-source-link${index === 0 ? " modal-reference-link--primary" : ""}" data-source-law="${escapeHtml(link.law)}" href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}
    </div>`;
  };

  const normalizeJudgementCriteriaLines = value => String(value || "")
    .replace(/\f/g, "\n")
    .split("\n")
    .map(line => line.replace(/\u3000/g, " ").replace(/[ \t]+$/g, ""))
    .filter(line => line.trim())
    .map(line => line.trim());

  const judgementCriteriaResultPattern = /(?:\s{2,}|\t+)(急性\s*1|慢性\s*[12]|1\.[1-6]|[ⅠⅡⅢⅣⅤⅥ]|[A-Z])\s*$/;
  const judgementCriteriaRomanPattern = /^\(([ⅰ-ⅹ]+)\)\s*/;
  const judgementCriteriaNumericPattern = /^\((\d+)\)\s*/;
  const judgementCriteriaKanaPattern = /^([イロハニホヘトチリヌ])\s+/;
  const judgementCriteriaNotePattern = /^注(?:\s*([0-9１２３４５６７８９]+))?\s*/;

  const joinJudgementCriteriaLines = lines => (lines || []).reduce((joined, line) => {
    const value = String(line || "").trim();
    if (!value) return joined;
    if (!joined) return value;
    const separator = /[A-Za-z0-9)]$/.test(joined) && /^[A-Za-z0-9(]/.test(value) ? " " : "";
    return `${joined}${separator}${value}`;
  }, "");

  const splitJudgementCriteriaColumns = line => String(line || "")
    .trim()
    .split(/\s{2,}/)
    .map(item => item.trim())
    .filter(Boolean);

  const parseJudgementCriteriaResultTable = (lines, startIndex) => {
    const headerParts = splitJudgementCriteriaColumns(lines[startIndex]);
    const resultHeader = headerParts.pop() || "判定結果";
    const conditionHeader = headerParts.join(" ") || "判定条件";
    const rows = [];
    let current = null;
    let index = startIndex + 1;
    for (; index < lines.length; index += 1) {
      const line = lines[index];
      if (judgementCriteriaNotePattern.test(line) || judgementCriteriaRomanPattern.test(line) || /判定基準/.test(line)) break;
      if (/流下時間/.test(line) && /引火点/.test(line)) break;
      const match = line.match(judgementCriteriaResultPattern);
      if (match) {
        if (current) rows.push(current);
        current = {
          condition: line.slice(0, match.index).trim(),
          result: match[1].replace(/\s+/g, " ")
        };
        continue;
      }
      if (current) current.condition = joinJudgementCriteriaLines([current.condition, line]);
      else break;
    }
    if (current) rows.push(current);
    return rows.length ? {
      block: {
        type: "table",
        title: conditionHeader,
        headers: [conditionHeader, resultHeader],
        rows: rows.map(row => [row.condition, row.result])
      },
      nextIndex: index
    } : null;
  };

  const parseJudgementCriteriaFlowTable = (lines, startIndex) => {
    const headers = ["流下時間", "フローカップのオリフィス径", "動粘度", "引火点"];
    const rows = [];
    let index = startIndex + 1;
    for (; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^\d+\s+\d+$/.test(line.replace(/\s{2,}/g, " "))) continue;
      const parts = splitJudgementCriteriaColumns(line);
      if (parts.length === 3) {
        const viscosityMatch = parts[2].match(/^(.*?動粘度)\s+(-?\d+℃を超える温度|温度制限なし)$/);
        if (viscosityMatch) {
          rows.push([parts[0], parts[1], viscosityMatch[1], viscosityMatch[2]]);
          continue;
        }
      }
      if (parts.length < 4) break;
      rows.push([parts[0], parts[1], parts.slice(2, -1).join(" "), parts.at(-1)]);
    }
    return rows.length ? {
      block: { type: "table", title: "粘性液体に関する判定条件", headers, rows, wide: true },
      nextIndex: index
    } : null;
  };

  const parseJudgementCriteriaBlocks = value => {
    const lines = normalizeJudgementCriteriaLines(value);
    const blocks = [];
    let index = 0;
    const collectContinuation = (firstLine, start, stopTest) => {
      const collected = [firstLine];
      let cursor = start;
      while (cursor < lines.length && !stopTest(lines[cursor], cursor)) {
        collected.push(lines[cursor]);
        cursor += 1;
      }
      return { text: joinJudgementCriteriaLines(collected), nextIndex: cursor };
    };
    const isBoundary = line => judgementCriteriaRomanPattern.test(line)
      || judgementCriteriaNumericPattern.test(line)
      || judgementCriteriaKanaPattern.test(line)
      || judgementCriteriaNotePattern.test(line)
      || /判定基準/.test(line)
      || (/流下時間/.test(line) && /引火点/.test(line));

    while (index < lines.length) {
      const line = lines[index];
      if (/判定基準/.test(line) && /(容器等級|等級|隔離区分|タイプ)\s*$/.test(line)) {
        const parsedTable = parseJudgementCriteriaResultTable(lines, index);
        if (parsedTable) {
          blocks.push(parsedTable.block);
          index = parsedTable.nextIndex;
          continue;
        }
      }
      if (/流下時間/.test(line) && /引火点/.test(line)) {
        const parsedFlowTable = parseJudgementCriteriaFlowTable(lines, index);
        if (parsedFlowTable) {
          blocks.push(parsedFlowTable.block);
          index = parsedFlowTable.nextIndex;
          continue;
        }
      }
      if (index === 0 && judgementCriteriaNumericPattern.test(line)) {
        blocks.push({ type: "title", text: line });
        index += 1;
        continue;
      }
      const romanMatch = line.match(judgementCriteriaRomanPattern);
      if (romanMatch) {
        const content = line.replace(judgementCriteriaRomanPattern, "");
        const collected = collectContinuation(content, index + 1, candidate => isBoundary(candidate));
        blocks.push({ type: "lead", marker: `(${romanMatch[1]})`, text: collected.text });
        index = collected.nextIndex;
        continue;
      }
      const noteMatch = line.match(judgementCriteriaNotePattern);
      if (noteMatch) {
        const content = line.replace(judgementCriteriaNotePattern, "");
        const collected = collectContinuation(content, index + 1, candidate => judgementCriteriaRomanPattern.test(candidate) || /判定基準/.test(candidate));
        blocks.push({ type: "note", marker: noteMatch[1] ? `注 ${noteMatch[1]}` : "注記", text: collected.text });
        index = collected.nextIndex;
        continue;
      }
      const kanaMatch = line.match(judgementCriteriaKanaPattern);
      if (kanaMatch) {
        if (/判定基準\s*$/.test(line)) {
          blocks.push({ type: "subheading", text: line });
          index += 1;
          continue;
        }
        const content = line.replace(judgementCriteriaKanaPattern, "");
        const collected = collectContinuation(content, index + 1, candidate => isBoundary(candidate));
        blocks.push({ type: "requirement", marker: kanaMatch[1], text: collected.text });
        index = collected.nextIndex;
        continue;
      }
      const numericMatch = line.match(judgementCriteriaNumericPattern);
      if (numericMatch) {
        const content = line.replace(judgementCriteriaNumericPattern, "");
        const collected = collectContinuation(content, index + 1, candidate => isBoundary(candidate));
        blocks.push({ type: "requirement", marker: `(${numericMatch[1]})`, text: collected.text });
        index = collected.nextIndex;
        continue;
      }
      const collected = collectContinuation(line, index + 1, candidate => isBoundary(candidate));
      blocks.push({ type: "paragraph", text: collected.text });
      index = collected.nextIndex;
    }
    return blocks;
  };

  const renderJudgementCriteriaTable = block => {
    const wideClass = block.wide || block.headers.length > 2 ? " judgement-criteria-table--wide" : "";
    return `<section class="judgement-criteria-section judgement-criteria-section--table">
      <h5>${escapeHtml(block.title || "判定表")}</h5>
      <div class="judgement-criteria-table-wrap">
        <table class="judgement-criteria-table${wideClass}">
          <thead><tr>${block.headers.map(header => `<th scope="col">${escapeHtml(header)}</th>`).join("")}</tr></thead>
          <tbody>${block.rows.map(row => `<tr>${row.map((cell, cellIndex) => `<td data-label="${escapeHtml(block.headers[cellIndex] || `項目${cellIndex + 1}`)}">${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
        </table>
      </div>
    </section>`;
  };

  const renderJudgementCriteriaBlocks = value => {
    const blocks = parseJudgementCriteriaBlocks(value);
    const requirementBlocks = [];
    const html = [];
    const flushRequirements = () => {
      if (!requirementBlocks.length) return;
      html.push(`<section class="judgement-criteria-section judgement-criteria-section--requirements">
        <h5>要件・条件</h5>
        <div class="judgement-criteria-requirements">${requirementBlocks.splice(0).map(item => `<div class="judgement-criteria-requirement"><span>${escapeHtml(item.marker)}</span><p>${escapeHtml(item.text)}</p></div>`).join("")}</div>
      </section>`);
    };
    blocks.forEach(block => {
      if (block.type === "requirement") {
        requirementBlocks.push(block);
        return;
      }
      flushRequirements();
      if (block.type === "table") html.push(renderJudgementCriteriaTable(block));
      else if (block.type === "title") html.push(`<div class="judgement-criteria-section-title">${escapeHtml(block.text)}</div>`);
      else if (block.type === "subheading") html.push(`<div class="judgement-criteria-subheading">${escapeHtml(block.text)}</div>`);
      else if (block.type === "lead") html.push(`<section class="judgement-criteria-section judgement-criteria-section--lead"><h5>${escapeHtml(block.marker)} 判定の原則</h5><p>${escapeHtml(block.text)}</p></section>`);
      else if (block.type === "note") html.push(`<aside class="judgement-criteria-note"><strong>${escapeHtml(block.marker)}</strong><p>${escapeHtml(block.text)}</p></aside>`);
      else if (block.type === "paragraph") html.push(`<div class="judgement-criteria-paragraph">${escapeHtml(block.text)}</div>`);
    });
    flushRequirements();
    return html.join("");
  };

  const renderJudgementCriteriaDetails = criteria => {
    const references = Array.isArray(criteria?.references) ? criteria.references.filter(Boolean) : [];
    const exactEntry = window.DOMESTIC_JUDGEMENT_CRITERIA_TEXTS?.entries?.[criteria?.criteriaKey];
    const fallbackItems = [
      `国連番号${record.unNumber}`,
      `分類・項目：${record.classification || record.item || "—"}`,
      `等級：${record.class || "—"}`,
      `容器等級：${record.packingGroup || "—"}`,
      ...references
    ].filter(Boolean);
    const exactContent = exactEntry?.text
      ? renderJudgementCriteriaBlocks(exactEntry.text)
      : `<div class="judgement-criteria-fallback">${fallbackItems.map(item => `<p>${escapeHtml(item)}</p>`).join("")}</div>`;
    return `<section class="modal-reference-block modal-reference-block--judgement-criteria">
      <div class="judgement-criteria-context" aria-label="対象危険物と判定基準">
        <div class="judgement-criteria-context__heading"><strong>この危険物に適用される判定基準</strong><span>判定条件と結果の対応が分かるように整理して表示しています。</span></div>
        <dl>
          <div><dt>国連番号</dt><dd>${escapeHtml(record.unNumber)}</dd></div>
          <div><dt>分類・項目</dt><dd>${escapeHtml(record.classification || record.item || "—")}</dd></div>
          <div><dt>等級</dt><dd>${escapeHtml(record.class || "—")}</dd></div>
          <div><dt>容器等級</dt><dd>${escapeHtml(record.packingGroup || "—")}</dd></div>
        </dl>
      </div>
      ${references.length ? `<div class="code-organized-summary judgement-criteria-reference-summary"><strong>参照する国内法令</strong><ul>${references.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      <div class="code-exact-provisions judgement-criteria-provisions">
        <section class="code-exact-provisions__group code-exact-provisions__group--condition judgement-criteria-document">
          <h4>${escapeHtml(exactEntry?.title || "判定基準・該当内容")}</h4>
          <div class="judgement-criteria-readable">${exactContent}</div>
        </section>
      </div>
      ${buildJudgementCriteriaSourceLinks(criteria)}
    </section>`;
  };

  const buildJudgementCriteriaBundle = criteria => {
    const key = String(criteria?.criteriaKey || "").trim();
    const entry = window.DOMESTIC_JUDGEMENT_CRITERIA_TEXTS?.entries?.[key];
    if (!key || !entry?.title) return null;
    const references = Array.isArray(criteria?.references) ? criteria.references.filter(Boolean) : [];
    return {
      pdfPath: `../references/excerpts/domestic-bundles/judgement-criteria/${key}.pdf`,
      mobileImage: `../assets/domestic-law-bundles/judgement-criteria/${key}.png`,
      summary: {
        order: `収録：${entry.title}`,
        description: references.length
          ? `${references.join("、")}を、判定条件と結果が分かる形式で表示しています。`
          : `${entry.title}を、判定条件と結果が分かる形式で表示しています。`
      }
    };
  };

  const openJudgementCriteriaSourceFullscreen = ({ title, criteria }) => {
    const sections = Array.isArray(criteria?.sections) ? criteria.sections.filter(section => section?.pdfPath && Number.isFinite(Number(section?.page))) : [];
    const references = Array.isArray(criteria?.references) ? criteria.references.filter(Boolean) : [];
    const titleNode = domesticLawFullscreen.querySelector("[data-domestic-law-title]");
    const body = domesticLawFullscreen.querySelector("[data-domestic-law-body]");
    if (titleNode) titleNode.textContent = title || `国連番号${record.unNumber} 判定基準の国内法令`;
    if (body) body.innerHTML = `
      <section class="domestic-law-fullscreen__bundle-section judgement-source-bundle">
        <div class="domestic-law-fullscreen__bundle-toolbar">
          <div>
            <strong>${escapeHtml(references.length ? `収録：${references.join(" → ")}` : "判定基準の該当原文")}</strong>
            <span>該当する国内法令の原文ページを、1つの画面内で順番に表示しています。</span>
          </div>
        </div>
        <div class="judgement-source-bundle__pages">
          ${sections.map((section, index) => buildDomesticLawPageSection({
            title: section.title || section.navLabel || `判定基準 原文 ${index + 1}`,
            pdfPath: section.pdfPath,
            page: Number(section.page),
            law: section.law || "危告示",
            panelId: `judgement-source-${index + 1}`,
            active: true
          })).join("") || '<p class="reference-pending">該当する原文ページを特定できませんでした。</p>'}
        </div>
      </section>`;
    domesticLawFullscreen.hidden = false;
    document.body.classList.add("is-domestic-law-fullscreen-open");
    requestAnimationFrame(() => domesticLawFullscreen.querySelector(".domestic-law-fullscreen__dialog")?.focus({preventScroll:true}));
  };

  const openJudgementCriteria = ({ title, criteria }) => {
    const bundle = buildJudgementCriteriaBundle(criteria);
    if (bundle) {
      openDomesticLawBundlePdf({
        title: title || `国連番号${record.unNumber} 判定基準の国内法令`,
        pdfPath: bundle.pdfPath,
        mobileImage: bundle.mobileImage,
        bundleSummary: bundle.summary
      });
      return;
    }
    openJudgementCriteriaSourceFullscreen({ title, criteria });
  };

  const openDomesticLawBundlePdf = ({ title, pdfPath, bundleSummary = null, mobileImage = "" }) => {
    const titleNode = domesticLawFullscreen.querySelector("[data-domestic-law-title]");
    const body = domesticLawFullscreen.querySelector("[data-domestic-law-body]");
    if (titleNode) titleNode.textContent = title || "国内法令 該当条文";
    const normalizedPdfPath = String(pdfPath || "");
    const isLabelBundle = normalizedPdfPath.includes("label-display-domestic-laws.pdf");
    const isPackageMarkingBundle = normalizedPdfPath.includes("package-marking-domestic-laws.pdf");
    const resolvedMobileImage = mobileImage || (isPackageMarkingBundle
      ? "../assets/domestic-law-bundles/package-marking-domestic-laws.png"
      : isLabelBundle
        ? "../assets/domestic-law-bundles/label-display-domestic-laws.png"
        : "");
    const resolvedBundleSummary = bundleSummary || (isPackageMarkingBundle
      ? {
          order: "収録順：危規則 第8条第1項 → 危規則 第9条 → 危告示 第7条の3第1項・第2項 → 危告示 第14条の2の2",
          description: "品名・国連番号表示に必要な国内法令の該当条文を1つのPDFに結合しています。"
        }
      : {
          order: "収録順：危規則 第8条 → 危規則 第9条 → 危告示 第7条の2",
          description: "危規則・危告示の該当条文を1つのPDFに結合しています。"
        });
    if (body) body.innerHTML = `
      <section class="domestic-law-fullscreen__bundle-section">
        <div class="domestic-law-fullscreen__bundle-toolbar">
          <div>
            <strong>${escapeHtml(resolvedBundleSummary.order)}</strong>
            <span>${escapeHtml(resolvedBundleSummary.description)}</span>
          </div>
          <a href="${escapeHtml(pdfPath)}" target="_blank" rel="noopener">結合PDFを別画面で開く</a>
        </div>
        <iframe data-domestic-law-bundle-frame src="${escapeHtml(pdfPath)}#page=1&zoom=page-width" title="${escapeHtml(title || '国内法令 該当条文')}" loading="eager"></iframe>
        ${resolvedMobileImage ? `<button type="button" class="domestic-law-fullscreen__bundle-mobile-button" data-pdf-image-expand="${escapeHtml(resolvedMobileImage)}" data-pdf-image-page="${escapeHtml(title || '国内法令 該当条文')}" aria-label="結合資料の表・図・本文を全画面拡大"><img class="domestic-law-fullscreen__bundle-mobile-image" data-domestic-law-bundle-image src="${escapeHtml(resolvedMobileImage)}" alt="${escapeHtml(title || '国内法令 該当条文')}" loading="eager"><span>表・図をタップして拡大</span></button>` : ""}
      </section>`;
    const mobileBundleImage = body?.querySelector("[data-domestic-law-bundle-image]");
    const bundleFrame = body?.querySelector("[data-domestic-law-bundle-frame]");
    mobileBundleImage?.addEventListener("error", () => {
      mobileBundleImage.hidden = true;
      const mobileButton = mobileBundleImage.closest(".domestic-law-fullscreen__bundle-mobile-button");
      if (mobileButton) mobileButton.hidden = true;
      if (bundleFrame) bundleFrame.classList.add("is-mobile-fallback");
    }, { once: true });
    domesticLawFullscreen.hidden = false;
    document.body.classList.add("is-domestic-law-fullscreen-open");
    requestAnimationFrame(() => domesticLawFullscreen.querySelector(".domestic-law-fullscreen__dialog")?.focus({preventScroll:true}));
  };

  const closeDomesticLawFullscreen = () => {
    domesticLawFullscreen.hidden = true;
    document.body.classList.remove("is-domestic-law-fullscreen-open");
    const body = domesticLawFullscreen.querySelector("[data-domestic-law-body]");
    if (body) body.innerHTML = "";
  };

  const openDomesticLawFullscreen = reference => {
    if (!reference) return;
    const pages = domesticArticlePagesByCategory[reference.categoryId] || { regulation: [], notification: [] };
    const regulationPdf = "../references/originals/dangerous-goods-regulations.pdf";
    const notificationPdf = "../references/originals/dangerous-goods-notification.pdf";
    const sourcePages = uniquePageList(reference.domesticOriginalPages || [reference.domesticOriginalPage, record.sourcePage]);
    const sections = [];

    uniquePageList(pages.regulation).forEach(page => sections.push(buildDomesticLawPageSection({
      title: `危規則 該当箇所（PDF ${page}ページ）`,
      pdfPath: regulationPdf,
      page,
      law: "危規則"
    })));
    uniquePageList(pages.notification).forEach(page => sections.push(buildDomesticLawPageSection({
      title: `危告示 条文該当箇所（PDF ${page}ページ）`,
      pdfPath: notificationPdf,
      page,
      law: "危告示"
    })));
    sourcePages.forEach(page => sections.push(buildDomesticLawPageSection({
      title: `危告示 別表第1 対象危険物・コード掲載ページ（PDF ${page}ページ）`,
      pdfPath: notificationPdf,
      page,
      law: "危告示"
    })));

    const title = domesticLawFullscreen.querySelector("[data-domestic-law-title]");
    const body = domesticLawFullscreen.querySelector("[data-domestic-law-body]");
    if (title) title.textContent = `${reference.code || "国内法令"} 関連条文・別表`;
    if (body) body.innerHTML = renderDomesticLawPageDeck(sections);
    domesticLawFullscreen.hidden = false;
    document.body.classList.add("is-domestic-law-fullscreen-open");
    requestAnimationFrame(() => domesticLawFullscreen.querySelector(".domestic-law-fullscreen__dialog")?.focus({ preventScroll: true }));
  };

  domesticLawFullscreen.querySelectorAll("[data-domestic-law-close]").forEach(button => button.addEventListener("click", closeDomesticLawFullscreen));
  domesticLawFullscreen.addEventListener("click", event => {
    const navButton = event.target.closest("[data-domestic-law-nav]");
    if (navButton) {
      event.preventDefault();
      const targetId = navButton.dataset.domesticLawNav || "";
      domesticLawFullscreen.querySelectorAll("[data-domestic-law-nav]").forEach(button => {
        const isActive = button === navButton;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      domesticLawFullscreen.querySelectorAll("[data-domestic-law-panel]").forEach(panel => {
        panel.hidden = panel.dataset.domesticLawPanel !== targetId;
      });
      domesticLawFullscreen.querySelector(".domestic-law-fullscreen__body")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const expandButton = event.target.closest("[data-pdf-image-expand]");
    if (!expandButton) return;
    event.preventDefault();
    openPdfImageLightbox(expandButton.dataset.pdfImageExpand || "", expandButton.dataset.pdfImagePage || "");
  });
  root.querySelectorAll("[data-domestic-law-group]").forEach(button => {
    button.addEventListener("click", () => {
      const group = button.dataset.domesticLawGroup;
      if (group === "label") {
        openDomesticLawBundlePdf({
          title: `国連番号${record.unNumber} 標札表示の国内法令`,
          pdfPath: "../references/excerpts/domestic-bundles/label-display-domestic-laws.pdf"
        });
        return;
      }
      if (group === "package-marking") {
        openDomesticLawBundlePdf({
          title: `国連番号${record.unNumber} 品名・国連番号表示の国内法令`,
          pdfPath: "../references/excerpts/domestic-bundles/package-marking-domestic-laws.pdf"
        });
        return;
      }
      if (group === "classification") {
        openJudgementCriteria({
          title: `国連番号${record.unNumber} 判定基準の国内法令`,
          criteria: judgementCriteria
        });
        return;
      }
    });
  });

  const normalizeDetailCode = value => String(value || "")
    .normalize("NFKC")
    .trim()
    .toUpperCase()
    .replace(/^又は/, "")
    .replace(/^[（(]+|[）)]+$/g, "")
    .replace(/[、,]+$/g, "");

  const parseTopLevelCodeHeading = line => {
    if (!line || /^\s/.test(line)) return null;
    const match = String(line).match(/^((?:P|PP|LP|L|IBC|B|T|TP|SP|SW|SGG?|E|ES|BK|H|VV|CV|V|S)\d+[A-Z]?)(?:\(([a-z0-9]+)\))?\b/i);
    if (!match) return null;
    return {
      base: normalizeDetailCode(match[1]),
      subsection: match[2] ? String(match[2]).toLowerCase() : "",
      full: normalizeDetailCode(match[0])
    };
  };

  const extractExactCodeSection = (value, code) => {
    const source = cleanDomesticOriginalForDisplay(value);
    if (!source) return "";
    const target = normalizeDetailCode(code);
    if (!target) return source;
    const targetMatch = target.match(/^((?:P|PP|LP|L|IBC|B|T|TP|SP|SW|SGG?|E|ES|BK|H|VV|CV|V|S)\d+[A-Z]?)(?:\(([a-z0-9]+)\))?$/i);
    if (!targetMatch) return source;
    const targetBase = normalizeDetailCode(targetMatch[1]);
    const targetSubsection = targetMatch[2] ? String(targetMatch[2]).toLowerCase() : "";
    const lines = source.split("\n");
    let start = -1;
    let end = lines.length;
    for (let index = 0; index < lines.length; index += 1) {
      const heading = parseTopLevelCodeHeading(lines[index]);
      if (!heading) continue;
      const isTarget = heading.base === targetBase && (!targetSubsection || heading.subsection === targetSubsection);
      if (start < 0 && isTarget) {
        start = index;
        continue;
      }
      if (start >= 0) {
        if (targetSubsection) {
          if (heading.base !== targetBase || heading.subsection !== targetSubsection) {
            end = index;
            break;
          }
        } else if (heading.base !== targetBase) {
          end = index;
          break;
        }
      }
    }
    if (start < 0) return source;
    return lines.slice(start, end).join("\n").trim();
  };

  const extractP200CurrentEntry = reference => {
    const text = cleanDomesticOriginalForDisplay(reference?.domesticOriginal || "");
    if (!text || !record?.unNumber) return "";
    const un = String(record.unNumber).padStart(4, "0");
    const lines = text.split("\n");
    const start = lines.findIndex(line => new RegExp(`^\\s*${un}(?:\\s|$)`).test(line));
    if (start < 0) return "";
    const selected = [lines[start]];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (/^\s*\d{4}(?:\s|$)/.test(line)) {
        const joined = selected.join("\n");
        const openCount = (joined.match(/[（(]/g) || []).length;
        const closeCount = (joined.match(/[）)]/g) || []).length;
        if (openCount > closeCount) {
          const cells = line.trim().split(/\s{2,}/).filter(Boolean);
          const tail = cells[cells.length - 1] || "";
          if (/[）)]$/.test(tail) && /(?:L|kg|MPa|容器)/i.test(tail)) selected.push(`      ${tail}`);
        }
        break;
      }
      if (sourcePageNoisePattern.test(line.trim())) continue;
      selected.push(line);
    }
    return selected.join("\n").trim();
  };

  const findP200CurrentPage = reference => {
    if (reference?.code !== "P200" || !record?.unNumber) return null;
    const raw = String(reference.domesticOriginal || "").replace(/\r\n?/g, "\n");
    const un = String(record.unNumber).padStart(4, "0");
    const segments = raw.split(/\f/);
    const pages = Array.isArray(reference.domesticOriginalPages) && reference.domesticOriginalPages.length
      ? reference.domesticOriginalPages
      : [reference.domesticOriginalPage || 298];
    const index = segments.findIndex(segment => new RegExp(`(?:^|\\n)\\s*${un}(?:\\s|$)`).test(segment));
    return index >= 0 ? (pages[index] || pages[0] || null) : (pages[0] || null);
  };

  const extractContextualCodeText = reference => {
    if (!reference) return "";
    if (reference.code === "P200" && record?.unNumber) {
      return extractP200CurrentEntry(reference);
    }
    return extractExactCodeSection(reference.domesticOriginal || "", reference.code);
  };

  const getCodeDisplayPages = reference => {
    const complexProfilePages = window.DOMESTIC_COMPLEX_PACKING_PROFILES?.profiles?.[String(reference?.code || "").toUpperCase()]?.sourcePages;
    if (Array.isArray(complexProfilePages) && complexProfilePages.length) return complexProfilePages;
    if (reference?.code === "P200" && record?.unNumber) {
      const page = findP200CurrentPage(reference);
      return page ? [page] : (reference.domesticOriginalPages || [reference.domesticOriginalPage]);
    }
    return reference?.domesticOriginalPages || [reference?.domesticOriginalPage];
  };

  const renderP200Context = (reference, contextual) => {
    const un = String(record?.unNumber || "").padStart(4, "0");
    const source = String(contextual || "");
    const permitRequired = /(?:^|\s)[xｘ](?:\s|$)/i.test(source);
    const capacity = source.match(/\d[\d,]*(?:\.\d+)?\s*L(?:（[^）]*）)?/i)?.[0] || "";
    const pressure = source.match(/\d+(?:\.\d+)?\s*MPa/i)?.[0] || "";
    return `<div class="p200-current-entry" aria-label="P200 国連番号${escapeHtml(un)}の該当内容">
      <div class="p200-current-entry__title">P200 国連番号${escapeHtml(un)}の該当内容</div>
      <dl class="p200-current-entry__summary">
        <div><dt>国連番号</dt><dd>${escapeHtml(un)}</dd></div>
        <div><dt>品名</dt><dd>${escapeHtml(record?.properShippingNameJa || record?.properShippingName || "原文参照")}</dd></div>
        ${pressure ? `<div><dt>最大圧力等</dt><dd>${escapeHtml(pressure)}</dd></div>` : ""}
        ${capacity ? `<div><dt>許容容量</dt><dd>${escapeHtml(capacity)}</dd></div>` : ""}
        ${permitRequired
          ? `<div class="is-wide is-warning"><dt>許可条件</dt><dd>表中「x」は、地方運輸局長の許可が必要であることを示します。社内既存システムの許可証データベースに登録された許可内容を確認してください。</dd></div>`
          : `<div class="is-wide"><dt>確認事項</dt><dd>容器、定数、最大圧力、許容容量又は許容質量は、下記の国連番号${escapeHtml(un)}の原文該当行及び注記を確認してください。</dd></div>`}
      </dl>
      <p class="p200-current-entry__note">現在開いている危険物の国連番号に該当する情報です。詳細は「原文を開く」から該当ページを確認してください。</p>
    </div>`;
  };

  const removeSourcePageNoise = value => cleanDomesticOriginalForDisplay(value)
    .split("\n")
    .filter(line => !sourcePageNoisePattern.test(line.trim()))
    .join("\n")
    .trim();

  const stripLeadingCodeHeading = (value, code) => {
    const source = removeSourcePageNoise(value);
    if (!source) return "";
    const lines = source.split("\n");
    const target = normalizeDetailCode(code);
    const first = normalizeDetailCode((lines[0] || "").trim());
    if (target && first === target) lines.shift();
    return lines.join("\n").trim();
  };

  const joinExactSourceFragments = fragments => {
    const values = fragments.map(value => String(value || "").trim()).filter(Boolean);
    if (!values.length) return "";
    return values.reduce((output, next) => {
      if (!output) return next;
      const noSpace = /[一-龯々ぁ-んァ-ヶー、。）」』]$/.test(output) && /^[一-龯々ぁ-んァ-ヶー、。（(「『]/.test(next);
      const latinSpace = /[A-Za-z0-9]$/.test(output) && /^[A-Za-z0-9]/.test(next);
      return `${output}${noSpace ? "" : latinSpace ? " " : ""}${next}`;
    }, "");
  };

  const splitExactProvisionItems = value => {
    const source = removeSourcePageNoise(value);
    if (!source) return [];
    const lines = source.split("\n").map(line => line.replace(/[ \t]+$/g, ""));
    const items = [];
    let current = null;
    const flush = () => {
      if (!current) return;
      const text = joinExactSourceFragments(current.fragments);
      if (text) items.push({ type: current.type, text });
      current = null;
    };
    let lastMajorType = "condition";
    const classify = trimmed => {
      if (/^(?:PP|L|B|TP|H|VV|CV|V|SW|S|SP|SGG?|ES)\d+[A-Z]?\b/i.test(trimmed)) return "additional";
      if (/^(?:注|備考)\s*\d*/.test(trimmed)) return "note";
      if (/^(?:\(?\d+\)?|（\d+）)(?:\s|$)/.test(trimmed)) {
        return lastMajorType === "additional" ? "additional" : "note";
      }
      return "condition";
    };
    const startsItem = trimmed => /^(?:注|備考)\s*\d*|^(?:PP|L|B|TP|H|VV|CV|V|SW|S|SP|SGG?|ES)\d+[A-Z]?\b|^(?:\(?\d+\)?|（\d+）)(?:\s|$)/i.test(trimmed);
    lines.forEach(rawLine => {
      const trimmed = rawLine.trim();
      if (!trimmed) {
        flush();
        return;
      }
      if (startsItem(trimmed)) {
        flush();
        const type = classify(trimmed);
        if (!/^(?:\(?\d+\)?|（\d+）)(?:\s|$)/.test(trimmed)) lastMajorType = type;
        current = { type, fragments: [trimmed] };
        return;
      }
      if (!current) current = { type: "condition", fragments: [] };
      current.fragments.push(trimmed);
    });
    flush();
    return items;
  };

  const extractPackingSupplementalText = value => {
    const source = removeSourcePageNoise(value);
    if (!source) return "";
    const candidates = [
      source.search(/(?:^|\n)\s*IMDGコード4\.1\.4\.1/),
      source.search(/(?:^|\n)\s*注\s+\d+/)
    ].filter(index => index >= 0);
    if (!candidates.length) return "";
    return source.slice(Math.min(...candidates)).trim();
  };

  const renderExactProvisionGroups = (originalText, reference, { supplementalOnly = false } = {}) => {
    let source = stripLeadingCodeHeading(originalText, reference?.code);
    if (supplementalOnly) source = extractPackingSupplementalText(source);
    const items = splitExactProvisionItems(source);
    if (!items.length) return "";
    const inlineLinkOptions = { disableLinks: true };
    const groups = [
      { key: "condition", title: "適用条件・規定内容", items: items.filter(item => item.type === "condition") },
      { key: "note", title: "注記", items: items.filter(item => item.type === "note") },
      { key: "additional", title: "追加規定", items: items.filter(item => item.type === "additional") }
    ].filter(group => group.items.length);
    return `<div class="code-exact-provisions">
      ${groups.map(group => `<section class="code-exact-provisions__group code-exact-provisions__group--${group.key}">
        <h4>${escapeHtml(group.title)}</h4>
        <div class="code-exact-provisions__items">
          ${group.items.map(item => `<p>${renderInlineCodeLinks(item.text, inlineLinkOptions)}</p>`).join("")}
        </div>
      </section>`).join("")}
    </div>`;
  };

  const renderStowageCategoryRequirement = (reference, contextual) => {
    const selectedCode = normalizeDetailCode(reference?.code);
    if (!/^[A-E]$/.test(selectedCode) || !contextual) return "";
    const rows = removeSourcePageNoise(contextual)
      .split("\n")
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const normalizedLine = index === 0 ? line.replace(new RegExp(`^${selectedCode}\\s+`), "") : line;
        const cells = normalizedLine.split(/\s{2,}/).map(cell => cell.trim()).filter(Boolean);
        if (cells.length < 2) return null;
        return { condition: cells.slice(0, -1).join(" "), method: cells.at(-1) };
      })
      .filter(Boolean);
    if (!rows.length) return "";
    return `<div class="code-exact-provisions">
      <section class="code-exact-provisions__group code-exact-provisions__group--condition">
        <h4>積載方法</h4>
        <div class="stowage-category-requirement-grid">
          <table class="stowage-category-requirement-table">
            <thead><tr><th>船舶・旅客条件</th><th>積載方法</th></tr></thead>
            <tbody>${rows.map(row => `<tr><td>${escapeHtml(row.condition)}</td><td>${escapeHtml(row.method)}</td></tr>`).join("")}</tbody>
          </table>
        </div>
      </section>
    </div>`;
  };

  const renderOrganizedOriginalContent = (reference, contextual) => {
    if (!contextual) return "";
    const complexPackingProfile = renderComplexPackingProfile(reference?.code);
    if (complexPackingProfile) return complexPackingProfile;
    const stowageCategoryRequirement = renderStowageCategoryRequirement(reference, contextual);
    if (stowageCategoryRequirement) return stowageCategoryRequirement;
    const hasQuantityProfile = Boolean(window.DOMESTIC_PACKING_QUANTITY_PROFILES?.profiles?.[reference.code]);
    if (hasQuantityProfile) {
      return renderExactProvisionGroups(contextual, reference, { supplementalOnly: true });
    }
    if (/^T(?:[1-9]|1\d|2[0-2])$/i.test(String(reference?.code || ""))) {
      return "";
    }
    if (isTabularDomesticOriginal(contextual)) {
      const inlineLinkOptions = { disableLinks: true };
      const structured = renderStructuredPackingOriginal(contextual, "", inlineLinkOptions);
      if (structured) return structured;
    }
    return renderExactProvisionGroups(contextual, reference);
  };

  const buildDirectSourceLinks = (reference, domesticExactPageUrl, displayPages) => {
    const domesticLinks = [];
    const imdgLinks = [];
    const domesticSeen = new Set();
    const imdgSeen = new Set();
    const addDomestic = ({ law, label, href, primary = false }) => {
      if (!href || domesticSeen.has(href)) return;
      domesticSeen.add(href);
      domesticLinks.push({ law, label, href, primary });
    };
    const addImdg = ({ label, href }) => {
      if (!href || imdgSeen.has(href)) return;
      imdgSeen.add(href);
      imdgLinks.push({ law: "IMDG Code", label, href, primary: false });
    };

    if (reference.domesticOriginal && domesticExactPageUrl) {
      const pages = displayPages.length ? displayPages : [reference.domesticOriginalPage].filter(Boolean);
      if (pages.length) {
        pages.forEach((page, index) => addDomestic({
          law: "危告示",
          label: `危告示原文を開く（PDF ${page}ページ）`,
          href: buildExactPdfPageUrl("../references/originals/dangerous-goods-notification.pdf", page),
          primary: index === 0
        }));
      } else {
        addDomestic({ law: "危告示", label: "危告示原文を開く", href: domesticExactPageUrl, primary: true });
      }
    }

    // 整理情報に固有の国内法令原文も、国内法令欄へ集約する。
    if (/^IBC\d+/i.test(String(reference.code || ""))) {
      addDomestic({
        law: "危告示",
        label: "IBC容器の最大内容積の原文を開く（PDF 353ページ）",
        href: buildExactPdfPageUrl("../references/originals/dangerous-goods-notification.pdf", 353)
      });
    }
    if (/^T(?:[1-9]|1\d|2[0-2])$/i.test(String(reference.code || ""))) {
      addDomestic({
        law: "危告示",
        label: "代替使用可能なTコードの原文を開く（PDF 364ページ）",
        href: buildExactPdfPageUrl("../references/originals/dangerous-goods-notification.pdf", 364)
      });
    }

    resolveDomesticLawTargets(reference.domesticReferences || []).forEach(target => {
      const pdfPath = target.law === "危規則"
        ? "../references/originals/dangerous-goods-regulations.pdf"
        : target.law === "放告示"
          ? "../references/originals/radioactive-materials-notification.pdf"
          : "../references/originals/dangerous-goods-notification.pdf";
      addDomestic({
        law: target.law,
        label: `${target.law} ${target.label} 原文を開く（PDF ${target.page}ページ）`,
        href: buildExactPdfPageUrl(pdfPath, target.page)
      });
    });

    // 選択したコード自身の検証済みIMDG Codeページを、ページ最下部へ表示する。
    const selectedCode = normalizeDetailCode(reference.code).replace(/\([^)]+\)$/, "");
    const selectedImdgEntry = window.IMDG_CODE_PAGE_MAP?.entries?.[selectedCode];
    if (selectedImdgEntry?.page) {
      addImdg({
        label: `IMDG Code ${selectedCode} 原文を開く（PDF ${selectedImdgEntry.page}ページ）`,
        href: buildExactPdfPageUrl("../references/originals/imdg-code-amendment-42-24-msc556-108.pdf", selectedImdgEntry.page)
      });
    }

    (reference.domesticImdgReferences || []).forEach(item => {
      if (!item || !item.page) return;
      addImdg({
        label: `${item.label || `IMDG Code ${item.section || ""}`} 原文を開く（PDF ${item.page}ページ）`,
        href: buildExactPdfPageUrl("../references/originals/imdg-code-amendment-42-24-msc556-108.pdf", item.page)
      });
    });

    if (!domesticLinks.length && !imdgLinks.length) return "";
    const renderLinkGroup = (links, group) => links.length
      ? `<div class="code-direct-source-links code-direct-source-links--${group}" data-source-group="${group}" aria-label="${group === "domestic" ? "国内法令原文リンク" : "IMDG Code原文リンク"}">
          ${links.map(link => `<a class="modal-reference-link code-direct-source-link${link.primary ? " modal-reference-link--primary" : ""}" data-source-law="${escapeHtml(link.law)}" href="${escapeHtml(link.href)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`).join("")}
        </div>`
      : "";

    return `${renderLinkGroup(domesticLinks, "domestic")}${renderLinkGroup(imdgLinks, "imdg")}`;
  };

  const renderCodeExplanation = (reference, contextual = extractContextualCodeText(reference), domesticExactPageUrl = "", displayPages = []) => {
    const summaryItems = Array.isArray(reference.domesticReferences) ? reference.domesticReferences : [];
    const organizedOriginal = renderOrganizedOriginalContent(reference, contextual);
    return `<section class="modal-reference-block modal-reference-block--code-explanation">
      ${summaryItems.length ? `<div class="code-organized-summary"><ul>${summaryItems.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div>` : ""}
      ${organizedOriginal}
      ${buildDirectSourceLinks(reference, domesticExactPageUrl, displayPages)}
    </section>`;
  };


  const decorateCodeTablesForResponsiveLayout = container => {
    if (!container) return;
    container.querySelectorAll("table").forEach(table => {
      table.classList.add("responsive-code-table");
      const headers = [...table.querySelectorAll("thead th")].map(th => th.textContent.trim());
      if (headers.length >= 5 && !table.classList.contains("p520-requirement-table")) table.classList.add("responsive-wide-table");
      if (headers.length) {
        table.querySelectorAll("tbody tr").forEach(row => {
          [...row.children].forEach((cell, index) => {
            if (cell.tagName === "TD" && headers[index]) cell.dataset.label = headers[index];
          });
        });
      } else if (table.querySelector("tbody tr > th")) {
        table.classList.add("responsive-key-value-table");
      }
    });
  };

  const openCodeModal = code => {
    if (!codeModal || !codeModalBody || !codeModalTitle) return;
    const headerLabel = codeModal.querySelector(".code-detail-modal__header span");
    if (headerLabel) headerLabel.textContent = "国内法令・IMDG Code";
    const reference = window.IMDGCrossReferenceResolver?.resolve(code);
    if (!reference) return;
    const hasComplexPackingProfile = Boolean(window.DOMESTIC_COMPLEX_PACKING_PROFILES?.profiles?.[String(reference.code || "").toUpperCase()]);
    codeModal.classList.toggle("has-complex-packing-profile", hasComplexPackingProfile);
    const domesticPdfPath = "../references/originals/dangerous-goods-notification.pdf";
    const contextualOriginal = extractContextualCodeText(reference);
    const displayPages = getCodeDisplayPages(reference).filter(Boolean);
    const firstDisplayPage = displayPages[0] || reference.domesticOriginalPage || 1;
    const domesticExactPageUrl = buildExactPdfPageUrl(domesticPdfPath, firstDisplayPage);
    codeModalTitle.textContent = `${reference.code} ${reference.labelJa || "コード詳細"}`;
    codeModalBody.innerHTML = `
      ${renderPackingQuantityProfile(reference.code, record.packingGroup)}
      ${renderIbcMaximumContentReference(reference.code, record.packingGroup)}
      ${renderPortableTankRequirementReference(reference.code)}
      ${renderCodeExplanation(reference, contextualOriginal, domesticExactPageUrl, displayPages)}
    `;
    decorateCodeTablesForResponsiveLayout(codeModalBody);
    codeModal.hidden = false;
    document.body.classList.add("is-code-modal-open");
    const modalDialog = codeModal.querySelector(".code-detail-modal__dialog");
    codeModalBody.scrollTop = 0;
    if (modalDialog) modalDialog.scrollTop = 0;
    requestAnimationFrame(() => {
      codeModalBody.scrollTop = 0;
      if (modalDialog) modalDialog.scrollTop = 0;
    });
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
    if (!domesticLawFullscreen.hidden) {
      closeDomesticLawFullscreen();
      return;
    }
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

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/detail-dashboard.js": "part505" });
