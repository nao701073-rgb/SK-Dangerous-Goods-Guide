(() => {
  "use strict";
  const form = document.getElementById("quickUserRegistrationForm");
  if (!form) return;

  const $ = id => document.getElementById(id);
  const loginId = $("quickLoginId");
  const displayName = $("quickDisplayName");
  const role = $("quickRole");
  const officeId = $("quickOfficeId");
  const email = $("quickEmail");
  const password = $("quickInitialPassword");
  const generateButton = $("generateQuickPassword");
  const submitButton = $("registerQuickUser");
  const result = $("quickUserResult");
  const createdLoginId = $("createdQuickLoginId");
  const createdPassword = $("createdQuickPassword");
  const copyButton = $("copyQuickCredentials");
  const clearButton = $("clearQuickCredentials");
  const message = $("settingsMessage");
  let currentUser = null;

  const systemWideRoles = new Set([
    "safety-environment-staff",
    "safety-environment-director",
    "safety-environment-admin",
    "validator",
    "guest"
  ]);

  function showMessage(text) {
    if (!message) return;
    message.textContent = text;
    clearTimeout(showMessage.timer);
    showMessage.timer = setTimeout(() => { message.textContent = ""; }, 4200);
  }

  function randomIndex(max) {
    const values = new Uint32Array(1);
    crypto.getRandomValues(values);
    return values[0] % max;
  }

  function shuffle(value) {
    const chars = [...value];
    for (let i = chars.length - 1; i > 0; i -= 1) {
      const j = randomIndex(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
  }

  function generatePassword(length = 16) {
    const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    const lower = "abcdefghijkmnopqrstuvwxyz";
    const numbers = "23456789";
    const symbols = "!@#$%*-_+";
    const all = upper + lower + numbers + symbols;
    let value = upper[randomIndex(upper.length)] + lower[randomIndex(lower.length)] + numbers[randomIndex(numbers.length)] + symbols[randomIndex(symbols.length)];
    while (value.length < length) value += all[randomIndex(all.length)];
    return shuffle(value);
  }

  function updateOfficeState() {
    const systemWide = systemWideRoles.has(role.value);
    officeId.disabled = systemWide || currentUser?.role === "office-admin";
    officeId.required = !systemWide;
    if (systemWide) officeId.value = "";
    if (currentUser?.role === "office-admin") officeId.value = currentUser.officeId || officeId.value;
  }

  async function initialize() {
    if (!window.ISSApi?.isAuthenticated?.()) return;
    currentUser = window.ISSApi.getUser();
    if (!currentUser || !["office-admin", "safety-environment-admin"].includes(currentUser.role)) return;

    const organizationData = await window.ISSApi.organizations();
    const offices = organizationData.offices || [];
    officeId.innerHTML = '<option value="">所属なし・全社</option>' + offices.map(item =>
      `<option value="${String(item.office_id).replaceAll('"','&quot;')}">${item.block_name}｜${item.office_name}</option>`
    ).join("");

    if (currentUser.role === "office-admin") {
      role.innerHTML = '<option value="office-user">事業所利用者</option>';
      officeId.value = currentUser.officeId || "";
      officeId.disabled = true;
    }
    password.value = generatePassword();
    updateOfficeState();
  }

  generateButton.addEventListener("click", () => {
    password.value = generatePassword();
    password.focus();
    password.select();
  });
  role.addEventListener("change", updateOfficeState);

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submitButton.disabled) return;
    const idValue = loginId.value.trim();
    const passwordValue = password.value;
    submitButton.disabled = true;
    submitButton.textContent = "登録中…";
    result.hidden = true;
    try {
      await window.ISSApi.createAdminUser({
        loginId: idValue,
        displayName: displayName.value.trim(),
        initialPassword: passwordValue,
        role: role.value,
        officeId: officeId.value || null,
        email: email.value.trim() || null,
        passwordChangeRequired: true
      });
      createdLoginId.textContent = idValue;
      createdPassword.textContent = passwordValue;
      result.hidden = false;
      form.reset();
      password.value = generatePassword();
      if (currentUser?.role === "office-admin") {
        role.value = "office-user";
        officeId.value = currentUser.officeId || "";
      }
      updateOfficeState();
      showMessage("利用者を登録しました。初期情報は一度だけ安全に共有してください。");
      result.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
    } catch (error) {
      showMessage(error.message || "利用者を登録できませんでした。");
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "利用者を登録";
    }
  });

  copyButton.addEventListener("click", async () => {
    const text = `ログインID：${createdLoginId.textContent}\n初期パスワード：${createdPassword.textContent}\n初回ログイン時にパスワード変更が必要です。`;
    try {
      await navigator.clipboard.writeText(text);
      showMessage("ログインIDと初期パスワードをコピーしました。");
    } catch {
      showMessage("コピーできませんでした。表示内容を選択してコピーしてください。");
    }
  });

  clearButton.addEventListener("click", () => {
    createdLoginId.textContent = "";
    createdPassword.textContent = "";
    result.hidden = true;
    showMessage("初期情報の表示を消去しました。");
  });

  initialize().catch(error => showMessage(error.message || "利用者登録欄を初期化できませんでした。"));
})();
