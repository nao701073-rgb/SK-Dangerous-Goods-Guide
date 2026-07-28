(() => {
  const $ = (id) => document.getElementById(id);
  const KEY = "sk_prototype_completion_part247";
  const items = [
    ["navigation", "ユーザー設定・システム設定の分離", "重複カードを削除し、権限別メニューを独立表示する。"],
    ["roles", "役割別アクセス制御", "ゲスト、事業所利用者、事業所管理者、安全環境室長、安全環境室職員、システム管理者を確認する。"],
    ["core", "主要業務機能", "危険物検索、関連法令、関連資料、申請番号・写真の導線を確認する。"],
    ["data", "法令・危険物データ品質", "重複・欠損・分類・SP・B欄の監査結果が合格していることを確認する。"],
    ["identity", "ログイン・認証・利用者管理", "初回ログイン、MFA、ロック、招待、一括登録の仕様を確認する。"],
    ["audit", "利用履歴・監査", "利用履歴、日次・週次・月次集計、管理者閲覧記録を確認する。"],
    ["continuity", "保全・障害対応", "バックアップ、復元、障害、是正、定期点検の機能を確認する。"],
    ["documents", "完成版文書", "仕様書・実施要領書・役割別使用要領書のPart 243版を確認する。"],
    ["verification", "総合自動検査", "静的参照、権限、データ品質、JavaScript構文の合格を確認する。"]
  ];
  let state = {checks:{}, decision:"reviewing", notes:"", savedAt:null};
  try { state = {...state, ...JSON.parse(localStorage.getItem(KEY) || "{}")}; } catch (_) {}
  function esc(v){return String(v ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");}
  function render(){
    $("candidateChecks").innerHTML = items.map(([id,title,note]) => { const v=state.checks[id]||{}; return `<div class="check-row ${v.done?"is-ok":"is-ng"}"><span class="check-mark">${v.done?"✓":"!"}</span><label><input type="checkbox" data-check="${id}" ${v.done?"checked":""}> <strong>${esc(title)}</strong></label><span>${esc(note)}</span><input data-evidence="${id}" value="${esc(v.evidence||"")}" placeholder="証跡・確認内容"></div>`; }).join("");
    const done=items.filter(([id])=>state.checks[id]?.done).length; $("candidateProgress").textContent=`${done} / ${items.length}`;
    $("candidateDecision").value=state.decision||"reviewing"; $("candidateNotes").value=state.notes||"";
    $("candidateBadge").textContent=done===items.length?"試作完成":"Part 247 最終確認中";
  }
  function collect(){
    document.querySelectorAll("[data-check]").forEach(el=>{const id=el.dataset.check;state.checks[id]=state.checks[id]||{};state.checks[id].done=el.checked;});
    document.querySelectorAll("[data-evidence]").forEach(el=>{const id=el.dataset.evidence;state.checks[id]=state.checks[id]||{};state.checks[id].evidence=el.value.trim();});
    state.decision=$("candidateDecision").value; state.notes=$("candidateNotes").value.trim();
  }
  $("candidateChecks").addEventListener("change",()=>{collect();render();});
  $("saveCandidate").addEventListener("click",()=>{collect();const all=items.every(([id])=>state.checks[id]?.done);if(state.decision==="complete"&&!all){$("candidateMessage").textContent="すべての確認項目を完了してから「試作完成」を選択してください。";return;}state.savedAt=new Date().toISOString();localStorage.setItem(KEY,JSON.stringify(state));$("candidateMessage").textContent="確認結果を保存しました。";render();});
  $("exportCandidate").addEventListener("click",()=>{collect();const payload={...state,version:"Part 247",exportedAt:new Date().toISOString(),deploymentTasks:["クラウド配置先・URL・HTTPS・CORS","認証メール","初期利用者約50名","50名・150名性能試験","バックアップ・復元試験","実端末確認","職制承認・周知"]};const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Part247_試作完成版_${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href);});
  render();
})();
