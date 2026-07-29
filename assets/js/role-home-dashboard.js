(() => {
  "use strict";

  const ROLE_LABELS = window.ISSAccess?.ROLE_LABELS || {};
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));

  function currentUser(){
    return window.ISSAccess?.getCurrentUser?.() || window.ISSApi?.getUser?.() || null;
  }

  function officeName(user){
    return user?.officeName || user?.office_name || window.ISSStorage?.getCurrentContext?.()?.officeName || "所属事業所";
  }

  const roleConfig = {
    "office-user": {
      title:"担当業務ホーム",
      lead:"危険物情報、関連法令、関連資料を確認し、必要に応じて申請番号に関連する写真・添付資料を整理できます。",
      links:[
        ["危険物を検索","pages/dangerous-goods-search.html"], ["関連法令を確認","pages/regulations.html"], ["関連資料を確認","pages/references.html"], ["申請番号を参照","pages/applications.html"]
      ]
    },
    "office-admin": {
      title:"事業所管理ホーム",
      lead:"所属事業所の利用者管理と、危険物情報・関連資料への導線をまとめて表示します。",
      links:[
        ["危険物を検索","pages/dangerous-goods-search.html"], ["関連資料を確認","pages/references.html"], ["利用者管理","pages/user-admin.html"], ["システム設定","pages/system-settings.html"]
      ]
    },
    "safety-environment-director": {
      title:"安全環境室 管理ホーム",
      lead:"全事業所向けの危険物情報、法令、資料を確認し、許可された設定・運用確認機能を利用します。",
      links:[
        ["危険物を検索","pages/dangerous-goods-search.html"], ["関連法令を確認","pages/regulations.html"], ["関連資料を確認","pages/references.html"], ["システム設定","pages/system-settings.html"]
      ]
    },
    "safety-environment-staff": {
      title:"安全環境室 閲覧ホーム",
      lead:"全事業所向けの危険物情報・法令・資料を閲覧できます。管理操作は行えません。",
      links:[
        ["危険物を検索","pages/dangerous-goods-search.html"], ["関連法令を確認","pages/regulations.html"], ["関連資料を確認","pages/references.html"], ["申請番号を参照","pages/applications.html"]
      ]
    },
    "safety-environment-admin": {
      title:"システム管理ホーム",
      lead:"全事業所の利用者、権限、監査、セキュリティおよび本番稼働状況を管理します。",
      links:[
        ["統合運用センター","pages/integrated-operations-center.html"], ["利用者・権限管理","pages/user-admin.html"], ["システム設定","pages/system-settings.html"], ["関連資料を確認","pages/references.html"]
      ]
    },
    "guest": {
      title:"ゲストホーム",
      lead:"危険物検索、関連法令、関連資料およびユーザー設定を利用できます。",
      links:[
        ["危険物を検索","pages/dangerous-goods-search.html"], ["関連法令を確認","pages/regulations.html"], ["関連資料を確認","pages/references.html"], ["ユーザー設定","pages/user-settings.html"]
      ]
    },
    "validator": {
      title:"検証者ホーム",
      lead:"危険物検索、関連法令、関連資料および総合検証結果を確認できます。",
      links:[
        ["総合検証","pages/integrated-verification.html"], ["危険物検索を検証","pages/dangerous-goods-search.html"], ["関連法令を検証","pages/regulations.html"], ["関連資料を検証","pages/references.html"]
      ]
    }
  };


  function permissionForHref(href){
    if (String(href).includes("applications.html")) return "applicationsRead";
    if (String(href).includes("user-admin.html")) return "officeUsers";
    if (String(href).includes("system-settings.html")) return "systemSettings";
    return "";
  }

  function availableLinks(user, links){
    const permissions = window.ISSAccess?.PERMISSIONS?.[user?.role] || {};
    return links.filter(([,href]) => {
      const permission = permissionForHref(href);
      return !permission || Boolean(permissions[permission]);
    });
  }

  function operationMode(user){
    const modes = {
      "office-user":"所属事業所での通常利用",
      "office-admin":"所属事業所の利用者管理",
      "safety-environment-director":"全事業所の確認・統括",
      "safety-environment-staff":"全事業所の閲覧専用",
      "safety-environment-admin":"システム全体の管理",
      "guest":"検索・法令・資料の限定利用",
      "validator":"検証・確認専用"
    };
    return modes[user?.role] || "通常利用";
  }

  function permissionNotes(user){
    const notes = {
      "office-user":["危険物情報・法令・資料を閲覧","申請番号管理は社内既存システムを正式な管理元として補助的に利用"],
      "office-admin":["所属事業所の利用者を管理","申請番号管理は写真・添付資料の整理を中心に補助利用"],
      "safety-environment-director":["全事業所向けの危険物情報・法令・資料を確認","許可された設定・運用確認機能を利用","申請番号の正式管理は社内既存システムを参照"],
      "safety-environment-staff":["全事業所向けの危険物情報・法令・資料を閲覧","登録・更新・削除は不可"],
      "safety-environment-admin":["全事業所・全利用者・システム設定を管理","監査・セキュリティ・運用管理を実施"],
      "guest":["危険物検索・関連法令・関連資料のみ利用","申請番号管理と管理画面は利用不可"],
      "validator":["検証対象画面と資料を閲覧","業務データの本登録・更新は不可"]
    };
    return notes[user?.role] || [];
  }

  function render(user){
    const config = roleConfig[user?.role];
    const hero = document.querySelector(".hero-card");
    if (!config || !hero || document.getElementById("roleHomeDashboard")) return;
    const section = document.createElement("section");
    section.id = "roleHomeDashboard";
    section.className = `role-home role-home--${escapeHtml(user.role)}`;
    section.innerHTML = `
      <div class="role-home__heading">
        <div><span class="role-home__badge">${escapeHtml(ROLE_LABELS[user.role] || user.role)}</span><h2>${escapeHtml(config.title)}</h2><p>${escapeHtml(config.lead)}</p></div>
        <div class="role-home__identity"><strong>${escapeHtml(user.displayName || user.name || user.loginId || "ログイン利用者")}</strong><small>${escapeHtml(officeName(user))}</small></div>
      </div>
      <div class="role-home__details">
        <div><strong>現在の利用範囲</strong><p class="role-home__mode">${escapeHtml(operationMode(user))}</p><ul>${permissionNotes(user).map(note=>`<li>${escapeHtml(note)}</li>`).join("")}</ul></div>
        <div><strong>申請番号管理の位置付け</strong><p>社内既存システムを正式な管理元とし、本システムでは参照、最低限の案件情報、関連写真、添付資料の整理に留めます。</p></div>
      </div>
      <div class="role-home__actions">${availableLinks(user, config.links).map(([label,href]) => `<a href="${href}">${escapeHtml(label)} <span aria-hidden="true">→</span></a>`).join("")}</div>`;
    hero.insertAdjacentElement("afterend", section);

    if (user.role === "safety-environment-staff") {
      document.querySelectorAll("[href*='user-admin.html'],[href*='system-settings.html']").forEach(node => node.hidden = true);
    }
  }

  document.addEventListener("iss-role-ready", event => render(event.detail?.user || currentUser()), {once:true});
  if (document.readyState !== "loading") setTimeout(() => render(currentUser()), 0);
})();
