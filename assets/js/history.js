
(() => {
  "use strict";

  const cards = document.getElementById("historyCards");
  const clearButton = document.getElementById("clearHistory");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDate = iso => {
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  function historyRequeryHref(item) {
    const query = String(item?.query || "").trim();
    const normalizedUn = query.normalize("NFKC").replace(/^UN\s*/i, "").trim();
    const advancedConditions = item?.conditions && typeof item.conditions === "object"
      ? Object.entries(item.conditions).some(([key, value]) => !["query", "resultLimit", "resultSort"].includes(key) && Boolean(value))
      : false;
    if (!advancedConditions && Number(item?.resultCount) === 1 && /^\d{1,4}$/.test(normalizedUn)) {
      return `dangerous-goods-detail.html?un=${encodeURIComponent(normalizedUn.padStart(4, "0"))}`;
    }
    return `dangerous-goods-search.html?query=${encodeURIComponent(query)}&historyOpen=detail`;
  }

  function render() {
    const history = window.ISSStorage.getSearchHistory();

    if (!history.length) {
      cards.innerHTML = `
        <div class="empty-state">
          <strong>検索履歴はありません</strong>
          <p>検索や詳細表示を行うと自動的に記録されます。</p>
        </div>
      `;
      return;
    }

    cards.innerHTML = history.map(item => `
      <article class="management-card history-card">
        <div>
          <small>${escapeHtml(formatDate(item.searchedAt))}｜${escapeHtml(item.office || "")}</small>
          <h3>${item.openedUnNumber ? `UN${escapeHtml(item.openedUnNumber)} ${escapeHtml(item.openedNameJa)}` : escapeHtml(item.query || "条件検索")}</h3>
          <p>${item.openedNameEn ? escapeHtml(item.openedNameEn) : `検索方法：${escapeHtml(item.mode)}／結果：${escapeHtml(item.resultCount)}件`}</p>
        </div>
        <div class="management-actions">
          ${
            item.openedUnNumber
              ? `<a href="dangerous-goods-detail.html?un=${encodeURIComponent(item.openedUnNumber)}">詳細を再表示</a>`
              : `<a href="${historyRequeryHref(item)}">再検索</a>`
          }
          <button data-remove-history="${escapeHtml(item.id)}" class="danger-action" type="button">削除</button>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-remove-history]").forEach(button => {
      button.addEventListener("click", () => {
        window.ISSStorage.removeSearchHistory(button.dataset.removeHistory);
        render();
      });
    });
  }

  clearButton.addEventListener("click", () => {
    window.ISSStorage.clearSearchHistory();
    render();
  });

  render();
})();
