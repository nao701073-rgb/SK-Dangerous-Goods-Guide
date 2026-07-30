(() => {
  "use strict";

  const ROLE_LABELS = {
    "office-user": "事業所利用者",
    "office-admin": "事業所管理者",
    "safety-environment-director": "安全環境室長",
    "safety-environment-staff": "安全環境室職員",
    "safety-environment-admin": "システム管理者",
    "guest": "ゲスト",
    "validator": "検証者",
    "revision-validator": "改正検証者"
  };

  const ACCESS_ROLE_DISPLAY_ORDER = [
    "office-admin",
    "office-user",
    "safety-environment-director",
    "safety-environment-staff",
    "safety-environment-admin"
  ];

  const PERMISSIONS = {
    "office-user": { applicationsRead:true, applicationsWrite:true, applicationNotesRead:true, applicationNotesWrite:true, applicationDocumentsRead:true, applicationDocumentsWrite:true, photosRead:true, photosWrite:true },
    "office-admin": { applicationsRead:true, applicationsWrite:true, applicationNotesRead:true, applicationNotesWrite:true, applicationDocumentsRead:true, applicationDocumentsWrite:true, photosRead:true, photosWrite:true, officeUsers:true },
    "safety-environment-director": { applicationsRead:true, applicationsWrite:true, applicationsAllOffices:true, applicationNotesRead:true, applicationNotesWrite:true, applicationDocumentsRead:true, applicationDocumentsWrite:true, photosRead:true, photosWrite:true, photosAllOffices:true, systemSettings:true },
    "safety-environment-staff": { applicationsRead:true, applicationsAllOffices:true, applicationNotesRead:true, applicationDocumentsRead:true, photosRead:true, photosAllOffices:true, readOnly:true },
    "safety-environment-admin": { applicationsRead:true, applicationsWrite:true, applicationsAllOffices:true, applicationNotesRead:true, applicationNotesWrite:true, applicationDocumentsRead:true, applicationDocumentsWrite:true, photosRead:true, photosWrite:true, photosAllOffices:true, systemAdmin:true },
    "guest": { userSettings:true, dangerousGoodsSearch:true, regulationsRead:true, referencesRead:true },
    "validator": { referenceRead:true, validation:true },
    "revision-validator": { dangerousGoodsSearch:true, regulationsRead:true, referencesRead:true, revisionPreview:true, validation:true }
  };

  const loginUrl = () => location.pathname.includes("/pages/") ? "login.html" : "pages/login.html";
  const settingsUrl = () => location.pathname.includes("/pages/") ? "system-settings.html" : "pages/system-settings.html";
  const homeUrl = () => location.pathname.includes("/pages/") ? "../index.html" : "index.html";
  const currentStoredUser = () => {
    const apiUser = window.ISSApi?.getUser?.();
    if (apiUser) return apiUser;
    try {
      const stored = JSON.parse(localStorage.getItem("iss-api-user") || "null");
      if (stored) return stored;
    } catch (_e) {}
    try {
      const prefix = "ISS_AUTH_BRIDGE_V1:";
      if (String(window.name || "").startsWith(prefix)) return JSON.parse(String(window.name).slice(prefix.length))?.user || null;
    } catch (_e) {}
    return null;
  };
  const requiredRoles = () => String(document.body.dataset.requiredRoles || "").split(",").map(v => v.trim()).filter(Boolean);
  const isPublicPage = () => ["login", "activate-account", "reset-password"].includes(document.body.dataset.page || "");

  const isHomePage = () => !location.pathname.includes("/pages/") && (location.pathname.endsWith("/") || location.pathname.endsWith("/index.html"));
  const isGuestAllowedPage = () => isHomePage() || [
    "user-settings", "login", "activate-account", "reset-password",
    "search", "detail", "regulations", "references", "label-catalog", "ems", "imdg-cross-reference"
  ].includes(document.body.dataset.page || "");

  function applyGuestHomeView(user) {
    if (user?.role !== "guest" || !isHomePage()) return;
    const allowedHrefs = ["dangerous-goods-search.html", "regulations.html", "references.html", "settings.html"];
    document.querySelectorAll(".module-card").forEach(card => {
      const href = card.querySelector("a[href]")?.getAttribute("href") || "";
      const allowed = allowedHrefs.some(value => href.includes(value));
      card.hidden = !allowed;
      card.setAttribute("aria-hidden", allowed ? "false" : "true");
    });
    document.querySelectorAll(".activity-grid, [href*='applications.html'], [href*='search-history.html'], [href*='favorites.html'], [href*='system-settings.html']").forEach(node => {
      const card = node.closest?.(".module-card") || node;
      card.hidden = true;
      card.setAttribute("aria-hidden", "true");
    });
    const main = document.querySelector("main");
    if (main && !document.getElementById("guestAccessNotice")) {
      const section = document.createElement("section");
      section.id = "guestAccessNotice";
      section.className = "panel guest-access-notice";
      section.innerHTML = `<div class="panel-heading"><h2>ゲスト利用</h2></div><div class="panel-body"><p>ゲストは危険物検索、関連法令、関連資料およびユーザー設定を利用できます。申請番号管理、写真、検索履歴・お気に入り、システム設定、各種管理画面は利用できません。</p></div>`;
      main.prepend(section);
    }
  }

  function roleAllowed(user, roles) {
    return !roles.length || Boolean(user && roles.includes(user.role));
  }

  function hideUnavailableNavigation(user) {
    const canReadApplications = Boolean(PERMISSIONS[user?.role]?.applicationsRead);
    document.querySelectorAll("a[href*='applications.html'], [data-nav='applications']").forEach(node => {
      const target = node.closest?.(".module-card, .nav-item, li") || node;
      target.hidden = !canReadApplications;
      target.setAttribute("aria-hidden", canReadApplications ? "false" : "true");
      if (!canReadApplications) target.setAttribute("tabindex", "-1");
      else target.removeAttribute("tabindex");
    });
  }

  function applyRoleVisibility(user) {
    document.querySelectorAll("[data-roles]").forEach(node => {
      const roles = String(node.dataset.roles || "").split(",").map(v => v.trim()).filter(Boolean);
      node.hidden = !roleAllowed(user, roles);
      node.setAttribute("aria-hidden", node.hidden ? "true" : "false");
    });

    document.querySelectorAll("[data-permission]").forEach(node => {
      const permission = node.dataset.permission;
      const allowed = Boolean(PERMISSIONS[user?.role]?.[permission]);
      node.hidden = !allowed;
      node.setAttribute("aria-hidden", node.hidden ? "true" : "false");
    });

    document.documentElement.dataset.userRole = user?.role || "anonymous";
    document.documentElement.dataset.readOnly = PERMISSIONS[user?.role]?.readOnly ? "true" : "false";
  }

  function lockAuthenticatedOrganizationSettings(user) {
    if (document.body.dataset.page !== "settings" || !user) return;
    const role = document.getElementById("userRole");
    const office = document.getElementById("officeId");
    const save = document.getElementById("saveOrganizationContext");
    if (role) {
      role.value = user.role || role.value;
      role.disabled = true;
      role.title = "ログイン中の権限は利用者管理画面で変更します。";
    }
    if (office) {
      if (user.officeId || user.office_id) office.value = user.officeId || user.office_id;
      office.disabled = true;
      office.title = "ログイン中の所属は利用者管理画面で変更します。";
    }
    if (save) save.hidden = true;
    const actions = save?.closest(".settings-actions");
    if (actions && !actions.querySelector(".authenticated-role-note")) {
      const note = document.createElement("span");
      note.className = "fixed-setting authenticated-role-note";
      note.textContent = `${ROLE_LABELS[user.role] || user.role}としてログイン中。所属・権限の変更は管理者が利用者管理画面で行います。`;
      actions.prepend(note);
    }
  }

  function showAccessDenied(user, roles) {
    const orderedRoles = roles.includes("guest-user-settings-only")
      ? roles
      : [
          ...ACCESS_ROLE_DISPLAY_ORDER.filter(role => roles.includes(role)),
          ...roles.filter(role => !ACCESS_ROLE_DISPLAY_ORDER.includes(role))
        ];
    const roleNames = orderedRoles
      .map(role => ROLE_LABELS[role] || (role === "guest-user-settings-only" ? "ユーザー設定" : role))
      .join("、");
    const returnUrl = homeUrl();
    document.title = "権限がありません｜検査・検品業務サポートシステム";
    document.body.className = "access-denied-page";
    document.body.innerHTML = `<main class="workspace access-denied-workspace" id="mainContent"><section class="panel access-denied-panel" role="alert" aria-live="assertive" aria-labelledby="accessDeniedTitle" aria-describedby="accessDeniedDescription"><div class="panel-heading"><h1 id="accessDeniedTitle" tabindex="-1">この画面を利用する権限がありません</h1></div><div class="panel-body"><p id="accessDeniedDescription" class="access-denied-description">この画面は ${roleNames} のみ利用できます。</p><p class="access-denied-actions"><a class="secondary-action access-denied-return" href="${returnUrl}">ホームに戻る</a></p></div></section></main>`;
    requestAnimationFrame(() => document.getElementById("accessDeniedTitle")?.focus());
  }

  async function resolveUser() {
    let user = currentStoredUser();
    if (window.ISSApi?.isAuthenticated?.()) {
      try {
        const data = await window.ISSApi.me();
        user = data?.user || data || user;
        if (user) localStorage.setItem("iss-api-user", JSON.stringify(user));
      } catch (error) {
        console.warn("権限情報を取得できませんでした。", error);
      }
    }
    return user;
  }

  async function initialize() {
    if (isPublicPage()) return;
    const authenticated = Boolean(window.ISSApi?.isAuthenticated?.() || sessionStorage.getItem("iss-api-token") || localStorage.getItem("iss-api-token"));
    const passwordChangeRequired = Boolean(window.ISSApi?.isPasswordChangeRequired?.());
    if (authenticated && passwordChangeRequired && !location.pathname.endsWith("/pages/change-password.html")) {
      location.href = location.pathname.includes("/pages/") ? "change-password.html" : "pages/change-password.html";
      return;
    }

    let authenticationRequired = true;
    try {
      const policy = window.ISSApi?.accessPolicy ? await window.ISSApi.accessPolicy() : { authenticationRequired:true };
      authenticationRequired = policy?.authenticationRequired !== false;
      document.documentElement.dataset.authenticationRequired = authenticationRequired ? "true" : "false";
    } catch (error) {
      console.warn("ログイン設定を取得できないため、ログイン必須として動作します。", error);
    }
    if (!authenticated && authenticationRequired) {
      const returnTo = encodeURIComponent(location.pathname + location.search + location.hash);
      location.replace(`${loginUrl()}?next=${returnTo}`);
      return;
    }

    let user = await resolveUser();
    if (!authenticated && !authenticationRequired) {
      user = { role:"guest", displayName:"未ログイン閲覧者", officeId:null, authenticationOptional:true };
      document.documentElement.dataset.authenticationOptionalGuest = "true";
    }
    const roles = requiredRoles();
    if (user?.role === "guest" && !isGuestAllowedPage()) {
      showAccessDenied(user, ["guest-user-settings-only"]);
      return;
    }
    if (roles.length && !roleAllowed(user, roles)) {
      showAccessDenied(user, roles);
      return;
    }
    applyRoleVisibility(user);
    hideUnavailableNavigation(user);
    applyGuestHomeView(user);
    lockAuthenticatedOrganizationSettings(user);
    document.dispatchEvent(new CustomEvent("iss-role-ready", { detail: { user, permissions: PERMISSIONS[user?.role] || {} } }));
  }

  window.ISSAccess = {
    ROLE_LABELS,
    PERMISSIONS,
    getCurrentUser: currentStoredUser,
    can(permission) {
      const user = currentStoredUser();
      return Boolean(PERMISSIONS[user?.role]?.[permission]);
    }
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once:true });
  else initialize();
})();
