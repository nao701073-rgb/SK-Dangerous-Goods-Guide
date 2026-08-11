
(() => {
  "use strict";

  const page = document.body.dataset.page || "";
  const activeMap = {
    home: "home",
    search: "search",
    detail: "search",
    ems: "ems",
    applications: "applications",
    regulations: "regulations",
    references: "references"
  };

  const active = activeMap[page] || "";
  document.querySelectorAll("[data-nav]").forEach(link => {
    link.classList.toggle("is-active", link.dataset.nav === active);
  });
  if (["detail", "regulations", "references", "ems"].includes(page)) {
    const current = document.currentScript?.src || "";
    const script = document.createElement("script");
    script.src = current ? new URL("regulation-approval-gate.js?v=508", current).toString() : "../assets/js/regulation-approval-gate.js?v=508";
    script.defer = true;
    document.head.appendChild(script);
  }

})();

window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {"assets/js/system-shell.js":"part508"});
