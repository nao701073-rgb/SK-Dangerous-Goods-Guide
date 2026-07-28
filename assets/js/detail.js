
(() => {
  "use strict";

  const root = document.getElementById("detailRoot");
  const data = Array.isArray(window.UN_DATABASE) ? window.UN_DATABASE : [];
  const un = new URLSearchParams(window.location.search).get("un");

  const escapeHtml = value =>
    String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");


  const labelMaster = Array.isArray(window.LABEL_MASTER?.labels) ? window.LABEL_MASTER.labels : [];

  const normalizeClassValue = value =>
    String(value ?? "")
      .trim()
      .replace(/^class\s*/i, "")
      .replace(/[()]/g, "")
      .replace(/\s+/g, "");

  const resolveClassLabel = classValue => {
    const normalized = normalizeClassValue(classValue);
    if (!normalized || normalized === '-' || normalized === 'なし') return null;
    const exact = labelMaster.find(item => normalizeClassValue(item.class) === normalized);
    if (exact) return exact;
    const mainClass = normalized.split('.')[0];
    return labelMaster.find(item => normalizeClassValue(item.class) === mainClass) || null;
  };

  const parseSubsidiaryRiskCodes = value => {
    const normalized = String(value ?? "").normalize("NFKC").toUpperCase().trim();
    if (!normalized || normalized === "-" || normalized === "—" || normalized === "なし") return [];

    // SP番号、注記番号、頁番号を副次危険性等級として誤認しない。
    const withoutSpecialProvisions = normalized.replace(/SP\s*\d+[A-Z]?/g, " ");
    const allowed = new Set(["1", "1.1", "1.2", "1.3", "1.4", "1.5", "1.6", "2.1", "3", "4.1", "4.2", "4.3", "5.1", "6.1", "8"]);
    const tokens = withoutSpecialProvisions
      .split(/[\s,，、・/／;；()（）]+/)
      .map(token => token.trim())
      .filter(token => allowed.has(token))
      .map(token => /^1(?:\.[1-6])?$/.test(token) ? "1" : token);
    return [...new Set(tokens)];
  };

  const formatSubsidiaryRisk = value => {
    const classCodes = parseSubsidiaryRiskCodes(value);
    return classCodes.length ? classCodes.join("/") : "なし";
  };
  const display = value =>
    value && value !== "-" ? escapeHtml(value) : "該当なし";

  const item = data.find(entry => entry.unNumber === un);

  if (!item) {
    root.innerHTML = `
      <section class="empty-state">
        <strong>対象データが見つかりません</strong>
        <p>検索画面に戻り、別のUN番号を選択してください。</p>
      </section>
    `;
    return;
  }

  const related = data
    .filter(entry =>
      entry.unNumber !== item.unNumber &&
      (
        (entry.class && entry.class === item.class) ||
        (entry.properShippingNameJa && item.properShippingNameJa &&
          entry.properShippingNameJa.includes(item.properShippingNameJa.split("、")[0]))
      )
    )
    .slice(0, 8);

  const favorite = window.ISSStorage?.isFavorite(item.unNumber);
  const ems = window.EMSResolver?.resolve(item) || {
    fireCode: "", spillageCode: "", status: "unresolved"
  };

  root.innerHTML = `
    <section class="detail-hero">
      <div class="detail-hero__top">
        <span class="un-number">UN${escapeHtml(item.unNumber)}</span>
        <button id="detailFavoriteButton" class="detail-favorite-button ${favorite ? "is-favorite" : ""}" type="button">
          ${favorite ? "★ お気に入り登録済み" : "☆ お気に入り登録"}
        </button>
      </div>
      <h2>${escapeHtml(item.properShippingNameJa)}</h2>
      <p>${escapeHtml(item.properShippingName)}</p>
    </section>

    <section class="detail-grid">
      <article class="detail-card">
        <h3>基本情報</h3>
        <dl class="definition-grid">
          <div><dt>等級</dt><dd>${display(item.class)}</dd></div>
          <div><dt>副次危険性等級</dt><dd>${escapeHtml(formatSubsidiaryRisk(item.subsidiaryRisk))}</dd></div>
          <div><dt>容器等級</dt><dd>${display(item.packingGroup)}</dd></div>
          <div><dt>隔離グループ</dt><dd>${display(item.segregationGroup)}</dd></div>
          <div><dt>少量危険物</dt><dd>${display(item.limitedQuantity)}</dd></div>
        </dl>
      </article>

      <article class="detail-card">
        <h3>標札表示確認</h3>
        <div class="placard-info">
          <div><span>正標札</span><strong>等級 ${display(item.class)}</strong></div>
          <div><span>副標札</span><strong>副次危険性等級 ${escapeHtml(formatSubsidiaryRisk(item.subsidiaryRisk))}</strong></div>
        </div>
        <div class="placard-checks">
          <label><input type="checkbox"> 正標札表示</label>
          <label><input type="checkbox"> 副標札表示</label>
          <label><input type="checkbox"> 正標札、副標札と国連番号の整合確認</label>
        </div>
      </article>

      <article class="detail-card">
        <h3>包装要件</h3>
        <dl class="definition-grid">
          <div><dt>小型容器</dt><dd>${display(item.smallPackingInstruction)}</dd></div>
          <div><dt>追加規定</dt><dd>${display(item.smallPackingAdditional)}</dd></div>
          <div><dt>大型容器</dt><dd>${display(item.largePackingInstruction)}</dd></div>
          <div><dt>IBC容器</dt><dd>${display(item.ibcInstruction)}</dd></div>
          <div><dt>ポータブルタンク</dt><dd>${display(item.portableTankInstruction)}</dd></div>
          <div><dt>タンク追加規定</dt><dd>${display(item.portableTankAdditional)}</dd></div>
        </dl>
      </article>

      <article class="detail-card">
        <h3>特別規定</h3>
        <div class="reference-block">
          <strong>${display(item.specialProvisions)}</strong>
          <p>英語原文・日本語解説は、正式データ整備後にこの欄へ展開します。</p>
        </div>
      </article>

      <article class="detail-card detail-card--ems">
        <div class="detail-card__heading-row">
          <h3>EmS</h3>
          <span class="ems-resolution-status ${ems.status}">
            ${ems.status === "resolved" ? "コード取得済み" : "未解決"}
          </span>
        </div>

        <dl class="definition-grid">
          <div>
            <dt>Fire Schedule</dt>
            <dd class="ems-code">${display(ems.fireCode)}</dd>
          </div>
          <div>
            <dt>Spillage Schedule</dt>
            <dd class="ems-code">${display(ems.spillageCode)}</dd>
          </div>
        </dl>

        ${
          ems.status === "resolved"
            ? `
              <details class="ems-detail">
                <summary>コードの参照情報を表示</summary>
                <div class="ems-reference-grid">
                  <div>
                    <strong>${display(ems.fireCode)}</strong>
                    <p>${display(ems.fireSchedule?.titleEn)}</p>
                  </div>
                  <div>
                    <strong>${display(ems.spillageCode)}</strong>
                    <p>${display(ems.spillageSchedule?.titleEn)}</p>
                  </div>
                </div>
                <p class="field-note">
                  出典：${display(ems.source)}／IMDG Code Amendment
                  ${display(ems.imdgAmendment)}
                </p>
              </details>
            `
            : `
              <p class="field-note">
                現在のUNデータまたはEmS索引に対応コードがありません。
                推測によるコード表示は行いません。
              </p>
            `
        }
      </article>

      <article class="detail-card">
        <h3>Segregation</h3>
        <div class="reference-block">
          <strong>${display(item.segregation)}</strong>
          <p>隔離コード、原文、日本語解説を将来表示できる構造です。</p>
        </div>
      </article>

      <article class="detail-card">
        <h3>Stowage</h3>
        <div class="reference-block">
          <strong>${display(item.stowage)}</strong>
          <p>積載方法コード、原文、日本語解説を将来表示できる構造です。</p>
        </div>
      </article>

      <article class="detail-card">
        <h3>お気に入りメモ</h3>
        <textarea id="favoriteNote" class="note-textarea" rows="5" placeholder="事業所内で共有するメモを入力"></textarea>
        <button id="saveFavoriteNote" class="secondary-action" type="button">メモを保存</button>
      </article>

      <article class="detail-card detail-card--wide">
        <h3>関連UN番号</h3>
        <div class="related-grid">
          ${
            related.length
              ? related.map(entry => `
                <a href="dangerous-goods-detail.html?un=${encodeURIComponent(entry.unNumber)}">
                  <strong>UN${escapeHtml(entry.unNumber)} ${escapeHtml(entry.properShippingNameJa)}</strong>
                  <small>${escapeHtml(entry.properShippingName)}</small>
                </a>
              `).join("")
              : "<p>関連候補はありません。</p>"
          }
        </div>
      </article>

      <article class="detail-card detail-card--wide">
        <h3>出典情報</h3>
        <dl class="definition-grid">
          <div><dt>出典</dt><dd>${display(item.source)}</dd></div>
          <div><dt>出典ページ</dt><dd>${display(item.sourcePage)}</dd></div>
        </dl>
      </article>

      <details class="detail-card detail-card--wide">
        <summary><strong>抽出元テキストを表示</strong></summary>
        <pre class="raw-text">${escapeHtml(item.rawText || "データなし")}</pre>
      </details>
    </section>
  `;

  const favoriteButton = document.getElementById("detailFavoriteButton");
  const noteInput = document.getElementById("favoriteNote");
  const saveNoteButton = document.getElementById("saveFavoriteNote");

  const currentFavorite = window.ISSStorage?.getFavorites()
    .find(entry => entry.unNumber === item.unNumber);
  if (currentFavorite) noteInput.value = currentFavorite.note || "";

  favoriteButton?.addEventListener("click", () => {
    if (!window.ISSStorage) return;
    const added = window.ISSStorage.toggleFavorite(item);
    favoriteButton.classList.toggle("is-favorite", added);
    favoriteButton.textContent = added ? "★ お気に入り登録済み" : "☆ お気に入り登録";
  });

  saveNoteButton?.addEventListener("click", () => {
    if (!window.ISSStorage) return;
    if (!window.ISSStorage.isFavorite(item.unNumber)) {
      window.ISSStorage.toggleFavorite(item);
      favoriteButton.classList.add("is-favorite");
      favoriteButton.textContent = "★ お気に入り登録済み";
    }
    window.ISSStorage.updateFavoriteNote(item.unNumber, noteInput.value);
    saveNoteButton.textContent = "保存しました";
    setTimeout(() => {
      saveNoteButton.textContent = "メモを保存";
    }, 1500);
  });
})();
