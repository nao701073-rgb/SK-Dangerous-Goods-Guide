(() => {
  "use strict";

  const button = document.getElementById("homeLogoutButton");
  if (!button) return;

  button.addEventListener("click", () => {
    const accepted = window.confirm("ログアウトします。よろしいですか？");
    if (!accepted) return;

    button.disabled = true;
    button.setAttribute("aria-busy", "true");

    try {
      if (window.ISSApi?.clearSession) window.ISSApi.clearSession();
      else {
        sessionStorage.removeItem("iss-api-token");
        localStorage.removeItem("iss-api-token");
        localStorage.removeItem("iss-api-user");
        localStorage.removeItem("iss-password-change-required");
        if (String(window.name || "").startsWith("ISS_AUTH_BRIDGE_V1:")) window.name = "";
      }
    } finally {
      location.replace("pages/login.html?logout=1");
    }
  });
})();
