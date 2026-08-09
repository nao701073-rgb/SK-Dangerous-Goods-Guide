(()=>{
  "use strict";
  const q=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=value=>value?new Date(value).toLocaleString('ja-JP'):'-';
  const statusLabel={unverified:'未確認',prepared:'準備済み',submitted:'原典照合待ち','source-verified':'原典照合済み',returned:'差戻し',approved:'承認済み','amendment-pending':'改正再照合待ち',suspended:'使用停止'};
  const typeLabel={regulation:'法令原典',code:'コード','dangerous-good-criteria':'危険物・判定基準','reference-link':'原文リンク'};
  const checklist=[
    ['source_identity','原典の名称・発行者・版を確認'],['edition_effective_date','改正日・適用開始日を確認'],['article_table_page','条文・別表・ページを確認'],['numeric_values','数値・単位・上限値を確認'],['un_code_mapping','国連番号・等級・コードの対応を確認'],['exceptions_notes','例外・注記・脚注を確認'],['link_destination','原文リンクと表示開始位置を確認'],['display_integrity','PC・スマートフォンの整理表示を確認']
  ];
  const current=()=>window.ISSApi?.getUser?.()||(()=>{try{return JSON.parse(localStorage.getItem('iss-api-user')||'null')||{};}catch{return {};}})();
  const role=()=>current().role||'guest';
  const canPrepare=()=>['safety-environment-staff','safety-environment-director','safety-environment-admin'].includes(role());
  const canVerify=()=>['revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'].includes(role());
  const canApprove=()=>['safety-environment-director','safety-environment-admin'].includes(role());
  const canRebuild=()=>role()==='safety-environment-admin';
  let page=1,total=0,limit=50,itemMap=new Map();
  const message=(text,type='')=>{const el=q('regulationApprovalMessage');if(!el)return;el.textContent=text;el.className=`part503-message${type?` is-${type}`:''}`;};
  const setText=(id,value)=>{const el=q(id);if(el)el.textContent=String(value??'-');};
  function actionButtons(item){
    const buttons=[];
    if(['unverified','prepared','returned','amendment-pending'].includes(item.status)&&canPrepare())buttons.push(`<button class="primary-action" data-v-action="submit" data-id="${esc(item.id)}">原典照合へ提出</button>`);
    if(item.status==='submitted'&&canVerify()){buttons.push(`<button class="primary-action" data-v-action="verify" data-id="${esc(item.id)}">原典照合を記録</button>`);buttons.push(`<button data-v-action="return" data-id="${esc(item.id)}">差し戻す</button>`);}
    if(item.status==='source-verified'&&canApprove()){buttons.push(`<button class="primary-action" data-v-action="approve" data-id="${esc(item.id)}">承認する</button>`);buttons.push(`<button data-v-action="return" data-id="${esc(item.id)}">差し戻す</button>`);}
    if(item.status==='approved'&&canApprove())buttons.push(`<button class="danger-action" data-v-action="suspend" data-id="${esc(item.id)}">使用停止</button>`);
    buttons.push(`<button data-v-action="events" data-id="${esc(item.id)}">履歴</button>`);
    return buttons.join('');
  }
  function renderItems(items){
    itemMap=new Map(items.map(x=>[x.id,x]));
    const root=q('regulationVerificationList');if(!root)return;
    root.innerHTML=items.length?items.map(item=>`<article class="phase2-target-card"><header><div><small>${esc(typeLabel[item.target_type]||item.target_type)}</small><h3>${esc(item.display_label)}</h3><p class="phase2-key">${esc(item.target_key)}</p></div><span class="phase2-status" data-status="${esc(item.status)}">${esc(statusLabel[item.status]||item.status)}</span></header><dl><div><dt>原典・版</dt><dd>${esc(item.source_edition||'-')}</dd></div><div><dt>原典照合者</dt><dd>${esc(item.verified_by_name||'-')}</dd></div><div><dt>承認者</dt><dd>${esc(item.approved_by_name||'-')}</dd></div><div><dt>承認証明</dt><dd>${esc(item.certificate_number||'-')}</dd></div><div><dt>原典照合日時</dt><dd>${esc(fmt(item.verified_at))}</dd></div><div><dt>承認日時</dt><dd>${esc(fmt(item.approved_at))}</dd></div><div><dt>次回見直し</dt><dd>${esc(item.next_review_due?String(item.next_review_due).slice(0,10):'-')}</dd></div><div><dt>改訂番号</dt><dd>${Number(item.revision_number||1)}</dd></div></dl>${item.publication_block_reason?`<p class="part503-message is-error">${esc(item.publication_block_reason)}</p>`:''}<div class="part503-actions">${actionButtons(item)}</div><div id="verification-events-${esc(item.id)}" class="phase2-history" hidden></div></article>`).join(''):'<p class="empty-state">該当する照合対象はありません。</p>';
    root.querySelectorAll('[data-v-action]').forEach(button=>button.addEventListener('click',()=>runItemAction(button.dataset.vAction,button.dataset.id)));
  }
  async function loadVerificationSummary(){
    if(!window.ISSApi?.regulationVerificationSummary)return;
    try{const data=await window.ISSApi.regulationVerificationSummary();const s=data.summary||{};setText('verificationTotal',s.total||0);setText('verificationApproved',s.approved||0);setText('verificationSourceVerified',s.source_verified||0);setText('verificationPending',s.pending||0);setText('verificationAmendmentPending',s.amendment_pending||0);setText('verificationSuspended',s.suspended||0);setText('verificationReviewOverdue',s.review_overdue||0);const run=data.lastCatalogRun;setText('verificationLastCatalogRun',run?`最終台帳更新：${fmt(run.executed_at)}／追加 ${run.inserted_count}件／変更 ${run.updated_count}件／再照合 ${run.amendment_pending_count}件`:'照合対象台帳は未作成です。システム管理者が台帳を更新してください。');}
    catch(error){message(`原典照合の進捗を取得できません。（${error.message||'接続エラー'}）`,'error');}
  }
  async function loadVerificationItems(){
    if(!window.ISSApi?.regulationVerificationItems)return;
    const params={page,limit,status:q('verificationStatusFilter')?.value||'',targetType:q('verificationTypeFilter')?.value||'',search:q('verificationSearch')?.value||''};
    try{const data=await window.ISSApi.regulationVerificationItems(params);total=Number(data.total||0);renderItems(data.items||[]);const max=Math.max(1,Math.ceil(total/limit));setText('verificationPageInfo',`${page} / ${max}（${total}件）`);q('verificationPrev').disabled=page<=1;q('verificationNext').disabled=page>=max;}
    catch(error){renderItems([]);message(`照合対象を取得できません。（${error.message||'接続エラー'}）`,'error');}
  }
  function openVerificationDialog(item){
    setText('verificationDialogTitle',item.display_label);q('verificationItemId').value=item.id;q('verificationSourceChecksum').value=item.source_checksum_sha256||'';q('verificationSourcePages').value=(item.source_page_references||[]).map(x=>x.title||x.label||[x.law,x.page?`PDF ${x.page}頁`:x.page].filter(Boolean).join(' ')||JSON.stringify(x)).join('\n');q('verificationComment').value=item.verification_note||'';
    q('verificationChecklist').innerHTML=checklist.map(([key,label])=>`<label class="phase2-check-item"><input type="checkbox" data-check-key="${key}"><strong>${esc(label)}</strong><input type="text" data-check-note="${key}" placeholder="確認内容・ページ・補足"></label>`).join('');q('regulationVerificationDialog').showModal();
  }
  const parsePageRefs=()=>q('verificationSourcePages').value.split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(label=>({label}));
  const collectChecklist=()=>checklist.map(([key,label])=>({key,label,passed:Boolean(q('verificationChecklist').querySelector(`[data-check-key="${key}"]`)?.checked),note:q('verificationChecklist').querySelector(`[data-check-note="${key}"]`)?.value.trim()||''}));
  async function saveSourceVerification(){
    const id=q('verificationItemId').value,comment=q('verificationComment').value.trim(),sourcePageReferences=parsePageRefs(),items=collectChecklist();if(!comment)return alert('照合結果を入力してください。');if(!sourcePageReferences.length)return alert('原典ページ参照を入力してください。');if(items.some(x=>!x.passed))return alert('必須照合項目をすべて確認してください。');
    try{await window.ISSApi.sourceVerifyRegulationItem(id,{comment,sourceChecksum:q('verificationSourceChecksum').value.trim()||null,sourcePageReferences,checklist:items});q('regulationVerificationDialog').close();message('原典照合結果を保存しました。','success');await Promise.all([loadVerificationSummary(),loadVerificationItems()]);}catch(error){message(error.message||'原典照合結果を保存できませんでした。','error');}
  }
  async function runItemAction(action,id){
    const item=itemMap.get(id);if(!item)return;
    try{
      if(action==='submit'){const comment=prompt('提出時の備考','')||'';await window.ISSApi.submitRegulationVerificationItem(id,{comment});}
      if(action==='verify'){openVerificationDialog(item);return;}
      if(action==='return'){const reason=prompt('差戻し理由を入力してください','');if(!reason?.trim())return;await window.ISSApi.returnRegulationVerificationItem(id,{reason:reason.trim()});}
      if(action==='approve'){const comment=prompt('承認コメントを入力してください','原典照合結果を確認し、正式利用を承認します。');if(!comment?.trim())return;const nextReviewDue=prompt('次回見直し日（YYYY-MM-DD、未定は空欄）','');await window.ISSApi.approveRegulationVerificationItem(id,{comment:comment.trim(),nextReviewDue:nextReviewDue?.trim()||undefined});}
      if(action==='suspend'){const reason=prompt('使用停止理由を入力してください','');if(!reason?.trim())return;await window.ISSApi.suspendRegulationVerificationItem(id,{reason:reason.trim()});}
      if(action==='events'){const el=q(`verification-events-${id}`);const data=await window.ISSApi.regulationVerificationEvents(id);el.hidden=!el.hidden;el.innerHTML=(data.events||[]).length?(data.events||[]).map(event=>`<article><strong>${esc(statusLabel[event.event_type]||event.event_type)}</strong>　${esc(event.actor_name||event.actor_login||'システム')}<small>${esc(fmt(event.created_at))}／${esc(event.comment||'')}</small></article>`).join(''):'<p>履歴はありません。</p>';return;}
      message('処理を保存しました。','success');await Promise.all([loadVerificationSummary(),loadVerificationItems()]);
    }catch(error){message(error.message||'処理できませんでした。','error');}
  }
  q('rebuildRegulationCatalog')?.addEventListener('click',async()=>{if(!canRebuild())return message('照合対象台帳を更新できるのはシステム管理者だけです。','error');if(!confirm('静的マスター全件を照合対象台帳と同期します。承認済み内容に変更がある場合は再照合待ちになります。続行しますか。'))return;try{message('照合対象台帳を更新しています。');const data=await window.ISSApi.rebuildRegulationVerificationCatalog();message(`台帳を更新しました。追加 ${data.summary.inserted}件、変更 ${data.summary.updated}件、再照合 ${data.summary.amendmentPending}件。`,'success');page=1;await Promise.all([loadVerificationSummary(),loadVerificationItems()]);}catch(error){message(error.message||'台帳を更新できませんでした。','error');}});
  q('refreshRegulationVerification')?.addEventListener('click',()=>Promise.all([loadVerificationSummary(),loadVerificationItems()]));q('searchRegulationVerification')?.addEventListener('click',()=>{page=1;loadVerificationItems();});q('verificationStatusFilter')?.addEventListener('change',()=>{page=1;loadVerificationItems();});q('verificationTypeFilter')?.addEventListener('change',()=>{page=1;loadVerificationItems();});q('verificationSearch')?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();page=1;loadVerificationItems();}});q('verificationPrev')?.addEventListener('click',()=>{if(page>1){page--;loadVerificationItems();}});q('verificationNext')?.addEventListener('click',()=>{if(page<Math.ceil(total/limit)){page++;loadVerificationItems();}});q('saveSourceVerification')?.addEventListener('click',saveSourceVerification);q('returnVerificationItem')?.addEventListener('click',async()=>{const id=q('verificationItemId').value,reason=q('verificationComment').value.trim();if(!reason)return alert('差戻し理由を入力してください。');try{await window.ISSApi.returnRegulationVerificationItem(id,{reason});q('regulationVerificationDialog').close();await Promise.all([loadVerificationSummary(),loadVerificationItems()]);}catch(error){message(error.message||'差し戻せませんでした。','error');}});
  if(!canRebuild()&&q('rebuildRegulationCatalog'))q('rebuildRegulationCatalog').hidden=true;
  Promise.all([loadVerificationSummary(),loadVerificationItems()]);
})();

