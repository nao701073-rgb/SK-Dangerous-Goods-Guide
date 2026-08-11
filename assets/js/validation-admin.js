(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let organizations = [];
  let currentRunId = null;
  const message = text => { $('validationMessage').textContent = text; clearTimeout(message.timer); message.timer=setTimeout(()=>{$('validationMessage').textContent='';},3500); };
  const roleLabel = role => ({'office-user':'検査員','office-admin':'事業所管理者','safety-environment-admin':'管理者','guest':'ゲスト','validator':'検証者'})[role] || role;

  async function loadOrganizations(){
    const data=await window.ISSApi.organizations(); organizations=data.offices||[];
    const officeOptions=['<option value="">選択してください</option>',...organizations.map(o=>`<option value="${o.office_id}">${o.block_name}｜${o.office_name}</option>`)].join('');
    $('userOfficeId').innerHTML=officeOptions;
    const blocks=[...new Map(organizations.map(o=>[o.block_id,o.block_name])).entries()];
    $('newOfficeBlock').innerHTML=blocks.map(([id,name])=>`<option value="${id}">${name}</option>`).join('');
    $('officeCount').textContent=`${organizations.length}事業所`;
  }

  async function loadUsers(){
    const data=await window.ISSApi.adminUsers(); const users=data.users||[]; $('userCount').textContent=`${users.length}名`;
    $('userTableBody').innerHTML=users.map(u=>`<tr><td>${u.display_name}</td><td>${u.login_id||'-'}</td><td>${u.email||'-'}</td><td><span class="role-badge">${roleLabel(u.role)}</span></td><td>${u.block_name?`${u.block_name}｜${u.office_name}`:'全事業所'}</td><td><span class="state-badge ${u.active?'':'is-disabled'}">${u.active?'有効':'無効'}</span></td><td><button class="small-action" data-user-password-id="${u.id}">PASS変更</button> <button class="small-action" data-user-status-id="${u.id}" data-next-active="${u.active?'false':'true'}">${u.active?'無効化':'有効化'}</button></td></tr>`).join('') || '<tr><td colspan="7">登録済み利用者はありません。</td></tr>';
  }

  async function basicTest(){
    $('apiStatus').textContent='確認中'; $('authStatus').textContent='確認中'; $('connectionMessage').textContent='接続試験中…';
    try{const health=await window.ISSApi.health(); $('apiStatus').textContent='正常'; await window.ISSApi.me(); $('authStatus').textContent='認証済み'; await loadOrganizations(); await loadUsers(); $('connectionMessage').textContent=`正常：${new Date(health.serverTime).toLocaleString('ja-JP')}`; message('基本接続試験に合格しました。');}
    catch(e){$('apiStatus').textContent='失敗'; $('authStatus').textContent=window.ISSApi.isAuthenticated()?'確認失敗':'未ログイン'; $('connectionMessage').textContent=e.message; message(e.message);}
  }

  async function loadRuns(){
    const data=await window.ISSApi.validationRuns();
    $('validationRunList').innerHTML=(data.runs||[]).map(r=>`<div class="run-card"><div><strong>${r.title}</strong><p>${r.environment_name}｜${r.status}｜合格 ${r.passed_count}/${r.test_count}｜不合格 ${r.failed_count}</p></div><button class="small-action" data-run-id="${r.id}">開く</button></div>`).join('')||'<p>検証実施記録はありません。</p>';
  }

  async function openRun(id){
    const data=await window.ISSApi.validationRun(id); currentRunId=id; $('validationDetail').hidden=false; $('validationTitle').textContent=data.run.title; $('validationEnvironment').textContent=`${data.run.environment_name}｜${data.run.status}`; $('validationSummary').value=data.run.summary||'';
    $('validationChecklist').innerHTML=data.results.map(item=>`<article class="check-item" data-result-id="${item.id}"><div><span class="result-badge ${item.result==='不合格'?'is-failed':''}">${item.category}</span><h3>${item.test_name}</h3><p>${item.expected_result}</p></div><textarea data-field="actualResult" placeholder="実際の結果・確認内容">${item.actual_result||''}</textarea><div><select data-field="result"><option ${item.result==='未実施'?'selected':''}>未実施</option><option ${item.result==='合格'?'selected':''}>合格</option><option ${item.result==='不合格'?'selected':''}>不合格</option><option ${item.result==='対象外'?'selected':''}>対象外</option></select><textarea data-field="note" placeholder="備考">${item.note||''}</textarea><button class="small-action" data-save-result="${item.id}" type="button">保存</button></div></article>`).join('');
    $('validationDetail').scrollIntoView({behavior:'smooth',block:'start'});
  }

  $('userRole').addEventListener('change',()=>{$('userOfficeId').disabled=['safety-environment-admin','guest','validator'].includes($('userRole').value);});
  $('runBasicConnectionTest').addEventListener('click',basicTest);
  $('createSampleData').addEventListener('click',async()=>{if(!confirm('第一ブロック4事業所へ検証用申請番号を投入しますか？'))return;try{const result=await window.ISSApi.createValidationSampleData();message(`検証用データを${result.created}件追加しました（既存分は重複登録しません）。`);}catch(err){message(err.message);}});
  $('reloadUsers').addEventListener('click',()=>loadUsers().catch(e=>message(e.message)));
  $('userForm').addEventListener('submit',async e=>{e.preventDefault();try{await window.ISSApi.createAdminUser({loginId:$('userLoginId').value,initialPassword:$('userInitialPassword').value,email:$('userEmail').value||null,displayName:$('userDisplayName').value,role:$('userRole').value,officeId:$('userOfficeId').value||null});e.target.reset();$('userOfficeId').disabled=false;await loadUsers();message('利用者を登録しました。管理者が設定したIDとパスワードでログインできます。');}catch(err){message(err.message);}});
  $('officeForm').addEventListener('submit',async e=>{e.preventDefault();try{await window.ISSApi.createOffice({id:$('newOfficeId').value,blockId:$('newOfficeBlock').value,name:$('newOfficeName').value});e.target.reset();await loadOrganizations();message('事業所を登録しました。');}catch(err){message(err.message);}});
  $('userTableBody').addEventListener('click',async e=>{const passwordButton=e.target.closest('[data-user-password-id]');if(passwordButton){const newPassword=prompt('管理者画面から設定する新しいパスワードを入力してください。');if(!newPassword)return;try{await window.ISSApi.setAdminUserPassword(passwordButton.dataset.userPasswordId,newPassword);message('管理者画面からパスワードを変更しました。利用者へ安全な方法で通知してください。');}catch(err){message(err.message);}return;}const b=e.target.closest('[data-user-status-id]');if(!b)return;try{await window.ISSApi.setAdminUserStatus(b.dataset.userStatusId,b.dataset.nextActive==='true');await loadUsers();message('利用者状態を更新しました。');}catch(err){message(err.message);}});
  $('createValidationRun').addEventListener('click',async()=>{const title=prompt('検証実施名を入力してください。',`社内接続検証 ${new Date().toLocaleDateString('ja-JP')}`);if(!title)return;try{const data=await window.ISSApi.createValidationRun({title,environmentName:'社内検証環境'});await loadRuns();await openRun(data.run.id);message('検証チェックシートを作成しました。');}catch(err){message(err.message);}});
  $('validationRunList').addEventListener('click',e=>{const b=e.target.closest('[data-run-id]');if(b)openRun(b.dataset.runId).catch(err=>message(err.message));});
  $('validationChecklist').addEventListener('click',async e=>{const b=e.target.closest('[data-save-result]');if(!b)return;const card=b.closest('.check-item');try{await window.ISSApi.updateValidationResult(b.dataset.saveResult,{result:card.querySelector('[data-field="result"]').value,actualResult:card.querySelector('[data-field="actualResult"]').value,note:card.querySelector('[data-field="note"]').value});message('検証結果を保存しました。');await loadRuns();}catch(err){message(err.message);}});
  $('closeValidationDetail').addEventListener('click',()=>{$('validationDetail').hidden=true;currentRunId=null;});
  document.querySelectorAll('[data-complete-status]').forEach(b=>b.addEventListener('click',async()=>{if(!currentRunId)return;try{await window.ISSApi.completeValidationRun(currentRunId,{status:b.dataset.completeStatus,summary:$('validationSummary').value});message('検証実施記録を完了しました。');await loadRuns();await openRun(currentRunId);}catch(err){message(err.message);}}));

  (async()=>{try{if(window.ISSApi.isAuthenticated()){$('authStatus').textContent='認証済み';await loadOrganizations();await loadUsers();await loadRuns();}else{$('authStatus').textContent='未ログイン';$('connectionMessage').textContent='管理者でオンラインログインしてください。';}}catch(e){message(e.message);}})();
})();
