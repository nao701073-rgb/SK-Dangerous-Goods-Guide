(() => {
  "use strict";

  const imdgToggle = document.getElementById("showImdgReferences");
  const roleSelect = document.getElementById("userRole");
  const officeSelect = document.getElementById("officeId");
  const saveContextButton = document.getElementById("saveOrganizationContext");
  const layoutTwoColumn = document.getElementById("layoutTwoColumn");
  const layoutHorizontal = document.getElementById("layoutHorizontal");
  const message = document.getElementById("settingsMessage");
  const operationMode = document.getElementById("operationMode");
  const serverEndpoint = document.getElementById("serverEndpoint");
  const syncQueueCount = document.getElementById("syncQueueCount");
  const saveOnlineSettings = document.getElementById("saveOnlineSettings");
  const photoLimitPerApplication = document.getElementById("photoLimitPerApplication");
  const photoLimitPerOffice = document.getElementById("photoLimitPerOffice");
  const photoMaxFileSizeMb = document.getElementById("photoMaxFileSizeMb");
  const photoStorageLimitMb = document.getElementById("photoStorageLimitMb");
  const photoRetentionDays = document.getElementById("photoRetentionDays");
  const photoDeletedGraceDays = document.getElementById("photoDeletedGraceDays");
  const photoPurgeApprovalDays = document.getElementById("photoPurgeApprovalDays");
  const photoPurgeExecutionDays = document.getElementById("photoPurgeExecutionDays");
  const savePhotoPolicy = document.getElementById("savePhotoPolicy");
  const testServerConnection = document.getElementById("testServerConnection");
  const runSynchronization = document.getElementById("runSynchronization");
  const pullServerData = document.getElementById("pullServerData");
  const onlineConnectionStatus = document.getElementById("onlineConnectionStatus");
  const syncQueueDetails = document.getElementById("syncQueueDetails");
  const refreshSyncQueue = document.getElementById("refreshSyncQueue");
  const clearCompletedSyncQueue = document.getElementById("clearCompletedSyncQueue");

  function renderSyncQueue() {
    if (!syncQueueDetails) return;
    const queue = window.ISSStorage.getSyncQueue();
    syncQueueCount.textContent = `${queue.filter(item => ["pending", "error", "processing"].includes(item.status)).length}件`;
    if (!queue.length) { syncQueueDetails.innerHTML = '<p class="sync-queue-empty">同期キューは空です。</p>'; return; }
    syncQueueDetails.innerHTML = queue.slice().reverse().slice(0, 100).map(item => `
      <div class="sync-queue-item ${item.status === "error" ? "is-error" : ""}">
        <strong>${item.entity || ""}</strong><span>${item.action || ""}</span><code>${item.error || item.payload?.applicationNumber || item.payload?.fileName || item.id}</code><span>${item.status || "pending"}</span>
      </div>`).join("");
  }

  function showMessage(text) {
    message.textContent = text;
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => { message.textContent = ""; }, 2800);
  }

  imdgToggle.checked = window.ISSStorage.getShowImdgReferences();
  roleSelect.value = window.ISSStorage.getUserRole();
  officeSelect.innerHTML = window.ISSOrganization.getOfficeOptions().map(office =>
    `<option value="${office.id}">${office.blockName}｜${office.name}</option>`
  ).join("");
  officeSelect.value = window.ISSStorage.getOfficeId();
  operationMode.value = window.ISSStorage.getOperationMode();
  serverEndpoint.value = window.ISSStorage.getServerEndpoint();
  syncQueueCount.textContent = `${window.ISSStorage.getSyncQueue().filter(item => ["pending", "error", "processing"].includes(item.status)).length}件`;
  renderSyncQueue();
  const photoPolicy = window.ISSStorage.getPhotoPolicy();
  photoLimitPerApplication.value = photoPolicy.perApplication;
  photoLimitPerOffice.value = photoPolicy.perOffice;
  photoMaxFileSizeMb.value = photoPolicy.maxFileSizeMb;
  photoStorageLimitMb.value = photoPolicy.storageLimitMb;
  if (photoRetentionDays) photoRetentionDays.value = photoPolicy.retentionDays;
  if (photoDeletedGraceDays) photoDeletedGraceDays.value = photoPolicy.deletedGraceDays;
  if (photoPurgeApprovalDays) photoPurgeApprovalDays.value = photoPolicy.purgeApprovalDays;
  if (photoPurgeExecutionDays) photoPurgeExecutionDays.value = photoPolicy.purgeExecutionDays;

  function refreshRequirementLayout() {
    const layout = window.ISSStorage.getRequirementLayout();
    layoutTwoColumn.classList.toggle("is-active", layout === "two-column");
    layoutHorizontal.classList.toggle("is-active", layout === "horizontal");
  }
  refreshRequirementLayout();

  imdgToggle.addEventListener("change", () => {
    window.ISSStorage.setShowImdgReferences(imdgToggle.checked);
    showMessage(imdgToggle.checked ? "IMDG Code参照先を表示する設定にしました。" : "IMDG Code参照先を非表示にしました。");
  });
  layoutTwoColumn.addEventListener("click", () => {
    window.ISSStorage.setRequirementLayout("two-column");
    refreshRequirementLayout();
    showMessage("包装・運送要件を2列表示に設定しました。");
  });
  layoutHorizontal.addEventListener("click", () => {
    window.ISSStorage.setRequirementLayout("horizontal");
    refreshRequirementLayout();
    showMessage("包装・運送要件を横スクロール表示に設定しました。");
  });
  saveOnlineSettings.addEventListener("click", () => {
    const mode = window.ISSStorage.setOperationMode(operationMode.value);
    window.ISSStorage.setServerEndpoint(serverEndpoint.value);
    showMessage(mode === "offline" ? "オフライン運用に設定しました。" : mode === "hybrid" ? "ハイブリッド運用に設定しました。変更データは同期キューへ保存されます。" : "オンライン運用に設定しました。実運用には社内APIの接続が必要です。");
  });
  savePhotoPolicy.addEventListener("click", () => {
    const policy = window.ISSStorage.setPhotoPolicy({
      perApplication: photoLimitPerApplication.value,
      perOffice: photoLimitPerOffice.value,
      maxFileSizeMb: photoMaxFileSizeMb.value,
      storageLimitMb: photoStorageLimitMb.value,
      retentionDays: photoRetentionDays?.value,
      deletedGraceDays: photoDeletedGraceDays?.value,
      purgeApprovalDays: photoPurgeApprovalDays?.value,
      purgeExecutionDays: photoPurgeExecutionDays?.value
    });
    showMessage(`写真設定を保存しました（標準保存${policy.retentionDays}日、削除後保留${policy.deletedGraceDays}日、承認期限${policy.purgeApprovalDays}日、実行期限${policy.purgeExecutionDays}日）。`);
  });


  testServerConnection?.addEventListener("click", async () => {
    window.ISSStorage.setServerEndpoint(serverEndpoint.value);
    onlineConnectionStatus.textContent = "接続確認中…";
    try {
      const result = await window.ISSApi.health();
      onlineConnectionStatus.textContent = `接続済み（${new Date(result.serverTime).toLocaleString("ja-JP")}）`;
      showMessage("社内APIへ接続できました。");
    } catch (error) {
      onlineConnectionStatus.textContent = "接続失敗";
      showMessage(error.message || "社内APIへ接続できませんでした。");
    }
  });

  pullServerData?.addEventListener("click", async () => {
    window.ISSStorage.setServerEndpoint(serverEndpoint.value);
    onlineConnectionStatus.textContent = "最新データ取得中…";
    try {
      const result = await window.ISSSync.pull();
      onlineConnectionStatus.textContent = "最新データ取得完了";
      showMessage(`申請番号${result.applications}件、写真${result.photos}件を取得しました。`);
    } catch (error) {
      onlineConnectionStatus.textContent = "取得失敗";
      showMessage(error.message || "最新データを取得できませんでした。");
    }
  });

  runSynchronization?.addEventListener("click", async () => {
    window.ISSStorage.setServerEndpoint(serverEndpoint.value);
    syncQueueCount.textContent = `${window.ISSSync.getPendingCount()}件`;
    try {
      onlineConnectionStatus.textContent = "同期中…";
      const result = await window.ISSSync.run(() => {
        syncQueueCount.textContent = `${window.ISSSync.getPendingCount()}件`;
        renderSyncQueue();
      });
      syncQueueCount.textContent = `${window.ISSSync.getPendingCount()}件`;
      renderSyncQueue();
      onlineConnectionStatus.textContent = result.remaining ? `一部未同期（${result.remaining}件）` : "同期完了";
      showMessage(`${result.completed}件を同期しました。`);
    } catch (error) {
      onlineConnectionStatus.textContent = "同期失敗";
      showMessage(error.message || "同期に失敗しました。");
    }
  });

  refreshSyncQueue?.addEventListener("click", renderSyncQueue);
  clearCompletedSyncQueue?.addEventListener("click", () => { window.ISSStorage.clearCompletedSyncQueue(); renderSyncQueue(); showMessage("完了済みの同期キューを削除しました。"); });

  saveContextButton.addEventListener("click", () => {
    window.ISSStorage.setUserRole(roleSelect.value);
    window.ISSStorage.setOfficeId(officeSelect.value);
    const context = window.ISSStorage.getCurrentContext();
    showMessage(context.canViewAllOffices
      ? "安全環境室の全事業所閲覧権限を保存しました。"
      : `${context.blockName}・${context.officeName}の所属設定を保存しました。`);
  });
})();
