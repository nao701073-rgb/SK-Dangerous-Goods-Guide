(() => {
  const KEY = "skCompletionRoadmapV239";
  const items = [
    ["menu", "管理画面・メニュー統合", "重複導線を整理し、役割別表示を確認する。"],
    ["roles", "ログイン・権限総合確認", "ゲストからシステム管理者までのアクセス制御を確認する。"],
    ["business", "主要業務機能の通し確認", "検索、法令、資料、申請番号、写真を役割別に確認する。"],
    ["data", "法令更新・データ品質", "更新、差分、分類・SP・B欄、公開判定を確認する。"],
    ["audit", "監査・利用履歴", "記録対象、管理者閲覧、任意利用表示、保存方針を確認する。"],
    ["recovery", "バックアップ・障害対応", "バックアップ確認、復元手順、障害記録を確認する。"],
    ["scale", "50名・150名規模の確認", "利用者CSV、検索性能、同時利用試験の準備を確認する。"],
    ["docs", "仕様書・要領書の最終更新", "完成版の画面・権限・運用内容へ文書を更新する。"]
  ];
  const $ = id => document.getElementById(id);
  const state = JSON.parse(localStorage.getItem(KEY) || "{}");
  state.checks ||= {};
  const render = () => {
    $("roadmapChecks").innerHTML = items.map(([id,title,note]) => { const v=state.checks[id]||{}; return `<div class="check-row ${v.done?"is-ok":"is-ng"}"><span class="check-mark">${v.done?"✓":"!"}</span><label><input type="checkbox" data-check="${id}" ${v.done?"checked":""}> <strong>${title}</strong></label><span>${note}</span><input data-evidence="${id}" value="${String(v.evidence||"").replaceAll("&","&amp;").replaceAll('"','&quot;')}" placeholder="証跡・残課題"></div>`; }).join("");
    const done=items.filter(([id])=>state.checks[id]?.done).length; $("roadmapProgress").textContent=`${done} / ${items.length}`; $("roadmapBadge").textContent=done===items.length?"総合確認可能":"統合フェーズ";
    $("roadmapDecision").value=state.decision||"in-progress"; $("roadmapNotes").value=state.notes||"";
  };
  const collect = () => { document.querySelectorAll("[data-check]").forEach(el => { const id=el.dataset.check; state.checks[id]={done:el.checked,evidence:document.querySelector(`[data-evidence="${id}"]`)?.value||""}; }); state.decision=$("roadmapDecision").value; state.notes=$("roadmapNotes").value; };
  $("saveRoadmap").addEventListener("click",()=>{ collect(); const all=items.every(([id])=>state.checks[id]?.done); if(state.decision==="complete"&&!all){$("roadmapMessage").textContent="すべての項目を完了してから試作完成を選択してください。";return;} state.savedAt=new Date().toISOString(); localStorage.setItem(KEY,JSON.stringify(state)); $("roadmapMessage").textContent="進捗を保存しました。"; render(); });
  $("exportRoadmap").addEventListener("click",()=>{collect(); const blob=new Blob([JSON.stringify({...state,version:"Part 239",exportedAt:new Date().toISOString()},null,2)],{type:"application/json"}); const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Part239_完成版統合チェック_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);});
  $("resetRoadmap").addEventListener("click",()=>{if(!confirm("保存済みの入力を初期化しますか？"))return;localStorage.removeItem(KEY);location.reload();});
  render();
})();