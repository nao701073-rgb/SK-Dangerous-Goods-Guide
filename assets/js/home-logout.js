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
      window.ISSApi?.clearSession?.();
    } finally {
      location.replace("pages/login.html?logout=1");
    }
  });
})();
