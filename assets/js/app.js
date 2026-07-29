(() => {
  const menu = document.getElementById("sideMenu");
  const backdrop = document.getElementById("menuBackdrop");
  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");

  const escapeHtml = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

  const normalizeUn = value => {
    const digits = String(value || "").replace(/\D/g, "");
    return digits ? digits.padStart(4, "0") : "";
  };

  const formatDateTime = value => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("ja-JP", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  };

  const getContext = () => {
    const storageContext = window.ISSStorage?.getCurrentContext?.() || {};
    return {
      officeName: storageContext.officeName || localStorage.getItem("iss-office-name") || "所属事業所",
      userName: storageContext.userName || storageContext.displayName || localStorage.getItem("iss-current-user-name") || "利用者"
    };
  };

  const recentItems = () => (window.ISSStorage?.getSearchHistory?.() || [])
    .filter(item => normalizeUn(item.openedUnNumber))
    .slice(0, 5)
    .map(item => ({
      un: normalizeUn(item.openedUnNumber),
      name: item.openedNameJa || item.openedNameEn || "危険物詳細",
      meta: [item.mode === "un" ? "国連番号検索" : item.mode === "name" ? "品名検索" : "検索履歴", formatDateTime(item.searchedAt)].filter(Boolean).join("・")
    }));

  const favoriteItems = () => (window.ISSStorage?.getFavorites?.() || [])
    .slice(0, 5)
    .map(item => ({
      un: normalizeUn(item.unNumber),
      name: item.properShippingNameJa || item.properShippingName || "危険物詳細",
      meta: item.note || item.office || formatDateTime(item.createdAt) || "お気に入り"
    }))
    .filter(item => item.un);

  function renderList(id, items, emptyMessage, emptyHref, emptyLinkText) {
    const target = document.getElementById(id);
    if (!target) return;

    if (!items.length) {
      target.innerHTML = `<li class="simple-list__empty"><p>${escapeHtml(emptyMessage)}</p><a href="${escapeHtml(emptyHref)}">${escapeHtml(emptyLinkText)} →</a></li>`;
      return;
    }

    target.innerHTML = items.map(item => {
      const un = normalizeUn(item.un);
      const displayUn = `UN${un}`;
      const label = `${displayUn} ${item.name || ""}`.trim();
      return `<li><a class="simple-list__link" href="pages/dangerous-goods-detail.html?un=${encodeURIComponent(un)}" aria-label="${escapeHtml(label)}の危険物詳細を開く"><div><strong>${escapeHtml(label)}</strong><small>${escapeHtml(item.meta || "")}</small></div><span aria-hidden="true">›</span></a></li>`;
    }).join("");
  }

  function refreshActivityPanels() {
    const context = getContext();
    const title = document.getElementById("favoritePanelTitle");
    if (title) title.textContent = `${context.officeName} ${context.userName}のお気に入り`;

    renderList("recentSearchList", recentItems(), "まだ検索履歴はありません。", "pages/dangerous-goods-search.html", "危険物を検索");
    renderList("favoriteList", favoriteItems(), "お気に入りはまだ登録されていません。", "pages/dangerous-goods-search.html", "危険物を検索");
  }

  function closeMenu() {
    menu?.classList.remove("open");
    backdrop?.classList.remove("visible");
    menuToggle?.setAttribute("aria-expanded", "false");
  }

  menuToggle?.addEventListener("click", () => {
    menu?.classList.add("open");
    backdrop?.classList.add("visible");
    menuToggle.setAttribute("aria-expanded", "true");
  });
  menuClose?.addEventListener("click", closeMenu);
  backdrop?.addEventListener("click", closeMenu);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && menu?.classList.contains("open")) closeMenu();
  });

  document.querySelectorAll(".module-card:not(.is-disabled)").forEach(card => {
    const link = card.querySelector("a[href]");
    if (!link) return;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    const open = () => { window.location.href = link.href; };
    card.addEventListener("click", event => {
      if (!event.target.closest("a, button, input, select, textarea")) open();
    });
    card.addEventListener("keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
  });

  refreshActivityPanels();
  window.addEventListener("pageshow", refreshActivityPanels);
  window.addEventListener("storage", event => {
    if (["iss-search-history", "iss-favorites", "iss-current-user-name", "iss-office-name"].includes(event.key)) refreshActivityPanels();
  });
})();
