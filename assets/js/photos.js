(() => {
  "use strict";

  const form = document.getElementById("photoForm");
  const applicationSelect = document.getElementById("photoApplication");
  const applicationFilter = document.getElementById("photoApplicationFilter");
  const fileInput = document.getElementById("photoFile");
  const resizeSelect = document.getElementById("photoResize");
  const representativeInput = document.getElementById("photoRepresentative");
  const keepGpsInput = document.getElementById("photoKeepGps");
  const preview = document.getElementById("photoPreview");
  const previewPlaceholder = document.getElementById("photoPreviewPlaceholder");
  const previewDropZone = document.getElementById("photoPreviewDropZone");
  const shootingAt = document.getElementById("shootingAt");
  const registeredBy = document.getElementById("registeredBy");
  const comment = document.getElementById("photoComment");
  const message = document.getElementById("photoMessage");
  const filter = document.getElementById("photoFilter");
  const list = document.getElementById("photoList");
  const policyInfo = document.getElementById("photoPolicyInfo");
  const optimizationInfo = document.getElementById("photoOptimizationInfo");
  const originalInfo = document.getElementById("photoOriginalInfo");
  const savedInfo = document.getElementById("photoSavedInfo");
  const reductionInfo = document.getElementById("photoReductionInfo");
  const limitInfo = document.getElementById("photoLimitInfo");
  const duplicateInfo = document.getElementById("photoDuplicateInfo");
  const capturedAtInfo = document.getElementById("photoCapturedAtInfo");
  const gpsInfo = document.getElementById("photoGpsInfo");
  const metadataInfo = document.getElementById("photoMetadataInfo");
  const exportPhotosCsvButton = document.getElementById("exportPhotosCsv");
  const showDeletedPhotos = document.getElementById("showDeletedPhotos");
  const photoAuditFilter = document.getElementById("photoAuditFilter");
  const photoAuditApplicationFilter = document.getElementById("photoAuditApplicationFilter");
  const exportPhotoAuditCsvButton = document.getElementById("exportPhotoAuditCsv");
  const photoAuditList = document.getElementById("photoAuditList");
  const photoRetentionFilter = document.getElementById("photoRetentionFilter");
  const photoRetentionSummary = document.getElementById("photoRetentionSummary");
  const photoRetentionList = document.getElementById("photoRetentionList");
  const exportPhotoRetentionCsvButton = document.getElementById("exportPhotoRetentionCsv");
  const photoStorageDashboard = document.getElementById("photoStorageDashboard");
  const photoRetentionBulkActions = document.getElementById("photoRetentionBulkActions");
  const selectAllPurgeCandidates = document.getElementById("selectAllPurgeCandidates");
  const photoPurgeReason = document.getElementById("photoPurgeReason");
  const photoPurgeAssignedApprover = document.getElementById("photoPurgeAssignedApprover");
  const createPhotoPurgePlanButton = document.getElementById("createPhotoPurgePlan");
  const photoPurgeNotificationSummary = document.getElementById("photoPurgeNotificationSummary");
  const photoPurgeStatusFilter = document.getElementById("photoPurgeStatusFilter");
  const photoPurgeAssigneeFilter = document.getElementById("photoPurgeAssigneeFilter");
  const photoPurgeUnacknowledgedOnly = document.getElementById("photoPurgeUnacknowledgedOnly");
  const exportPhotoPurgeNotificationsButton = document.getElementById("exportPhotoPurgeNotifications");
  const photoPurgePlanList = document.getElementById("photoPurgePlanList");
  const exportPhotoPurgePlansButton = document.getElementById("exportPhotoPurgePlans");
  const exportPhotoPurgeCertificatesButton = document.getElementById("exportPhotoPurgeCertificates");
  const photoPurgeCertificateFile = document.getElementById("photoPurgeCertificateFile");
  const verifyPhotoPurgeCertificateButton = document.getElementById("verifyPhotoPurgeCertificate");
  const exportPhotoPurgeVerificationButton = document.getElementById("exportPhotoPurgeVerification");
  const photoPurgeVerificationResult = document.getElementById("photoPurgeVerificationResult");
  const photoPurgeCertificateLedgerFilter = document.getElementById("photoPurgeCertificateLedgerFilter");
  const photoPurgeCertificateLedgerStatus = document.getElementById("photoPurgeCertificateLedgerStatus");
  const photoPurgeCertificateLedgerSummary = document.getElementById("photoPurgeCertificateLedgerSummary");
  const photoPurgeCertificateLedgerList = document.getElementById("photoPurgeCertificateLedgerList");
  const exportPhotoPurgeCertificateLedgerButton = document.getElementById("exportPhotoPurgeCertificateLedger");
  const photoPurgeMonthlyMonth = document.getElementById("photoPurgeMonthlyMonth");
  const photoPurgeMonthlyOffice = document.getElementById("photoPurgeMonthlyOffice");
  const photoPurgeMonthlyIssuesOnly = document.getElementById("photoPurgeMonthlyIssuesOnly");
  const photoPurgeMonthlySummary = document.getElementById("photoPurgeMonthlySummary");
  const photoPurgeMonthlyOfficeList = document.getElementById("photoPurgeMonthlyOfficeList");
  const photoPurgeMonthlyIssueList = document.getElementById("photoPurgeMonthlyIssueList");
  const exportPhotoPurgeMonthlyCsvButton = document.getElementById("exportPhotoPurgeMonthlyCsv");
  const exportPhotoPurgeMonthlyJsonButton = document.getElementById("exportPhotoPurgeMonthlyJson");
  const photoPurgeCorrectiveStatus = document.getElementById("photoPurgeCorrectiveStatus");
  const photoPurgeCorrectiveFilter = document.getElementById("photoPurgeCorrectiveFilter");
  const photoPurgeCorrectiveSummary = document.getElementById("photoPurgeCorrectiveSummary");
  const photoPurgeCorrectiveList = document.getElementById("photoPurgeCorrectiveList");
  const exportPhotoPurgeCorrectiveCsvButton = document.getElementById("exportPhotoPurgeCorrectiveCsv");
  const exportPhotoPurgeCorrectiveMonthlyJsonButton = document.getElementById("exportPhotoPurgeCorrectiveMonthlyJson");
  const exportCorrectiveEvidenceAccessCsvButton = document.getElementById("exportCorrectiveEvidenceAccessCsv");
  const runCorrectiveEvidenceAuditButton = document.getElementById("runCorrectiveEvidenceAudit");
  const exportCorrectiveEvidenceAuditCsvButton = document.getElementById("exportCorrectiveEvidenceAuditCsv");
  const exportCorrectiveEvidenceAuditMonthlyJsonButton = document.getElementById("exportCorrectiveEvidenceAuditMonthlyJson");
  const correctiveEvidenceAuditSummary = document.getElementById("correctiveEvidenceAuditSummary");
  const correctiveEvidenceAuditStatus = document.getElementById("correctiveEvidenceAuditStatus");
  const correctiveEvidenceAuditFilter = document.getElementById("correctiveEvidenceAuditFilter");
  const correctiveEvidenceAuditList = document.getElementById("correctiveEvidenceAuditList");
  const auditRulePermissionDenied = document.getElementById("auditRulePermissionDenied");
  const auditRuleMissingReason = document.getElementById("auditRuleMissingReason");
  const auditRuleBulkDownload = document.getElementById("auditRuleBulkDownload");
  const auditRuleWindowMinutes = document.getElementById("auditRuleWindowMinutes");
  const auditRuleMediumThreshold = document.getElementById("auditRuleMediumThreshold");
  const auditRuleHighThreshold = document.getElementById("auditRuleHighThreshold");
  const auditRuleLookbackHours = document.getElementById("auditRuleLookbackHours");
  const auditRuleChangeReason = document.getElementById("auditRuleChangeReason");
  const simulateCorrectiveEvidenceAuditRulesButton = document.getElementById("simulateCorrectiveEvidenceAuditRules");
  const createCorrectiveEvidenceAuditRuleProposalButton = document.getElementById("createCorrectiveEvidenceAuditRuleProposal");
  const auditRuleReleaseMode = document.getElementById("auditRuleReleaseMode");
  const auditRuleScheduledAt = document.getElementById("auditRuleScheduledAt");
  const exportCorrectiveEvidenceAuditRuleHistoryButton = document.getElementById("exportCorrectiveEvidenceAuditRuleHistory");
  const correctiveEvidenceAuditRuleSummary = document.getElementById("correctiveEvidenceAuditRuleSummary");
  const correctiveEvidenceAuditSimulation = document.getElementById("correctiveEvidenceAuditSimulation");
  const correctiveEvidenceAuditRuleHistory = document.getElementById("correctiveEvidenceAuditRuleHistory");
  const correctiveEvidenceAuditRuleProposalList = document.getElementById("correctiveEvidenceAuditRuleProposalList");
  const correctiveEvidenceAuditRuleProposalSummary = document.getElementById("correctiveEvidenceAuditRuleProposalSummary");
  const correctiveEvidenceAuditRuleProposalFilter = document.getElementById("correctiveEvidenceAuditRuleProposalFilter");
  const correctiveEvidenceAuditRuleCertificateLedger = document.getElementById("correctiveEvidenceAuditRuleCertificateLedger");
  const exportAuditRuleProposalLedgerCsvButton = document.getElementById("exportAuditRuleProposalLedgerCsv");
  const exportAuditRuleCertificatesJsonButton = document.getElementById("exportAuditRuleCertificatesJson");
  const auditRuleCertificateFile = document.getElementById("auditRuleCertificateFile");
  const verifyAuditRuleCertificateFileButton = document.getElementById("verifyAuditRuleCertificateFile");
  const auditRuleCertificateMonth = document.getElementById("auditRuleCertificateMonth");
  const runAuditRuleCertificateMonthlyButton = document.getElementById("runAuditRuleCertificateMonthly");
  const exportAuditRuleCertificateVerificationsCsvButton = document.getElementById("exportAuditRuleCertificateVerificationsCsv");
  const auditRuleCertificateVerificationResult = document.getElementById("auditRuleCertificateVerificationResult");
  const auditRuleCertificateMonthlyIssues = document.getElementById("auditRuleCertificateMonthlyIssues");
  const auditRuleCertificateCorrectiveSummary = document.getElementById("auditRuleCertificateCorrectiveSummary");
  const auditRuleCertificateCorrectiveStatus = document.getElementById("auditRuleCertificateCorrectiveStatus");
  const auditRuleCertificateCorrectiveFilter = document.getElementById("auditRuleCertificateCorrectiveFilter");
  const auditRuleCertificateCorrectiveList = document.getElementById("auditRuleCertificateCorrectiveList");
  const auditRuleCertificateCorrectiveTrendMonth = document.getElementById("auditRuleCertificateCorrectiveTrendMonth");
  const runAuditRuleCertificateCorrectiveTrendButton = document.getElementById("runAuditRuleCertificateCorrectiveTrend");
  const exportAuditRuleCertificateCorrectiveTrendJsonButton = document.getElementById("exportAuditRuleCertificateCorrectiveTrendJson");
  const auditRuleCertificateCorrectiveTrendResult = document.getElementById("auditRuleCertificateCorrectiveTrendResult");
  const exportAuditRuleCertificateCorrectiveCsvButton = document.getElementById("exportAuditRuleCertificateCorrectiveCsv");
  const caseClosureCertificateFilter = document.getElementById("caseClosureCertificateFilter");
  const caseClosureCertificateList = document.getElementById("caseClosureCertificateList");
  const exportCaseClosureCertificatesJsonButton = document.getElementById("exportCaseClosureCertificatesJson");
  const exportCaseClosureCertificatesCsvButton = document.getElementById("exportCaseClosureCertificatesCsv");
  const caseClosureCertificateSummary = document.getElementById("caseClosureCertificateSummary");
  const caseClosureRetentionYears = document.getElementById("caseClosureRetentionYears");
  const saveCaseClosureRetentionYearsButton = document.getElementById("saveCaseClosureRetentionYears");
  const caseReopenRequestFilter = document.getElementById("caseReopenRequestFilter");
  const caseReopenRequestList = document.getElementById("caseReopenRequestList");
  const caseReopenWorkflowSummary = document.getElementById("caseReopenWorkflowSummary");
  const caseReopenWorkflowStatus = document.getElementById("caseReopenWorkflowStatus");
  const caseReopenWorkflowOffice = document.getElementById("caseReopenWorkflowOffice");
  const exportCaseReopenWorkflowCsvButton = document.getElementById("exportCaseReopenWorkflowCsv");
  const exportCaseReopenWorkflowJsonButton = document.getElementById("exportCaseReopenWorkflowJson");
  const photoPurgeCorrectiveMonth = document.getElementById("photoPurgeCorrectiveMonth");
  const photoPurgeCorrectiveOffice = document.getElementById("photoPurgeCorrectiveOffice");
  const photoPurgeCorrectiveAssigneeSummary = document.getElementById("photoPurgeCorrectiveAssigneeSummary");
  const dialog = document.getElementById("photoViewerDialog");
  const dialogClose = document.getElementById("photoViewerClose");
  const dialogTitle = document.getElementById("photoViewerTitle");
  const dialogImage = document.getElementById("photoViewerImage");
  const dialogMeta = document.getElementById("photoViewerMeta");

  let selectedDataUrl = "";
  let selectedFileSize = 0;
  let selectedMimeType = "";
  let selectedOriginalSize = 0;
  let selectedWidth = 0;
  let selectedHeight = 0;
  let selectedFingerprint = "";
  let selectedSourceFile = null;
  let selectedDuplicate = null;
  let selectedGps = null;
  let selectedCapturedAtSource = "manual";
  let selectedCapturedAtIso = "";
  let selectedExifOrientation = 1;
  let latestCertificateVerification = null;
  let latestAuditRuleSimulation = null;
  let latestAuditRuleCertificateMonthlyReport = null;

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatDate = iso => {
    try {
      return new Intl.DateTimeFormat("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      }).format(new Date(iso));
    } catch {
      return iso;
    }
  };

  function toLocalDateTimeValue(date = new Date()) {
    const normalized = date instanceof Date ? date : new Date(date);
    const offset = normalized.getTimezoneOffset();
    return new Date(normalized.getTime() - offset * 60_000).toISOString().slice(0, 16);
  }

  function bytesToText(bytes) {
    const value = Number(bytes || 0);
    if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(2)}MB`;
    if (value >= 1024) return `${(value / 1024).toFixed(0)}KB`;
    return `${value}B`;
  }

  function gpsToText(gps) {
    if (!gps || typeof gps.lat !== "number" || typeof gps.lng !== "number") return "なし";
    return `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}`;
  }

  function captureSourceToText(source) {
    switch (String(source || "")) {
      case "exif-dateTimeOriginal":
        return "EXIF（DateTimeOriginal）";
      case "exif-dateTime":
        return "EXIF（日付）";
      case "file-last-modified":
        return "ファイル日時";
      case "manual":
        return "手入力";
      default:
        return source || "不明";
    }
  }

  function loadApplications() {
    const applications = window.ISSStorage.getApplications();
    const currentApplication = applicationSelect.value;
    const currentFilter = applicationFilter.value;

    const options = applications.map(item =>
      `<option value="${escapeHtml(item.id)}">${escapeHtml(item.applicationNumber)}｜${escapeHtml(item.cargoName || "貨物名未登録")}</option>`
    ).join("");

    applicationSelect.innerHTML = '<option value="">選択してください</option>' + options;
    applicationFilter.innerHTML = '<option value="">すべての申請番号</option>' + options;
    if (photoAuditApplicationFilter) photoAuditApplicationFilter.innerHTML = '<option value="">すべての申請番号</option>' + options;

    const initialId = new URLSearchParams(window.location.search).get("application");
    if (currentApplication && applications.some(item => item.id === currentApplication)) applicationSelect.value = currentApplication;
    else if (initialId && applications.some(item => item.id === initialId)) applicationSelect.value = initialId;
    if (currentFilter && applications.some(item => item.id === currentFilter)) applicationFilter.value = currentFilter;
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle("is-error", isError);
  }

  function resetSelectionUi() {
    preview.hidden = true;
    preview.removeAttribute("src");
    previewPlaceholder.hidden = false;
    previewPlaceholder.textContent = "選択した写真がここに表示されます。ここへ画像をドラッグ＆ドロップ、または貼り付けもできます。";
    if (optimizationInfo) optimizationInfo.hidden = true;
    if (originalInfo) originalInfo.textContent = "-";
    if (savedInfo) savedInfo.textContent = "-";
    if (reductionInfo) reductionInfo.textContent = "-";
    if (limitInfo) {
      limitInfo.textContent = "-";
      limitInfo.className = "";
    }
    if (duplicateInfo) {
      duplicateInfo.textContent = "-";
      duplicateInfo.className = "";
    }
    if (capturedAtInfo) capturedAtInfo.textContent = "-";
    if (gpsInfo) gpsInfo.textContent = "-";
    if (metadataInfo) metadataInfo.textContent = "-";
  }

  function clearSelectedState(clearInput = false) {
    selectedDataUrl = "";
    selectedFileSize = 0;
    selectedMimeType = "";
    selectedOriginalSize = 0;
    selectedWidth = 0;
    selectedHeight = 0;
    selectedFingerprint = "";
    selectedSourceFile = null;
    selectedDuplicate = null;
    selectedGps = null;
    selectedCapturedAtSource = "manual";
    selectedCapturedAtIso = "";
    selectedExifOrientation = 1;
    if (clearInput) fileInput.value = "";
    resetSelectionUi();
  }

  const dataUrlBytes = dataUrl => Math.ceil((String(dataUrl).split(",")[1] || "").length * 0.75);

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(new Error("画像ファイルを読み込めませんでした。"));
      reader.readAsDataURL(file);
    });
  }

  function canvasToDataUrl(canvas, mimeType, quality) {
    return canvas.toDataURL(mimeType, quality);
  }

  async function digestFile(file) {
    try {
      const buffer = await file.arrayBuffer();
      if (!window.crypto?.subtle) throw new Error("crypto unavailable");
      const hash = await window.crypto.subtle.digest("SHA-256", buffer);
      return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, "0")).join("");
    } catch {
      return [file.name, file.size, file.type, file.lastModified].join("|");
    }
  }

  function parseExifDateTimeString(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return "";
    const [, year, month, day, hour, minute, second] = match;
    const localDate = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
    return Number.isNaN(localDate.getTime()) ? "" : localDate.toISOString();
  }

  function createTiffReader(dataView, tiffOffset) {
    const endianFlag = dataView.getUint16(tiffOffset, false);
    const littleEndian = endianFlag === 0x4949;
    if (!(littleEndian || endianFlag === 0x4d4d)) throw new Error("TIFF header not found");
    if (dataView.getUint16(tiffOffset + 2, littleEndian) !== 42) throw new Error("Invalid TIFF header");

    const readU16 = offset => dataView.getUint16(offset, littleEndian);
    const readU32 = offset => dataView.getUint32(offset, littleEndian);

    const typeSize = type => ({ 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 }[type] || 0);

    function readAsciiAt(offset, length) {
      let result = "";
      for (let index = 0; index < length; index += 1) {
        const code = dataView.getUint8(offset + index);
        if (code === 0) break;
        result += String.fromCharCode(code);
      }
      return result;
    }

    function readValue(type, count, valueOffset) {
      const totalBytes = typeSize(type) * count;
      const actualOffset = totalBytes <= 4 ? valueOffset : tiffOffset + readU32(valueOffset);
      if (actualOffset < 0 || actualOffset >= dataView.byteLength) return null;

      switch (type) {
        case 2:
          return readAsciiAt(actualOffset, count);
        case 3:
          if (count === 1) return dataView.getUint16(actualOffset, littleEndian);
          return Array.from({ length: count }, (_, index) => dataView.getUint16(actualOffset + index * 2, littleEndian));
        case 4:
          if (count === 1) return dataView.getUint32(actualOffset, littleEndian);
          return Array.from({ length: count }, (_, index) => dataView.getUint32(actualOffset + index * 4, littleEndian));
        case 5:
          return Array.from({ length: count }, (_, index) => {
            const numerator = dataView.getUint32(actualOffset + index * 8, littleEndian);
            const denominator = dataView.getUint32(actualOffset + index * 8 + 4, littleEndian) || 1;
            return numerator / denominator;
          });
        default:
          return null;
      }
    }

    function readIfdMap(offset) {
      const map = new Map();
      const count = readU16(offset);
      for (let index = 0; index < count; index += 1) {
        const entryOffset = offset + 2 + index * 12;
        const tag = readU16(entryOffset);
        const type = readU16(entryOffset + 2);
        const itemCount = readU32(entryOffset + 4);
        const value = readValue(type, itemCount, entryOffset + 8);
        map.set(tag, value);
      }
      return map;
    }

    return {
      readU32,
      readIfdMap
    };
  }

  async function extractPhotoMetadata(file) {
    const fallbackIso = file?.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString();
    const metadata = {
      orientation: 1,
      capturedAtIso: fallbackIso,
      capturedAtSource: "file-last-modified",
      gps: null
    };

    if (!String(file?.type || "").includes("jpeg") && !String(file?.name || "").match(/\.jpe?g$/i)) {
      return metadata;
    }

    try {
      const buffer = await file.arrayBuffer();
      const view = new DataView(buffer);
      if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return metadata;

      let offset = 2;
      while (offset + 4 < view.byteLength) {
        if (view.getUint8(offset) !== 0xff) break;
        const marker = view.getUint8(offset + 1);
        const size = view.getUint16(offset + 2, false);
        if (marker === 0xe1 && view.getUint32(offset + 4, false) === 0x45786966) {
          const tiffOffset = offset + 10;
          const reader = createTiffReader(view, tiffOffset);
          const ifd0Offset = tiffOffset + reader.readU32(tiffOffset + 4);
          const ifd0 = reader.readIfdMap(ifd0Offset);
          const orientation = Number(ifd0.get(0x0112) || 1);
          if (Number.isFinite(orientation)) metadata.orientation = orientation;

          const exifPointer = Number(ifd0.get(0x8769) || 0);
          if (exifPointer) {
            const exifIfd = reader.readIfdMap(tiffOffset + exifPointer);
            const dateTimeOriginal = parseExifDateTimeString(exifIfd.get(0x9003));
            const dateTime = parseExifDateTimeString(exifIfd.get(0x0132));
            if (dateTimeOriginal) {
              metadata.capturedAtIso = dateTimeOriginal;
              metadata.capturedAtSource = "exif-dateTimeOriginal";
            } else if (dateTime) {
              metadata.capturedAtIso = dateTime;
              metadata.capturedAtSource = "exif-dateTime";
            }
          }

          const gpsPointer = Number(ifd0.get(0x8825) || 0);
          if (gpsPointer) {
            const gpsIfd = reader.readIfdMap(tiffOffset + gpsPointer);
            const latRef = String(gpsIfd.get(0x0001) || "").trim().toUpperCase();
            const lat = gpsIfd.get(0x0002);
            const lngRef = String(gpsIfd.get(0x0003) || "").trim().toUpperCase();
            const lng = gpsIfd.get(0x0004);
            if (Array.isArray(lat) && lat.length >= 3 && Array.isArray(lng) && lng.length >= 3) {
              const latDecimal = lat[0] + lat[1] / 60 + lat[2] / 3600;
              const lngDecimal = lng[0] + lng[1] / 60 + lng[2] / 3600;
              metadata.gps = {
                lat: latRef === "S" ? -latDecimal : latDecimal,
                lng: lngRef === "W" ? -lngDecimal : lngDecimal
              };
            }
          }
          break;
        }
        if (size < 2) break;
        offset += 2 + size;
      }
    } catch {
      return metadata;
    }

    return metadata;
  }

  function getOrientedCanvasSize(width, height, orientation) {
    return [5, 6, 7, 8].includes(Number(orientation))
      ? { canvasWidth: height, canvasHeight: width }
      : { canvasWidth: width, canvasHeight: height };
  }

  function applyOrientationTransform(context, orientation, width, height) {
    switch (Number(orientation || 1)) {
      case 2:
        context.translate(width, 0);
        context.scale(-1, 1);
        break;
      case 3:
        context.translate(width, height);
        context.rotate(Math.PI);
        break;
      case 4:
        context.translate(0, height);
        context.scale(1, -1);
        break;
      case 5:
        context.rotate(0.5 * Math.PI);
        context.scale(1, -1);
        break;
      case 6:
        context.rotate(0.5 * Math.PI);
        context.translate(0, -height);
        break;
      case 7:
        context.rotate(0.5 * Math.PI);
        context.translate(width, -height);
        context.scale(-1, 1);
        break;
      case 8:
        context.rotate(-0.5 * Math.PI);
        context.translate(-width, 0);
        break;
      default:
        break;
    }
  }

  async function optimizeImage(file, metadata = {}) {
    const mode = resizeSelect?.value || "auto";
    const orientation = Number(metadata.orientation || 1);
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("画像を読み込めませんでした。"));
        img.src = objectUrl;
      });

      const policy = window.ISSStorage.getPhotoPolicy();
      const policyLimitBytes = Math.max(256 * 1024, Number(policy.maxFileSizeMb || 1) * 1024 * 1024);
      const targetBytes = mode === "auto" ? Math.min(policyLimitBytes, 1 * 1024 * 1024) : policyLimitBytes;
      let maxDimension = mode === "auto"
        ? 1600
        : mode === "original"
          ? Math.max(image.naturalWidth, image.naturalHeight)
          : Number(mode || 1600);
      let quality = mode === "original" ? 0.95 : 0.86;
      let best = null;

      for (let attempt = 0; attempt < 12; attempt += 1) {
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const drawWidth = Math.max(1, Math.round(image.naturalWidth * scale));
        const drawHeight = Math.max(1, Math.round(image.naturalHeight * scale));
        const { canvasWidth, canvasHeight } = getOrientedCanvasSize(drawWidth, drawHeight, orientation);
        const canvas = document.createElement("canvas");
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext("2d", { alpha: false });
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.save();
        applyOrientationTransform(context, orientation, drawWidth, drawHeight);
        context.drawImage(image, 0, 0, drawWidth, drawHeight);
        context.restore();

        const mimeType = "image/jpeg";
        const dataUrl = canvasToDataUrl(canvas, mimeType, quality);
        const size = dataUrlBytes(dataUrl);
        best = { dataUrl, size, mimeType, width: canvasWidth, height: canvasHeight, compressed: mode !== "original", metadataSanitized: true };
        if (size <= targetBytes) break;

        if (quality > 0.62) quality -= 0.07;
        else maxDimension = Math.max(800, Math.round(maxDimension * 0.85));
      }

      if (!best || best.size > policyLimitBytes) {
        throw new Error(`メタデータ除去・最適化後も写真1枚の上限${policy.maxFileSizeMb}MBを超えています。さらに小さい画像を選択してください。`);
      }
      return best;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  function syncFileInputFromFile(file) {
    try {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      fileInput.files = transfer.files;
    } catch {
      // 一部環境では files 代入不可のため内部状態で扱う
    }
  }

  function updateOptimizationPanel() {
    if (!optimizationInfo) return;
    if (!selectedSourceFile || !selectedDataUrl) {
      optimizationInfo.hidden = true;
      return;
    }

    const policy = window.ISSStorage.getPhotoPolicy();
    const maxBytes = policy.maxFileSizeMb * 1024 * 1024;
    const reduction = selectedOriginalSize > 0
      ? Math.max(0, Math.round((1 - selectedFileSize / selectedOriginalSize) * 100))
      : 0;

    originalInfo.textContent = `${bytesToText(selectedOriginalSize)} ／ ${selectedSourceFile.type || "image/*"}`;
    savedInfo.textContent = `${bytesToText(selectedFileSize)} ／ ${selectedWidth || "-"}×${selectedHeight || "-"}px ／ ${selectedMimeType || "-"}`;
    reductionInfo.textContent = `${reduction}%削減`;
    if (limitInfo) {
      if (selectedFileSize <= maxBytes) {
        limitInfo.textContent = `上限内（${bytesToText(maxBytes)}以下）`;
        limitInfo.className = "is-ok";
      } else {
        limitInfo.textContent = `上限超過（上限 ${bytesToText(maxBytes)}）`;
        limitInfo.className = "is-error";
      }
    }
    if (duplicateInfo) {
      if (selectedDuplicate) {
        duplicateInfo.textContent = `重複候補あり：${selectedDuplicate.fileName || "既存写真"}（${formatDate(selectedDuplicate.registeredAt) || "登録日時不明"}）`;
        duplicateInfo.className = "is-warning";
      } else {
        duplicateInfo.textContent = "重複候補なし";
        duplicateInfo.className = "is-ok";
      }
    }
    if (capturedAtInfo) capturedAtInfo.textContent = `${selectedCapturedAtIso ? formatDate(selectedCapturedAtIso) : "なし"} ／ ${captureSourceToText(selectedCapturedAtSource)}`;
    if (gpsInfo) {
      if (!selectedGps) gpsInfo.textContent = "元画像に位置情報なし";
      else if (keepGpsInput?.checked) gpsInfo.textContent = `${gpsToText(selectedGps)}（保存する）`;
      else gpsInfo.textContent = "元画像にあり／保存しない";
    }
    if (metadataInfo) metadataInfo.textContent = "保存画像からEXIF・端末情報を除去済み";
    optimizationInfo.hidden = false;
  }

  function evaluateDuplicate() {
    if (!selectedSourceFile || !selectedDataUrl) {
      selectedDuplicate = null;
      updateOptimizationPanel();
      return;
    }
    selectedDuplicate = window.ISSStorage.findDuplicatePhoto({
      applicationId: applicationSelect.value,
      fingerprint: selectedFingerprint,
      fileName: selectedSourceFile.name,
      originalFileSize: selectedOriginalSize
    });
    updateOptimizationPanel();
  }

  async function loadSelectedFileFromFile(file) {
    if (!file) {
      clearSelectedState();
      return;
    }
    if (!window.ISSImageFormats?.isSupportedImageFile(file)) {
      showMessage("JPEG、PNG、WebP、HEICまたはHEIF形式の画像を選択してください。", true);
      clearSelectedState();
      return;
    }

    selectedSourceFile = file;
    selectedOriginalSize = file.size;
    syncFileInputFromFile(file);

    try {
      previewPlaceholder.hidden = false;
      previewPlaceholder.textContent = /\.(heic|heif)$/i.test(file.name) || /image\/(heic|heif)/i.test(file.type || "")
        ? "HEIC／HEIF画像をJPEGへ変換しています…"
        : "画像を最適化しています…";
      preview.hidden = true;

      const prepared = await window.ISSImageFormats.prepareImageFile(file, { quality:0.92 });
      const metadata = await extractPhotoMetadata(prepared.file);
      const [optimized, fingerprint] = await Promise.all([
        optimizeImage(prepared.file, metadata),
        digestFile(file)
      ]);

      selectedDataUrl = optimized.dataUrl;
      selectedFileSize = optimized.size;
      selectedMimeType = optimized.mimeType;
      selectedWidth = optimized.width || 0;
      selectedHeight = optimized.height || 0;
      selectedFingerprint = fingerprint;
      selectedGps = metadata.gps || null;
      selectedCapturedAtSource = metadata.capturedAtSource || "file-last-modified";
      selectedCapturedAtIso = metadata.capturedAtIso || "";
      selectedExifOrientation = Number(metadata.orientation || 1);
      if (selectedCapturedAtIso) shootingAt.value = toLocalDateTimeValue(selectedCapturedAtIso);
      preview.src = selectedDataUrl;
      preview.hidden = false;
      previewPlaceholder.hidden = true;

      evaluateDuplicate();

      const beforeMb = (file.size / 1024 / 1024).toFixed(2);
      const afterMb = (selectedFileSize / 1024 / 1024).toFixed(2);
      const reduction = file.size > 0 ? Math.max(0, Math.round((1 - selectedFileSize / file.size) * 100)) : 0;
      const dimensions = selectedWidth && selectedHeight ? `／${selectedWidth}×${selectedHeight}px` : "";
      const duplicateText = selectedDuplicate ? "／同一写真の登録候補あり" : "";
      const conversionText = prepared.converted ? "／HEIC・HEIFからJPEGへ変換済み" : "";
      showMessage((resizeSelect?.value || "auto") === "original"
        ? `元サイズ相当で保存準備完了：${beforeMb}MB → ${afterMb}MB／EXIF除去済み${conversionText}${dimensions}${duplicateText}`
        : `自動圧縮完了：${beforeMb}MB → ${afterMb}MB（${reduction}%削減）${conversionText}${dimensions}${duplicateText}`,
      Boolean(selectedDuplicate));
      renderPolicy();
    } catch (error) {
      showMessage(error.message || "画像処理に失敗しました。", true);
      clearSelectedState();
      renderPolicy();
    }
  }

  async function loadSelectedFile() {
    const file = fileInput.files?.[0] || null;
    await loadSelectedFileFromFile(file);
  }

  function getFilteredPhotos() {
    const query = filter.value.trim().toLowerCase();
    const selectedApplication = applicationFilter.value;
    return window.ISSStorage.getPhotos({ includeDeleted: Boolean(showDeletedPhotos?.checked) }).filter(item => {
      if (selectedApplication && item.applicationId !== selectedApplication) return false;
      const haystack = [item.applicationNumber, item.comment, item.registeredBy, item.office].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }

  function downloadCsv(filename, rows) {
    const csv = rows.map(row => row.map(cell => {
      const text = String(cell ?? "");
      return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }


  function downloadJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function printPurgeCertificate(certificate) {
    const popup = window.open("", "_blank", "noopener,noreferrer");
    if (!popup) return showMessage("印刷画面を開けませんでした。ポップアップを許可してください。", true);
    const rows = (certificate.targetPhotos || []).map(item => `<tr><td>${escapeHtml(item.applicationNumber || "")}</td><td>${escapeHtml(item.photoId || "")}</td><td>${escapeHtml(item.fileName || "")}</td><td>${escapeHtml(bytesToText(item.fileSize || 0))}</td></tr>`).join("");
    popup.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>写真完全削除証明書</title><style>body{font-family:system-ui,sans-serif;margin:36px;color:#172536}h1{font-size:24px;border-bottom:2px solid #173b65;padding-bottom:12px}dl{display:grid;grid-template-columns:180px 1fr;border:1px solid #ccd5df}dt,dd{margin:0;padding:8px;border-bottom:1px solid #dde3e9}dt{font-weight:700;background:#f3f6f9}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ccd5df;padding:7px;text-align:left;font-size:12px}.hash{overflow-wrap:anywhere;font-family:monospace}@media print{button{display:none}}</style></head><body><h1>写真完全削除証明書</h1><dl><dt>証明書ID</dt><dd>${escapeHtml(certificate.certificateId)}</dd><dt>削除計画ID</dt><dd>${escapeHtml(certificate.planId)}</dd><dt>事業所</dt><dd>${escapeHtml(certificate.office || "")}</dd><dt>申請番号</dt><dd>${escapeHtml((certificate.applications || []).join("、"))}</dd><dt>削除理由</dt><dd>${escapeHtml(certificate.reason || "")}</dd><dt>作成者</dt><dd>${escapeHtml(certificate.createdBy || "")}／${escapeHtml(formatDate(certificate.createdAt))}</dd><dt>承認者</dt><dd>${escapeHtml(certificate.approvedBy || "")}／${escapeHtml(formatDate(certificate.approvedAt))}</dd><dt>実行者</dt><dd>${escapeHtml(certificate.executedBy || "")}／${escapeHtml(formatDate(certificate.executedAt))}</dd><dt>削除結果</dt><dd>${Number(certificate.deletedPhotoCount || 0)}件／${escapeHtml(bytesToText(certificate.deletedBytes || 0))}</dd><dt>検証ハッシュ</dt><dd class="hash">${escapeHtml(certificate.verificationHash || "")}</dd></dl><table><thead><tr><th>申請番号</th><th>写真ID</th><th>ファイル名</th><th>削除容量</th></tr></thead><tbody>${rows}</tbody></table><p>本書は、承認済み完全削除計画に基づく実行結果を記録したものです。</p><button onclick="window.print()">印刷</button></body></html>`);
    popup.document.close();
  }

  fileInput.addEventListener("change", loadSelectedFile);
  resizeSelect?.addEventListener("change", () => {
    if (selectedSourceFile || fileInput.files?.[0]) loadSelectedFileFromFile(selectedSourceFile || fileInput.files[0]);
  });
  applicationSelect.addEventListener("change", () => {
    evaluateDuplicate();
    renderPolicy();
  });
  keepGpsInput?.addEventListener("change", updateOptimizationPanel);

  previewDropZone?.addEventListener("click", () => fileInput.click());
  previewDropZone?.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInput.click();
    }
  });

  ["dragenter", "dragover"].forEach(type => previewDropZone?.addEventListener(type, event => {
    event.preventDefault();
    previewDropZone.classList.add("is-dragover");
  }));
  ["dragleave", "dragend", "drop"].forEach(type => previewDropZone?.addEventListener(type, event => {
    event.preventDefault();
    previewDropZone.classList.remove("is-dragover");
  }));
  previewDropZone?.addEventListener("drop", event => {
    const file = event.dataTransfer?.files?.[0] || null;
    if (file) loadSelectedFileFromFile(file);
  });

  window.addEventListener("paste", event => {
    const item = Array.from(event.clipboardData?.items || []).find(entry => String(entry.type || "").startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    loadSelectedFileFromFile(file);
  });

  function renderPolicy() {
    if (!policyInfo) return;
    const policy = window.ISSStorage.getPhotoPolicy();
    const usage = window.ISSStorage.getPhotoUsage();
    const applicationUsage = applicationSelect.value ? window.ISSStorage.getApplicationPhotoUsage(applicationSelect.value) : null;
    const currentOffice = window.ISSStorage.getOfficeName();
    const base = `写真上限：1申請 ${policy.perApplication}枚／事業所 ${policy.perOffice}枚・${policy.storageLimitMb}MB／1枚 ${policy.maxFileSizeMb}MBまで　現在：${usage.count}枚・${usage.megabytes.toFixed(1)}MB（${currentOffice}）`;
    const appText = applicationUsage
      ? `　選択中申請：${applicationUsage.count}枚／残り ${Math.max(0, policy.perApplication - applicationUsage.count)}枚`
      : "";
    policyInfo.textContent = base + appText;
  }

  function openViewer(photoId) {
    if (!dialog || !dialogImage || !dialogMeta) return;
    const photo = window.ISSStorage.getPhotos({ scope: "all", includeDeleted: true }).find(item => item.id === photoId);
    if (!photo) return;
    dialogTitle.textContent = photo.applicationNumber || "登録写真";
    dialogImage.src = photo.dataUrl;
    dialogMeta.innerHTML = [
      ["申請番号", photo.applicationNumber || ""],
      ["撮影日時", formatDate(photo.shootingAt)],
      ["撮影日時取得", captureSourceToText(photo.capturedAtSource)],
      ["登録者", photo.registeredBy || ""],
      ["保存容量", bytesToText(photo.fileSize || 0)],
      ["元画像容量", bytesToText(photo.originalFileSize || 0)],
      ["保存寸法", photo.imageWidth && photo.imageHeight ? `${photo.imageWidth}×${photo.imageHeight}px` : "-"],
      ["圧縮モード", photo.compressionMode || "auto"],
      ["向き補正", photo.exifOrientation ? `EXIF ${photo.exifOrientation}` : "なし"],
      ["位置情報", photo.gpsRetentionConsent ? gpsToText(photo.gps) : "保存なし"],
      ["メタデータ処理", photo.metadataSanitized === false ? "未処理" : "EXIF・端末情報除去済み"],
      ["コメント", photo.comment || "コメントなし"]
    ].map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "open");
  }

  function closeViewer() {
    if (!dialog) return;
    if (typeof dialog.close === "function") dialog.close();
    else dialog.removeAttribute("open");
  }

  dialogClose?.addEventListener("click", closeViewer);
  dialog?.addEventListener("click", event => {
    if (event.target === dialog) closeViewer();
  });

  function render() {
    renderPolicy();
    const photos = getFilteredPhotos();

    if (!photos.length) {
      list.innerHTML = `<div class="empty-state"><strong>写真は登録されていません</strong><p>申請番号を選択し、写真を登録してください。</p></div>`;
      return;
    }

    list.innerHTML = photos.map(item => `
      <article class="photo-card ${item.representative ? "is-representative" : ""} ${item.status === "deleted" ? "is-deleted" : ""}">
        <img src="${escapeHtml(item.dataUrl)}" alt="${escapeHtml(item.comment || "登録写真")}" loading="lazy">
        <div class="photo-card__body">
          <div class="photo-card__header">
            <span class="application-number">${escapeHtml(item.applicationNumber || "申請番号なし")}</span>
            ${item.representative ? '<span class="representative-badge">代表写真</span>' : `<span class="record-status">${item.status === "deleted" ? "削除済み" : escapeHtml(item.status)}</span>`}
          </div>
          <p>${escapeHtml(item.comment || "コメントなし")}</p>
          <dl class="photo-meta">
            <div><dt>撮影日時</dt><dd>${escapeHtml(formatDate(item.shootingAt))}</dd></div>
            <div><dt>登録者</dt><dd>${escapeHtml(item.registeredBy || "")}</dd></div>
            <div><dt>事業所</dt><dd>${escapeHtml(item.office || "")}</dd></div>
            <div><dt>保存容量</dt><dd>${(Number(item.fileSize || 0) / 1024 / 1024).toFixed(2)}MB</dd></div>
          </dl>
          <div class="management-actions">
            <button data-view-photo="${escapeHtml(item.id)}" type="button">拡大表示</button>
            ${item.status === "deleted" ? `<button data-restore-photo="${escapeHtml(item.id)}" type="button">復元</button>` : `
            <button data-set-representative="${escapeHtml(item.id)}" type="button">${item.representative ? "代表写真を解除" : "代表写真にする"}</button>
            <button data-edit-photo-comment="${escapeHtml(item.id)}" type="button">コメント編集</button>
            ${window.ISSStorage.canDeleteOperationalData?.() !== false ? `<button data-delete-photo="${escapeHtml(item.id)}" class="danger-action" type="button">削除</button>` : `<span class="record-status">削除不可</span>`}`}
          </div>
        </div>
      </article>
    `).join("");

    document.querySelectorAll("[data-view-photo]").forEach(button => button.addEventListener("click", () => openViewer(button.dataset.viewPhoto)));
    document.querySelectorAll("[data-set-representative]").forEach(button => button.addEventListener("click", () => {
      const photo = window.ISSStorage.getPhotos().find(item => item.id === button.dataset.setRepresentative);
      if (!photo) return;
      window.ISSStorage.updatePhoto(photo.id, { representative: !photo.representative, updatedBy: registeredBy.value || "利用者", reason: "代表写真設定変更" });
      render();
    }));
    document.querySelectorAll("[data-edit-photo-comment]").forEach(button => button.addEventListener("click", () => {
      const photo = window.ISSStorage.getPhotos().find(item => item.id === button.dataset.editPhotoComment);
      if (!photo) return;
      const next = prompt("写真コメントを編集してください。", photo.comment || "");
      if (next === null) return;
      window.ISSStorage.updatePhoto(photo.id, { comment: next, updatedBy: registeredBy.value || "利用者", reason: "コメント編集" });
      render();
    }));
    document.querySelectorAll("[data-delete-photo]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("削除理由を入力してください。", "誤登録のため");
      if (reason === null) return;
      if (!reason.trim()) return showMessage("削除理由は必須です。", true);
      if (!confirm("この写真を削除済みにしますか？操作履歴は保持されます。")) return;
      window.ISSStorage.removePhoto(button.dataset.deletePhoto, { deletedBy: registeredBy.value || "利用者", reason: reason.trim() });
      render();
    }));
    document.querySelectorAll("[data-restore-photo]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("復元理由を入力してください。", "削除取消のため");
      if (reason === null) return;
      window.ISSStorage.restorePhoto(button.dataset.restorePhoto, { restoredBy: registeredBy.value || "利用者", reason: reason.trim() });
      render();
    }));
    renderAudit();
    renderRetention();
  }

  function getFilteredAuditLogs() {
    const query = String(photoAuditFilter?.value || "").trim().toLowerCase();
    const applicationId = String(photoAuditApplicationFilter?.value || "");
    return window.ISSStorage.getPhotoAuditLogs({ applicationId }).filter(item => {
      const haystack = [item.applicationNumber, item.actor, item.reason, item.action, item.office].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }

  function actionText(action) {
    return ({ create: "登録", update: "変更", delete: "削除", restore: "復元", purge: "完全削除", "retention-hold": "保全指定", "retention-release": "保全解除" })[action] || action;
  }

  function renderAudit() {
    if (!photoAuditList) return;
    const logs = getFilteredAuditLogs();
    if (!logs.length) {
      photoAuditList.innerHTML = '<div class="empty-state"><strong>操作履歴はありません</strong><p>写真の登録・変更・削除・復元履歴がここに表示されます。</p></div>';
      return;
    }
    photoAuditList.innerHTML = logs.slice(0, 200).map(item => `
      <article class="photo-audit-item">
        <div class="photo-audit-item__head">
          <span class="photo-audit-action" data-action="${escapeHtml(item.action)}">${escapeHtml(actionText(item.action))}</span>
          <time>${escapeHtml(formatDate(item.occurredAt))}</time>
        </div>
        <strong>${escapeHtml(item.applicationNumber || "申請番号なし")} ／ ${escapeHtml(item.actor || "利用者")}</strong>
        <p>${escapeHtml(item.reason || "理由の記録なし")}　${item.after?.fileName || item.before?.fileName ? `／ ${escapeHtml(item.after?.fileName || item.before?.fileName)}` : ""}</p>
      </article>
    `).join("");
  }

  function retentionStatusText(status) {
    return ({ "review-due": "整理確認対象", "purge-ready": "完全削除候補", hold: "保全指定中", "deleted-grace": "削除後保留中", active: "保存期間内" })[status] || status;
  }

  function getFilteredRetentionPhotos() {
    const filterValue = String(photoRetentionFilter?.value || "review-due");
    const photos = window.ISSStorage.getPhotoRetentionCandidates();
    return filterValue === "all" ? photos : photos.filter(item => item.retentionStatus === filterValue);
  }

  function renderStorageDashboard() {
    if (!photoStorageDashboard) return;
    const report = window.ISSStorage.getPhotoStorageReport();
    const cards = [
      ["総保存量", `${bytesToText(report.totalBytes)}／${bytesToText(report.limitBytes)}`, `${report.usagePercent.toFixed(1)}%使用`],
      ["使用中", `${report.activeCount}枚`, bytesToText(report.activeBytes)],
      ["論理削除済み", `${report.deletedCount}枚`, bytesToText(report.deletedBytes)],
      ["完全削除候補", `${report.purgeReadyCount}枚`, `${bytesToText(report.purgeReadyBytes)}削減可能`],
      ["保全指定中", `${report.holdCount}枚`, bytesToText(report.holdBytes)]
    ];
    photoStorageDashboard.innerHTML = cards.map(([label, value, note]) => `
      <article class="photo-storage-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
        <small>${escapeHtml(note)}</small>
      </article>
    `).join("");
  }

  function purgePlanStatusText(status) {
    return ({ pending: "承認待ち", approved: "承認済み", executed: "実行済み", cancelled: "取消" })[status] || status;
  }

  function getSelectedPurgePhotoIds() {
    return [...document.querySelectorAll('[data-purge-photo]:checked')].map(input => input.value);
  }

  function getFilteredPurgePlans() {
    const statusFilter = String(photoPurgeStatusFilter?.value || "active");
    const query = String(photoPurgeAssigneeFilter?.value || "").trim().toLowerCase();
    const unacknowledgedOnly = Boolean(photoPurgeUnacknowledgedOnly?.checked);
    return window.ISSStorage.getPhotoPurgePlans().filter(plan => {
      if (statusFilter === "active" && !["pending", "approved"].includes(plan.status)) return false;
      if (statusFilter === "pending" && plan.status !== "pending") return false;
      if (statusFilter === "approved" && plan.status !== "approved") return false;
      if (statusFilter === "overdue" && !String(plan.deadlineState || "").includes("overdue")) return false;
      if (statusFilter === "escalated" && !plan.escalated) return false;
      if (unacknowledgedOnly && plan.notificationAcknowledgedAt) return false;
      const haystack = [plan.assignedApprover, plan.createdBy, plan.approvedBy, plan.office, plan.id, ...(plan.applications || [])].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
  }

  function renderPurgePlans() {
    if (!photoPurgePlanList) return;
    const canApproveOrExecute = window.ISSStorage.isOfficeAdmin() || window.ISSStorage.isAdministrator();
    const isAdministrator = window.ISSStorage.isAdministrator();
    const allPlans = window.ISSStorage.getPhotoPurgePlans();
    const plans = getFilteredPurgePlans();
    const notifications = window.ISSStorage.getPhotoPurgeNotifications();
    const approvalOverdue = notifications.filter(item => item.deadlineState === "approval-overdue").length;
    const executionOverdue = notifications.filter(item => item.deadlineState === "execution-overdue").length;
    const pending = notifications.filter(item => item.status === "pending").length;
    const approved = notifications.filter(item => item.status === "approved").length;
    const escalated = notifications.filter(item => item.escalated).length;
    const unacknowledged = notifications.filter(item => !item.acknowledgedAt).length;
    if (photoPurgeNotificationSummary) {
      photoPurgeNotificationSummary.innerHTML = `
        <article data-purge-summary-filter="pending"><span>承認待ち</span><strong>${pending}件</strong></article>
        <article data-purge-summary-filter="approved"><span>実行待ち</span><strong>${approved}件</strong></article>
        <article data-purge-summary-filter="overdue" class="${approvalOverdue + executionOverdue ? "is-alert" : ""}"><span>期限超過</span><strong>${approvalOverdue + executionOverdue}件</strong></article>
        <article data-purge-summary-filter="escalated" class="${escalated ? "is-alert" : ""}"><span>管理者引継ぎ</span><strong>${escalated}件</strong></article>
        <article data-purge-summary-unacknowledged="true" class="${unacknowledged ? "is-alert" : ""}"><span>未確認通知</span><strong>${unacknowledged}件</strong></article>`;
      photoPurgeNotificationSummary.querySelectorAll("[data-purge-summary-filter]").forEach(card => card.addEventListener("click", () => {
        if (photoPurgeStatusFilter) photoPurgeStatusFilter.value = card.dataset.purgeSummaryFilter;
        renderPurgePlans();
      }));
      photoPurgeNotificationSummary.querySelectorAll("[data-purge-summary-unacknowledged]").forEach(card => card.addEventListener("click", () => {
        if (photoPurgeStatusFilter) photoPurgeStatusFilter.value = "active";
        if (photoPurgeUnacknowledgedOnly) photoPurgeUnacknowledgedOnly.checked = true;
        renderPurgePlans();
      }));
    }
    if (!allPlans.length) {
      photoPurgePlanList.innerHTML = '<div class="empty-state"><strong>完全削除計画はありません</strong><p>完全削除候補を選択して計画を作成すると、ここに表示されます。</p></div>';
      return;
    }
    if (!plans.length) {
      photoPurgePlanList.innerHTML = '<div class="empty-state"><strong>条件に一致する削除計画はありません</strong><p>絞り込み条件を変更してください。</p></div>';
      return;
    }
    const deadlineText = plan => {
      if (plan.deadlineState === "approval-overdue") return `承認期限超過：${formatDate(plan.approvalDueAt)}`;
      if (plan.deadlineState === "execution-overdue") return `実行期限超過：${formatDate(plan.executionDueAt)}`;
      if (plan.status === "pending" && plan.approvalDueAt) return `承認期限：${formatDate(plan.approvalDueAt)}`;
      if (plan.status === "approved" && plan.executionDueAt) return `実行期限：${formatDate(plan.executionDueAt)}`;
      return "期限なし";
    };
    const priorityText = plan => String(plan.deadlineState || "").includes("overdue") ? "至急" : plan.escalated ? "優先" : "通常";
    plans.sort((a, b) => String(a.nextDueAt || "9999").localeCompare(String(b.nextDueAt || "9999")));
    photoPurgePlanList.innerHTML = plans.slice(0, 100).map(plan => `
      <article class="photo-purge-plan ${String(plan.deadlineState || "").includes("overdue") ? "is-overdue" : ""} ${plan.escalated ? "is-escalated" : ""}" data-status="${escapeHtml(plan.status)}">
        <div class="photo-purge-plan__head">
          <div><strong>${escapeHtml(plan.office || "事業所未登録")}</strong><p>${escapeHtml(plan.id)}</p></div>
          <div class="purge-plan-badges"><span>${escapeHtml(purgePlanStatusText(plan.status))}</span><span class="priority-badge" data-priority="${String(plan.deadlineState || "").includes("overdue") ? "critical" : plan.escalated ? "high" : "normal"}">${priorityText(plan)}</span></div>
        </div>
        <dl class="photo-meta">
          <div><dt>対象</dt><dd>${Number(plan.photoCount || 0)}枚／${escapeHtml(bytesToText(plan.totalBytes || 0))}</dd></div>
          <div><dt>申請番号</dt><dd>${escapeHtml((plan.applications || []).join("、") || "なし")}</dd></div>
          <div><dt>作成者</dt><dd>${escapeHtml(plan.createdBy || "")}／${escapeHtml(formatDate(plan.createdAt))}</dd></div>
          <div><dt>承認担当者</dt><dd>${escapeHtml(plan.assignedApprover || "未指定")}${plan.escalated ? "／管理者へ引継ぎ済み" : ""}</dd></div>
          <div><dt>承認者</dt><dd>${escapeHtml(plan.approvedBy || "未承認")}${plan.approvedAt ? `／${escapeHtml(formatDate(plan.approvedAt))}` : ""}</dd></div>
          <div><dt>処理期限</dt><dd class="${String(plan.deadlineState || "").includes("overdue") ? "deadline-overdue" : ""}">${escapeHtml(deadlineText(plan))}</dd></div>
          <div><dt>通知確認</dt><dd>${plan.notificationAcknowledgedAt ? `${escapeHtml(plan.notificationAcknowledgedBy || "")}／${escapeHtml(formatDate(plan.notificationAcknowledgedAt))}` : "未確認"}</dd></div>
        </dl>
        <p>理由：${escapeHtml(plan.reason || "")}</p>
        ${plan.cancelReason ? `<p>取消理由：${escapeHtml(plan.cancelReason)}</p>` : ""}
        ${plan.escalationReason ? `<p>引継ぎ理由：${escapeHtml(plan.escalationReason)}／${escapeHtml(plan.escalatedBy || "管理者")}／${escapeHtml(formatDate(plan.escalatedAt))}</p>` : ""}
        ${Array.isArray(plan.assignmentHistory) && plan.assignmentHistory.length ? `<details class="assignment-history"><summary>担当者変更履歴（${plan.assignmentHistory.length}件）</summary>${plan.assignmentHistory.slice().reverse().map(item => `<p>${escapeHtml(formatDate(item.at))}：${escapeHtml(item.from || "未指定")} → ${escapeHtml(item.to || "未指定")}／${escapeHtml(item.actor || "")}／${escapeHtml(item.reason || "")}</p>`).join("")}</details>` : ""}
        <div class="management-actions">
          ${["pending", "approved"].includes(plan.status) && !plan.notificationAcknowledgedAt ? `<button data-acknowledge-purge-notification="${escapeHtml(plan.id)}" type="button">通知を確認済みにする</button>` : ""}
          ${plan.status === "pending" && canApproveOrExecute ? `<button data-approve-purge-plan="${escapeHtml(plan.id)}" type="button">承認する</button>` : ""}
          ${["pending", "approved"].includes(plan.status) && canApproveOrExecute ? `<button data-reassign-purge-plan="${escapeHtml(plan.id)}" type="button">担当者を再割当</button>` : ""}
          ${["pending", "approved"].includes(plan.status) && String(plan.deadlineState || "").includes("overdue") && isAdministrator && !plan.escalated ? `<button data-escalate-purge-plan="${escapeHtml(plan.id)}" type="button">管理者へ引継ぎ</button>` : ""}
          ${plan.status === "approved" && canApproveOrExecute ? `<button data-execute-purge-plan="${escapeHtml(plan.id)}" class="danger-action" type="button">完全削除を実行</button>` : ""}
          ${plan.status === "executed" && plan.certificateId ? `<button data-download-purge-certificate="${escapeHtml(plan.id)}" type="button">削除証明書JSON</button><button data-print-purge-certificate="${escapeHtml(plan.id)}" type="button">証明書を印刷</button>` : ""}
          ${["pending", "approved"].includes(plan.status) ? `<button data-cancel-purge-plan="${escapeHtml(plan.id)}" type="button">計画を取り消す</button>` : ""}
        </div>
      </article>
    `).join("");

    photoPurgePlanList.querySelectorAll("[data-acknowledge-purge-notification]").forEach(button => button.addEventListener("click", () => {
      try {
        window.ISSStorage.acknowledgePhotoPurgeNotification(button.dataset.acknowledgePurgeNotification, { actor: registeredBy.value || "利用者" });
        showMessage("削除計画の通知を確認済みにしました。");
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "通知を確認済みにできませんでした。", true);
      }
    }));

    photoPurgePlanList.querySelectorAll("[data-approve-purge-plan]").forEach(button => button.addEventListener("click", () => {
      const approver = prompt("承認者名を入力してください。作成者と同じ名前は使用できません。", registeredBy.value || "");
      if (approver === null) return;
      try {
        window.ISSStorage.approvePhotoPurgePlan(button.dataset.approvePurgePlan, { approvedBy: approver.trim() });
        showMessage("完全削除計画を承認しました。");
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "承認できませんでした。", true);
      }
    }));

    photoPurgePlanList.querySelectorAll("[data-reassign-purge-plan]").forEach(button => button.addEventListener("click", () => {
      const assignee = prompt("新しい担当者名を入力してください。", "");
      if (assignee === null) return;
      const reason = prompt("再割当理由を入力してください。", "担当者不在または業務引継ぎのため");
      if (reason === null) return;
      try {
        window.ISSStorage.reassignPhotoPurgePlan(button.dataset.reassignPurgePlan, {
          actor: registeredBy.value || "利用者",
          assignedApprover: assignee.trim(),
          reason: reason.trim()
        });
        showMessage("削除計画の担当者を再割当しました。");
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "担当者を再割当できませんでした。", true);
      }
    }));

    photoPurgePlanList.querySelectorAll("[data-escalate-purge-plan]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("管理者へ引き継ぐ理由を入力してください。", "期限超過のため管理者対応へ引き継ぐ");
      if (reason === null) return;
      try {
        window.ISSStorage.escalatePhotoPurgePlan(button.dataset.escalatePurgePlan, {
          actor: registeredBy.value || "管理者",
          reason: reason.trim()
        });
        showMessage("期限超過計画を管理者へ引き継ぎました。");
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "管理者へ引き継げませんでした。", true);
      }
    }));

    photoPurgePlanList.querySelectorAll("[data-execute-purge-plan]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("完全削除の実行者名を入力してください。", registeredBy.value || "");
      if (actor === null) return;
      if (!confirm("承認済み計画の写真本体を完全削除します。この操作は復元できません。実行しますか？")) return;
      try {
        const result = window.ISSStorage.executePhotoPurgePlan(button.dataset.executePurgePlan, { executedBy: actor.trim() });
        showMessage(`写真を完全削除しました（${result.executedCount || 0}件）。削除証明書 ${result.certificate?.certificateId || ""} を生成しました。`);
        render();
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "完全削除を実行できませんでした。", true);
      }
    }));

    photoPurgePlanList.querySelectorAll("[data-download-purge-certificate]").forEach(button => button.addEventListener("click", () => {
      const certificate = window.ISSStorage.getPhotoPurgeCertificateByPlanId(button.dataset.downloadPurgeCertificate);
      if (!certificate) return showMessage("削除証明書が見つかりません。", true);
      downloadJson(`photo-purge-certificate-${certificate.certificateId}.json`, certificate);
      showMessage("完全削除証明書をJSON出力しました。");
    }));

    photoPurgePlanList.querySelectorAll("[data-print-purge-certificate]").forEach(button => button.addEventListener("click", () => {
      const certificate = window.ISSStorage.getPhotoPurgeCertificateByPlanId(button.dataset.printPurgeCertificate);
      if (!certificate) return showMessage("削除証明書が見つかりません。", true);
      printPurgeCertificate(certificate);
    }));

    photoPurgePlanList.querySelectorAll("[data-cancel-purge-plan]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("削除計画の取消理由を入力してください。", "対象または保全状況を再確認するため");
      if (reason === null) return;
      try {
        window.ISSStorage.cancelPhotoPurgePlan(button.dataset.cancelPurgePlan, { actor: registeredBy.value || "利用者", reason: reason.trim() });
        showMessage("完全削除計画を取り消しました。");
        renderPurgePlans();
      } catch (error) {
        showMessage(error.message || "削除計画を取り消せませんでした。", true);
      }
    }));
  }

  function renderRetention() {
    if (!photoRetentionList) return;
    renderStorageDashboard();
    renderPurgePlans();
    const policy = window.ISSStorage.getPhotoPolicy();
    const all = window.ISSStorage.getPhotoRetentionCandidates();
    const photos = getFilteredRetentionPhotos();
    const reviewCount = all.filter(item => item.retentionStatus === "review-due").length;
    const purgeCount = all.filter(item => item.retentionStatus === "purge-ready").length;
    const holdCount = all.filter(item => item.retentionStatus === "hold").length;
    if (photoRetentionSummary) photoRetentionSummary.textContent = `標準保存期間 ${policy.retentionDays}日／削除後保留 ${policy.deletedGraceDays}日　整理確認 ${reviewCount}件・完全削除候補 ${purgeCount}件・保全指定 ${holdCount}件`;
    if (photoRetentionBulkActions) photoRetentionBulkActions.hidden = String(photoRetentionFilter?.value || "") !== "purge-ready";
    if (selectAllPurgeCandidates) selectAllPurgeCandidates.checked = false;
    if (!photos.length) {
      photoRetentionList.innerHTML = '<div class="empty-state"><strong>該当する写真はありません</strong><p>保存期間設定と写真の状態に応じて候補が表示されます。</p></div>';
      return;
    }
    photoRetentionList.innerHTML = photos.slice(0, 300).map(item => `
      <article class="photo-retention-item">
        <div class="photo-retention-item__head">
          <div>${item.retentionStatus === "purge-ready" ? `<label class="purge-select"><input data-purge-photo type="checkbox" value="${escapeHtml(item.id)}"> 削除計画へ選択</label>` : ""}<span class="application-number">${escapeHtml(item.applicationNumber || "申請番号なし")}</span><p>${escapeHtml(item.fileName || "写真")}</p></div>
          <span class="photo-retention-status" data-status="${escapeHtml(item.retentionStatus)}">${escapeHtml(retentionStatusText(item.retentionStatus))}</span>
        </div>
        <p>撮影・登録基準日：${escapeHtml(formatDate(item.shootingAt || item.registeredAt))} ／ 判定日：${escapeHtml(formatDate(item.retentionDueAt))}</p>
        ${item.retentionHold ? `<p>保全理由：${escapeHtml(item.retentionHoldReason || "理由未記録")} ／ 指定者：${escapeHtml(item.retentionHoldBy || "利用者")}</p>` : ""}
        <div class="management-actions">
          <button data-view-photo="${escapeHtml(item.id)}" type="button">拡大表示</button>
          ${item.retentionHold
            ? `<button data-release-retention="${escapeHtml(item.id)}" type="button">保全指定を解除</button>`
            : `<button data-hold-retention="${escapeHtml(item.id)}" type="button">保全指定する</button>`}
        </div>
      </article>
    `).join("");
    photoRetentionList.querySelectorAll("[data-view-photo]").forEach(button => button.addEventListener("click", () => openViewer(button.dataset.viewPhoto)));
    photoRetentionList.querySelectorAll("[data-hold-retention]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("保全指定の理由を入力してください。", "案件対応または証拠保全のため");
      if (reason === null || !reason.trim()) return showMessage("保全理由は必須です。", true);
      window.ISSStorage.setPhotoRetentionHold(button.dataset.holdRetention, { hold: true, reason: reason.trim(), actor: registeredBy.value || "利用者" });
      render();
      renderRetention();
    }));
    photoRetentionList.querySelectorAll("[data-release-retention]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("保全指定を解除する理由を入力してください。", "保全の必要がなくなったため");
      if (reason === null || !reason.trim()) return showMessage("解除理由は必須です。", true);
      window.ISSStorage.setPhotoRetentionHold(button.dataset.releaseRetention, { hold: false, reason: reason.trim(), actor: registeredBy.value || "利用者" });
      render();
      renderRetention();
    }));
  }

  selectAllPurgeCandidates?.addEventListener("change", () => {
    document.querySelectorAll('[data-purge-photo]').forEach(input => { input.checked = selectAllPurgeCandidates.checked; });
  });

  createPhotoPurgePlanButton?.addEventListener("click", () => {
    const photoIds = getSelectedPurgePhotoIds();
    try {
      const plan = window.ISSStorage.createPhotoPurgePlan({
        photoIds,
        createdBy: registeredBy.value || "利用者",
        reason: String(photoPurgeReason?.value || "").trim(),
        assignedApprover: String(photoPurgeAssignedApprover?.value || "").trim()
      });
      if (photoPurgeReason) photoPurgeReason.value = "";
      if (photoPurgeAssignedApprover) photoPurgeAssignedApprover.value = "";
      showMessage(`完全削除計画を作成しました（${plan.photoCount}件）。承認期限は${formatDate(plan.approvalDueAt)}です。`);
      renderRetention();
    } catch (error) {
      showMessage(error.message || "完全削除計画を作成できませんでした。", true);
    }
  });

  exportPhotoPurgeCertificatesButton?.addEventListener("click", () => {
    const certificates = window.ISSStorage.getPhotoPurgeCertificates({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" });
    if (!certificates.length) return showMessage("出力対象の完全削除証明書がありません。", true);
    downloadJson(`photo-purge-certificates-${new Date().toISOString().slice(0, 10)}.json`, { schemaVersion: "1.0", exportedAt: new Date().toISOString(), certificates });
    showMessage(`完全削除証明書をJSON出力しました（${certificates.length}件）。`);
  });

  function renderCertificateVerification(result) {
    if (!photoPurgeVerificationResult) return;
    const errors = (result.errors || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
    const warnings = (result.warnings || []).map(item => `<li>${escapeHtml(item)}</li>`).join("");
    photoPurgeVerificationResult.className = `certificate-verification-result ${result.valid ? "is-valid" : "is-invalid"}`;
    photoPurgeVerificationResult.innerHTML = `
      <div class="certificate-verification-result__head">
        <strong>${result.valid ? "検証合格" : "検証不合格"}</strong>
        <span>${escapeHtml(formatDate(result.verifiedAt))}</span>
      </div>
      <dl class="photo-meta">
        <div><dt>証明書ID</dt><dd>${escapeHtml(result.certificateId || "-")}</dd></div>
        <div><dt>削除計画ID</dt><dd>${escapeHtml(result.planId || "-")}</dd></div>
        <div><dt>登録計画との照合</dt><dd>${result.linkedPlanFound ? "照合済み" : "端末内計画なし"}</dd></div>
        <div><dt>削除結果</dt><dd>${Number(result.summary?.deletedPhotoCount || 0)}件／${escapeHtml(bytesToText(result.summary?.deletedBytes || 0))}</dd></div>
        <div><dt>登録ハッシュ</dt><dd class="hash-value">${escapeHtml(result.suppliedHash || "-")}</dd></div>
        <div><dt>再計算ハッシュ</dt><dd class="hash-value">${escapeHtml(result.calculatedHash || "-")}</dd></div>
      </dl>
      ${errors ? `<section><h3>エラー</h3><ul>${errors}</ul></section>` : ""}
      ${warnings ? `<section><h3>注意事項</h3><ul>${warnings}</ul></section>` : ""}
      ${result.valid ? "<p>証明書の内部整合性と検証ハッシュに問題はありません。</p>" : "<p>この証明書は正規の削除証明書として扱わず、原本と削除計画を確認してください。</p>"}
    `;
    photoPurgeVerificationResult.hidden = false;
    if (exportPhotoPurgeVerificationButton) exportPhotoPurgeVerificationButton.disabled = false;
  }

  verifyPhotoPurgeCertificateButton?.addEventListener("click", async () => {
    const file = photoPurgeCertificateFile?.files?.[0];
    if (!file) return showMessage("検証する削除証明書JSONを選択してください。", true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const certificate = Array.isArray(parsed.certificates) ? parsed.certificates[0] : parsed;
      latestCertificateVerification = window.ISSStorage.verifyPhotoPurgeCertificate(certificate);
      renderCertificateVerification(latestCertificateVerification);
      renderCertificateLedger();
      showMessage(latestCertificateVerification.valid ? "削除証明書の検証に合格しました。" : "削除証明書の検証で不一致を検出しました。", !latestCertificateVerification.valid);
    } catch (error) {
      latestCertificateVerification = null;
      if (exportPhotoPurgeVerificationButton) exportPhotoPurgeVerificationButton.disabled = true;
      if (photoPurgeVerificationResult) photoPurgeVerificationResult.hidden = true;
      showMessage(error instanceof SyntaxError ? "JSON形式を読み取れませんでした。" : (error.message || "証明書の検証に失敗しました。"), true);
    }
  });

  exportPhotoPurgeVerificationButton?.addEventListener("click", () => {
    if (!latestCertificateVerification) return showMessage("出力できる検証結果がありません。", true);
    const id = latestCertificateVerification.certificateId || "unknown";
    downloadJson(`photo-purge-certificate-verification-${id}.json`, {
      schemaVersion: "1.0",
      ...latestCertificateVerification
    });
    showMessage("証明書検証結果をJSON出力しました。");
  });

  exportPhotoPurgePlansButton?.addEventListener("click", () => {
    const plans = window.ISSStorage.getPhotoPurgePlans();
    if (!plans.length) return showMessage("出力対象の完全削除計画がありません。", true);
    const blob = new Blob([JSON.stringify({ schemaVersion: "1.0", exportedAt: new Date().toISOString(), plans }, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `photo-purge-plans-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    showMessage(`完全削除計画をJSON出力しました（${plans.length}件）。`);
  });

  exportPhotoRetentionCsvButton?.addEventListener("click", () => {
    const photos = getFilteredRetentionPhotos();
    if (!photos.length) return showMessage("CSV出力対象の保存期間データがありません。", true);
    const rows = [["状態", "申請番号", "写真ID", "ファイル名", "撮影日時", "登録日時", "判定日", "保全指定", "保全理由", "指定者", "事業所"]];
    photos.forEach(item => rows.push([retentionStatusText(item.retentionStatus), item.applicationNumber || "", item.id || "", item.fileName || "", formatDate(item.shootingAt), formatDate(item.registeredAt), formatDate(item.retentionDueAt), item.retentionHold ? "はい" : "いいえ", item.retentionHoldReason || "", item.retentionHoldBy || "", item.office || ""]));
    downloadCsv(`photo-retention-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showMessage(`写真保存期間一覧をCSV出力しました（${photos.length}件）。`);
  });

  exportPhotoAuditCsvButton?.addEventListener("click", () => {
    const logs = getFilteredAuditLogs();
    if (!logs.length) return showMessage("CSV出力対象の操作履歴がありません。", true);
    const rows = [["日時", "操作", "申請番号", "写真ID", "ファイル名", "操作者", "事業所", "理由"]];
    logs.forEach(item => rows.push([
      formatDate(item.occurredAt), actionText(item.action), item.applicationNumber || "", item.photoId || "",
      item.after?.fileName || item.before?.fileName || "", item.actor || "", item.office || "", item.reason || ""
    ]));
    downloadCsv(`photo-audit-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showMessage(`写真操作履歴をCSV出力しました（${logs.length}件）。`);
  });

  exportPhotosCsvButton?.addEventListener("click", () => {
    const photos = getFilteredPhotos();
    if (!photos.length) {
      showMessage("CSV出力対象の写真がありません。", true);
      return;
    }
    const rows = [["申請番号", "撮影日時", "撮影日時取得", "登録者", "事業所", "保存容量MB", "元画像容量MB", "保存寸法", "圧縮モード", "GPS保存", "GPS", "メタデータ除去", "代表写真", "コメント"]];
    photos.forEach(item => {
      rows.push([
        item.applicationNumber || "",
        formatDate(item.shootingAt),
        captureSourceToText(item.capturedAtSource),
        item.registeredBy || "",
        item.office || "",
        (Number(item.fileSize || 0) / 1024 / 1024).toFixed(2),
        (Number(item.originalFileSize || 0) / 1024 / 1024).toFixed(2),
        item.imageWidth && item.imageHeight ? `${item.imageWidth}x${item.imageHeight}` : "",
        item.compressionMode || "",
        item.gpsRetentionConsent ? "はい" : "いいえ",
        item.gpsRetentionConsent ? gpsToText(item.gps) : "",
        item.metadataSanitized === false ? "いいえ" : "はい",
        item.representative ? "はい" : "いいえ",
        item.comment || ""
      ]);
    });
    downloadCsv(`application-photos-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showMessage(`写真一覧をCSV出力しました（${photos.length}件）。`);
  });

  exportPhotoPurgeNotificationsButton?.addEventListener("click", () => {
    const notifications = window.ISSStorage.getPhotoPurgeNotifications();
    const statusFilter = String(photoPurgeStatusFilter?.value || "active");
    const query = String(photoPurgeAssigneeFilter?.value || "").trim().toLowerCase();
    const unackOnly = Boolean(photoPurgeUnacknowledgedOnly?.checked);
    const filtered = notifications.filter(item => {
      if (statusFilter === "pending" && item.status !== "pending") return false;
      if (statusFilter === "approved" && item.status !== "approved") return false;
      if (statusFilter === "overdue" && !String(item.deadlineState || "").includes("overdue")) return false;
      if (statusFilter === "escalated" && !item.escalated) return false;
      if (unackOnly && item.acknowledgedAt) return false;
      const haystack = [item.assignedApprover, item.createdBy, item.approvedBy, item.office, item.id].join(" ").toLowerCase();
      return !query || haystack.includes(query);
    });
    if (!filtered.length) return showMessage("CSV出力対象の削除計画通知がありません。", true);
    const rows = [["優先度", "状態", "事業所", "計画ID", "承認担当者", "作成者", "承認者", "期限状態", "期限", "対象枚数", "容量", "管理者引継ぎ", "通知確認者", "通知確認日時", "理由"]];
    filtered.forEach(item => rows.push([
      item.priority === "critical" ? "至急" : item.priority === "high" ? "優先" : "通常",
      purgePlanStatusText(item.status), item.office || "", item.id || "", item.assignedApprover || "", item.createdBy || "", item.approvedBy || "",
      item.deadlineState || "", item.dueAt ? formatDate(item.dueAt) : "", item.photoCount || 0, bytesToText(item.totalBytes || 0), item.escalated ? "はい" : "いいえ",
      item.acknowledgedBy || "", item.acknowledgedAt ? formatDate(item.acknowledgedAt) : "", item.reason || ""
    ]));
    downloadCsv(`photo-purge-notifications-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    showMessage(`削除計画通知をCSV出力しました（${filtered.length}件）。`);
  });


  function getCertificateLedgerRows() {
    const query = String(photoPurgeCertificateLedgerFilter?.value || "").trim().toLowerCase();
    const statusFilter = String(photoPurgeCertificateLedgerStatus?.value || "all");
    return window.ISSStorage.getPhotoPurgeCertificates({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" })
      .map(certificate => {
        const verification = window.ISSStorage.verifyPhotoPurgeCertificate(certificate);
        const status = verification.valid ? "valid" : "invalid";
        return { certificate, verification, status };
      })
      .filter(row => {
        if (statusFilter !== "all" && row.status !== statusFilter) return false;
        const certificate = row.certificate;
        const haystack = [certificate.certificateId, certificate.planId, certificate.office, certificate.executedBy, ...(certificate.applications || [])].join(" ").toLowerCase();
        return !query || haystack.includes(query);
      })
      .sort((a, b) => String(b.certificate.executedAt || "").localeCompare(String(a.certificate.executedAt || "")));
  }

  function renderCertificateLedger() {
    if (!photoPurgeCertificateLedgerList) return;
    const rows = getCertificateLedgerRows();
    const validCount = rows.filter(row => row.status === "valid").length;
    const invalidCount = rows.filter(row => row.status === "invalid").length;
    if (photoPurgeCertificateLedgerSummary) {
      photoPurgeCertificateLedgerSummary.textContent = `表示 ${rows.length}件／検証合格 ${validCount}件／検証不合格 ${invalidCount}件`;
    }
    if (!rows.length) {
      photoPurgeCertificateLedgerList.innerHTML = '<div class="empty-state"><strong>該当する削除証明書はありません</strong><p>検索条件または検証状態を変更してください。</p></div>';
      return;
    }
    photoPurgeCertificateLedgerList.innerHTML = rows.map(({ certificate, verification, status }) => `
      <article class="certificate-ledger-card">
        <div class="certificate-ledger-card__head">
          <div><span class="application-number">${escapeHtml((certificate.applications || []).join("、") || "申請番号なし")}</span><h3>${escapeHtml(certificate.certificateId || "証明書IDなし")}</h3></div>
          <span class="certificate-status" data-status="${status}">${status === "valid" ? "検証合格" : "検証不合格"}</span>
        </div>
        <dl class="photo-meta">
          <div><dt>削除計画ID</dt><dd>${escapeHtml(certificate.planId || "-")}</dd></div>
          <div><dt>事業所</dt><dd>${escapeHtml(certificate.office || "-")}</dd></div>
          <div><dt>実行者</dt><dd>${escapeHtml(certificate.executedBy || "-")}</dd></div>
          <div><dt>実行日時</dt><dd>${escapeHtml(formatDate(certificate.executedAt))}</dd></div>
          <div><dt>削除結果</dt><dd>${Number(certificate.deletedPhotoCount || 0)}件／${escapeHtml(bytesToText(certificate.deletedBytes || 0))}</dd></div>
          <div><dt>照合結果</dt><dd>${verification.linkedPlanFound ? "削除計画と照合済み" : "証明書単体検証"}</dd></div>
          <div class="photo-form__wide"><dt>検証ハッシュ</dt><dd class="hash-value">${escapeHtml(certificate.verificationHash || "-")}</dd></div>
        </dl>
        ${verification.errors?.length ? `<p class="form-message is-error">${escapeHtml(verification.errors[0])}</p>` : ""}
        <div class="management-actions">
          <button data-ledger-download="${escapeHtml(certificate.planId)}" type="button">証明書JSON</button>
          <button data-ledger-print="${escapeHtml(certificate.planId)}" type="button">証明書を印刷</button>
        </div>
      </article>
    `).join("");
    photoPurgeCertificateLedgerList.querySelectorAll("[data-ledger-download]").forEach(button => button.addEventListener("click", () => {
      const certificate = window.ISSStorage.getPhotoPurgeCertificateByPlanId(button.dataset.ledgerDownload);
      if (certificate) downloadJson(`photo-purge-certificate-${certificate.certificateId}.json`, certificate);
    }));
    photoPurgeCertificateLedgerList.querySelectorAll("[data-ledger-print]").forEach(button => button.addEventListener("click", () => {
      const certificate = window.ISSStorage.getPhotoPurgeCertificateByPlanId(button.dataset.ledgerPrint);
      if (certificate) printPurgeCertificate(certificate);
    }));
  }

  exportPhotoPurgeCertificateLedgerButton?.addEventListener("click", () => {
    const rows = getCertificateLedgerRows();
    if (!rows.length) return showMessage("CSV出力対象の削除証明書がありません。", true);
    const csvRows = [["検証状態", "証明書ID", "削除計画ID", "申請番号", "事業所", "実行者", "実行日時", "削除件数", "削減容量", "計画照合", "検証ハッシュ"]];
    rows.forEach(({ certificate, verification, status }) => csvRows.push([
      status === "valid" ? "検証合格" : "検証不合格", certificate.certificateId || "", certificate.planId || "", (certificate.applications || []).join(" "), certificate.office || "", certificate.executedBy || "", formatDate(certificate.executedAt), Number(certificate.deletedPhotoCount || 0), Number(certificate.deletedBytes || 0), verification.linkedPlanFound ? "照合済み" : "計画なし", certificate.verificationHash || ""
    ]));
    downloadCsv(`photo-purge-certificate-ledger-${new Date().toISOString().slice(0, 10)}.csv`, csvRows);
    showMessage(`削除証明書台帳をCSV出力しました（${rows.length}件）。`);
  });


  function buildMonthlyReconciliation() {
    const targetMonth = String(photoPurgeMonthlyMonth?.value || new Date().toISOString().slice(0, 7));
    const officeFilter = String(photoPurgeMonthlyOffice?.value || "all");
    const certificates = window.ISSStorage.getPhotoPurgeCertificates({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" })
      .filter(item => String(item.executedAt || "").slice(0, 7) === targetMonth)
      .filter(item => officeFilter === "all" || String(item.officeId || item.office || "") === officeFilter);

    const planIds = new Map();
    const certificateIds = new Map();
    const issues = [];
    const offices = new Map();
    let totalPhotos = 0;
    let totalBytes = 0;
    let validCount = 0;

    certificates.forEach(certificate => {
      const verification = window.ISSStorage.verifyPhotoPurgeCertificate(certificate);
      const officeKey = String(certificate.officeId || certificate.office || "未設定");
      const officeName = certificate.office || officeKey;
      const current = offices.get(officeKey) || { officeId: officeKey, office: officeName, certificates: 0, photos: 0, bytes: 0, valid: 0, issues: 0 };
      current.certificates += 1;
      current.photos += Number(certificate.deletedPhotoCount || 0);
      current.bytes += Number(certificate.deletedBytes || 0);
      totalPhotos += Number(certificate.deletedPhotoCount || 0);
      totalBytes += Number(certificate.deletedBytes || 0);
      if (verification.valid) {
        validCount += 1;
        current.valid += 1;
      } else {
        current.issues += 1;
        issues.push({ issueKey: `${targetMonth}|verification-failed|${certificate.certificateId || ""}|${certificate.planId || ""}`, officeId: officeKey, type: "verification-failed", certificateId: certificate.certificateId, planId: certificate.planId, office: officeName, message: (verification.errors || ["証明書検証に失敗しました。"])[0] });
      }
      if (!verification.linkedPlanFound) {
        current.issues += 1;
        issues.push({ issueKey: `${targetMonth}|plan-not-found|${certificate.certificateId || ""}|${certificate.planId || ""}`, officeId: officeKey, type: "plan-not-found", certificateId: certificate.certificateId, planId: certificate.planId, office: officeName, message: "対応する削除計画を照合できません。" });
      }
      const planId = String(certificate.planId || "");
      const certificateId = String(certificate.certificateId || "");
      if (planId) {
        if (planIds.has(planId)) issues.push({ issueKey: `${targetMonth}|duplicate-plan|${certificateId}|${planId}`, officeId: officeKey, type: "duplicate-plan", certificateId, planId, office: officeName, message: `同じ削除計画IDの証明書が複数あります（${planIds.get(planId)}）。` });
        else planIds.set(planId, certificateId);
      }
      if (certificateId) {
        if (certificateIds.has(certificateId)) issues.push({ issueKey: `${targetMonth}|duplicate-certificate|${certificateId}|${planId}`, officeId: officeKey, type: "duplicate-certificate", certificateId, planId, office: officeName, message: "同じ証明書IDが複数あります。" });
        else certificateIds.set(certificateId, planId);
      }
      offices.set(officeKey, current);
    });

    return {
      schemaVersion: "1.0",
      reportType: "photo-purge-monthly-reconciliation",
      targetMonth,
      officeFilter,
      generatedAt: new Date().toISOString(),
      generatedBy: registeredBy?.value || "利用者",
      totals: {
        certificateCount: certificates.length,
        validCount,
        invalidCount: certificates.length - validCount,
        deletedPhotoCount: totalPhotos,
        deletedBytes: totalBytes,
        issueCount: issues.length
      },
      offices: Array.from(offices.values()).sort((a, b) => String(a.office).localeCompare(String(b.office), "ja")),
      issues,
      certificates: certificates.map(item => ({ certificateId: item.certificateId, planId: item.planId, officeId: item.officeId, office: item.office, executedAt: item.executedAt, deletedPhotoCount: item.deletedPhotoCount, deletedBytes: item.deletedBytes, verificationHash: item.verificationHash }))
    };
  }

  function populateMonthlyOfficeOptions() {
    if (!photoPurgeMonthlyOffice) return;
    const current = photoPurgeMonthlyOffice.value || "all";
    const certificates = window.ISSStorage.getPhotoPurgeCertificates({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" });
    const offices = new Map();
    certificates.forEach(item => offices.set(String(item.officeId || item.office || ""), item.office || item.officeId || "未設定"));
    photoPurgeMonthlyOffice.innerHTML = '<option value="all">すべての事業所</option>' + Array.from(offices.entries()).filter(([id]) => id).map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("");
    if (Array.from(photoPurgeMonthlyOffice.options).some(option => option.value === current)) photoPurgeMonthlyOffice.value = current;
  }

  function renderMonthlyReconciliation() {
    if (!photoPurgeMonthlySummary) return;
    const report = buildMonthlyReconciliation();
    const onlyIssues = Boolean(photoPurgeMonthlyIssuesOnly?.checked);
    photoPurgeMonthlySummary.innerHTML = [
      ["証明書", `${report.totals.certificateCount}件`, false],
      ["検証合格", `${report.totals.validCount}件`, false],
      ["要確認", `${report.totals.issueCount}件`, report.totals.issueCount > 0],
      ["削除写真", `${report.totals.deletedPhotoCount}枚`, false],
      ["削減容量", bytesToText(report.totals.deletedBytes), false]
    ].map(([label, value, alert]) => `<article class="${alert ? "is-alert" : ""}"><span>${label}</span><strong>${value}</strong></article>`).join("");

    if (photoPurgeMonthlyOfficeList) {
      const officeRows = onlyIssues ? report.offices.filter(item => item.issues > 0) : report.offices;
      photoPurgeMonthlyOfficeList.innerHTML = officeRows.length ? officeRows.map(item => `
        <article class="certificate-monthly-office-card">
          <h3>${escapeHtml(item.office)}</h3>
          <dl class="photo-meta">
            <div><dt>証明書</dt><dd>${item.certificates}件</dd></div>
            <div><dt>検証合格</dt><dd>${item.valid}件</dd></div>
            <div><dt>削除写真</dt><dd>${item.photos}枚</dd></div>
            <div><dt>削減容量</dt><dd>${escapeHtml(bytesToText(item.bytes))}</dd></div>
            <div><dt>要確認</dt><dd>${item.issues}件</dd></div>
          </dl>
        </article>`).join("") : '<div class="empty-state"><strong>対象データはありません</strong><p>対象月または事業所を変更してください。</p></div>';
    }

    if (photoPurgeMonthlyIssueList) {
      photoPurgeMonthlyIssueList.innerHTML = report.issues.length ? `<h3>要確認事項</h3>` + report.issues.map(item => {
        const corrective = window.ISSStorage.getPhotoPurgeCorrectiveActionByIssueKey(item.issueKey);
        return `<article class="certificate-monthly-issue">
          <h3>${escapeHtml(item.certificateId || "証明書IDなし")}</h3>
          <p>${escapeHtml(item.message)}</p>
          <p>事業所：${escapeHtml(item.office || "-")}／削除計画ID：${escapeHtml(item.planId || "-")}</p>
          <div class="management-actions">${corrective ? `<span class="corrective-status" data-status="${escapeHtml(corrective.status)}">${escapeHtml(correctiveStatusText(corrective.status))}</span>` : `<button data-create-corrective="${escapeHtml(item.issueKey)}" type="button">是正処置を登録</button>`}</div>
        </article>`;
      }).join("") : '<div class="empty-state"><strong>要確認事項はありません</strong><p>対象月の証明書は整合しています。</p></div>';
      photoPurgeMonthlyIssueList.querySelectorAll("[data-create-corrective]").forEach(button => button.addEventListener("click", () => {
        const issue = report.issues.find(item => item.issueKey === button.dataset.createCorrective);
        if (issue) createCorrectiveActionFromIssue(issue, report.targetMonth);
      }));
    }
  }

  function correctiveStatusText(status) {
    return status === "open" ? "対応中" : status === "completed-awaiting-verification" ? "完了確認待ち" : status === "closed" ? "完了" : status;
  }


  function rootCauseCategoryText(value) {
    return ({ human: "人的要因", procedure: "手順・ルール", system: "システム", training: "教育・力量", management: "管理・監督", external: "外部要因", other: "その他", unclassified: "未分類" })[String(value || "unclassified")] || String(value || "未分類");
  }

  function effectivenessStatusText(value) {
    return ({ "not-planned": "未計画", planned: "効果確認待ち", effective: "有効確認済み", ineffective: "効果不十分" })[String(value || "not-planned")] || String(value || "未計画");
  }

  function createCorrectiveActionFromIssue(issue, targetMonth) {
    const cause = prompt("要確認事項の原因を入力してください。", "");
    if (cause === null) return;
    const correctiveAction = prompt("是正内容を入力してください。", "");
    if (correctiveAction === null) return;
    const assignedTo = prompt("対応担当者を入力してください。", "");
    if (assignedTo === null) return;
    const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const dueAt = prompt("対応期限をYYYY-MM-DDで入力してください。", defaultDue);
    if (dueAt === null) return;
    try {
      window.ISSStorage.createPhotoPurgeCorrectiveAction({
        issueKey: issue.issueKey, issueType: issue.type, certificateId: issue.certificateId, planId: issue.planId,
        targetMonth, officeId: issue.officeId || window.ISSStorage.getOfficeId(), office: issue.office,
        issueMessage: issue.message, cause, correctiveAction, assignedTo, dueAt: `${dueAt}T23:59:59`,
        createdBy: registeredBy?.value || "利用者"
      });
      showMessage("是正処置を登録しました。");
      renderMonthlyReconciliation(); renderCorrectiveActions();
    } catch (error) { showMessage(error.message || "是正処置を登録できませんでした。", true); }
  }

  function getFilteredCorrectiveActions() {
    const statusFilter = String(photoPurgeCorrectiveStatus?.value || "active");
    const query = String(photoPurgeCorrectiveFilter?.value || "").trim().toLowerCase();
    const month = String(photoPurgeCorrectiveMonth?.value || "");
    const office = String(photoPurgeCorrectiveOffice?.value || "all");
    const now = Date.now();
    return window.ISSStorage.getPhotoPurgeCorrectiveActions({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" })
      .filter(item => {
        if (statusFilter === "all") return true;
        if (statusFilter === "active") return item.status !== "closed";
        if (statusFilter === "overdue") return item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < now;
        if (statusFilter === "escalated") return item.status !== "closed" && item.escalationLevel === "administrator";
        return item.status === statusFilter;
      })
      .filter(item => !month || String(item.targetMonth || item.createdAt || "").slice(0, 7) === month)
      .filter(item => office === "all" || item.officeId === office)
      .filter(item => !query || [item.certificateId, item.planId, item.assignedTo, item.cause, item.correctiveAction, item.office, item.escalationReason].join(" ").toLowerCase().includes(query))
      .sort((a, b) => String(a.dueAt || "9999").localeCompare(String(b.dueAt || "9999")));
  }

  function populateCorrectiveOfficeOptions() {
    if (!photoPurgeCorrectiveOffice) return;
    const current = photoPurgeCorrectiveOffice.value || "all";
    const actions = window.ISSStorage.getPhotoPurgeCorrectiveActions({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" });
    const offices = [...new Map(actions.filter(item => item.officeId).map(item => [item.officeId, item.office || item.officeId])).entries()];
    photoPurgeCorrectiveOffice.innerHTML = '<option value="all">すべての事業所</option>' + offices.map(([id, name]) => `<option value="${escapeHtml(id)}">${escapeHtml(name)}</option>`).join("");
    if (["all", ...offices.map(([id]) => id)].includes(current)) photoPurgeCorrectiveOffice.value = current;
  }

  function buildCorrectiveMonthlyReport() {
    const rows = getFilteredCorrectiveActions();
    const month = String(photoPurgeCorrectiveMonth?.value || new Date().toISOString().slice(0, 7));
    const now = Date.now();
    const byOffice = {};
    rows.forEach(item => {
      const key = item.officeId || "unknown";
      byOffice[key] ||= { officeId: key, office: item.office || "未設定", total: 0, open: 0, awaitingVerification: 0, overdue: 0, escalated: 0, closed: 0 };
      const group = byOffice[key];
      group.total += 1;
      if (item.status === "open") group.open += 1;
      if (item.status === "completed-awaiting-verification") group.awaitingVerification += 1;
      if (item.status === "closed") group.closed += 1;
      if (item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < now) group.overdue += 1;
      if (item.status !== "closed" && item.escalationLevel === "administrator") group.escalated += 1;
    });
    return {
      schemaVersion: "1.0",
      reportType: "photo-purge-corrective-action-monthly",
      targetMonth: month,
      generatedAt: new Date().toISOString(),
      generatedBy: registeredBy?.value || "利用者",
      totals: {
        total: rows.length,
        open: rows.filter(item => item.status === "open").length,
        awaitingVerification: rows.filter(item => item.status === "completed-awaiting-verification").length,
        overdue: rows.filter(item => item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < now).length,
        escalated: rows.filter(item => item.status !== "closed" && item.escalationLevel === "administrator").length,
        closed: rows.filter(item => item.status === "closed").length
      },
      offices: Object.values(byOffice),
      actions: rows.map(item => ({ ...item }))
    };
  }



  function correctiveEvidenceCategoryText(category) {
    return ({
      implementation: "実施証拠",
      effectiveness: "効果確認資料",
      "horizontal-deployment": "横展開資料",
      other: "その他"
    })[category] || category || "未分類";
  }

  function correctiveEvidenceStatusText(status) {
    return ({
      "pending-review": "確認待ち",
      reviewed: "確認済み",
      rejected: "差戻し",
      removed: "削除済み"
    })[status] || status || "不明";
  }

  function correctiveEvidenceAccessText(level) {
    return ({ office: "所属事業所", "office-admin": "事業所管理者・管理者", administrator: "管理者のみ" })[level] || "所属事業所";
  }

  function promptCorrectiveEvidenceAccessPolicy(defaultLevel = "office", defaultRestricted = false) {
    const level = prompt("閲覧区分を入力してください（office / office-admin / administrator）", defaultLevel);
    if (level === null) return null;
    if (!["office", "office-admin", "administrator"].includes(level)) throw new Error("閲覧区分は office / office-admin / administrator のいずれかです。");
    const restricted = confirm(defaultRestricted ? "ダウンロード理由の入力を引き続き必須にしますか？" : "ダウンロード時に理由入力を必須にしますか？");
    return { accessLevel: level, downloadRestricted: restricted };
  }

  function chooseCorrectiveEvidenceFile(actionId) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf,text/csv,text/plain,.csv,.txt,.pdf";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return showMessage("証拠資料は1ファイル5MB以下にしてください。", true);
      const category = prompt("資料区分を入力してください（implementation / effectiveness / horizontal-deployment / other）", "implementation");
      if (category === null) return;
      const title = prompt("資料名を入力してください。", file.name.replace(/\.[^.]+$/, ""));
      if (title === null) return;
      const note = prompt("資料の内容・確認ポイントを入力してください。", "");
      if (note === null) return;
      let accessPolicy;
      try { accessPolicy = promptCorrectiveEvidenceAccessPolicy("office", false); } catch (error) { return showMessage(error.message, true); }
      if (!accessPolicy) return;
      try {
        const [dataUrl, fingerprint] = await Promise.all([readFileAsDataUrl(file), digestFile(file)]);
        window.ISSStorage.addPhotoPurgeCorrectiveEvidence(actionId, {
          actor: registeredBy?.value || "利用者",
          category,
          title,
          note,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          fingerprint,
          dataUrl,
          accessLevel: accessPolicy.accessLevel,
          downloadRestricted: accessPolicy.downloadRestricted
        });
        renderCorrectiveActions();
        showMessage("証拠資料を登録しました。別担当者による資料確認が必要です。");
      } catch (error) {
        showMessage(error.message || "証拠資料を登録できませんでした。", true);
      }
    }, { once: true });
    input.click();
  }

  function replaceCorrectiveEvidenceFile(actionId, evidenceId) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,application/pdf,text/csv,text/plain,.csv,.txt,.pdf";
    input.addEventListener("change", async () => {
      const file = input.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return showMessage("証拠資料は1ファイル5MB以下にしてください。", true);
      const reason = prompt("資料の差し替え理由を入力してください。", "内容更新または差戻し対応のため");
      if (reason === null || !reason.trim()) return;
      const title = prompt("資料名を確認してください。", file.name.replace(/\.[^.]+$/, ""));
      if (title === null) return;
      const note = prompt("資料の内容・確認ポイントを入力してください。", "");
      if (note === null) return;
      try {
        const [dataUrl, fingerprint] = await Promise.all([readFileAsDataUrl(file), digestFile(file)]);
        window.ISSStorage.replacePhotoPurgeCorrectiveEvidence(actionId, evidenceId, {
          actor: registeredBy?.value || "利用者",
          reason,
          title,
          note,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          fileSize: file.size,
          fingerprint,
          dataUrl
        });
        renderCorrectiveActions();
        showMessage("証拠資料を差し替えました。旧版は履歴として保持されます。");
      } catch (error) {
        showMessage(error.message || "証拠資料を差し替えできませんでした。", true);
      }
    }, { once: true });
    input.click();
  }

  function downloadCorrectiveEvidence(actionId, evidenceId) {
    const action = window.ISSStorage.getPhotoPurgeCorrectiveActions({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" }).find(item => item.id === actionId);
    const evidence = action?.evidenceAttachments?.find(item => item.id === evidenceId && item.status !== "removed");
    if (!evidence?.dataUrl) return showMessage("資料本体が見つかりません。", true);
    let reason = "";
    if (evidence.downloadRestricted) {
      reason = prompt("この資料のダウンロード理由を入力してください。", "内容確認のため") || "";
      if (!reason.trim()) return showMessage("ダウンロード理由が必要です。", true);
    }
    try {
      window.ISSStorage.recordCorrectiveEvidenceAccess(actionId, evidenceId, { actor: registeredBy?.value || "利用者", operation: "download", reason });
      const link = document.createElement("a");
      link.href = evidence.dataUrl;
      link.download = evidence.fileName || "evidence";
      document.body.append(link);
      link.click();
      link.remove();
      showMessage("証拠資料を開きました。アクセス履歴を記録しました。");
    } catch (error) {
      showMessage(error.message || "証拠資料を開けませんでした。", true);
    }
  }

  function changeCorrectiveEvidenceAccessPolicy(actionId, evidenceId) {
    const action = window.ISSStorage.getPhotoPurgeCorrectiveActions({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" }).find(item => item.id === actionId);
    const evidence = action?.evidenceAttachments?.find(item => item.id === evidenceId);
    if (!evidence) return showMessage("証拠資料が見つかりません。", true);
    try {
      const policy = promptCorrectiveEvidenceAccessPolicy(evidence.accessLevel || "office", Boolean(evidence.downloadRestricted));
      if (!policy) return;
      window.ISSStorage.updateCorrectiveEvidenceAccessPolicy(actionId, evidenceId, { ...policy, actor: registeredBy?.value || "利用者" });
      renderCorrectiveActions();
      showMessage("証拠資料の閲覧・ダウンロード設定を変更しました。");
    } catch (error) {
      showMessage(error.message || "閲覧設定を変更できませんでした。", true);
    }
  }


  function renderCorrectiveActions() {
    if (!photoPurgeCorrectiveList) return;
    const all = window.ISSStorage.getPhotoPurgeCorrectiveActions({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" });
    const rows = getFilteredCorrectiveActions();
    const overdue = all.filter(item => item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < Date.now()).length;
    if (photoPurgeCorrectiveSummary) photoPurgeCorrectiveSummary.innerHTML = [
      ["対応中", all.filter(item => item.status === "open").length],
      ["完了確認待ち", all.filter(item => item.status === "completed-awaiting-verification").length],
      ["期限超過", overdue], ["管理者エスカレーション", all.filter(item => item.status !== "closed" && item.escalationLevel === "administrator").length], ["完了", all.filter(item => item.status === "closed").length]
    ].map(([label, value]) => `<article class="${label === "期限超過" && value ? "is-alert" : ""}"><span>${label}</span><strong>${value}件</strong></article>`).join("");
    if (photoPurgeCorrectiveAssigneeSummary) {
      const counts = rows.reduce((map, item) => { const key = item.assignedTo || "未設定"; map[key] = (map[key] || 0) + 1; return map; }, {});
      photoPurgeCorrectiveAssigneeSummary.innerHTML = Object.entries(counts).sort((a,b) => b[1]-a[1]).map(([name, count]) => `<span><strong>${escapeHtml(name)}</strong>${count}件</span>`).join("") || "";
    }
    if (!rows.length) { photoPurgeCorrectiveList.innerHTML = '<div class="empty-state"><strong>該当する是正処置はありません</strong><p>検索条件または状態を変更してください。</p></div>'; return; }
    photoPurgeCorrectiveList.innerHTML = rows.map(item => {
      const isOverdue = item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < Date.now();
      return `<article class="certificate-corrective-card ${isOverdue ? "is-overdue" : ""}">
        <div class="certificate-corrective-card__head"><div><span class="application-number">${escapeHtml(item.office || "事業所未設定")}</span><h3>${escapeHtml(item.certificateId || item.planId || "要確認事項")}</h3></div><span class="corrective-status" data-status="${escapeHtml(item.status)}">${escapeHtml(correctiveStatusText(item.status))}</span></div>
        <p>${escapeHtml(item.issueMessage || "")}</p><dl class="photo-meta">
        <div><dt>原因</dt><dd>${escapeHtml(item.cause)}</dd></div><div><dt>是正内容</dt><dd>${escapeHtml(item.correctiveAction)}</dd></div>
        <div><dt>担当者</dt><dd>${escapeHtml(item.assignedTo)}</dd></div><div><dt>対応期限</dt><dd>${escapeHtml(formatDate(item.dueAt))}${isOverdue ? "（期限超過）" : ""}</dd></div>
        <div><dt>対応結果</dt><dd>${escapeHtml(item.completionNote || "-")}</dd></div><div><dt>完了確認者</dt><dd>${escapeHtml(item.verifiedBy || "-")}</dd></div>
        <div><dt>原因分類</dt><dd>${escapeHtml(rootCauseCategoryText(item.rootCauseCategory))}</dd></div><div><dt>再発防止策</dt><dd>${escapeHtml(item.recurrencePrevention || "未登録")}</dd></div>
        <div><dt>効果確認</dt><dd>${escapeHtml(effectivenessStatusText(item.effectivenessStatus))}${item.effectivenessDueAt ? `／期限 ${escapeHtml(formatDate(item.effectivenessDueAt))}` : ""}</dd></div><div><dt>横展開</dt><dd>${Array.isArray(item.horizontalDeployments) ? item.horizontalDeployments.length : 0}件</dd></div>
        <div><dt>証拠資料</dt><dd>${Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status !== "removed").length : 0}件／確認済み ${Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status === "reviewed").length : 0}件</dd></div>
        <div><dt>エスカレーション</dt><dd>${item.escalationLevel === "administrator" ? `管理者へ引継ぎ済み／${escapeHtml(item.escalationReason || "理由未記録")}` : "なし"}</dd></div></dl>
        ${Array.isArray(item.horizontalDeployments) && item.horizontalDeployments.length ? `<div class="corrective-deployment-list">${item.horizontalDeployments.map(entry => `<span><strong>${escapeHtml(entry.targetOffice)}</strong>${escapeHtml(entry.note)}</span>`).join("")}</div>` : ""}
        ${Array.isArray(item.evidenceAttachments) && item.evidenceAttachments.some(entry => entry.status !== "removed") ? `<div class="corrective-evidence-list">${item.evidenceAttachments.filter(entry => entry.status !== "removed").sort((a,b) => Number(b.version || 1) - Number(a.version || 1)).map(entry => `<article class="${entry.isCurrent === false ? "is-previous-version" : "is-current-version"}"><div><strong>${escapeHtml(entry.title)} <span class="evidence-version-badge">v${Number(entry.version || 1)}</span></strong><span>${escapeHtml(correctiveEvidenceCategoryText(entry.category))}／${escapeHtml(correctiveEvidenceStatusText(entry.status))}／${entry.isCurrent === false ? "旧版" : "現行版"}／${entry.originalVerified ? "原本性確認済み" : "原本性未確認"}／閲覧：${escapeHtml(correctiveEvidenceAccessText(entry.accessLevel))}／${entry.downloadRestricted ? "DL理由必須" : "DL可"}／${(Number(entry.fileSize || 0) / 1024 / 1024).toFixed(2)}MB</span><small>${escapeHtml(entry.note || entry.fileName || "")}${entry.replacementReason ? `／差し替え理由：${escapeHtml(entry.replacementReason)}` : ""}</small></div><div class="management-actions"><button data-download-corrective-evidence="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button">開く</button><button data-evidence-access-policy="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button">閲覧設定</button>${entry.isCurrent !== false && (entry.status === "pending-review" || entry.status === "rejected") ? `<button data-review-corrective-evidence="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button">資料確認</button>` : ""}${entry.isCurrent !== false && !entry.originalVerified ? `<button data-verify-corrective-evidence-original="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button">原本性確認</button>` : ""}${entry.isCurrent !== false ? `<button data-replace-corrective-evidence="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button">差し替え</button>` : ""}<button data-remove-corrective-evidence="${escapeHtml(item.id)}|${escapeHtml(entry.id)}" type="button" class="danger-action">資料削除</button></div></article>`).join("")}</div>` : ""}
        <div class="management-actions"><button data-add-corrective-evidence="${escapeHtml(item.id)}" type="button">証拠資料を登録</button>${item.status === "open" ? `<button data-update-corrective="${escapeHtml(item.id)}" type="button">内容更新</button><button data-complete-corrective="${escapeHtml(item.id)}" type="button">対応完了</button>` : ""}${item.status === "completed-awaiting-verification" ? `<button data-verify-corrective="${escapeHtml(item.id)}" type="button">完了確認</button>` : ""}${item.status !== "closed" && item.escalationLevel !== "administrator" ? `<button data-escalate-corrective="${escapeHtml(item.id)}" type="button">管理者へエスカレーション</button>` : ""}<button data-plan-prevention="${escapeHtml(item.id)}" type="button">再発防止計画</button><button data-horizontal-deployment="${escapeHtml(item.id)}" type="button">横展開を登録</button>${item.recurrencePrevention ? `<button data-verify-effectiveness="${escapeHtml(item.id)}" type="button">効果確認</button>` : ""}</div></article>`;
    }).join("");
    photoPurgeCorrectiveList.querySelectorAll("[data-add-corrective-evidence]").forEach(button => button.addEventListener("click", () => chooseCorrectiveEvidenceFile(button.dataset.addCorrectiveEvidence)));
    photoPurgeCorrectiveList.querySelectorAll("[data-download-corrective-evidence]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.downloadCorrectiveEvidence || "").split("|");
      downloadCorrectiveEvidence(actionId, evidenceId);
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-evidence-access-policy]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.evidenceAccessPolicy || "").split("|");
      changeCorrectiveEvidenceAccessPolicy(actionId, evidenceId);
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-replace-corrective-evidence]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.replaceCorrectiveEvidence || "").split("|");
      replaceCorrectiveEvidenceFile(actionId, evidenceId);
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-verify-corrective-evidence-original]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.verifyCorrectiveEvidenceOriginal || "").split("|");
      const note = prompt("原本または正式な発行元資料との照合内容を入力してください。", "原本・発行元・内容・ハッシュを確認しました。");
      if (note === null) return;
      try { window.ISSStorage.verifyPhotoPurgeCorrectiveEvidenceOriginal(actionId, evidenceId, { actor: registeredBy?.value || "利用者", note }); renderCorrectiveActions(); showMessage("証拠資料の原本性確認を登録しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-review-corrective-evidence]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.reviewCorrectiveEvidence || "").split("|");
      const result = prompt("資料確認結果を入力してください（reviewed / rejected）", "reviewed"); if (result === null) return;
      const note = prompt("確認内容を入力してください。", result === "reviewed" ? "資料内容を確認しました。" : "資料の差し替えまたは補足が必要です。"); if (note === null) return;
      try { window.ISSStorage.reviewPhotoPurgeCorrectiveEvidence(actionId, evidenceId, { actor: registeredBy?.value || "利用者", result, note }); renderCorrectiveActions(); showMessage("証拠資料の確認結果を登録しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-remove-corrective-evidence]").forEach(button => button.addEventListener("click", () => {
      const [actionId, evidenceId] = String(button.dataset.removeCorrectiveEvidence || "").split("|");
      const reason = prompt("証拠資料の削除理由を入力してください。", "誤登録のため"); if (reason === null) return;
      try { window.ISSStorage.removePhotoPurgeCorrectiveEvidence(actionId, evidenceId, { actor: registeredBy?.value || "利用者", reason }); renderCorrectiveActions(); showMessage("証拠資料を削除しました。履歴は保持されます。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-update-corrective]").forEach(button => button.addEventListener("click", () => {
      const item = all.find(row => row.id === button.dataset.updateCorrective); if (!item) return;
      const assignedTo = prompt("対応担当者", item.assignedTo || ""); if (assignedTo === null) return;
      const correctiveAction = prompt("是正内容", item.correctiveAction || ""); if (correctiveAction === null) return;
      const dueAt = prompt("対応期限（YYYY-MM-DD）", String(item.dueAt || "").slice(0, 10)); if (dueAt === null) return;
      try { window.ISSStorage.updatePhotoPurgeCorrectiveAction(item.id, { actor: registeredBy?.value || "利用者", assignedTo, correctiveAction, dueAt: `${dueAt}T23:59:59`, note: "内容更新" }); renderCorrectiveActions(); showMessage("是正処置を更新しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-complete-corrective]").forEach(button => button.addEventListener("click", () => {
      const note = prompt("対応結果を入力してください。", ""); if (note === null) return;
      try { window.ISSStorage.completePhotoPurgeCorrectiveAction(button.dataset.completeCorrective, { actor: registeredBy?.value || "利用者", note }); renderCorrectiveActions(); showMessage("対応完了を登録しました。別担当者の完了確認が必要です。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-verify-corrective]").forEach(button => button.addEventListener("click", () => {
      const note = prompt("完了確認の内容を入力してください。", "是正内容と証明書・削除計画を確認しました。"); if (note === null) return;
      try { window.ISSStorage.verifyPhotoPurgeCorrectiveAction(button.dataset.verifyCorrective, { actor: registeredBy?.value || "利用者", note }); renderCorrectiveActions(); renderMonthlyReconciliation(); showMessage("是正処置を完了しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-escalate-corrective]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("管理者へエスカレーションする理由を入力してください。", "対応期限超過または事業所内での解決が困難なため");
      if (reason === null) return;
      try { window.ISSStorage.escalatePhotoPurgeCorrectiveAction(button.dataset.escalateCorrective, { actor: registeredBy?.value || "利用者", reason }); renderCorrectiveActions(); showMessage("是正処置を管理者へエスカレーションしました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-plan-prevention]").forEach(button => button.addEventListener("click", () => {
      const item = all.find(row => row.id === button.dataset.planPrevention); if (!item) return;
      const category = prompt("原因分類を入力してください（human / procedure / system / training / management / external / other）", item.rootCauseCategory || "procedure"); if (category === null) return;
      const recurrencePrevention = prompt("再発防止策を入力してください。", item.recurrencePrevention || ""); if (recurrencePrevention === null) return;
      const preventionOwner = prompt("再発防止責任者を入力してください。", item.preventionOwner || item.assignedTo || ""); if (preventionOwner === null) return;
      const defaultDue = item.effectivenessDueAt ? String(item.effectivenessDueAt).slice(0,10) : new Date(Date.now()+30*86400000).toISOString().slice(0,10);
      const effectivenessDueAt = prompt("効果確認期限（YYYY-MM-DD）", defaultDue); if (effectivenessDueAt === null) return;
      try { window.ISSStorage.updatePhotoPurgePreventionPlan(item.id, { actor: registeredBy?.value || "利用者", rootCauseCategory: category, recurrencePrevention, preventionOwner, effectivenessDueAt: `${effectivenessDueAt}T23:59:59` }); renderCorrectiveActions(); showMessage("再発防止計画を登録しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-horizontal-deployment]").forEach(button => button.addEventListener("click", () => {
      const targetOffice = prompt("横展開先（事業所・部署）を入力してください。", "第一ブロック各事業所"); if (targetOffice === null) return;
      const note = prompt("共有する再発防止内容を入力してください。", ""); if (note === null) return;
      try { window.ISSStorage.addPhotoPurgeHorizontalDeployment(button.dataset.horizontalDeployment, { actor: registeredBy?.value || "利用者", targetOffice, note }); renderCorrectiveActions(); showMessage("横展開を登録しました。"); } catch (error) { showMessage(error.message, true); }
    }));
    photoPurgeCorrectiveList.querySelectorAll("[data-verify-effectiveness]").forEach(button => button.addEventListener("click", () => {
      const resultInput = prompt("効果確認結果を入力してください（effective / ineffective）", "effective"); if (resultInput === null) return;
      const note = prompt("効果確認の根拠・結果を入力してください。", "同種事象の再発がないことを確認しました。"); if (note === null) return;
      try { window.ISSStorage.verifyPhotoPurgePreventionEffectiveness(button.dataset.verifyEffectiveness, { actor: registeredBy?.value || "利用者", result: resultInput, note }); renderCorrectiveActions(); showMessage(resultInput === "effective" ? "再発防止策の有効性を確認しました。" : "効果不十分として記録しました。再計画してください。"); } catch (error) { showMessage(error.message, true); }
    }));
  }

  exportPhotoPurgeCorrectiveCsvButton?.addEventListener("click", () => {
    const rows = getFilteredCorrectiveActions(); if (!rows.length) return showMessage("CSV出力対象の是正処置がありません。", true);
    const csv = [["状態", "対象月", "事業所", "証明書ID", "削除計画ID", "要確認種別", "原因", "是正内容", "担当者", "対応期限", "登録者", "対応完了者", "対応結果", "完了確認者", "確認内容", "エスカレーション", "エスカレーション理由", "エスカレーション実行者", "エスカレーション日時", "原因分類", "再発防止策", "再発防止責任者", "効果確認期限", "効果確認状態", "効果確認者", "効果確認内容", "横展開件数", "証拠資料件数", "確認済み資料件数", "現行版資料件数", "旧版資料件数", "原本性確認済み件数"]];
    rows.forEach(item => csv.push([correctiveStatusText(item.status), item.targetMonth, item.office, item.certificateId, item.planId, item.issueType, item.cause, item.correctiveAction, item.assignedTo, formatDate(item.dueAt), item.createdBy, item.completedBy, item.completionNote, item.verifiedBy, item.verificationNote, item.escalationLevel === "administrator" ? "管理者" : "なし", item.escalationReason, item.escalatedBy, item.escalatedAt ? formatDate(item.escalatedAt) : "", rootCauseCategoryText(item.rootCauseCategory), item.recurrencePrevention || "", item.preventionOwner || "", item.effectivenessDueAt ? formatDate(item.effectivenessDueAt) : "", effectivenessStatusText(item.effectivenessStatus), item.effectivenessVerifiedBy || "", item.effectivenessNote || "", Array.isArray(item.horizontalDeployments) ? item.horizontalDeployments.length : 0, Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status !== "removed").length : 0, Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status === "reviewed").length : 0, Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status !== "removed" && entry.isCurrent !== false).length : 0, Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status !== "removed" && entry.isCurrent === false).length : 0, Array.isArray(item.evidenceAttachments) ? item.evidenceAttachments.filter(entry => entry.status !== "removed" && entry.originalVerified === true).length : 0]));
    downloadCsv(`photo-purge-corrective-actions-${new Date().toISOString().slice(0, 10)}.csv`, csv); showMessage(`是正処置一覧をCSV出力しました（${rows.length}件）。`);
  });
  photoPurgeCorrectiveStatus?.addEventListener("change", renderCorrectiveActions);
  photoPurgeCorrectiveFilter?.addEventListener("input", renderCorrectiveActions);
  photoPurgeCorrectiveMonth?.addEventListener("change", renderCorrectiveActions);
  photoPurgeCorrectiveOffice?.addEventListener("change", renderCorrectiveActions);

  exportPhotoPurgeCorrectiveMonthlyJsonButton?.addEventListener("click", () => {
    const report = buildCorrectiveMonthlyReport();
    downloadJson(`photo-purge-corrective-monthly-${report.targetMonth}.json`, report);
    showMessage(`是正処置月次報告JSONを出力しました（${report.totals.total}件）。`);
  });

  exportPhotoPurgeMonthlyCsvButton?.addEventListener("click", () => {
    const report = buildMonthlyReconciliation();
    const rows = [["対象月", "事業所", "証明書件数", "検証合格", "削除写真枚数", "削減容量Bytes", "要確認件数"]];
    report.offices.forEach(item => rows.push([report.targetMonth, item.office, item.certificates, item.valid, item.photos, item.bytes, item.issues]));
    rows.push([]);
    rows.push(["要確認種別", "証明書ID", "削除計画ID", "事業所", "内容"]);
    report.issues.forEach(item => rows.push([item.type, item.certificateId || "", item.planId || "", item.office || "", item.message || ""]));
    downloadCsv(`photo-purge-monthly-${report.targetMonth}.csv`, rows);
    showMessage(`月次集計をCSV出力しました（証明書${report.totals.certificateCount}件）。`);
  });

  exportPhotoPurgeMonthlyJsonButton?.addEventListener("click", () => {
    const report = buildMonthlyReconciliation();
    downloadJson(`photo-purge-monthly-${report.targetMonth}.json`, report);
    showMessage(`月次報告JSONを出力しました（要確認${report.totals.issueCount}件）。`);
  });

  form.addEventListener("submit", event => {
    event.preventDefault();
    const applicationId = applicationSelect.value;
    const application = window.ISSStorage.getApplications().find(item => item.id === applicationId);
    const file = selectedSourceFile || fileInput.files?.[0];
    if (!application) return showMessage("申請番号を選択してください。", true);
    if (!file || !selectedDataUrl) return showMessage("写真を選択してください。", true);
    if (selectedDuplicate) return showMessage("同一写真の登録候補があるため保存できません。既存の登録を確認してください。", true);

    try {
      const finalShootingAt = shootingAt.value ? new Date(shootingAt.value).toISOString() : (selectedCapturedAtIso || new Date().toISOString());
      window.ISSStorage.addPhoto({
        applicationId: application.id,
        applicationNumber: application.applicationNumber,
        fileName: file.name,
        mimeType: selectedMimeType || file.type,
        fileSize: selectedFileSize || file.size,
        originalFileSize: selectedOriginalSize || file.size,
        imageWidth: selectedWidth || null,
        imageHeight: selectedHeight || null,
        compressionMode: resizeSelect?.value || "auto",
        fingerprint: selectedFingerprint || "",
        capturedAtSource: selectedCapturedAtSource || "manual",
        exifOrientation: selectedExifOrientation || 1,
        metadataSanitized: true,
        gpsRetentionConsent: Boolean(keepGpsInput?.checked && selectedGps),
        dataUrl: selectedDataUrl,
        representative: Boolean(representativeInput?.checked),
        comment: comment.value,
        shootingAt: finalShootingAt,
        registeredBy: registeredBy.value || "利用者",
        gps: keepGpsInput?.checked ? (selectedGps || null) : null
      });
      form.reset();
      shootingAt.value = toLocalDateTimeValue();
      registeredBy.value = "利用者";
      if (resizeSelect) resizeSelect.value = "auto";
      clearSelectedState(true);
      showMessage("写真を登録しました。");
      loadApplications();
      render();
    } catch (error) {
      showMessage(error.message || "写真の保存に失敗しました。", true);
    }
  });

  filter.addEventListener("input", render);
  applicationFilter.addEventListener("change", render);
  showDeletedPhotos?.addEventListener("change", render);
  photoAuditFilter?.addEventListener("input", renderAudit);
  photoAuditApplicationFilter?.addEventListener("change", renderAudit);
  photoRetentionFilter?.addEventListener("change", renderRetention);
  photoPurgeStatusFilter?.addEventListener("change", renderPurgePlans);
  photoPurgeAssigneeFilter?.addEventListener("input", renderPurgePlans);
  photoPurgeUnacknowledgedOnly?.addEventListener("change", renderPurgePlans);
  photoPurgeCertificateLedgerFilter?.addEventListener("input", renderCertificateLedger);
  photoPurgeCertificateLedgerStatus?.addEventListener("change", renderCertificateLedger);
  photoPurgeMonthlyMonth?.addEventListener("change", renderMonthlyReconciliation);
  photoPurgeMonthlyOffice?.addEventListener("change", renderMonthlyReconciliation);
  photoPurgeMonthlyIssuesOnly?.addEventListener("change", renderMonthlyReconciliation);
  window.addEventListener("iss:applications-changed", () => {
    loadApplications();
    render();
  });

  shootingAt.value = toLocalDateTimeValue();
  registeredBy.value = registeredBy.value || "利用者";
  loadApplications();
  clearSelectedState();
  render();
  renderCertificateLedger();
  if (photoPurgeMonthlyMonth) photoPurgeMonthlyMonth.value = new Date().toISOString().slice(0, 7);
  populateMonthlyOfficeOptions();
  renderMonthlyReconciliation();
  if (photoPurgeCorrectiveMonth) photoPurgeCorrectiveMonth.value = new Date().toISOString().slice(0, 7);
  populateCorrectiveOfficeOptions();
  renderCorrectiveActions();
  function auditRuleSummaryText(rules) {
    const enabled = [
      rules.permissionDeniedEnabled ? "権限外アクセス" : "",
      rules.missingReasonEnabled ? "理由未入力" : "",
      rules.bulkDownloadEnabled ? "短時間大量取得" : ""
    ].filter(Boolean).join("・") || "検出ルールなし";
    return `有効ルール：${enabled}／大量取得：${rules.bulkWindowMinutes}分以内に${rules.bulkMediumThreshold}件以上（中）、${rules.bulkHighThreshold}件以上（高）／標準監査範囲：直近${rules.lookbackHours}時間`;
  }

  function renderCorrectiveEvidenceAuditRules() {
    const rules = window.ISSStorage.getCorrectiveEvidenceAuditRules();
    if (auditRulePermissionDenied) auditRulePermissionDenied.checked = Boolean(rules.permissionDeniedEnabled);
    if (auditRuleMissingReason) auditRuleMissingReason.checked = Boolean(rules.missingReasonEnabled);
    if (auditRuleBulkDownload) auditRuleBulkDownload.checked = Boolean(rules.bulkDownloadEnabled);
    if (auditRuleWindowMinutes) auditRuleWindowMinutes.value = rules.bulkWindowMinutes || 10;
    if (auditRuleMediumThreshold) auditRuleMediumThreshold.value = rules.bulkMediumThreshold || 5;
    if (auditRuleHighThreshold) auditRuleHighThreshold.value = rules.bulkHighThreshold || 10;
    if (auditRuleLookbackHours) auditRuleLookbackHours.value = rules.lookbackHours || 24;
    if (correctiveEvidenceAuditRuleSummary) correctiveEvidenceAuditRuleSummary.textContent = auditRuleSummaryText(rules);
    if (correctiveEvidenceAuditRuleHistory) {
      const history = window.ISSStorage.getCorrectiveEvidenceAuditRuleHistory();
      correctiveEvidenceAuditRuleHistory.innerHTML = history.length ? `<h3>適用履歴</h3>${history.slice(0, 30).map(item => `<article><strong>${escapeHtml(formatDate(item.changedAt))}／${escapeHtml(item.changedBy || "")}</strong><p>${escapeHtml(item.reason || "")}</p><p>${escapeHtml(auditRuleSummaryText(item.next || {}))}</p></article>`).join("")}` : "";
    }
    renderAuditRuleProposals();
    renderAuditRuleCertificateLedger();
  }

  function auditRuleProposalStatusText(status) {
    return ({
      "pending-approval": "承認待ち",
      "approved": "承認済み",
      "approved-scheduled": "予約適用待ち",
      "applied": "適用済み",
      "rejected": "差戻し"
    })[status] || status || "不明";
  }

  function renderAuditRuleProposals() {
    if (!correctiveEvidenceAuditRuleProposalList) return;
    try { window.ISSStorage.applyDueCorrectiveEvidenceAuditRuleProposals({ actor: "system" }); } catch {}
    const dashboard = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposalDashboard();
    const now = Date.now();
    const isApprovalOverdue = item => item.status === "pending-approval" && item.approvalDueAt && new Date(item.approvalDueAt).getTime() < now;
    const isApplicationOverdue = item => ["approved", "approved-scheduled"].includes(item.status) && item.applicationDueAt && new Date(item.applicationDueAt).getTime() < now;
    const filterValue = correctiveEvidenceAuditRuleProposalFilter?.value || "all";
    const allRows = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposals();
    const rows = allRows.filter(item => {
      if (filterValue === "all") return true;
      if (filterValue === "overdue") return isApprovalOverdue(item) || isApplicationOverdue(item);
      if (filterValue === "unacknowledged") return ["pending-approval", "approved", "approved-scheduled"].includes(item.status) && !item.notificationAcknowledgedAt;
      if (filterValue === "escalated") return item.escalatedToAdministrator && ["pending-approval", "approved", "approved-scheduled"].includes(item.status);
      return item.status === filterValue;
    });

    if (correctiveEvidenceAuditRuleProposalSummary) {
      correctiveEvidenceAuditRuleProposalSummary.innerHTML = `
        <button type="button" data-rule-proposal-filter="pending-approval"><strong>${dashboard.pendingApproval}</strong><span>承認待ち</span></button>
        <button type="button" data-rule-proposal-filter="approved-scheduled"><strong>${dashboard.scheduled}</strong><span>予約適用待ち</span></button>
        <button type="button" data-rule-proposal-filter="overdue"><strong>${dashboard.approvalOverdue + dashboard.applicationOverdue}</strong><span>期限超過</span></button>
        <button type="button" data-rule-proposal-filter="unacknowledged"><strong>${dashboard.unacknowledged}</strong><span>未確認通知</span></button>
        <button type="button" data-rule-proposal-filter="escalated"><strong>${dashboard.escalated || 0}</strong><span>管理者引継ぎ</span></button>`;
      correctiveEvidenceAuditRuleProposalSummary.querySelectorAll("[data-rule-proposal-filter]").forEach(button => button.addEventListener("click", () => {
        if (correctiveEvidenceAuditRuleProposalFilter) correctiveEvidenceAuditRuleProposalFilter.value = button.dataset.ruleProposalFilter;
        renderAuditRuleProposals();
      }));
    }

    correctiveEvidenceAuditRuleProposalList.innerHTML = rows.length ? `<h3>変更申請・適用履歴</h3>${rows.slice(0, 50).map(item => {
      const overdue = isApprovalOverdue(item) || isApplicationOverdue(item);
      const dueText = item.status === "pending-approval" && item.approvalDueAt
        ? `承認期限：${formatDate(item.approvalDueAt)}`
        : (["approved", "approved-scheduled"].includes(item.status) && item.applicationDueAt ? `適用期限：${formatDate(item.applicationDueAt)}` : "");
      return `<article class="${overdue ? "is-overdue" : ""}">
        <strong>${escapeHtml(auditRuleProposalStatusText(item.status))}／${escapeHtml(item.type === "rollback" ? "ロールバック" : "ルール変更")}${overdue ? "／期限超過" : ""}</strong>
        <p>申請ID：${escapeHtml(item.id)}</p>
        <p>作成：${escapeHtml(item.createdBy || "")}／${escapeHtml(formatDate(item.createdAt))}</p>
        <p>理由：${escapeHtml(item.reason || "")}</p>
        <p>適用方法：${item.releaseMode === "scheduled" ? `予約（${escapeHtml(formatDate(item.scheduledAt))}）` : "承認後すぐ"}</p>
        ${dueText ? `<p class="${overdue ? "deadline-warning" : ""}">${escapeHtml(dueText)}</p>` : ""}
        <p>通知確認：${item.notificationAcknowledgedAt ? `${escapeHtml(item.notificationAcknowledgedBy || "")}／${escapeHtml(formatDate(item.notificationAcknowledgedAt))}` : "未確認"}</p>
        <p>担当者：${escapeHtml(item.assignedTo || "未指定")}${item.escalatedToAdministrator ? "／管理者引継ぎ" : ""}</p>
        ${item.escalationReason ? `<p>引継ぎ理由：${escapeHtml(item.escalationReason)}</p>` : ""}
        ${Array.isArray(item.assignmentHistory) && item.assignmentHistory.length ? `<p>担当変更履歴：${item.assignmentHistory.length}件</p>` : ""}
        <p>シミュレーション：検出 ${Number(item.simulationSummary?.total || 0)}件／高 ${Number(item.simulationSummary?.high || 0)}件／中 ${Number(item.simulationSummary?.medium || 0)}件</p>
        ${item.approvedBy ? `<p>承認：${escapeHtml(item.approvedBy)}／${escapeHtml(formatDate(item.approvedAt))}</p>` : ""}
        ${item.appliedBy ? `<p>適用：${escapeHtml(item.appliedBy)}／${escapeHtml(formatDate(item.appliedAt))}</p>` : ""}
        ${item.rejectionReason ? `<p>差戻し：${escapeHtml(item.rejectionReason)}</p>` : ""}
        <div class="management-actions">
          ${!item.notificationAcknowledgedAt && ["pending-approval", "approved", "approved-scheduled"].includes(item.status) ? `<button type="button" data-ack-audit-rule="${escapeHtml(item.id)}">通知確認済み</button>` : ""}
          ${["pending-approval", "approved", "approved-scheduled"].includes(item.status) ? `<button type="button" data-reassign-audit-rule="${escapeHtml(item.id)}">担当者再割当</button>` : ""}
          ${overdue && !item.escalatedToAdministrator ? `<button type="button" data-escalate-audit-rule="${escapeHtml(item.id)}">管理者へ引継ぎ</button>` : ""}
          ${item.status === "pending-approval" ? `<button type="button" data-approve-audit-rule="${escapeHtml(item.id)}">承認</button><button type="button" data-reject-audit-rule="${escapeHtml(item.id)}">差戻し</button>` : ""}
          ${item.status === "approved-scheduled" ? `<button type="button" data-apply-audit-rule="${escapeHtml(item.id)}">今すぐ適用</button><button type="button" data-reject-audit-rule="${escapeHtml(item.id)}">取消</button>` : ""}
          ${item.status === "applied" ? `<button type="button" data-download-audit-rule-certificate="${escapeHtml(item.id)}">適用証明JSON</button><button type="button" data-rollback-audit-rule="${escapeHtml(item.id)}">ロールバック申請</button>` : ""}
        </div>
      </article>`;
    }).join("")}` : '<div class="empty-state"><strong>該当する監査ルール変更申請はありません</strong></div>';

    document.querySelectorAll("[data-ack-audit-rule]").forEach(button => button.addEventListener("click", () => {
      try {
        window.ISSStorage.acknowledgeCorrectiveEvidenceAuditRuleProposal(button.dataset.ackAuditRule, { actor: registeredBy?.value || "利用者" });
        showMessage("監査ルール変更申請の通知を確認済みにしました。");
        renderAuditRuleProposals();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-reassign-audit-rule]").forEach(button => button.addEventListener("click", () => {
      const assignedTo = prompt("新しい担当者名を入力してください。", "");
      if (assignedTo === null) return;
      const reason = prompt("再割当理由を入力してください。", "");
      if (reason === null) return;
      try {
        window.ISSStorage.reassignCorrectiveEvidenceAuditRuleProposal(button.dataset.reassignAuditRule, { actor: registeredBy?.value || "利用者", assignedTo, reason });
        showMessage("監査ルール変更申請の担当者を再割当しました。");
        renderAuditRuleProposals();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-escalate-audit-rule]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("管理者への引継ぎ理由を入力してください。", "期限超過のため");
      if (reason === null) return;
      try {
        window.ISSStorage.escalateCorrectiveEvidenceAuditRuleProposal(button.dataset.escalateAuditRule, { actor: registeredBy?.value || "利用者", reason });
        showMessage("監査ルール変更申請を管理者へ引き継ぎました。");
        renderAuditRuleProposals();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-approve-audit-rule]").forEach(button => button.addEventListener("click", () => {
      const approver = prompt("承認者名を入力してください。", registeredBy?.value || "");
      if (approver === null) return;
      try {
        window.ISSStorage.approveCorrectiveEvidenceAuditRuleProposal(button.dataset.approveAuditRule, { approver });
        showMessage("監査ルール変更申請を承認しました。");
        renderCorrectiveEvidenceAuditRules();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-reject-audit-rule]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("差戻し・取消理由を入力してください。", "");
      if (reason === null) return;
      try {
        window.ISSStorage.rejectCorrectiveEvidenceAuditRuleProposal(button.dataset.rejectAuditRule, { actor: registeredBy?.value || "利用者", reason });
        showMessage("監査ルール変更申請を差し戻しました。");
        renderCorrectiveEvidenceAuditRules();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-apply-audit-rule]").forEach(button => button.addEventListener("click", () => {
      if (!confirm("予約日時を待たずに監査ルールを適用しますか？")) return;
      try {
        window.ISSStorage.applyCorrectiveEvidenceAuditRuleProposal(button.dataset.applyAuditRule, { actor: registeredBy?.value || "利用者", force: true });
        showMessage("監査ルールを適用しました。");
        renderCorrectiveEvidenceAuditRules();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-download-audit-rule-certificate]").forEach(button => button.addEventListener("click", () => {
      try {
        const certificate = window.ISSStorage.createCorrectiveEvidenceAuditRuleApplicationCertificate(button.dataset.downloadAuditRuleCertificate, { actor: registeredBy?.value || "利用者" });
        downloadJson(`${certificate.certificateId}.json`, certificate);
        showMessage("監査ルール適用証明JSONを出力しました。");
        renderAuditRuleCertificateLedger();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-rollback-audit-rule]").forEach(button => button.addEventListener("click", () => {
      const reason = prompt("ロールバック理由を入力してください。", "");
      if (reason === null) return;
      try {
        window.ISSStorage.createCorrectiveEvidenceAuditRuleRollbackProposal(button.dataset.rollbackAuditRule, {
          actor: registeredBy?.value || "利用者",
          reason,
          releaseMode: "immediate"
        });
        showMessage("ロールバック申請を作成しました。別担当者の承認が必要です。");
        renderCorrectiveEvidenceAuditRules();
      } catch (error) { showMessage(error.message, true); }
    }));
  }

  function auditRuleEventTypeText(type) {
    return ({
      created: "申請作成",
      approved: "承認",
      applied: "適用",
      rejected: "差戻し・取消",
      reassigned: "担当者再割当",
      escalated: "管理者引継ぎ",
      "notification-acknowledged": "通知確認"
    })[type] || type || "不明";
  }

  function renderAuditRuleCertificateLedger() {
    if (!correctiveEvidenceAuditRuleCertificateLedger) return;
    const certificates = window.ISSStorage.getCorrectiveEvidenceAuditRuleApplicationCertificates();
    const events = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposalEvents();
    const proposals = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposals();
    const eventCounts = events.reduce((map, item) => {
      map[item.proposalId] = (map[item.proposalId] || 0) + 1;
      return map;
    }, {});
    const latestEvents = events.slice(0, 10);
    const verificationHistory = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateVerifications();
    const invalidCertificates = certificates.filter(item => !window.ISSStorage.verifyCorrectiveEvidenceAuditRuleApplicationCertificate(item).valid);
    correctiveEvidenceAuditRuleCertificateLedger.innerHTML = `
      <div class="audit-rule-simulation__summary">
        <article><strong>${proposals.length}</strong><span>変更申請</span></article>
        <article><strong>${certificates.length}</strong><span>適用証明</span></article>
        <article><strong>${verificationHistory.length}</strong><span>検証履歴</span></article>
        <article><strong>${invalidCertificates.length}</strong><span>要確認証明</span></article>
      </div>
      ${certificates.length ? `<h3>適用証明台帳</h3>${certificates.slice(0, 50).map(item => {
        const verification = window.ISSStorage.verifyCorrectiveEvidenceAuditRuleApplicationCertificate(item);
        return `<article class="${verification.valid ? "" : "is-overdue"}">
          <strong>${verification.valid ? "検証合格" : "要確認"}／${escapeHtml(item.proposalType === "rollback" ? "ロールバック" : "ルール変更")}</strong>
          <p>証明書ID：${escapeHtml(item.certificateId)}</p>
          <p>申請ID：${escapeHtml(item.proposalId)}／イベント ${Number(eventCounts[item.proposalId] || 0)}件</p>
          <p>承認：${escapeHtml(item.approvedBy || "")}／${escapeHtml(formatDate(item.approvedAt))}</p>
          <p>適用：${escapeHtml(item.appliedBy || "")}／${escapeHtml(formatDate(item.appliedAt))}</p>
          <p>検証ハッシュ：${escapeHtml(String(item.verificationHash || "").slice(0, 64))}</p>
          ${verification.errors.length ? `<p class="deadline-warning">${verification.errors.map(escapeHtml).join("／")}</p>` : ""}
          <div class="management-actions"><button type="button" data-verify-rule-certificate-id="${escapeHtml(item.certificateId)}">再検証</button><button type="button" data-export-rule-certificate-id="${escapeHtml(item.certificateId)}">証明書JSON</button></div>
        </article>`;
      }).join("")}` : '<div class="empty-state"><strong>適用証明はまだありません</strong><p>監査ルールが承認・適用されると自動生成されます。</p></div>'}
      ${latestEvents.length ? `<h3>最近の処理イベント</h3>${latestEvents.map(item => `<article><strong>${escapeHtml(auditRuleEventTypeText(item.eventType))}</strong><p>${escapeHtml(item.proposalId)}／${escapeHtml(item.actor)}／${escapeHtml(formatDate(item.occurredAt))}</p>${item.reason ? `<p>理由：${escapeHtml(item.reason)}</p>` : ""}</article>`).join("")}` : ""}`;
    correctiveEvidenceAuditRuleCertificateLedger.querySelectorAll("[data-verify-rule-certificate-id]").forEach(button => button.addEventListener("click", () => {
      const certificate = certificates.find(item => item.certificateId === button.dataset.verifyRuleCertificateId);
      if (!certificate) return;
      const result = window.ISSStorage.recordCorrectiveEvidenceAuditRuleCertificateVerification(certificate, { actor: registeredBy?.value || "利用者", source: "ledger", compareCurrentRules: true });
      if (auditRuleCertificateVerificationResult) auditRuleCertificateVerificationResult.innerHTML = `<article class="${result.valid ? "" : "is-overdue"}"><strong>${result.valid ? "検証合格" : "検証不合格"}</strong><p>証明書ID：${escapeHtml(result.certificateId)}</p>${result.errors.length ? `<p class="deadline-warning">${result.errors.map(escapeHtml).join("／")}</p>` : ""}${result.warnings.length ? `<p>${result.warnings.map(escapeHtml).join("／")}</p>` : ""}</article>`;
      showMessage(result.valid ? "適用証明を再検証しました。" : "適用証明の不整合を検出しました。", !result.valid);
      renderAuditRuleCertificateLedger();
    }));
    correctiveEvidenceAuditRuleCertificateLedger.querySelectorAll("[data-export-rule-certificate-id]").forEach(button => button.addEventListener("click", () => {
      const certificate = certificates.find(item => item.certificateId === button.dataset.exportRuleCertificateId);
      if (certificate) downloadJson(`${certificate.certificateId}.json`, certificate);
    }));
  }

  function readAuditRuleForm() {
    return {
      permissionDeniedEnabled: auditRulePermissionDenied.checked,
      missingReasonEnabled: auditRuleMissingReason.checked,
      bulkDownloadEnabled: auditRuleBulkDownload.checked,
      bulkWindowMinutes: auditRuleWindowMinutes.value,
      bulkMediumThreshold: auditRuleMediumThreshold.value,
      bulkHighThreshold: auditRuleHighThreshold.value,
      lookbackHours: auditRuleLookbackHours.value
    };
  }

  function renderAuditRuleSimulation(result) {
    if (!correctiveEvidenceAuditSimulation) return;
    const summary = result.summary || {};
    const officeRows = (result.byOffice || []).slice(0, 8);
    const addedRows = (result.added || []).slice(0, 10);
    correctiveEvidenceAuditSimulation.innerHTML = `
      <div class="audit-rule-simulation__summary">
        <article><strong>${Number(summary.total || 0)}</strong><span>候補ルールの検出件数</span></article>
        <article><strong>${Number(summary.high || 0)}</strong><span>高優先度</span></article>
        <article><strong>${Number(summary.medium || 0)}</strong><span>中優先度</span></article>
        <article><strong>+${Number(summary.added || 0)}</strong><span>現行比で追加</span></article>
        <article><strong>-${Number(summary.removed || 0)}</strong><span>現行比で減少</span></article>
      </div>
      <p class="scope-note">対象アクセス履歴：${Number(result.logCount || 0)}件／シミュレーション日時：${escapeHtml(formatDate(result.simulatedAt))}</p>
      ${officeRows.length ? `<div class="audit-rule-simulation__list"><strong>事業所別の影響</strong>${officeRows.map(item => `<article class="${item.high ? "is-high" : "is-medium"}"><strong>${escapeHtml(item.office)}：${item.total}件</strong><p>高 ${item.high || 0}件／中 ${item.medium || 0}件</p></article>`).join("")}</div>` : ""}
      ${addedRows.length ? `<div class="audit-rule-simulation__list"><strong>新たに検出される主な所見</strong>${addedRows.map(item => `<article class="is-${escapeHtml(item.severity)}"><strong>${escapeHtml(evidenceAuditTypeText(item.type))}／${escapeHtml(item.office || "不明")}</strong><p>${escapeHtml(item.actor || "")}：${escapeHtml(item.title || "")}（${escapeHtml(formatDate(item.occurredAt))}）</p></article>`).join("")}</div>` : '<p class="scope-note">現行ルールと比べて新たに検出される所見はありません。</p>'}`;
  }


  auditRuleReleaseMode?.addEventListener("change", () => {
    if (auditRuleScheduledAt) auditRuleScheduledAt.disabled = auditRuleReleaseMode.value !== "scheduled";
  });
  simulateCorrectiveEvidenceAuditRulesButton?.addEventListener("click", () => {
    try {
      const result = window.ISSStorage.simulateCorrectiveEvidenceAuditRules(readAuditRuleForm(), {
        actor: registeredBy?.value || "利用者"
      });
      latestAuditRuleSimulation = result;
      renderAuditRuleSimulation(result);
      showMessage(`監査ルールをシミュレーションしました（候補ルールの検出 ${result.summary.total}件）。`);
    } catch (error) {
      showMessage(error.message || "監査ルールをシミュレーションできませんでした。", true);
    }
  });

  createCorrectiveEvidenceAuditRuleProposalButton?.addEventListener("click", () => {
    try {
      const proposal = window.ISSStorage.createCorrectiveEvidenceAuditRuleProposal(readAuditRuleForm(), latestAuditRuleSimulation, {
        actor: registeredBy?.value || "利用者",
        reason: auditRuleChangeReason?.value || "",
        releaseMode: auditRuleReleaseMode?.value || "immediate",
        scheduledAt: auditRuleScheduledAt?.value || ""
      });
      if (auditRuleChangeReason) auditRuleChangeReason.value = "";
      latestAuditRuleSimulation = null;
      if (correctiveEvidenceAuditSimulation) correctiveEvidenceAuditSimulation.innerHTML = "";
      showMessage(`監査ルール変更申請を作成しました（${proposal.id}）。`);
      renderCorrectiveEvidenceAuditRules();
    } catch (error) {
      showMessage(error.message || "監査ルール変更申請を作成できませんでした。", true);
    }
  });


  correctiveEvidenceAuditRuleProposalFilter?.addEventListener("change", renderAuditRuleProposals);

  exportAuditRuleProposalLedgerCsvButton?.addEventListener("click", () => {
    const proposals = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposals();
    const events = window.ISSStorage.getCorrectiveEvidenceAuditRuleProposalEvents();
    const certificates = window.ISSStorage.getCorrectiveEvidenceAuditRuleApplicationCertificates();
    const eventCounts = events.reduce((map, item) => { map[item.proposalId] = (map[item.proposalId] || 0) + 1; return map; }, {});
    const rows = [["申請ID","区分","状態","作成者","作成日時","承認者","承認日時","適用者","適用日時","担当者","変更理由","処理イベント件数","証明書ID"]];
    proposals.forEach(item => {
      const certificate = certificates.find(entry => entry.proposalId === item.id);
      rows.push([item.id, item.type === "rollback" ? "ロールバック" : "ルール変更", auditRuleProposalStatusText(item.status), item.createdBy || "", formatDate(item.createdAt), item.approvedBy || "", item.approvedAt ? formatDate(item.approvedAt) : "", item.appliedBy || "", item.appliedAt ? formatDate(item.appliedAt) : "", item.assignedTo || "", item.reason || "", eventCounts[item.id] || 0, certificate?.certificateId || ""]);
    });
    downloadCsv(`audit-rule-proposal-ledger-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage(`監査ルール変更申請の処理台帳をCSV出力しました（${proposals.length}件）。`);
  });

  exportAuditRuleCertificatesJsonButton?.addEventListener("click", () => {
    const certificates = window.ISSStorage.getCorrectiveEvidenceAuditRuleApplicationCertificates();
    downloadJson(`audit-rule-application-certificates-${new Date().toISOString().slice(0,10)}.json`, { schemaVersion: "1.0", exportedAt: new Date().toISOString(), count: certificates.length, certificates });
    showMessage(`監査ルール適用証明を一括JSON出力しました（${certificates.length}件）。`);
  });

  exportCorrectiveEvidenceAuditRuleHistoryButton?.addEventListener("click", () => {
    const history = window.ISSStorage.getCorrectiveEvidenceAuditRuleHistory();
    const rows = [["変更日時","変更者","変更理由","変更前","変更後"]];
    history.forEach(item => rows.push([formatDate(item.changedAt), item.changedBy || "", item.reason || "", auditRuleSummaryText(item.previous || {}), auditRuleSummaryText(item.next || {})]));
    downloadCsv(`corrective-evidence-audit-rule-history-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage(`監査ルール変更履歴をCSV出力しました（${history.length}件）。`);
  });

  function evidenceAuditTypeText(type) {
    return ({
      "permission-denied": "権限外アクセス",
      "missing-download-reason": "理由未入力",
      "bulk-download": "短時間大量取得"
    })[type] || type || "不明";
  }

  function renderCorrectiveEvidenceAudit() {
    if (!correctiveEvidenceAuditList) return;
    const status = correctiveEvidenceAuditStatus?.value || "open";
    const query = String(correctiveEvidenceAuditFilter?.value || "").trim().toLowerCase();
    const all = window.ISSStorage.getCorrectiveEvidenceAuditFindings();
    const rows = all.filter(item => status === "all" || item.status === status)
      .filter(item => !query || [item.actor, item.office, item.title, item.type, item.role, item.reviewedBy, item.recurrencePrevention].join(" ").toLowerCase().includes(query))
      .sort((a,b) => String(b.occurredAt || "").localeCompare(String(a.occurredAt || "")));
    const open = all.filter(item => item.status === "open");
    const pendingReview = all.filter(item => item.status === "pending-review");
    const overdue = pendingReview.filter(item => item.reviewDueAt && new Date(item.reviewDueAt).getTime() < Date.now());
    const high = all.filter(item => item.status !== "resolved" && item.severity === "high");
    if (correctiveEvidenceAuditSummary) correctiveEvidenceAuditSummary.innerHTML = `
      <button type="button"><strong>${open.length}</strong><span>未処理</span></button>
      <button type="button"><strong>${pendingReview.length}</strong><span>レビュー待ち</span></button>
      <button type="button"><strong>${overdue.length}</strong><span>期限超過</span></button>
      <button type="button"><strong>${high.length}</strong><span>高優先度</span></button>
      <button type="button"><strong>${all.filter(item => item.status === "resolved").length}</strong><span>完了</span></button>`;
    if (!rows.length) {
      correctiveEvidenceAuditList.innerHTML = '<div class="empty-state"><strong>該当する監査所見はありません</strong></div>';
      return;
    }
    correctiveEvidenceAuditList.innerHTML = rows.map(item => {
      const isOverdue = item.status === "pending-review" && item.reviewDueAt && new Date(item.reviewDueAt).getTime() < Date.now();
      const statusText = item.status === "resolved" ? "完了" : item.status === "pending-review" ? "レビュー待ち" : "未処理";
      return `
      <article class="certificate-corrective-card">
        <div class="photo-card__header"><strong>${escapeHtml(evidenceAuditTypeText(item.type))}</strong><span class="record-status">${item.severity === "high" ? "高" : "中"}</span></div>
        <dl class="photo-meta">
          <div><dt>発生日時</dt><dd>${escapeHtml(formatDate(item.occurredAt))}</dd></div>
          <div><dt>操作者</dt><dd>${escapeHtml(item.actor || "")}</dd></div>
          <div><dt>事業所</dt><dd>${escapeHtml(item.office || "")}</dd></div>
          <div><dt>資料</dt><dd>${escapeHtml(item.title || "-")}</dd></div>
          <div><dt>権限</dt><dd>${escapeHtml(item.role || "")}</dd></div>
          <div><dt>状態</dt><dd>${statusText}${isOverdue ? "（期限超過）" : ""}</dd></div>
          ${item.reviewDueAt ? `<div><dt>レビュー期限</dt><dd>${escapeHtml(formatDate(item.reviewDueAt))}</dd></div>` : ""}
          ${item.reviewedBy ? `<div><dt>処理担当者</dt><dd>${escapeHtml(item.reviewedBy)}</dd></div>` : ""}
          ${item.completionReviewedBy ? `<div><dt>完了レビュー</dt><dd>${escapeHtml(item.completionReviewedBy)}</dd></div>` : ""}
        </dl>
        ${item.reviewNote ? `<p>確認結果：${escapeHtml(item.reviewNote)}</p>` : ""}
        ${item.recurrencePrevention ? `<p>再発防止策：${escapeHtml(item.recurrencePrevention)}</p>` : ""}
        ${item.completionReviewNote ? `<p>完了レビュー：${escapeHtml(item.completionReviewNote)}</p>` : ""}
        ${item.status === "open" ? `<div class="management-actions"><button data-resolve-evidence-audit="${escapeHtml(item.id)}" type="button">確認・再発防止を登録</button></div>` : ""}
        ${item.status === "pending-review" ? `<div class="management-actions"><button data-complete-evidence-audit-review="${escapeHtml(item.id)}" type="button">別担当者が完了レビュー</button></div>` : ""}
      </article>`;
    }).join("");
    document.querySelectorAll("[data-resolve-evidence-audit]").forEach(button => button.addEventListener("click", () => {
      const note = prompt("確認結果・初動対応を入力してください。", "");
      if (note === null) return;
      const prevention = prompt("再発防止策を入力してください。", "");
      if (prevention === null) return;
      const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const dueAt = prompt("完了レビュー期限を YYYY-MM-DD で入力してください。", defaultDue);
      if (dueAt === null) return;
      try {
        window.ISSStorage.resolveCorrectiveEvidenceAuditFinding(button.dataset.resolveEvidenceAudit, { actor: registeredBy?.value || "利用者", note, prevention, dueAt: `${dueAt}T23:59:59` });
        showMessage("監査所見を完了レビュー待ちにしました。");
        renderCorrectiveEvidenceAudit();
      } catch (error) { showMessage(error.message, true); }
    }));
    document.querySelectorAll("[data-complete-evidence-audit-review]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("完了レビュー担当者を入力してください。", registeredBy?.value || "");
      if (actor === null) return;
      const note = prompt("再発防止策の確認結果を入力してください。", "");
      if (note === null) return;
      try {
        window.ISSStorage.completeCorrectiveEvidenceAuditFindingReview(button.dataset.completeEvidenceAuditReview, { actor, note });
        showMessage("監査所見の完了レビューを登録しました。");
        renderCorrectiveEvidenceAudit();
      } catch (error) { showMessage(error.message, true); }
    }));
  }

  runCorrectiveEvidenceAuditButton?.addEventListener("click", () => {
    const rules = window.ISSStorage.getCorrectiveEvidenceAuditRules();
    const findings = window.ISSStorage.analyzeCorrectiveEvidenceAccess({ sinceHours: rules.lookbackHours });
    showMessage(`直近${rules.lookbackHours}時間のアクセス監査を実行しました（検出${findings.length}件）。`);
    renderCorrectiveEvidenceAudit();
  });
  correctiveEvidenceAuditStatus?.addEventListener("change", renderCorrectiveEvidenceAudit);
  correctiveEvidenceAuditFilter?.addEventListener("input", renderCorrectiveEvidenceAudit);
  exportCorrectiveEvidenceAuditCsvButton?.addEventListener("click", () => {
    const rows = [["種別","重要度","発生日時","事業所","操作者","権限","資料名","状態","処理担当者","処理日時","確認結果","再発防止策","レビュー期限","完了レビュー担当者","完了レビュー日時","完了レビュー結果"]];
    window.ISSStorage.getCorrectiveEvidenceAuditFindings().forEach(item => rows.push([evidenceAuditTypeText(item.type),item.severity,formatDate(item.occurredAt),item.office,item.actor,item.role,item.title,item.status,item.reviewedBy || "",item.reviewedAt ? formatDate(item.reviewedAt) : "",item.reviewNote || "",item.recurrencePrevention || "",item.reviewDueAt ? formatDate(item.reviewDueAt) : "",item.completionReviewedBy || "",item.completionReviewedAt ? formatDate(item.completionReviewedAt) : "",item.completionReviewNote || ""]));
    downloadCsv(`corrective-evidence-audit-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage("証拠資料アクセス監査所見をCSV出力しました。");
  });
  exportCorrectiveEvidenceAuditMonthlyJsonButton?.addEventListener("click", () => {
    const month = prompt("対象月を YYYY-MM で入力してください。", new Date().toISOString().slice(0, 7));
    if (month === null) return;
    const report = window.ISSStorage.buildCorrectiveEvidenceAuditMonthlyReport(month);
    downloadJson(`corrective-evidence-audit-monthly-${month}.json`, report);
    showMessage(`アクセス監査月次報告を出力しました（${report.summary.total}件）。`);
  });

  function auditRuleCertificateIssueTypeText(type) {
    return ({
      "verification-invalid": "検証不合格",
      "proposal-missing": "申請未照合",
      "duplicate-certificate-id": "証明書ID重複",
      "duplicate-proposal-id": "申請ID重複"
    })[type] || type || "要確認";
  }

  function renderAuditRuleCertificateMonthlyIssues(report = latestAuditRuleCertificateMonthlyReport) {
    if (!auditRuleCertificateMonthlyIssues) return;
    const issues = report?.issues || [];
    if (!issues.length) {
      auditRuleCertificateMonthlyIssues.innerHTML = report ? '<div class="empty-state"><strong>月次照合の要確認事項はありません</strong></div>' : "";
      return;
    }
    const actions = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" });
    auditRuleCertificateMonthlyIssues.innerHTML = `<h3>${escapeHtml(report.targetMonth)} 月次照合の要確認事項</h3>${issues.map(issue => {
      const existing = actions.find(item => item.issueKey === issue.issueKey && item.status !== "closed");
      return `<article class="certificate-corrective-card is-overdue">
        <div class="photo-card__header"><strong>${escapeHtml(auditRuleCertificateIssueTypeText(issue.type))}</strong><span class="record-status">要確認</span></div>
        <p>${escapeHtml(issue.title || "")}</p>
        <dl class="photo-meta"><div><dt>証明書ID</dt><dd>${escapeHtml(issue.certificateId || "-")}</dd></div><div><dt>変更申請ID</dt><dd>${escapeHtml(issue.proposalId || "-")}</dd></div></dl>
        ${issue.details ? `<p class="deadline-warning">${escapeHtml(issue.details)}</p>` : ""}
        <div class="management-actions">${existing ? `<span>是正処置登録済み：${escapeHtml(existing.assignedTo || "")}</span>` : `<button type="button" data-create-rule-certificate-corrective="${escapeHtml(issue.issueKey)}">是正処置を登録</button>`}</div>
      </article>`;
    }).join("")}`;
    auditRuleCertificateMonthlyIssues.querySelectorAll("[data-create-rule-certificate-corrective]").forEach(button => button.addEventListener("click", () => {
      const issue = issues.find(item => item.issueKey === button.dataset.createRuleCertificateCorrective);
      if (!issue) return;
      const assignedTo = prompt("対応担当者を入力してください。", registeredBy?.value || "");
      if (assignedTo === null) return;
      const cause = prompt("発生原因を入力してください。", "");
      if (cause === null) return;
      const actionPlan = prompt("是正内容を入力してください。", "");
      if (actionPlan === null) return;
      const defaultDue = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      const dueAt = prompt("対応期限を YYYY-MM-DD で入力してください。", defaultDue);
      if (dueAt === null) return;
      try {
        window.ISSStorage.createCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(issue, { actor: registeredBy?.value || "利用者", assignedTo, cause, actionPlan, dueAt, targetMonth: report.targetMonth });
        showMessage("適用証明の是正処置を登録しました。");
        renderAuditRuleCertificateMonthlyIssues(report);
        renderAuditRuleCertificateCorrectiveActions();
      } catch (error) { showMessage(error.message, true); }
    }));
  }

  function renderAuditRuleCertificateCorrectiveActions() {
    if (!auditRuleCertificateCorrectiveList) return;
    const status = auditRuleCertificateCorrectiveStatus?.value || "active";
    const query = auditRuleCertificateCorrectiveFilter?.value || "";
    const all = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" });
    const rows = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status, query });
    const overdue = all.filter(item => item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < Date.now());
    if (auditRuleCertificateCorrectiveSummary) auditRuleCertificateCorrectiveSummary.innerHTML = `
      <button type="button"><strong>${all.filter(item => item.status === "open").length}</strong><span>対応中</span></button>
      <button type="button"><strong>${all.filter(item => item.status === "pending-verification").length}</strong><span>完了確認待ち</span></button>
      <button type="button"><strong>${overdue.length}</strong><span>期限超過</span></button>
      <button type="button"><strong>${all.filter(item => item.status === "closed").length}</strong><span>完了</span></button>
      <button type="button"><strong>${all.filter(item => item.effectivenessStatus === "pending").length}</strong><span>効果確認待ち</span></button>
      <button type="button"><strong>${all.filter(item => item.effectivenessStatus === "ineffective").length}</strong><span>効果不十分</span></button>
      <button type="button"><strong>${all.filter(item => item.issueType === "effectiveness-insufficient" && item.status !== "closed").length}</strong><span>再是正対応中</span></button>
      <button type="button"><strong>${all.filter(item => item.issueType === "effectiveness-insufficient" && item.status === "pending-verification").length}</strong><span>再是正確認待ち</span></button>
      <button type="button"><strong>${all.filter(item => item.followUpReevaluationStatus === "pending").length}</strong><span>再評価待ち</span></button>
      <button type="button"><strong>${all.filter(item => item.caseClosureStatus === "pending-approval").length}</strong><span>クローズ承認待ち</span></button>
      <button type="button"><strong>${all.filter(item => item.caseClosureStatus === "closed").length}</strong><span>クローズ済み</span></button>`;
    if (!rows.length) {
      auditRuleCertificateCorrectiveList.innerHTML = '<div class="empty-state"><strong>該当する是正処置はありません</strong></div>';
      return;
    }
    auditRuleCertificateCorrectiveList.innerHTML = rows.map(item => {
      const isOverdue = item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < Date.now();
      const statusText = item.status === "closed" ? "完了" : item.status === "pending-verification" ? "完了確認待ち" : "対応中";
      return `<article class="certificate-corrective-card ${isOverdue ? "is-overdue" : ""}">
        <div class="photo-card__header"><strong>${escapeHtml(auditRuleCertificateIssueTypeText(item.issueType))}</strong><span class="record-status">${statusText}${isOverdue ? "・期限超過" : ""}</span></div>
        <dl class="photo-meta">
          <div><dt>証明書ID</dt><dd>${escapeHtml(item.certificateId || "-")}</dd></div><div><dt>変更申請ID</dt><dd>${escapeHtml(item.proposalId || "-")}</dd></div>
          <div><dt>担当者</dt><dd>${escapeHtml(item.assignedTo || "")}</dd></div><div><dt>対応期限</dt><dd>${escapeHtml(formatDate(item.dueAt))}</dd></div>
          <div><dt>登録者</dt><dd>${escapeHtml(item.createdBy || "")}</dd></div><div><dt>対象月</dt><dd>${escapeHtml(item.targetMonth || "")}</dd></div>
        </dl>
        <p>原因：${escapeHtml(item.cause || "")}</p><p>是正内容：${escapeHtml(item.actionPlan || "")}</p>
        ${item.issueType === "effectiveness-insufficient" ? `<p>再是正進捗：${Number(item.progressPercent || 0)}%${item.latestProgressNote ? `／${escapeHtml(item.latestProgressNote)}` : ""}／担当変更履歴 ${Array.isArray(item.assignmentHistory) ? item.assignmentHistory.length : 0}件</p>` : ""}
        ${item.rootCauseCategory ? `<p>原因分類：${escapeHtml(item.rootCauseCategory)}／再発防止責任者：${escapeHtml(item.preventionOwner || "")}／レビュー期限：${escapeHtml(formatDate(item.preventionReviewDueAt))}</p><p>再発防止策：${escapeHtml(item.preventionPlan || "")}</p>` : ""}
        ${item.managementReviewStatus ? `<p>管理者レビュー：${escapeHtml(item.managementReviewStatus === "approved" ? "承認済み" : item.managementReviewStatus === "needs-revision" ? "要見直し" : "レビュー待ち")}${item.managementReviewNote ? `／${escapeHtml(item.managementReviewNote)}` : ""}</p>` : ""}
        ${item.effectivenessStatus ? `<p>効果確認：${escapeHtml(item.effectivenessStatus === "effective" ? "有効確認済み" : item.effectivenessStatus === "ineffective" ? "効果不十分" : "確認待ち")}／期限：${escapeHtml(item.effectivenessDueAt ? formatDate(item.effectivenessDueAt) : "未設定")}${item.effectivenessCriteria ? `／基準：${escapeHtml(item.effectivenessCriteria)}` : ""}${item.effectivenessResultNote ? `／結果：${escapeHtml(item.effectivenessResultNote)}` : ""}</p>` : ""}
        ${item.followUpCorrectiveActionId ? `<p>再是正処置ID：${escapeHtml(item.followUpCorrectiveActionId)}</p>` : ""}
        ${item.issueType === "effectiveness-insufficient" ? `<p>再評価：${escapeHtml(item.followUpReevaluationStatus === "pending" ? "確認待ち" : item.followUpReevaluationStatus === "no-recurrence" ? "再発なし" : item.followUpReevaluationStatus === "recurrence-detected" ? "再発あり" : "未設定")}${item.followUpReevaluationDueAt ? `／期限 ${escapeHtml(formatDate(item.followUpReevaluationDueAt))}` : ""}${item.followUpReevaluationNote ? `／${escapeHtml(item.followUpReevaluationNote)}` : ""}</p><p>案件クローズ：${escapeHtml(item.caseClosureStatus === "pending-approval" ? "承認待ち" : item.caseClosureStatus === "closed" ? "完了" : item.caseClosureStatus === "blocked" ? "不可" : "未準備")}${item.caseClosedBy ? `／${escapeHtml(item.caseClosedBy)}・${escapeHtml(formatDate(item.caseClosedAt))}` : ""}</p>` : ""}
        ${item.completionNote ? `<p>対応結果：${escapeHtml(item.completionNote)}</p>` : ""}${item.verificationNote ? `<p>完了確認：${escapeHtml(item.verificationNote)}</p>` : ""}
        <div class="management-actions">
          <button type="button" data-plan-rule-certificate-prevention="${escapeHtml(item.id)}">再発防止策を登録</button>
          ${item.preventionPlan ? `<button type="button" data-review-rule-certificate-prevention="${escapeHtml(item.id)}">別担当者が管理者レビュー</button>` : ""}
          ${item.managementReviewStatus === "approved" && !item.effectivenessStatus ? `<button type="button" data-schedule-rule-certificate-effectiveness="${escapeHtml(item.id)}">効果確認を設定</button>` : ""}
          ${item.effectivenessStatus === "pending" ? `<button type="button" data-review-rule-certificate-effectiveness="${escapeHtml(item.id)}">別担当者が効果確認</button>` : ""}
          ${item.effectivenessStatus === "ineffective" && !item.followUpCorrectiveActionId ? `<button type="button" data-create-rule-certificate-followup="${escapeHtml(item.id)}">再是正処置を登録</button>` : ""}
          ${item.issueType === "effectiveness-insufficient" && item.status === "open" ? `<button type="button" data-update-rule-certificate-followup-progress="${escapeHtml(item.id)}">進捗更新</button><button type="button" data-reassign-rule-certificate-followup="${escapeHtml(item.id)}">担当者変更</button>` : ""}
          ${item.status === "open" ? `<button type="button" data-complete-rule-certificate-corrective="${escapeHtml(item.id)}">${item.issueType === "effectiveness-insufficient" ? "再是正完了を申請" : "対応完了を登録"}</button>` : ""}
          ${item.status === "pending-verification" ? `<button type="button" data-verify-rule-certificate-corrective="${escapeHtml(item.id)}">別担当者が完了確認</button>` : ""}
          ${item.issueType === "effectiveness-insufficient" && item.status === "closed" && (!item.followUpReevaluationStatus || item.followUpReevaluationStatus === "not-scheduled") ? `<button type="button" data-schedule-followup-reevaluation="${escapeHtml(item.id)}">再評価を設定</button>` : ""}
          ${item.followUpReevaluationStatus === "pending" ? `<button type="button" data-review-followup-reevaluation="${escapeHtml(item.id)}">別担当者が再評価</button>` : ""}
          ${item.caseClosureStatus === "pending-approval" ? `<button type="button" data-close-followup-case="${escapeHtml(item.id)}">別担当者が案件クローズ</button>` : ""}
        </div>
      </article>`;
    }).join("");
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-plan-rule-certificate-prevention]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再発防止策の登録者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const rootCauseCategory = prompt("原因分類を入力してください（例：手順・システム・教育・管理・外部要因）。", "手順・ルール"); if (rootCauseCategory === null) return;
      const preventionPlan = prompt("再発防止策を入力してください。", ""); if (preventionPlan === null) return;
      const owner = prompt("再発防止責任者を入力してください。", ""); if (owner === null) return;
      const reviewDueAt = prompt("管理者レビュー期限を入力してください（YYYY-MM-DD）。", new Date(Date.now() + 30 * 86400000).toISOString().slice(0,10)); if (reviewDueAt === null) return;
      try { window.ISSStorage.updateCorrectiveEvidenceAuditRuleCertificateRecurrencePrevention(button.dataset.planRuleCertificatePrevention, { actor, rootCauseCategory, preventionPlan, owner, reviewDueAt }); showMessage("再発防止策を登録しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-review-rule-certificate-prevention]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("管理者レビュー担当者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const result = confirm("再発防止策を承認しますか？\n［OK］承認　［キャンセル］要見直し") ? "approved" : "needs-revision";
      const note = prompt("レビュー結果を入力してください。", ""); if (note === null) return;
      try { window.ISSStorage.reviewCorrectiveEvidenceAuditRuleCertificateRecurrencePrevention(button.dataset.reviewRuleCertificatePrevention, { actor, result, note }); showMessage("管理者レビューを登録しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-schedule-rule-certificate-effectiveness]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("効果確認の設定者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const dueAt = prompt("効果確認期限を入力してください（YYYY-MM-DD）。", new Date(Date.now() + 90 * 86400000).toISOString().slice(0,10)); if (dueAt === null) return;
      const criteria = prompt("効果確認の評価基準を入力してください。", "同種の不一致が確認期間中に再発していないこと"); if (criteria === null) return;
      try { window.ISSStorage.scheduleCorrectiveEvidenceAuditRuleCertificateEffectivenessReview(button.dataset.scheduleRuleCertificateEffectiveness, { actor, dueAt, criteria }); showMessage("効果確認の期限と評価基準を設定しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-review-rule-certificate-effectiveness]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("効果確認者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const result = confirm("再発防止策は有効でしたか？\n［OK］有効　［キャンセル］効果不十分") ? "effective" : "ineffective";
      const note = prompt("効果確認結果と根拠を入力してください。", ""); if (note === null) return;
      try { window.ISSStorage.reviewCorrectiveEvidenceAuditRuleCertificateEffectiveness(button.dataset.reviewRuleCertificateEffectiveness, { actor, result, note }); showMessage(result === "effective" ? "有効確認を登録しました。" : "効果不十分として登録しました。再是正処置を作成してください。", result === "ineffective"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-create-rule-certificate-followup]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再是正処置の登録者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const assignedTo = prompt("再是正処置の担当者を入力してください。", ""); if (assignedTo === null) return;
      const cause = prompt("効果が不十分だった原因を入力してください。", ""); if (cause === null) return;
      const actionPlan = prompt("再是正内容を入力してください。", ""); if (actionPlan === null) return;
      const dueAt = prompt("再是正期限を入力してください（YYYY-MM-DD）。", new Date(Date.now() + 14 * 86400000).toISOString().slice(0,10)); if (dueAt === null) return;
      try { window.ISSStorage.createFollowUpCorrectiveEvidenceAuditRuleCertificateAction(button.dataset.createRuleCertificateFollowup, { actor, assignedTo, cause, actionPlan, dueAt }); showMessage("再是正処置を登録しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-update-rule-certificate-followup-progress]").forEach(button => button.addEventListener("click", () => {
      const item = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" }).find(row => row.id === button.dataset.updateRuleCertificateFollowupProgress);
      if (!item) return;
      const actor = prompt("進捗更新者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const progressPercent = prompt("進捗率を0～100で入力してください。", String(Number(item.progressPercent || 0))); if (progressPercent === null) return;
      const note = prompt("進捗内容を入力してください。", item.latestProgressNote || ""); if (note === null) return;
      try { window.ISSStorage.updateFollowUpCorrectiveEvidenceAuditRuleCertificateProgress(item.id, { actor, progressPercent, note }); showMessage("再是正処置の進捗を更新しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-reassign-rule-certificate-followup]").forEach(button => button.addEventListener("click", () => {
      const item = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" }).find(row => row.id === button.dataset.reassignRuleCertificateFollowup);
      if (!item) return;
      const actor = prompt("担当者変更の実行者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const assignedTo = prompt("新しい担当者を入力してください。", item.assignedTo || ""); if (assignedTo === null) return;
      const reason = prompt("担当者変更理由を入力してください。", ""); if (reason === null) return;
      try { window.ISSStorage.reassignFollowUpCorrectiveEvidenceAuditRuleCertificateAction(item.id, { actor, assignedTo, reason }); showMessage("再是正処置の担当者を変更しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-complete-rule-certificate-corrective]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("対応完了者を入力してください。", registeredBy?.value || "");
      if (actor === null) return;
      const note = prompt("対応結果を入力してください。", "");
      if (note === null) return;
      try {
        const target = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" }).find(row => row.id === button.dataset.completeRuleCertificateCorrective);
        window.ISSStorage.completeCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(button.dataset.completeRuleCertificateCorrective, { actor, note });
        showMessage(target?.issueType === "effectiveness-insufficient" ? "再是正処置を完了確認待ちにしました。" : "是正処置を完了確認待ちにしました。");
        renderAuditRuleCertificateCorrectiveActions();
      } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-verify-rule-certificate-corrective]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("完了確認者を入力してください。", registeredBy?.value || "");
      if (actor === null) return;
      const note = prompt("完了確認結果を入力してください。", "");
      if (note === null) return;
      try {
        const target = window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" }).find(row => row.id === button.dataset.verifyRuleCertificateCorrective);
        window.ISSStorage.verifyCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(button.dataset.verifyRuleCertificateCorrective, { actor, note });
        showMessage(target?.issueType === "effectiveness-insufficient" ? "再是正処置の完了確認を登録しました。" : "是正処置の完了確認を登録しました。");
        renderAuditRuleCertificateCorrectiveActions();
      } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-schedule-followup-reevaluation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再評価の設定者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const dueAt = prompt("再評価期限を入力してください（YYYY-MM-DD）。", new Date(Date.now() + 90 * 86400000).toISOString().slice(0,10)); if (dueAt === null) return;
      const criteria = prompt("再発確認の基準を入力してください。", "確認期間中に同種の不一致が再発していないこと"); if (criteria === null) return;
      try { window.ISSStorage.scheduleFollowUpCorrectiveEvidenceAuditRuleCertificateReevaluation(button.dataset.scheduleFollowupReevaluation, { actor, dueAt, criteria }); showMessage("再是正処置後の再評価を設定しました。"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-review-followup-reevaluation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再評価担当者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const result = confirm("再発は確認されませんでしたか？\n［OK］再発なし　［キャンセル］再発あり") ? "no-recurrence" : "recurrence-detected";
      const note = prompt("再評価結果と根拠を入力してください。", ""); if (note === null) return;
      try { window.ISSStorage.reviewFollowUpCorrectiveEvidenceAuditRuleCertificateReevaluation(button.dataset.reviewFollowupReevaluation, { actor, result, note }); showMessage(result === "no-recurrence" ? "再発なしとしてクローズ承認待ちにしました。" : "再発ありとして案件クローズを停止しました。", result === "recurrence-detected"); renderAuditRuleCertificateCorrectiveActions(); } catch (error) { showMessage(error.message, true); }
    }));
    auditRuleCertificateCorrectiveList.querySelectorAll("[data-close-followup-case]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("案件クローズ承認者を入力してください。", registeredBy?.value || ""); if (actor === null) return;
      const note = prompt("クローズ確認内容を入力してください。", "再発がないことを確認し、案件をクローズします。"); if (note === null) return;
      try { window.ISSStorage.closeFollowUpCorrectiveEvidenceAuditRuleCertificateCase(button.dataset.closeFollowupCase, { actor, note }); showMessage("案件をクローズし、クローズ証明を生成しました。"); renderAuditRuleCertificateCorrectiveActions(); renderCaseClosureCertificates(); } catch (error) { showMessage(error.message, true); }
    }));
  }

  verifyAuditRuleCertificateFileButton?.addEventListener("click", async () => {
    const file = auditRuleCertificateFile?.files?.[0];
    if (!file) return showMessage("検証する適用証明JSONを選択してください。", true);
    try {
      const certificate = JSON.parse(await file.text());
      const result = window.ISSStorage.recordCorrectiveEvidenceAuditRuleCertificateVerification(certificate, { actor: registeredBy?.value || "利用者", source: "import", compareCurrentRules: true });
      if (auditRuleCertificateVerificationResult) auditRuleCertificateVerificationResult.innerHTML = `<article class="${result.valid ? "" : "is-overdue"}"><strong>${result.valid ? "検証合格" : "検証不合格"}</strong><p>証明書ID：${escapeHtml(result.certificateId || "不明")}</p><p>検証日時：${escapeHtml(formatDate(result.checkedAt))}</p>${result.errors.length ? `<p class="deadline-warning">${result.errors.map(escapeHtml).join("／")}</p>` : ""}${result.warnings.length ? `<p>${result.warnings.map(escapeHtml).join("／")}</p>` : ""}</article>`;
      showMessage(result.valid ? "読み込んだ適用証明は検証合格です。" : "読み込んだ適用証明に不整合があります。", !result.valid);
      renderAuditRuleCertificateLedger();
    } catch (error) {
      showMessage(error.message || "適用証明JSONを検証できませんでした。", true);
    }
  });

  runAuditRuleCertificateMonthlyButton?.addEventListener("click", () => {
    const month = auditRuleCertificateMonth?.value || new Date().toISOString().slice(0, 7);
    const report = window.ISSStorage.buildCorrectiveEvidenceAuditRuleCertificateMonthlyReconciliation(month);
    latestAuditRuleCertificateMonthlyReport = report;
    renderAuditRuleCertificateMonthlyIssues(report);
    if (auditRuleCertificateVerificationResult) auditRuleCertificateVerificationResult.innerHTML = `<div class="audit-rule-simulation__summary"><article><strong>${report.summary.certificates}</strong><span>証明書</span></article><article><strong>${report.summary.valid}</strong><span>検証合格</span></article><article><strong>${report.summary.invalid}</strong><span>検証不合格</span></article><article><strong>${report.summary.proposalMissing}</strong><span>申請未照合</span></article></div>${report.summary.invalid || report.summary.proposalMissing || report.summary.duplicateCertificateIds || report.summary.duplicateProposalIds ? `<p class="deadline-warning">要確認事項があります。証明書・変更申請・処理履歴を確認してください。</p>` : `<p>月次照合で不整合は検出されませんでした。</p>`}`;
    downloadJson(`audit-rule-certificate-monthly-${month}.json`, report);
    showMessage(`適用証明の月次照合を実行しました（${report.summary.certificates}件）。`, report.summary.invalid > 0);
  });

  exportAuditRuleCertificateVerificationsCsvButton?.addEventListener("click", () => {
    const rows = [["検証日時","証明書ID","変更申請ID","結果","検証者","検証元","エラー","注意事項","登録ハッシュ","再計算ハッシュ"]];
    window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateVerifications().forEach(item => rows.push([formatDate(item.checkedAt),item.certificateId,item.proposalId,item.valid ? "合格" : "不合格",item.checkedBy,item.source,(item.errors || []).join("／"),(item.warnings || []).join("／"),item.registeredHash,item.calculatedHash]));
    downloadCsv(`audit-rule-certificate-verifications-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage("適用証明の検証履歴をCSV出力しました。");
  });

  auditRuleCertificateCorrectiveStatus?.addEventListener("change", renderAuditRuleCertificateCorrectiveActions);
  auditRuleCertificateCorrectiveFilter?.addEventListener("input", renderAuditRuleCertificateCorrectiveActions);
  exportAuditRuleCertificateCorrectiveCsvButton?.addEventListener("click", () => {
    const rows = [["状態","種別","証明書ID","変更申請ID","対象月","担当者","期限","原因","是正内容","原因分類","再発防止策","再発防止責任者","レビュー期限","管理者レビュー状態","管理者レビュー担当者","管理者レビュー結果","効果確認状態","効果確認期限","評価基準","効果確認者","効果確認結果","再是正処置ID","登録者","登録日時","完了者","完了日時","対応結果","確認者","確認日時","確認結果"]];
    window.ISSStorage.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" }).forEach(item => rows.push([item.status,auditRuleCertificateIssueTypeText(item.issueType),item.certificateId,item.proposalId,item.targetMonth,item.assignedTo,formatDate(item.dueAt),item.cause,item.actionPlan,item.rootCauseCategory || "",item.preventionPlan || "",item.preventionOwner || "",item.preventionReviewDueAt ? formatDate(item.preventionReviewDueAt) : "",item.managementReviewStatus || "",item.managementReviewedBy || "",item.managementReviewNote || "",item.effectivenessStatus || "",item.effectivenessDueAt ? formatDate(item.effectivenessDueAt) : "",item.effectivenessCriteria || "",item.effectivenessReviewedBy || "",item.effectivenessResultNote || "",item.followUpCorrectiveActionId || "",item.createdBy,formatDate(item.createdAt),item.completedBy,item.completedAt ? formatDate(item.completedAt) : "",item.completionNote,item.verifiedBy,item.verifiedAt ? formatDate(item.verifiedAt) : "",item.verificationNote]));
    downloadCsv(`audit-rule-certificate-corrective-actions-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage("適用証明の是正処置をCSV出力しました。");
  });
  let latestAuditRuleCertificateCorrectiveTrend = null;
  function renderAuditRuleCertificateCorrectiveTrend(report) {
    if (!auditRuleCertificateCorrectiveTrendResult || !report) return;
    const causeRows = Object.entries(report.byCause || {}).sort((a,b) => b[1]-a[1]);
    auditRuleCertificateCorrectiveTrendResult.innerHTML = `<div class="audit-rule-simulation__summary"><article><strong>${report.summary.total}</strong><span>是正処置</span></article><article><strong>${report.summary.preventionPlanned}</strong><span>再発防止策あり</span></article><article><strong>${report.summary.reviewPending}</strong><span>レビュー待ち</span></article><article><strong>${report.summary.reviewApproved}</strong><span>承認済み</span></article><article><strong>${report.summary.needsRevision}</strong><span>要見直し</span></article><article><strong>${report.summary.effectivenessPending || 0}</strong><span>効果確認待ち</span></article><article><strong>${report.summary.effectivenessEffective || 0}</strong><span>有効確認済み</span></article><article><strong>${report.summary.effectivenessIneffective || 0}</strong><span>効果不十分</span></article></div><div class="audit-rule-simulation__list">${causeRows.length ? causeRows.map(([name,count]) => `<article><strong>${escapeHtml(name)}</strong><p>${count}件</p></article>`).join("") : "<p>対象月のデータはありません。</p>"}</div>`;
  }
  runAuditRuleCertificateCorrectiveTrendButton?.addEventListener("click", () => {
    const month = auditRuleCertificateCorrectiveTrendMonth?.value || new Date().toISOString().slice(0,7);
    latestAuditRuleCertificateCorrectiveTrend = window.ISSStorage.buildCorrectiveEvidenceAuditRuleCertificateCorrectiveTrendReport(month);
    renderAuditRuleCertificateCorrectiveTrend(latestAuditRuleCertificateCorrectiveTrend);
    showMessage(`是正処置の月次傾向を集計しました（${latestAuditRuleCertificateCorrectiveTrend.summary.total}件）。`);
  });
  exportAuditRuleCertificateCorrectiveTrendJsonButton?.addEventListener("click", () => {
    const month = auditRuleCertificateCorrectiveTrendMonth?.value || new Date().toISOString().slice(0,7);
    const report = latestAuditRuleCertificateCorrectiveTrend?.targetMonth === month ? latestAuditRuleCertificateCorrectiveTrend : window.ISSStorage.buildCorrectiveEvidenceAuditRuleCertificateCorrectiveTrendReport(month);
    downloadJson(`audit-rule-certificate-corrective-trend-${month}.json`, report);
    showMessage("是正処置の月次傾向JSONを出力しました。");
  });
  function renderCaseClosureSummary(rows) {
    if (!caseClosureCertificateSummary) return;
    const retentionYears = window.ISSStorage.getCaseClosureRetentionYears();
    const now = Date.now();
    const expiring = rows.filter(item => {
      const archived = new Date(item.archivedAt || item.closedAt || 0).getTime();
      const expiry = new Date(archived).setFullYear(new Date(archived).getFullYear() + retentionYears);
      return expiry > now && expiry - now <= 365 * 24 * 60 * 60 * 1000;
    }).length;
    const invalid = rows.filter(item => !window.ISSStorage.verifyCorrectiveEvidenceCaseClosureCertificate(item).valid).length;
    const reopened = window.ISSStorage.getCaseReopenRequests().filter(item => item.status === "approved").length;
    const pending = window.ISSStorage.getCaseReopenRequests().filter(item => item.status === "pending-approval").length;
    caseClosureCertificateSummary.innerHTML = `<article><strong>${rows.length}</strong><span>証明書</span></article><article><strong>${invalid}</strong><span>要確認</span></article><article><strong>${expiring}</strong><span>1年以内に保管期限</span></article><article><strong>${pending}</strong><span>再開承認待ち</span></article><article><strong>${reopened}</strong><span>再開済み</span></article>`;
  }

  function caseReinvestigationStatusText(status) {
    const map = {
      "investigating": "再調査中",
      "pending-review": "再調査承認待ち",
      "corrective-in-progress": "追加是正中",
      "pending-corrective-verification": "追加是正確認待ち",
      "reevaluation-pending": "再評価待ち",
      "pending-reclosure": "再クローズ承認待ち",
      "reclosed": "再クローズ済み"
    };
    return map[status] || status || "未開始";
  }

  function getCaseReopenWorkflowRows() {
    const query = String(caseReopenRequestFilter?.value || "").trim().toLowerCase();
    const selectedStatus = caseReopenWorkflowStatus?.value || "active";
    const selectedOffice = caseReopenWorkflowOffice?.value || "all";
    const requests = window.ISSStorage.getCaseReopenRequests();
    const investigations = window.ISSStorage.getCaseReopenInvestigations();
    const now = Date.now();
    return requests.map(request => {
      const investigation = investigations.find(row => row.reopenRequestId === request.id && row.status !== "cancelled") || null;
      const workflowStatus = request.status === "pending-approval" ? "pending-approval" : request.status === "reclosed" ? "reclosed" : investigation?.status || "approved";
      const dueAt = investigation?.dueAt || investigation?.correctiveDueAt || investigation?.reevaluationDueAt || "";
      const overdue = Boolean(dueAt && workflowStatus !== "reclosed" && new Date(dueAt).getTime() < now);
      return { request, investigation, workflowStatus, dueAt, overdue };
    }).filter(row => {
      if (selectedOffice !== "all" && row.request.officeId !== selectedOffice) return false;
      if (selectedStatus === "active" && row.workflowStatus === "reclosed") return false;
      if (selectedStatus === "overdue" && !row.overdue) return false;
      if (!["active", "all", "overdue"].includes(selectedStatus) && row.workflowStatus !== selectedStatus) return false;
      if (!query) return true;
      const haystack = [row.request.id, row.request.certificateId, row.request.correctiveActionId, row.request.office, row.request.requestedBy, row.request.reason, row.request.evidence, row.investigation?.assignedTo, row.investigation?.scope, row.investigation?.findings, row.investigation?.rootCause, row.investigation?.additionalAction].join(" ").toLowerCase();
      return haystack.includes(query);
    });
  }

  function populateCaseReopenOfficeFilter() {
    if (!caseReopenWorkflowOffice) return;
    const current = caseReopenWorkflowOffice.value || "all";
    const offices = [...new Map(window.ISSStorage.getCaseReopenRequests().map(item => [item.officeId || item.office, { id: item.officeId || item.office, name: item.office || item.officeId }])).values()];
    caseReopenWorkflowOffice.innerHTML = '<option value="all">すべての事業所</option>' + offices.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join("");
    if ([...caseReopenWorkflowOffice.options].some(option => option.value === current)) caseReopenWorkflowOffice.value = current;
  }

  function renderCaseReopenWorkflowSummary(allRows) {
    if (!caseReopenWorkflowSummary) return;
    const counts = {
      pendingApproval: allRows.filter(row => row.workflowStatus === "pending-approval").length,
      investigating: allRows.filter(row => row.workflowStatus === "investigating").length,
      pendingReview: allRows.filter(row => row.workflowStatus === "pending-review").length,
      corrective: allRows.filter(row => ["corrective-in-progress", "pending-corrective-verification"].includes(row.workflowStatus)).length,
      reevaluation: allRows.filter(row => row.workflowStatus === "reevaluation-pending").length,
      pendingReclosure: allRows.filter(row => row.workflowStatus === "pending-reclosure").length,
      overdue: allRows.filter(row => row.overdue).length,
      reclosed: allRows.filter(row => row.workflowStatus === "reclosed").length
    };
    caseReopenWorkflowSummary.innerHTML = `<article><strong>${counts.pendingApproval}</strong><span>再開承認待ち</span></article><article><strong>${counts.investigating}</strong><span>再調査中</span></article><article><strong>${counts.pendingReview}</strong><span>調査承認待ち</span></article><article><strong>${counts.corrective}</strong><span>追加是正</span></article><article><strong>${counts.reevaluation}</strong><span>再評価待ち</span></article><article><strong>${counts.pendingReclosure}</strong><span>再クローズ待ち</span></article><article><strong>${counts.overdue}</strong><span>期限超過</span></article><article><strong>${counts.reclosed}</strong><span>再クローズ済み</span></article>`;
  }

  function buildCaseReopenWorkflowReport() {
    const allRequests = window.ISSStorage.getCaseReopenRequests();
    const investigations = window.ISSStorage.getCaseReopenInvestigations();
    const rows = allRequests.map(request => ({
      request,
      investigation: investigations.find(row => row.reopenRequestId === request.id && row.status !== "cancelled") || null
    }));
    return {
      schemaVersion: "1.0",
      reportId: `case-reopen-workflow-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      generatedBy: "利用者",
      count: rows.length,
      rows
    };
  }

  function renderCaseReopenRequests() {
    if (!caseReopenRequestList) return;
    populateCaseReopenOfficeFilter();
    const allRows = (() => {
      const requests = window.ISSStorage.getCaseReopenRequests();
      const investigations = window.ISSStorage.getCaseReopenInvestigations();
      const now = Date.now();
      return requests.map(request => {
        const investigation = investigations.find(row => row.reopenRequestId === request.id && row.status !== "cancelled") || null;
        const workflowStatus = request.status === "pending-approval" ? "pending-approval" : request.status === "reclosed" ? "reclosed" : investigation?.status || "approved";
        const dueAt = investigation?.dueAt || investigation?.correctiveDueAt || investigation?.reevaluationDueAt || "";
        return { request, investigation, workflowStatus, dueAt, overdue: Boolean(dueAt && workflowStatus !== "reclosed" && new Date(dueAt).getTime() < now) };
      });
    })();
    renderCaseReopenWorkflowSummary(allRows);
    const workflowRows = getCaseReopenWorkflowRows();
    const rows = workflowRows.map(row => row.request);
    const investigations = workflowRows.map(row => row.investigation).filter(Boolean);
    if (!rows.length) {
      caseReopenRequestList.innerHTML = '<div class="empty-state"><strong>案件再開申請はありません</strong><p>クローズ後に新事実や再発が判明した場合に登録します。</p></div>';
      return;
    }
    caseReopenRequestList.innerHTML = rows.map(item => {
      const investigation = investigations.find(row => row.reopenRequestId === item.id && row.status !== "cancelled");
      const statusText = item.status === "pending-approval" ? "承認待ち" : item.status === "reclosed" ? "再クローズ済み" : investigation ? caseReinvestigationStatusText(investigation.status) : "再開承認済み";
      let actions = "";
      if (item.status === "pending-approval") actions = `<button type="button" data-approve-case-reopen="${escapeHtml(item.id)}">再開を承認</button>`;
      else if (item.status === "approved" && !investigation) actions = `<button type="button" data-start-case-reinvestigation="${escapeHtml(item.id)}">再調査を開始</button>`;
      else if (investigation?.status === "investigating") actions = `<button type="button" data-update-case-reinvestigation="${escapeHtml(investigation.id)}">進捗更新</button><button type="button" data-submit-case-reinvestigation="${escapeHtml(investigation.id)}">再調査結果を提出</button>`;
      else if (investigation?.status === "pending-review") actions = `<button type="button" data-review-case-reinvestigation="${escapeHtml(investigation.id)}">再調査を承認</button>`;
      else if (investigation?.status === "corrective-in-progress") actions = `<button type="button" data-complete-case-reopen-corrective="${escapeHtml(investigation.id)}">追加是正を完了</button>`;
      else if (investigation?.status === "pending-corrective-verification") actions = `<button type="button" data-verify-case-reopen-corrective="${escapeHtml(investigation.id)}">追加是正を確認</button>`;
      else if (investigation?.status === "reevaluation-pending") actions = `<button type="button" data-review-case-reopen-reevaluation="${escapeHtml(investigation.id)}">再評価する</button>`;
      else if (investigation?.status === "pending-reclosure") actions = `<button type="button" data-reclose-case-reinvestigation="${escapeHtml(investigation.id)}">再クローズ承認</button>`;
      return `<article class="certificate-corrective-card ${item.status === "pending-approval" ? "is-overdue" : ""}">
        <div class="photo-card__header"><strong>${escapeHtml(item.id)}</strong><span class="record-status">${escapeHtml(statusText)}</span></div>
        <dl class="photo-meta"><div><dt>証明書ID</dt><dd>${escapeHtml(item.certificateId)}</dd></div><div><dt>是正処置ID</dt><dd>${escapeHtml(item.correctiveActionId)}</dd></div><div><dt>事業所</dt><dd>${escapeHtml(item.office || "")}</dd></div><div><dt>申請者</dt><dd>${escapeHtml(item.requestedBy || "")}／${escapeHtml(formatDate(item.requestedAt))}</dd></div><div><dt>承認者</dt><dd>${escapeHtml(item.approvedBy || "未承認")}</dd></div>${investigation ? `<div><dt>再調査担当者</dt><dd>${escapeHtml(investigation.assignedTo || "")}</dd></div><div><dt>進捗</dt><dd>${escapeHtml(investigation.progress || 0)}%</dd></div><div><dt>期限</dt><dd>${escapeHtml(formatDate(investigation.dueAt || investigation.correctiveDueAt || investigation.reevaluationDueAt || ""))}</dd></div>` : ""}</dl>
        <p>再開理由：${escapeHtml(item.reason || "")}</p><p>新事実・根拠：${escapeHtml(item.evidence || "未登録")}</p>
        ${item.approvalNote ? `<p>承認内容：${escapeHtml(item.approvalNote)}</p>` : ""}
        ${investigation ? `<p>調査範囲：${escapeHtml(investigation.scope || "")}</p><p>調査結果：${escapeHtml(investigation.findings || "未提出")}</p><p>追加是正：${escapeHtml(investigation.additionalAction || "未登録")}</p>` : ""}
        ${actions ? `<div class="management-actions">${actions}</div>` : ""}
      </article>`;
    }).join("");
    caseReopenRequestList.querySelectorAll("[data-approve-case-reopen]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再開承認者名を入力してください。");
      if (!actor) return;
      const note = prompt("承認内容を入力してください。");
      if (!note) return;
      try {
        window.ISSStorage.approveCaseReopenRequest(button.dataset.approveCaseReopen, { actor, note });
        showMessage("案件再開を承認しました。");
        renderCaseReopenRequests();
        renderCaseClosureCertificates();
      } catch (error) { showMessage(error.message, true); }
    }));

    caseReopenRequestList.querySelectorAll("[data-start-case-reinvestigation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再調査開始者名を入力してください。"); if (!actor) return;
      const assignedTo = prompt("再調査担当者名を入力してください。"); if (!assignedTo) return;
      const scope = prompt("再調査の範囲・確認事項を入力してください。"); if (!scope) return;
      try { window.ISSStorage.startCaseReopenInvestigation(button.dataset.startCaseReinvestigation, { actor, assignedTo, scope }); showMessage("再調査を開始しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-update-case-reinvestigation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("更新者名を入力してください。"); if (!actor) return;
      const progress = prompt("進捗率（0～100）を入力してください。", "50"); if (progress === null) return;
      const note = prompt("進捗内容を入力してください。"); if (!note) return;
      const findings = prompt("現時点の調査結果を入力してください（任意）。", "") || "";
      try { window.ISSStorage.updateCaseReopenInvestigation(button.dataset.updateCaseReinvestigation, { actor, progress, note, findings }); showMessage("再調査の進捗を更新しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-submit-case-reinvestigation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("提出者名を入力してください。"); if (!actor) return;
      const findings = prompt("再調査結果を入力してください。"); if (!findings) return;
      const rootCause = prompt("判明した原因を入力してください。"); if (!rootCause) return;
      const additionalAction = prompt("追加是正内容を入力してください。"); if (!additionalAction) return;
      try { window.ISSStorage.submitCaseReopenInvestigation(button.dataset.submitCaseReinvestigation, { actor, findings, rootCause, additionalAction }); showMessage("再調査結果を提出しました。別担当者の承認が必要です。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-review-case-reinvestigation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再調査承認者名を入力してください。"); if (!actor) return;
      const note = prompt("確認内容を入力してください。"); if (!note) return;
      const assignedTo = prompt("追加是正担当者名を入力してください。"); if (!assignedTo) return;
      try { window.ISSStorage.reviewCaseReopenInvestigation(button.dataset.reviewCaseReinvestigation, { actor, note, assignedTo }); showMessage("再調査結果を承認し、追加是正へ移行しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-complete-case-reopen-corrective]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("追加是正完了者名を入力してください。"); if (!actor) return;
      const result = prompt("追加是正の実施結果を入力してください。"); if (!result) return;
      try { window.ISSStorage.completeCaseReopenCorrectiveAction(button.dataset.completeCaseReopenCorrective, { actor, result }); showMessage("追加是正の完了確認を申請しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-verify-case-reopen-corrective]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("追加是正确認者名を入力してください。"); if (!actor) return;
      const note = prompt("確認結果を入力してください。"); if (!note) return;
      const criteria = prompt("再評価基準を入力してください。", "同種事象の再発がないこと") || "同種事象の再発がないこと";
      try { window.ISSStorage.verifyCaseReopenCorrectiveAction(button.dataset.verifyCaseReopenCorrective, { actor, note, criteria }); showMessage("追加是正を確認し、再評価待ちへ移行しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-review-case-reopen-reevaluation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再評価者名を入力してください。"); if (!actor) return;
      const recurrence = confirm("同種事象の再発が確認されましたか？\nOK＝再発あり／キャンセル＝再発なし");
      const note = prompt("再評価結果と根拠を入力してください。"); if (!note) return;
      try { window.ISSStorage.reviewCaseReopenReevaluation(button.dataset.reviewCaseReopenReevaluation, { actor, note, result: recurrence ? "recurrence" : "no-recurrence" }); showMessage(recurrence ? "再発ありとして追加是正へ戻しました。" : "再発なしとして再クローズ承認待ちへ移行しました。"); renderCaseReopenRequests(); } catch (error) { showMessage(error.message, true); }
    }));
    caseReopenRequestList.querySelectorAll("[data-reclose-case-reinvestigation]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再クローズ承認者名を入力してください。"); if (!actor) return;
      const note = prompt("再クローズ確認内容を入力してください。"); if (!note) return;
      try { window.ISSStorage.recloseCaseReopenInvestigation(button.dataset.recloseCaseReinvestigation, { actor, note }); showMessage("案件を再クローズし、新しい証明書を生成しました。"); renderCaseReopenRequests(); renderCaseClosureCertificates(); } catch (error) { showMessage(error.message, true); }
    }));
  }

  function renderCaseClosureCertificates() {
    if (!caseClosureCertificateList) return;
    const rows = window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates({ query: caseClosureCertificateFilter?.value || "" });
    renderCaseClosureSummary(window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates());
    if (caseClosureRetentionYears) caseClosureRetentionYears.value = window.ISSStorage.getCaseClosureRetentionYears();
    if (!rows.length) {
      caseClosureCertificateList.innerHTML = '<div class="empty-state"><strong>案件クローズ証明はありません</strong><p>再評価とクローズ承認が完了すると自動生成されます。</p></div>';
      renderCaseReopenRequests();
      return;
    }
    const retentionYears = window.ISSStorage.getCaseClosureRetentionYears();
    caseClosureCertificateList.innerHTML = rows.map(item => {
      const verification = window.ISSStorage.verifyCorrectiveEvidenceCaseClosureCertificate(item);
      const verificationHistory = window.ISSStorage.getCaseClosureCertificateVerifications(item.certificateId);
      const reopen = window.ISSStorage.getCaseReopenRequests().find(row => row.certificateId === item.certificateId && ["pending-approval", "approved"].includes(row.status));
      const archivedAt = new Date(item.archivedAt || item.closedAt);
      const expiresAt = new Date(archivedAt);
      expiresAt.setFullYear(expiresAt.getFullYear() + retentionYears);
      return `<article class="certificate-corrective-card ${verification.valid ? "" : "is-overdue"}">
        <div class="photo-card__header"><strong>${escapeHtml(item.certificateId)}</strong><span class="record-status">${reopen?.status === "approved" ? "案件再開済み" : verification.valid ? "検証合格" : "要確認"}</span></div>
        <dl class="photo-meta"><div><dt>是正処置ID</dt><dd>${escapeHtml(item.correctiveActionId)}</dd></div><div><dt>事業所</dt><dd>${escapeHtml(item.office || "")}</dd></div><div><dt>クローズ承認者</dt><dd>${escapeHtml(item.closedBy || "")}</dd></div><div><dt>クローズ日時</dt><dd>${escapeHtml(formatDate(item.closedAt))}</dd></div><div><dt>再検証履歴</dt><dd>${verificationHistory.length}件</dd></div><div><dt>保管期限</dt><dd>${escapeHtml(formatDate(expiresAt.toISOString()))}</dd></div><div><dt>検証ハッシュ</dt><dd>${escapeHtml(item.verificationHash || "")}</dd></div></dl>
        <p>クローズ確認：${escapeHtml(item.closureNote || "")}</p>
        ${verification.errors.length ? `<p class="deadline-warning">${verification.errors.map(escapeHtml).join("／")}</p>` : ""}
        ${reopen ? `<p class="deadline-warning">再開申請：${escapeHtml(reopen.status === "approved" ? "承認済み" : "承認待ち")}／${escapeHtml(reopen.reason)}</p>` : ""}
        <div class="management-actions"><button type="button" data-verify-case-closure="${escapeHtml(item.certificateId)}">再検証</button><button type="button" data-request-case-reopen="${escapeHtml(item.certificateId)}" ${reopen ? "disabled" : ""}>案件再開申請</button><button type="button" data-export-case-closure="${escapeHtml(item.certificateId)}">証明書JSON</button><button type="button" data-print-case-closure="${escapeHtml(item.certificateId)}">印刷表示</button></div>
      </article>`;
    }).join("");
    caseClosureCertificateList.querySelectorAll("[data-verify-case-closure]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再検証者名を入力してください。", "利用者");
      if (!actor) return;
      try {
        const result = window.ISSStorage.recordCaseClosureCertificateVerification(button.dataset.verifyCaseClosure, actor);
        showMessage(result.result === "passed" ? "案件クローズ証明の再検証に合格しました。" : `再検証で問題を検出しました：${result.errors.join("／")}`, result.result !== "passed");
        renderCaseClosureCertificates();
      } catch (error) { showMessage(error.message, true); }
    }));
    caseClosureCertificateList.querySelectorAll("[data-request-case-reopen]").forEach(button => button.addEventListener("click", () => {
      const actor = prompt("再開申請者名を入力してください。");
      if (!actor) return;
      const reason = prompt("案件を再開する理由を入力してください。");
      if (!reason) return;
      const evidence = prompt("新事実・再発内容・根拠資料を入力してください。", "");
      try {
        window.ISSStorage.createCaseReopenRequest(button.dataset.requestCaseReopen, { actor, reason, evidence });
        showMessage("案件再開申請を作成しました。別担当者の承認が必要です。");
        renderCaseClosureCertificates();
        renderCaseReopenRequests();
      } catch (error) { showMessage(error.message, true); }
    }));
    caseClosureCertificateList.querySelectorAll("[data-export-case-closure]").forEach(button => button.addEventListener("click", () => {
      const item = window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates().find(row => row.certificateId === button.dataset.exportCaseClosure);
      if (item) downloadJson(`${item.certificateId}.json`, item);
    }));
    caseClosureCertificateList.querySelectorAll("[data-print-case-closure]").forEach(button => button.addEventListener("click", () => {
      const item = window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates().find(row => row.certificateId === button.dataset.printCaseClosure);
      if (!item) return;
      const win = window.open("", "_blank", "noopener,noreferrer");
      if (!win) return showMessage("印刷画面を開けませんでした。", true);
      win.document.write(`<meta charset="utf-8"><title>${escapeHtml(item.certificateId)}</title><style>body{font-family:sans-serif;padding:32px;line-height:1.6}dt{font-weight:bold}dd{margin:0 0 12px}h1{font-size:22px}</style><h1>案件クローズ証明書</h1><dl>${Object.entries(item).map(([key,value]) => `<dt>${escapeHtml(key)}</dt><dd>${escapeHtml(typeof value === "object" ? JSON.stringify(value) : value)}</dd>`).join("")}</dl>`);
      win.document.close(); win.print();
    }));
    renderCaseReopenRequests();
  }

  caseClosureCertificateFilter?.addEventListener("input", renderCaseClosureCertificates);
  caseReopenRequestFilter?.addEventListener("input", renderCaseReopenRequests);
  caseReopenWorkflowStatus?.addEventListener("change", renderCaseReopenRequests);
  caseReopenWorkflowOffice?.addEventListener("change", renderCaseReopenRequests);
  exportCaseReopenWorkflowCsvButton?.addEventListener("click", () => {
    const rows = [["再開申請ID","証明書ID","是正処置ID","事業所","状態","申請者","申請日時","再開理由","再調査担当者","進捗率","期限","調査範囲","調査結果","原因","追加是正","再評価結果","再クローズ証明書ID"]];
    const requests = window.ISSStorage.getCaseReopenRequests();
    const investigations = window.ISSStorage.getCaseReopenInvestigations();
    requests.forEach(item => {
      const investigation = investigations.find(row => row.reopenRequestId === item.id && row.status !== "cancelled");
      rows.push([item.id,item.certificateId,item.correctiveActionId,item.office,investigation ? caseReinvestigationStatusText(investigation.status) : (item.status === "pending-approval" ? "再開承認待ち" : item.status),item.requestedBy,formatDate(item.requestedAt),item.reason,investigation?.assignedTo || "",investigation?.progress ?? "",investigation ? formatDate(investigation.dueAt || investigation.correctiveDueAt || investigation.reevaluationDueAt || "") : "",investigation?.scope || "",investigation?.findings || "",investigation?.rootCause || "",investigation?.additionalAction || "",investigation?.reevaluationResult || "",investigation?.reclosureCertificateId || ""]);
    });
    downloadCsv(`case-reopen-workflow-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage(`再開案件をCSV出力しました（${requests.length}件）。`);
  });
  exportCaseReopenWorkflowJsonButton?.addEventListener("click", () => {
    const report = buildCaseReopenWorkflowReport();
    downloadJson(`case-reopen-workflow-${new Date().toISOString().slice(0,10)}.json`, report);
    showMessage(`再開案件をJSON出力しました（${report.count}件）。`);
  });
  saveCaseClosureRetentionYearsButton?.addEventListener("click", () => {
    try {
      const years = window.ISSStorage.setCaseClosureRetentionYears(caseClosureRetentionYears?.value || 10);
      showMessage(`案件クローズ証明の保存期間を${years}年に設定しました。`);
      renderCaseClosureCertificates();
    } catch (error) { showMessage(error.message, true); }
  });
  exportCaseClosureCertificatesJsonButton?.addEventListener("click", () => {
    const rows = window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates({ query: caseClosureCertificateFilter?.value || "" });
    downloadJson(`case-closure-certificates-${new Date().toISOString().slice(0,10)}.json`, { schemaVersion: "1.0", exportedAt: new Date().toISOString(), count: rows.length, certificates: rows });
    showMessage(`案件クローズ証明を一括出力しました（${rows.length}件）。`);
  });
  exportCaseClosureCertificatesCsvButton?.addEventListener("click", () => {
    const rows = [["証明書ID","是正処置ID","親是正処置ID","事業所","再評価者","再評価日時","クローズ承認者","クローズ日時","検証結果","検証ハッシュ","クローズ確認"]];
    window.ISSStorage.getCorrectiveEvidenceCaseClosureCertificates({ query: caseClosureCertificateFilter?.value || "" }).forEach(item => {
      const verification = window.ISSStorage.verifyCorrectiveEvidenceCaseClosureCertificate(item);
      rows.push([item.certificateId,item.correctiveActionId,item.parentCorrectiveActionId,item.office,item.reevaluatedBy,formatDate(item.reevaluatedAt),item.closedBy,formatDate(item.closedAt),verification.valid ? "合格" : "要確認",item.verificationHash,item.closureNote]);
    });
    downloadCsv(`case-closure-certificate-ledger-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage("案件クローズ証明台帳をCSV出力しました。");
  });

  if (auditRuleCertificateCorrectiveTrendMonth && !auditRuleCertificateCorrectiveTrendMonth.value) auditRuleCertificateCorrectiveTrendMonth.value = new Date().toISOString().slice(0,7);
  renderAuditRuleCertificateCorrectiveActions();
  renderCaseClosureCertificates();

  if (auditRuleCertificateMonth && !auditRuleCertificateMonth.value) auditRuleCertificateMonth.value = new Date().toISOString().slice(0, 7);

  if (auditRuleScheduledAt && !auditRuleScheduledAt.value) auditRuleScheduledAt.value = toLocalDateTimeValue(new Date(Date.now() + 24 * 60 * 60 * 1000));
  if (auditRuleScheduledAt) auditRuleScheduledAt.disabled = auditRuleReleaseMode?.value !== "scheduled";
  renderCorrectiveEvidenceAuditRules();
  renderCorrectiveEvidenceAudit();

  exportCorrectiveEvidenceAccessCsvButton?.addEventListener("click", () => {
    const logs = window.ISSStorage.getCorrectiveEvidenceAccessLogs({ scope: window.ISSStorage.isAdministrator() ? "all" : "office" });
    const rows = [["アクセス日時", "事業所", "証明書ID", "資料名", "版", "閲覧区分", "操作", "操作者", "権限", "理由"]];
    logs.forEach(item => rows.push([formatDate(item.accessedAt), item.office, item.certificateId, item.title, item.version, correctiveEvidenceAccessText(item.accessLevel), item.operation, item.actor, item.role, item.reason]));
    downloadCsv(`corrective-evidence-access-${new Date().toISOString().slice(0,10)}.csv`, rows);
    showMessage(`証拠資料アクセス履歴をCSV出力しました（${logs.length}件）。`);
  });

})();
