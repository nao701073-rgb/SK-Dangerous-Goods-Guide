(() => {
  "use strict";

  const master = window.IMDG_INSPECTION_GUIDE_SUMMARY || {};
  const sections = Array.isArray(master.sections) ? master.sections : [];
  const categories = master.categories || {};

  const queryInput = document.getElementById("trainingGuideQuery");
  const categorySelect = document.getElementById("trainingGuideCategory");
  const list = document.getElementById("trainingGuideList");
  const count = document.getElementById("trainingGuideCount");
  const caution = document.getElementById("trainingGuideCaution");
  const progress = document.getElementById("trainingGuideProgress");
  const unreadOnly = document.getElementById("trainingGuideUnreadOnly");
  const favoriteOnly = document.getElementById("trainingGuideFavoriteOnly");
  const exportNotes = document.getElementById("exportTrainingNotes");
  const PROGRESS_KEY = "iss-training-guide-progress-v1";

  if (!queryInput || !categorySelect || !list || !count) return;

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const normalize = value => String(value ?? "").normalize("NFKC").toLowerCase();

  function readProgress() {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); } catch { return {}; }
  }

  function writeProgress(value) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(value));
  }

  function getState(id) {
    const all = readProgress();
    return all[id] || { completed: false, favorite: false, note: "" };
  }

  function patchState(id, patch) {
    const all = readProgress();
    all[id] = { completed: false, favorite: false, note: "", ...(all[id] || {}), ...patch, updatedAt: new Date().toISOString() };
    writeProgress(all);
  }

  function updateProgressSummary() {
    const all = readProgress();
    const completed = sections.filter(item => all[item.id]?.completed).length;
    if (progress) progress.textContent = `${completed} / ${sections.length}`;
  }

  function exportProgressCsv() {
    const all = readProgress();
    const rows = [["カテゴリー","タイトル","確認済み","お気に入り","メモ","更新日時"]];
    sections.forEach(item => {
      const state = all[item.id] || {};
      rows.push([categories[item.category] || item.category,item.title,state.completed ? "はい" : "いいえ",state.favorite ? "はい" : "いいえ",state.note || "",state.updatedAt || ""]);
    });
    const esc = v => { const t=String(v??""); return /[",\n]/.test(t) ? `"${t.replaceAll('"','""')}"` : t; };
    const blob = new Blob(["\ufeff" + rows.map(r => r.map(esc).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=`関連資料AI要約_確認記録_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function populateCategories() {
    Object.entries(categories).forEach(([value, label]) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = label;
      categorySelect.appendChild(option);
    });
  }

  function render() {
    const query = normalize(queryInput.value);
    const category = categorySelect.value;

    const filtered = sections.filter(item => {
      const state = getState(item.id);
      if (unreadOnly?.checked && state.completed) return false;
      if (favoriteOnly?.checked && !state.favorite) return false;
      if (category && item.category !== category) return false;
      const haystack = normalize([
        item.title,
        item.summary,
        item.sourcePages,
        categories[item.category],
        ...(item.keyPoints || []),
        ...(item.inspectionPoints || []),
        ...(item.images || []).map(image => image.caption)
      ].join(" "));
      return !query || haystack.includes(query);
    });

    count.textContent = `${filtered.length}件`;

    if (!filtered.length) {
      list.innerHTML = `
        <div class="empty-state">
          <strong>該当する要約がありません</strong>
          <p>検索語またはカテゴリーを変更してください。</p>
        </div>
      `;
      return;
    }

    list.innerHTML = filtered.map(item => {
      const state = getState(item.id);
      return `
      <details class="training-guide-card ${state.completed ? "is-completed" : ""} ${state.favorite ? "is-favorite" : ""}" data-guide-id="${escapeHtml(item.id)}">
        <summary>
          <div>
            <div class="training-guide-meta">
              <span class="ai-badge">AI要約</span>
              <span>${escapeHtml(categories[item.category] || item.category)}</span>
              <span>資料本文 p.${escapeHtml(item.sourcePages)}</span>
            </div>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(item.summary)}</p>
          </div>
          <span class="training-guide-expand">詳細</span>
        </summary>

        <div class="training-guide-detail">
          ${item.plainExplanation ? `<section class="training-guide-explanation"><h4>概要</h4><p>${escapeHtml(item.plainExplanation)}</p></section>` : ""}

          <section>
            <h4>重要ポイント</h4>
            <ul>
              ${(item.keyPoints || []).map(point => `<li>${escapeHtml(point)}</li>`).join("")}
            </ul>
          </section>

          ${Array.isArray(item.workflow) && item.workflow.length ? `<section><h4>確認の進め方</h4><ol>${item.workflow.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ol></section>` : ""}

          <section>
            <h4>検査・検品時の確認ポイント</h4>
            <ul>
              ${(item.inspectionPoints || []).map(point => `<li>${escapeHtml(point)}</li>`).join("")}
            </ul>
          </section>

          ${Array.isArray(item.commonMistakes) && item.commonMistakes.length ? `<section class="training-guide-mistakes"><h4>よくある見落とし</h4><ul>${item.commonMistakes.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul></section>` : ""}

          <div class="training-guide-actions training-guide-actions--simple">
            <button type="button" data-guide-favorite="${escapeHtml(item.id)}">${state.favorite ? "★ お気に入り解除" : "☆ お気に入り"}</button>
          </div>
          <label>個人メモ<textarea class="training-guide-note" data-guide-note="${escapeHtml(item.id)}" placeholder="確認事項や社内運用メモ">${escapeHtml(state.note || "")}</textarea></label>

          <section>
            <h4>元資料の図・写真・表の要約</h4>
            <p class="training-guide-gallery-note">同じページを重複表示せず、元資料から選定した各ページを1枚ずつ掲載しています。画像を押すと拡大でき、文字・数値・凡例・脚注を確認できます。</p>
            <div class="training-guide-gallery">
              ${(item.images || []).map(image => `
                <figure class="training-guide-figure">
                  <button class="training-guide-image-button" type="button"
                          data-image-src="${escapeHtml(image.src)}"
                          data-image-caption="${escapeHtml(image.caption)}（PDF ${escapeHtml(image.page)}ページ）">
                    <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.caption)}" loading="lazy">
                  </button>
                  <figcaption>
                    <div class="training-guide-figure-label">元資料ページ</div>
                    <strong>${escapeHtml(image.caption)}</strong>
                    <span>PDF ${escapeHtml(image.page)}ページ</span>
                    <p>${escapeHtml(image.summary || `${image.caption}について、元資料の構成・表示例・判断上のポイントを視覚的に確認できます。`)}</p>
                    ${Array.isArray(image.checkPoints) && image.checkPoints.length ? `<div class="training-guide-figure-checks"><b>この画像で確認する点</b><ul>${image.checkPoints.map(point => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div>` : ""}
                  </figcaption>
                </figure>`).join("")}
            </div>
          </section>
        </div>
      </details>
    `; }).join("");
    updateProgressSummary();
  }

  function openLightbox(src, caption) {
    const overlay = document.createElement("div");
    overlay.className = "training-guide-lightbox";
    overlay.innerHTML = `
      <div class="training-guide-lightbox__dialog" role="dialog" aria-modal="true" aria-label="参考画像の拡大表示">
        <div class="training-guide-lightbox__header">
          <strong>${escapeHtml(caption)}</strong>
          <button type="button" aria-label="閉じる">×</button>
        </div>
        <div class="training-guide-lightbox__body">
          <img src="${escapeHtml(src)}" alt="${escapeHtml(caption)}">
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelector("button").addEventListener("click", close);
    overlay.addEventListener("click", event => {
      if (event.target === overlay) close();
    });
    document.addEventListener("keydown", function onKey(event) {
      if (event.key === "Escape") {
        close();
        document.removeEventListener("keydown", onKey);
      }
    });
  }

  list.addEventListener("click", event => {
    const imageButton = event.target.closest(".training-guide-image-button");
    if (imageButton) { openLightbox(imageButton.dataset.imageSrc, imageButton.dataset.imageCaption); return; }
    const completeButton = event.target.closest("[data-guide-complete]");
    if (completeButton) { const state=getState(completeButton.dataset.guideComplete); patchState(completeButton.dataset.guideComplete,{ completed: !state.completed }); render(); return; }
    const favoriteButton = event.target.closest("[data-guide-favorite]");
    if (favoriteButton) { const state=getState(favoriteButton.dataset.guideFavorite); patchState(favoriteButton.dataset.guideFavorite,{ favorite: !state.favorite }); render(); }
  });

  list.addEventListener("change", event => {
    const note = event.target.closest("[data-guide-note]");
    if (note) patchState(note.dataset.guideNote, { note: note.value });
  });

  queryInput.addEventListener("input", render);
  categorySelect.addEventListener("change", render);
  unreadOnly?.addEventListener("change", render);
  favoriteOnly?.addEventListener("change", render);
  exportNotes?.addEventListener("click", exportProgressCsv);

  caution.innerHTML = `
    <strong>${escapeHtml(master.title || "資料AI要約")}</strong>
    <p>${escapeHtml(master.sourceNote || "")}</p>
    <p>${escapeHtml(master.caution || "")}</p>
  `;

  populateCategories();
  render();
})();
