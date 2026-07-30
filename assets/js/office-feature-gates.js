(() => {
  "use strict";

  const OVERPACK_ALLOWED_OFFICE = "office-yokohama-daikoku";
  const OVERPACK_ALLOWED_ROLES = new Set([
    "safety-environment-director",
    "safety-environment-staff",
    "safety-environment-admin",
    "validator"
  ]);

  function currentUser() {
    try {
      if (window.ISSApi?.getUser?.()) return window.ISSApi.getUser();
    } catch (_error) {}
    try {
      const stored = JSON.parse(localStorage.getItem("iss-api-user") || "null");
      if (stored) return stored;
    } catch (_error) {}
    try {
      const prefix = "ISS_AUTH_BRIDGE_V1:";
      if (String(window.name || "").startsWith(prefix)) {
        return JSON.parse(String(window.name).slice(prefix.length))?.user || null;
      }
    } catch (_error) {}
    return null;
  }

  function officeIdOf(user) {
    return String(user?.officeId || user?.office_id || "").trim();
  }

  function canUseOverpack(user = currentUser()) {
    if (!user) return false;
    return OVERPACK_ALLOWED_ROLES.has(user.role) || officeIdOf(user) === OVERPACK_ALLOWED_OFFICE;
  }

  function applyOverpackVisibility() {
    const allowed = canUseOverpack();
    document.querySelectorAll('[data-feature="overpack-label"]').forEach(node => {
      node.hidden = !allowed;
      node.setAttribute('aria-hidden', allowed ? 'false' : 'true');
    });
  }

  function renderDenied() {
    document.title = '権限がありません｜検査・検品業務サポートシステム';
    document.body.className = 'access-denied-page';
    document.body.innerHTML = `
      <main class="workspace access-denied-workspace" id="mainContent">
        <section class="panel access-denied-panel" role="alert" aria-live="assertive" aria-labelledby="accessDeniedTitle">
          <div class="panel-heading"><h1 id="accessDeniedTitle" tabindex="-1">この画面を利用する権限がありません</h1></div>
          <div class="panel-body">
            <p class="access-denied-description">オーバーパック標札・品名等の表示作成は、横浜大黒事業所の利用者、または安全環境室長・安全環境室職員・システム管理者・検証者のみ利用できます。</p>
            <p class="access-denied-actions"><a class="secondary-action access-denied-return" href="../index.html">ホームに戻る</a></p>
          </div>
        </section>
      </main>`;
    requestAnimationFrame(() => document.getElementById('accessDeniedTitle')?.focus());
  }

  window.ISSFeatureAccess = {
    currentUser,
    canUseOverpack,
    overpackAllowedOffice: OVERPACK_ALLOWED_OFFICE,
    overpackAllowedRoles: [...OVERPACK_ALLOWED_ROLES]
  };

  document.addEventListener('DOMContentLoaded', () => {
    applyOverpackVisibility();
    if (document.body?.dataset?.page === 'overpack-label-tool' && !canUseOverpack()) {
      renderDenied();
    }
  });
})();
