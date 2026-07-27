(() => {
  "use strict";
  const KEY = "iss-improvement-requests";
  const SYNC_KEY = "iss-sync-queue";
  const $ = id => document.getElementById(id);
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const categoryLabel = value => ({feature:"機能追加",improvement:"操作・表示の改善",bug:"不具合",data:"データ・法令内容の訂正",performance:"速度・容量",other:"その他"})[value] || value;
  const priorityLabel = value => ({normal:"通常",high:"高い",urgent:"緊急"})[value] || value;
  const statusLabel = value => ({submitted:"受付済み",reviewing:"確認中",planned:"対応予定",completed:"対応完了",rejected:"対応見送り"})[value] || value;
  const currentRole = () => localStorage.getItem("iss-user-role") || "office-user";
  const isAdmin = () => ["office-admin","safety-environment-admin"].includes(currentRole());
  const formatDate = value => value ? new Date(value).toLocaleString("ja-JP") : "";
  const createId = () => `REQ-${new Date().toISOString().slice(0,10).replaceAll("-","")}-${Date.now().toString(36).toUpperCase()}`;

  async function imageToDataUrl(file) {
    if (!file) return null;
    if (file.size > 2 * 1024 * 1024) throw new Error("参考画像は2MB以下にしてください。");
    const source = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); });
    const image = await new Promise((resolve, reject) => { const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = source; });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas"); canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", .76);
  }

  function enqueue(record) {
    const mode = localStorage.getItem("iss-operation-mode") || "offline";
    if (mode === "offline") return;
    const queue = read(SYNC_KEY, []);
    queue.push({ id:`sync-${record.id}`, entity:"improvement-request", action:"create", payload:record, createdAt:new Date().toISOString(), status:"pending" });
    write(SYNC_KEY, queue.slice(-1000));
  }

  function itemHtml(item, admin = false) {
    return `<article class="feedback-item" data-id="${escapeHtml(item.id)}">
      <div class="feedback-item__head"><div><div class="feedback-badges"><span class="feedback-badge">${escapeHtml(categoryLabel(item.category))}</span><span class="feedback-badge" data-priority="${escapeHtml(item.priority)}">優先度：${escapeHtml(priorityLabel(item.priority))}</span><span class="feedback-badge" data-status="${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span></div><h3>${escapeHtml(item.title)}</h3><div class="feedback-item__meta">${escapeHtml(item.id)}／${escapeHtml(formatDate(item.createdAt))}${item.office ? `／${escapeHtml(item.office)}` : ""}${item.sender ? `／${escapeHtml(item.sender)}` : ""}</div></div></div>
      <div class="feedback-item__body"><strong>現状・問題点</strong>\n${escapeHtml(item.detail)}${item.expected ? `\n\n<strong>希望する改善内容</strong>\n${escapeHtml(item.expected)}` : ""}${item.pageUrl ? `\n\n<a href="${escapeHtml(item.pageUrl)}" target="_blank" rel="noopener" class="text-button">対象画面を開く ↗</a>` : ""}</div>
      ${item.imageData ? `<img class="feedback-item__image" src="${item.imageData}" alt="要望に添付された参考画像">` : ""}
      ${item.adminResponse ? `<div class="feedback-response"><strong>管理者からの回答</strong><br>${escapeHtml(item.adminResponse)}</div>` : ""}
      ${admin ? `<div class="feedback-admin-controls"><select data-admin-status><option value="submitted" ${item.status==="submitted"?"selected":""}>受付済み</option><option value="reviewing" ${item.status==="reviewing"?"selected":""}>確認中</option><option value="planned" ${item.status==="planned"?"selected":""}>対応予定</option><option value="completed" ${item.status==="completed"?"selected":""}>対応完了</option><option value="rejected" ${item.status==="rejected"?"selected":""}>対応見送り</option></select><input data-admin-response value="${escapeHtml(item.adminResponse || "")}" placeholder="管理者からの回答・対応方針"><button type="button" data-admin-save>更新</button></div>` : ""}
    </article>`;
  }

  function render() {
    const items = read(KEY, []).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    $("feedbackOwnList").innerHTML = items.length ? items.map(item => itemHtml(item)).join("") : '<div class="feedback-empty">この端末から送信した要望はありません。</div>';
    if (!isAdmin()) return;
    $("feedbackAdminPanel").hidden = false;
    const filter = $("feedbackStatusFilter").value;
    const filtered = filter === "all" ? items : items.filter(item => item.status === filter);
    $("feedbackAdminList").innerHTML = filtered.length ? filtered.map(item => itemHtml(item, true)).join("") : '<div class="feedback-empty">該当する要望はありません。</div>';
  }

  $("feedbackSender").value = localStorage.getItem("iss-user-display-name") || "";
  $("feedbackOffice").value = localStorage.getItem("iss-office-name") || "";
  $("useCurrentPage").addEventListener("click", () => { $("feedbackPageUrl").value = document.referrer || location.href; });
  $("feedbackForm").addEventListener("submit", async event => {
    event.preventDefault();
    const message = $("feedbackMessage"); message.className = "feedback-message"; message.textContent = "送信準備中です…";
    try {
      const file = $("feedbackImage").files[0];
      const record = { id:createId(), category:$("feedbackCategory").value, priority:$("feedbackPriority").value, title:$("feedbackTitle").value.trim(), detail:$("feedbackDetail").value.trim(), expected:$("feedbackExpected").value.trim(), sender:$("feedbackSender").value.trim(), office:$("feedbackOffice").value.trim(), pageUrl:$("feedbackPageUrl").value.trim(), imageData:await imageToDataUrl(file), imageName:file?.name || "", status:"submitted", adminResponse:"", createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
      const items = read(KEY, []); items.push(record); write(KEY, items); enqueue(record);
      event.target.reset(); $("feedbackSender").value = localStorage.getItem("iss-user-display-name") || ""; $("feedbackOffice").value = localStorage.getItem("iss-office-name") || "";
      message.className = "feedback-message is-ok"; message.textContent = `要望を送信しました。受付番号：${record.id}`; render();
    } catch (error) { message.className = "feedback-message is-error"; message.textContent = error.message || "送信できませんでした。"; }
  });
  $("feedbackStatusFilter").addEventListener("change", render);
  $("feedbackAdminList").addEventListener("click", event => {
    const button = event.target.closest("[data-admin-save]"); if (!button) return;
    const card = button.closest("[data-id]"); const items = read(KEY, []); const item = items.find(row => row.id === card.dataset.id); if (!item) return;
    item.status = card.querySelector("[data-admin-status]").value; item.adminResponse = card.querySelector("[data-admin-response]").value.trim(); item.updatedAt = new Date().toISOString(); write(KEY, items); render();
  });
  $("feedbackExport").addEventListener("click", () => {
    const rows = read(KEY, []); const columns = ["id","createdAt","category","priority","status","title","detail","expected","sender","office","pageUrl","adminResponse"];
    const csv = [columns.join(","), ...rows.map(row => columns.map(key => `"${String(row[key] ?? "").replaceAll('"','""')}"`).join(","))].join("\r\n");
    const blob = new Blob(["\ufeff" + csv], {type:"text/csv"}); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href=url; a.download=`改善要望_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  });
  render();
})();
