(() => {
  "use strict";
  const form = document.getElementById("homeUnifiedSearch");
  const queryInput = document.getElementById("homeUnifiedQuery");

  function user(){ return window.ISSApi?.getUser?.() || window.ISSAccess?.getCurrentUser?.() || {}; }
  function role(){ return String(user()?.role || ""); }
  function destination(){ return form?.querySelector('input[name="homeSearchDestination"]:checked')?.value || "dangerous"; }
  function clean(value){ return String(value || "").trim(); }

  function openSearch(type, query){
    const q = encodeURIComponent(query);
    if(type === "all" || type === "features") location.href = `pages/system-wide-search.html?query=${q}&scope=${encodeURIComponent(type)}`;
    else if(type === "applications") location.href = `pages/applications.html?query=${q}`;
    else if(type === "regulations") location.href = `pages/regulations.html?query=${q}`;
    else if(type === "references") location.href = `pages/references.html?query=${q}`;
    else location.href = `pages/dangerous-goods-search.html?query=${q}`;
  }

  form?.addEventListener("submit", event => {
    event.preventDefault();
    const query = clean(queryInput?.value);
    if(!query){ queryInput?.focus(); return; }
    sessionStorage.setItem("iss-home-search-query", query);
    openSearch(destination(), query);
  });

  function simplifyForRole(){
    const currentRole = role();
    document.documentElement.dataset.homeRole = currentRole || "unknown";

    // 未完成機能は管理者・検証者だけに表示する。
    document.querySelectorAll("[data-preview-module]").forEach(card => {
      card.hidden = !["safety-environment-admin", "validator", "revision-validator"].includes(currentRole);
    });

    // ゲストは個人履歴とお気に入りを保持・表示しない。
    if(currentRole === "guest"){
      document.getElementById("homeActivitySection")?.setAttribute("hidden", "");
      document.querySelectorAll('a[href*="search-history"], .bottom-nav__item[href*="search-history"]').forEach(node => node.hidden = true);
    }

    // 利用権限のある業務支援ツールがない場合は、見出しを含む欄全体を表示しない。
    const supportSection = document.getElementById("supportToolsSection");
    if (supportSection) {
      const visibleSupportCards = [...supportSection.querySelectorAll(".module-card")].filter(card => !card.hidden && card.getAttribute("aria-hidden") !== "true");
      supportSection.hidden = visibleSupportCards.length === 0;
    }

    // 一般利用者のホームは日常利用機能を優先し、管理系リンクはメニュー側に集約する。
    const managementRoles = ["office-admin","safety-environment-director","safety-environment-staff","safety-environment-admin","validator","revision-validator"];
    document.body.classList.toggle("home-has-management-role", managementRoles.includes(currentRole));
  }

  document.addEventListener("iss-role-ready", simplifyForRole, { once:true });
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", simplifyForRole, { once:true });
  else simplifyForRole();
})();
