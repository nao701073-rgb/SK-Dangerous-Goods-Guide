(() => {
  const REPORT_URL = "../docs/part537_本番環境統合試験レポート.json";
  const $ = id => document.getElementById(id);
  let report = null;
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const statusText = status => status === "passed" ? "合格" : "不合格";
  const render = data => {
    report = data;
    const ok = data.overallStatus === "passed";
    $("verificationBadge").textContent = ok ? "統合試験 合格" : "統合試験 不合格";
    $("verificationBadge").dataset.status = data.overallStatus;
    $("verificationGeneratedAt").textContent = `検査日時：${new Date(data.generatedAt).toLocaleString("ja-JP")}`;
    const cards = [
      ["検査項目", data.summary.testCount, "件"],
      ["合格", data.summary.passedCount, "件"],
      ["不合格", data.summary.failedCount, "件"],
      ["構文確認", data.summary.javascriptFilesChecked, "ファイル"],
      ["主要画面", data.summary.requiredPagesChecked, "画面"]
    ];
    $("verificationSummary").innerHTML = cards.map(([label,value,unit]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(unit)}</small></article>`).join("");
    $("verificationTests").innerHTML = data.tests.map(test => `<article class="verification-test" data-status="${escapeHtml(test.status)}"><div><span class="verification-mark">${test.status === "passed" ? "✓" : "!"}</span><strong>${escapeHtml(test.name)}</strong></div><span class="verification-status">${statusText(test.status)}</span>${test.checkedFiles ? `<small>${escapeHtml(test.checkedFiles)}ファイル確認</small>` : ""}${test.missing?.length ? `<p>不足：${escapeHtml(test.missing.join("、"))}</p>` : ""}${test.failures?.length ? `<p>構文エラー：${escapeHtml(test.failures.length)}件</p>` : ""}</article>`).join("");
    $("manualVerification").innerHTML = data.manualVerificationRequired.map(item => `<div class="check-row"><span class="check-mark">!</span><strong>${escapeHtml(item)}</strong><span>配置先決定後に確認</span></div>`).join("");
  };
  fetch(REPORT_URL, { cache: "no-store" }).then(res => { if (!res.ok) throw new Error(`HTTP ${res.status}`); return res.json(); }).then(render).catch(error => { $("verificationBadge").textContent = "レポート読込失敗"; $("verificationMessage").textContent = `総合検証レポートを読み込めませんでした：${error.message}`; });
  $("downloadVerification").addEventListener("click", () => {
    if (!report) { $("verificationMessage").textContent = "レポートの読込完了後に実行してください。"; return; }
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `Part537_本番環境統合試験_${new Date().toISOString().slice(0,10)}.json`; link.click(); URL.revokeObjectURL(link.href);
  });
})();
