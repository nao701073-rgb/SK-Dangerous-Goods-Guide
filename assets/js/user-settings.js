(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const message = $("settingsMessage");
  const show = text => {
    if (!message) return;
    message.textContent = text;
    clearTimeout(show.timer);
    show.timer = setTimeout(() => { message.textContent = ""; }, 2800);
  };


  const themeKey = "iss-user-app-theme";
  const themeLabels = {standard:"標準",bright:"明るい",calm:"落ち着いた",dark:"ダーク",system:"端末設定"};
  const themeButtons = [...document.querySelectorAll("[data-app-theme-option]")];
  const applyTheme = preference => {
    const resolved = preference === "system" ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "standard") : preference;
    document.documentElement.dataset.appTheme = resolved;
    document.documentElement.dataset.appThemePreference = preference;
    themeButtons.forEach(button => button.classList.toggle("is-active", button.dataset.appThemeOption === preference));
  };
  let themePreference = localStorage.getItem(themeKey) || "standard";
  applyTheme(themePreference);
  themeButtons.forEach(button => button.addEventListener("click", () => {
    themePreference = button.dataset.appThemeOption;
    localStorage.setItem(themeKey, themePreference);
    applyTheme(themePreference);
    show(`表示テーマを「${themeLabels[themePreference]}」に変更しました。`);
  }));
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { if (themePreference === "system") applyTheme("system"); });

  const imdg = $("showImdgReferences");
  const two = $("layoutTwoColumn");
  const horizontal = $("layoutHorizontal");
  const refreshLayout = () => {
    const layout = window.ISSStorage.getRequirementLayout();
    two?.classList.toggle("is-active", layout === "two-column");
    horizontal?.classList.toggle("is-active", layout === "horizontal");
  };
  if (imdg) {
    imdg.checked = window.ISSStorage.getShowImdgReferences();
    imdg.addEventListener("change", () => {
      window.ISSStorage.setShowImdgReferences(imdg.checked);
      show(imdg.checked ? "IMDG Code参照先を表示します。" : "IMDG Code参照先を非表示にしました。");
    });
  }
  two?.addEventListener("click", () => { window.ISSStorage.setRequirementLayout("two-column"); refreshLayout(); show("2列表示に設定しました。"); });
  horizontal?.addEventListener("click", () => { window.ISSStorage.setRequirementLayout("horizontal"); refreshLayout(); show("横スクロール表示に設定しました。"); });
  refreshLayout();

  const scaleKey = "dangerousGoodsGuideActualSizeScale";
  const value = $("actualSizeCalibrationValue");
  const ruler = $("actualSizeCalibrationRuler");
  let scale = Math.min(1.6, Math.max(.6, Number(localStorage.getItem(scaleKey)) || 1));
  const draw = () => {
    if (value) value.textContent = `${Math.round(scale * 100)}%`;
    if (ruler) ruler.style.width = `${50 * (96 / 25.4) * scale}px`;
  };
  $("actualSizeMinus")?.addEventListener("click", () => { scale = Math.max(.6, Math.round((scale - .02) * 100) / 100); draw(); });
  $("actualSizePlus")?.addEventListener("click", () => { scale = Math.min(1.6, Math.round((scale + .02) * 100) / 100); draw(); });
  $("actualSizeReset")?.addEventListener("click", () => { scale = 1; draw(); });
  $("saveActualSizeCalibration")?.addEventListener("click", () => { localStorage.setItem(scaleKey, String(scale)); show(`実寸補正を${Math.round(scale * 100)}%で保存しました。`); });
  draw();

  const offlineKey = "iss-user-prefer-offline";
  const preferOffline = $("preferOffline");
  if (preferOffline) {
    preferOffline.checked = localStorage.getItem(offlineKey) !== "false";
    preferOffline.addEventListener("change", () => {
      localStorage.setItem(offlineKey, String(preferOffline.checked));
      show(preferOffline.checked ? "オフライン利用を優先します。" : "クラウド接続時の同期を優先します。");
    });
  }
  const queue = window.ISSStorage.getSyncQueue?.() || [];
  if ($("userSyncQueueCount")) $("userSyncQueueCount").textContent = `${queue.filter(x => ["pending", "error", "processing"].includes(x.status)).length}件`;

  const sessionIdleKey = "iss-session-idle-minutes";
  const sessionIdle = $("sessionIdleMinutes");
  const allowedIdleMinutes = new Set([15, 30, 60, 120]);
  if (sessionIdle) {
    const stored = Number(localStorage.getItem(sessionIdleKey) || 30);
    sessionIdle.value = String(allowedIdleMinutes.has(stored) ? stored : 30);
  }
  $("saveSessionIdleMinutes")?.addEventListener("click", () => {
    const minutes = Number(sessionIdle?.value || 30);
    const safeMinutes = allowedIdleMinutes.has(minutes) ? minutes : 30;
    localStorage.setItem(sessionIdleKey, String(safeMinutes));
    localStorage.setItem("iss-last-activity", String(Date.now()));
    window.dispatchEvent(new StorageEvent("storage", { key: sessionIdleKey, newValue: String(safeMinutes) }));
    show(`無操作時の自動ログアウトを${safeMinutes}分に設定しました。終了2分前に確認を表示します。`);
  });

  const user = window.ISSApi?.getUser?.();
  const labels = window.ISSAccess?.ROLE_LABELS || {};
  const summary = $("currentUserSummary");
  if (summary && user) {
    const office = user.officeName || user.office_name || user.officeId || user.office_id || "所属未設定";
    summary.textContent = `${user.name || user.displayName || user.loginId || "利用者"}｜${office}｜${labels[user.role] || user.role || "権限未設定"}`;
  }
})();
