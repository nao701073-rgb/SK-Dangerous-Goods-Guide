(() => {
  "use strict";

  const ROLE_MODES = {
    "office-user": {
      scope: "所属事業所",
      actions: "簡易メモ・関連写真・添付資料の登録と更新",
      description: "所属事業所の申請番号に、写真・簡易メモ・添付資料を追加できます。"
    },
    "office-admin": {
      scope: "所属事業所",
      actions: "所属事業所の補完情報の登録・更新・確認",
      description: "所属事業所の利用者と同じ補完操作に加え、事業所内の登録状況を確認できます。"
    },
    "safety-environment-director": {
      scope: "全事業所",
      actions: "全事業所の補完情報の参照・登録・更新",
      description: "全事業所の申請番号を対象に、写真・簡易メモ・添付資料を確認し、必要な補完情報を登録できます。"
    },
    "safety-environment-staff": {
      scope: "全事業所",
      actions: "写真・簡易メモ・添付資料の閲覧",
      description: "全事業所の補完情報を閲覧できます。登録・編集・取消は行えません。",
      readOnly: true
    },
    "safety-environment-admin": {
      scope: "全事業所",
      actions: "全事業所の補完情報と運用設定の管理",
      description: "全事業所の補完情報を登録・更新し、システム全体の運用を管理できます。"
    }
  };

  function currentUser() {
    return window.ISSAccess?.getCurrentUser?.() || window.ISSApi?.getUser?.() || null;
  }

  function applyMode(user) {
    const role = user?.role || "";
    const mode = ROLE_MODES[role];
    if (!mode) return;

    const labels = window.ISSAccess?.ROLE_LABELS || {};
    const setText = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };
    setText("applicationRoleName", labels[role] || role);
    setText("applicationRoleScope", mode.scope);
    setText("applicationRoleActions", mode.actions);
    setText("applicationRoleModeDescription", mode.description);

    document.documentElement.dataset.applicationRoleMode = role;
    if (!mode.readOnly) return;

    const quickSave = document.getElementById("quickSaveMemo");
    const quickPhoto = document.getElementById("quickAddPhoto");
    const quickDocument = document.getElementById("quickAddDocument");
    const quickCreate = document.getElementById("quickCreateApplication");
    [quickSave, quickPhoto, quickDocument, quickCreate].forEach(node => {
      if (!node) return;
      node.hidden = true;
      node.disabled = true;
    });
    const memo = document.getElementById("quickApplicationMemo");
    if (memo) {
      memo.readOnly = true;
      memo.setAttribute("aria-readonly", "true");
    }
    const form = document.getElementById("applicationForm");
    if (form) form.hidden = true;
    const notice = document.createElement("p");
    notice.className = "application-readonly-note";
    notice.textContent = "この権限では、申請番号に紐づく写真・簡易メモ・添付資料を閲覧できます。登録や変更はできません。";
    document.getElementById("applicationRoleMode")?.after(notice);
  }

  document.addEventListener("iss-role-ready", event => applyMode(event.detail?.user || currentUser()), { once: true });
  if (document.readyState !== "loading") {
    const user = currentUser();
    if (user) applyMode(user);
  }
})();
