(() => {
  "use strict";
  const KEY = "skChangeReleaseGovernancePart252";
  const $ = id => document.getElementById(id);
  const nowIso = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  let state = { version: "Part 252", requests: [], updatedAt: null };
  try { state = {...state, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; } catch {}

  const save = () => {
    state.updatedAt = nowIso();
    localStorage.setItem(KEY, JSON.stringify(state));
    $("changeGovernanceStatus").textContent = `最終保存：${new Date(state.updatedAt).toLocaleString("ja-JP")}`;
    render();
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));
  const typeText = value => ({feature:"機能追加",improvement:"改善",defect:"不具合修正",regulation:"法令・データ更新",security:"セキュリティ",performance:"性能・容量",retirement:"廃止・置換",document:"文書更新"}[value] || value);
  const decisionText = value => ({pending:"保留",approved:"承認",rejected:"却下",emergency:"緊急対応承認"}[value] || "未評価");
  const releaseText = value => ({draft:"準備中",testing:"試験中",candidate:"リリース候補",cancelled:"中止"}[value] || "未設定");

  function renderSelect(select, filter = () => true) {
    const current = select.value;
    select.innerHTML = `<option value="">選択してください</option>` + state.requests.filter(filter).map(r => `<option value="${escapeHtml(r.id)}">${escapeHtml(r.id)}｜${escapeHtml(r.title)}</option>`).join("");
    if ([...select.options].some(o => o.value === current)) select.value = current;
  }
  function render() {
    const list = $("changeRequestList");
    list.innerHTML = state.requests.length ? state.requests.map(r => `
      <article class="certificate-corrective-card ${r.priority === "urgent" ? "is-overdue" : ""}">
        <div class="certificate-corrective-card__head"><div><span class="application-number">${escapeHtml(r.id)}</span><h3>${escapeHtml(r.title)}</h3></div><span class="record-status">${escapeHtml(typeText(r.type))}</span></div>
        <p>${escapeHtml(r.description)}</p>
        <p><strong>対象：</strong>${escapeHtml(r.targetArea || "未設定")}　<strong>優先度：</strong>${escapeHtml(r.priority)}　<strong>希望日：</strong>${escapeHtml(r.requestedDate || "未設定")}</p>
        <p><strong>承認：</strong>${escapeHtml(decisionText(r.assessment?.decision))}　<strong>候補：</strong>${escapeHtml(releaseText(r.release?.decision))}</p>
        <div class="management-actions"><button type="button" data-remove-request="${escapeHtml(r.id)}">取消し</button></div>
      </article>`).join("") : `<p class="empty-state">登録された変更要求はありません。</p>`;
    renderSelect($("assessmentRequest"));
    renderSelect($("releaseRequest"), r => ["approved","emergency"].includes(r.assessment?.decision));
    const counts = {
      total: state.requests.length,
      pending: state.requests.filter(r => !r.assessment || r.assessment.decision === "pending").length,
      approved: state.requests.filter(r => ["approved","emergency"].includes(r.assessment?.decision)).length,
      candidate: state.requests.filter(r => r.release?.decision === "candidate").length,
      retirement: state.requests.filter(r => r.type === "retirement").length
    };
    $("releaseSummary").innerHTML = [
      ["変更要求", counts.total, "登録件数"], ["評価待ち・保留", counts.pending, "要確認"], ["承認済み", counts.approved, "実装・試験対象"], ["リリース候補", counts.candidate, "候補化済み"], ["廃止・置換", counts.retirement, "互換性確認対象"]
    ].map(([label,value,note]) => `<article class="admin-summary-card"><strong>${label}</strong><span>${value}</span><small>${note}</small></article>`).join("");
    $("changeGovernanceStatus").textContent = state.updatedAt ? `最終保存：${new Date(state.updatedAt).toLocaleString("ja-JP")}` : "未保存";
  }

  $("addChangeRequest").addEventListener("click", () => {
    const title = $("changeTitle").value.trim();
    const description = $("changeDescription").value.trim();
    if (!title || !description) return alert("変更件名と要求内容・理由を入力してください。");
    state.requests.unshift({
      id: uid("CHG"), title, type: $("changeType").value, targetArea: $("targetArea").value.trim(), description,
      priority: $("priority").value, requestedDate: $("requestedDate").value, requester: $("requester").value.trim(), createdAt: nowIso()
    });
    ["changeTitle","targetArea","changeDescription","requestedDate","requester"].forEach(id => $(id).value = "");
    save();
  });
  $("changeRequestList").addEventListener("click", event => {
    const id = event.target.dataset.removeRequest;
    if (!id || !confirm("この変更要求を取り消しますか。")) return;
    state.requests = state.requests.filter(r => r.id !== id);
    save();
  });
  $("saveAssessment").addEventListener("click", () => {
    const request = state.requests.find(r => r.id === $("assessmentRequest").value);
    if (!request) return alert("対象変更要求を選択してください。");
    if (!$("impactAssessment").value.trim() || !$("riskAssessment").value.trim()) return alert("影響範囲とリスク・対策を入力してください。");
    request.assessment = {impact: $("impactAssessment").value.trim(), risk: $("riskAssessment").value.trim(), decision: $("approvalDecision").value, notes: $("approvalNotes").value.trim(), assessedAt: nowIso()};
    save();
  });
  $("saveReleasePlan").addEventListener("click", () => {
    const request = state.requests.find(r => r.id === $("releaseRequest").value);
    if (!request) return alert("承認済みの変更要求を選択してください。");
    const decision = $("releaseDecision").value;
    if (decision === "candidate" && (!$("releaseCandidate").value.trim() || !$("testPlan").value.trim() || !$("testResult").value.trim())) return alert("リリース候補化には候補版、テスト計画、テスト結果が必要です。");
    request.release = {candidate: $("releaseCandidate").value.trim(), testPlan: $("testPlan").value.trim(), testResult: $("testResult").value.trim(), decision, rollbackRetirement: $("rollbackRetirement").value.trim(), updatedAt: nowIso()};
    save();
  });
  $("exportChangeRegister").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {type:"application/json"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `Part252_変更要求・次期版管理_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
  });
  render();
})();
