(() => {
  "use strict";

  const KEYS = {
    favorites: "iss-favorites",
    searchHistory: "iss-search-history",
    officeName: "iss-office-name",
    officeId: "iss-office-id",
    userRole: "iss-user-role",
    applications: "iss-applications",
    photos: "iss-photos",
    photoAuditLogs: "iss-photo-audit-logs",
    showImdgReferences: "iss-show-imdg-references",
    requirementLayout: "iss-requirement-layout",
    operationMode: "iss-operation-mode",
    serverEndpoint: "iss-server-endpoint",
    syncQueue: "iss-sync-queue",
    photoLimitPerApplication: "iss-photo-limit-per-application",
    photoLimitPerOffice: "iss-photo-limit-per-office",
    photoMaxFileSizeMb: "iss-photo-max-file-size-mb",
    photoStorageLimitMb: "iss-photo-storage-limit-mb",
    photoRetentionDays: "iss-photo-retention-days",
    photoDeletedGraceDays: "iss-photo-deleted-grace-days",
    photoPurgeApprovalDays: "iss-photo-purge-approval-days",
    photoPurgeExecutionDays: "iss-photo-purge-execution-days",
    photoPurgePlans: "iss-photo-purge-plans",
    photoPurgeCertificates: "iss-photo-purge-certificates",
    photoPurgeCorrectiveActions: "iss-photo-purge-corrective-actions",
    correctiveEvidenceAccessLogs: "iss-corrective-evidence-access-logs",
    correctiveEvidenceAuditFindings: "iss-corrective-evidence-audit-findings",
    correctiveEvidenceAuditRules: "iss-corrective-evidence-audit-rules",
    correctiveEvidenceAuditRuleHistory: "iss-corrective-evidence-audit-rule-history",
    correctiveEvidenceAuditRuleProposals: "iss-corrective-evidence-audit-rule-proposals",
    correctiveEvidenceAuditRuleProposalEvents: "iss-corrective-evidence-audit-rule-proposal-events",
    correctiveEvidenceAuditRuleApplicationCertificates: "iss-corrective-evidence-audit-rule-application-certificates",
    correctiveEvidenceAuditRuleCertificateVerifications: "iss-corrective-evidence-audit-rule-certificate-verifications",
    correctiveEvidenceAuditRuleCertificateCorrectiveActions: "iss-corrective-evidence-audit-rule-certificate-corrective-actions",
    correctiveEvidenceCaseClosureCertificates: "iss-corrective-evidence-case-closure-certificates",
    correctiveEvidenceCaseClosureVerifications: "iss-corrective-evidence-case-closure-verifications",
    correctiveEvidenceCaseReopenRequests: "iss-corrective-evidence-case-reopen-requests",
    correctiveEvidenceCaseReopenInvestigations: "iss-corrective-evidence-case-reopen-investigations",
    caseClosureRetentionYears: "iss-case-closure-retention-years"
  };

  const read = (key, fallback = []) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const addDaysIso = (base, days) => new Date(new Date(base).getTime() + Number(days || 0) * 86400000).toISOString();
  const org = () => window.ISSOrganization;

  const stableStringify = value => {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  };

  const fnv1a = text => {
    let hash = 0x811c9dc5;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  };

  function defaultOffice() {
    return org()?.getOfficeById("office-kawasaki") || org()?.getOfficeOptions()?.[0] || {
      id: "office-kawasaki",
      name: "川崎事業所",
      blockId: "block-01",
      blockName: "第一ブロック"
    };
  }

  function normalizeOffice(record = {}) {
    const byId = record.officeId ? org()?.getOfficeById(record.officeId) : null;
    const byName = record.office ? org()?.getOfficeByName(record.office) : null;
    const current = byId || byName || defaultOffice();
    return {
      officeId: current.id,
      office: current.name,
      blockId: current.blockId || "block-01",
      blockName: current.blockName || "第一ブロック"
    };
  }

  const getNumberSetting = (key, fallback, min = 1, max = 100000) => {
    const raw = Number(localStorage.getItem(key));
    return Number.isFinite(raw) ? Math.min(max, Math.max(min, Math.round(raw))) : fallback;
  };

  const estimateDataUrlBytes = dataUrl => {
    const value = String(dataUrl || "");
    const comma = value.indexOf(",");
    const payload = comma >= 0 ? value.slice(comma + 1) : value;
    return Math.ceil(payload.length * 0.75);
  };

  const enqueueSync = (entity, action, payload) => {
    const mode = localStorage.getItem(KEYS.operationMode) || "offline";
    if (mode === "offline") return;
    const queue = read(KEYS.syncQueue, []);
    queue.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      entity, action, payload, createdAt: nowIso(), status: "pending"
    });
    write(KEYS.syncQueue, queue.slice(-1000));
  };

  const PHOTO_AUDIT_LIMIT = 5000;
  const PHOTO_AUDIT_EXCLUDED_FIELDS = new Set(["dataUrl"]);

  const sanitizePhotoForAudit = record => Object.fromEntries(
    Object.entries(record || {}).filter(([key]) => !PHOTO_AUDIT_EXCLUDED_FIELDS.has(key))
  );

  const appendPhotoAudit = entry => {
    const logs = read(KEYS.photoAuditLogs, []);
    const context = api?.getCurrentContext?.() || {};
    logs.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      occurredAt: nowIso(),
      actor: String(entry.actor || "利用者"),
      action: String(entry.action || "unknown"),
      reason: String(entry.reason || ""),
      photoId: String(entry.photoId || ""),
      applicationId: String(entry.applicationId || ""),
      applicationNumber: String(entry.applicationNumber || ""),
      officeId: String(entry.officeId || context.officeId || ""),
      office: String(entry.office || context.officeName || ""),
      before: sanitizePhotoForAudit(entry.before),
      after: sanitizePhotoForAudit(entry.after)
    });
    write(KEYS.photoAuditLogs, logs.slice(0, PHOTO_AUDIT_LIMIT));
  };

  const api = {
    getUserRole() {
      return localStorage.getItem(KEYS.userRole) || "office-user";
    },

    setUserRole(role) {
      const normalized = ["office-user", "office-admin", "safety-environment-director", "safety-environment-staff", "safety-environment-admin", "guest", "validator"].includes(role) ? role : "office-user";
      localStorage.setItem(KEYS.userRole, normalized);
      return normalized;
    },

    isSafetyEnvironment() {
      return ["safety-environment-director", "safety-environment-staff", "safety-environment-admin"].includes(this.getUserRole());
    },

    isSafetyEnvironmentAdmin() {
      return this.getUserRole() === "safety-environment-admin";
    },

    canWriteOperationalData() {
      return ["office-user", "office-admin", "safety-environment-director", "safety-environment-admin"].includes(this.getUserRole());
    },

    canDeleteOperationalData() {
      return ["office-user", "office-admin", "safety-environment-admin"].includes(this.getUserRole());
    },

    isAdministrator() {
      return this.getUserRole() === "safety-environment-admin";
    },

    isOfficeAdmin() {
      return this.getUserRole() === "office-admin";
    },

    getOfficeId() {
      const stored = localStorage.getItem(KEYS.officeId);
      return org()?.getOfficeById(stored)?.id || defaultOffice().id;
    },

    setOfficeId(id) {
      const office = org()?.getOfficeById(id) || defaultOffice();
      localStorage.setItem(KEYS.officeId, office.id);
      localStorage.setItem(KEYS.officeName, office.name);
      return office.id;
    },

    getOfficeName() {
      return org()?.getOfficeById(this.getOfficeId())?.name || localStorage.getItem(KEYS.officeName) || defaultOffice().name;
    },

    setOfficeName(name) {
      const office = org()?.getOfficeByName(String(name || "").trim());
      if (office) return this.setOfficeId(office.id);
      localStorage.setItem(KEYS.officeName, String(name || "").trim() || defaultOffice().name);
      return this.getOfficeName();
    },

    getCurrentContext() {
      const office = org()?.getOfficeById(this.getOfficeId()) || defaultOffice();
      return {
        role: this.getUserRole(),
        officeId: office.id,
        officeName: office.name,
        blockId: office.blockId || "block-01",
        blockName: office.blockName || "第一ブロック",
        canViewAllOffices: this.isSafetyEnvironment(),
        canManageOffice: this.isSafetyEnvironmentAdmin() || this.isOfficeAdmin()
      };
    },

    getOperationMode() {
      const value = localStorage.getItem(KEYS.operationMode);
      return ["offline", "hybrid", "online"].includes(value) ? value : "offline";
    },
    setOperationMode(mode) {
      const normalized = ["offline", "hybrid", "online"].includes(mode) ? mode : "offline";
      localStorage.setItem(KEYS.operationMode, normalized);
      return normalized;
    },
    getServerEndpoint() { return localStorage.getItem(KEYS.serverEndpoint) || ""; },
    setServerEndpoint(value) {
      const normalized = String(value || "").trim();
      localStorage.setItem(KEYS.serverEndpoint, normalized);
      return normalized;
    },
    getSyncQueue() { return read(KEYS.syncQueue, []); },
    clearCompletedSyncQueue() { write(KEYS.syncQueue, this.getSyncQueue().filter(item => item.status !== "completed")); },
    getPhotoPolicy() {
      return {
        perApplication: getNumberSetting(KEYS.photoLimitPerApplication, 20, 1, 500),
        perOffice: getNumberSetting(KEYS.photoLimitPerOffice, 1000, 1, 50000),
        maxFileSizeMb: getNumberSetting(KEYS.photoMaxFileSizeMb, 8, 1, 100),
        storageLimitMb: getNumberSetting(KEYS.photoStorageLimitMb, 500, 10, 100000),
        retentionDays: getNumberSetting(KEYS.photoRetentionDays, 365, 30, 3650),
        deletedGraceDays: getNumberSetting(KEYS.photoDeletedGraceDays, 30, 1, 365),
        purgeApprovalDays: getNumberSetting(KEYS.photoPurgeApprovalDays, 7, 1, 90),
        purgeExecutionDays: getNumberSetting(KEYS.photoPurgeExecutionDays, 3, 1, 90)
      };
    },
    setPhotoPolicy(policy = {}) {
      const current = this.getPhotoPolicy();
      const next = {
        perApplication: Math.min(500, Math.max(1, Number(policy.perApplication || current.perApplication))),
        perOffice: Math.min(50000, Math.max(1, Number(policy.perOffice || current.perOffice))),
        maxFileSizeMb: Math.min(100, Math.max(1, Number(policy.maxFileSizeMb || current.maxFileSizeMb))),
        storageLimitMb: Math.min(100000, Math.max(10, Number(policy.storageLimitMb || current.storageLimitMb))),
        retentionDays: Math.min(3650, Math.max(30, Number(policy.retentionDays || current.retentionDays))),
        deletedGraceDays: Math.min(365, Math.max(1, Number(policy.deletedGraceDays || current.deletedGraceDays))),
        purgeApprovalDays: Math.min(90, Math.max(1, Number(policy.purgeApprovalDays || current.purgeApprovalDays))),
        purgeExecutionDays: Math.min(90, Math.max(1, Number(policy.purgeExecutionDays || current.purgeExecutionDays)))
      };
      localStorage.setItem(KEYS.photoLimitPerApplication, String(Math.round(next.perApplication)));
      localStorage.setItem(KEYS.photoLimitPerOffice, String(Math.round(next.perOffice)));
      localStorage.setItem(KEYS.photoMaxFileSizeMb, String(Math.round(next.maxFileSizeMb)));
      localStorage.setItem(KEYS.photoStorageLimitMb, String(Math.round(next.storageLimitMb)));
      localStorage.setItem(KEYS.photoRetentionDays, String(Math.round(next.retentionDays)));
      localStorage.setItem(KEYS.photoDeletedGraceDays, String(Math.round(next.deletedGraceDays)));
      localStorage.setItem(KEYS.photoPurgeApprovalDays, String(Math.round(next.purgeApprovalDays)));
      localStorage.setItem(KEYS.photoPurgeExecutionDays, String(Math.round(next.purgeExecutionDays)));
      return this.getPhotoPolicy();
    },
    getPhotoUsage(officeId = this.getOfficeId()) {
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const scoped = photos.filter(item => item.officeId === officeId && item.status !== "deleted");
      const bytes = scoped.reduce((sum, item) => sum + Number(item.fileSize || estimateDataUrlBytes(item.dataUrl)), 0);
      return { count: scoped.length, bytes, megabytes: bytes / 1024 / 1024 };
    },

    getApplicationPhotoUsage(applicationId) {
      const normalizedId = String(applicationId || "");
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const scoped = photos.filter(item => item.applicationId === normalizedId && item.status !== "deleted");
      const bytes = scoped.reduce((sum, item) => sum + Number(item.fileSize || estimateDataUrlBytes(item.dataUrl)), 0);
      return { count: scoped.length, bytes, megabytes: bytes / 1024 / 1024 };
    },

    findDuplicatePhoto(criteria = {}) {
      const applicationId = String(criteria.applicationId || "");
      const fingerprint = String(criteria.fingerprint || "").trim();
      const fileName = String(criteria.fileName || "").trim();
      const originalFileSize = Number(criteria.originalFileSize || 0);
      const photos = this.getPhotos({ scope: "all" });
      return photos.find(item => {
        if (item.status === "deleted") return false;
        if (applicationId && item.applicationId !== applicationId) return false;
        if (fingerprint && item.fingerprint && item.fingerprint === fingerprint) return true;
        if (!fingerprint && fileName && originalFileSize) {
          return item.fileName === fileName && Number(item.originalFileSize || 0) === originalFileSize;
        }
        return false;
      }) || null;
    },

    getFavorites() { return read(KEYS.favorites, []); },
    isFavorite(unNumber) { return this.getFavorites().some(item => item.unNumber === unNumber); },
    toggleFavorite(record) {
      const favorites = this.getFavorites();
      const index = favorites.findIndex(item => item.unNumber === record.unNumber);
      if (index >= 0) {
        favorites.splice(index, 1);
        write(KEYS.favorites, favorites);
        return false;
      }
      const context = this.getCurrentContext();
      favorites.unshift({
        unNumber: record.unNumber,
        properShippingName: record.properShippingName || "",
        properShippingNameJa: record.properShippingNameJa || "",
        officeId: context.officeId,
        office: context.officeName,
        blockId: context.blockId,
        blockName: context.blockName,
        note: "",
        createdAt: nowIso()
      });
      write(KEYS.favorites, favorites);
      return true;
    },
    updateFavoriteNote(unNumber, note) {
      const favorites = this.getFavorites();
      const target = favorites.find(item => item.unNumber === unNumber);
      if (!target) return false;
      target.note = String(note || "").trim();
      write(KEYS.favorites, favorites);
      return true;
    },
    removeFavorite(unNumber) { write(KEYS.favorites, this.getFavorites().filter(item => item.unNumber !== unNumber)); },

    addSearchHistory(entry) {
      const history = this.getSearchHistory();
      const context = this.getCurrentContext();
      history.unshift({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        searchedAt: nowIso(),
        officeId: context.officeId,
        office: context.officeName,
        blockId: context.blockId,
        blockName: context.blockName,
        mode: entry.mode || "all",
        query: entry.query || "",
        conditions: entry.conditions || null,
        resultCount: Number(entry.resultCount || 0),
        openedUnNumber: entry.openedUnNumber || "",
        openedNameJa: entry.openedNameJa || "",
        openedNameEn: entry.openedNameEn || ""
      });
      write(KEYS.searchHistory, history.slice(0, 300));
    },
    getSearchHistory() { return read(KEYS.searchHistory, []); },
    clearSearchHistory() { write(KEYS.searchHistory, []); },
    removeSearchHistory(id) { write(KEYS.searchHistory, this.getSearchHistory().filter(item => item.id !== id)); },

    getApplications(options = {}) {
      const migrated = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      write(KEYS.applications, migrated);
      const scope = options.scope || (this.isSafetyEnvironment() ? "all" : "office");
      const officeId = options.officeId || this.getOfficeId();
      if (scope === "all" && this.isSafetyEnvironment()) return migrated;
      return migrated.filter(item => item.officeId === officeId);
    },

    getAllApplications() {
      return this.isSafetyEnvironment() ? this.getApplications({ scope: "all" }) : this.getApplications();
    },

    addApplication(record) {
      if (!this.canWriteOperationalData()) throw new Error("安全環境室長・安全環境室職員は閲覧専用です。登録・更新は管理者へ依頼してください。");
      const applications = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const applicationNumber = String(record.applicationNumber || "").trim();
      if (!applicationNumber) throw new Error("申請番号は必須です。");

      const requestedOffice = record.officeId ? org()?.getOfficeById(record.officeId) : null;
      const currentOffice = org()?.getOfficeById(this.getOfficeId()) || defaultOffice();
      const office = this.isSafetyEnvironment() && requestedOffice ? requestedOffice : currentOffice;

      if (applications.some(item => item.applicationNumber === applicationNumber && item.officeId === office.id)) {
        throw new Error("同じ事業所に同一の申請番号が既に登録されています。");
      }

      const application = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        applicationNumber,
        shipper: String(record.shipper || "").trim(),
        cargoName: String(record.cargoName || "").trim(),
        officeId: office.id,
        office: office.name,
        blockId: office.blockId || "block-01",
        blockName: office.blockName || "第一ブロック",
        note: String(record.note || "").trim(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
        createdByRole: this.getUserRole(),
        status: ["active", "review", "completed", "archived"].includes(record.status) ? record.status : "active"
      };
      applications.unshift(application);
      write(KEYS.applications, applications);
      enqueueSync("application", "create", application);
      return application;
    },

    updateApplication(id, updates) {
      if (!this.canWriteOperationalData()) throw new Error("安全環境室長・安全環境室職員は閲覧専用です。登録・更新は管理者へ依頼してください。");
      const applications = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = applications.find(item => item.id === id);
      if (!target) return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;

      const nextNumber = String(updates.applicationNumber ?? target.applicationNumber).trim();
      if (!nextNumber) throw new Error("申請番号は必須です。");
      if (applications.some(item => item.id !== id && item.officeId === target.officeId && item.applicationNumber === nextNumber)) {
        throw new Error("同じ事業所に同一の申請番号が既に登録されています。");
      }
      Object.assign(target, {
        applicationNumber: nextNumber,
        shipper: String(updates.shipper ?? target.shipper).trim(),
        cargoName: String(updates.cargoName ?? target.cargoName).trim(),
        note: String(updates.note ?? target.note).trim(),
        status: updates.status ?? target.status,
        updatedAt: nowIso()
      });
      write(KEYS.applications, applications);
      enqueueSync("application", "update", target);
      return true;
    },

    removeApplication(id) {
      if (!this.canDeleteOperationalData()) throw new Error("安全環境室長・安全環境室職員は削除できません。削除は事業所管理者またはシステム管理者へ依頼してください。");
      const existing = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = existing.find(item => item.id === id);
      if (!target) return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;
      write(KEYS.applications, existing.filter(item => item.id !== id));
      enqueueSync("application", "delete", { id, officeId: target.officeId, serverId: target.serverId || null, serverVersion: target.serverVersion || 1 });
      write(KEYS.photos, this.getPhotos({ scope: "all" }).map(photo => photo.applicationId === id ? { ...photo, applicationId: "", applicationNumber: "" } : photo));
      return true;
    },

    getPhotos(options = {}) {
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const includeDeleted = Boolean(options.includeDeleted);
      const visible = includeDeleted ? photos : photos.filter(item => item.status !== "deleted");
      const scope = options.scope || (this.isSafetyEnvironment() ? "all" : "office");
      if (scope === "all" && this.isSafetyEnvironment()) return visible;
      const officeId = options.officeId || this.getOfficeId();
      return visible.filter(item => item.officeId === officeId);
    },

    getPhotoAuditLogs(options = {}) {
      const logs = read(KEYS.photoAuditLogs, []);
      const scope = options.scope || (this.isSafetyEnvironment() ? "all" : "office");
      const officeId = options.officeId || this.getOfficeId();
      const applicationId = String(options.applicationId || "");
      return logs.filter(item => {
        if (scope !== "all" || !this.isSafetyEnvironment()) {
          if (item.officeId !== officeId) return false;
        }
        if (applicationId && item.applicationId !== applicationId) return false;
        return true;
      });
    },

    getPhotoRetentionCandidates(referenceDate = new Date()) {
      const policy = this.getPhotoPolicy();
      const reference = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
      const retentionMs = policy.retentionDays * 24 * 60 * 60 * 1000;
      const graceMs = policy.deletedGraceDays * 24 * 60 * 60 * 1000;
      return this.getPhotos({ includeDeleted: true }).map(photo => {
        const baseDate = new Date(photo.shootingAt || photo.registeredAt || 0);
        const deletedDate = photo.deletedAt ? new Date(photo.deletedAt) : null;
        const protectedPhoto = Boolean(photo.retentionHold);
        let retentionStatus = "active";
        let dueAt = new Date(baseDate.getTime() + retentionMs);
        if (photo.status === "deleted") {
          dueAt = new Date((deletedDate || baseDate).getTime() + graceMs);
          retentionStatus = reference >= dueAt ? "purge-ready" : "deleted-grace";
        } else if (protectedPhoto) {
          retentionStatus = "hold";
        } else if (reference >= dueAt) {
          retentionStatus = "review-due";
        }
        return { ...photo, retentionStatus, retentionDueAt: dueAt.toISOString() };
      });
    },

    setPhotoRetentionHold(id, options = {}) {
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = photos.find(item => item.id === id);
      if (!target) return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;
      const before = { ...target };
      target.retentionHold = Boolean(options.hold);
      target.retentionHoldReason = target.retentionHold ? String(options.reason || "").trim() : "";
      target.retentionHoldBy = String(options.actor || "利用者");
      target.retentionHoldAt = nowIso();
      write(KEYS.photos, photos);
      appendPhotoAudit({ action: target.retentionHold ? "retention-hold" : "retention-release", actor: target.retentionHoldBy, reason: target.retentionHoldReason, photoId: target.id, applicationId: target.applicationId, applicationNumber: target.applicationNumber, officeId: target.officeId, office: target.office, before, after: target });
      enqueueSync("photo", target.retentionHold ? "retention-hold" : "retention-release", target);
      return true;
    },

    getPhotoStorageReport() {
      const policy = this.getPhotoPolicy();
      const candidates = this.getPhotoRetentionCandidates();
      const sum = rows => rows.reduce((total, item) => total + Number(item.fileSize || estimateDataUrlBytes(item.dataUrl)), 0);
      const active = candidates.filter(item => item.status !== "deleted");
      const deleted = candidates.filter(item => item.status === "deleted");
      const purgeReady = candidates.filter(item => item.retentionStatus === "purge-ready");
      const hold = candidates.filter(item => item.retentionStatus === "hold");
      const totalBytes = sum(candidates);
      const limitBytes = policy.storageLimitMb * 1024 * 1024;
      return {
        totalCount: candidates.length,
        totalBytes,
        activeCount: active.length,
        activeBytes: sum(active),
        deletedCount: deleted.length,
        deletedBytes: sum(deleted),
        purgeReadyCount: purgeReady.length,
        purgeReadyBytes: sum(purgeReady),
        holdCount: hold.length,
        holdBytes: sum(hold),
        limitBytes,
        usagePercent: limitBytes > 0 ? Math.min(999, totalBytes / limitBytes * 100) : 0
      };
    },

    getPhotoPurgePlans() {
      const now = Date.now();
      const plans = read(KEYS.photoPurgePlans, []).map(plan => {
        let deadlineState = "none";
        let nextDueAt = "";
        if (plan.status === "pending" && plan.approvalDueAt) {
          nextDueAt = plan.approvalDueAt;
          deadlineState = new Date(plan.approvalDueAt).getTime() < now ? "approval-overdue" : "approval-waiting";
        } else if (plan.status === "approved" && plan.executionDueAt) {
          nextDueAt = plan.executionDueAt;
          deadlineState = new Date(plan.executionDueAt).getTime() < now ? "execution-overdue" : "execution-waiting";
        }
        return { ...plan, deadlineState, nextDueAt };
      });
      if (this.isSafetyEnvironmentAdmin()) return plans;
      const officeId = this.getOfficeId();
      return plans.filter(item => item.officeId === officeId);
    },

    getPhotoPurgeNotifications() {
      const now = Date.now();
      return this.getPhotoPurgePlans()
        .filter(plan => ["pending", "approved"].includes(plan.status))
        .map(plan => {
          const dueAtMs = plan.nextDueAt ? new Date(plan.nextDueAt).getTime() : 0;
          const hoursRemaining = dueAtMs ? Math.round((dueAtMs - now) / 36e5) : null;
          const priority = String(plan.deadlineState || "").includes("overdue")
            ? "critical"
            : plan.escalated
              ? "high"
              : hoursRemaining !== null && hoursRemaining <= 24
                ? "high"
                : "normal";
          return {
            id: plan.id,
            officeId: plan.officeId,
            office: plan.office,
            status: plan.status,
            deadlineState: plan.deadlineState,
            dueAt: plan.nextDueAt,
            assignedApprover: plan.assignedApprover || "",
            createdBy: plan.createdBy || "",
            approvedBy: plan.approvedBy || "",
            photoCount: Number(plan.photoCount || 0),
            totalBytes: Number(plan.totalBytes || 0),
            reason: plan.reason || "",
            escalated: Boolean(plan.escalated),
            priority,
            acknowledgedAt: plan.notificationAcknowledgedAt || "",
            acknowledgedBy: plan.notificationAcknowledgedBy || ""
          };
        })
        .sort((a, b) => {
          const priorityOrder = { critical: 0, high: 1, normal: 2 };
          return (priorityOrder[a.priority] - priorityOrder[b.priority]) || String(a.dueAt || "9999").localeCompare(String(b.dueAt || "9999"));
        });
    },

    acknowledgePhotoPurgeNotification(id, options = {}) {
      const actor = String(options.actor || "").trim();
      if (!actor) throw new Error("確認者を入力してください。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (!["pending", "approved"].includes(plan.status)) throw new Error("未完了の削除計画だけ確認済みにできます。");
      if (!this.isAdministrator() && plan.officeId !== this.getOfficeId()) throw new Error("所属事業所外の通知は確認できません。");
      plan.notificationAcknowledgedBy = actor;
      plan.notificationAcknowledgedAt = nowIso();
      plan.notificationHistory = Array.isArray(plan.notificationHistory) ? plan.notificationHistory : [];
      plan.notificationHistory.push({ action: "acknowledge", actor, at: plan.notificationAcknowledgedAt });
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "acknowledge-notification", plan);
      return plan;
    },

    createPhotoPurgePlan(options = {}) {
      const actor = String(options.createdBy || "").trim();
      const reason = String(options.reason || "").trim();
      const ids = [...new Set((options.photoIds || []).map(String).filter(Boolean))];
      if (!actor) throw new Error("削除計画の作成者を入力してください。");
      if (!reason) throw new Error("完全削除計画の理由は必須です。");
      if (!ids.length) throw new Error("完全削除候補を1件以上選択してください。");
      const candidates = this.getPhotoRetentionCandidates();
      const selected = ids.map(id => candidates.find(item => item.id === id));
      if (selected.some(item => !item)) throw new Error("対象写真の一部が見つかりません。");
      if (selected.some(item => item.retentionStatus !== "purge-ready" || item.retentionHold)) throw new Error("完全削除候補かつ保全指定されていない写真だけを選択してください。");
      const officeIds = [...new Set(selected.map(item => item.officeId))];
      if (officeIds.length !== 1) throw new Error("1件の削除計画には同一事業所の写真だけを含めてください。");
      if (!this.isSafetyEnvironmentAdmin() && officeIds[0] !== this.getOfficeId()) throw new Error("所属事業所外の写真は削除計画に含められません。");
      const plans = read(KEYS.photoPurgePlans, []);
      const existingPhotoIds = new Set(plans.filter(plan => ["pending", "approved"].includes(plan.status)).flatMap(plan => plan.photoIds || []));
      if (ids.some(id => existingPhotoIds.has(id))) throw new Error("選択した写真の一部は既に未完了の削除計画に含まれています。");
      const totalBytes = selected.reduce((sum, item) => sum + Number(item.fileSize || estimateDataUrlBytes(item.dataUrl)), 0);
      const context = this.getCurrentContext();
      const policy = this.getPhotoPolicy();
      const createdAt = new Date();
      const approvalDueAt = new Date(createdAt.getTime() + policy.purgeApprovalDays * 24 * 60 * 60 * 1000).toISOString();
      const plan = {
        id: `purge-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        status: "pending",
        officeId: officeIds[0],
        office: selected[0].office || context.officeName,
        photoIds: ids,
        photoCount: ids.length,
        totalBytes,
        applications: [...new Set(selected.map(item => item.applicationNumber).filter(Boolean))],
        reason,
        assignedApprover: String(options.assignedApprover || "").trim(),
        assignmentHistory: [],
        escalated: false,
        escalatedBy: "",
        escalatedAt: "",
        escalationReason: "",
        createdBy: actor,
        createdAt: createdAt.toISOString(),
        approvalDueAt,
        approvedBy: "",
        approvedAt: "",
        executionDueAt: "",
        executedBy: "",
        executedAt: ""
      };
      plans.unshift(plan);
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "create", plan);
      return plan;
    },

    reassignPhotoPurgePlan(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("担当者の再割当は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "").trim();
      const assignee = String(options.assignedApprover || "").trim();
      const reason = String(options.reason || "").trim();
      if (!actor) throw new Error("再割当の実行者を入力してください。");
      if (!assignee) throw new Error("新しい担当者を入力してください。");
      if (!reason) throw new Error("再割当理由は必須です。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (!['pending', 'approved'].includes(plan.status)) throw new Error("未完了の削除計画だけ再割当できます。");
      if (!this.isAdministrator() && plan.officeId !== this.getOfficeId()) throw new Error("所属事業所外の削除計画は再割当できません。");
      const before = String(plan.assignedApprover || "");
      plan.assignedApprover = assignee;
      plan.assignmentHistory = Array.isArray(plan.assignmentHistory) ? plan.assignmentHistory : [];
      plan.assignmentHistory.push({ from: before, to: assignee, actor, reason, at: nowIso() });
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "reassign", plan);
      return plan;
    },

    escalatePhotoPurgePlan(id, options = {}) {
      if (!this.isAdministrator()) throw new Error("管理者へのエスカレーションは管理者のみ確定できます。");
      const actor = String(options.actor || "").trim();
      const reason = String(options.reason || "").trim();
      if (!actor) throw new Error("実行者を入力してください。");
      if (!reason) throw new Error("エスカレーション理由は必須です。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (!['pending', 'approved'].includes(plan.status)) throw new Error("未完了の削除計画だけエスカレーションできます。");
      if (!String(plan.deadlineState || "").includes("overdue")) throw new Error("期限超過した削除計画だけエスカレーションできます。");
      const before = String(plan.assignedApprover || "");
      plan.assignedApprover = "管理者";
      plan.escalated = true;
      plan.escalatedBy = actor;
      plan.escalatedAt = nowIso();
      plan.escalationReason = reason;
      plan.assignmentHistory = Array.isArray(plan.assignmentHistory) ? plan.assignmentHistory : [];
      plan.assignmentHistory.push({ from: before, to: "管理者", actor, reason: `エスカレーション：${reason}`, at: plan.escalatedAt });
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "escalate", plan);
      return plan;
    },

    approvePhotoPurgePlan(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("削除計画の承認は事業所管理者または管理者のみ実行できます。");
      const approver = String(options.approvedBy || "").trim();
      if (!approver) throw new Error("承認者を入力してください。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (plan.status !== "pending") throw new Error("承認待ちの削除計画ではありません。");
      if (approver === plan.createdBy) throw new Error("削除計画の作成者は承認者になれません。");
      if (!this.isSafetyEnvironmentAdmin() && plan.officeId !== this.getOfficeId()) throw new Error("所属事業所外の削除計画は承認できません。");
      plan.status = "approved";
      plan.approvedBy = approver;
      plan.approvedAt = nowIso();
      const policy = this.getPhotoPolicy();
      plan.executionDueAt = new Date(Date.now() + policy.purgeExecutionDays * 24 * 60 * 60 * 1000).toISOString();
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "approve", plan);
      return plan;
    },

    cancelPhotoPurgePlan(id, options = {}) {
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      if (!reason) throw new Error("取消理由は必須です。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (!["pending", "approved"].includes(plan.status)) throw new Error("この削除計画は取り消せません。");
      if (!this.isSafetyEnvironmentAdmin() && plan.officeId !== this.getOfficeId()) throw new Error("所属事業所外の削除計画は取り消せません。");
      plan.status = "cancelled";
      plan.cancelledBy = actor;
      plan.cancelledAt = nowIso();
      plan.cancelReason = reason;
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "cancel", plan);
      return plan;
    },



    getPhotoPurgeCorrectiveActions(options = {}) {
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      if (options.scope === "all" && this.isAdministrator()) return actions;
      const officeId = options.officeId || this.getOfficeId();
      return actions.filter(item => !item.officeId || item.officeId === officeId);
    },

    getPhotoPurgeCorrectiveActionByIssueKey(issueKey) {
      return this.getPhotoPurgeCorrectiveActions({ scope: this.isAdministrator() ? "all" : "office" })
        .find(item => item.issueKey === String(issueKey || "")) || null;
    },

    createPhotoPurgeCorrectiveAction(options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の登録は事業所管理者または管理者のみ実行できます。");
      const issueKey = String(options.issueKey || "").trim();
      const issueType = String(options.issueType || "").trim();
      const cause = String(options.cause || "").trim();
      const correctiveAction = String(options.correctiveAction || "").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const createdBy = String(options.createdBy || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      if (!issueKey || !issueType) throw new Error("要確認事項を特定できません。");
      if (!cause) throw new Error("原因を入力してください。");
      if (!correctiveAction) throw new Error("是正内容を入力してください。");
      if (!assignedTo) throw new Error("対応担当者を入力してください。");
      if (!createdBy) throw new Error("登録者を入力してください。");
      if (!dueAt) throw new Error("対応期限を入力してください。");
      const officeId = String(options.officeId || this.getOfficeId());
      if (!this.isAdministrator() && officeId !== this.getOfficeId()) throw new Error("所属事業所外の是正処置は登録できません。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      if (actions.some(item => item.issueKey === issueKey && item.status !== "cancelled")) throw new Error("この要確認事項には既に是正処置が登録されています。");
      const action = {
        id: `corrective-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        issueKey,
        issueType,
        certificateId: String(options.certificateId || ""),
        planId: String(options.planId || ""),
        targetMonth: String(options.targetMonth || ""),
        officeId,
        office: String(options.office || this.getOfficeName()),
        issueMessage: String(options.issueMessage || ""),
        cause,
        correctiveAction,
        assignedTo,
        dueAt: new Date(dueAt).toISOString(),
        status: "open",
        createdBy,
        createdAt: nowIso(),
        updatedBy: createdBy,
        updatedAt: nowIso(),
        completedBy: "",
        completedAt: "",
        completionNote: "",
        verifiedBy: "",
        verifiedAt: "",
        verificationNote: "",
        escalationLevel: "none",
        escalatedBy: "",
        escalatedAt: "",
        escalationReason: "",
        rootCauseCategory: "unclassified",
        recurrencePrevention: "",
        preventionOwner: "",
        effectivenessDueAt: "",
        effectivenessStatus: "not-planned",
        effectivenessVerifiedBy: "",
        effectivenessVerifiedAt: "",
        effectivenessNote: "",
        horizontalDeployments: [],
        evidenceAttachments: [],
        history: [{ action: "create", actor: createdBy, at: nowIso(), note: correctiveAction }]
      };
      actions.unshift(action);
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "create", action);
      return action;
    },

    updatePhotoPurgeCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の更新は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の是正処置は更新できません。");
      const actor = String(options.actor || "").trim();
      if (!actor) throw new Error("更新者を入力してください。");
      ["cause", "correctiveAction", "assignedTo"].forEach(key => {
        if (options[key] !== undefined) action[key] = String(options[key] || "").trim();
      });
      if (options.dueAt) action.dueAt = new Date(options.dueAt).toISOString();
      action.updatedBy = actor;
      action.updatedAt = nowIso();
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "update", actor, at: action.updatedAt, note: String(options.note || "内容を更新") });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "update", action);
      return action;
    },

    completePhotoPurgeCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の完了登録は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("完了者と対応結果を入力してください。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の是正処置は完了登録できません。");
      if (action.status !== "open") throw new Error("対応中の是正処置ではありません。");
      action.status = "completed-awaiting-verification";
      action.completedBy = actor;
      action.completedAt = nowIso();
      action.completionNote = note;
      action.updatedBy = actor;
      action.updatedAt = action.completedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "complete", actor, at: action.completedAt, note });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "complete", action);
      return action;
    },

    escalatePhotoPurgeCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置のエスカレーションは事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "").trim();
      const reason = String(options.reason || "").trim();
      if (!actor || !reason) throw new Error("実行者とエスカレーション理由を入力してください。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の是正処置は操作できません。");
      if (action.status === "closed") throw new Error("完了済みの是正処置はエスカレーションできません。");
      action.escalationLevel = "administrator";
      action.escalatedBy = actor;
      action.escalatedAt = nowIso();
      action.escalationReason = reason;
      action.updatedBy = actor;
      action.updatedAt = action.escalatedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "escalate", actor, at: action.escalatedAt, note: reason });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "escalate", action);
      return action;
    },

    verifyPhotoPurgeCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の完了確認は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("確認者と確認内容を入力してください。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の是正処置は確認できません。");
      if (action.status !== "completed-awaiting-verification") throw new Error("完了確認待ちの是正処置ではありません。");
      if (actor === action.completedBy) throw new Error("対応完了者本人は完了確認者になれません。");
      const implementationEvidence = (action.evidenceAttachments || []).filter(item => item.status === "reviewed" && item.category === "implementation" && item.isCurrent !== false && item.originalVerified === true);
      if (!implementationEvidence.length) throw new Error("確認済み・原本性確認済みの現行版実施証拠資料を1件以上登録してください。");
      action.status = "closed";
      action.verifiedBy = actor;
      action.verifiedAt = nowIso();
      action.verificationNote = note;
      action.updatedBy = actor;
      action.updatedAt = action.verifiedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "verify", actor, at: action.verifiedAt, note });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "verify", action);
      return action;
    },


    updatePhotoPurgePreventionPlan(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再発防止計画の更新は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の再発防止計画は更新できません。");
      const actor = String(options.actor || "").trim();
      const recurrencePrevention = String(options.recurrencePrevention || "").trim();
      const preventionOwner = String(options.preventionOwner || "").trim();
      const effectivenessDueAt = String(options.effectivenessDueAt || "").trim();
      if (!actor || !recurrencePrevention || !preventionOwner || !effectivenessDueAt) throw new Error("更新者、再発防止策、責任者、効果確認期限は必須です。");
      action.rootCauseCategory = String(options.rootCauseCategory || "other");
      action.recurrencePrevention = recurrencePrevention;
      action.preventionOwner = preventionOwner;
      action.effectivenessDueAt = new Date(effectivenessDueAt).toISOString();
      action.effectivenessStatus = "planned";
      action.updatedBy = actor;
      action.updatedAt = nowIso();
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "prevention-plan", actor, at: action.updatedAt, note: recurrencePrevention });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "prevention-plan", action);
      return action;
    },

    addPhotoPurgeHorizontalDeployment(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("横展開の登録は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const targetOffice = String(options.targetOffice || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !targetOffice || !note) throw new Error("登録者、展開先、展開内容は必須です。");
      action.horizontalDeployments = Array.isArray(action.horizontalDeployments) ? action.horizontalDeployments : [];
      action.horizontalDeployments.push({ id: `deployment-${Date.now()}-${Math.random().toString(16).slice(2)}`, targetOffice, note, status: "shared", sharedBy: actor, sharedAt: nowIso() });
      action.updatedBy = actor;
      action.updatedAt = nowIso();
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "horizontal-deployment", actor, at: action.updatedAt, note: `${targetOffice}: ${note}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "horizontal-deployment", action);
      return action;
    },



    addPhotoPurgeCorrectiveEvidence(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("証拠資料の登録は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は登録できません。");
      const actor = String(options.actor || "").trim();
      const category = String(options.category || "").trim();
      const title = String(options.title || "").trim();
      const fileName = String(options.fileName || "").trim();
      const mimeType = String(options.mimeType || "application/octet-stream").trim();
      const fileSize = Number(options.fileSize || 0);
      const dataUrl = String(options.dataUrl || "");
      const fingerprint = String(options.fingerprint || "");
      if (!actor || !title || !fileName || !dataUrl) throw new Error("登録者、資料名、ファイルは必須です。");
      if (!["implementation", "effectiveness", "horizontal-deployment", "other"].includes(category)) throw new Error("証拠資料の区分が不正です。");
      if (fileSize <= 0 || fileSize > 5 * 1024 * 1024) throw new Error("証拠資料は1ファイル5MB以下にしてください。");
      action.evidenceAttachments = Array.isArray(action.evidenceAttachments) ? action.evidenceAttachments : [];
      if (action.evidenceAttachments.filter(item => item.status !== "removed" && item.isCurrent !== false).length >= 10) throw new Error("1件の是正処置に登録できる証拠資料は10件までです。");
      if (fingerprint && action.evidenceAttachments.some(item => item.status !== "removed" && item.fingerprint === fingerprint)) throw new Error("同じ証拠資料が既に登録されています。");
      const evidence = {
        id: `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        category,
        title,
        note: String(options.note || "").trim(),
        fileName,
        mimeType,
        fileSize,
        fingerprint,
        dataUrl,
        version: 1,
        isCurrent: true,
        previousEvidenceId: "",
        replacedByEvidenceId: "",
        replacementReason: "",
        originalVerified: false,
        originalVerifiedBy: "",
        originalVerifiedAt: "",
        originalVerificationNote: "",
        accessLevel: String(options.accessLevel || "office"),
        downloadRestricted: Boolean(options.downloadRestricted),
        status: "pending-review",
        uploadedBy: actor,
        uploadedAt: nowIso(),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: ""
      };
      action.evidenceAttachments.push(evidence);
      action.updatedBy = actor;
      action.updatedAt = evidence.uploadedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-upload", actor, at: evidence.uploadedAt, note: `${category}: ${title}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-upload", { actionId: action.id, evidence: { ...evidence, dataUrl: evidence.dataUrl } });
      return evidence;
    },

    canAccessPhotoPurgeCorrectiveEvidence(action, evidence) {
      if (!action || !evidence || evidence.status === "removed") return false;
      if (this.isAdministrator()) return true;
      if (action.officeId !== this.getOfficeId()) return false;
      if (evidence.accessLevel === "administrator") return false;
      if (evidence.accessLevel === "office-admin") return this.isOfficeAdmin();
      return true;
    },

    recordCorrectiveEvidenceAccess(actionId, evidenceId, options = {}) {
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === actionId);
      const evidence = action?.evidenceAttachments?.find(item => item.id === evidenceId);
      if (!action || !evidence) throw new Error("証拠資料が見つかりません。");
      const operation = String(options.operation || "view");
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      const allowed = this.canAccessPhotoPurgeCorrectiveEvidence(action, evidence);
      const logs = read(KEYS.correctiveEvidenceAccessLogs, []);
      const baseLog = {
        id: `evidence-access-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        actionId,
        evidenceId,
        officeId: action.officeId,
        office: action.office,
        certificateId: action.certificateId || "",
        title: evidence.title || evidence.fileName || "",
        version: Number(evidence.version || 1),
        accessLevel: evidence.accessLevel || "office",
        operation,
        actor,
        role: this.getUserRole(),
        reason,
        accessedAt: nowIso()
      };
      if (!allowed) {
        const denied = { ...baseLog, outcome: "denied", denialReason: "permission" };
        logs.unshift(denied);
        write(KEYS.correctiveEvidenceAccessLogs, logs.slice(0, 5000));
        enqueueSync("corrective-evidence-access", "create", denied);
        throw new Error("この証拠資料を閲覧する権限がありません。");
      }
      if (operation === "download" && evidence.downloadRestricted && !reason) {
        const denied = { ...baseLog, outcome: "denied", denialReason: "reason-required" };
        logs.unshift(denied);
        write(KEYS.correctiveEvidenceAccessLogs, logs.slice(0, 5000));
        enqueueSync("corrective-evidence-access", "create", denied);
        throw new Error("ダウンロード理由を入力してください。");
      }
      const log = { ...baseLog, outcome: "allowed", denialReason: "" };
      logs.unshift(log);
      write(KEYS.correctiveEvidenceAccessLogs, logs.slice(0, 5000));
      enqueueSync("corrective-evidence-access", "create", log);
      return log;
    },

    getCorrectiveEvidenceAccessLogs(options = {}) {
      const scope = options.scope || (this.isAdministrator() ? "all" : "office");
      const logs = read(KEYS.correctiveEvidenceAccessLogs, []);
      if (scope === "all" && this.isAdministrator()) return logs;
      return logs.filter(item => item.officeId === this.getOfficeId());
    },

    getCorrectiveEvidenceAuditRules() {
      const defaults = {
        schemaVersion: "1.0",
        permissionDeniedEnabled: true,
        missingReasonEnabled: true,
        bulkDownloadEnabled: true,
        bulkWindowMinutes: 10,
        bulkMediumThreshold: 5,
        bulkHighThreshold: 10,
        lookbackHours: 24,
        updatedAt: "",
        updatedBy: ""
      };
      const stored = read(KEYS.correctiveEvidenceAuditRules, {});
      return {
        ...defaults,
        ...stored,
        bulkWindowMinutes: Math.min(120, Math.max(1, Number(stored.bulkWindowMinutes || defaults.bulkWindowMinutes))),
        bulkMediumThreshold: Math.min(100, Math.max(2, Number(stored.bulkMediumThreshold || defaults.bulkMediumThreshold))),
        bulkHighThreshold: Math.min(200, Math.max(3, Number(stored.bulkHighThreshold || defaults.bulkHighThreshold))),
        lookbackHours: Math.min(720, Math.max(1, Number(stored.lookbackHours || defaults.lookbackHours)))
      };
    },

    updateCorrectiveEvidenceAuditRules(rules = {}, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査ルールの変更は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      if (!reason) throw new Error("ルール変更理由を入力してください。");
      const current = this.getCorrectiveEvidenceAuditRules();
      const next = {
        schemaVersion: "1.0",
        permissionDeniedEnabled: Boolean(rules.permissionDeniedEnabled),
        missingReasonEnabled: Boolean(rules.missingReasonEnabled),
        bulkDownloadEnabled: Boolean(rules.bulkDownloadEnabled),
        bulkWindowMinutes: Math.min(120, Math.max(1, Number(rules.bulkWindowMinutes || 10))),
        bulkMediumThreshold: Math.min(100, Math.max(2, Number(rules.bulkMediumThreshold || 5))),
        bulkHighThreshold: Math.min(200, Math.max(3, Number(rules.bulkHighThreshold || 10))),
        lookbackHours: Math.min(720, Math.max(1, Number(rules.lookbackHours || 24))),
        updatedAt: nowIso(),
        updatedBy: actor
      };
      if (next.bulkHighThreshold <= next.bulkMediumThreshold) throw new Error("高優先度の件数は中優先度より大きく設定してください。");
      const history = read(KEYS.correctiveEvidenceAuditRuleHistory, []);
      const record = {
        id: `audit-rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        changedAt: next.updatedAt,
        changedBy: actor,
        reason,
        previous: current,
        next
      };
      write(KEYS.correctiveEvidenceAuditRules, next);
      write(KEYS.correctiveEvidenceAuditRuleHistory, [record, ...history].slice(0, 1000));
      enqueueSync("corrective-evidence-audit-rule", "update", record);
      return next;
    },

    getCorrectiveEvidenceAuditRuleHistory() {
      const rows = read(KEYS.correctiveEvidenceAuditRuleHistory, []);
      return this.isAdministrator() ? rows : rows;
    },


    recordCorrectiveEvidenceAuditRuleProposalEvent(proposalId, eventType, options = {}) {
      const events = read(KEYS.correctiveEvidenceAuditRuleProposalEvents, []);
      const proposal = read(KEYS.correctiveEvidenceAuditRuleProposals, []).find(item => item.id === proposalId) || null;
      const event = {
        id: `audit-rule-event-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        schemaVersion: "1.0",
        proposalId: String(proposalId || ""),
        eventType: String(eventType || "unknown"),
        occurredAt: nowIso(),
        actor: String(options.actor || "system"),
        actorRole: this.getUserRole(),
        statusAfter: String(options.statusAfter || proposal?.status || ""),
        reason: String(options.reason || ""),
        details: options.details || {}
      };
      events.unshift(event);
      write(KEYS.correctiveEvidenceAuditRuleProposalEvents, events.slice(0, 5000));
      enqueueSync("corrective-evidence-audit-rule-proposal-event", "create", event);
      return event;
    },

    getCorrectiveEvidenceAuditRuleProposalEvents(options = {}) {
      const proposalId = String(options.proposalId || "");
      const rows = read(KEYS.correctiveEvidenceAuditRuleProposalEvents, []);
      return rows.filter(item => !proposalId || item.proposalId === proposalId)
        .slice().sort((a, b) => String(b.occurredAt || "").localeCompare(String(a.occurredAt || "")));
    },

    createCorrectiveEvidenceAuditRuleApplicationCertificate(proposalId, options = {}) {
      const proposal = read(KEYS.correctiveEvidenceAuditRuleProposals, []).find(item => item.id === proposalId);
      if (!proposal || proposal.status !== "applied") throw new Error("適用済み申請ではないため適用証明を生成できません。");
      const certificates = read(KEYS.correctiveEvidenceAuditRuleApplicationCertificates, []);
      const existing = certificates.find(item => item.proposalId === proposalId);
      if (existing) return existing;
      const body = {
        schemaVersion: "1.0",
        certificateId: `audit-rule-certificate-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        proposalId: proposal.id,
        proposalType: proposal.type || "change",
        reason: proposal.reason || "",
        previousRules: proposal.previousRules || {},
        appliedRules: proposal.candidateRules || {},
        simulationSummary: proposal.simulationSummary || {},
        createdBy: proposal.createdBy || "",
        createdAt: proposal.createdAt || "",
        approvedBy: proposal.approvedBy || "",
        approvedAt: proposal.approvedAt || "",
        appliedBy: proposal.appliedBy || String(options.actor || "system"),
        appliedAt: proposal.appliedAt || nowIso(),
        releaseMode: proposal.releaseMode || "immediate",
        scheduledAt: proposal.scheduledAt || "",
        sourceProposalId: proposal.sourceProposalId || ""
      };
      const certificate = { ...body, verificationHash: stableStringify(body), generatedAt: nowIso() };
      certificates.unshift(certificate);
      write(KEYS.correctiveEvidenceAuditRuleApplicationCertificates, certificates.slice(0, 2000));
      enqueueSync("corrective-evidence-audit-rule-application-certificate", "create", certificate);
      return certificate;
    },

    getCorrectiveEvidenceAuditRuleApplicationCertificates() {
      return read(KEYS.correctiveEvidenceAuditRuleApplicationCertificates, [])
        .slice().sort((a, b) => String(b.appliedAt || "").localeCompare(String(a.appliedAt || "")));
    },

    verifyCorrectiveEvidenceAuditRuleApplicationCertificate(certificate = {}, options = {}) {
      const { verificationHash, generatedAt, ...body } = certificate || {};
      const calculatedHash = stableStringify(body);
      const proposal = read(KEYS.correctiveEvidenceAuditRuleProposals, []).find(item => item.id === certificate.proposalId);
      const events = read(KEYS.correctiveEvidenceAuditRuleProposalEvents, []).filter(item => item.proposalId === certificate.proposalId);
      const currentRules = this.getCorrectiveEvidenceAuditRules();
      const errors = [];
      const warnings = [];
      if (!certificate || typeof certificate !== "object") errors.push("証明書JSONの形式が正しくありません。");
      ["certificateId", "proposalId", "proposalType", "appliedRules", "appliedBy", "appliedAt"].forEach(key => {
        if (certificate?.[key] === undefined || certificate?.[key] === null || certificate?.[key] === "") errors.push(`必須項目 ${key} がありません。`);
      });
      if (!verificationHash || verificationHash !== calculatedHash) errors.push("検証ハッシュが一致しません。");
      if (!proposal) warnings.push("対応する変更申請が端末内にないため、証明書単体で検証しました。");
      else {
        if (proposal.status !== "applied") errors.push("対応する変更申請が適用済みではありません。");
        if (proposal.appliedAt !== certificate.appliedAt) errors.push("適用日時が申請記録と一致しません。");
        if (String(proposal.appliedBy || "") !== String(certificate.appliedBy || "")) errors.push("適用者が申請記録と一致しません。");
        if (stableStringify(proposal.candidateRules || {}) !== stableStringify(certificate.appliedRules || {})) errors.push("適用ルールが申請記録と一致しません。");
        if (!events.some(item => item.eventType === "applied")) errors.push("適用イベントが処理履歴にありません。");
        if (!events.some(item => item.eventType === "approved")) errors.push("承認イベントが処理履歴にありません。");
      }
      if (options.compareCurrentRules && stableStringify(currentRules || {}) !== stableStringify(certificate.appliedRules || {})) {
        warnings.push("現在の監査ルールは、この証明書の適用ルールと異なります。後続の変更適用がある可能性があります。");
      }
      return {
        schemaVersion: "1.0",
        verificationId: `audit-rule-certificate-verification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        certificateId: String(certificate.certificateId || ""),
        proposalId: String(certificate.proposalId || ""),
        valid: errors.length === 0,
        errors,
        warnings,
        calculatedHash,
        registeredHash: String(verificationHash || ""),
        checkedAt: nowIso(),
        checkedBy: String(options.actor || "利用者"),
        source: String(options.source || "ledger")
      };
    },

    recordCorrectiveEvidenceAuditRuleCertificateVerification(certificate = {}, options = {}) {
      const result = this.verifyCorrectiveEvidenceAuditRuleApplicationCertificate(certificate, options);
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateVerifications, []);
      rows.unshift(result);
      write(KEYS.correctiveEvidenceAuditRuleCertificateVerifications, rows.slice(0, 5000));
      enqueueSync("corrective-evidence-audit-rule-certificate-verification", "create", result);
      return result;
    },

    getCorrectiveEvidenceAuditRuleCertificateVerifications(options = {}) {
      const certificateId = String(options.certificateId || "");
      const month = String(options.month || "");
      return read(KEYS.correctiveEvidenceAuditRuleCertificateVerifications, [])
        .filter(item => !certificateId || item.certificateId === certificateId)
        .filter(item => !month || String(item.checkedAt || "").slice(0, 7) === month)
        .slice().sort((a, b) => String(b.checkedAt || "").localeCompare(String(a.checkedAt || "")));
    },

    buildCorrectiveEvidenceAuditRuleCertificateMonthlyReconciliation(month) {
      const targetMonth = String(month || new Date().toISOString().slice(0, 7));
      const certificates = this.getCorrectiveEvidenceAuditRuleApplicationCertificates()
        .filter(item => String(item.appliedAt || "").slice(0, 7) === targetMonth);
      const proposals = this.getCorrectiveEvidenceAuditRuleProposals();
      const rows = certificates.map(certificate => {
        const verification = this.verifyCorrectiveEvidenceAuditRuleApplicationCertificate(certificate, { compareCurrentRules: false, actor: "monthly-reconciliation", source: "monthly" });
        const proposal = proposals.find(item => item.id === certificate.proposalId) || null;
        return {
          certificateId: certificate.certificateId,
          proposalId: certificate.proposalId,
          proposalType: certificate.proposalType,
          appliedAt: certificate.appliedAt,
          appliedBy: certificate.appliedBy,
          valid: verification.valid,
          errors: verification.errors,
          warnings: verification.warnings,
          proposalFound: Boolean(proposal)
        };
      });
      const duplicateCertificateIds = [...new Set(rows.filter((item, index, all) => all.findIndex(row => row.certificateId === item.certificateId) !== index).map(item => item.certificateId))];
      const duplicateProposalIds = [...new Set(rows.filter((item, index, all) => all.findIndex(row => row.proposalId === item.proposalId) !== index).map(item => item.proposalId))];
      const issues = [];
      rows.forEach(item => {
        if (!item.valid) issues.push({ issueKey: `invalid:${item.certificateId}`, type: "verification-invalid", certificateId: item.certificateId, proposalId: item.proposalId, title: "適用証明の検証不合格", details: (item.errors || []).join("／"), appliedAt: item.appliedAt });
        if (!item.proposalFound) issues.push({ issueKey: `proposal-missing:${item.certificateId}`, type: "proposal-missing", certificateId: item.certificateId, proposalId: item.proposalId, title: "対応する変更申請が見つからない", details: "適用証明と変更申請台帳を照合してください。", appliedAt: item.appliedAt });
      });
      duplicateCertificateIds.forEach(id => issues.push({ issueKey: `duplicate-certificate:${id}`, type: "duplicate-certificate-id", certificateId: id, proposalId: "", title: "証明書IDの重複", details: "同一証明書IDの複数登録を確認してください。", appliedAt: "" }));
      duplicateProposalIds.forEach(id => issues.push({ issueKey: `duplicate-proposal:${id}`, type: "duplicate-proposal-id", certificateId: "", proposalId: id, title: "変更申請IDに複数の適用証明", details: "変更申請と証明書の対応関係を確認してください。", appliedAt: "" }));
      return {
        schemaVersion: "1.0",
        reportId: `audit-rule-certificate-monthly-${targetMonth}-${Date.now()}`,
        targetMonth,
        generatedAt: nowIso(),
        generatedBy: "利用者",
        summary: {
          certificates: rows.length,
          valid: rows.filter(item => item.valid).length,
          invalid: rows.filter(item => !item.valid).length,
          proposalMissing: rows.filter(item => !item.proposalFound).length,
          duplicateCertificateIds: duplicateCertificateIds.length,
          duplicateProposalIds: duplicateProposalIds.length
        },
        duplicateCertificateIds,
        duplicateProposalIds,
        records: rows,
        issues
      };
    },

    getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions(options = {}) {
      const status = String(options.status || "all");
      const query = String(options.query || "").trim().toLowerCase();
      return read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, [])
        .filter(item => status === "all" || item.status === status || (status === "active" && item.status !== "closed") || (status === "overdue" && item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < Date.now()))
        .filter(item => !query || [item.certificateId, item.proposalId, item.issueType, item.title, item.cause, item.actionPlan, item.assignedTo].join(" ").toLowerCase().includes(query))
        .slice().sort((a, b) => String(a.dueAt || "").localeCompare(String(b.dueAt || "")));
    },

    createCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(issue = {}, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の登録は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const cause = String(options.cause || "").trim();
      const actionPlan = String(options.actionPlan || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      if (!actor || !assignedTo || !cause || !actionPlan || !dueAt) throw new Error("登録者、担当者、原因、是正内容、対応期限は必須です。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      if (rows.some(item => item.issueKey === issue.issueKey && item.status !== "closed")) throw new Error("同じ要確認事項の未完了是正処置が既にあります。");
      const context = this.getCurrentContext();
      const record = {
        schemaVersion: "1.0",
        id: `audit-rule-certificate-corrective-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        issueKey: String(issue.issueKey || ""),
        issueType: String(issue.type || "other"),
        title: String(issue.title || "要確認事項"),
        details: String(issue.details || ""),
        certificateId: String(issue.certificateId || ""),
        proposalId: String(issue.proposalId || ""),
        targetMonth: String(options.targetMonth || ""),
        officeId: context.officeId,
        office: context.officeName,
        cause,
        actionPlan,
        assignedTo,
        dueAt: new Date(`${dueAt}T23:59:59`).toISOString(),
        status: "open",
        createdBy: actor,
        createdAt: nowIso(),
        completedBy: "",
        completedAt: "",
        completionNote: "",
        verifiedBy: "",
        verifiedAt: "",
        verificationNote: "",
        followUpReevaluationStatus: "not-scheduled",
        followUpReevaluationDueAt: "",
        followUpReevaluationCriteria: "",
        followUpReevaluationScheduledBy: "",
        followUpReevaluationScheduledAt: "",
        followUpReevaluationReviewedBy: "",
        followUpReevaluationReviewedAt: "",
        followUpReevaluationNote: "",
        caseClosureStatus: "not-ready",
        caseClosedBy: "",
        caseClosedAt: "",
        caseClosureNote: ""
      };
      rows.unshift(record);
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows.slice(0, 5000));
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "create", record);
      return record;
    },

    updateFollowUpCorrectiveEvidenceAuditRuleCertificateProgress(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再是正処置の進捗更新は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.issueType !== "effectiveness-insufficient" || target.status !== "open") throw new Error("対応中の再是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const progressPercent = Math.min(100, Math.max(0, Math.round(Number(options.progressPercent || 0))));
      if (!actor || !note) throw new Error("更新者と進捗内容は必須です。");
      const history = Array.isArray(target.progressHistory) ? target.progressHistory : [];
      history.unshift({
        id: `followup-progress-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        progressPercent,
        note,
        updatedBy: actor,
        updatedAt: nowIso()
      });
      Object.assign(target, {
        progressPercent,
        latestProgressNote: note,
        progressUpdatedBy: actor,
        progressUpdatedAt: nowIso(),
        progressHistory: history.slice(0, 200)
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "update-followup-progress", target);
      return target;
    },

    reassignFollowUpCorrectiveEvidenceAuditRuleCertificateAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再是正処置の担当者変更は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.issueType !== "effectiveness-insufficient" || target.status === "closed") throw new Error("再割当可能な再是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const reason = String(options.reason || "").trim();
      if (!actor || !assignedTo || !reason) throw new Error("変更者、新担当者、変更理由は必須です。");
      const history = Array.isArray(target.assignmentHistory) ? target.assignmentHistory : [];
      history.unshift({
        id: `followup-assignment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        previousAssignedTo: target.assignedTo || "",
        assignedTo,
        reason,
        changedBy: actor,
        changedAt: nowIso()
      });
      Object.assign(target, { assignedTo, assignmentHistory: history.slice(0, 200), reassignedBy: actor, reassignedAt: nowIso(), reassignmentReason: reason });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "reassign-followup", target);
      return target;
    },

    completeCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("是正処置の完了登録は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "open") throw new Error("対応中の是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("完了者と対応結果は必須です。");
      Object.assign(target, { status: "pending-verification", completedBy: actor, completedAt: nowIso(), completionNote: note });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "update", target);
      return target;
    },

    verifyCorrectiveEvidenceAuditRuleCertificateCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("完了確認は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "pending-verification") throw new Error("完了確認待ちの是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("確認者と確認結果は必須です。");
      if (actor === target.completedBy) throw new Error("対応完了者本人による自己確認はできません。");
      Object.assign(target, { status: "closed", verifiedBy: actor, verifiedAt: nowIso(), verificationNote: note, progressPercent: target.issueType === "effectiveness-insufficient" ? 100 : target.progressPercent });
      if (target.issueType === "effectiveness-insufficient" && target.parentCorrectiveActionId) {
        const parent = rows.find(item => item.id === target.parentCorrectiveActionId);
        if (parent) {
          parent.followUpResolvedAt = nowIso();
          parent.followUpResolvedBy = actor;
          parent.followUpResolutionNote = note;
        }
      }
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "update", target);
      return target;
    },



    updateCorrectiveEvidenceAuditRuleCertificateRecurrencePrevention(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再発防止策の登録は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target) throw new Error("対象の是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const rootCauseCategory = String(options.rootCauseCategory || "").trim();
      const preventionPlan = String(options.preventionPlan || "").trim();
      const owner = String(options.owner || "").trim();
      const reviewDueAt = String(options.reviewDueAt || "").trim();
      if (!actor || !rootCauseCategory || !preventionPlan || !owner || !reviewDueAt) throw new Error("登録者、原因分類、再発防止策、責任者、レビュー期限は必須です。");
      Object.assign(target, {
        rootCauseCategory,
        preventionPlan,
        preventionOwner: owner,
        preventionReviewDueAt: new Date(`${reviewDueAt}T23:59:59`).toISOString(),
        preventionUpdatedBy: actor,
        preventionUpdatedAt: nowIso(),
        managementReviewStatus: "pending",
        managementReviewedBy: "",
        managementReviewedAt: "",
        managementReviewNote: ""
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "update-prevention", target);
      return target;
    },

    reviewCorrectiveEvidenceAuditRuleCertificateRecurrencePrevention(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("管理者レビューは事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || !target.preventionPlan) throw new Error("再発防止策が登録されていません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const result = options.result === "needs-revision" ? "needs-revision" : "approved";
      if (!actor || !note) throw new Error("レビュー担当者とレビュー結果は必須です。");
      if (actor === target.preventionUpdatedBy) throw new Error("再発防止策の登録者本人による自己レビューはできません。");
      Object.assign(target, {
        managementReviewStatus: result,
        managementReviewedBy: actor,
        managementReviewedAt: nowIso(),
        managementReviewNote: note
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "review-prevention", target);
      return target;
    },

    scheduleCorrectiveEvidenceAuditRuleCertificateEffectivenessReview(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("効果確認の設定は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.managementReviewStatus !== "approved") throw new Error("管理者レビュー承認済みの再発防止策が必要です。");
      const actor = String(options.actor || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      const criteria = String(options.criteria || "").trim();
      if (!actor || !dueAt || !criteria) throw new Error("設定者、効果確認期限、評価基準は必須です。");
      Object.assign(target, {
        effectivenessStatus: "pending",
        effectivenessDueAt: new Date(`${dueAt}T23:59:59`).toISOString(),
        effectivenessCriteria: criteria,
        effectivenessScheduledBy: actor,
        effectivenessScheduledAt: nowIso(),
        effectivenessReviewedBy: "",
        effectivenessReviewedAt: "",
        effectivenessResultNote: "",
        followUpCorrectiveActionRequired: false,
        followUpCorrectiveActionId: ""
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "schedule-effectiveness-review", target);
      return target;
    },

    reviewCorrectiveEvidenceAuditRuleCertificateEffectiveness(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("効果確認は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.effectivenessStatus !== "pending") throw new Error("効果確認待ちの再発防止策が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const result = options.result === "ineffective" ? "ineffective" : "effective";
      if (!actor || !note) throw new Error("確認者と確認結果は必須です。");
      if (actor === target.preventionOwner || actor === target.preventionUpdatedBy) throw new Error("再発防止責任者または登録者本人による自己効果確認はできません。");
      Object.assign(target, {
        effectivenessStatus: result,
        effectivenessReviewedBy: actor,
        effectivenessReviewedAt: nowIso(),
        effectivenessResultNote: note,
        followUpCorrectiveActionRequired: result === "ineffective"
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "review-effectiveness", target);
      return target;
    },

    createFollowUpCorrectiveEvidenceAuditRuleCertificateAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再是正処置の登録は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const source = rows.find(item => item.id === id);
      if (!source || source.effectivenessStatus !== "ineffective") throw new Error("効果不十分と判定された是正処置が必要です。");
      if (source.followUpCorrectiveActionId) {
        const existingFollowUp = rows.find(item => item.id === source.followUpCorrectiveActionId);
        if (existingFollowUp && existingFollowUp.followUpReevaluationStatus !== "recurrence-detected") throw new Error("再是正処置は既に登録されています。");
      }
      const actor = String(options.actor || "").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const cause = String(options.cause || "").trim();
      const actionPlan = String(options.actionPlan || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      if (!actor || !assignedTo || !cause || !actionPlan || !dueAt) throw new Error("登録者、担当者、原因、再是正内容、期限は必須です。");
      const record = {
        schemaVersion: "1.1",
        id: `audit-rule-certificate-corrective-followup-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        issueKey: `${source.issueKey}:followup:${Date.now()}`,
        issueType: "effectiveness-insufficient",
        title: `再是正処置：${source.title || source.certificateId || source.id}`,
        details: `効果確認で不十分と判定された是正処置 ${source.id} の再対応`,
        certificateId: source.certificateId || "",
        proposalId: source.proposalId || "",
        targetMonth: String(source.targetMonth || nowIso().slice(0, 7)),
        officeId: source.officeId,
        office: source.office,
        cause,
        actionPlan,
        assignedTo,
        dueAt: new Date(`${dueAt}T23:59:59`).toISOString(),
        status: "open",
        createdBy: actor,
        createdAt: nowIso(),
        parentCorrectiveActionId: source.id,
        progressPercent: 0,
        latestProgressNote: "",
        progressHistory: [],
        assignmentHistory: [],
        completedBy: "",
        completedAt: "",
        completionNote: "",
        verifiedBy: "",
        verifiedAt: "",
        verificationNote: "",
        followUpReevaluationStatus: "not-scheduled",
        followUpReevaluationDueAt: "",
        followUpReevaluationCriteria: "",
        followUpReevaluationScheduledBy: "",
        followUpReevaluationScheduledAt: "",
        followUpReevaluationReviewedBy: "",
        followUpReevaluationReviewedAt: "",
        followUpReevaluationNote: "",
        caseClosureStatus: "not-ready",
        caseClosedBy: "",
        caseClosedAt: "",
        caseClosureNote: ""
      };
      rows.unshift(record);
      source.followUpCorrectiveActionHistory = Array.isArray(source.followUpCorrectiveActionHistory) ? source.followUpCorrectiveActionHistory : [];
      if (source.followUpCorrectiveActionId) source.followUpCorrectiveActionHistory.unshift(source.followUpCorrectiveActionId);
      source.followUpCorrectiveActionId = record.id;
      source.followUpCorrectiveActionRequired = true;
      source.caseClosureStatus = "blocked";
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows.slice(0, 5000));
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "create-followup", record);
      return record;
    },

    scheduleFollowUpCorrectiveEvidenceAuditRuleCertificateReevaluation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再評価の設定は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.issueType !== "effectiveness-insufficient" || target.status !== "closed") throw new Error("完了確認済みの再是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      const criteria = String(options.criteria || "").trim();
      if (!actor || !dueAt || !criteria) throw new Error("設定者、再評価期限、確認基準は必須です。");
      Object.assign(target, {
        followUpReevaluationStatus: "pending",
        followUpReevaluationDueAt: new Date(`${dueAt}T23:59:59`).toISOString(),
        followUpReevaluationCriteria: criteria,
        followUpReevaluationScheduledBy: actor,
        followUpReevaluationScheduledAt: nowIso(),
        followUpReevaluationReviewedBy: "",
        followUpReevaluationReviewedAt: "",
        followUpReevaluationNote: "",
        caseClosureStatus: "not-ready"
      });
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "schedule-followup-reevaluation", target);
      return target;
    },

    reviewFollowUpCorrectiveEvidenceAuditRuleCertificateReevaluation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再評価は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.followUpReevaluationStatus !== "pending") throw new Error("再評価待ちの再是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const result = options.result === "recurrence-detected" ? "recurrence-detected" : "no-recurrence";
      if (!actor || !note) throw new Error("確認者と再評価結果は必須です。");
      if ([target.completedBy, target.verifiedBy, target.assignedTo].includes(actor)) throw new Error("再是正担当者・完了者・完了確認者による自己再評価はできません。");
      Object.assign(target, {
        followUpReevaluationStatus: result,
        followUpReevaluationReviewedBy: actor,
        followUpReevaluationReviewedAt: nowIso(),
        followUpReevaluationNote: note,
        caseClosureStatus: result === "no-recurrence" ? "pending-approval" : "blocked"
      });
      const parent = target.parentCorrectiveActionId ? rows.find(item => item.id === target.parentCorrectiveActionId) : null;
      if (parent) {
        parent.caseClosureStatus = target.caseClosureStatus;
        parent.followUpReevaluationStatus = result;
        parent.followUpReevaluationReviewedBy = actor;
        parent.followUpReevaluationReviewedAt = target.followUpReevaluationReviewedAt;
        parent.followUpReevaluationNote = note;
        if (result === "recurrence-detected") parent.followUpCorrectiveActionRequired = true;
      }
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "review-followup-reevaluation", target);
      return target;
    },

    closeFollowUpCorrectiveEvidenceAuditRuleCertificateCase(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("案件クローズは事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.followUpReevaluationStatus !== "no-recurrence" || target.caseClosureStatus !== "pending-approval") throw new Error("クローズ承認待ちの再是正処置が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("クローズ承認者と確認内容は必須です。");
      if (actor === target.followUpReevaluationReviewedBy) throw new Error("再評価者本人による自己クローズ承認はできません。");
      Object.assign(target, { caseClosureStatus: "closed", caseClosedBy: actor, caseClosedAt: nowIso(), caseClosureNote: note });
      const parent = target.parentCorrectiveActionId ? rows.find(item => item.id === target.parentCorrectiveActionId) : null;
      if (parent) {
        parent.caseClosureStatus = "closed";
        parent.caseClosedBy = actor;
        parent.caseClosedAt = target.caseClosedAt;
        parent.caseClosureNote = note;
        parent.followUpCorrectiveActionRequired = false;
      }
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
      const certificates = read(KEYS.correctiveEvidenceCaseClosureCertificates, []);
      const existing = certificates.find(item => item.correctiveActionId === target.id);
      if (!existing) {
        const body = {
          schemaVersion: "1.0",
          certificateId: `case-closure-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          correctiveActionId: target.id,
          parentCorrectiveActionId: target.parentCorrectiveActionId || "",
          certificateReferenceId: target.certificateId || "",
          proposalId: target.proposalId || "",
          officeId: target.officeId || this.getOfficeId(),
          office: target.office || this.getOfficeName(),
          title: target.title || "再是正処置案件",
          cause: target.cause || "",
          actionPlan: target.actionPlan || "",
          assignedTo: target.assignedTo || "",
          completedBy: target.completedBy || "",
          completedAt: target.completedAt || "",
          verifiedBy: target.verifiedBy || "",
          verifiedAt: target.verifiedAt || "",
          reevaluationCriteria: target.followUpReevaluationCriteria || "",
          reevaluationResult: target.followUpReevaluationStatus || "",
          reevaluatedBy: target.followUpReevaluationReviewedBy || "",
          reevaluatedAt: target.followUpReevaluationReviewedAt || "",
          reevaluationNote: target.followUpReevaluationNote || "",
          closedBy: actor,
          closedAt: target.caseClosedAt,
          closureNote: note,
          archivedAt: nowIso(),
          status: "archived"
        };
        const certificate = { ...body, verificationHash: fnv1a(stableStringify(body)) };
        certificates.unshift(certificate);
        write(KEYS.correctiveEvidenceCaseClosureCertificates, certificates.slice(0, 5000));
        target.caseClosureCertificateId = certificate.certificateId;
        target.caseClosureCertificateHash = certificate.verificationHash;
        write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, rows);
        enqueueSync("corrective-evidence-case-closure-certificate", "create", certificate);
      }
      enqueueSync("corrective-evidence-audit-rule-certificate-corrective-action", "close-followup-case", target);
      return target;
    },

    getCorrectiveEvidenceCaseClosureCertificates(options = {}) {
      const query = String(options.query || "").trim().toLowerCase();
      const rows = read(KEYS.correctiveEvidenceCaseClosureCertificates, []);
      return rows.filter(item => !query || [item.certificateId, item.correctiveActionId, item.certificateReferenceId, item.proposalId, item.office, item.closedBy, item.title].join(" ").toLowerCase().includes(query));
    },

    verifyCorrectiveEvidenceCaseClosureCertificate(certificate = {}) {
      const clone = { ...certificate };
      const storedHash = String(clone.verificationHash || "");
      delete clone.verificationHash;
      const calculatedHash = fnv1a(stableStringify(clone));
      const action = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []).find(item => item.id === certificate.correctiveActionId);
      const errors = [];
      if (!certificate.certificateId || !certificate.correctiveActionId || !certificate.closedAt) errors.push("必須項目が不足しています。");
      if (storedHash !== calculatedHash) errors.push("検証ハッシュが一致しません。");
      if (action && action.caseClosureStatus !== "closed") errors.push("対応する案件がクローズ状態ではありません。");
      if (action && action.caseClosureCertificateId && action.caseClosureCertificateId !== certificate.certificateId) errors.push("案件に記録された証明書IDと一致しません。");
      return { valid: errors.length === 0, errors, calculatedHash, storedHash, actionFound: Boolean(action) };
    },

    getCaseClosureRetentionYears() {
      const raw = Number(localStorage.getItem(KEYS.caseClosureRetentionYears));
      return Number.isFinite(raw) ? Math.min(30, Math.max(1, Math.round(raw))) : 10;
    },

    setCaseClosureRetentionYears(years) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("保存期間の変更は事業所管理者または管理者のみ実行できます。");
      const value = Math.min(30, Math.max(1, Math.round(Number(years || 10))));
      localStorage.setItem(KEYS.caseClosureRetentionYears, String(value));
      return value;
    },

    recordCaseClosureCertificateVerification(certificateId, actor = "利用者") {
      const certificate = this.getCorrectiveEvidenceCaseClosureCertificates().find(item => item.certificateId === certificateId);
      if (!certificate) throw new Error("案件クローズ証明が見つかりません。");
      const result = this.verifyCorrectiveEvidenceCaseClosureCertificate(certificate);
      const rows = read(KEYS.correctiveEvidenceCaseClosureVerifications, []);
      const record = {
        id: `case-closure-verification-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        certificateId,
        correctiveActionId: certificate.correctiveActionId,
        officeId: certificate.officeId || this.getOfficeId(),
        office: certificate.office || this.getOfficeName(),
        verifiedBy: String(actor || "利用者"),
        verifiedAt: nowIso(),
        result: result.valid ? "passed" : "failed",
        errors: result.errors,
        calculatedHash: result.calculatedHash,
        storedHash: result.storedHash
      };
      rows.unshift(record);
      write(KEYS.correctiveEvidenceCaseClosureVerifications, rows.slice(0, 10000));
      enqueueSync("corrective-evidence-case-closure-verification", "create", record);
      return record;
    },

    getCaseClosureCertificateVerifications(certificateId = "") {
      const rows = read(KEYS.correctiveEvidenceCaseClosureVerifications, []);
      return rows.filter(item => !certificateId || item.certificateId === certificateId);
    },

    createCaseReopenRequest(certificateId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("案件再開申請は事業所管理者または管理者のみ実行できます。");
      const certificate = this.getCorrectiveEvidenceCaseClosureCertificates().find(item => item.certificateId === certificateId);
      if (!certificate) throw new Error("案件クローズ証明が見つかりません。");
      const actor = String(options.actor || "").trim();
      const reason = String(options.reason || "").trim();
      const evidence = String(options.evidence || "").trim();
      if (!actor || !reason) throw new Error("申請者と再開理由は必須です。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenRequests, []);
      if (rows.some(item => item.certificateId === certificateId && ["pending-approval", "approved"].includes(item.status))) throw new Error("同じ案件に未完了の再開申請があります。");
      const request = {
        id: `case-reopen-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        certificateId,
        correctiveActionId: certificate.correctiveActionId,
        officeId: certificate.officeId || this.getOfficeId(),
        office: certificate.office || this.getOfficeName(),
        requestedBy: actor,
        requestedAt: nowIso(),
        reason,
        evidence,
        status: "pending-approval",
        approvedBy: "",
        approvedAt: "",
        approvalNote: ""
      };
      rows.unshift(request);
      write(KEYS.correctiveEvidenceCaseReopenRequests, rows.slice(0, 5000));
      enqueueSync("corrective-evidence-case-reopen-request", "create", request);
      return request;
    },

    getCaseReopenRequests(options = {}) {
      const query = String(options.query || "").trim().toLowerCase();
      return read(KEYS.correctiveEvidenceCaseReopenRequests, []).filter(item => !query || [item.id, item.certificateId, item.correctiveActionId, item.office, item.requestedBy, item.reason, item.status].join(" ").toLowerCase().includes(query));
    },

    approveCaseReopenRequest(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("案件再開の承認は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenRequests, []);
      const request = rows.find(item => item.id === id);
      if (!request || request.status !== "pending-approval") throw new Error("承認待ちの再開申請が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("承認者と承認内容は必須です。");
      if (actor === request.requestedBy) throw new Error("再開申請者本人による自己承認はできません。");
      const actions = read(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, []);
      const target = actions.find(item => item.id === request.correctiveActionId);
      if (!target) throw new Error("対応する是正処置が見つかりません。");
      Object.assign(request, { status: "approved", approvedBy: actor, approvedAt: nowIso(), approvalNote: note });
      Object.assign(target, {
        caseClosureStatus: "reopened",
        reopenedBy: actor,
        reopenedAt: request.approvedAt,
        reopenRequestId: request.id,
        reopenReason: request.reason,
        followUpCorrectiveActionRequired: true
      });
      write(KEYS.correctiveEvidenceCaseReopenRequests, rows);
      write(KEYS.correctiveEvidenceAuditRuleCertificateCorrectiveActions, actions);
      enqueueSync("corrective-evidence-case-reopen-request", "approve", request);
      return request;
    },


    getCaseReopenInvestigations(options = {}) {
      const query = String(options.query || "").trim().toLowerCase();
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      return rows.filter(item => !query || [item.id, item.reopenRequestId, item.certificateId, item.correctiveActionId, item.office, item.assignedTo, item.scope, item.findings, item.additionalAction].join(" ").toLowerCase().includes(query));
    },

    startCaseReopenInvestigation(reopenRequestId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再調査の開始は事業所管理者または管理者のみ実行できます。");
      const request = this.getCaseReopenRequests().find(item => item.id === reopenRequestId && item.status === "approved");
      if (!request) throw new Error("承認済みの案件再開申請が見つかりません。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      if (rows.some(item => item.reopenRequestId === reopenRequestId && !["reclosed", "cancelled"].includes(item.status))) throw new Error("この再開申請には進行中の再調査があります。");
      const actor = String(options.actor || "").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const scope = String(options.scope || "").trim();
      if (!actor || !assignedTo || !scope) throw new Error("開始者、再調査担当者、調査範囲は必須です。");
      const record = {
        id: `case-reinvestigation-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        reopenRequestId: request.id,
        certificateId: request.certificateId,
        previousClosureCertificateId: request.certificateId,
        correctiveActionId: request.correctiveActionId,
        officeId: request.officeId || this.getOfficeId(),
        office: request.office || this.getOfficeName(),
        status: "investigating",
        scope,
        assignedTo,
        dueAt: options.dueAt || addDaysIso(nowIso(), 14),
        progress: 0,
        startedBy: actor,
        startedAt: nowIso(),
        findings: "",
        rootCause: "",
        additionalAction: "",
        history: [{ type: "investigation-started", actor, at: nowIso(), note: scope }]
      };
      rows.unshift(record);
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows.slice(0, 5000));
      enqueueSync("corrective-evidence-case-reopen-investigation", "create", record);
      return record;
    },

    updateCaseReopenInvestigation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再調査の更新は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "investigating") throw new Error("更新可能な再調査が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("更新者と進捗内容は必須です。");
      target.progress = Math.min(100, Math.max(0, Number(options.progress || target.progress || 0)));
      target.findings = String(options.findings ?? target.findings).trim();
      target.updatedBy = actor;
      target.updatedAt = nowIso();
      target.history = [...(target.history || []), { type: "investigation-updated", actor, at: target.updatedAt, note }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "update", target);
      return target;
    },

    submitCaseReopenInvestigation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再調査結果の提出は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "investigating") throw new Error("提出可能な再調査が見つかりません。");
      const actor = String(options.actor || "").trim();
      const findings = String(options.findings || target.findings || "").trim();
      const rootCause = String(options.rootCause || "").trim();
      const additionalAction = String(options.additionalAction || "").trim();
      if (!actor || !findings || !rootCause || !additionalAction) throw new Error("提出者、調査結果、原因、追加是正内容は必須です。");
      Object.assign(target, { status: "pending-review", progress: 100, findings, rootCause, additionalAction, submittedBy: actor, submittedAt: nowIso() });
      target.history = [...(target.history || []), { type: "investigation-submitted", actor, at: target.submittedAt, note: findings }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "submit", target);
      return target;
    },

    reviewCaseReopenInvestigation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再調査結果の承認は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "pending-review") throw new Error("レビュー待ちの再調査が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("承認者と確認内容は必須です。");
      if (actor === target.submittedBy) throw new Error("再調査提出者本人による自己承認はできません。");
      Object.assign(target, { status: "corrective-in-progress", reviewedBy: actor, reviewedAt: nowIso(), reviewNote: note, correctiveAssignedTo: String(options.assignedTo || target.assignedTo), correctiveDueAt: options.dueAt || addDaysIso(nowIso(), 14) });
      target.history = [...(target.history || []), { type: "investigation-approved", actor, at: target.reviewedAt, note }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "approve", target);
      return target;
    },

    completeCaseReopenCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("追加是正の完了登録は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "corrective-in-progress") throw new Error("対応中の追加是正が見つかりません。");
      const actor = String(options.actor || "").trim();
      const result = String(options.result || "").trim();
      if (!actor || !result) throw new Error("完了者と実施結果は必須です。");
      Object.assign(target, { status: "pending-corrective-verification", correctiveCompletedBy: actor, correctiveCompletedAt: nowIso(), correctiveResult: result });
      target.history = [...(target.history || []), { type: "corrective-completed", actor, at: target.correctiveCompletedAt, note: result }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "complete-corrective", target);
      return target;
    },

    verifyCaseReopenCorrectiveAction(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("追加是正の完了確認は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "pending-corrective-verification") throw new Error("完了確認待ちの追加是正が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("確認者と確認結果は必須です。");
      if (actor === target.correctiveCompletedBy) throw new Error("追加是正完了者本人による自己確認はできません。");
      Object.assign(target, { status: "reevaluation-pending", correctiveVerifiedBy: actor, correctiveVerifiedAt: nowIso(), correctiveVerificationNote: note, reevaluationDueAt: options.dueAt || addDaysIso(nowIso(), 30), reevaluationCriteria: String(options.criteria || "同種事象の再発がないこと") });
      target.history = [...(target.history || []), { type: "corrective-verified", actor, at: target.correctiveVerifiedAt, note }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "verify-corrective", target);
      return target;
    },

    reviewCaseReopenReevaluation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再評価は事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "reevaluation-pending") throw new Error("再評価待ち案件が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const result = options.result === "recurrence" ? "recurrence" : "no-recurrence";
      if (!actor || !note) throw new Error("再評価者と評価結果は必須です。");
      if ([target.correctiveCompletedBy, target.correctiveVerifiedBy].includes(actor)) throw new Error("追加是正の完了者・確認者による自己再評価はできません。");
      Object.assign(target, { status: result === "no-recurrence" ? "pending-reclosure" : "corrective-in-progress", reevaluationResult: result, reevaluatedBy: actor, reevaluatedAt: nowIso(), reevaluationNote: note });
      if (result === "recurrence") target.additionalAction = `${target.additionalAction}\n【再評価後の追加対応】${note}`.trim();
      target.history = [...(target.history || []), { type: "reevaluation-reviewed", actor, at: target.reevaluatedAt, note: `${result}: ${note}` }];
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      enqueueSync("corrective-evidence-case-reopen-investigation", "review-reevaluation", target);
      return target;
    },

    recloseCaseReopenInvestigation(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("再クローズは事業所管理者または管理者のみ実行できます。");
      const rows = read(KEYS.correctiveEvidenceCaseReopenInvestigations, []);
      const target = rows.find(item => item.id === id);
      if (!target || target.status !== "pending-reclosure" || target.reevaluationResult !== "no-recurrence") throw new Error("再クローズ承認待ち案件が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("再クローズ承認者と確認内容は必須です。");
      if (actor === target.reevaluatedBy) throw new Error("再評価者本人による自己再クローズ承認はできません。");
      Object.assign(target, { status: "reclosed", reclosedBy: actor, reclosedAt: nowIso(), reclosureNote: note });
      target.history = [...(target.history || []), { type: "case-reclosed", actor, at: target.reclosedAt, note }];
      const certificates = read(KEYS.correctiveEvidenceCaseClosureCertificates, []);
      const body = {
        schemaVersion: "1.1",
        certificateId: `case-reclosure-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        previousCertificateId: target.previousClosureCertificateId,
        reopenRequestId: target.reopenRequestId,
        reinvestigationId: target.id,
        correctiveActionId: target.correctiveActionId,
        officeId: target.officeId,
        office: target.office,
        findings: target.findings,
        rootCause: target.rootCause,
        additionalAction: target.additionalAction,
        correctiveResult: target.correctiveResult,
        reevaluationCriteria: target.reevaluationCriteria,
        reevaluationResult: target.reevaluationResult,
        reevaluatedBy: target.reevaluatedBy,
        reevaluatedAt: target.reevaluatedAt,
        closedBy: actor,
        closedAt: target.reclosedAt,
        closureNote: note,
        archivedAt: nowIso(),
        status: "archived-reclosure"
      };
      const certificate = { ...body, verificationHash: fnv1a(stableStringify(body)) };
      certificates.unshift(certificate);
      target.reclosureCertificateId = certificate.certificateId;
      target.reclosureCertificateHash = certificate.verificationHash;
      write(KEYS.correctiveEvidenceCaseReopenInvestigations, rows);
      write(KEYS.correctiveEvidenceCaseClosureCertificates, certificates.slice(0, 5000));
      const requests = read(KEYS.correctiveEvidenceCaseReopenRequests, []);
      const request = requests.find(item => item.id === target.reopenRequestId);
      if (request) Object.assign(request, { status: "reclosed", reclosedAt: target.reclosedAt, reclosureCertificateId: certificate.certificateId });
      write(KEYS.correctiveEvidenceCaseReopenRequests, requests);
      enqueueSync("corrective-evidence-case-reopen-investigation", "reclose", target);
      enqueueSync("corrective-evidence-case-closure-certificate", "create-reclosure", certificate);
      return { investigation: target, certificate };
    },

    buildCorrectiveEvidenceAuditRuleCertificateCorrectiveTrendReport(targetMonth = new Date().toISOString().slice(0, 7)) {
      const rows = this.getCorrectiveEvidenceAuditRuleCertificateCorrectiveActions({ status: "all" })
        .filter(item => String(item.targetMonth || item.createdAt || "").slice(0, 7) === targetMonth);
      const byCause = {};
      const byIssue = {};
      rows.forEach(item => {
        const cause = item.rootCauseCategory || "未分類";
        const issue = item.issueType || "other";
        byCause[cause] = (byCause[cause] || 0) + 1;
        byIssue[issue] = (byIssue[issue] || 0) + 1;
      });
      const now = Date.now();
      return {
        schemaVersion: "1.0",
        reportId: `audit-rule-certificate-corrective-trend-${targetMonth}-${Date.now()}`,
        targetMonth,
        generatedAt: nowIso(),
        generatedBy: "利用者",
        summary: {
          total: rows.length,
          closed: rows.filter(item => item.status === "closed").length,
          overdue: rows.filter(item => item.status !== "closed" && item.dueAt && new Date(item.dueAt).getTime() < now).length,
          preventionPlanned: rows.filter(item => item.preventionPlan).length,
          reviewPending: rows.filter(item => item.preventionPlan && (!item.managementReviewStatus || item.managementReviewStatus === "pending")).length,
          reviewApproved: rows.filter(item => item.managementReviewStatus === "approved").length,
          needsRevision: rows.filter(item => item.managementReviewStatus === "needs-revision").length,
          effectivenessPending: rows.filter(item => item.effectivenessStatus === "pending").length,
          effectivenessOverdue: rows.filter(item => item.effectivenessStatus === "pending" && item.effectivenessDueAt && new Date(item.effectivenessDueAt).getTime() < now).length,
          effectivenessEffective: rows.filter(item => item.effectivenessStatus === "effective").length,
          effectivenessIneffective: rows.filter(item => item.effectivenessStatus === "ineffective").length,
          followUpRequired: rows.filter(item => item.followUpCorrectiveActionRequired && !item.followUpCorrectiveActionId).length
        },
        byCause,
        byIssue,
        records: rows.map(item => ({
          id: item.id,
          certificateId: item.certificateId,
          proposalId: item.proposalId,
          issueType: item.issueType,
          rootCauseCategory: item.rootCauseCategory || "未分類",
          preventionOwner: item.preventionOwner || "",
          preventionReviewDueAt: item.preventionReviewDueAt || "",
          managementReviewStatus: item.managementReviewStatus || "not-planned",
          status: item.status
        }))
      };
    },

    getCorrectiveEvidenceAuditRuleProposals() {
      const rows = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      return rows.slice().sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
    },

    createCorrectiveEvidenceAuditRuleProposal(rules = {}, simulation = null, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査ルールの申請作成は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      const releaseMode = options.releaseMode === "scheduled" ? "scheduled" : "immediate";
      const scheduledAt = String(options.scheduledAt || "").trim();
      if (!reason) throw new Error("ルール変更理由を入力してください。");
      if (!simulation || !simulation.simulatedAt) throw new Error("変更前にシミュレーションを実行してください。");
      if (releaseMode === "scheduled" && !scheduledAt) throw new Error("予約適用日時を入力してください。");
      if (releaseMode === "scheduled" && new Date(scheduledAt).getTime() <= Date.now()) throw new Error("予約適用日時は現在より後に設定してください。");
      const current = this.getCorrectiveEvidenceAuditRules();
      const candidate = {
        schemaVersion: "1.0",
        permissionDeniedEnabled: Boolean(rules.permissionDeniedEnabled),
        missingReasonEnabled: Boolean(rules.missingReasonEnabled),
        bulkDownloadEnabled: Boolean(rules.bulkDownloadEnabled),
        bulkWindowMinutes: Math.min(120, Math.max(1, Number(rules.bulkWindowMinutes || 10))),
        bulkMediumThreshold: Math.min(100, Math.max(2, Number(rules.bulkMediumThreshold || 5))),
        bulkHighThreshold: Math.min(200, Math.max(3, Number(rules.bulkHighThreshold || 10))),
        lookbackHours: Math.min(720, Math.max(1, Number(rules.lookbackHours || 24)))
      };
      if (candidate.bulkHighThreshold <= candidate.bulkMediumThreshold) throw new Error("高優先度の件数は中優先度より大きく設定してください。");
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = {
        id: `audit-rule-proposal-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        schemaVersion: "1.0",
        status: "pending-approval",
        type: options.type === "rollback" ? "rollback" : "change",
        reason,
        previousRules: current,
        candidateRules: candidate,
        simulationSummary: simulation.summary || {},
        simulationHash: stableStringify({ rules: candidate, summary: simulation.summary || {}, simulatedAt: simulation.simulatedAt }),
        simulatedAt: simulation.simulatedAt,
        createdAt: nowIso(),
        createdBy: actor,
        approvalDueAt: addDaysIso(nowIso(), 7),
        releaseMode,
        scheduledAt: releaseMode === "scheduled" ? new Date(scheduledAt).toISOString() : "",
        approvedAt: "",
        approvedBy: "",
        appliedAt: "",
        appliedBy: "",
        rejectedAt: "",
        rejectedBy: "",
        rejectionReason: "",
        applicationDueAt: "",
        notificationAcknowledgedAt: "",
        notificationAcknowledgedBy: "",
        assignedTo: String(options.assignedTo || "").trim(),
        assignmentHistory: [],
        escalatedToAdministrator: false,
        escalatedAt: "",
        escalatedBy: "",
        escalationReason: "",
        sourceProposalId: String(options.sourceProposalId || "")
      };
      proposals.unshift(proposal);
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals.slice(0, 1000));
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "created", { actor, statusAfter: proposal.status, reason, details: { releaseMode, scheduledAt: proposal.scheduledAt } });
      enqueueSync("corrective-evidence-audit-rule-proposal", "create", proposal);
      return proposal;
    },

    approveCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査ルールの承認は事業所管理者または管理者のみ実行できます。");
      const approver = String(options.approver || "利用者").trim();
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal) throw new Error("対象の監査ルール申請が見つかりません。");
      if (proposal.status !== "pending-approval") throw new Error("承認待ちの申請ではありません。");
      if (proposal.createdBy === approver) throw new Error("申請作成者本人は承認できません。");
      proposal.approvedAt = nowIso();
      proposal.approvedBy = approver;
      proposal.applicationDueAt = proposal.releaseMode === "scheduled"
        ? addDaysIso(proposal.scheduledAt, 1)
        : addDaysIso(proposal.approvedAt, 1);
      proposal.notificationAcknowledgedAt = "";
      proposal.notificationAcknowledgedBy = "";
      proposal.status = proposal.releaseMode === "scheduled" ? "approved-scheduled" : "approved";
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "approved", { actor: approver, statusAfter: proposal.status, details: { applicationDueAt: proposal.applicationDueAt } });
      if (proposal.releaseMode === "immediate") this.applyCorrectiveEvidenceAuditRuleProposal(proposal.id, { actor: approver, internalApproval: true });
      enqueueSync("corrective-evidence-audit-rule-proposal", "approve", proposal);
      return proposal;
    },

    applyCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator()) && !options.internalApproval) throw new Error("監査ルールの適用は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal) throw new Error("対象の監査ルール申請が見つかりません。");
      if (!["approved", "approved-scheduled"].includes(proposal.status)) throw new Error("承認済みの申請ではありません。");
      if (proposal.releaseMode === "scheduled" && new Date(proposal.scheduledAt).getTime() > Date.now() && !options.force) throw new Error("予約適用日時前です。");
      const next = { ...proposal.candidateRules, updatedAt: nowIso(), updatedBy: actor };
      const history = read(KEYS.correctiveEvidenceAuditRuleHistory, []);
      const record = {
        id: `audit-rule-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        changedAt: next.updatedAt,
        changedBy: actor,
        reason: proposal.reason,
        previous: this.getCorrectiveEvidenceAuditRules(),
        next,
        proposalId: proposal.id,
        approvedBy: proposal.approvedBy,
        approvedAt: proposal.approvedAt
      };
      write(KEYS.correctiveEvidenceAuditRules, next);
      write(KEYS.correctiveEvidenceAuditRuleHistory, [record, ...history].slice(0, 1000));
      proposal.status = "applied";
      proposal.appliedAt = next.updatedAt;
      proposal.appliedBy = actor;
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "applied", { actor, statusAfter: proposal.status, details: { appliedRules: proposal.candidateRules } });
      this.createCorrectiveEvidenceAuditRuleApplicationCertificate(proposal.id, { actor });
      enqueueSync("corrective-evidence-audit-rule-proposal", "apply", proposal);
      return proposal;
    },

    applyDueCorrectiveEvidenceAuditRuleProposals(options = {}) {
      const actor = String(options.actor || "system");
      const due = read(KEYS.correctiveEvidenceAuditRuleProposals, []).filter(item => item.status === "approved-scheduled" && item.scheduledAt && new Date(item.scheduledAt).getTime() <= Date.now());
      return due.map(item => this.applyCorrectiveEvidenceAuditRuleProposal(item.id, { actor, force: true, internalApproval: true }));
    },

    rejectCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査ルール申請の差戻しは事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      if (!reason) throw new Error("差戻し理由を入力してください。");
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal || !["pending-approval", "approved-scheduled"].includes(proposal.status)) throw new Error("差戻し可能な申請ではありません。");
      proposal.status = "rejected";
      proposal.rejectedAt = nowIso();
      proposal.rejectedBy = actor;
      proposal.rejectionReason = reason;
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "rejected", { actor, statusAfter: proposal.status, reason });
      enqueueSync("corrective-evidence-audit-rule-proposal", "reject", proposal);
      return proposal;
    },

    getCorrectiveEvidenceAuditRuleProposalDashboard() {
      const now = Date.now();
      const rows = this.getCorrectiveEvidenceAuditRuleProposals();
      const isApprovalOverdue = item => item.status === "pending-approval" && item.approvalDueAt && new Date(item.approvalDueAt).getTime() < now;
      const isApplicationOverdue = item => ["approved", "approved-scheduled"].includes(item.status) && item.applicationDueAt && new Date(item.applicationDueAt).getTime() < now;
      return {
        total: rows.length,
        pendingApproval: rows.filter(item => item.status === "pending-approval").length,
        scheduled: rows.filter(item => item.status === "approved-scheduled").length,
        approvalOverdue: rows.filter(isApprovalOverdue).length,
        applicationOverdue: rows.filter(isApplicationOverdue).length,
        unacknowledged: rows.filter(item => ["pending-approval", "approved", "approved-scheduled"].includes(item.status) && !item.notificationAcknowledgedAt).length,
        escalated: rows.filter(item => item.escalatedToAdministrator && ["pending-approval", "approved", "approved-scheduled"].includes(item.status)).length
      };
    },

    acknowledgeCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("通知確認は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal) throw new Error("対象の監査ルール申請が見つかりません。");
      proposal.notificationAcknowledgedAt = nowIso();
      proposal.notificationAcknowledgedBy = actor;
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "notification-acknowledged", { actor, statusAfter: proposal.status });
      enqueueSync("corrective-evidence-audit-rule-proposal", "acknowledge", proposal);
      return proposal;
    },



    reassignCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("担当者再割当は事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const assignedTo = String(options.assignedTo || "").trim();
      const reason = String(options.reason || "").trim();
      if (!assignedTo) throw new Error("新しい担当者を入力してください。");
      if (!reason) throw new Error("再割当理由を入力してください。");
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal) throw new Error("対象の監査ルール申請が見つかりません。");
      if (!["pending-approval", "approved", "approved-scheduled"].includes(proposal.status)) throw new Error("担当者を再割当できる状態ではありません。");
      const previous = String(proposal.assignedTo || "");
      proposal.assignedTo = assignedTo;
      proposal.assignmentHistory = Array.isArray(proposal.assignmentHistory) ? proposal.assignmentHistory : [];
      proposal.assignmentHistory.push({ previousAssignedTo: previous, assignedTo, changedAt: nowIso(), changedBy: actor, reason });
      proposal.notificationAcknowledgedAt = "";
      proposal.notificationAcknowledgedBy = "";
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "reassigned", { actor, statusAfter: proposal.status, reason, details: { previousAssignedTo: previous, assignedTo } });
      enqueueSync("corrective-evidence-audit-rule-proposal", "reassign", proposal);
      return proposal;
    },

    escalateCorrectiveEvidenceAuditRuleProposal(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("管理者引継ぎは事業所管理者または管理者のみ実行できます。");
      const actor = String(options.actor || "利用者").trim();
      const reason = String(options.reason || "").trim();
      if (!reason) throw new Error("管理者への引継ぎ理由を入力してください。");
      const proposals = read(KEYS.correctiveEvidenceAuditRuleProposals, []);
      const proposal = proposals.find(item => item.id === id);
      if (!proposal) throw new Error("対象の監査ルール申請が見つかりません。");
      if (!["pending-approval", "approved", "approved-scheduled"].includes(proposal.status)) throw new Error("管理者へ引き継げる状態ではありません。");
      const now = Date.now();
      const overdue = (proposal.status === "pending-approval" && proposal.approvalDueAt && new Date(proposal.approvalDueAt).getTime() < now)
        || (["approved", "approved-scheduled"].includes(proposal.status) && proposal.applicationDueAt && new Date(proposal.applicationDueAt).getTime() < now);
      if (!overdue) throw new Error("期限超過した申請のみ管理者へ引き継げます。");
      const previous = String(proposal.assignedTo || "");
      proposal.assignedTo = "管理者";
      proposal.escalatedToAdministrator = true;
      proposal.escalatedAt = nowIso();
      proposal.escalatedBy = actor;
      proposal.escalationReason = reason;
      proposal.assignmentHistory = Array.isArray(proposal.assignmentHistory) ? proposal.assignmentHistory : [];
      proposal.assignmentHistory.push({ previousAssignedTo: previous, assignedTo: "管理者", changedAt: proposal.escalatedAt, changedBy: actor, reason, escalation: true });
      proposal.notificationAcknowledgedAt = "";
      proposal.notificationAcknowledgedBy = "";
      write(KEYS.correctiveEvidenceAuditRuleProposals, proposals);
      this.recordCorrectiveEvidenceAuditRuleProposalEvent(proposal.id, "escalated", { actor, statusAfter: proposal.status, reason, details: { previousAssignedTo: previous, assignedTo: "管理者" } });
      enqueueSync("corrective-evidence-audit-rule-proposal", "escalate", proposal);
      return proposal;
    },

    createCorrectiveEvidenceAuditRuleRollbackProposal(sourceProposalId, options = {}) {
      const source = read(KEYS.correctiveEvidenceAuditRuleProposals, []).find(item => item.id === sourceProposalId);
      if (!source || source.status !== "applied") throw new Error("ロールバック元となる適用済み申請が見つかりません。");
      const simulation = this.simulateCorrectiveEvidenceAuditRules(source.previousRules, { actor: options.actor || "利用者" });
      return this.createCorrectiveEvidenceAuditRuleProposal(source.previousRules, simulation, {
        ...options,
        type: "rollback",
        sourceProposalId,
        reason: String(options.reason || "").trim()
      });
    },

    simulateCorrectiveEvidenceAuditRules(candidateRules = {}, options = {}) {
      const current = this.getCorrectiveEvidenceAuditRules();
      const rules = {
        ...current,
        permissionDeniedEnabled: Boolean(candidateRules.permissionDeniedEnabled),
        missingReasonEnabled: Boolean(candidateRules.missingReasonEnabled),
        bulkDownloadEnabled: Boolean(candidateRules.bulkDownloadEnabled),
        bulkWindowMinutes: Math.min(120, Math.max(1, Number(candidateRules.bulkWindowMinutes || current.bulkWindowMinutes))),
        bulkMediumThreshold: Math.min(100, Math.max(2, Number(candidateRules.bulkMediumThreshold || current.bulkMediumThreshold))),
        bulkHighThreshold: Math.min(200, Math.max(3, Number(candidateRules.bulkHighThreshold || current.bulkHighThreshold))),
        lookbackHours: Math.min(720, Math.max(1, Number(candidateRules.lookbackHours || current.lookbackHours)))
      };
      if (rules.bulkHighThreshold <= rules.bulkMediumThreshold) throw new Error("高優先度の件数は中優先度より大きく設定してください。");

      const logs = this.getCorrectiveEvidenceAccessLogs({ scope: this.isAdministrator() ? "all" : "office" });
      const cutoff = Date.now() - rules.lookbackHours * 60 * 60 * 1000;
      const recent = logs.filter(item => new Date(item.accessedAt).getTime() >= cutoff);
      const findings = [];

      recent.filter(item => item.outcome === "denied").forEach(item => {
        const type = item.denialReason === "reason-required" ? "missing-download-reason" : "permission-denied";
        if (type === "missing-download-reason" && !rules.missingReasonEnabled) return;
        if (type === "permission-denied" && !rules.permissionDeniedEnabled) return;
        findings.push({
          type,
          severity: item.accessLevel === "administrator" ? "high" : "medium",
          officeId: item.officeId,
          office: item.office,
          actor: item.actor,
          title: item.title,
          occurredAt: item.accessedAt,
          sourceLogCount: 1
        });
      });

      if (rules.bulkDownloadEnabled) {
        const groups = new Map();
        recent.filter(item => item.operation === "download" && item.outcome !== "denied").forEach(item => {
          const bucket = Math.floor(new Date(item.accessedAt).getTime() / (rules.bulkWindowMinutes * 60 * 1000));
          const key = `${item.actor}|${item.officeId}|${bucket}`;
          const group = groups.get(key) || [];
          group.push(item);
          groups.set(key, group);
        });
        groups.forEach(group => {
          if (group.length < rules.bulkMediumThreshold) return;
          findings.push({
            type: "bulk-download",
            severity: group.length >= rules.bulkHighThreshold ? "high" : "medium",
            officeId: group[0].officeId,
            office: group[0].office,
            actor: group[0].actor,
            title: `${rules.bulkWindowMinutes}分以内に${group.length}件の資料取得`,
            occurredAt: group[0].accessedAt,
            sourceLogCount: group.length
          });
        });
      }

      const currentSimulation = options.compareCurrent === false
        ? []
        : this.simulateCorrectiveEvidenceAuditRules(current, { compareCurrent: false }).findings;
      const signature = item => [item.type, item.officeId, item.actor, item.occurredAt, item.title].join("|");
      const currentSet = new Set(currentSimulation.map(signature));
      const candidateSet = new Set(findings.map(signature));
      const added = findings.filter(item => !currentSet.has(signature(item)));
      const removed = currentSimulation.filter(item => !candidateSet.has(signature(item)));
      const byOffice = Object.values(findings.reduce((map, item) => {
        const key = item.officeId || "unknown";
        map[key] ||= { officeId: key, office: item.office || "不明", total: 0, high: 0, medium: 0 };
        map[key].total += 1;
        map[key][item.severity] = (map[key][item.severity] || 0) + 1;
        return map;
      }, {})).sort((a, b) => b.total - a.total);

      return {
        schemaVersion: "1.0",
        simulatedAt: nowIso(),
        simulatedBy: String(options.actor || "利用者"),
        logCount: recent.length,
        currentRules: current,
        candidateRules: rules,
        summary: {
          total: findings.length,
          high: findings.filter(item => item.severity === "high").length,
          medium: findings.filter(item => item.severity === "medium").length,
          added: added.length,
          removed: removed.length
        },
        byOffice,
        findings,
        added,
        removed
      };
    },

    analyzeCorrectiveEvidenceAccess(options = {}) {
      const logs = this.getCorrectiveEvidenceAccessLogs({ scope: this.isAdministrator() ? "all" : "office" });
      const rules = this.getCorrectiveEvidenceAuditRules();
      const sinceHours = Math.max(1, Number(options.sinceHours || rules.lookbackHours));
      const cutoff = Date.now() - sinceHours * 60 * 60 * 1000;
      const recent = logs.filter(item => new Date(item.accessedAt).getTime() >= cutoff);
      const findings = [];
      recent.filter(item => item.outcome === "denied").forEach(item => {
        const type = item.denialReason === "reason-required" ? "missing-download-reason" : "permission-denied";
        if (type === "missing-download-reason" && !rules.missingReasonEnabled) return;
        if (type === "permission-denied" && !rules.permissionDeniedEnabled) return;
        findings.push({
        id: `finding-${item.id}`,
        type,
        severity: item.accessLevel === "administrator" ? "high" : "medium",
        officeId: item.officeId,
        office: item.office,
        actor: item.actor,
        role: item.role,
        evidenceId: item.evidenceId,
        title: item.title,
        occurredAt: item.accessedAt,
        sourceLogIds: [item.id],
        status: "open",
        ruleSnapshot: rules
      });
      });
      const groups = new Map();
      recent.filter(item => item.operation === "download" && item.outcome !== "denied").forEach(item => {
        const bucket = Math.floor(new Date(item.accessedAt).getTime() / (rules.bulkWindowMinutes * 60 * 1000));
        const key = `${item.actor}|${item.officeId}|${bucket}`;
        const group = groups.get(key) || [];
        group.push(item);
        groups.set(key, group);
      });
      groups.forEach(group => {
        if (!rules.bulkDownloadEnabled || group.length < rules.bulkMediumThreshold) return;
        findings.push({
          id: `finding-burst-${fnv1a(group.map(item => item.id).sort().join("|"))}`,
          type: "bulk-download",
          severity: group.length >= rules.bulkHighThreshold ? "high" : "medium",
          officeId: group[0].officeId,
          office: group[0].office,
          actor: group[0].actor,
          role: group[0].role,
          evidenceId: "",
          title: `${rules.bulkWindowMinutes}分以内に${group.length}件の資料取得`,
          occurredAt: group[0].accessedAt,
          sourceLogIds: group.map(item => item.id),
          status: "open",
          ruleSnapshot: rules
        });
      });
      const existing = read(KEYS.correctiveEvidenceAuditFindings, []);
      const existingById = new Map(existing.map(item => [item.id, item]));
      const merged = findings.map(item => ({ ...item, ...(existingById.get(item.id) || {}), detectedAt: existingById.get(item.id)?.detectedAt || nowIso() }));
      const historical = existing.filter(item => !merged.some(next => next.id === item.id));
      write(KEYS.correctiveEvidenceAuditFindings, [...merged, ...historical].slice(0, 5000));
      return merged;
    },

    getCorrectiveEvidenceAuditFindings(options = {}) {
      const findings = read(KEYS.correctiveEvidenceAuditFindings, []);
      const scoped = this.isAdministrator() ? findings : findings.filter(item => item.officeId === this.getOfficeId());
      return options.status ? scoped.filter(item => item.status === options.status) : scoped;
    },

    resolveCorrectiveEvidenceAuditFinding(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査所見の処理は事業所管理者または管理者のみ実行できます。");
      const findings = read(KEYS.correctiveEvidenceAuditFindings, []);
      const target = findings.find(item => item.id === id);
      if (!target) throw new Error("監査所見が見つかりません。");
      if (!this.isAdministrator() && target.officeId !== this.getOfficeId()) throw new Error("所属事業所外の監査所見は処理できません。");
      const note = String(options.note || "").trim();
      const prevention = String(options.prevention || "").trim();
      const dueAt = String(options.dueAt || "").trim();
      if (!note) throw new Error("確認結果を入力してください。");
      if (!prevention) throw new Error("再発防止策を入力してください。");
      if (!dueAt || Number.isNaN(new Date(dueAt).getTime())) throw new Error("レビュー期限を入力してください。");
      target.status = "pending-review";
      target.reviewedBy = String(options.actor || "利用者").trim();
      target.reviewedAt = nowIso();
      target.reviewNote = note;
      target.recurrencePrevention = prevention;
      target.reviewDueAt = new Date(dueAt).toISOString();
      target.completionReviewedBy = "";
      target.completionReviewedAt = "";
      target.completionReviewNote = "";
      write(KEYS.correctiveEvidenceAuditFindings, findings);
      enqueueSync("corrective-evidence-audit-finding", "update", target);
      return target;
    },

    completeCorrectiveEvidenceAuditFindingReview(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("監査所見の完了レビューは事業所管理者または管理者のみ実行できます。");
      const findings = read(KEYS.correctiveEvidenceAuditFindings, []);
      const target = findings.find(item => item.id === id);
      if (!target) throw new Error("監査所見が見つかりません。");
      if (!this.isAdministrator() && target.officeId !== this.getOfficeId()) throw new Error("所属事業所外の監査所見は処理できません。");
      if (target.status !== "pending-review") throw new Error("完了レビュー待ちの所見ではありません。");
      const actor = String(options.actor || "利用者").trim();
      if (!actor) throw new Error("レビュー担当者を入力してください。");
      if (actor === target.reviewedBy) throw new Error("所見の処理担当者本人は完了レビューできません。");
      const note = String(options.note || "").trim();
      if (!note) throw new Error("レビュー結果を入力してください。");
      target.status = "resolved";
      target.completionReviewedBy = actor;
      target.completionReviewedAt = nowIso();
      target.completionReviewNote = note;
      write(KEYS.correctiveEvidenceAuditFindings, findings);
      enqueueSync("corrective-evidence-audit-finding", "complete-review", target);
      return target;
    },

    buildCorrectiveEvidenceAuditMonthlyReport(month = "") {
      const normalizedMonth = String(month || new Date().toISOString().slice(0, 7));
      const rows = this.getCorrectiveEvidenceAuditFindings().filter(item => String(item.occurredAt || "").slice(0, 7) === normalizedMonth);
      const byOffice = {};
      rows.forEach(item => {
        const key = item.officeId || "unknown";
        byOffice[key] ||= { officeId: key, office: item.office || "", total: 0, open: 0, pendingReview: 0, resolved: 0, high: 0, overdue: 0 };
        const summary = byOffice[key];
        summary.total += 1;
        if (item.status === "open") summary.open += 1;
        if (item.status === "pending-review") summary.pendingReview += 1;
        if (item.status === "resolved") summary.resolved += 1;
        if (item.severity === "high") summary.high += 1;
        if (item.status === "pending-review" && item.reviewDueAt && new Date(item.reviewDueAt).getTime() < Date.now()) summary.overdue += 1;
      });
      return {
        schemaVersion: "1.0",
        reportType: "corrective-evidence-access-audit-monthly",
        month: normalizedMonth,
        generatedAt: nowIso(),
        generatedByRole: this.getUserRole(),
        summary: {
          total: rows.length,
          open: rows.filter(item => item.status === "open").length,
          pendingReview: rows.filter(item => item.status === "pending-review").length,
          resolved: rows.filter(item => item.status === "resolved").length,
          high: rows.filter(item => item.severity === "high").length,
          overdue: rows.filter(item => item.status === "pending-review" && item.reviewDueAt && new Date(item.reviewDueAt).getTime() < Date.now()).length
        },
        offices: Object.values(byOffice),
        findings: rows.map(item => ({
          id: item.id,
          type: item.type,
          severity: item.severity,
          officeId: item.officeId,
          office: item.office,
          actor: item.actor,
          occurredAt: item.occurredAt,
          status: item.status,
          reviewedBy: item.reviewedBy || "",
          reviewDueAt: item.reviewDueAt || "",
          completionReviewedBy: item.completionReviewedBy || ""
        }))
      };
    },

    updateCorrectiveEvidenceAccessPolicy(id, evidenceId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("閲覧権限の変更は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は変更できません。");
      const evidence = (action.evidenceAttachments || []).find(item => item.id === evidenceId);
      if (!evidence || evidence.status === "removed") throw new Error("証拠資料が見つかりません。");
      const accessLevel = String(options.accessLevel || "office");
      if (!["office", "office-admin", "administrator"].includes(accessLevel)) throw new Error("閲覧区分が不正です。");
      if (accessLevel === "administrator" && !this.isAdministrator()) throw new Error("管理者限定資料への変更は管理者のみ実行できます。");
      evidence.accessLevel = accessLevel;
      evidence.downloadRestricted = Boolean(options.downloadRestricted);
      evidence.accessPolicyUpdatedBy = String(options.actor || "利用者");
      evidence.accessPolicyUpdatedAt = nowIso();
      action.updatedAt = evidence.accessPolicyUpdatedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-access-policy", actor: evidence.accessPolicyUpdatedBy, at: evidence.accessPolicyUpdatedAt, note: `${evidence.title}: ${accessLevel} / downloadRestricted=${evidence.downloadRestricted}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-access-policy", { actionId: id, evidenceId, accessLevel, downloadRestricted: evidence.downloadRestricted });
      return evidence;
    },

    replacePhotoPurgeCorrectiveEvidence(id, evidenceId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("証拠資料の差し替えは事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は差し替えできません。");
      const current = (action.evidenceAttachments || []).find(item => item.id === evidenceId);
      if (!current || current.status === "removed") throw new Error("差し替え元の証拠資料が見つかりません。");
      if (current.isCurrent === false) throw new Error("旧版資料は直接差し替えできません。現行版を選択してください。");
      const actor = String(options.actor || "").trim();
      const reason = String(options.reason || "").trim();
      const fileName = String(options.fileName || "").trim();
      const mimeType = String(options.mimeType || "application/octet-stream").trim();
      const fileSize = Number(options.fileSize || 0);
      const dataUrl = String(options.dataUrl || "");
      const fingerprint = String(options.fingerprint || "");
      if (!actor || !reason || !fileName || !dataUrl) throw new Error("差し替え者、差し替え理由、ファイルは必須です。");
      if (fileSize <= 0 || fileSize > 5 * 1024 * 1024) throw new Error("証拠資料は1ファイル5MB以下にしてください。");
      if (fingerprint && action.evidenceAttachments.some(item => item.status !== "removed" && item.fingerprint === fingerprint)) throw new Error("同じ証拠資料が既に登録されています。");
      const replacement = {
        id: `evidence-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        category: current.category,
        title: String(options.title || current.title).trim(),
        note: String(options.note ?? current.note ?? "").trim(),
        fileName,
        mimeType,
        fileSize,
        fingerprint,
        dataUrl,
        version: Number(current.version || 1) + 1,
        isCurrent: true,
        previousEvidenceId: current.id,
        replacedByEvidenceId: "",
        replacementReason: reason,
        originalVerified: false,
        originalVerifiedBy: "",
        originalVerifiedAt: "",
        originalVerificationNote: "",
        accessLevel: String(options.accessLevel || current.accessLevel || "office"),
        downloadRestricted: options.downloadRestricted === undefined ? Boolean(current.downloadRestricted) : Boolean(options.downloadRestricted),
        status: "pending-review",
        uploadedBy: actor,
        uploadedAt: nowIso(),
        reviewedBy: "",
        reviewedAt: "",
        reviewNote: ""
      };
      current.isCurrent = false;
      current.replacedByEvidenceId = replacement.id;
      current.replacementReason = reason;
      action.evidenceAttachments.push(replacement);
      action.updatedBy = actor;
      action.updatedAt = replacement.uploadedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-replace", actor, at: replacement.uploadedAt, note: `${current.title} v${current.version || 1} → v${replacement.version}: ${reason}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-replace", { actionId: action.id, previousEvidenceId: current.id, replacement: { ...replacement, dataUrl: replacement.dataUrl }, reason });
      return replacement;
    },

    verifyPhotoPurgeCorrectiveEvidenceOriginal(id, evidenceId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("資料の原本性確認は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は確認できません。");
      const evidence = (action.evidenceAttachments || []).find(item => item.id === evidenceId);
      if (!evidence || evidence.status === "removed") throw new Error("証拠資料が見つかりません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note) throw new Error("確認者と確認内容は必須です。");
      if (actor === evidence.uploadedBy) throw new Error("資料登録者本人は原本性確認者になれません。");
      evidence.originalVerified = true;
      evidence.originalVerifiedBy = actor;
      evidence.originalVerifiedAt = nowIso();
      evidence.originalVerificationNote = note;
      action.updatedBy = actor;
      action.updatedAt = evidence.originalVerifiedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-original-verify", actor, at: evidence.originalVerifiedAt, note: `${evidence.title} v${evidence.version || 1}: ${note}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-original-verify", { actionId: action.id, evidenceId, actor, note });
      return evidence;
    },

    reviewPhotoPurgeCorrectiveEvidence(id, evidenceId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("証拠資料の確認は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は確認できません。");
      const evidence = (action.evidenceAttachments || []).find(item => item.id === evidenceId);
      if (!evidence || evidence.status === "removed") throw new Error("証拠資料が見つかりません。");
      const actor = String(options.actor || "").trim();
      const result = String(options.result || "").trim();
      const note = String(options.note || "").trim();
      if (!actor || !note || !["reviewed", "rejected"].includes(result)) throw new Error("確認者、確認結果、確認内容は必須です。");
      if (actor === evidence.uploadedBy) throw new Error("資料登録者本人は確認者になれません。");
      evidence.status = result;
      evidence.reviewedBy = actor;
      evidence.reviewedAt = nowIso();
      evidence.reviewNote = note;
      action.updatedBy = actor;
      action.updatedAt = evidence.reviewedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-review", actor, at: evidence.reviewedAt, note: `${result}: ${evidence.title} / ${note}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-review", { actionId: action.id, evidenceId, result, actor, note });
      return evidence;
    },

    removePhotoPurgeCorrectiveEvidence(id, evidenceId, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("証拠資料の削除は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!this.isAdministrator() && action.officeId !== this.getOfficeId()) throw new Error("所属事業所外の資料は削除できません。");
      const evidence = (action.evidenceAttachments || []).find(item => item.id === evidenceId);
      if (!evidence || evidence.status === "removed") throw new Error("証拠資料が見つかりません。");
      const actor = String(options.actor || "").trim();
      const reason = String(options.reason || "").trim();
      if (!actor || !reason) throw new Error("削除者と削除理由は必須です。");
      evidence.status = "removed";
      evidence.removedBy = actor;
      evidence.removedAt = nowIso();
      evidence.removeReason = reason;
      evidence.dataUrl = "";
      action.updatedBy = actor;
      action.updatedAt = evidence.removedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "evidence-remove", actor, at: evidence.removedAt, note: `${evidence.title}: ${reason}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "evidence-remove", { actionId: action.id, evidenceId, actor, reason });
      return true;
    },

    verifyPhotoPurgePreventionEffectiveness(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("効果確認は事業所管理者または管理者のみ実行できます。");
      const actions = read(KEYS.photoPurgeCorrectiveActions, []);
      const action = actions.find(item => item.id === id);
      if (!action) throw new Error("是正処置が見つかりません。");
      if (!action.recurrencePrevention) throw new Error("再発防止計画が登録されていません。");
      const actor = String(options.actor || "").trim();
      const note = String(options.note || "").trim();
      const result = String(options.result || "");
      if (!actor || !note || !["effective", "ineffective"].includes(result)) throw new Error("確認者、確認結果、確認内容は必須です。");
      if (actor === action.preventionOwner) throw new Error("再発防止責任者本人は効果確認者になれません。");
      const effectivenessEvidence = (action.evidenceAttachments || []).filter(item => item.status === "reviewed" && item.category === "effectiveness" && item.isCurrent !== false && item.originalVerified === true);
      if (!effectivenessEvidence.length) throw new Error("確認済み・原本性確認済みの現行版効果確認資料を1件以上登録してください。");
      action.effectivenessStatus = result;
      action.effectivenessVerifiedBy = actor;
      action.effectivenessVerifiedAt = nowIso();
      action.effectivenessNote = note;
      action.updatedBy = actor;
      action.updatedAt = action.effectivenessVerifiedAt;
      action.history = Array.isArray(action.history) ? action.history : [];
      action.history.push({ action: "effectiveness-verification", actor, at: action.updatedAt, note: `${result}: ${note}` });
      write(KEYS.photoPurgeCorrectiveActions, actions);
      enqueueSync("photo-purge-corrective-action", "effectiveness-verification", action);
      return action;
    },

    getPhotoPurgeCertificates(options = {}) {
      const certificates = read(KEYS.photoPurgeCertificates, []);
      if (options.scope === "all" && this.isAdministrator()) return certificates;
      const officeId = options.officeId || this.getOfficeId();
      return certificates.filter(item => item.officeId === officeId);
    },

    getPhotoPurgeCertificateByPlanId(planId) {
      return this.getPhotoPurgeCertificates({ scope: this.isAdministrator() ? "all" : "office" }).find(item => item.planId === planId) || null;
    },

    verifyPhotoPurgeCertificate(certificate = {}) {
      const errors = [];
      const warnings = [];
      const required = ["schemaVersion", "certificateId", "planId", "officeId", "executedBy", "executedAt", "deletedPhotoCount", "deletedBytes", "targetPhotos", "result", "verificationHash"];
      required.forEach(key => {
        if (certificate[key] === undefined || certificate[key] === null || certificate[key] === "") errors.push(`必須項目 ${key} がありません。`);
      });
      if (!Array.isArray(certificate.targetPhotos)) errors.push("targetPhotos は配列である必要があります。");
      const targets = Array.isArray(certificate.targetPhotos) ? certificate.targetPhotos : [];
      const photoIds = targets.map(item => String(item.photoId || "")).filter(Boolean);
      if (new Set(photoIds).size !== photoIds.length) errors.push("対象写真IDに重複があります。");
      if (Number(certificate.deletedPhotoCount || 0) !== targets.length) errors.push("削除件数と対象写真件数が一致しません。");
      const calculatedBytes = targets.reduce((sum, item) => sum + Number(item.fileSize || 0), 0);
      if (Number(certificate.deletedBytes || 0) !== calculatedBytes) errors.push("削減容量と対象写真容量の合計が一致しません。");
      if (certificate.result !== "completed") errors.push("削除結果が completed ではありません。");

      const { verificationHash, ...certificateCore } = certificate;
      const calculatedHash = fnv1a(stableStringify(certificateCore));
      if (String(verificationHash || "") !== calculatedHash) errors.push("検証ハッシュが一致しません。証明書が変更された可能性があります。");

      const allPlans = read(KEYS.photoPurgePlans, []);
      const linkedPlan = allPlans.find(item => item.id === certificate.planId) || null;
      if (!linkedPlan) {
        warnings.push("この端末には対応する削除計画がありません。外部証明書としてハッシュと内部整合性のみを確認しました。");
      } else {
        if (linkedPlan.status !== "executed") errors.push("対応する削除計画が実行済みではありません。");
        if (linkedPlan.certificateId && linkedPlan.certificateId !== certificate.certificateId) errors.push("削除計画に記録された証明書IDと一致しません。");
        if (linkedPlan.certificateHash && linkedPlan.certificateHash !== certificate.verificationHash) errors.push("削除計画に記録された証明書ハッシュと一致しません。");
        if (linkedPlan.officeId && linkedPlan.officeId !== certificate.officeId) errors.push("削除計画の事業所IDと一致しません。");
        if (Number(linkedPlan.executedCount || 0) && Number(linkedPlan.executedCount) !== Number(certificate.deletedPhotoCount || 0)) errors.push("削除計画の実行件数と一致しません。");
        if (Number(linkedPlan.executedBytes || 0) && Number(linkedPlan.executedBytes) !== Number(certificate.deletedBytes || 0)) errors.push("削除計画の実行容量と一致しません。");
      }

      return {
        valid: errors.length === 0,
        verifiedAt: nowIso(),
        certificateId: String(certificate.certificateId || ""),
        planId: String(certificate.planId || ""),
        suppliedHash: String(verificationHash || ""),
        calculatedHash,
        linkedPlanFound: Boolean(linkedPlan),
        errors,
        warnings,
        summary: {
          deletedPhotoCount: Number(certificate.deletedPhotoCount || 0),
          deletedBytes: Number(certificate.deletedBytes || 0),
          office: String(certificate.office || ""),
          executedBy: String(certificate.executedBy || ""),
          executedAt: String(certificate.executedAt || "")
        }
      };
    },

    executePhotoPurgePlan(id, options = {}) {
      if (!(this.isOfficeAdmin() || this.isAdministrator())) throw new Error("完全削除の実行は事業所管理者または管理者のみ可能です。");
      const actor = String(options.executedBy || "").trim();
      if (!actor) throw new Error("実行者を入力してください。");
      const plans = read(KEYS.photoPurgePlans, []);
      const plan = plans.find(item => item.id === id);
      if (!plan) throw new Error("削除計画が見つかりません。");
      if (plan.status !== "approved") throw new Error("承認済みの削除計画ではありません。");
      if (!this.isSafetyEnvironmentAdmin() && plan.officeId !== this.getOfficeId()) throw new Error("所属事業所外の削除計画は実行できません。");
      const candidates = this.getPhotoRetentionCandidates();
      const targetIds = new Set(plan.photoIds || []);
      const targets = candidates.filter(item => targetIds.has(item.id));
      if (targets.length !== targetIds.size) throw new Error("削除対象写真の一部が見つかりません。計画を再確認してください。");
      if (targets.some(item => item.retentionStatus !== "purge-ready" || item.retentionHold)) throw new Error("対象写真の状態が変わったため完全削除を停止しました。");
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const executedAt = nowIso();
      const targetSummaries = targets.map(target => ({
        photoId: target.id,
        applicationId: target.applicationId || "",
        applicationNumber: target.applicationNumber || "",
        fileName: target.fileName || "",
        fileSize: Number(target.fileSize || estimateDataUrlBytes(target.dataUrl)),
        fingerprint: target.fingerprint || "",
        registeredAt: target.registeredAt || "",
        deletedAt: target.deletedAt || ""
      }));
      write(KEYS.photos, photos.filter(item => !targetIds.has(item.id)));
      targets.forEach(target => appendPhotoAudit({ action: "purge", actor, reason: plan.reason, photoId: target.id, applicationId: target.applicationId, applicationNumber: target.applicationNumber, officeId: target.officeId, office: target.office, before: target, after: {} }));
      plan.status = "executed";
      plan.executedBy = actor;
      plan.executedAt = executedAt;
      plan.executedCount = targets.length;
      plan.executedBytes = targetSummaries.reduce((sum, item) => sum + item.fileSize, 0);
      const certificateCore = {
        schemaVersion: "1.0",
        certificateId: `purge-cert-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        planId: plan.id,
        officeId: plan.officeId,
        office: plan.office,
        applications: [...(plan.applications || [])],
        reason: plan.reason,
        createdBy: plan.createdBy,
        createdAt: plan.createdAt,
        approvedBy: plan.approvedBy,
        approvedAt: plan.approvedAt,
        executedBy: actor,
        executedAt,
        deletedPhotoCount: targetSummaries.length,
        deletedBytes: plan.executedBytes,
        targetPhotos: targetSummaries,
        result: "completed"
      };
      const certificate = { ...certificateCore, verificationHash: fnv1a(stableStringify(certificateCore)) };
      const certificates = read(KEYS.photoPurgeCertificates, []);
      certificates.unshift(certificate);
      write(KEYS.photoPurgeCertificates, certificates.slice(0, 5000));
      plan.certificateId = certificate.certificateId;
      plan.certificateHash = certificate.verificationHash;
      write(KEYS.photoPurgePlans, plans);
      enqueueSync("photo-purge-plan", "execute", { ...plan, photoIds: [...targetIds], certificate });
      return { ...plan, certificate };
    },

    addPhoto(record) {
      if (!this.canWriteOperationalData()) throw new Error("この権限では写真を登録できません。");
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const application = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) })).find(item => item.id === record.applicationId);
      const office = application ? org()?.getOfficeById(application.officeId) : org()?.getOfficeById(this.getOfficeId());
      const normalized = office || defaultOffice();
      const policy = this.getPhotoPolicy();
      const fileSize = Number(record.fileSize || estimateDataUrlBytes(record.dataUrl));
      const maxBytes = policy.maxFileSizeMb * 1024 * 1024;
      if (fileSize > maxBytes) throw new Error(`写真1枚の上限は${policy.maxFileSizeMb}MBです。`);
      const applicationCount = photos.filter(item => item.status !== "deleted" && item.applicationId === String(record.applicationId || "")).length;
      if (applicationCount >= policy.perApplication) throw new Error(`1申請番号あたりの写真上限（${policy.perApplication}枚）に達しています。`);
      const officePhotos = photos.filter(item => item.status !== "deleted" && item.officeId === normalized.id);
      if (officePhotos.length >= policy.perOffice) throw new Error(`事業所の写真上限（${policy.perOffice}枚）に達しています。`);
      const officeBytes = officePhotos.reduce((sum, item) => sum + Number(item.fileSize || estimateDataUrlBytes(item.dataUrl)), 0);
      if (officeBytes + fileSize > policy.storageLimitMb * 1024 * 1024) throw new Error(`事業所の写真保存容量上限（${policy.storageLimitMb}MB）を超えます。`);
      const duplicate = this.findDuplicatePhoto({
        applicationId: record.applicationId,
        fingerprint: record.fingerprint,
        fileName: record.fileName,
        originalFileSize: record.originalFileSize || fileSize
      });
      if (duplicate) throw new Error(`同じ申請番号に同一写真の登録候補があります（既存登録: ${duplicate.fileName || "写真"} / ${duplicate.registeredAt ? new Date(duplicate.registeredAt).toLocaleString("ja-JP") : "日時不明"}）。`);
      const photo = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        applicationId: String(record.applicationId || ""),
        applicationNumber: String(record.applicationNumber || ""),
        fileName: String(record.fileName || ""),
        mimeType: String(record.mimeType || ""),
        fileSize,
        originalFileSize: Number(record.originalFileSize || fileSize),
        imageWidth: record.imageWidth ? Number(record.imageWidth) : null,
        imageHeight: record.imageHeight ? Number(record.imageHeight) : null,
        compressionMode: String(record.compressionMode || "auto"),
        fingerprint: String(record.fingerprint || ""),
        capturedAtSource: String(record.capturedAtSource || "manual"),
        exifOrientation: record.exifOrientation ? Number(record.exifOrientation) : null,
        metadataSanitized: record.metadataSanitized !== false,
        gpsRetentionConsent: Boolean(record.gpsRetentionConsent),
        dataUrl: String(record.dataUrl || ""),
        comment: String(record.comment || "").trim(),
        shootingAt: record.shootingAt || nowIso(),
        registeredAt: nowIso(),
        registeredBy: String(record.registeredBy || "利用者"),
        officeId: normalized.id,
        office: normalized.name,
        blockId: normalized.blockId || "block-01",
        blockName: normalized.blockName || "第一ブロック",
        gps: record.gpsRetentionConsent ? (record.gps || null) : null,
        representative: Boolean(record.representative),
        status: "active"
      };
      if (photo.representative && photo.applicationId) {
        photos.forEach(item => { if (item.applicationId === photo.applicationId) item.representative = false; });
      }
      photos.unshift(photo);
      write(KEYS.photos, photos);
      appendPhotoAudit({ action: "create", actor: photo.registeredBy, photoId: photo.id, applicationId: photo.applicationId, applicationNumber: photo.applicationNumber, officeId: photo.officeId, office: photo.office, after: photo });
      enqueueSync("photo", "create", { ...photo, dataUrl: photo.dataUrl });
      return photo;
    },

    updatePhoto(id, updates) {
      if (!this.canWriteOperationalData()) throw new Error("この権限では写真を編集できません。");
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = photos.find(item => item.id === id);
      if (!target) return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;
      const before = { ...target };
      Object.assign(target, {
        applicationId: String(updates.applicationId ?? target.applicationId),
        applicationNumber: String(updates.applicationNumber ?? target.applicationNumber),
        comment: String(updates.comment ?? target.comment).trim(),
        shootingAt: updates.shootingAt ?? target.shootingAt,
        representative: updates.representative ?? target.representative ?? false,
        status: updates.status ?? target.status
      });
      if (target.representative && target.applicationId) {
        photos.forEach(item => { if (item.id !== target.id && item.applicationId === target.applicationId) item.representative = false; });
      }
      write(KEYS.photos, photos);
      appendPhotoAudit({ action: "update", actor: String(updates.updatedBy || target.registeredBy || "利用者"), reason: String(updates.reason || ""), photoId: target.id, applicationId: target.applicationId, applicationNumber: target.applicationNumber, officeId: target.officeId, office: target.office, before, after: target });
      enqueueSync("photo", "update", target);
      return true;
    },

    removePhoto(id, options = {}) {
      if (!this.canDeleteOperationalData()) throw new Error("安全環境室長・安全環境室職員は写真を削除できません。削除は事業所管理者またはシステム管理者へ依頼してください。");
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = photos.find(item => item.id === id);
      if (!target) return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;
      if (target.status === "deleted") return false;
      const before = { ...target };
      Object.assign(target, {
        status: "deleted",
        deletedAt: nowIso(),
        deletedBy: String(options.deletedBy || "利用者"),
        deletionReason: String(options.reason || "").trim(),
        representative: false
      });
      write(KEYS.photos, photos);
      appendPhotoAudit({ action: "delete", actor: target.deletedBy, reason: target.deletionReason, photoId: target.id, applicationId: target.applicationId, applicationNumber: target.applicationNumber, officeId: target.officeId, office: target.office, before, after: target });
      enqueueSync("photo", "delete", { id, officeId: target.officeId, serverId: target.serverId || null, serverVersion: target.serverVersion || 1, reason: target.deletionReason });
      return true;
    },

    restorePhoto(id, options = {}) {
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      const target = photos.find(item => item.id === id);
      if (!target || target.status !== "deleted") return false;
      if (!this.isSafetyEnvironment() && target.officeId !== this.getOfficeId()) return false;
      const before = { ...target };
      Object.assign(target, {
        status: "active",
        restoredAt: nowIso(),
        restoredBy: String(options.restoredBy || "利用者")
      });
      delete target.deletedAt;
      delete target.deletedBy;
      delete target.deletionReason;
      write(KEYS.photos, photos);
      appendPhotoAudit({ action: "restore", actor: target.restoredBy, reason: String(options.reason || ""), photoId: target.id, applicationId: target.applicationId, applicationNumber: target.applicationNumber, officeId: target.officeId, office: target.office, before, after: target });
      enqueueSync("photo", "restore", target);
      return true;
    },



    mergeServerApplications(records = []) {
      const applications = read(KEYS.applications, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      for (const row of records) {
        const serverId = row.id || row.serverId;
        const clientId = row.client_id || row.clientId;
        let target = applications.find(item => item.serverId === serverId || (clientId && item.id === clientId));
        const officeRecord = org()?.getOfficeById(row.office_id || row.officeId);
        const mapped = {
          id: target?.id || clientId || `server-${serverId}`,
          serverId,
          serverVersion: Number(row.version || 1),
          applicationNumber: row.application_number || row.applicationNumber || "",
          shipper: row.shipper || "",
          cargoName: row.cargo_name || row.cargoName || "",
          note: row.note || "",
          status: row.status || "active",
          officeId: row.office_id || row.officeId || officeRecord?.id || this.getOfficeId(),
          office: row.office_name || row.office || officeRecord?.name || "",
          blockId: row.block_id || row.blockId || officeRecord?.blockId || "",
          blockName: row.block_name || row.blockName || officeRecord?.blockName || "",
          createdAt: row.created_at || row.createdAt || nowIso(),
          updatedAt: row.updated_at || row.updatedAt || nowIso(),
          syncedAt: nowIso()
        };
        if (target) Object.assign(target, mapped); else applications.push(mapped);
      }
      applications.sort((a,b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));
      write(KEYS.applications, applications);
      return records.length;
    },

    mergeServerPhotos(records = [], assetBase = "") {
      const photos = read(KEYS.photos, []).map(item => ({ ...item, ...normalizeOffice(item) }));
      for (const row of records) {
        const serverId = row.id || row.serverId;
        const clientId = row.client_id || row.clientId;
        let target = photos.find(item => item.serverId === serverId || (clientId && item.id === clientId));
        const application = read(KEYS.applications, []).find(item => item.serverId === (row.application_id || row.applicationId));
        const url = row.url ? (/^https?:/i.test(row.url) ? row.url : `${String(assetBase).replace(/\/$/, "")}${row.url}`) : target?.dataUrl || "";
        const mapped = {
          id: target?.id || clientId || `server-photo-${serverId}`,
          serverId, serverVersion: Number(row.version || 1),
          applicationId: application?.id || row.applicationId || "",
          applicationNumber: row.application_number || row.applicationNumber || application?.applicationNumber || "",
          fileName: row.original_name || row.fileName || "", mimeType: row.mime_type || row.mimeType || "", fileSize: Number(row.file_size || row.fileSize || 0),
          dataUrl: url, comment: row.comment || "", shootingAt: row.shooting_at || row.shootingAt || row.created_at || nowIso(),
          registeredAt: row.created_at || row.registeredAt || nowIso(), registeredBy: row.registered_by_name || row.registeredBy || "",
          officeId: row.office_id || row.officeId || application?.officeId || this.getOfficeId(), office: row.office_name || row.office || application?.office || "",
          blockId: row.block_id || row.blockId || application?.blockId || "", blockName: row.block_name || row.blockName || application?.blockName || "",
          representative: Boolean(row.representative), status: row.status || "active", syncedAt: nowIso()
        };
        if (target) Object.assign(target, mapped); else photos.push(mapped);
      }
      photos.sort((a,b) => String(b.registeredAt || "").localeCompare(String(a.registeredAt || "")));
      write(KEYS.photos, photos);
      return records.length;
    },

    setApplicationServerId(localId, serverId, serverVersion = 1) {
      const applications = read(KEYS.applications, []);
      const target = applications.find(item => item.id === localId);
      if (!target) return false;
      target.serverId = serverId;
      target.serverVersion = serverVersion;
      target.syncedAt = nowIso();
      write(KEYS.applications, applications);
      return true;
    },

    setPhotoServerId(localId, serverId, serverVersion = 1) {
      const photos = read(KEYS.photos, []);
      const target = photos.find(item => item.id === localId);
      if (!target) return false;
      target.serverId = serverId;
      target.serverVersion = serverVersion;
      target.syncedAt = nowIso();
      write(KEYS.photos, photos);
      return true;
    },

    getOfficeApplicationSummary() {
      const all = this.isSafetyEnvironmentAdmin() ? this.getApplications({ scope: "all" }) : this.getApplications();
      const offices = org()?.getOfficeOptions() || [];
      return offices.map(office => ({
        officeId: office.id,
        officeName: office.name,
        blockId: office.blockId,
        blockName: office.blockName,
        applicationCount: all.filter(item => item.officeId === office.id).length,
        photoCount: this.getPhotos({ scope: this.isSafetyEnvironmentAdmin() ? "all" : "office" }).filter(item => item.officeId === office.id).length
      }));
    },

    getShowImdgReferences() {
      const value = localStorage.getItem(KEYS.showImdgReferences);
      return value === null ? true : value === "true";
    },
    setShowImdgReferences(enabled) { localStorage.setItem(KEYS.showImdgReferences, String(Boolean(enabled))); },
    getRequirementLayout() { return localStorage.getItem(KEYS.requirementLayout) === "horizontal" ? "horizontal" : "two-column"; },
    setRequirementLayout(layout) {
      const normalized = layout === "horizontal" ? "horizontal" : "two-column";
      localStorage.setItem(KEYS.requirementLayout, normalized);
    }
  };

  window.ISSStorage = api;
})();
