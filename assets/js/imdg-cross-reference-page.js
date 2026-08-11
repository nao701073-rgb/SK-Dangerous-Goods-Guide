
(() => {
  "use strict";

  const form = document.getElementById("crossReferenceForm");
  const input = document.getElementById("crossReferenceInput");
  const resultRoot = document.getElementById("crossReferenceResult");
  const categoriesRoot = document.getElementById("crossReferenceCategories");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const registry = window.IMDGCrossReferenceResolver.getRegistry();
  const categories = registry.categories || {};

  categoriesRoot.innerHTML = Object.values(categories).map(category => `
    <article class="category-card">
      <strong>${escapeHtml(category.labelJa)}</strong>
      <span>${escapeHtml(category.imdgLocation)}</span>
      <span>${escapeHtml(category.detailLocation)}</span>
    </article>
  `).join("");

  function render(code) {
    const reference = window.IMDGCrossReferenceResolver.resolve(code);

    if (!reference) {
      resultRoot.innerHTML = `
        <div class="panel">
          <div class="panel-body">コードを入力してください。</div>
        </div>
      `;
      return;
    }

    resultRoot.innerHTML = `
      <article class="cross-reference-card">
        <span class="cross-reference-code">${escapeHtml(reference.code)}</span>
        <div>
          <strong>${escapeHtml(reference.labelJa || "IMDG Code参照")}</strong>
          <p>${escapeHtml(reference.commentaryJa || "")}</p>
        </div>
        <div class="cross-reference-location">
          <span>国内法令・IMDG Code</span>
          <strong>${escapeHtml(reference.imdgLocation || "参照先確認中")}</strong>
          ${reference.detailLocation ? `<span>${escapeHtml(reference.detailLocation)}</span>` : ""}
        </div>
        <div class="cross-reference-status">
          <strong>国内法令の主な参照</strong>
          <ul>${(reference.domesticReferences || []).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>
        ${
          reference.englishExcerpt
            ? `<blockquote class="cross-reference-original" lang="en">${escapeHtml(reference.englishExcerpt)}</blockquote>`
            : `<div class="cross-reference-status">英語原文：未登録（参照位置は登録済み）</div>`
        }
        <div class="cross-reference-status">
          登録状態：${escapeHtml(reference.status || "")}
        </div>
      </article>
    `;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    render(input.value);
  });

  render("");
})();
