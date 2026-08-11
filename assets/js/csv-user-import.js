(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const fileInput = $("userCsvFile");
  const validateButton = $("validateUserCsv");
  const importButton = $("importUserCsv");
  const clearButton = $("clearUserCsv");
  const templateButton = $("downloadUserCsvTemplate");
  const resultsButton = $("downloadUserCsvResults");
  const summary = $("userCsvSummary");
  const preview = $("userCsvPreview");
  const previewBody = $("userCsvPreviewBody");
  if (!fileInput || !validateButton || !importButton || !templateButton) return;

  const ROLE_LABELS = {
    "office-user": "一般利用者",
    "office-admin": "事業所管理者",
    "safety-environment-staff": "安全環境室",
    "safety-environment-director": "安全環境室長",
    "safety-environment-admin": "システム管理者",
    validator: "検証者",
    "revision-validator": "改正検証者",
    guest: "ゲスト"
  };
  const ROLE_ALIASES = new Map([
    ["一般利用者", "office-user"], ["事業所利用者", "office-user"], ["office-user", "office-user"],
    ["事業所管理者", "office-admin"], ["office-admin", "office-admin"],
    ["安全環境室", "safety-environment-staff"], ["安全環境室職員", "safety-environment-staff"], ["safety-environment-staff", "safety-environment-staff"],
    ["安全環境室長", "safety-environment-director"], ["safety-environment-director", "safety-environment-director"],
    ["システム管理者", "safety-environment-admin"], ["管理者", "safety-environment-admin"], ["safety-environment-admin", "safety-environment-admin"],
    ["検証者", "validator"], ["validator", "validator"], ["改正検証者", "revision-validator"], ["revision-validator", "revision-validator"], ["ゲスト", "guest"], ["guest", "guest"]
  ]);
  const HEADER_ALIASES = {
    login_id: ["login_id", "ログインid", "ログインID", "id"],
    display_name: ["display_name", "利用者名", "表示名", "氏名"],
    role: ["role", "権限"],
    office_id: ["office_id", "所属事業所id", "所属事業所ID", "所属", "事業所"],
    email: ["email", "メールアドレス", "メール"],
    initial_password: ["initial_password", "初期パスワード", "password"]
  };

  let validatedRows = [];
  let offices = [];
  let currentUser = null;
  let importResults = [];

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const normalize = value => String(value ?? "").normalize("NFKC").trim();
  const normalizeHeader = value => normalize(value).toLowerCase().replace(/[\s　-]+/g, "_");


  function randomIndex(max) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }
  function generatePassword(length = 16) {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnopqrstuvwxyz", "23456789", "!@#$%*-_+"];
    const all = groups.join("");
    const chars = groups.map(group => group[randomIndex(group.length)]);
    while (chars.length < length) chars.push(all[randomIndex(all.length)]);
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
  }

  function parseCsv(text) {
    const source = String(text || "").replace(/^\uFEFF/, "");
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < source.length; i += 1) {
      const char = source[i];
      if (quoted) {
        if (char === '"' && source[i + 1] === '"') { cell += '"'; i += 1; }
        else if (char === '"') quoted = false;
        else cell += char;
      } else if (char === '"') quoted = true;
      else if (char === ',') { row.push(cell); cell = ""; }
      else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (char !== '\r') cell += char;
    }
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(columns => columns.some(value => normalize(value) !== ""));
  }

  function findHeaderIndex(headers, canonical) {
    const aliases = HEADER_ALIASES[canonical].map(normalizeHeader);
    return headers.findIndex(header => aliases.includes(normalizeHeader(header)));
  }

  function officeLabel(officeId) {
    if (!officeId) return "所属なし・全社";
    const office = offices.find(item => String(item.office_id) === String(officeId));
    return office ? `${office.block_name}｜${office.office_name}` : officeId;
  }

  function roleValue(value) {
    const normalized = normalize(value);
    return ROLE_ALIASES.get(normalized) || ROLE_ALIASES.get(normalized.toLowerCase()) || "";
  }

  function download(filename, content, type = "text/csv;charset=utf-8") {
    const blob = new Blob(["\uFEFF", content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function templateCsv() {
    const sampleOffice = currentUser?.role === "office-admin" ? (currentUser.officeId || "") : (offices[0]?.office_id || "");
    const rows = [
      ["login_id","display_name","role","office_id","email","initial_password"],
      ["kawasaki.suzuki","鈴木 一郎","office-user",sampleOffice,"suzuki@example.co.jp","TempPass!2026"],
      ["guest.sample","ゲスト利用者","guest","","","TempPass!2026"]
    ];
    return rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"','""')}"`).join(",")).join("\r\n");
  }

  function showSummary(text, type = "") {
    summary.hidden = false;
    summary.className = `csv-user-summary${type ? ` is-${type}` : ""}`;
    summary.textContent = text;
  }

  function reset() {
    fileInput.value = "";
    validatedRows = [];
    importResults = [];
    if (resultsButton) resultsButton.hidden = true;
    importButton.disabled = true;
    summary.hidden = true;
    preview.hidden = true;
    previewBody.innerHTML = "";
  }

  async function initialize() {
    if (!window.ISSApi?.isAuthenticated?.()) return;
    currentUser = window.ISSApi.getUser();
    if (!currentUser || !["office-admin", "safety-environment-admin"].includes(currentUser.role)) return;
    const data = await window.ISSApi.organizations();
    offices = data.offices || [];
  }

  async function validateFile() {
    const file = fileInput.files?.[0];
    if (!file) { showSummary("CSVファイルを選択してください。", "error"); return; }
    if (!file.name.toLowerCase().endsWith(".csv")) { showSummary("CSV形式のファイルを選択してください。", "error"); return; }

    validateButton.disabled = true;
    validateButton.textContent = "検証中…";
    try {
      const parsed = parseCsv(await file.text());
      if (parsed.length < 2) throw new Error("見出し行と利用者データを入力してください。");
      const headers = parsed[0];
      const indexes = Object.fromEntries(Object.keys(HEADER_ALIASES).map(key => [key, findHeaderIndex(headers, key)]));
      const missing = ["login_id","display_name","role","office_id","initial_password"].filter(key => indexes[key] < 0);
      if (missing.length) throw new Error(`必須列が不足しています：${missing.join("、")}`);

      const existing = await window.ISSApi.adminUsers({ page: 1, pageSize: 10000 });
      const existingIds = new Set((existing.users || []).map(user => String(user.login_id || user.loginId || "").toLowerCase()));
      const csvIds = new Set();
      validatedRows = parsed.slice(1).map((columns, offset) => {
        const line = offset + 2;
        const loginId = normalize(columns[indexes.login_id]);
        const displayName = normalize(columns[indexes.display_name]);
        const role = roleValue(columns[indexes.role]);
        let officeId = normalize(columns[indexes.office_id]);
        const email = indexes.email >= 0 ? normalize(columns[indexes.email]) : "";
        const suppliedPassword = String(columns[indexes.initial_password] ?? "").trim();
        const initialPassword = suppliedPassword || generatePassword();
        const errors = [];

        if (!/^[A-Za-z0-9._-]{3,100}$/.test(loginId)) errors.push("ログインIDは半角英数字・._-で3～100文字");
        if (!displayName) errors.push("利用者名が未入力");
        if (!role) errors.push("権限が不正");
        if (existingIds.has(loginId.toLowerCase())) errors.push("登録済みID");
        if (csvIds.has(loginId.toLowerCase())) errors.push("CSV内でID重複");
        csvIds.add(loginId.toLowerCase());
        if (suppliedPassword && initialPassword.length < 12) errors.push("初期パスワードは12文字以上（空欄なら自動生成）");
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push("メール形式が不正");

        const systemWide = ["safety-environment-staff","safety-environment-director","safety-environment-admin","validator","revision-validator","guest"].includes(role);
        if (systemWide) officeId = "";
        if (currentUser.role === "office-admin") {
          if (role !== "office-user") errors.push("事業所管理者は一般利用者のみ登録可能");
          officeId = currentUser.officeId || "";
        }
        if (!systemWide && !officeId) errors.push("所属事業所が未入力");
        if (officeId && !offices.some(item => String(item.office_id) === officeId)) errors.push("所属事業所IDが不正");

        return { line, loginId, displayName, role, officeId: officeId || null, email: email || null, initialPassword, errors, status: errors.length ? "error" : "valid" };
      });

      const validCount = validatedRows.filter(row => row.status === "valid").length;
      const errorCount = validatedRows.length - validCount;
      previewBody.innerHTML = validatedRows.map(row => `<tr class="is-${row.status}"><td>${row.line}</td><td>${escapeHtml(row.loginId)}</td><td>${escapeHtml(row.displayName)}</td><td>${escapeHtml(ROLE_LABELS[row.role] || row.role || "―")}</td><td>${escapeHtml(officeLabel(row.officeId))}</td><td><span class="csv-status csv-status--${row.status}">${row.status === "valid" ? "登録可能" : escapeHtml(row.errors.join("／"))}</span></td></tr>`).join("");
      preview.hidden = false;
      importButton.disabled = validCount === 0 || errorCount > 0;
      showSummary(errorCount ? `${validatedRows.length}件を検証しました。登録可能${validCount}件、要修正${errorCount}件です。エラーを修正したCSVを再度選択してください。` : `${validCount}件すべて登録可能です。「検証済み利用者を登録」を押してください。`, errorCount ? "error" : "success");
    } catch (error) {
      validatedRows = []; importButton.disabled = true; preview.hidden = true;
      showSummary(error.message || "CSVを検証できませんでした。", "error");
    } finally {
      validateButton.disabled = false;
      validateButton.textContent = "CSVを検証";
    }
  }

  async function importRows() {
    const rows = validatedRows.filter(row => row.status === "valid");
    if (!rows.length || validatedRows.some(row => row.status !== "valid")) return;
    if (!confirm(`${rows.length}件の利用者を登録します。よろしいですか？`)) return;
    importButton.disabled = true; importButton.textContent = "登録中…";
    const results = [];
    for (const row of rows) {
      try {
        await window.ISSApi.createAdminUser({
          loginId: row.loginId,
          displayName: row.displayName,
          role: row.role,
          officeId: row.officeId,
          email: row.email,
          initialPassword: row.initialPassword,
          passwordChangeRequired: true
        });
        row.status = "imported"; results.push({ ...row, result: "登録完了" });
      } catch (error) {
        row.status = "failed"; row.errors = [error.message || "登録失敗"]; results.push({ ...row, result: row.errors[0] });
      }
    }
    importResults = results;
    if (resultsButton) resultsButton.hidden = false;
    const success = results.filter(row => row.status === "imported").length;
    const failed = results.length - success;
    previewBody.innerHTML = results.map(row => `<tr class="is-${row.status === "imported" ? "valid" : "error"}"><td>${row.line}</td><td>${escapeHtml(row.loginId)}</td><td>${escapeHtml(row.displayName)}</td><td>${escapeHtml(ROLE_LABELS[row.role] || row.role)}</td><td>${escapeHtml(officeLabel(row.officeId))}</td><td><span class="csv-status csv-status--${row.status === "imported" ? "valid" : "error"}">${escapeHtml(row.result)}</span></td></tr>`).join("");
    showSummary(`CSV一括登録が完了しました。成功${success}件、失敗${failed}件です。`, failed ? "error" : "success");
    importButton.textContent = "検証済み利用者を登録";
    validatedRows = [];
  }

  templateButton.addEventListener("click", () => download("利用者一括登録_CSVひな型.csv", templateCsv()));
  validateButton.addEventListener("click", validateFile);
  importButton.addEventListener("click", importRows);
  clearButton.addEventListener("click", reset);
  if (resultsButton) resultsButton.addEventListener("click", () => {
    if (!importResults.length) return;
    const rows = [["line","login_id","display_name","role","office_id","email","initial_password","result"], ...importResults.map(row => [row.line,row.loginId,row.displayName,row.role,row.officeId || "",row.email || "",row.initialPassword,row.result])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? "").replaceAll('"','""')}"`).join(",")).join("\r\n");
    download(`利用者一括登録結果_${new Date().toISOString().slice(0,10)}.csv`, csv);
  });

  fileInput.addEventListener("change", () => { validatedRows = []; importButton.disabled = true; summary.hidden = true; preview.hidden = true; });
  initialize().catch(error => showSummary(error.message || "CSV登録機能を初期化できませんでした。", "error"));
})();
