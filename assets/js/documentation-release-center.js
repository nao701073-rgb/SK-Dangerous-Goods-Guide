(() => {
  const STORAGE_KEY = "skDocumentationReleaseCenterV242";
  const documents = [
    ["specification", "システム仕様書", "画面、機能、データ、権限、認証、非機能要件をPart 242へ更新する。"],
    ["operation", "実施要領書", "運用開始、法令更新、バックアップ、障害対応、監査手順を最新版へ更新する。"],
    ["user", "利用者用使用要領書", "ゲストと事業所利用者を含む通常操作と利用範囲を反映する。"],
    ["officeAdmin", "事業所管理者用使用要領書", "所属事業所内の利用者・案件・権限管理を反映する。"],
    ["systemAdmin", "システム管理者用使用要領書", "クラウド認証、全体管理、利用履歴監査、法令更新を反映する。"],
    ["safetyEnvironment", "安全環境室向け運用要領", "安全環境室長・職員の権限と将来の管理者移行を反映する。"],
    ["release", "リリースノート・変更履歴", "Part 189以降の主要変更と未実装方針を整理する。"],
    ["verification", "総合検証・受入資料", "自動検査結果と配置後の手動確認項目を整理する。"]
  ];
  const components = [
    ["ログイン・認証", "個別ID、初回パスワード変更、MFA、ロック、招待、再設定"],
    ["役割別権限", "ゲスト、事業所利用者、事業所管理者、安全環境室長・職員、システム管理者"],
    ["主要業務", "危険物検索、関連法令・資料、申請番号、写真、履歴・お気に入り"],
    ["法令更新", "PDF・CSV・JSON登録、差分、検証、承認、履歴、公開判定"],
    ["監査・保全", "利用履歴、日次・週次・月次集計、障害、バックアップ、復元"],
    ["品質確認", "危険物データ2,725件、分類・SP・B欄正規化、総合自動検査"],
    ["規模", "試験運用約50名、将来約150名を想定"],
    ["配置後作業", "クラウド、専用URL、メール、実利用者登録、負荷・復元試験"]
  ];
  const $ = id => document.getElementById(id);
  const escapeHtml = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
  let state;
  try { state = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { state = {}; }
  state.documents ||= {};

  function render() {
    $("documentChecks").innerHTML = documents.map(([id, title, note]) => {
      const item = state.documents[id] || {};
      return `<div class="check-row ${item.done ? "is-ok" : "is-ng"}"><span class="check-mark">${item.done ? "✓" : "!"}</span><label><input type="checkbox" data-document="${id}" ${item.done ? "checked" : ""}> <strong>${escapeHtml(title)}</strong></label><span>${escapeHtml(note)}</span><input data-evidence="${id}" value="${escapeHtml(item.evidence || "")}" placeholder="更新版・保存先・確認者"></div>`;
    }).join("");
    const done = documents.filter(([id]) => state.documents[id]?.done).length;
    $("documentProgress").textContent = `${done} / ${documents.length}`;
    $("releaseBadge").textContent = done === documents.length ? "文書確定可能" : "Part 242";
    $("documentSummary").innerHTML = [
      ["文書更新", `${done}/${documents.length}`, done === documents.length ? "全項目完了" : "更新継続"],
      ["総合自動検査", "5/5", "Part 241時点で合格"],
      ["危険物データ", "2,725件", "エラー0・警告0"],
      ["想定利用者", "50 → 150名", "クラウド配置後に実負荷試験"]
    ].map(([a,b,c]) => `<article class="admin-summary-card"><strong>${a}</strong><span>${b}</span><small>${c}</small></article>`).join("");
    $("releaseComponents").innerHTML = components.map(([a,b]) => `<article class="admin-summary-card"><strong>${escapeHtml(a)}</strong><small>${escapeHtml(b)}</small></article>`).join("");
    $("documentationDecision").value = state.decision || "in-progress";
    $("documentationNotes").value = state.notes || "";
    $("documentationReviewDate").value = state.reviewDate || "";
  }

  function collect() {
    document.querySelectorAll("[data-document]").forEach(input => {
      const id = input.dataset.document;
      state.documents[id] = { done: input.checked, evidence: document.querySelector(`[data-evidence="${id}"]`)?.value || "" };
    });
    state.decision = $("documentationDecision").value;
    state.notes = $("documentationNotes").value;
    state.reviewDate = $("documentationReviewDate").value;
  }

  $("saveDocumentationReview").addEventListener("click", () => {
    collect();
    const complete = documents.every(([id]) => state.documents[id]?.done);
    if (state.decision === "complete" && !complete) {
      $("documentationMessage").textContent = "すべての正式文書を確認してから「完成版文書確定」を選択してください。";
      return;
    }
    state.savedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("documentationMessage").textContent = "文書統合の確認結果を保存しました。";
    render();
  });

  $("downloadReleaseManifest").addEventListener("click", () => {
    collect();
    const manifest = {
      version: "Part 242",
      generatedAt: new Date().toISOString(),
      documentationDecision: state.decision || "in-progress",
      documents: documents.map(([id,title,note]) => ({ id,title,note,...(state.documents[id] || {done:false,evidence:""}) })),
      releaseComponents: components.map(([name,description]) => ({name,description})),
      notes: state.notes || "",
      nextReviewDate: state.reviewDate || "",
      policies: { voluntaryUse: true, watermarkImplemented: false, screenshotTrackingImplemented: false, automaticScreenCaptureImplemented: false }
    };
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Part242_文書リリース構成_${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
  });
  render();
})();
