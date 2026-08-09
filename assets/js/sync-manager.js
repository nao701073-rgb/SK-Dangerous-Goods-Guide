(() => {
  "use strict";
  const QUEUE_KEY = "iss-sync-queue";
  const readQueue = () => {
    try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]"); } catch { return []; }
  };
  const writeQueue = queue => localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.slice(-1000)));
  const dataUrlToBlob = dataUrl => {
    const [meta, payload] = String(dataUrl || "").split(",");
    const mime = meta?.match(/data:([^;]+)/)?.[1] || "application/octet-stream";
    const bytes = atob(payload || "");
    const array = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i += 1) array[i] = bytes.charCodeAt(i);
    return new Blob([array], { type: mime });
  };

  async function syncItem(item) {
    const p = item.payload || {};
    if (item.entity === "application") {
      if (item.action === "create") {
        const result = await window.ISSApi.createApplication({
          clientId: p.id || item.id,
          applicationNumber: p.applicationNumber,
          shipper: p.shipper || "",
          cargoName: p.cargoName || "",
          note: p.note || "",
          status: p.status || "active",
          caseData: p.caseData || { applicantName:p.applicantName||"", shipper:p.shipper||"", loadingPort:p.loadingPort||"", dischargePort:p.dischargePort||"", containerType:p.containerType||"", cargoItems:Array.isArray(p.cargoItems)?p.cargoItems:[] },
          officeId: p.officeId
        });
        window.ISSStorage.setApplicationServerId(p.id || item.id, result.application.id, result.application.version || 1);
        return { serverId: result.application.id, version: result.application.version || 1 };
      }
      const local = window.ISSStorage.getApplications({ scope: "all" }).find(app => app.id === p.id);
      const serverId = p.serverId || local?.serverId;
      if (!serverId) return { skipped: true, reason: "先に申請番号の新規登録を同期してください" };
      if (item.action === "update") {
        const result = await window.ISSApi.updateApplication(serverId, {
          applicationNumber: p.applicationNumber || local?.applicationNumber || "", shipper: p.shipper || "", cargoName: p.cargoName || "", note: p.note || "", status: p.status || "active",
          caseData: p.caseData || local?.caseData || { applicantName:p.applicantName||local?.applicantName||"", shipper:p.shipper||local?.shipper||"", loadingPort:p.loadingPort||local?.loadingPort||"", dischargePort:p.dischargePort||local?.dischargePort||"", containerType:p.containerType||local?.containerType||"", cargoItems:Array.isArray(p.cargoItems)?p.cargoItems:(local?.cargoItems||[]) },
          version: Number(p.serverVersion || local?.serverVersion || 1),
          changeReason: p.changeReason || "オフライン入力の同期反映"
        });
        window.ISSStorage.setApplicationServerId(p.id, serverId, result.application.version || 1);
        return { serverId, version: result.application.version || 1 };
      }
      if (item.action === "delete") return window.ISSApi.deleteApplication(serverId, p.changeReason || p.reason || "オフラインで取消・削除した内容の同期");
      return { skipped: true, reason: "未対応の申請番号操作" };
    }
    if (item.entity === "application-document") {
      const local = window.ISSStorage.getApplicationDocuments({ scope:"all", includeCancelled:true }).find(doc => doc.id === p.id);
      const document = local || p;
      if (["create","create-version"].includes(item.action)) {
        if (!document.dataUrl) return { skipped:true, reason:"添付資料本体がありません" };
        const application = window.ISSStorage.getApplications({ scope:"all" }).find(app => app.id === document.applicationId);
        if (!application?.serverId) return { skipped:true, reason:"先に申請番号を同期してください" };
        const form=new FormData();
        form.set("applicationId",application.serverId);
        form.set("category",document.category||"other");
        form.set("description",document.description||"");
        form.set("changeReason",document.changeReason||"");
        form.set("uploadedBy",document.uploadedBy||"利用者");
        if(item.action==="create-version"){
          const parent=window.ISSStorage.getApplicationDocuments({scope:"all",includeCancelled:true}).find(doc=>doc.id===document.parentDocumentId);
          if(!parent?.serverId)return {skipped:true,reason:"先に更新元資料を同期してください"};
          form.set("parentDocumentId",parent.serverId);
        }
        form.set("document",dataUrlToBlob(document.dataUrl),document.fileName||"document.bin");
        const result=await window.ISSApi.uploadApplicationDocument(form);
        window.ISSStorage.setApplicationDocumentServerId(document.id,result.document.id);
        return result;
      }
      const serverId=document.serverId||p.serverId;
      if(!serverId)return {skipped:true,reason:"先に添付資料を同期してください"};
      if(item.action==="update"){
        const action=document.isCancelled?"cancel":"restore";
        return window.ISSApi.updateApplicationDocumentStatus(serverId,{action,reason:document.cancellationReason||document.changeReason||"状態変更"});
      }
      return {skipped:true,reason:"未対応の添付資料操作"};
    }

    if (item.entity === "application-result") {
      const local = window.ISSApplicationResults?.read?.().find(row => row.id === p.id) || p;
      const application = window.ISSStorage.getApplications({ scope:"all" }).find(app => app.id === local.applicationId);
      if (!application?.serverId) return { skipped:true, reason:"先に申請番号を同期してください" };
      if (item.action === "create" || !local.serverId) {
        const result = await window.ISSApi.createApplicationResult({
          clientId: local.id,
          applicationId: application.serverId,
          resultType: local.type || "other",
          title: local.title || "確認・算出結果",
          resultVersion: Number(local.version || 1),
          status: local.payload?.review?.status === "confirmed" ? "confirmed" : "recorded",
          sourcePage: local.sourcePage || "",
          payload: local.payload || {}
        });
        window.ISSApplicationResults?.setServerId?.(local.id, result.result.id);
        return result;
      }
      return { skipped:true, reason:"登録済み結果の更新は新しい版として保存してください" };
    }
    if (item.entity === "photo") {
      if (item.action === "create") {
        if (!p.dataUrl) return { skipped: true, reason: "写真データ本体がありません" };
        const applications = window.ISSStorage.getApplications({ scope: "all" });
        const application = applications.find(app => app.id === p.applicationId);
        const serverApplicationId = application?.serverId || p.serverApplicationId;
        if (!serverApplicationId) return { skipped: true, reason: "先に申請番号を同期してください" };
        const form = new FormData();
        form.set("applicationId", serverApplicationId);
        form.set("clientId", p.id || item.id);
        form.set("shootingAt", p.shootingAt || "");
        form.set("registeredBy", p.registeredBy || "");
        form.set("comment", p.comment || "");
        form.set("photo", dataUrlToBlob(p.dataUrl), p.fileName || "photo.jpg");
        const result = await window.ISSApi.uploadPhoto(form);
        window.ISSStorage.setPhotoServerId(p.id || item.id, result.photo.id);
        if (p.representative) await window.ISSApi.updatePhoto(result.photo.id, { representative: true, version: result.photo.version || 1 });
        return result;
      }
      const local = window.ISSStorage.getPhotos({ scope: "all" }).find(photo => photo.id === p.id);
      const serverId = p.serverId || local?.serverId;
      if (!serverId) return { skipped: true, reason: "先に写真の新規登録を同期してください" };
      if (item.action === "update") return window.ISSApi.updatePhoto(serverId, { comment: p.comment || "", shootingAt: p.shootingAt || null, status: p.status || "active", representative: Boolean(p.representative), version: Number(p.serverVersion || local?.serverVersion || 1) });
      if (item.action === "delete") return window.ISSApi.deletePhoto(serverId);
    }
    return { skipped: true, reason: "未対応の同期操作" };
  }

  function assetBaseFromEndpoint() {
    const endpoint = String(window.ISSApi?.getEndpoint?.() || "").replace(/\/$/, "");
    return endpoint.endsWith("/api") ? endpoint.slice(0, -4) : endpoint;
  }

  async function pullServerData() {
    if (!window.ISSApi?.isAuthenticated()) throw new Error("オンライン取得にはログインが必要です。");
    const context = window.ISSStorage.getCurrentContext();
    const params = context.canViewAllOffices ? {} : { officeId: context.officeId };
    const applicationResult = await window.ISSApi.listApplications(params);
    window.ISSStorage.mergeServerApplications(applicationResult.applications || []);
    const photoResult = await window.ISSApi.listPhotos(params);
    window.ISSStorage.mergeServerPhotos(photoResult.photos || [], assetBaseFromEndpoint());
    const documentResult = await window.ISSApi.listApplicationDocuments(params);
    window.ISSStorage.mergeServerApplicationDocuments(documentResult.documents || [], assetBaseFromEndpoint());
    let resultRows=[];
    try { const resultResponse=await window.ISSApi.listApplicationResults(params); resultRows=resultResponse.results||[]; window.ISSApplicationResults?.mergeServerResults?.(resultRows); } catch (error) { console.warn("確認・算出結果の取得に失敗しました。",error); }
    localStorage.setItem("iss-last-data-pull-at", new Date().toISOString());
    window.dispatchEvent(new CustomEvent("iss:applications-changed"));
    window.dispatchEvent(new CustomEvent("iss:application-documents-changed"));
    return { applications: (applicationResult.applications || []).length, photos: (photoResult.photos || []).length, documents:(documentResult.documents || []).length, results:resultRows.length };
  }

  window.ISSSync = {
    getPendingCount() { return readQueue().filter(item => item.status === "pending" || item.status === "error").length; },
    pull: pullServerData,
    async run(onProgress) {
      if (!window.ISSApi?.isAuthenticated()) throw new Error("オンライン同期にはログインが必要です。");
      const queue = readQueue();
      let completed = 0;
      for (const item of queue) {
        if (!["pending", "error"].includes(item.status)) continue;
        item.status = "processing";
        item.lastAttemptAt = new Date().toISOString();
        writeQueue(queue);
        try {
          const result = await syncItem(item);
          if (result?.skipped) {
            item.status = "error";
            item.error = result.reason;
          } else {
            item.status = "completed";
            item.completedAt = new Date().toISOString();
            item.result = result || null;
            completed += 1;
          }
        } catch (error) {
          item.status = "error";
          item.error = error.message || "同期に失敗しました。";
        }
        writeQueue(queue);
        onProgress?.({ completed, total: queue.length, item });
      }
      const remaining = queue.filter(item => item.status !== "completed").length;
      let pulled = null;
      try { pulled = await pullServerData(); } catch (error) { console.warn("サーバーからの最新データ取得に失敗しました。", error); }
      return { completed, remaining, pulled };
    }
  };
})();

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/sync-manager.js": "part529" });
