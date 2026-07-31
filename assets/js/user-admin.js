(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const roleLabel = role => ({
    "office-user": "一般利用者",
    "office-admin": "事業所管理者（事業所長）",
    "safety-environment-director": "安全環境室長",
    "safety-environment-staff": "安全環境室",
    "safety-environment-admin": "システム管理者",
    guest: "ゲスト",
    validator: "検証者",
    "revision-validator": "改正検証者"
  })[role] || role || "—";

  const elements = {
    userForm: $("userForm"),
    loginId: $("loginId"),
    displayName: $("displayName"),
    initialPassword: $("initialPassword"),
    role: $("role"),
    officeId: $("officeId"),
    email: $("email"),
    reload: $("reload"),
    filterForm: $("filterForm"),
    userSearch: $("userSearch"),
    roleFilter: $("roleFilter"),
    statusFilter: $("statusFilter"),
    status: $("status"),
    users: $("users"),
    pageInfo: $("pageInfo"),
    prevPage: $("prevPage"),
    nextPage: $("nextPage"),
    editDialog: $("editDialog"),
    editForm: $("editForm"),
    editUserId: $("editUserId"),
    editLoginId: $("editLoginId"),
    editDisplayName: $("editDisplayName"),
    editRole: $("editRole"),
    editOfficeId: $("editOfficeId"),
    passwordDialog: $("passwordDialog"),
    passwordForm: $("passwordForm"),
    passwordTarget: $("passwordTarget"),
    targetUserId: $("targetUserId"),
    newPassword: $("newPassword"),
    administratorPassword: $("administratorPassword")
  };

  let me = null;
  let offices = [];
  let page = 1;
  let pageCount = 1;
  let currentUsers = [];

  const roleNeedsOffice = role => ["office-user", "office-admin"].includes(role);
  const formatLastLogin = value => {
    if (!value) return '<span class="last-login-never">未ログイン</span>';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return esc(value);
    return `<time datetime="${esc(date.toISOString())}">${esc(date.toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit"
    }))}</time>`;
  };

  const fillOfficeOptions = select => {
    if (!select) return;
    select.innerHTML = offices.length
      ? offices.map(office => `<option value="${esc(office.office_id)}">${esc(office.block_name || "")}｜${esc(office.office_name || "所属未設定")}</option>`).join("")
      : '<option value="">所属事業所を取得できません</option>';
  };

  const renderUsers = data => {
    currentUsers = Array.isArray(data.users) ? data.users : [];
    page = Number(data.page || 1);
    pageCount = Number(data.pageCount || 1);

    elements.users.innerHTML = currentUsers.length
      ? currentUsers.map(user => `
        <tr>
          <td>${esc(user.display_name || user.displayName || "—")}</td>
          <td><code>${esc(user.login_id || user.loginId || "—")}</code></td>
          <td>${esc(roleLabel(user.role))}</td>
          <td>${esc(user.block_name ? `${user.block_name}｜${user.office_name || "所属未設定"}` : (user.office_name || "全社"))}</td>
          <td><span class="user-state ${user.active ? "is-active" : "is-inactive"}">${user.active ? "有効" : "無効"}</span>${user.locked_until ? '<span class="user-state is-locked">ロック中</span>' : ""}${user.mfa_required ? '<span class="user-state">MFA</span>' : ""}</td>
          <td>${formatLastLogin(user.last_login_at || user.lastLoginAt || user.last_login || user.lastLogin)}</td>
          <td>
            <button type="button" data-edit="${esc(user.id)}">ID・権限変更</button>
            <button type="button" data-pass="${esc(user.id)}" data-name="${esc(user.display_name || user.displayName || "利用者")}">PASS変更</button>
            <button type="button" data-status="${esc(user.id)}" data-active="${user.active ? "true" : "false"}">${user.active ? "無効化" : "有効化"}</button>
            ${user.locked_until ? `<button type="button" data-unlock="${esc(user.id)}">ロック解除</button>` : ""}
          </td>
        </tr>`).join("")
      : '<tr><td colspan="7">該当する利用者はいません。</td></tr>';

    elements.status.textContent = `全${Number(data.total || 0)}名中 ${currentUsers.length}名を表示`;
    elements.pageInfo.textContent = `${page} / ${pageCount}ページ`;
    elements.prevPage.disabled = page <= 1;
    elements.nextPage.disabled = page >= pageCount;
  };

  async function load() {
    elements.status.textContent = "利用者情報を読み込んでいます…";
    elements.users.innerHTML = '<tr><td colspan="7">読込中…</td></tr>';
    try {
      const data = await window.ISSApi.adminUsers({
        page,
        pageSize: 25,
        search: elements.userSearch.value.trim(),
        role: elements.roleFilter.value,
        status: elements.statusFilter.value
      });
      renderUsers(data || {});
    } catch (error) {
      const message = error?.message || "利用者情報を取得できませんでした。";
      try {
        const fallbackUsers = window.ISSApi?.localAdminUsersSnapshot?.() || [];
        renderUsers({ page: 1, pageCount: 1, total: fallbackUsers.length, users: fallbackUsers });
        elements.status.textContent = `ローカル保存データから ${fallbackUsers.length}名を表示しています。`;
      } catch (fallbackError) {
        const fallbackMessage = fallbackError?.message || message;
        elements.status.textContent = fallbackMessage;
        elements.users.innerHTML = `<tr><td colspan="7" class="user-load-error"><strong>利用者一覧を取得できませんでした。</strong><br>${esc(fallbackMessage)}<br><button type="button" data-retry-users>再試行</button></td></tr>`;
        elements.pageInfo.textContent = "—";
        elements.prevPage.disabled = true;
        elements.nextPage.disabled = true;
      }
    }
  }

  async function init() {
    if (!window.ISSApi?.isAuthenticated?.()) {
      location.href = "login.html";
      return;
    }
    me = window.ISSApi.getUser();
    if (!["office-admin", "safety-environment-admin"].includes(me?.role)) {
      alert("管理者権限が必要です。");
      location.href = "../index.html";
      return;
    }

    let organization = { offices: [] };
    try {
      organization = await window.ISSApi.organizations();
    } catch (error) {
      console.warn("所属事業所の取得に失敗しました。利用者一覧の表示を継続します。", error);
    }
    offices = Array.isArray(organization?.offices) ? organization.offices : [];
    fillOfficeOptions(elements.officeId);
    fillOfficeOptions(elements.editOfficeId);

    if (me.role === "office-admin") {
      elements.role.innerHTML = '<option value="office-user">検査員</option>';
      elements.editRole.innerHTML = '<option value="office-user">検査員</option>';
      elements.officeId.value = me.officeId || me.office_id || "";
      elements.officeId.disabled = true;
      elements.editOfficeId.disabled = true;
    }
    await load();
  }

  elements.userForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await window.ISSApi.createAdminUser({
        loginId: elements.loginId.value,
        displayName: elements.displayName.value,
        initialPassword: elements.initialPassword.value,
        role: elements.role.value,
        officeId: elements.officeId.value || null,
        email: elements.email.value || null
      });
      event.currentTarget.reset();
      if (me.role === "office-admin") elements.officeId.value = me.officeId || me.office_id || "";
      page = 1;
      await load();
      alert("利用者を登録しました。");
    } catch (error) { alert(error.message); }
  });

  elements.users.addEventListener("click", async event => {
    if (event.target.closest("[data-retry-users]")) { await load(); return; }
    const editButton = event.target.closest("[data-edit]");
    if (editButton) {
      const user = currentUsers.find(item => item.id === editButton.dataset.edit);
      if (!user) return;
      elements.editUserId.value = user.id;
      elements.editLoginId.value = user.login_id || user.loginId || "";
      elements.editDisplayName.value = user.display_name || user.displayName || "";
      elements.editRole.value = user.role;
      elements.editOfficeId.value = user.office_id || user.officeId || offices[0]?.office_id || "";
      elements.editOfficeId.disabled = me.role === "office-admin" || !roleNeedsOffice(user.role);
      elements.editDialog.showModal();
      return;
    }
    const passwordButton = event.target.closest("[data-pass]");
    if (passwordButton) {
      elements.targetUserId.value = passwordButton.dataset.pass;
      elements.passwordTarget.textContent = `${passwordButton.dataset.name} のパスワードを変更します。`;
      elements.newPassword.value = "";
      elements.administratorPassword.value = "";
      elements.passwordDialog.showModal();
      return;
    }
    const statusButton = event.target.closest("[data-status]");
    if (statusButton) {
      if (!confirm("利用者状態を変更しますか？")) return;
      try {
        await window.ISSApi.setAdminUserStatus(statusButton.dataset.status, statusButton.dataset.active !== "true");
        await load();
      } catch (error) { alert(error.message); }
      return;
    }
    const unlockButton = event.target.closest("[data-unlock]");
    if (unlockButton) {
      try {
        await window.ISSApi.unlockAdminUser(unlockButton.dataset.unlock);
        await load();
      } catch (error) { alert(error.message); }
    }
  });

  elements.editForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await window.ISSApi.updateAdminUser(elements.editUserId.value, {
        loginId: elements.editLoginId.value.trim(),
        displayName: elements.editDisplayName.value.trim(),
        role: elements.editRole.value,
        officeId: roleNeedsOffice(elements.editRole.value) ? elements.editOfficeId.value : null
      });
      elements.editDialog.close();
      await load();
      alert("ログインID・表示名・権限を変更しました。");
    } catch (error) { alert(error.message); }
  });

  elements.passwordForm.addEventListener("submit", async event => {
    event.preventDefault();
    try {
      await window.ISSApi.setAdminUserPassword(elements.targetUserId.value, elements.newPassword.value, elements.administratorPassword.value);
      elements.passwordDialog.close();
      await load();
      alert("パスワードを変更しました。");
    } catch (error) { alert(error.message); }
  });

  elements.filterForm.addEventListener("submit", event => { event.preventDefault(); page = 1; load(); });
  elements.prevPage.addEventListener("click", () => { if (page > 1) { page -= 1; load(); } });
  elements.nextPage.addEventListener("click", () => { if (page < pageCount) { page += 1; load(); } });
  elements.reload.addEventListener("click", load);
  elements.role.addEventListener("change", () => { elements.officeId.disabled = me.role === "office-admin" || !roleNeedsOffice(elements.role.value); });
  elements.editRole.addEventListener("change", () => { elements.editOfficeId.disabled = me.role === "office-admin" || !roleNeedsOffice(elements.editRole.value); });

  init().catch(error => {
    const message = error?.message || "利用者管理の初期化に失敗しました。";
    elements.status.textContent = message;
    elements.users.innerHTML = `<tr><td colspan="7" class="user-load-error">${esc(message)}</td></tr>`;
  });
})();
