
(() => {
  "use strict";

  const form = document.getElementById("emsLookupForm");
  const input = document.getElementById("emsUnInput");
  const result = document.getElementById("emsLookupResult");
  const fireList = document.getElementById("fireCodeList");
  const spillageList = document.getElementById("spillageCodeList");
  const data = Array.isArray(window.UN_DATABASE) ? window.UN_DATABASE : [];

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalizeUn = value =>
    String(value || "").replace(/\D/g, "").padStart(4, "0");

  const fireCodes = window.EMS_SCHEDULE_MASTER?.fireSchedules || [];
  const spillageCodes = window.EMS_SCHEDULE_MASTER?.spillageSchedules || [];

  fireList.innerHTML = fireCodes
    .map(item => `<span class="ems-chip">${escapeHtml(item.code)}</span>`)
    .join("");

  spillageList.innerHTML = spillageCodes
    .map(item => `<span class="ems-chip">${escapeHtml(item.code)}</span>`)
    .join("");

  function lookup() {
    const un = normalizeUn(input.value);
    const record =
      data.find(item => item.unNumber === un) ||
      { unNumber: un, properShippingNameJa: "", properShippingName: "", ems: "" };

    const ems = window.EMSResolver.resolve(record);

    if (ems.status !== "resolved") {
      result.innerHTML = `
        <div class="empty-state">
          <strong>UN${escapeHtml(un)}のEmSコードを確認できませんでした</strong>
          <p>入力値または収録索引を確認してください。</p>
        </div>
      `;
      return;
    }

    result.innerHTML = `
      <article class="ems-result-card">
        <div>
          <span class="un-number">UN${escapeHtml(un)}</span>
          <h2>${escapeHtml(record.properShippingNameJa || "品名データ未収録")}</h2>
          <p>${escapeHtml(record.properShippingName || "")}</p>
        </div>

        <div class="ems-result-codes">
          <div class="ems-result-code">
            <span>Fire Schedule</span>
            <strong>${escapeHtml(ems.fireCode)}</strong>
          </div>
          <div class="ems-result-code">
            <span>Spillage Schedule</span>
            <strong>${escapeHtml(ems.spillageCode)}</strong>
          </div>
        </div>

        <small>
          出典：${escapeHtml(ems.source)}／IMDG Code Amendment
          ${escapeHtml(ems.imdgAmendment)}
        </small>
      </article>
    `;
  }

  form.addEventListener("submit", event => {
    event.preventDefault();
    lookup();
  });
})();
