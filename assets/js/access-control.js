(() => {
  "use strict";
  const status = document.getElementById("accessStatus");
  const matrix = document.getElementById("roleMatrix");
  const officesRoot = document.getElementById("officeAccessSummary");
  const usersRoot = document.getElementById("userAccessSummary");
  const reload = document.getElementById("reloadAccessSummary");
  const esc = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");

  const fallbackRoles = [
    { role:"guest",label:"ゲスト",applications:"利用不可",photos:"利用不可",administration:"危険物検索・法令・資料・ユーザー設定" },
    { role:"office-user",label:"事業所利用者",applications:"所属事業所の閲覧・登録・更新",photos:"所属事業所の登録・閲覧",administration:"不可" },
    { role:"office-admin",label:"事業所管理者",applications:"所属事業所の閲覧・登録・更新",photos:"所属事業所の登録・閲覧・削除",administration:"所属事業所の運用管理" },
    { role:"safety-environment-director",label:"安全環境室長",applications:"全ブロック・全事業所の登録・編集（削除不可）",photos:"全ブロック・全事業所の登録・編集（削除不可）",administration:"限定システム設定" },
    { role:"safety-environment-staff",label:"安全環境室職員",applications:"全ブロック・全事業所の閲覧",photos:"全ブロック・全事業所の閲覧",administration:"閲覧専用" },
    { role:"safety-environment-admin",label:"システム管理者",applications:"全ブロック・全事業所の閲覧・登録・更新",photos:"全ブロック・全事業所の管理",administration:"利用者・事業所・上限・監査・検証管理" }
  ];

  function renderRoles(roles) {
    matrix.innerHTML = `<table><thead><tr><th>権限</th><th>申請番号</th><th>写真</th><th>管理機能</th></tr></thead><tbody>${roles.map(item=>`<tr><td><strong>${esc(item.label)}</strong><br><code>${esc(item.role)}</code></td><td>${esc(item.applications)}</td><td>${esc(item.photos)}</td><td>${esc(item.administration)}</td></tr>`).join("")}</tbody></table>`;
  }
  function renderOffices(items) {
    officesRoot.innerHTML = items.length ? items.map(item=>`<article class="admin-summary-card"><strong>${esc(item.block_name || item.blockName || "") }｜${esc(item.office_name || item.officeName || "")}</strong><span>${Number(item.applications || item.applicationCount || 0)}件</span><small>写真 ${Number(item.photos || item.photoCount || 0)}件／利用者 ${Number(item.active_users || 0)}人</small></article>`).join("") : '<p>事業所集計はオンライン接続後に表示します。</p>';
  }
  function renderUsers(items) {
    usersRoot.innerHTML = items.length ? items.map(item=>`<article class="admin-summary-card"><strong>${esc(item.block_name || "全社")}｜${esc(item.office_name || "安全環境室")}</strong><span>${Number(item.user_count || 0)}人</span><small>${esc(item.role)}／${item.active ? "有効" : "無効"}</small></article>`).join("") : '<p>利用者集計はオンライン接続後に表示します。</p>';
  }

  async function load() {
    renderRoles(fallbackRoles);
    const localOffices = window.ISSOrganization?.getOfficeOptions?.() || [];
    renderOffices(localOffices.map(office=>({blockName:office.blockName,officeName:office.name,applicationCount:0,photoCount:0})));
    renderUsers([]);
    if (!window.ISSApi?.isConfigured()) { status.textContent="社内API接続先が未設定です。権限設計の標準値を表示しています。"; return; }
    if (!window.ISSApi?.isAuthenticated()) { status.textContent="オンラインログイン後、安全環境室の集計を取得できます。"; return; }
    status.textContent="社内サーバーから読込中…";
    try {
      const data = await window.ISSApi.accessSummary();
      renderRoles(data.roles || fallbackRoles); renderOffices(data.offices || []); renderUsers(data.users || []);
      status.textContent=`オンライン集計を取得しました（${new Date().toLocaleString("ja-JP")}）。`;
    } catch (error) { status.textContent=error.message || "権限集計を取得できませんでした。"; }
  }
  reload.addEventListener("click", load); load();
})();
