
(() => {
  "use strict";

  const cards = document.getElementById("favoriteCards");
  const filter = document.getElementById("favoriteFilter");
  const officeTitle = document.getElementById("officeTitle");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  officeTitle.textContent = `${window.ISSStorage.getOfficeName()}のお気に入り`;

  function render() {
    const query = filter.value.trim().toLowerCase();
    const items = window.ISSStorage.getFavorites().filter(item => {
      const haystack = [
        item.unNumber, item.properShippingName,
        item.properShippingNameJa, item.note
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    });

    if (!items.length) {
      cards.innerHTML = `
        <div class="empty-state">
          <strong>お気に入りはありません</strong>
          <p>危険物詳細画面から登録できます。</p>
        </div>
      `;
      return;
    }

    cards.innerHTML = items.map(item => `
      <article class="management-card">
        <div>
          <span class="un-number">UN${escapeHtml(item.unNumber)}</span>
          <h3>${escapeHtml(item.properShippingNameJa)}</h3>
          <p>${escapeHtml(item.properShippingName)}</p>
          <small>${escapeHtml(item.office || "")}</small>
        </div>
        <label>
          共有メモ
          <textarea data-note="${escapeHtml(item.unNumber)}" rows="3">${escapeHtml(item.note || "")}</textarea>
        </label>
        <div class="management-actions">
          <a href="dangerous-goods-detail.html?un=${encodeURIComponent(item.unNumber)}">詳細を表示</a>
          <button data-save="${escapeHtml(item.unNumber)}" type="button">メモ保存</button>
          <button data-remove="${escapeHtml(item.unNumber)}" class="danger-action" type="button">削除</button>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-save]").forEach(button => {
      button.addEventListener("click", () => {
        const un = button.dataset.save;
        const note = document.querySelector(`[data-note="${un}"]`).value;
        window.ISSStorage.updateFavoriteNote(un, note);
        button.textContent = "保存済み";
        setTimeout(() => button.textContent = "メモ保存", 1200);
      });
    });

    document.querySelectorAll("[data-remove]").forEach(button => {
      button.addEventListener("click", () => {
        window.ISSStorage.removeFavorite(button.dataset.remove);
        render();
      });
    });
  }

  filter.addEventListener("input", render);
  render();
})();
