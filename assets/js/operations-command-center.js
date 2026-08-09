(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const esc=value=>String(value??'').replace(/[&<>'"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const fmt=value=>value?new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium',timeStyle:'short'}).format(new Date(value)):'-';
  const fmtDate=value=>value?new Intl.DateTimeFormat('ja-JP',{dateStyle:'medium'}).format(new Date(`${String(value).slice(0,10)}T00:00:00`)):'-';
  const iso=value=>value?new Date(value).toISOString():null;
  const message=(text,error=false)=>{const el=$('#pageMessage');el.textContent=text||'';el.className=`command-message ${text?(error?'is-error':'is-ok'):''}`;};
  const user=()=>window.ISSApi?.getUser?.()||{};
  const canWrite=()=>user().role==='safety-environment-admin';
  const api=(path,method='GET',body)=>window.ISSApi.request(`/admin/operations-command-center${path}`,{method,body:body===undefined?undefined:JSON.stringify(body)});
  const labels={critical:'重大',high:'高',medium:'中',low:'低',open:'受付',acknowledged:'確認済み',investigating:'調査中',monitoring:'監視中',resolved:'復旧済み',closed:'終了',cancelled:'取消',met:'達成',missed:'未達',draft:'下書き',submitted:'提出済み',reviewed:'確認済み',approved:'承認済み',returned:'差戻し',planned:'計画',"in-progress":'対応中',completed:'完了'};
  let state={users:[],rosters:[],shifts:[],alerts:[],policies:[],objectives:[],measurements:[],forecasts:[],reports:[],summary:{}};

  function formObject(form){return Object.fromEntries(new FormData(form).entries());}
  function setDefaults(){
    const now=new Date(),later=new Date(now.getTime()+8*3600000),today=now.toISOString().slice(0,10),monthStart=`${today.slice(0,7)}-01`;
    $('[name="detectedAt"]').value=now.toISOString().slice(0,16);$('[name="startsAt"]').value=now.toISOString().slice(0,16);$('[name="endsAt"]').value=later.toISOString().slice(0,16);
    document.querySelectorAll('[name="periodStart"]').forEach(el=>el.value=monthStart);document.querySelectorAll('[name="periodEnd"]').forEach(el=>el.value=today);
    $('[name="forecastAt"]').value=new Date(now.getTime()+90*86400000).toISOString().slice(0,10);$('[name="dueAt"]').value=new Date(now.getTime()+60*86400000).toISOString().slice(0,10);
  }
  function fillSelect(select,items,placeholder='選択してください'){
    const current=select.value;select.innerHTML=`<option value="">${esc(placeholder)}</option>`+items.map(item=>`<option value="${esc(item.id)}">${esc(item.display_name||item.name||item.title||item.id)}</option>`).join('');if([...select.options].some(o=>o.value===current))select.value=current;
  }
  function renderSelects(){
    document.querySelectorAll('.user-select').forEach(select=>fillSelect(select,state.users,'未設定'));
    fillSelect($('#shiftRoster'),state.rosters.filter(x=>x.active),'当番表を選択');fillSelect($('#measurementObjective'),state.objectives.filter(x=>x.active),'目標を選択');
  }
  function renderSummary(){const s=state.summary||{};$('#summaryOpen').textContent=`${s.openAlerts??0}件`;$('#summaryCritical').textContent=`${s.criticalAlerts??0}件`;$('#summaryAckOverdue').textContent=`${s.acknowledgementOverdue??0}件`;$('#summaryResolveOverdue').textContent=`${s.resolutionOverdue??0}件`;$('#summaryOnCall').textContent=`${s.activeOnCall??0}名`;$('#summarySlo').textContent=`${s.missedSlo??0}件`;$('#summaryCapacity').textContent=`${s.overdueCapacityActions??0}件`;}
  function renderShifts(){
    const now=Date.now();const items=state.shifts.filter(s=>new Date(s.ends_at).getTime()>=now-86400000).slice(0,20);
    $('#shiftList').innerHTML=items.length?items.map(s=>{const active=new Date(s.starts_at)<=new Date()&&new Date(s.ends_at)>new Date();return `<article class="command-item"><header><h4>${esc(s.roster_name)}</h4><span class="command-badge ${active?'is-ok':''}">${active?'現在当番':'予定'}</span></header><p>${esc(s.primary_name)}${s.backup_name?` ／ 副担当 ${esc(s.backup_name)}`:''}</p><div class="command-meta"><span>${fmt(s.starts_at)} ～ ${fmt(s.ends_at)}</span><span>${s.acknowledged_at?'引継ぎ確認済み':'引継ぎ未確認'}</span></div>${s.handover_note?`<p>${esc(s.handover_note)}</p>`:''}${canWrite()&&!s.acknowledged_at?`<div class="command-actions"><button data-action="ack-shift" data-id="${s.id}">引継ぎ確認</button></div>`:''}</article>`}).join(''):'<p class="command-empty">当番予定はありません。</p>';
  }
  function renderPolicies(){
    $('#policyList').innerHTML=state.policies.length?state.policies.map(p=>`<article class="command-item"><header><h4>${esc(p.name)}</h4><span class="command-badge">${esc(labels[p.severity]||p.severity)}</span></header><div class="command-meta"><span>応答 ${p.acknowledgement_minutes}分</span><span>復旧 ${p.resolution_minutes}分</span><span>${Array.isArray(p.steps)?p.steps.length:0}段階</span></div></article>`).join(''):'<p class="command-empty">方針は未登録です。</p>';
  }
  function isOverdue(value){return value&&new Date(value)<new Date();}
  function renderAlerts(){
    const active=$('#alertStatusFilter').value==='active';const items=state.alerts.filter(a=>!active||!['resolved','closed','cancelled'].includes(a.status));
    $('#alertList').innerHTML=items.length?items.map(a=>{const ackOver=!a.acknowledged_at&&isOverdue(a.acknowledgement_due_at)&&!['resolved','closed','cancelled'].includes(a.status);const resolveOver=isOverdue(a.resolution_due_at)&&!['resolved','closed','cancelled'].includes(a.status);return `<article class="command-item is-${a.severity} ${(ackOver||resolveOver)?'is-overdue':''}"><header><div><h4>${esc(a.title)}</h4><p>${esc(a.source)} ／ ${esc(a.alert_key)}</p></div><span class="command-badge ${['resolved','closed'].includes(a.status)?'is-ok':(ackOver||resolveOver?'is-ng':'')}">${esc(labels[a.status]||a.status)}</span></header><p>${esc(a.description||'')}</p><div class="command-meta"><span>${esc(labels[a.severity]||a.severity)}</span><span>検知 ${fmt(a.detected_at)}</span><span>応答期限 ${fmt(a.acknowledgement_due_at)}${ackOver?'（超過）':''}</span><span>復旧期限 ${fmt(a.resolution_due_at)}${resolveOver?'（超過）':''}</span><span>段階 ${a.escalation_level}</span><span>担当 ${esc(a.assigned_name||a.roster_name||'未設定')}</span></div>${a.resolution?`<p><strong>復旧：</strong>${esc(a.resolution)}</p>`:''}${canWrite()&&!['resolved','closed','cancelled'].includes(a.status)?`<div class="command-actions">${!a.acknowledged_at?`<button data-action="ack-alert" data-id="${a.id}">確認</button>`:''}<button data-action="escalate-alert" data-id="${a.id}">エスカレーション</button><button data-action="resolve-alert" data-id="${a.id}">復旧完了</button></div>`:''}</article>`}).join(''):'<p class="command-empty">対象アラートはありません。</p>';
  }
  function renderSlo(){
    $('#sloList').innerHTML=state.objectives.length?state.objectives.map(o=>{const ms=state.measurements.filter(m=>m.objective_id===o.id).slice(0,4);return `<article class="command-item"><header><h4>${esc(o.name)}</h4><span class="command-badge ${o.critical?'is-ng':''}">${Number(o.target_percent).toFixed(3)}%</span></header><div class="command-meta"><span>${esc(o.metric_type)}</span><span>${o.window_days}日</span><span>${o.critical?'重要SLO':'通常SLO'}</span><span>責任者 ${esc(o.owner_name||'未設定')}</span></div>${ms.length?ms.map(m=>`<p><span class="command-badge ${m.status==='met'?'is-ok':'is-ng'}">${esc(labels[m.status])}</span> ${fmtDate(m.period_start)}～${fmtDate(m.period_end)}：${Number(m.actual_percent).toFixed(5)}% ／ エラーバジェット残 ${Number(m.error_budget_remaining).toFixed(3)}</p>`).join(''):'<p>測定記録はありません。</p>'}</article>`}).join(''):'<p class="command-empty">サービス水準目標は未登録です。</p>';
  }
  function renderCapacity(){
    $('#capacityList').innerHTML=state.forecasts.length?state.forecasts.map(f=>{const overdue=!['completed','cancelled'].includes(f.status)&&String(f.due_at)<new Date().toISOString().slice(0,10);return `<article class="command-item ${overdue?'is-overdue':''}"><header><h4>${esc(f.resource_type)}：${f.current_value}${esc(f.unit)} → ${f.forecast_value}${esc(f.unit)}</h4><span class="command-badge ${f.status==='completed'?'is-ok':(overdue?'is-ng':'')}">${esc(labels[f.status]||f.status)}</span></header><p>${esc(f.action_plan)}</p><div class="command-meta"><span>警告 ${f.warning_threshold}${esc(f.unit)}</span><span>重大 ${f.critical_threshold}${esc(f.unit)}</span><span>予測日 ${fmtDate(f.forecast_at)}</span><span>期限 ${fmtDate(f.due_at)}</span><span>責任者 ${esc(f.owner_name)}</span></div>${canWrite()&&!['completed','cancelled'].includes(f.status)?`<div class="command-actions"><button data-action="complete-capacity" data-id="${f.id}">対策完了</button></div>`:''}</article>`}).join(''):'<p class="command-empty">容量予測はありません。</p>';
  }
  function renderReports(){
    $('#reportList').innerHTML=state.reports.length?state.reports.map(r=>`<article class="command-item"><header><h4>${esc(labels[r.period_type]||r.period_type)} ${fmtDate(r.period_start)}～${fmtDate(r.period_end)}</h4><span class="command-badge ${r.status==='approved'?'is-ok':''}">${esc(labels[r.status]||r.status)}</span></header><p>${esc(r.summary)}</p><div class="command-meta"><span>作成 ${esc(r.creator_name)}</span><span>確認 ${esc(r.reviewer_name||'-')}</span><span>承認 ${esc(r.approver_name||'-')}</span></div>${Array.isArray(r.snapshot?.blockers)&&r.snapshot.blockers.length?`<p><strong>提出時の阻害要因：</strong>${r.snapshot.blockers.map(esc).join('／')}</p>`:''}${canWrite()?`<div class="command-actions">${['draft','returned'].includes(r.status)?`<button data-action="submit-report" data-id="${r.id}">提出</button>`:''}${r.status==='submitted'?`<button data-action="review-report" data-id="${r.id}">確認</button><button data-action="return-report" data-id="${r.id}">差戻し</button>`:''}${r.status==='reviewed'?`<button data-action="approve-report" data-id="${r.id}">承認</button>`:''}</div>`:''}</article>`).join(''):'<p class="command-empty">運用報告はありません。</p>';
  }
  function render(){renderSummary();renderSelects();renderShifts();renderPolicies();renderAlerts();renderSlo();renderCapacity();renderReports();document.querySelectorAll('[data-write-only]').forEach(el=>el.hidden=!canWrite());}
  async function load(){try{message('読み込み中です。');state=await api('');render();message(`最新状態を読み込みました（${new Date(state.summary.generatedAt).toLocaleString('ja-JP')}）。`);}catch(error){message(error.message,true);}}
  async function submit(form,path,transform){try{const raw=formObject(form),body=transform?transform(raw):raw;await api(path,'POST',body);form.reset();setDefaults();message('登録しました。');await load();}catch(error){message(error.message,true);}}
  function numberFields(obj,names){names.forEach(k=>{obj[k]=Number(obj[k]);});return obj;}
  function nullable(obj,names){names.forEach(k=>{if(obj[k]==='')obj[k]=null;});return obj;}

  $('#rosterForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/rosters',o=>({...o,active:true}));});
  $('#shiftForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/shifts',o=>nullable({...o,startsAt:iso(o.startsAt),endsAt:iso(o.endsAt)},['backupUserId']));});
  $('#policyForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/escalation-policies',o=>numberFields({...o,steps:JSON.parse(o.steps),active:true},['acknowledgementMinutes','resolutionMinutes']));});
  $('#alertForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/alerts',o=>nullable({...o,detectedAt:iso(o.detectedAt)},['assignedUserId','evidenceSha256']));});
  $('#objectiveForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/objectives',o=>nullable(numberFields({...o,critical:Boolean(e.currentTarget.elements.critical.checked),active:true},['targetPercent','windowDays']),['ownerUserId']));});
  $('#measurementForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/measurements',o=>numberFields(o,['numerator','denominator']));});
  $('#capacityForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/capacity-forecasts',o=>numberFields(o,['currentValue','warningThreshold','criticalThreshold','forecastValue']));});
  $('#reportForm').addEventListener('submit',e=>{e.preventDefault();submit(e.currentTarget,'/reports');});
  $('#reloadDashboard').addEventListener('click',load);$('#alertStatusFilter').addEventListener('change',renderAlerts);
  document.addEventListener('click',async e=>{const btn=e.target.closest('button[data-action]');if(!btn)return;const id=btn.dataset.id,action=btn.dataset.action;try{
    if(action==='ack-shift')await api(`/shifts/${id}/acknowledge`,'POST',{});
    if(action==='ack-alert'){const note=prompt('確認内容を入力してください。');if(!note)return;await api(`/alerts/${id}/acknowledge`,'POST',{note});}
    if(action==='escalate-alert'){const note=prompt('エスカレーション理由を入力してください。');if(!note)return;await api(`/alerts/${id}/escalate`,'POST',{note});}
    if(action==='resolve-alert'){const resolution=prompt('復旧内容を10文字以上で入力してください。');if(!resolution)return;await api(`/alerts/${id}/resolve`,'POST',{resolution});}
    if(action==='complete-capacity'){const completionNote=prompt('対策完了内容を10文字以上で入力してください。');if(!completionNote)return;await api(`/capacity-forecasts/${id}/complete`,'POST',{completionNote});}
    if(action==='submit-report')await api(`/reports/${id}/submit`,'POST',{});
    if(action==='review-report'||action==='return-report'){const note=prompt(action==='review-report'?'確認所見を入力してください。':'差戻し理由を入力してください。');if(!note)return;await api(`/reports/${id}/review`,'POST',{decision:action==='review-report'?'reviewed':'returned',note});}
    if(action==='approve-report'){const note=prompt('承認所見を入力してください。');if(!note)return;await api(`/reports/${id}/approve`,'POST',{note});}
    message('操作を記録しました。');await load();
  }catch(error){message(error.message,true);}});
  setDefaults();load();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/operations-command-center.js':'part528'});
