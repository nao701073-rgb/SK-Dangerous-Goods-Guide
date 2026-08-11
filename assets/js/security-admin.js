(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  const roleLabel = role => ({
    "office-user": "検査員",
    "office-admin": "事業所管理者（事業所長）",
    "safety-environment-admin": "管理者",
    guest: "ゲスト",
    validator: "検証者"
  })[role] || role;

  let currentLogs = [];


  async function loadPhase1Preflight() {
    const overall = $("phase1Overall");
    const container = $("phase1Checks");
    overall.textContent = "診断中…";
    overall.dataset.state = "working";
    container.innerHTML = "";
    try {
      const data = await ISSApi.preflight();
      const stateLabel = data.status === "ready" ? "必須項目は合格" : data.status === "warning" ? "必須項目は合格・推奨項目に注意" : "必須項目に未合格あり";
      overall.textContent = `${stateLabel}（必須 ${data.requiredFailed || 0}件／推奨 ${data.recommendedFailed || 0}件）`;
      overall.dataset.state = data.status || "unknown";
      container.innerHTML = (data.checks || []).map(item => `
        <article class="phase1-check ${item.ok ? "is-ok" : item.severity === "required" ? "is-failed" : "is-warning"}">
          <div class="phase1-check__heading"><strong>${esc(item.label)}</strong><span>${item.ok ? "合格" : item.severity === "required" ? "未合格" : "要確認"}</span></div>
          <p>${esc(item.detail)}</p>
        </article>`).join("");
    } catch (error) {
      overall.textContent = error.message;
      overall.dataset.state = "failed";
    }
  }

  async function loadUsers() {
    const me = ISSApi.getUser();
    if (!["office-admin", "safety-environment-admin"].includes(me?.role)) {
      alert("管理者権限が必要です。");
      location.href = "../index.html";
      return;
    }

    const data = await ISSApi.adminUsers();
    $("users").innerHTML = (data.users || []).map(user => `
      <tr>
        <td>${esc(user.display_name)}</td>
        <td>${esc(user.login_id)}</td>
        <td>${esc(roleLabel(user.role))}</td>
        <td>${esc(user.office_name || "全社")}</td>
        <td>${user.last_login_at ? new Date(user.last_login_at).toLocaleString("ja-JP") : "未ログイン"}</td>
        <td><button data-logout="${user.id}">強制ログアウト</button></td>
      </tr>`).join("");
  }

  async function loadLogs(event) {
    event?.preventDefault();
    $("status").textContent = "読込中…";
    const data = await ISSApi.auditLogs({
      action: $("action").value,
      from: $("from").value,
      to: $("to").value,
      limit: $("limit").value
    });
    currentLogs = data.logs || [];
    $("logs").innerHTML = currentLogs.map(log => `
      <tr>
        <td>${new Date(log.created_at).toLocaleString("ja-JP")}</td>
        <td>${esc(log.display_name || log.login_id || "")}</td>
        <td>${esc(log.office_name || log.office_id || "")}</td>
        <td>${esc(log.action)}</td>
        <td>${esc(log.entity_type)} ${esc(log.entity_id || "")}</td>
        <td>${esc(log.ip_address || "")}</td>
      </tr>`).join("") || '<tr><td colspan="6">該当するログはありません。</td></tr>';
    $("status").textContent = `${currentLogs.length}件`;
  }

  $("users").addEventListener("click", async event => {
    const button = event.target.closest("[data-logout]");
    if (!button || !confirm("対象利用者を強制ログアウトしますか？")) return;
    try {
      await ISSApi.forceLogoutUser(button.dataset.logout);
      alert("ログイン状態を終了しました。");
    } catch (error) {
      alert(error.message);
    }
  });

  $("exportCsv").addEventListener("click", () => {
    const quote = value => `"${String(value ?? "").replaceAll('"', '""')}"`;
    const rows = [
      ["日時", "利用者", "ログインID", "事業所", "操作", "対象種別", "対象ID", "IP"],
      ...currentLogs.map(log => [
        log.created_at, log.display_name, log.login_id, log.office_name || log.office_id,
        log.action, log.entity_type, log.entity_id, log.ip_address
      ])
    ];
    const csv = "\ufeff" + rows.map(row => row.map(quote).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const anchor = document.createElement("a");
    anchor.href = URL.createObjectURL(blob);
    anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(anchor.href);
  });

  $("runPhase1Preflight")?.addEventListener("click", loadPhase1Preflight);
  $("filters").addEventListener("submit", loadLogs);
  $("loadUsers").addEventListener("click", loadUsers);
  Promise.all([loadPhase1Preflight(), loadUsers(), loadLogs()]).catch(error => alert(error.message));
})();
