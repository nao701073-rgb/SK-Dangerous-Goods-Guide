(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const form = $("applicationForm"), filter = $("applicationFilter"), statusFilter = $("applicationStatusFilter"), yearFilter = $("applicationYearFilter"), sortSelect = $("applicationSort");
  const list = $("applicationList"), message = $("applicationMessage"), scopeSelect = $("applicationScope");
  const officeFilter = $("applicationOfficeFilter"), registrationOffice = $("registrationOffice"), registrationOfficeField = $("registrationOfficeField");
  const roleBadge = $("currentRoleBadge"), officeSummary = $("officeSummary"), statusSummary = $("applicationStatusSummary"), editingId = $("editingApplicationId");
  const submitButton = $("applicationSubmitButton"), cancelEditButton = $("applicationEditCancel");
  const savedViewSelect = $("savedApplicationView"), displaySettings = $("applicationDisplaySettings");
  const resultCount = $("applicationResultCount"), activeFilters = $("applicationActiveFilters");
  const unCandidatePanel = $("unCandidatePanel"), unCandidateSelect = $("unCandidateSelect"), unCandidatePreview = $("unCandidatePreview"), unCandidateMessage = $("unCandidateMessage");
  const VIEW_KEY = "iss-application-saved-views-v1", DISPLAY_KEY = "iss-application-display-v1";
  const fields = {
    year: $("applicationYear"), mode: $("applicationNumberMode"), number: $("applicationNumber"), tempNumber: $("temporaryApplicationNumber"),
    status: $("applicationStatus"), assignee: $("applicationAssignee"), containerNumber: $("containerNumber"), vesselName: $("vesselName"),
    voyageNumber: $("voyageNumber"), unNumber: $("unNumber"), japaneseName: $("japaneseName"), englishName: $("englishName"),
    hazardClass: $("hazardClass"), subsidiary: $("subsidiaryHazardClasses"), packingGroup: $("packingGroup"), applicationDate: $("applicationDate"),
    plannedDate: $("inspectionPlannedDate"), inspectionDate: $("inspectionDate"), caseTitle: $("caseTitle"), note: $("applicationNote")
  };
  const statusLabels = { draft:"下書き", received:"受付済み", in_progress:"対応中", completed:"完了", cancelled:"取消", active:"対応中", review:"対応中", archived:"取消" };
  const escapeHtml = v => String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");
  const formatDate = iso => { if (!iso) return ""; try { return new Intl.DateTimeFormat("ja-JP",{year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(iso)); } catch { return iso; } };
  const selectedValues = select => [...select.selectedOptions].map(o=>o.value).filter(Boolean);
  const hazardClassMaster = window.HAZARD_CLASS_MASTER || {};
  const hazardClassLabels = hazardClassMaster.labels || {};
  const hazardClassLabel = value => hazardClassLabels[String(value || "").trim()] || String(value || "").trim();
  const displayHazard = item => item.hazardClass ? `等級 ${hazardClassLabel(item.hazardClass)}${item.subsidiaryHazardClasses?.length ? `（副次危険性等級 ${item.subsidiaryHazardClasses.join("/")}）` : ""}` : "";
  const displayNumber = item => item.numberType === "temporary" ? (item.temporaryNumber || item.applicationNumber) : item.applicationNumber;
  const showMessage = (text,error=false) => { message.textContent=text; message.classList.toggle("is-error",error); };
  const canWrite = () => window.ISSStorage.canWriteOperationalData?.() !== false;
  const canDelete = () => window.ISSStorage.canDeleteOperationalData?.() !== false;
  const currentYear = () => String(new Date().getFullYear());

  const defaultDisplaySettings = {assignee:true,container:true,vessel:true,dangerous:true,counts:true,updated:true};
  function readJsonStorage(key,fallback){try{return JSON.parse(localStorage.getItem(key)||"")||fallback;}catch{return fallback;}}
  function getDisplaySettings(){return {...defaultDisplaySettings,...readJsonStorage(DISPLAY_KEY,{})};}
  function saveDisplaySettings(value){localStorage.setItem(DISPLAY_KEY,JSON.stringify(value));}
  function applyDisplaySettingsToControls(){const settings=getDisplaySettings();document.querySelectorAll("[data-application-display]").forEach(input=>{input.checked=settings[input.dataset.applicationDisplay]!==false;});}
  function getSavedViews(){const value=readJsonStorage(VIEW_KEY,[]);return Array.isArray(value)?value:[];}
  function setSavedViews(value){localStorage.setItem(VIEW_KEY,JSON.stringify(value));renderSavedViews();}
  function renderSavedViews(){if(!savedViewSelect)return;const selected=savedViewSelect.value;savedViewSelect.innerHTML='<option value="">保存した表示条件</option>'+getSavedViews().map(v=>`<option value="${escapeHtml(v.id)}">${escapeHtml(v.name)}</option>`).join("")+ (getSavedViews().length?'<option value="__delete__">選択中の条件を削除…</option>':'');if([...savedViewSelect.options].some(o=>o.value===selected))savedViewSelect.value=selected;}
  function currentViewState(){return {query:filter.value,status:statusFilter.value,year:yearFilter.value,sort:sortSelect.value,scope:scopeSelect.value,office:officeFilter.value};}
  function applyViewState(state){if(!state)return;filter.value=state.query||"";statusFilter.value=state.status||"";sortSelect.value=state.sort||"updated-desc";if(window.ISSStorage.isSafetyEnvironment()){scopeSelect.value=state.scope||scopeSelect.value;officeFilter.disabled=scopeSelect.value!=="all";officeFilter.value=state.office||officeFilter.value;}render();if(state.year&&[...yearFilter.options].some(o=>o.value===state.year)){yearFilter.value=state.year;render();}}


  const allowedSubsidiaryClasses = new Set(["1","2.1","3","4.1","4.2","4.3","5.1","6.1","8"]);
  const normalizeUnNumber = value => String(value||"").replace(/\D/g,"").padStart(4,"0").slice(-4);
  const normalizeSubsidiary = value => String(value||"").split("/").map(v=>v.trim()).filter(Boolean).map(v=>/^1(?:\.[1-6])?$/.test(v)?"1":v).filter(v=>allowedSubsidiaryClasses.has(v)).filter((v,i,a)=>a.indexOf(v)===i);
  function getUnCandidates(){
    const un=normalizeUnNumber(fields.unNumber.value);
    if(!/^\d{4}$/.test(un))return [];
    return (window.UN_DATABASE||[]).filter(row=>String(row.unNumber||"").padStart(4,"0")===un);
  }
  function renderUnCandidate(){
    const rows=getUnCandidates();
    if(!rows.length){unCandidatePanel.hidden=false;unCandidateSelect.innerHTML="";unCandidatePreview.innerHTML='<p class="empty-state-inline">該当する候補が見つかりませんでした。</p>';unCandidateMessage.textContent="";return;}
    unCandidatePanel.hidden=false;
    unCandidateSelect.innerHTML=rows.map((row,index)=>`<option value="${index}">${escapeHtml(row.properShippingNameJa||row.properShippingName||`UN${row.unNumber}`)}${row.packingGroup&&row.packingGroup!=="-"?`／容器等級${escapeHtml(row.packingGroup)}`:""}</option>`).join("");
    const update=()=>{const row=rows[Number(unCandidateSelect.value)||0];const subs=normalizeSubsidiary(row.subsidiaryRisk);unCandidatePreview.innerHTML=`<dl><div><dt>日本語名</dt><dd>${escapeHtml(row.properShippingNameJa||"―")}</dd></div><div><dt>英語名</dt><dd>${escapeHtml(row.properShippingName||"―")}</dd></div><div><dt>等級</dt><dd>${escapeHtml(row.class||"―")}</dd></div><div><dt>副次危険性等級</dt><dd>${escapeHtml(subs.join("/")||"―")}</dd></div><div><dt>容器等級</dt><dd>${escapeHtml(row.packingGroup&&row.packingGroup!=="-"?row.packingGroup:"―")}</dd></div></dl>`;};
    unCandidateSelect.onchange=update;update();unCandidateMessage.textContent=`${rows.length}件の候補があります。`;
  }
  function applyUnCandidate(){
    const rows=getUnCandidates(), row=rows[Number(unCandidateSelect.value)||0];if(!row)return;
    const enabled=name=>document.querySelector(`[data-un-apply="${name}"]`)?.checked;
    if(enabled("japaneseName"))fields.japaneseName.value=row.properShippingNameJa||"";
    if(enabled("englishName"))fields.englishName.value=row.properShippingName||"";
    if(enabled("hazardClass"))fields.hazardClass.value=row.class||"";
    if(enabled("subsidiary")){const values=normalizeSubsidiary(row.subsidiaryRisk);[...fields.subsidiary.options].forEach(option=>option.selected=values.includes(option.value));}
    if(enabled("packingGroup"))fields.packingGroup.value=row.packingGroup&&row.packingGroup!=="-"?row.packingGroup:"";
    unCandidateMessage.textContent="選択した項目を反映しました。";
  }

  function toggleNumberMode(){ const temp=fields.mode.value==="temporary"; $("officialApplicationNumberField").hidden=temp; $("temporaryApplicationNumberField").hidden=!temp; fields.number.required=!temp; }
  function populateOrganizationControls(){
    const offices=window.ISSOrganization.getOfficeOptions(), current=window.ISSStorage.getCurrentContext();
    const options=offices.map(o=>`<option value="${escapeHtml(o.id)}">${escapeHtml(o.blockName)}｜${escapeHtml(o.name)}</option>`).join("");
    officeFilter.innerHTML=`<option value="">すべての事業所</option>${options}`; registrationOffice.innerHTML=options;
    officeFilter.value=current.officeId; registrationOffice.value=current.officeId;
    const admin=current.canViewAllOffices, writable=canWrite(); scopeSelect.value=admin?"all":"office";
    scopeSelect.querySelector('[value="all"]').disabled=!admin; officeFilter.disabled=!admin; registrationOffice.disabled=!admin||!writable; registrationOfficeField.hidden=!admin||!writable;
    roleBadge.textContent=current.role==="safety-environment-admin"?"システム管理者｜全事業所管理":`${current.blockName}｜${current.officeName}`;
    form.hidden=!writable; $("applicationPhotoSection")?.toggleAttribute("hidden",!writable);
  }
  function currentApplications(){ if(window.ISSStorage.isSafetyEnvironment()&&scopeSelect.value==="all"){ const all=window.ISSStorage.getApplications({scope:"all"}); return officeFilter.value?all.filter(i=>i.officeId===officeFilter.value):all; } return window.ISSStorage.getApplications({scope:"office",officeId:window.ISSStorage.getOfficeId()}); }
  function filteredApplications(){
    const q=filter.value.trim().toLowerCase(), st=statusFilter?.value||"", year=yearFilter?.value||"";
    const rows=currentApplications().filter(i=>{
      if(st && (i.status||"in_progress")!==st)return false;
      if(year && String(i.applicationYear||"")!==year)return false;
      const h=[i.applicationYear,displayNumber(i),i.containerNumber,i.vesselName,i.voyageNumber,i.unNumber,i.japaneseName,i.englishName,i.caseTitle,i.assignee,i.note,i.office].join(" ").toLowerCase();
      return !q||h.includes(q);
    });
    const statusOrder={draft:1,received:2,in_progress:3,completed:4,cancelled:5};
    const textCompare=(a,b)=>String(a||"").localeCompare(String(b||""),"ja",{numeric:true,sensitivity:"base"});
    const dateCompare=(a,b)=>String(a||"").localeCompare(String(b||""));
    const stable=(a,b)=>textCompare(`${a.applicationYear}-${displayNumber(a)}`,`${b.applicationYear}-${displayNumber(b)}`);
    return rows.sort((a,b)=>{
      const sort=sortSelect?.value||"updated-desc";
      let result=0;
      if(sort==="year-number-asc")result=stable(a,b);
      else if(sort==="year-number-desc")result=stable(b,a);
      else if(sort==="updated-asc")result=dateCompare(a.updatedAt||a.createdAt,b.updatedAt||b.createdAt);
      else if(sort==="application-date-desc")result=dateCompare(b.applicationDate,a.applicationDate);
      else if(sort==="application-date-asc")result=dateCompare(a.applicationDate,b.applicationDate);
      else if(sort==="inspection-planned-asc")result=dateCompare(a.inspectionPlannedDate||"9999-12-31",b.inspectionPlannedDate||"9999-12-31");
      else if(sort==="inspection-planned-desc")result=dateCompare(b.inspectionPlannedDate||"",a.inspectionPlannedDate||"");
      else if(sort==="inspection-date-desc")result=dateCompare(b.inspectionDate,a.inspectionDate);
      else if(sort==="inspection-date-asc")result=dateCompare(a.inspectionDate||"9999-12-31",b.inspectionDate||"9999-12-31");
      else if(sort==="un-asc")result=textCompare(a.unNumber||"9999",b.unNumber||"9999");
      else if(sort==="un-desc")result=textCompare(b.unNumber||"",a.unNumber||"");
      else if(sort==="vessel-asc")result=textCompare(a.vesselName||"～",b.vesselName||"～");
      else if(sort==="vessel-desc")result=textCompare(b.vesselName||"",a.vesselName||"");
      else if(sort==="assignee-asc")result=textCompare(a.assignee||"～",b.assignee||"～");
      else if(sort==="assignee-desc")result=textCompare(b.assignee||"",a.assignee||"");
      else if(sort==="status")result=(statusOrder[a.status]||9)-(statusOrder[b.status]||9)||dateCompare(b.updatedAt||"",a.updatedAt||"");
      else result=dateCompare(b.updatedAt||b.createdAt||"",a.updatedAt||a.createdAt||"");
      return result||stable(a,b);
    });
  }
  function renderSummary(){
    const summaries=window.ISSStorage.getOfficeApplicationSummary();
    const visible=window.ISSStorage.isSafetyEnvironment()?summaries:summaries.filter(i=>i.officeId===window.ISSStorage.getOfficeId());
    officeSummary.innerHTML=visible.map(i=>`<article class="office-summary-card"><strong>${escapeHtml(i.officeName)}</strong><span>${i.applicationCount}</span><small>申請番号／写真 ${i.photoCount}件</small></article>`).join("");
    const apps=currentApplications(), statuses=["draft","received","in_progress","completed","cancelled"];
    statusSummary.innerHTML=statuses.map(st=>`<button type="button" data-summary-status="${st}" class="application-status-card${statusFilter.value===st?" is-active":""}"><strong>${escapeHtml(statusLabels[st])}</strong><span>${apps.filter(i=>(i.status||"in_progress")===st).length}</span><small>件</small></button>`).join("");
    statusSummary.querySelectorAll("[data-summary-status]").forEach(button=>button.onclick=()=>{statusFilter.value=statusFilter.value===button.dataset.summaryStatus?"":button.dataset.summaryStatus;render();document.getElementById("applicationListSection")?.scrollIntoView({behavior:"smooth",block:"start"});});
    const years=[...new Set(apps.map(i=>String(i.applicationYear||"")).filter(Boolean))].sort().reverse();
    const selected=yearFilter.value; yearFilter.innerHTML='<option value="">すべての年度</option>'+years.map(y=>`<option value="${escapeHtml(y)}">${escapeHtml(y)}年度</option>`).join("");
    if(years.includes(selected))yearFilter.value=selected;
  }
  function resetEditMode(){ editingId.value=""; form.reset(); fields.year.value=currentYear(); fields.status.value="draft"; fields.mode.value="official"; registrationOffice.value=window.ISSStorage.getOfficeId(); registrationOffice.disabled=!window.ISSStorage.isSafetyEnvironment()||!canWrite(); fields.number.disabled=false; submitButton.textContent="登録"; cancelEditButton.hidden=true; toggleNumberMode(); }
  function beginEdit(id){ const i=currentApplications().find(r=>r.id===id); if(!i)return; editingId.value=i.id; fields.year.value=i.applicationYear||currentYear(); fields.mode.value=i.numberType||"official"; fields.number.value=i.numberType==="temporary"?"":i.applicationNumber||""; fields.tempNumber.value=i.temporaryNumber||""; fields.status.value=statusLabels[i.status]?i.status:"in_progress"; fields.assignee.value=i.assignee||""; fields.containerNumber.value=i.containerNumber||""; fields.vesselName.value=i.vesselName||""; fields.voyageNumber.value=i.voyageNumber||""; fields.unNumber.value=i.unNumber||""; fields.japaneseName.value=i.japaneseName||i.cargoName||""; fields.englishName.value=i.englishName||""; fields.hazardClass.value=i.hazardClass||""; [...fields.subsidiary.options].forEach(o=>o.selected=(i.subsidiaryHazardClasses||[]).includes(o.value)); fields.packingGroup.value=i.packingGroup||""; fields.applicationDate.value=i.applicationDate||""; fields.plannedDate.value=i.inspectionPlannedDate||""; fields.inspectionDate.value=i.inspectionDate||""; fields.caseTitle.value=i.caseTitle||""; fields.note.value=i.note||""; registrationOffice.value=i.officeId||window.ISSStorage.getOfficeId(); registrationOffice.disabled=true; submitButton.textContent="更新"; cancelEditButton.hidden=false; toggleNumberMode(); form.scrollIntoView({behavior:"smooth",block:"start"}); }
  function historySummary(id){
    const rows=window.ISSStorage.getApplicationHistory?.(id)||[];
    if(!rows.length)return '<p class="application-history-empty">更新履歴はありません。</p>';
    return `<div class="application-history-list">${rows.slice(0,12).map(row=>`<article><strong>${row.action==="create"?"新規登録":"更新"}</strong><span>${escapeHtml(formatDate(row.createdAt))}</span><small>${escapeHtml(row.actorOffice||"")}／${escapeHtml(row.actorRole||"")}${row.reason?`／${escapeHtml(row.reason)}`:""}</small></article>`).join("")}</div>`;
  }
  async function showCentralApplicationHistory(serverId){
    let dialog=document.getElementById("centralApplicationHistoryDialog");
    if(!dialog){
      dialog=document.createElement("dialog");
      dialog.id="centralApplicationHistoryDialog";
      dialog.className="central-history-dialog";
      dialog.innerHTML='<form method="dialog" class="central-history-dialog__panel"><div class="central-history-dialog__header"><div><span>中央サーバーの監査履歴</span><h2>申請情報の訂正履歴</h2></div><button type="submit" aria-label="閉じる">×</button></div><div id="centralApplicationHistoryBody" class="central-history-dialog__body"><p>読込中です。</p></div></form>';
      document.body.appendChild(dialog);
    }
    const body=document.getElementById("centralApplicationHistoryBody");
    body.innerHTML='<p>中央サーバーから訂正履歴を取得しています。</p>';
    dialog.showModal?.();
    try{
      const data=await window.ISSApi.applicationHistory(serverId);
      const rows=Array.isArray(data?.history)?data.history:[];
      body.innerHTML=rows.length?`<div class="central-history-list">${rows.map(row=>{const before=row.before_snapshot||{};const after=row.after_snapshot||{};const changed=Object.keys({...before,...after}).filter(key=>JSON.stringify(before[key])!==JSON.stringify(after[key]));return `<article><header><strong>第${escapeHtml(row.revision_number)}版／${escapeHtml(row.action)}</strong><time>${escapeHtml(formatDate(row.created_at))}</time></header><p>${escapeHtml(row.change_reason||"理由未記載")}</p><small>変更者：${escapeHtml(row.changed_by_name||row.changed_by_login||"-")}</small>${changed.length?`<details><summary>変更項目 ${changed.length}件</summary><dl>${changed.map(key=>`<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(String(before[key]??"-") )} → ${escapeHtml(String(after[key]??"-"))}</dd></div>`).join("")}</dl></details>`:""}</article>`}).join("")}</div>`:'<p>中央サーバーの訂正履歴はありません。</p>';
    }catch(error){
      body.innerHTML=`<p class="is-error">中央訂正履歴を取得できませんでした。${escapeHtml(error.message||"")}</p>`;
    }
  }

  function renderActiveFilters(appCount){
    if(resultCount)resultCount.textContent=`${appCount}件`;
    if(!activeFilters)return;
    const chips=[];
    if(filter.value.trim())chips.push({key:"query",label:`検索：${filter.value.trim()}`});
    if(yearFilter.value)chips.push({key:"year",label:`年度：${yearFilter.value}`});
    if(statusFilter.value)chips.push({key:"status",label:`進捗：${statusLabels[statusFilter.value]||statusFilter.value}`});
    if(window.ISSStorage.isSafetyEnvironment()&&scopeSelect.value==="all"&&officeFilter.value){const option=officeFilter.selectedOptions[0];chips.push({key:"office",label:`事業所：${option?.textContent||officeFilter.value}`});}
    activeFilters.innerHTML=chips.map(chip=>`<button type="button" data-clear-application-filter="${chip.key}" aria-label="${escapeHtml(chip.label)}を解除">${escapeHtml(chip.label)} <span aria-hidden="true">×</span></button>`).join("");
    activeFilters.querySelectorAll("[data-clear-application-filter]").forEach(button=>button.onclick=()=>{const key=button.dataset.clearApplicationFilter;if(key==="query")filter.value="";if(key==="year")yearFilter.value="";if(key==="status")statusFilter.value="";if(key==="office")officeFilter.value="";render();});
  }
  function render(){ const apps=filteredApplications(); renderSummary(); renderActiveFilters(apps.length); if(!apps.length){list.innerHTML='<div class="empty-state"><strong>条件に一致する申請案件がありません</strong><p>検索語、申請年度、進捗状況または表示範囲を確認してください。</p><button id="clearEmptyApplicationFilters" type="button">絞り込み条件を解除</button></div>';$('clearEmptyApplicationFilters').onclick=()=>{filter.value="";statusFilter.value="";yearFilter.value="";if(window.ISSStorage.isSafetyEnvironment()&&scopeSelect.value==="all")officeFilter.value="";render();};return;}
    const photos=window.ISSStorage.getPhotos({scope:window.ISSStorage.isSafetyEnvironment()?"all":"office"});
    const documents=window.ISSStorage.getApplicationDocuments?.({scope:window.ISSStorage.isSafetyEnvironment()?"all":"office"})||[];
    const display=getDisplaySettings();
    list.innerHTML=apps.map(i=>{ const pc=photos.filter(p=>p.applicationId===i.id).length; const dc=documents.filter(d=>d.applicationId===i.id).length; const name=i.japaneseName||i.englishName||i.caseTitle||""; const meta=[display.container&&i.containerNumber&&`コンテナ番号：${i.containerNumber}`,display.vessel&&i.vesselName&&`船名：${i.vesselName}`,display.vessel&&i.voyageNumber&&`航海番号：${i.voyageNumber}`,display.dangerous&&i.unNumber&&`UN${i.unNumber}`,display.dangerous&&displayHazard(i),display.dangerous&&i.packingGroup&&`容器等級：${i.packingGroup==="not_applicable"?"該当なし":i.packingGroup}`].filter(Boolean);
      const details=[display.assignee&&`<div><dt>担当者</dt><dd>${escapeHtml(i.assignee||"―")}</dd></div>`,display.updated&&`<div><dt>更新日時</dt><dd>${escapeHtml(formatDate(i.updatedAt||i.createdAt))}</dd></div>`,display.counts&&`<div><dt>写真</dt><dd>${pc}枚</dd></div>`,display.counts&&`<div><dt>資料</dt><dd>${dc}件</dd></div>`].filter(Boolean).join("");
      return `<article class="application-card"><div class="application-card__header"><div><span class="application-number">${escapeHtml(i.applicationYear||"")}年度・${escapeHtml(displayNumber(i))}</span>${name?`<h3>${escapeHtml(name)}</h3>`:""}<span class="application-card__office">${escapeHtml(i.blockName)}｜${escapeHtml(i.office)}</span></div><span class="record-status" data-status="${escapeHtml(i.status||"draft")}">${escapeHtml(statusLabels[i.status]||i.status)}</span></div>${meta.length?`<div class="application-optional-meta">${meta.map(v=>`<span>${escapeHtml(v)}</span>`).join("")}</div>`:""}${details?`<dl class="application-meta">${details}</dl>`:""}${i.note?`<p class="application-note">${escapeHtml(i.note)}</p>`:""}<details class="application-history"><summary>更新履歴を表示</summary>${historySummary(i.id)}${i.serverId?`<div class="management-actions"><button data-central-history="${escapeHtml(i.serverId)}" type="button">中央訂正履歴を表示</button></div>`:""}</details>${canWrite()?`<div class="management-actions"><button data-select-document-application="${escapeHtml(i.id)}" type="button">資料を登録</button><button data-select-photo-application="${escapeHtml(i.id)}" type="button">写真を登録</button><button data-copy-application="${escapeHtml(i.id)}" type="button">複製</button><button data-edit-application="${escapeHtml(i.id)}" type="button">編集</button>${canDelete()?`<button data-delete-application="${escapeHtml(i.id)}" class="danger-action" type="button">取消</button>`:""}</div>`:'<div class="management-actions"><span class="record-status">閲覧専用</span></div>'}</article>`; }).join("");
    document.querySelectorAll("[data-select-document-application]").forEach(b=>b.onclick=()=>{const s=$("documentApplication");if(s){s.value=b.dataset.selectDocumentApplication;s.dispatchEvent(new Event("change",{bubbles:true}));}$("applicationDocumentSection")?.scrollIntoView({behavior:"smooth"});});
    document.querySelectorAll("[data-select-photo-application]").forEach(b=>b.onclick=()=>{const s=$("photoApplication");if(s){s.value=b.dataset.selectPhotoApplication;s.dispatchEvent(new Event("change",{bubbles:true}));}$("applicationPhotoSection")?.scrollIntoView({behavior:"smooth"});});
    document.querySelectorAll("[data-central-history]").forEach(b=>b.onclick=()=>showCentralApplicationHistory(b.dataset.centralHistory));
    document.querySelectorAll("[data-copy-application]").forEach(b=>b.onclick=()=>{if(!confirm("この案件の入力内容を複製し、仮番号の下書きを作成しますか。写真・添付資料・履歴は複製されません。"))return;try{window.ISSStorage.duplicateApplication(b.dataset.copyApplication);window.dispatchEvent(new CustomEvent("iss:applications-changed"));render();}catch(err){alert(err.message||"複製できませんでした。");}});
    document.querySelectorAll("[data-edit-application]").forEach(b=>b.onclick=()=>beginEdit(b.dataset.editApplication));
    document.querySelectorAll("[data-delete-application]").forEach(b=>b.onclick=()=>{if(!confirm("この案件を取消に変更しますか。データは削除されません。"))return;window.ISSStorage.updateApplication(b.dataset.deleteApplication,{status:"cancelled"});window.dispatchEvent(new CustomEvent("iss:applications-changed"));render();});
  }
  function csvEscape(v){const t=String(v??"");return /[",\n]/.test(t)?`"${t.replaceAll('"','""')}"`:t;}
  function exportCsv(){const rows=filteredApplications();if(!rows.length)return alert("出力できる申請番号がありません。"); const table=[["申請年度","正式申請番号","仮番号","事業所","担当者","進捗状況","コンテナ番号","船名","航海番号","国連番号","日本語名","英語名","等級","副次危険性等級","容器等級","申請日","検査予定日","検査実施日","備考","更新日時"]]; rows.forEach(i=>table.push([i.applicationYear,i.numberType==="temporary"?"":i.applicationNumber,i.temporaryNumber,i.office,i.assignee,statusLabels[i.status]||i.status,i.containerNumber,i.vesselName,i.voyageNumber,i.unNumber,i.japaneseName,i.englishName,hazardClassLabel(i.hazardClass),(i.subsidiaryHazardClasses||[]).join("/"),i.packingGroup==="not_applicable"?"該当なし":i.packingGroup,i.applicationDate,i.inspectionPlannedDate,i.inspectionDate,i.note,i.updatedAt])); const blob=new Blob(["\ufeff"+table.map(r=>r.map(csvEscape).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}); const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download=`申請番号一覧_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);}
  function payload(){return {applicationYear:fields.year.value,numberType:fields.mode.value,applicationNumber:fields.number.value,status:fields.status.value,assignee:fields.assignee.value,containerNumber:fields.containerNumber.value,vesselName:fields.vesselName.value,voyageNumber:fields.voyageNumber.value,unNumber:fields.unNumber.value,japaneseName:fields.japaneseName.value,englishName:fields.englishName.value,hazardClass:fields.hazardClass.value,subsidiaryHazardClasses:selectedValues(fields.subsidiary),packingGroup:fields.packingGroup.value,applicationDate:fields.applicationDate.value,inspectionPlannedDate:fields.plannedDate.value,inspectionDate:fields.inspectionDate.value,caseTitle:fields.caseTitle.value,note:fields.note.value,officeId:registrationOffice.value};}
  form.addEventListener("submit",e=>{e.preventDefault();try{if(editingId.value){window.ISSStorage.updateApplication(editingId.value,payload());showMessage("申請情報を更新しました。");}else{window.ISSStorage.addApplication(payload());showMessage("申請情報を登録しました。");}resetEditMode();window.dispatchEvent(new CustomEvent("iss:applications-changed"));render();}catch(err){showMessage(err.message||"登録・更新に失敗しました。",true);}});
  cancelEditButton.onclick=resetEditMode; fields.mode.onchange=toggleNumberMode; filter.oninput=render; statusFilter.onchange=render; yearFilter.onchange=render; sortSelect.onchange=render; $("resetApplicationFilters").onclick=()=>{filter.value="";statusFilter.value="";yearFilter.value="";sortSelect.value="updated-desc";render();}; $("exportApplicationsCsv").onclick=exportCsv;
  scopeSelect.onchange=()=>{officeFilter.disabled=scopeSelect.value!=="all";if(scopeSelect.value!=="all")officeFilter.value=window.ISSStorage.getOfficeId();render();}; officeFilter.onchange=render; window.addEventListener("iss:applications-changed",render); window.addEventListener("iss:application-documents-changed",render);
  $("toggleApplicationDisplaySettings").onclick=()=>{displaySettings.hidden=!displaySettings.hidden;};
  document.querySelectorAll("[data-application-display]").forEach(input=>input.onchange=()=>{const value=getDisplaySettings();value[input.dataset.applicationDisplay]=input.checked;saveDisplaySettings(value);render();});
  $("resetApplicationDisplaySettings").onclick=()=>{saveDisplaySettings(defaultDisplaySettings);applyDisplaySettingsToControls();render();};
  $("saveApplicationView").onclick=()=>{const name=prompt("この表示条件の名前を入力してください。例：自分の対応中案件");if(!name?.trim())return;const views=getSavedViews();views.push({id:`view-${Date.now()}`,name:name.trim(),state:currentViewState()});setSavedViews(views);showMessage("表示条件を保存しました。");};
  savedViewSelect.onchange=()=>{if(savedViewSelect.value==="__delete__"){const views=getSavedViews();const names=views.map((v,index)=>`${index+1}. ${v.name}`).join("\n");const selected=prompt(`削除する番号を入力してください。\n${names}`);const index=Number(selected)-1;if(Number.isInteger(index)&&views[index]){views.splice(index,1);setSavedViews(views);}else renderSavedViews();return;}const view=getSavedViews().find(v=>v.id===savedViewSelect.value);if(view)applyViewState(view.state);};
  $("lookupUnData").onclick=renderUnCandidate;
  $("closeUnCandidate").onclick=()=>{unCandidatePanel.hidden=true;};
  $("applyUnCandidate").onclick=applyUnCandidate;
  fields.unNumber.addEventListener("blur",()=>{if(/^\d{4}$/.test(fields.unNumber.value.trim()))renderUnCandidate();});
  populateOrganizationControls();applyDisplaySettingsToControls();renderSavedViews();resetEditMode();const requestedParams=new URLSearchParams(location.search),requestedStatus=requestedParams.get("status"),requestedQuery=requestedParams.get("query"),requestedSort=requestedParams.get("sort");if(requestedStatus&&statusLabels[requestedStatus])statusFilter.value=requestedStatus;if(requestedQuery)filter.value=requestedQuery;if(requestedSort&&[...sortSelect.options].some(option=>option.value===requestedSort))sortSelect.value=requestedSort;render();
})();

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/applications.js": "part503" });
