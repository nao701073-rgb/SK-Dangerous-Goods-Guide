(() => {
  "use strict";
  const KEY = "skDeploymentReadinessPart248";
  const items = [
    ["hosting", "クラウド配置先・公開URL・HTTPS・CORS"],
    ["database", "PostgreSQL接続・マイグレーション・秘密情報"],
    ["storage", "写真保存領域・容量・アクセス制御"],
    ["mail", "招待・MFA・パスワード再設定メール"],
    ["users", "初期利用者約50名・所属・役割・安全環境室6名"],
    ["permissions", "役割別の閲覧・登録・編集・削除制御"],
    ["load50", "50名想定の性能・応答時間確認"],
    ["load150", "150名想定の性能・拡張確認"],
    ["backup", "データベース・写真のバックアップ"],
    ["restore", "復元試験・復旧時間・証跡"],
    ["devices", "PC・スマートフォン・主要ブラウザー確認"],
    ["approval", "職制承認・利用者周知・問い合わせ窓口"]
  ];
  const $ = id => document.getElementById(id);
  const list = $("readinessChecklist");
  items.forEach(([id, label]) => {
    const row = document.createElement("label"); row.className = "check-row";
    row.innerHTML = `<input type="checkbox" data-check="${id}"><strong>${label}</strong><input type="text" data-evidence="${id}" placeholder="証跡・確認内容">`;
    list.appendChild(row);
  });
  function collect(){
    return {version:"Part 248", environmentName:$("environmentName").value.trim(), publicUrl:$("publicUrl").value.trim(), apiUrl:$("apiUrl").value.trim(), expectedUsers:Number($("expectedUsers").value||0), decision:$("decision").value, notes:$("notes").value.trim(), checks:Object.fromEntries(items.map(([id])=>[id,{done:list.querySelector(`[data-check="${id}"]`).checked,evidence:list.querySelector(`[data-evidence="${id}"]`).value.trim()}])), updatedAt:new Date().toISOString()};
  }
  function apply(data){ if(!data)return; ["environmentName","publicUrl","apiUrl","expectedUsers","decision","notes"].forEach(k=>{if(data[k]!==undefined)$(k).value=data[k];}); items.forEach(([id])=>{const v=data.checks?.[id]; if(v){list.querySelector(`[data-check="${id}"]`).checked=!!v.done; list.querySelector(`[data-evidence="${id}"]`).value=v.evidence||"";}}); $("readinessStatus").textContent=data.updatedAt?`最終保存：${new Date(data.updatedAt).toLocaleString("ja-JP")}`:"未保存"; }
  $("saveReadiness").addEventListener("click",()=>{const d=collect(); const all=Object.values(d.checks).every(v=>v.done); if(d.decision==="production-ready"&&!all){alert("正式運用開始可にするには全項目の完了が必要です。");return;} localStorage.setItem(KEY,JSON.stringify(d)); apply(d);});
  $("exportReadiness").addEventListener("click",()=>{const d=collect(); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([JSON.stringify(d,null,2)],{type:"application/json"})); a.download=`Part248_配置実運用準備_${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(a.href);});
  try{apply(JSON.parse(localStorage.getItem(KEY)||"null"));}catch{apply(null);}
})();
