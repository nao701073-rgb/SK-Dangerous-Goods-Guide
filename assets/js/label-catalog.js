
(() => {
  "use strict";
  const root = document.getElementById("labelCatalog");
  const labels = window.LabelResolver?.all?.() || [];

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  root.innerHTML = labels.map(label => `
    <article class="label-catalog-card">
      <img src="${escapeHtml(label.src)}" alt="${escapeHtml(label.nameJa)}">
      <h2>${escapeHtml(label.nameJa)}</h2>
      <p>${label.class ? `等級 ${escapeHtml(label.class)}` : escapeHtml(label.id)}</p>
    </article>
  `).join("");
})();
