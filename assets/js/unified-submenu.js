(() => {
  "use strict";

  if (document.body?.dataset?.unifiedSubmenuReady === "1") return;
  document.body.dataset.unifiedSubmenuReady = "1";

  const inPages = location.pathname.includes("/pages/") || location.pathname.split("/").pop() !== "index.html";
  const root = inPages ? "../" : "";
  const pageRoot = inPages ? "" : "pages/";
  const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();

  const icons = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8a1 1 0 0 1-1 1h-4.25v-5.5h-4.5V19.5H5.5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5h7l3 3v9a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-10a2 2 0 0 1 2-2zM14 4.5v3h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="10.2" cy="12.2" r="2.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="m12.2 14.2 3.1 3.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    applications: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5.5h6M9.5 4h5a1.2 1.2 0 0 1 1.2 1.2V6h1.3A1.9 1.9 0 0 1 19 7.9v8.2A1.9 1.9 0 0 1 17.1 18H6.9A1.9 1.9 0 0 1 5 16.1V7.9A1.9 1.9 0 0 1 6.9 6h1.4v-.8A1.2 1.2 0 0 1 9.5 4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m8.3 10 1.3 1.3 2-2M12.5 10.6h3m-7.2 3.4 1.3 1.3 2-2M12.5 14.6h3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    verify: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h9l3 3v13H6zM15 4v4h4M9 11h6M9 15h4" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
    securing: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4zM7 4v3M17 4v3M7 17v3M17 17v3M4 12h16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>',
    law: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v12M7 8h10M8 8l-3 4h6l-3-4Zm8 0-3 4h6l-3-4ZM9 18h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
    references: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4.5h9l3 3v12H6zM15 4.5v3h3M9 11h6M9 14h6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>',
    overpack: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h6v6H5zM13 5h6v6h-6zM5 13h6v6H5z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 16h5M16.5 13.5v5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="2"/></svg>',
    history: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8V4.8m0 0H8.2M5 4.8A9 9 0 1 1 3.8 15M12 7.5v4.7l3 1.8" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    feedback: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5.5h14v9H9l-4 4zM8 9h8M8 12h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 1.2 2.2 2.5.4 1.8 1.8-.4 2.5L19 11.9 16.8 13l-.4 2.5-1.8 1.8-2.5-.4L12 19l-1.2-2.1-2.5.4-1.8-1.8.4-2.5L5 11.9l2.1-1.1.4-2.5 1.8-1.8 2.5.4Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="12" r="3.1" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
    system: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v14H5zM8 9h8M8 12h8M8 15h5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2"/></svg>'
  };

  const items = [
    {key:"home", label:"ホーム", href:`${root}index.html`, icon:"home", files:["index.html"]},
    {key:"search", label:"危険物検索", href:`${pageRoot}dangerous-goods-search.html`, icon:"search", files:["dangerous-goods-search.html","dangerous-goods-detail.html","ems.html","label-catalog.html"]},
    {key:"applications", label:"申請番号管理", href:`${pageRoot}applications.html`, icon:"applications", files:["applications.html"], permission:"applicationsRead"},
    {key:"application-verification", label:"申請書確認", href:`${pageRoot}application-verification.html`, icon:"verify", files:["application-verification.html"]},
    {key:"ctu-securing", label:"固縛力参考算出", href:`${pageRoot}ctu-securing-calculator.html`, icon:"securing", files:["ctu-securing-calculator.html"]},
    {key:"regulations", label:"関連法令", href:`${pageRoot}regulations.html`, icon:"law", files:["regulations.html","regulation-update-admin.html","regulation-evidence-snapshot.html","imdg-cross-reference.html"]},
    {key:"references", label:"関連資料", href:`${pageRoot}references.html`, icon:"references", files:["references.html"]},
    {key:"overpack", label:"オーバーパック表示用作成", href:`${pageRoot}overpack-label-tool.html`, icon:"overpack", files:["overpack-label-tool.html"], feature:"overpack-label"},
    {key:"history", label:"検索履歴", href:`${pageRoot}search-history.html`, icon:"history", files:["search-history.html"]},
    {key:"feedback", label:"改善要望", href:`${pageRoot}feedback.html`, icon:"feedback", files:["feedback.html"]}
  ];

  const settingsItems = [
    {key:"user-settings", label:"ユーザー設定", note:"すべての利用者", href:`${pageRoot}settings.html`, icon:"settings", files:["settings.html"]},
    {key:"system-settings", label:"システム設定", note:"権限を持つ利用者のみ", href:`${pageRoot}system-settings.html`, icon:"system", files:["system-settings.html","access-control.html"], roles:["office-admin","safety-environment-director","safety-environment-admin"]}
  ];

  const itemHtml = item => {
    const active = item.files.includes(currentFile);
    const attrs = [
      `class="nav-link${active ? " active" : ""}"`,
      `href="${item.href}"`,
      `data-unified-nav="${item.key}"`,
      active ? 'aria-current="page"' : "",
      item.permission ? `data-permission="${item.permission}"` : "",
      item.feature ? `data-feature="${item.feature}"` : "",
      item.roles ? `data-roles="${item.roles.join(",")}"` : ""
    ].filter(Boolean).join(" ");
    const text = item.note
      ? `<span class="unified-submenu__text"><strong>${item.label}</strong><small>${item.note}</small></span>`
      : `<span class="unified-submenu__text">${item.label}</span>`;
    return `<a ${attrs}><span class="nav-link__icon">${icons[item.icon]}</span>${text}</a>`;
  };

  const drawer = document.createElement("aside");
  drawer.id = "unifiedSubmenu";
  drawer.className = "side-menu unified-submenu";
  drawer.setAttribute("aria-label", "メインメニュー");
  drawer.setAttribute("aria-hidden", "true");
  drawer.innerHTML = `
    <div class="side-menu__header">
      <div class="side-menu__brand"><span class="side-menu__logo"><img src="${root}assets/images/sk-brand-logo-v82.png" alt="SK"></span><strong>メニュー</strong></div>
      <button aria-label="メニューを閉じる" class="icon-button unified-submenu__close" type="button">×</button>
    </div>
    <nav>${items.map(itemHtml).join("")}
      <div class="nav-section" aria-label="設定メニュー">
        <div class="nav-section__label">設定</div>
        ${settingsItems.map(itemHtml).join("")}
      </div>
    </nav>`;

  const backdrop = document.createElement("div");
  backdrop.className = "menu-backdrop unified-submenu-backdrop";
  backdrop.id = "unifiedSubmenuBackdrop";

  document.querySelectorAll(".system-sidebar").forEach(node => node.setAttribute("aria-hidden", "true"));
  document.body.append(drawer, backdrop);
  document.documentElement.classList.add("unified-submenu-enabled");

  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "icon-button unified-submenu__toggle";
  toggle.setAttribute("aria-label", "メニューを開く");
  toggle.setAttribute("aria-controls", drawer.id);
  toggle.setAttribute("aria-expanded", "false");
  toggle.textContent = "☰";

  const topbar = document.querySelector(".system-topbar");
  const appHeader = document.querySelector(".app-header");
  if (topbar) {
    let left = topbar.querySelector(".unified-topbar-left");
    if (!left) {
      left = document.createElement("div");
      left.className = "unified-topbar-left";
      const title = topbar.querySelector(".topbar-title");
      topbar.prepend(left);
      left.append(toggle);
      if (title) left.append(title);
    }
  } else if (appHeader) {
    appHeader.classList.add("unified-submenu-header");
    appHeader.prepend(toggle);
    const lastAction = appHeader.querySelector(":scope > a.icon-button:last-child, :scope > button.icon-button:last-child");
    lastAction?.classList.add("unified-submenu-header__end");
  } else {
    toggle.classList.add("unified-submenu__toggle--floating");
    document.body.append(toggle);
  }

  const open = () => {
    drawer.classList.add("open");
    backdrop.classList.add("visible");
    drawer.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    document.body.classList.add("unified-submenu-open");
    drawer.querySelector("a:not([hidden]),button")?.focus({preventScroll:true});
  };
  const close = (returnFocus = true) => {
    drawer.classList.remove("open");
    backdrop.classList.remove("visible");
    drawer.setAttribute("aria-hidden", "true");
    toggle.setAttribute("aria-expanded", "false");
    document.body.classList.remove("unified-submenu-open");
    if (returnFocus) toggle.focus({preventScroll:true});
  };

  toggle.addEventListener("click", open);
  drawer.querySelector(".unified-submenu__close")?.addEventListener("click", () => close());
  backdrop.addEventListener("click", () => close());
  drawer.addEventListener("click", event => {
    if (event.target.closest("a[href]")) close(false);
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && drawer.classList.contains("open")) close();
  });

  const applyVisibility = () => {
    const user = window.ISSAccess?.getCurrentUser?.() || (() => {
      try { return JSON.parse(localStorage.getItem("iss-api-user") || "null"); } catch (_error) { return null; }
    })();
    const role = user?.role || "";
    drawer.querySelectorAll("[data-permission]").forEach(node => {
      const allowed = window.ISSAccess?.can?.(node.dataset.permission);
      if (allowed === false) node.hidden = true;
    });
    drawer.querySelectorAll("[data-roles]").forEach(node => {
      const roles = String(node.dataset.roles || "").split(",").filter(Boolean);
      if (role && !roles.includes(role)) node.hidden = true;
    });
    drawer.querySelectorAll('[data-feature="overpack-label"]').forEach(node => {
      const allowed = window.ISSFeatureAccess?.canUseOverpack?.(user);
      if (allowed === false) node.hidden = true;
    });
  };
  applyVisibility();
  document.addEventListener("iss-role-ready", applyVisibility, {once:true});
})();