(()=>{
  const q=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=value=>value?new Date(value).toLocaleString('ja-JP'):'-';
  const statusLabel={draft:'下書き',submitted:'照合待ち',reviewed:'承認待ち',approved:'公開待ち',returned:'差戻し',rejected:'却下',published:'公開済み'};
  const current=()=>{const apiUser=window.ISSApi?.getUser?.();if(apiUser)return apiUser;try{return JSON.parse(localStorage.getItem('iss-api-user')||'null')||{};}catch{return {};}};
  const role=()=>current().role||'guest';
  const canApprove=()=>['safety-environment-director','safety-environment-admin'].includes(role());
  const canPublish=()=>role()==='safety-environment-admin';
  const canPrepare=()=>['safety-environment-staff','safety-environment-director','safety-environment-admin','revision-validator'].includes(role());
  const canReview=()=>['revision-validator','validator','safety-environment-staff','safety-environment-director','safety-environment-admin'].includes(role());
  const message=(text,type='')=>{const el=q('regulationApprovalMessage');el.textContent=text;el.className=`part503-message${type?` is-${type}`:''}`;};
  const promptRequired=label=>{const value=prompt(label,'');return value&&value.trim()?value.trim():null;};
  const actionButtons=row=>{
    const buttons=[];
    if(['draft','returned'].includes(row.status)&&canPrepare())buttons.push(`<button class="primary-action" data-action="submit" data-id="${esc(row.id)}">原典照合へ提出</button>`);
    if(['submitted','returned'].includes(row.status)&&canReview()){buttons.push(`<button class="primary-action" data-action="review" data-id="${esc(row.id)}">原典照合済みにする</button>`);buttons.push(`<button data-action="return" data-id="${esc(row.id)}">差し戻す</button>`);}
    if(row.status==='reviewed'&&canApprove()){buttons.push(`<button class="primary-action" data-action="approve" data-id="${esc(row.id)}">承認する</button>`);buttons.push(`<button class="danger-action" data-action="reject" data-id="${esc(row.id)}">却下する</button>`);}
    if(row.status==='approved'&&canPublish())buttons.push(`<button class="primary-action" data-action="publish" data-id="${esc(row.id)}">公開する</button>`);
    buttons.push(`<button data-action="events" data-id="${esc(row.id)}">承認履歴</button>`);
    return buttons.join('');
  };
  const render=rows=>{
    q('regulationApprovalList').innerHTML=rows.length?rows.map(row=>`<article class="part503-review-card"><header><div><h3>${esc(row.regulation_id)}／${esc(row.edition_label)}</h3><p class="part503-note">変更セット ${esc(row.id)}</p></div><span class="part503-badge">${esc(statusLabel[row.status]||row.status)}</span></header><dl><div><dt>追加・変更・削除</dt><dd>${Number(row.added_count||0)}／${Number(row.changed_count||0)}／${Number(row.deleted_count||0)}</dd></div><div><dt>作成者</dt><dd>${esc(row.created_by_name||row.created_by||'-')}</dd></div><div><dt>原典照合者</dt><dd>${esc(row.reviewed_by_name||'-')}</dd></div><div><dt>承認者</dt><dd>${esc(row.approved_by_name||'-')}</dd></div><div><dt>作成日時</dt><dd>${esc(fmt(row.created_at))}</dd></div><div><dt>原典SHA-256</dt><dd>${esc(row.source_checksum||'-')}</dd></div></dl><div class="part503-actions">${actionButtons(row)}</div><div class="part503-history" id="events-${esc(row.id)}" hidden></div></article>`).join(''):'<p class="empty-state">該当する変更セットはありません。</p>';
    q('regulationApprovalList').querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>runAction(btn.dataset.action,btn.dataset.id)));
  };
  async function load(){
    message('中央サーバーから承認状況を取得しています。');
    try{if(!window.ISSApi?.regulationChangeSets)throw new Error('中央サーバーAPIが設定されていません。');const status=q('regulationApprovalStatus').value;const data=await window.ISSApi.regulationChangeSets(status?{status}:{});render(data.changeSets||[]);message('承認状況を取得しました。','success');}
    catch(error){render([]);message(`中央サーバーへ接続できません。静的版だけでは人による承認・監査履歴は共有できません。（${error.message||'接続エラー'}）`,'error');}
  }
  async function runAction(action,id){
    try{
      if(action==='submit'){const comment=prompt('提出時の備考','')||'';await window.ISSApi.submitRegulationChangeSet(id,{comment});}
      if(action==='review'||action==='return'){const comment=promptRequired(action==='review'?'原典照合結果・確認ページを入力してください':'差戻し理由を入力してください');if(!comment)return;const passed=action==='review';await window.ISSApi.reviewRegulationChangeSet(id,{decision:passed?'reviewed':'returned',comment,checklist:[{item:'条文・別表・ページ・数値を原典PDFと照合',passed,note:comment}]});}
      if(action==='approve'||action==='reject'){const comment=promptRequired(action==='approve'?'承認コメントを入力してください':'却下理由を入力してください');if(!comment)return;await window.ISSApi.approveRegulationChangeSet(id,{decision:action==='approve'?'approved':'rejected',comment});}
      if(action==='publish'){const releaseVersion=promptRequired('公開版番号を入力してください');if(!releaseVersion)return;const effectiveFrom=promptRequired('適用開始日をYYYY-MM-DDで入力してください');if(!effectiveFrom)return;await window.ISSApi.publishRegulationChangeSet(id,{releaseVersion,effectiveFrom});}
      if(action==='events'){const el=q(`events-${id}`);const data=await window.ISSApi.regulationChangeSetEvents(id);el.hidden=!el.hidden;el.innerHTML=(data.events||[]).length?(data.events||[]).map(event=>`<article><strong>${esc(statusLabel[event.event_type]||event.event_type)}</strong>　${esc(event.actor_name||event.actor_login||'-')}<small>${esc(fmt(event.created_at))}／${esc(event.comment||'')}</small></article>`).join(''):'<p>履歴はありません。</p>';return;}
      message('処理を保存しました。','success');await load();
    }catch(error){message(error.message||'処理できませんでした。','error');}
  }
  q('refreshRegulationApproval')?.addEventListener('click',load);
  q('regulationApprovalStatus')?.addEventListener('change',load);
  q('centralRegulationSourceForm')?.addEventListener('submit',async event=>{event.preventDefault();if(!canPrepare())return message('原典登録権限がありません。','error');try{const fd=new FormData(event.currentTarget);const data=await window.ISSApi.createRegulationSource(fd);message(`原典を保存しました。原典ID: ${data.source.id}`,'success');event.currentTarget.querySelector('[name="sourceId"]');}catch(error){message(error.message||'原典を保存できませんでした。','error');}});
  q('centralRegulationDatasetForm')?.addEventListener('submit',async event=>{event.preventDefault();try{const fd=new FormData(event.currentTarget);const data=await window.ISSApi.createRegulationDataset(fd);message(`更新データを保存しました。データセットID: ${data.dataset.id}`,'success');}catch(error){message(error.message||'更新データを保存できませんでした。','error');}});
  q('centralChangeSetForm')?.addEventListener('submit',async event=>{event.preventDefault();try{const fd=new FormData(event.currentTarget);const parse=(name,fallback)=>{try{return JSON.parse(fd.get(name)||fallback);}catch{throw new Error(`${name}のJSON形式を確認してください。`);}};const payload={sourceId:fd.get('sourceId'),datasetId:fd.get('datasetId')||null,addedCount:Number(fd.get('addedCount')||0),changedCount:Number(fd.get('changedCount')||0),deletedCount:Number(fd.get('deletedCount')||0),deletionJustification:fd.get('deletionJustification')||'',diffSummary:parse('diffSummary','{}'),sourcePageReferences:parse('sourcePageReferences','[]'),reviewChecklist:[{item:'条文・別表・国連番号・コード・ページを原典照合',passed:false}]};const data=await window.ISSApi.createRegulationChangeSet(payload);message(`変更セットを作成しました。ID: ${data.changeSet.id}`,'success');await load();}catch(error){message(error.message||'変更セットを作成できませんでした。','error');}});
  load();
})();


window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/regulation-approval-admin.js": "part508" });
