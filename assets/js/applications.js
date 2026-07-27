(() => {
  "use strict";

  const form = document.getElementById("applicationForm");
  const filter = document.getElementById("applicationFilter");
  const statusFilter = document.getElementById("applicationStatusFilter");
  const exportButton = document.getElementById("exportApplicationsCsv");
  const list = document.getElementById("applicationList");
  const message = document.getElementById("applicationMessage");
  const scopeSelect = document.getElementById("applicationScope");
  const officeFilter = document.getElementById("applicationOfficeFilter");
  const registrationOffice = document.getElementById("registrationOffice");
  const registrationOfficeField = document.getElementById("registrationOfficeField");
  const roleBadge = document.getElementById("currentRoleBadge");
  const officeSummary = document.getElementById("officeSummary");
  const editingId = document.getElementById("editingApplicationId");
  const submitButton = document.getElementById("applicationSubmitButton");
  const cancelEditButton = document.getElementById("applicationEditCancel");

  const fields = {
    applicationNumber: document.getElementById("applicationNumber"),
    shipper: document.getElementById("shipperName"),
    cargoName: document.getElementById("cargoName"),
    status: document.getElementById("applicationStatus"),
    note: document.getElementById("applicationNote")
  };

  const statusLabels = {
    active: "受付・作業中",
    review: "確認中",
    completed: "完了",
    archived: "保管"
  };

  const escapeHtml = value => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const formatDate = iso => {
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  const roleLabels = {
    "safety-environment-director": "安全環境室長｜全事業所登録・編集（削除不可）",
    "safety-environment-staff": "安全環境室職員｜全事業所閲覧",
    "safety-environment-admin": "システム管理者｜全事業所管理"
  };

  function canWrite() {
    return window.ISSStorage.canWriteOperationalData?.() !== false;
  }

  function canDelete() {
    return window.ISSStorage.canDeleteOperationalData?.() !== false;
  }

  function populateOrganizationControls() {
    const offices = window.ISSOrganization.getOfficeOptions();
    const current = window.ISSStorage.getCurrentContext();
    const options = offices.map(office =>
      `<option value="${escapeHtml(office.id)}">${escapeHtml(office.blockName)}｜${escapeHtml(office.name)}</option>`
    ).join("");

    officeFilter.innerHTML = `<option value="">すべての事業所</option>${options}`;
    registrationOffice.innerHTML = options;
    officeFilter.value = current.officeId;
    registrationOffice.value = current.officeId;

    const isAdmin = current.canViewAllOffices;
    const writable = canWrite();
    scopeSelect.value = isAdmin ? "all" : "office";
    scopeSelect.querySelector('option[value="all"]').disabled = !isAdmin;
    officeFilter.disabled = !isAdmin;
    registrationOffice.disabled = !isAdmin || !writable;
    registrationOfficeField.hidden = !isAdmin || !writable;
    roleBadge.textContent = roleLabels[current.role] || `${current.blockName}｜${current.officeName}`;
    form.hidden = !writable;
    document.getElementById("applicationPhotoSection")?.toggleAttribute("hidden", !writable);
    if (!writable) showMessage("閲覧専用権限です。全事業所の申請番号と写真を閲覧できます。登録・編集・削除はできません。");
    else if (!canDelete()) showMessage("安全環境室長は全事業所の申請番号・写真を登録・編集できます。削除はできません。");
  }

  function currentApplications() {
    const isAdmin = window.ISSStorage.isSafetyEnvironment();
    if (isAdmin && scopeSelect.value === "all") {
      const all = window.ISSStorage.getApplications({ scope: "all" });
      return officeFilter.value ? all.filter(item => item.officeId === officeFilter.value) : all;
    }
    return window.ISSStorage.getApplications({ scope: "office", officeId: window.ISSStorage.getOfficeId() });
  }

  function filteredApplications() {
    const query = filter.value.trim().toLowerCase();
    const selectedStatus = statusFilter?.value || "";
    return currentApplications().filter(item => {
      if (selectedStatus && item.status !== selectedStatus) return false;
      const haystack = [item.applicationNumber, item.shipper, item.cargoName, item.note, item.office, item.blockName]
        .join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }

  function renderSummary() {
    const isAdmin = window.ISSStorage.isSafetyEnvironment();
    const summaries = window.ISSStorage.getOfficeApplicationSummary();
    const visible = isAdmin ? summaries : summaries.filter(item => item.officeId === window.ISSStorage.getOfficeId());
    officeSummary.innerHTML = visible.map(item => `
      <article class="office-summary-card">
        <strong>${escapeHtml(item.officeName)}</strong>
        <span>${item.applicationCount}</span>
        <small>申請番号／写真 ${item.photoCount}件</small>
      </article>
    `).join("");
  }

  function resetEditMode() {
    editingId.value = "";
    form.reset();
    fields.status.value = "active";
    registrationOffice.value = window.ISSStorage.getOfficeId();
    registrationOffice.disabled = !window.ISSStorage.isSafetyEnvironment() || !canWrite();
    fields.applicationNumber.disabled = false;
    submitButton.textContent = "登録";
    cancelEditButton.hidden = true;
  }

  function beginEdit(id) {
    const item = currentApplications().find(record => record.id === id);
    if (!item) return;
    editingId.value = item.id;
    fields.applicationNumber.value = item.applicationNumber || "";
    fields.shipper.value = item.shipper || "";
    fields.cargoName.value = item.cargoName || "";
    fields.status.value = item.status || "active";
    fields.note.value = item.note || "";
    registrationOffice.value = item.officeId || window.ISSStorage.getOfficeId();
    registrationOffice.disabled = true;
    submitButton.textContent = "更新";
    cancelEditButton.hidden = false;
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function render() {
    const applications = filteredApplications();
    renderSummary();

    if (!applications.length) {
      list.innerHTML = `
        <div class="empty-state">
          <strong>対象の申請番号は登録されていません</strong>
          <p>表示範囲、進捗状況または検索条件を確認してください。</p>
        </div>`;
      return;
    }

    const allPhotos = window.ISSStorage.getPhotos({ scope: window.ISSStorage.isSafetyEnvironment() ? "all" : "office" });
    list.innerHTML = applications.map(item => {
      const photoCount = allPhotos.filter(photo => photo.applicationId === item.id).length;
      return `
      <article class="application-card">
        <div class="application-card__header">
          <div>
            <span class="application-number">${escapeHtml(item.applicationNumber)}</span>
            <h3>${escapeHtml(item.cargoName || "貨物名未登録")}</h3>
            <p>${escapeHtml(item.shipper || "荷主未登録")}</p>
            <span class="application-card__office">${escapeHtml(item.blockName)}｜${escapeHtml(item.office)}</span>
          </div>
          <span class="record-status" data-status="${escapeHtml(item.status || "active")}">${escapeHtml(statusLabels[item.status] || item.status || "受付・作業中")}</span>
        </div>
        <dl class="application-meta">
          <div><dt>事業所</dt><dd>${escapeHtml(item.office || "")}</dd></div>
          <div><dt>登録日時</dt><dd>${escapeHtml(formatDate(item.createdAt))}</dd></div>
          <div><dt>更新日時</dt><dd>${escapeHtml(formatDate(item.updatedAt || item.createdAt))}</dd></div>
          <div><dt>写真</dt><dd>${photoCount}枚</dd></div>
        </dl>
        <p class="application-note">${escapeHtml(item.note || "メモなし")}</p>
        ${canWrite() ? `<div class="management-actions">
          <button data-select-photo-application="${escapeHtml(item.id)}" type="button">写真を登録</button>
          <button data-edit-application="${escapeHtml(item.id)}" type="button">編集</button>
          ${canDelete() ? `<button data-delete-application="${escapeHtml(item.id)}" class="danger-action" type="button">削除</button>` : `<span class="record-status">削除不可</span>`}
        </div>` : `<div class="management-actions"><span class="record-status">閲覧専用</span></div>`}
      </article>`;
    }).join("");

    document.querySelectorAll("[data-select-photo-application]").forEach(button => {
      button.addEventListener("click", () => {
        const photoSelect = document.getElementById("photoApplication");
        if (photoSelect) {
          photoSelect.value = button.dataset.selectPhotoApplication || "";
          photoSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
        document.getElementById("applicationPhotoSection")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });

    document.querySelectorAll("[data-edit-application]").forEach(button => {
      button.addEventListener("click", () => beginEdit(button.dataset.editApplication));
    });

    document.querySelectorAll("[data-delete-application]").forEach(button => {
      button.addEventListener("click", () => {
        if (!confirm("この申請番号を削除しますか。関連写真は申請番号との関連が解除されます。")) return;
        window.ISSStorage.removeApplication(button.dataset.deleteApplication);
        window.dispatchEvent(new CustomEvent("iss:applications-changed"));
        render();
      });
    });
  }

  function csvEscape(value) {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  }

  function exportCsv() {
    const rows = filteredApplications();
    if (!rows.length) return alert("出力できる申請番号がありません。");
    const photos = window.ISSStorage.getPhotos({ scope: window.ISSStorage.isSafetyEnvironment() ? "all" : "office" });
    const table = [["ブロック", "事業所", "申請番号", "荷主", "貨物名", "進捗状況", "写真枚数", "メモ", "登録日時", "更新日時"]];
    rows.forEach(item => table.push([
      item.blockName, item.office, item.applicationNumber, item.shipper, item.cargoName,
      statusLabels[item.status] || item.status,
      photos.filter(photo => photo.applicationId === item.id).length,
      item.note, item.createdAt, item.updatedAt
    ]));
    const blob = new Blob(["\ufeff" + table.map(row => row.map(csvEscape).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `申請番号一覧_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    try {
      if (editingId.value) {
        window.ISSStorage.updateApplication(editingId.value, {
          applicationNumber: fields.applicationNumber.value,
          shipper: fields.shipper.value,
          cargoName: fields.cargoName.value,
          status: fields.status.value,
          note: fields.note.value
        });
        showMessage("申請番号を更新しました。");
      } else {
        window.ISSStorage.addApplication({
          applicationNumber: fields.applicationNumber.value,
          shipper: fields.shipper.value,
          cargoName: fields.cargoName.value,
          status: fields.status.value,
          note: fields.note.value,
          officeId: registrationOffice.value
        });
        showMessage("申請番号を登録しました。");
      }
      resetEditMode();
      window.dispatchEvent(new CustomEvent("iss:applications-changed"));
      render();
    } catch (error) {
      showMessage(error.message || "登録・更新に失敗しました。", true);
    }
  });

  cancelEditButton.addEventListener("click", resetEditMode);
  filter.addEventListener("input", render);
  statusFilter?.addEventListener("change", render);
  exportButton?.addEventListener("click", exportCsv);
  scopeSelect.addEventListener("change", () => {
    officeFilter.disabled = scopeSelect.value !== "all";
    if (scopeSelect.value !== "all") officeFilter.value = window.ISSStorage.getOfficeId();
    render();
  });
  officeFilter.addEventListener("change", render);
  window.addEventListener("iss:applications-changed", render);

  populateOrganizationControls();
  resetEditMode();
  render();
})();
