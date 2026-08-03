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

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/regulation-approval-admin.js": "part503" });
