
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
})();
