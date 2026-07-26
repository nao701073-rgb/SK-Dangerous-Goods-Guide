
(() => {
  "use strict";

  const domesticRoot = document.getElementById("domesticRegulations");
  const internationalRoot = document.getElementById("internationalRegulations");
  const regulations = Array.isArray(window.REGULATION_REGISTRY)
    ? window.REGULATION_REGISTRY
    : [];

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const statusLabel = {
    active: "利用可能",
    reference: "公的原典登録済み",
    planned: "データ準備中",
    future: "将来追加",
    "source-uploaded": "原本資料登録済み"
  };

  const documentTypeLabel = {
    law: "法律",
    notification: "告示",
    "ministerial-ordinance": "省令",
    "international-code": "国際コード",
    "international-convention": "国際条約"
  };

  function render(items) {
    if (!items.length) {
      return '<div class="empty-state"><strong>登録データがありません</strong></div>';
    }

    return items.map(item => {
      const sourceUrl = item.officialSource?.url;
      const sourceLink = sourceUrl
        ? `<a class="regulation-source-link" href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener noreferrer">公的原典を開く ↗</a>`
        : "";

      const identifiers = [
        item.lawNumber,
        item.lawId ? `法令ID：${item.lawId}` : ""
      ].filter(Boolean);

      return `
        <article class="regulation-card">
          <div class="regulation-meta">
            <span class="regulation-status ${escapeHtml(item.status)}">
              ${escapeHtml(statusLabel[item.status] || item.status)}
            </span>
            <span class="regulation-status">
              ${escapeHtml(documentTypeLabel[item.documentType] || item.documentType)}
            </span>
          </div>
          <div>
            <h3>${escapeHtml(item.shortName)}</h3>
            <p>${escapeHtml(item.officialName)}</p>
            ${item.officialNameEn ? `<p>${escapeHtml(item.officialNameEn)}</p>` : ""}
          </div>
          ${identifiers.length ? `<div class="regulation-identifiers">${identifiers.map(escapeHtml).join("<br>")}</div>` : ""}
          ${sourceLink}
        </article>
      `;
    }).join("");
  }

  domesticRoot.innerHTML = render(
    regulations.filter(item => item.category === "domestic")
  );

  internationalRoot.innerHTML = render(
    regulations.filter(item => item.category === "international")
  );
})();
