(() => {
  "use strict";

  const KEYS = {
    incidents: "iss-operations-incidents",
    drills: "iss-operations-recovery-drills",
    inspections: "iss-operations-inspection-plans",
    checks: "iss-operations-check-history"
  };
  const read = (key, fallback = []) => { try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); } catch { return fallback; } };
  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));
  const nowIso = () => new Date().toISOString();
  const uid = prefix => `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const byId = id => document.getElementById(id);
  const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
  const fmt = value => { if (!value) return "-"; try { return new Intl.DateTimeFormat("ja-JP", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(value)); } catch { return value; } };
  const localValue = date => { const d = date instanceof Date ? date : new Date(date); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16); };
  const role = () => localStorage.getItem("iss-user-role") || "office-user";
  const canManage = () => ["office-admin", "admin", "safety-environment-admin"].includes(role());
  const actor = () => localStorage.getItem("iss-user-name") || "利用者";
  const officeId = () => window.ISSStorage?.getOfficeId?.() || localStorage.getItem("iss-office-id") || "office-kawasaki";
  const officeName = () => window.ISSStorage?.getOfficeName?.() || localStorage.getItem("iss-office-name") || "川崎事業所";
  const isOverdue = due => Boolean(due && new Date(due).getTime() < Date.now());

  function setMessage(id, text, error = false) {
    const node = byId(id); if (!node) return; node.textContent = text; node.classList.toggle("is-error", error);
  }
  function download(filename, content, type = "application/json") {
    const blob = new Blob([content], { type }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 500);
  }
  function csv(rows) {
    return "\ufeff" + rows.map(row => row.map(cell => { const text = String(cell ?? ""); return /[",\n]/.test(text) ? `"${text.replaceAll('"','""')}"` : text; }).join(",")).join("\r\n");
  }
  function scoped(items) {
    if (["admin", "safety-environment-admin"].includes(role())) return items;
    return items.filter(item => item.officeId === officeId());
  }

  async function sha256(value) {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    if (!crypto?.subtle) return "unsupported";
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(hash)).map(v => v.toString(16).padStart(2,"0")).join("");
  }

  async function runCheck() {
    const results = [];
    const add = (id, label, status, detail) => results.push({ id, label, status, detail });
    let storageBytes = 0;
    for (let i=0;i<localStorage.length;i+=1) { const key = localStorage.key(i); storageBytes += (key?.length || 0) + (localStorage.getItem(key)?.length || 0); }
    add("browser-storage", "ブラウザ保存容量", storageBytes < 4 * 1024 * 1024 ? "pass" : storageBytes < 8 * 1024 * 1024 ? "warning" : "fail", `${(storageBytes / 1024 / 1024).toFixed(2)}MBを使用`);
    const mode = localStorage.getItem("iss-operation-mode") || "offline";
    const endpoint = localStorage.getItem("iss-server-endpoint") || "";
    add("operation-mode", "運用方式", mode === "offline" || endpoint ? "pass" : "warning", `${mode}${endpoint ? ` / ${endpoint}` : " / 接続先未設定"}`);
    const queue = read("iss-sync-queue", []);
    const pending = queue.filter(item => item.status !== "completed").length;
    add("sync-queue", "同期キュー", pending === 0 ? "pass" : pending < 20 ? "warning" : "fail", `未完了 ${pending}件`);
    const backups = read("iss-system-backup-history", []);
    const lastBackup = backups[0]?.createdAt || localStorage.getItem("iss-last-system-backup-at");
    const days = lastBackup ? (Date.now() - new Date(lastBackup).getTime()) / 86400000 : Infinity;
    add("backup", "バックアップ", days <= 31 ? "pass" : days <= 90 ? "warning" : "fail", lastBackup ? `最終 ${fmt(lastBackup)}` : "履歴なし");
    const releases = read("iss-production-release-decisions", []);
    add("release", "リリース判定", releases.some(item => ["approved","released"].includes(item.status)) ? "pass" : "warning", releases.length ? `判定記録 ${releases.length}件` : "承認済み判定なし");
    const incidents = scoped(read(KEYS.incidents, []));
    const criticalOpen = incidents.filter(item => item.severity === "critical" && item.status !== "closed").length;
    add("critical-incidents", "重大障害", criticalOpen === 0 ? "pass" : "fail", `未完了 ${criticalOpen}件`);
    const overall = results.some(item => item.status === "fail") ? "fail" : results.some(item => item.status === "warning") ? "warning" : "pass";
    const report = { schemaVersion:"1.0", id:uid("operation-check"), checkedAt:nowIso(), checkedBy:actor(), officeId:officeId(), officeName:officeName(), overall, results };
    report.verificationHash = await sha256({ ...report, verificationHash:undefined });
    const history = read(KEYS.checks, []); history.unshift(report); write(KEYS.checks, history.slice(0,100));
    window.__latestOperationalCheck = report;
    renderCheck(report); renderSummary();
    byId("exportOperationalCheck").disabled = false; byId("exportOperationalCheckCsv").disabled = false;
  }

  function renderCheck(report) {
    const labels = { pass:"正常", warning:"要確認", fail:"要修正" };
    byId("operationalCheckList").innerHTML = report.results.map(item => `<div class="operations-check is-${item.status}"><span class="operations-check__mark">${item.status === "pass" ? "●" : "▲"}</span><div><strong>${esc(item.label)}：${labels[item.status]}</strong><small>${esc(item.detail)}</small></div></div>`).join("");
    setMessage("operationalCheckMessage", `点検完了：${labels[report.overall]}／${fmt(report.checkedAt)}`, report.overall === "fail");
  }

  function renderSummary() {
    const incidents = scoped(read(KEYS.incidents, []));
    const inspections = scoped(read(KEYS.inspections, []));
    const drills = scoped(read(KEYS.drills, []));
    const open = incidents.filter(item => item.status !== "closed");
    const overdue = open.filter(item => isOverdue(item.dueAt)).length + inspections.filter(item => item.status !== "completed" && isOverdue(item.dueAt)).length;
    const latestCheck = read(KEYS.checks, [])[0];
    byId("operationsOverall").textContent = latestCheck ? ({pass:"正常",warning:"要確認",fail:"要修正"}[latestCheck.overall] || "未確認") : "未確認";
    byId("openIncidentCount").textContent = `${open.length}件`;
    byId("overdueCount").textContent = `${overdue}件`;
    byId("lastInspectionAt").textContent = fmt(inspections.filter(i => i.completedAt).sort((a,b)=>String(b.completedAt).localeCompare(String(a.completedAt)))[0]?.completedAt);
    byId("lastDrillAt").textContent = fmt(drills.sort((a,b)=>String(b.performedAt).localeCompare(String(a.performedAt)))[0]?.performedAt);
  }

  function createIncident() {
    if (!canManage()) return setMessage("incidentMessage", "登録権限は事業所管理者または管理者のみです。", true);
    const title = byId("incidentTitle").value.trim(); const description = byId("incidentDescription").value.trim();
    if (!title || !description) return setMessage("incidentMessage", "件名と発生内容を入力してください。", true);
    const incidents = read(KEYS.incidents, []);
    incidents.unshift({ id:uid("incident"), title, severity:byId("incidentSeverity").value, occurredAt:byId("incidentOccurredAt").value ? new Date(byId("incidentOccurredAt").value).toISOString() : nowIso(), dueAt:byId("incidentDueAt").value ? new Date(byId("incidentDueAt").value).toISOString() : "", reportedBy:byId("incidentReportedBy").value.trim() || actor(), assignee:byId("incidentAssignee").value.trim(), description, workaround:byId("incidentWorkaround").value.trim(), status:"open", officeId:officeId(), officeName:officeName(), createdAt:nowIso(), history:[{at:nowIso(),by:actor(),action:"created",note:"障害記録を登録"}] });
    write(KEYS.incidents, incidents); ["incidentTitle","incidentDescription","incidentWorkaround","incidentAssignee"].forEach(id => byId(id).value=""); setMessage("incidentMessage","障害記録を登録しました。"); renderAll();
  }

  function incidentAction(id, action) {
    if (!canManage()) return alert("操作権限は事業所管理者または管理者のみです。");
    const incidents = read(KEYS.incidents, []); const item = incidents.find(row => row.id === id); if (!item) return;
    const transitions = { investigate:"investigating", recover:"recovering", complete:"review", close:"closed", reopen:"investigating" };
    const note = prompt(action === "close" ? "完了確認内容を入力してください。" : action === "complete" ? "原因・恒久対応・復旧結果を入力してください。" : "処理内容を入力してください。", "");
    if (note === null || !note.trim()) return;
    if (action === "close" && item.resolvedBy && item.resolvedBy === actor()) return alert("対応完了者本人による自己完了確認はできません。");
    item.status = transitions[action] || item.status; item.updatedAt = nowIso();
    if (action === "complete") { item.resolution = note.trim(); item.resolvedBy = actor(); item.resolvedAt = nowIso(); }
    if (action === "close") { item.reviewedBy = actor(); item.reviewedAt = nowIso(); item.reviewNote = note.trim(); item.closedAt = nowIso(); }
    item.history = [...(item.history || []), { at:nowIso(), by:actor(), action, note:note.trim() }]; write(KEYS.incidents, incidents); renderAll();
  }

  function renderIncidents() {
    const q = byId("incidentFilter").value.trim().toLowerCase(); const status = byId("incidentStatusFilter").value; const severity = byId("incidentSeverityFilter").value;
    const items = scoped(read(KEYS.incidents, [])).filter(item => (!status || item.status === status) && (!severity || item.severity === severity) && (!q || [item.title,item.description,item.assignee,item.resolution,item.workaround].join(" ").toLowerCase().includes(q)));
    byId("incidentList").innerHTML = items.length ? items.map(item => `<article class="operations-card ${item.status !== "closed" && isOverdue(item.dueAt) ? "is-overdue" : ""}"><div class="operations-card__header"><div><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p></div><span class="operations-badge ${item.severity}">${esc({critical:"重大",high:"高",medium:"中",low:"低"}[item.severity])}</span></div><dl class="operations-meta"><div><dt>状態</dt><dd>${esc({open:"受付",investigating:"調査中",recovering:"復旧対応中",review:"完了確認待ち",closed:"完了"}[item.status])}</dd></div><div><dt>発生日時</dt><dd>${fmt(item.occurredAt)}</dd></div><div><dt>対応期限</dt><dd>${fmt(item.dueAt)}${item.status !== "closed" && isOverdue(item.dueAt) ? "（超過）" : ""}</dd></div><div><dt>担当者</dt><dd>${esc(item.assignee || "未割当")}</dd></div><div><dt>暫定対応</dt><dd>${esc(item.workaround || "未登録")}</dd></div><div><dt>恒久対応</dt><dd>${esc(item.resolution || "未登録")}</dd></div></dl><div class="operations-card__actions">${item.status === "open" ? `<button data-incident="${item.id}" data-action="investigate">調査開始</button>` : ""}${["open","investigating"].includes(item.status) ? `<button data-incident="${item.id}" data-action="recover">復旧対応</button>` : ""}${["investigating","recovering"].includes(item.status) ? `<button data-incident="${item.id}" data-action="complete">対応完了を申請</button>` : ""}${item.status === "review" ? `<button data-incident="${item.id}" data-action="close">別担当者が完了確認</button>` : ""}${item.status === "closed" ? `<button data-incident="${item.id}" data-action="reopen">再開</button>` : ""}</div></article>`).join("") : '<p class="empty-state">該当する障害記録はありません。</p>';
    document.querySelectorAll("[data-incident]").forEach(btn => btn.addEventListener("click",()=>incidentAction(btn.dataset.incident, btn.dataset.action)));
  }

  function createDrill() {
    if (!canManage()) return setMessage("drillMessage", "登録権限は事業所管理者または管理者のみです。", true);
    const performedBy = byId("drillPerformedBy").value.trim() || actor(); const reviewedBy = byId("drillReviewedBy").value.trim();
    if (!byId("drillScenario").value.trim() || !byId("drillResult").value.trim() || !reviewedBy) return setMessage("drillMessage", "シナリオ、結果、確認者を入力してください。", true);
    if (performedBy === reviewedBy) return setMessage("drillMessage", "実施者本人による自己確認はできません。", true);
    const drills = read(KEYS.drills, []); drills.unshift({ id:uid("drill"), type:byId("drillType").value, performedAt:byId("drillPerformedAt").value ? new Date(byId("drillPerformedAt").value).toISOString() : nowIso(), performedBy, reviewedBy, scenario:byId("drillScenario").value.trim(), result:byId("drillResult").value.trim(), officeId:officeId(), officeName:officeName(), createdAt:nowIso() }); write(KEYS.drills, drills); byId("drillScenario").value=""; byId("drillResult").value=""; setMessage("drillMessage","復旧訓練記録を登録しました。"); renderAll();
  }

  function renderDrills() {
    const labels={"backup-restore":"バックアップ復元","api-outage":"社内API停止","device-replacement":"端末交換","offline-operation":"オフライン継続運用",other:"その他"}; const items=scoped(read(KEYS.drills,[]));
    byId("drillList").innerHTML=items.length?items.slice(0,30).map(item=>`<article class="operations-card"><div class="operations-card__header"><div><h3>${esc(labels[item.type]||item.type)}</h3><p>${esc(item.scenario)}</p></div><span class="operations-badge low">確認済み</span></div><dl class="operations-meta"><div><dt>実施日時</dt><dd>${fmt(item.performedAt)}</dd></div><div><dt>実施者</dt><dd>${esc(item.performedBy)}</dd></div><div><dt>確認者</dt><dd>${esc(item.reviewedBy)}</dd></div></dl><p><strong>結果：</strong>${esc(item.result)}</p></article>`).join(""):'<p class="empty-state">復旧訓練記録はありません。</p>';
  }

  function createInspection() {
    if (!canManage()) return setMessage("inspectionMessage", "登録権限は事業所管理者または管理者のみです。", true);
    const name=byId("inspectionName").value.trim(), dueAt=byId("inspectionDueAt").value, items=byId("inspectionItems").value.trim(); if(!name||!dueAt||!items) return setMessage("inspectionMessage","点検名称、次回期限、点検内容を入力してください。",true);
    const plans=read(KEYS.inspections,[]); plans.unshift({id:uid("inspection"),name,frequency:byId("inspectionFrequency").value,dueAt:new Date(`${dueAt}T23:59:59`).toISOString(),owner:byId("inspectionOwner").value.trim()||actor(),items,status:"planned",officeId:officeId(),officeName:officeName(),createdAt:nowIso(),history:[]}); write(KEYS.inspections,plans); byId("inspectionName").value=""; byId("inspectionItems").value=""; setMessage("inspectionMessage","定期点検計画を登録しました。"); renderAll();
  }

  function nextDue(date, frequency) { const d=new Date(date); if(frequency==="monthly") d.setMonth(d.getMonth()+1); else if(frequency==="quarterly") d.setMonth(d.getMonth()+3); else if(frequency==="semiannual") d.setMonth(d.getMonth()+6); else if(frequency==="annual") d.setFullYear(d.getFullYear()+1); else return ""; return d.toISOString(); }
  function inspectionAction(id, action) {
    if(!canManage()) return alert("操作権限は事業所管理者または管理者のみです。"); const plans=read(KEYS.inspections,[]), item=plans.find(row=>row.id===id); if(!item)return;
    if(action==="complete"){const result=prompt("点検結果、異常の有無、対応内容を入力してください。",""); if(!result?.trim())return; item.lastResult=result.trim(); item.completedAt=nowIso(); item.completedBy=actor(); item.status="completed"; item.history=[...(item.history||[]),{at:nowIso(),by:actor(),action:"completed",note:result.trim()}];}
    if(action==="next"){const due=nextDue(item.dueAt,item.frequency); if(!due)return alert("任意周期は次回期限を手動登録してください。"); item.dueAt=due; item.status="planned"; item.history=[...(item.history||[]),{at:nowIso(),by:actor(),action:"next-scheduled",note:`次回期限 ${due}`}];}
    write(KEYS.inspections,plans); renderAll();
  }

  function renderInspections() {
    const labels={monthly:"月次",quarterly:"四半期",semiannual:"半期",annual:"年次",custom:"任意"}; const items=scoped(read(KEYS.inspections,[]));
    byId("inspectionList").innerHTML=items.length?items.map(item=>`<article class="operations-card ${item.status!=="completed"&&isOverdue(item.dueAt)?"is-overdue":""}"><div class="operations-card__header"><div><h3>${esc(item.name)}</h3><p>${esc(item.items)}</p></div><span class="operations-badge ${item.status==="completed"?"low":"medium"}">${item.status==="completed"?"実施済み":"計画中"}</span></div><dl class="operations-meta"><div><dt>周期</dt><dd>${esc(labels[item.frequency]||item.frequency)}</dd></div><div><dt>次回期限</dt><dd>${fmt(item.dueAt)}${item.status!=="completed"&&isOverdue(item.dueAt)?"（超過）":""}</dd></div><div><dt>担当者</dt><dd>${esc(item.owner)}</dd></div><div><dt>最終実施</dt><dd>${fmt(item.completedAt)}</dd></div><div><dt>実施者</dt><dd>${esc(item.completedBy||"-")}</dd></div><div><dt>結果</dt><dd>${esc(item.lastResult||"未実施")}</dd></div></dl><div class="operations-card__actions">${item.status!=="completed"?`<button data-inspection="${item.id}" data-action="complete">点検実施を記録</button>`:`<button data-inspection="${item.id}" data-action="next">次回を設定</button>`}</div></article>`).join(""):'<p class="empty-state">定期点検計画はありません。</p>';
    document.querySelectorAll("[data-inspection]").forEach(btn=>btn.addEventListener("click",()=>inspectionAction(btn.dataset.inspection,btn.dataset.action)));
  }

  function exportLedger(kind) {
    if(kind==="incident") { const items=scoped(read(KEYS.incidents,[])); download(`incident-ledger-${new Date().toISOString().slice(0,10)}.csv`,csv([["ID","事業所","件名","重要度","状態","発生日時","期限","担当者","発生内容","暫定対応","恒久対応","完了確認者"],...items.map(i=>[i.id,i.officeName,i.title,i.severity,i.status,fmt(i.occurredAt),fmt(i.dueAt),i.assignee,i.description,i.workaround,i.resolution,i.reviewedBy])]),"text/csv;charset=utf-8"); }
    if(kind==="drill") { const items=scoped(read(KEYS.drills,[])); download(`recovery-drill-ledger-${new Date().toISOString().slice(0,10)}.csv`,csv([["ID","事業所","種別","実施日時","実施者","確認者","シナリオ","結果"],...items.map(i=>[i.id,i.officeName,i.type,fmt(i.performedAt),i.performedBy,i.reviewedBy,i.scenario,i.result])]),"text/csv;charset=utf-8"); }
    if(kind==="inspection") { const items=scoped(read(KEYS.inspections,[])); download(`inspection-ledger-${new Date().toISOString().slice(0,10)}.csv`,csv([["ID","事業所","名称","周期","状態","期限","担当者","最終実施","結果"],...items.map(i=>[i.id,i.officeName,i.name,i.frequency,i.status,fmt(i.dueAt),i.owner,fmt(i.completedAt),i.lastResult])]),"text/csv;charset=utf-8"); }
  }

  async function exportMonthlyReport() {
    const month=new Date().toISOString().slice(0,7), incidents=scoped(read(KEYS.incidents,[])), drills=scoped(read(KEYS.drills,[])), inspections=scoped(read(KEYS.inspections,[])); const report={schemaVersion:"1.0",reportId:uid("operations-monthly"),month,generatedAt:nowIso(),generatedBy:actor(),officeId:officeId(),officeName:officeName(),summary:{incidentTotal:incidents.filter(i=>String(i.occurredAt).startsWith(month)).length,incidentOpen:incidents.filter(i=>i.status!=="closed").length,criticalOpen:incidents.filter(i=>i.status!=="closed"&&i.severity==="critical").length,drillCount:drills.filter(i=>String(i.performedAt).startsWith(month)).length,inspectionCompleted:inspections.filter(i=>String(i.completedAt).startsWith(month)).length,inspectionOverdue:inspections.filter(i=>i.status!=="completed"&&isOverdue(i.dueAt)).length},incidents,drills,inspections}; report.verificationHash=await sha256({...report,verificationHash:undefined}); download(`operations-monthly-report-${month}.json`,JSON.stringify(report,null,2));
  }

  function renderAll(){renderSummary();renderIncidents();renderDrills();renderInspections();}
  byId("runOperationalCheck").addEventListener("click",runCheck);
  byId("exportOperationalCheck").addEventListener("click",()=>{const r=window.__latestOperationalCheck;if(r)download(`${r.id}.json`,JSON.stringify(r,null,2));});
  byId("exportOperationalCheckCsv").addEventListener("click",()=>{const r=window.__latestOperationalCheck;if(r)download(`${r.id}.csv`,csv([["項目","判定","詳細"],...r.results.map(i=>[i.label,i.status,i.detail])]),"text/csv;charset=utf-8");});
  byId("createIncident").addEventListener("click",createIncident); byId("createDrill").addEventListener("click",createDrill); byId("createInspectionPlan").addEventListener("click",createInspection);
  byId("exportIncidentLedger").addEventListener("click",()=>exportLedger("incident")); byId("exportDrillLedger").addEventListener("click",()=>exportLedger("drill")); byId("exportInspectionLedger").addEventListener("click",()=>exportLedger("inspection")); byId("exportOperationsMonthlyReport").addEventListener("click",exportMonthlyReport);
  ["incidentFilter","incidentStatusFilter","incidentSeverityFilter"].forEach(id=>byId(id).addEventListener(id==="incidentFilter"?"input":"change",renderIncidents));
  byId("incidentOccurredAt").value=localValue(new Date()); byId("incidentDueAt").value=localValue(new Date(Date.now()+3*86400000)); byId("drillPerformedAt").value=localValue(new Date()); byId("inspectionDueAt").value=new Date(Date.now()+30*86400000).toISOString().slice(0,10); byId("incidentReportedBy").value=actor(); byId("drillPerformedBy").value=actor();
  const latest=read(KEYS.checks,[])[0]; if(latest){window.__latestOperationalCheck=latest;renderCheck(latest);byId("exportOperationalCheck").disabled=false;byId("exportOperationalCheckCsv").disabled=false;} renderAll();
})();
