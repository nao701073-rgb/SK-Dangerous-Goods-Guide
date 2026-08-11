(()=>{
  const root=document.getElementById('centralBackupPanel');
  if(!root)return;
  const q=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const fmt=value=>value?new Date(value).toLocaleString('ja-JP'):'-';
  const message=(text,type='')=>{const el=q('centralBackupMessage');el.textContent=text;el.className=`part503-message${type?` is-${type}`:''}`;};
  const render=data=>{
    const s=data.settings||{}; const health=data.health||{}; const runs=Array.isArray(data.runs)?data.runs:[];
    q('centralBackupEnabled').checked=s.enabled!==false;
    q('centralBackupInterval').value=s.interval_hours||24;
    q('centralBackupRetention').value=s.retention_days||90;
    q('centralBackupOffsite').checked=Boolean(s.require_offsite_copy);
    q('centralRestoreTestInterval').value=s.restore_test_interval_days||90;
    q('centralBackupHealth').textContent=(health.overdue||health.offsiteRequiredMissing||health.restoreTestDue||!['completed','verified'].includes(health.latestStatus))?'要確認':'正常';
    q('centralBackupLatest').textContent=runs[0]?`${fmt(runs[0].started_at)}／${runs[0].status}`:'記録なし';
    q('centralBackupOffsiteStatus').textContent=runs[0]?.offsite_location||'未記録';
    q('centralBackupRestoreStatus').textContent=runs[0]?.verified_at?`確認済み ${fmt(runs[0].verified_at)}`:'復元試験未実施';
    q('centralBackupRows').innerHTML=runs.length?runs.slice(0,20).map(run=>`<tr><td data-label="開始">${esc(fmt(run.started_at))}</td><td data-label="状態"><span class="part503-badge">${esc(run.status)}</span></td><td data-label="保存先">${esc(run.storage_location||run.backup_path||'-')}</td><td data-label="遠隔保管">${esc(run.offsite_location||'-')}</td><td data-label="検証">${esc(run.verified_at?fmt(run.verified_at):'未実施')}</td><td data-label="操作">${run.id?`<button type="button" data-restore-test="${esc(run.id)}">復元試験を記録</button>`:''}</td></tr>`).join(''):'<tr><td colspan="6">中央バックアップの実行記録はありません。</td></tr>';
    root.querySelectorAll('[data-restore-test]').forEach(btn=>btn.addEventListener('click',async()=>{
      const result=prompt('復元試験結果を入力してください（passed または failed）','passed');if(!result)return;
      const note=prompt('復元試験の備考を入力してください','')||'';
      try{await window.ISSApi.recordRestoreTest(btn.dataset.restoreTest,{result:result.trim(),note});message('復元試験結果を保存しました。','success');await load();}catch(error){message(error.message||'保存できませんでした。','error');}
    }));
  };
  async function load(){
    message('中央サーバーのバックアップ状態を確認しています。');
    try{if(!window.ISSApi?.backupStatus)throw new Error('中央サーバーAPIが設定されていません。');const data=await window.ISSApi.backupStatus();render(data);message('中央保存・バックアップの状態を取得しました。','success');}
    catch(error){message(`中央サーバーへ接続できません。静的版では中央保存・自動バックアップは動作しません。${error.message?`（${error.message}）`:''}`,'error');}
  }
  q('refreshCentralBackup')?.addEventListener('click',load);
  q('saveCentralBackupSettings')?.addEventListener('click',async()=>{
    const payload={enabled:q('centralBackupEnabled').checked,intervalHours:Number(q('centralBackupInterval').value),retentionDays:Number(q('centralBackupRetention').value),requireOffsiteCopy:q('centralBackupOffsite').checked,restoreTestIntervalDays:Number(q('centralRestoreTestInterval').value)};
    try{if(!window.ISSApi?.updateBackupSettings)throw new Error('中央サーバーAPIが設定されていません。');await window.ISSApi.updateBackupSettings(payload);message('中央バックアップ設定を保存しました。','success');await load();}catch(error){message(error.message||'設定を保存できませんでした。','error');}
  });
  load();
})();

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/central-backup-admin.js": "part503" });
