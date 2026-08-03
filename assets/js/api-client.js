(() => {
  "use strict";
  const TOKEN_KEY = "iss-api-token";
  const USER_KEY = "iss-api-user";
  const PASSWORD_CHANGE_KEY = "iss-password-change-required";
  const ACTIVITY_KEY = "iss-last-activity";
  const SESSION_STARTED_KEY = "iss-session-started-at";
  const SESSION_TOKEN_KEY = "iss-session-token-fingerprint";
  const LOCAL_USERS_KEY = "iss-local-auth-users-v367";
  const LOCAL_ACCESS_POLICY_KEY = "iss-local-access-policy-v365";
  const LOCAL_AUDIT_KEY = "iss-local-auth-audit-v365";
  const normalizeBase = value => String(value || "").trim().replace(/\/$/, "");
  const endpoint = () => normalizeBase(window.ISSStorage?.getServerEndpoint?.() || localStorage.getItem("iss-server-endpoint") || "");
  const token = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
  const usesRemote = () => Boolean(endpoint());
  const nowIso = () => new Date().toISOString();
  const safeJsonParse = (value, fallback) => { try { return JSON.parse(value); } catch { return fallback; } };
  const sanitize = value => String(value || "").trim();
  const defaultPassword = "TempPass!2026";
  const AUTH_BRIDGE_PREFIXES = ["ISS_AUTH_BRIDGE_V3:", "ISS_AUTH_BRIDGE_V2:", "ISS_AUTH_BRIDGE_V1:"];
  const AUTH_BRIDGE_PREFIX = AUTH_BRIDGE_PREFIXES[0];
  const readAuthBridge = () => {
    if (window.ISSAuthBridge?.currentAuth) {
      const current = window.ISSAuthBridge.currentAuth();
      if (current?.token) return current;
    }
    try {
      const raw = String(window.name || "");
      const prefix = AUTH_BRIDGE_PREFIXES.find(item => raw.startsWith(item));
      if (!prefix) return null;
      const value = JSON.parse(raw.slice(prefix.length));
      return value && typeof value === "object" ? value : null;
    } catch { return null; }
  };
  const writeAuthBridge = value => {
    if (window.ISSAuthBridge?.persistAuth && value?.token) {
      window.ISSAuthBridge.persistAuth(value);
      return;
    }
    try { window.name = AUTH_BRIDGE_PREFIX + JSON.stringify(value || {}); } catch {}
  };
  const clearAuthBridge = () => {
    if (window.ISSAuthBridge?.clear) { window.ISSAuthBridge.clear(); return; }
    try { if (AUTH_BRIDGE_PREFIXES.some(prefix => String(window.name || "").startsWith(prefix))) window.name = ""; } catch {}
  };
  const syncAuthBridge = () => {
    const currentToken = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";
    if (!currentToken) return;
    let currentUser = null;
    try { currentUser = JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch {}
    writeAuthBridge({ token: currentToken, user: currentUser, passwordChangeRequired: localStorage.getItem(PASSWORD_CHANGE_KEY) === "1", updatedAt: nowIso() });
  };
  const restoreAuthBridge = () => {
    const bridge = readAuthBridge();
    if (!bridge?.token) return;
    localStorage.setItem(TOKEN_KEY, String(bridge.token));
    sessionStorage.setItem(TOKEN_KEY, String(bridge.token));
    if (bridge.user) localStorage.setItem(USER_KEY, JSON.stringify(bridge.user));
    if (bridge.passwordChangeRequired) localStorage.setItem(PASSWORD_CHANGE_KEY, "1");
    else localStorage.removeItem(PASSWORD_CHANGE_KEY);
  };
  restoreAuthBridge();

  const resolveOfficeId = id => {
    const offices = window.ISSOrganization?.getOfficeOptions?.() || [];
    return offices.find(item => item.id === id)?.id || offices[0]?.id || null;
  };

  const defaultLocalUsers = () => {
    return [
      { id:"local-user-001", login_id:"yamamoto", loginId:"yamamoto", display_name:"山本", displayName:"山本", role:"safety-environment-staff", office_id:null, officeId:null, email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-002", login_id:"ninomiya", loginId:"ninomiya", display_name:"二ノ宮", displayName:"二ノ宮", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-003", login_id:"sato", loginId:"sato", display_name:"佐藤", displayName:"佐藤", role:"office-admin", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-004", login_id:"naritake", loginId:"naritake", display_name:"成竹（なりたけ）", displayName:"成竹（なりたけ）", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-005", login_id:"koyama", loginId:"koyama", display_name:"小山", displayName:"小山", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-006", login_id:"konaka", loginId:"konaka", display_name:"小中", displayName:"小中", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-007", login_id:"awasaki", loginId:"awasaki", display_name:"粟崎（あわさき）", displayName:"粟崎（あわさき）", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-008", login_id:"takashima", loginId:"takashima", display_name:"高嶋", displayName:"高嶋", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-009", login_id:"oura", loginId:"oura", display_name:"大浦", displayName:"大浦", role:"office-user", office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-010", login_id:"administrator", loginId:"administrator", display_name:"管理者", displayName:"管理者", role:"safety-environment-admin", office_id:null, officeId:null, email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-011", login_id:"validator", loginId:"validator", display_name:"検証用アカウント", displayName:"検証用アカウント", role:"validator", office_id:null, officeId:null, email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-012", login_id:"guest", loginId:"guest", display_name:"ゲストアカウント", displayName:"ゲストアカウント", role:"guest", office_id:null, officeId:null, email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-013", login_id:"revision-validator", loginId:"revision-validator", display_name:"改正検証者用アカウント", displayName:"改正検証者用アカウント", role:"revision-validator", office_id:null, officeId:null, email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-014", login_id:"daikoku.sato", loginId:"daikoku.sato", display_name:"佐藤", displayName:"佐藤", role:"office-user", office_id:resolveOfficeId("office-yokohama-daikoku"), officeId:resolveOfficeId("office-yokohama-daikoku"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false },
      { id:"local-user-015", login_id:"daikoku.ueki", loginId:"daikoku.ueki", display_name:"植木", displayName:"植木", role:"office-user", office_id:resolveOfficeId("office-yokohama-daikoku"), officeId:resolveOfficeId("office-yokohama-daikoku"), email:"", password:defaultPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired:false, last_login_at:null, mfa_required:false }
    ];
  };

  const ensureLocalUsers = () => {
    let users = safeJsonParse(localStorage.getItem(LOCAL_USERS_KEY), null);
    if (!Array.isArray(users) || !users.length) {
      users = defaultLocalUsers();
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } else {
      const defaults = defaultLocalUsers();
      let changed = false;

      // Part 409: 川崎事業所利用者の権限・読み・ログインIDを既存端末にも反映する。
      const migrateUser = (predicate, updates) => {
        const user = users.find(predicate);
        if (!user) return;
        Object.assign(user, updates);
        changed = true;
      };
      migrateUser(user => user.id === "local-user-003" || String(user.login_id || user.loginId || "").toLowerCase() === "sato", {
        login_id:"sato", loginId:"sato", display_name:"佐藤", displayName:"佐藤", role:"office-admin",
        office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki")
      });
      migrateUser(user => user.id === "local-user-004" || ["narutake","naritake"].includes(String(user.login_id || user.loginId || "").toLowerCase()), {
        login_id:"naritake", loginId:"naritake", display_name:"成竹（なりたけ）", displayName:"成竹（なりたけ）", role:"office-user",
        office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki")
      });
      migrateUser(user => user.id === "local-user-007" || ["awazaki","awasaki"].includes(String(user.login_id || user.loginId || "").toLowerCase()), {
        login_id:"awasaki", loginId:"awasaki", display_name:"粟崎（あわさき）", displayName:"粟崎（あわさき）", role:"office-user",
        office_id:resolveOfficeId("office-kawasaki"), officeId:resolveOfficeId("office-kawasaki")
      });

      // Part 422: 管理者の旧ロック情報・無効状態をローカル端末上で自動復旧する。
      // パスワードが既に設定されている場合は変更しない。
      const localAdministrator = users.find(user => user.id === "local-user-010" || String(user.login_id || user.loginId || "").toLowerCase() === "administrator");
      if (localAdministrator) {
        Object.assign(localAdministrator, {
          login_id:"administrator", loginId:"administrator", display_name:"管理者", displayName:"管理者",
          role:"safety-environment-admin", active:true, locked_until:null, failed_attempts:0
        });
        if (!String(localAdministrator.password || "")) localAdministrator.password = defaultPassword;
        changed = true;
      }

      // 現在ログイン中の利用者情報も即時更新する。
      const current = safeJsonParse(localStorage.getItem(USER_KEY), null);
      if (current?.id) {
        const migrated = users.find(user => user.id === current.id);
        if (migrated) {
          localStorage.setItem(USER_KEY, JSON.stringify({
            ...current,
            login_id:migrated.login_id || migrated.loginId,
            loginId:migrated.loginId || migrated.login_id,
            display_name:migrated.display_name || migrated.displayName,
            displayName:migrated.displayName || migrated.display_name,
            role:migrated.role,
            office_id:migrated.office_id ?? migrated.officeId ?? null,
            officeId:migrated.officeId ?? migrated.office_id ?? null
          }));
        }
      }

      defaults.forEach(defaultUser => {
        if (!users.some(user => (user.login_id || user.loginId) === defaultUser.login_id)) {
          users.push(defaultUser);
          changed = true;
        }
      });
      if (changed) localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    }
    return users.map(user => {
      const loginAt = resolveLastLoginAt(user);
      return { ...user, login_id: user.login_id || user.loginId, loginId: user.loginId || user.login_id, display_name: user.display_name || user.displayName, displayName: user.displayName || user.display_name, office_id: user.office_id ?? user.officeId ?? null, officeId: user.officeId ?? user.office_id ?? null, active: user.active !== false, passwordChangeRequired: Boolean(user.passwordChangeRequired), last_login_at: loginAt, lastLoginAt: loginAt };
    });
  };
  const saveLocalUsers = users => localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  const ensureLocalAccessPolicy = () => {
    const stored = safeJsonParse(localStorage.getItem(LOCAL_ACCESS_POLICY_KEY), null);
    if (stored && typeof stored.authenticationRequired === "boolean") return stored;
    const policy = { authenticationRequired: true, updatedAt: nowIso(), source: "local" };
    localStorage.setItem(LOCAL_ACCESS_POLICY_KEY, JSON.stringify(policy));
    return policy;
  };
  const saveLocalAccessPolicy = policy => localStorage.setItem(LOCAL_ACCESS_POLICY_KEY, JSON.stringify(policy));
  const getLocalOffices = () => (window.ISSOrganization?.getOfficeOptions?.() || []).map(office => ({ office_id: office.id, office_name: office.name, block_id: office.blockId, block_name: office.blockName, code: office.code || "" }));
  const enrichUser = user => {
    const office = getLocalOffices().find(item => item.office_id === (user.office_id ?? user.officeId));
    return { ...user, office_id: user.office_id ?? user.officeId ?? null, officeId: user.officeId ?? user.office_id ?? null, office_name: office?.office_name || (user.office_id || user.officeId ? "所属未設定" : "全社"), officeName: office?.office_name || (user.office_id || user.officeId ? "所属未設定" : "全社"), block_name: office?.block_name || (user.office_id || user.officeId ? "" : "安全環境室"), blockName: office?.block_name || (user.office_id || user.officeId ? "" : "安全環境室") };
  };
  const publicUser = user => {
    const enriched = enrichUser(user);
    return {
      id: enriched.id,
      login_id: enriched.login_id || enriched.loginId,
      loginId: enriched.login_id || enriched.loginId,
      display_name: enriched.display_name || enriched.displayName,
      displayName: enriched.display_name || enriched.displayName,
      role: enriched.role,
      office_id: enriched.office_id,
      officeId: enriched.office_id,
      office_name: enriched.office_name,
      officeName: enriched.office_name,
      block_name: enriched.block_name,
      blockName: enriched.block_name,
      email: enriched.email || null,
      active: enriched.active !== false,
      locked_until: enriched.locked_until || null,
      last_login_at: resolveLastLoginAt(enriched),
      lastLoginAt: resolveLastLoginAt(enriched),
      mfa_required: Boolean(enriched.mfa_required)
    };
  };
  const currentStoredUser = () => safeJsonParse(localStorage.getItem(USER_KEY), null);
  const currentLocalUserRecord = () => {
    const current = currentStoredUser();
    if (!current?.id) return null;
    return ensureLocalUsers().find(item => item.id === current.id) || null;
  };
  const saveCurrentUserSnapshot = record => { if (record) localStorage.setItem(USER_KEY, JSON.stringify(publicUser(record))); };
  const pushAudit = entry => {
    const parsed = safeJsonParse(localStorage.getItem(LOCAL_AUDIT_KEY), []);
    const items = Array.isArray(parsed) ? parsed : [];
    items.unshift({ id:`audit-${Date.now()}-${Math.random().toString(16).slice(2,8)}`, at: nowIso(), ...entry });
    localStorage.setItem(LOCAL_AUDIT_KEY, JSON.stringify(items.slice(0, 300)));
  };

  const latestLoginFromAudit = loginId => {
    const normalized = String(loginId || "").toLowerCase();
    if (!normalized) return null;
    const parsed = safeJsonParse(localStorage.getItem(LOCAL_AUDIT_KEY), []);
    const items = Array.isArray(parsed) ? parsed : [];
    const times = items
      .filter(item => item && item.action === "login" && String(item.loginId || item.login_id || item.target || "").toLowerCase() === normalized)
      .map(item => item.at || item.created_at || item.timestamp || null)
      .filter(Boolean)
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    return times[0]?.toISOString() || null;
  };

  const resolveLastLoginAt = user => {
    const candidates = [
      user?.last_login_at,
      user?.lastLoginAt,
      user?.last_login,
      user?.lastLogin,
      latestLoginFromAudit(user?.login_id || user?.loginId)
    ].filter(Boolean);
    const dates = candidates
      .map(value => new Date(value))
      .filter(date => !Number.isNaN(date.getTime()))
      .sort((a, b) => b.getTime() - a.getTime());
    return dates[0]?.toISOString() || null;
  };
  const requireAdminRole = () => {
    const user = currentStoredUser();
    if (!user || !["office-admin", "safety-environment-admin"].includes(user.role)) throw new Error("管理者権限が必要です。");
    return user;
  };
  const assertCanManageTargetRole = (actor, role) => {
    if (actor.role === "office-admin" && role !== "office-user") throw new Error("事業所管理者は事業所利用者のみ管理できます。");
  };

  async function request(path, options = {}) {
    const base = endpoint();
    if (!base) throw new Error("クラウドAPI接続先が設定されていません。");
    const headers = new Headers(options.headers || {});
    if (!(options.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (token()) headers.set("Authorization", `Bearer ${token()}`);
    const response = await fetch(`${base}${path}`, { ...options, headers });
    if (response.status === 204) return null;
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) window.ISSApi.clearSession();
      throw new Error(data.error || `サーバーエラー（${response.status}）`);
    }
    return data;
  }

  window.ISSApi = {
    request,
    getEndpoint: endpoint,
    usesRemoteAuth: () => usesRemote(),
    isLocalMode: () => !usesRemote(),
    isConfigured: () => Boolean(endpoint()),
    isAuthenticated: () => Boolean(token()),
    getUser: () => {
      try {
        const stored = JSON.parse(localStorage.getItem(USER_KEY) || "null");
        return stored || readAuthBridge()?.user || null;
      } catch { return readAuthBridge()?.user || null; }
    },
    clearSession() { const current=sessionStorage.getItem(TOKEN_KEY)||""; sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(ACTIVITY_KEY); sessionStorage.removeItem(SESSION_STARTED_KEY); sessionStorage.removeItem(SESSION_TOKEN_KEY); if(current && localStorage.getItem(TOKEN_KEY)===current) localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); localStorage.removeItem(PASSWORD_CHANGE_KEY); clearAuthBridge(); },
    async startLogin(loginId, password) {
      if (usesRemote()) return request("/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
      const loginValue = sanitize(loginId).toLowerCase();
      const passwordValue = String(password || "");
      const users = ensureLocalUsers();
      const target = users.find(user => String(user.login_id || user.loginId || "").toLowerCase() === loginValue);
      if (!target) throw new Error("ログインIDまたはパスワードが正しくありません。");
      if (target.active === false) throw new Error("このアカウントは無効化されています。管理者へお問い合わせください。");
      if (target.locked_until && new Date(target.locked_until).getTime() > Date.now()) throw new Error("このアカウントは一時的にロックされています。");
      if (String(target.password || "") !== passwordValue) throw new Error("ログインIDまたはパスワードが正しくありません。");
      target.failed_attempts = 0;
      target.locked_until = null;
      const loginAt = nowIso();
      target.last_login_at = loginAt;
      target.lastLoginAt = loginAt;
      target.updated_at = loginAt;
      saveLocalUsers(users);
      pushAudit({ action: "login", loginId: target.login_id || target.loginId, role: target.role, at: loginAt });
      return { token: `local.${target.id}.${Date.now()}`, user: publicUser(target), passwordChangeRequired: Boolean(target.passwordChangeRequired) };
    },
    async verifyMfa(challengeId, code) {
      if (!usesRemote()) throw new Error("ローカル認証では確認コードは不要です。");
      return request("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ challengeId, code }) });
    },
    async resendMfa(challengeId) {
      if (!usesRemote()) throw new Error("ローカル認証では確認コードは不要です。");
      return request("/auth/mfa/resend", { method: "POST", body: JSON.stringify({ challengeId }) });
    },
    storeSession(data, remember = false) {
      if (!data?.token) throw new Error("認証トークンを取得できませんでした。");
      // Part 422: 各タブ・各端末のセッションを独立させる。
      // sessionStorageを主とし、別端末・別タブのログインで現在のセッションを上書きしない。
      sessionStorage.setItem(TOKEN_KEY, data.token);
      if (remember) localStorage.setItem(TOKEN_KEY, data.token);
      else if (localStorage.getItem(TOKEN_KEY) === data.token) localStorage.removeItem(TOKEN_KEY);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      if (data.passwordChangeRequired) localStorage.setItem(PASSWORD_CHANGE_KEY, "1");
      else localStorage.removeItem(PASSWORD_CHANGE_KEY);
      // A successful login always starts a fresh inactivity window.
      // Without this reset, an old activity timestamp from a previous session can
      // cause session-guard.js to log the user out immediately after navigation.
      const sessionStartedAt = Date.now();
      sessionStorage.setItem(ACTIVITY_KEY, String(sessionStartedAt));
      sessionStorage.setItem(SESSION_STARTED_KEY, String(sessionStartedAt));
      sessionStorage.setItem(SESSION_TOKEN_KEY, String(data.token));
      sessionStorage.removeItem("iss-session-logout-reason");
      syncAuthBridge();
      window.ISSAuthBridge?.decorateAll?.();
      return data.user;
    },
    async login(loginId, password, remember = false) {
      const data = await this.startLogin(loginId, password);
      if (data.mfaRequired) return data;
      this.storeSession(data, remember);
      return data.user;
    },
    activateAccount: (token, newPassword) => request("/auth/activate", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
    requestPasswordReset: loginId => {
      if (usesRemote()) return request("/auth/request-password-reset", { method: "POST", body: JSON.stringify({ loginId }) });
      const user = ensureLocalUsers().find(item => String(item.login_id || item.loginId).toLowerCase() === String(loginId || "").trim().toLowerCase());
      if (!user) throw new Error("該当するログインIDが見つかりません。");
      return Promise.resolve({ accepted: true, localMode: true });
    },
    resetPassword: (tokenValue, newPassword) => usesRemote() ? request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token: tokenValue, newPassword }) }) : Promise.reject(new Error("ローカル運用では、システム管理者がパスワードを再設定します。")),
    changePassword: (currentPassword, newPassword) => {
      if (usesRemote()) return request("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword, newPassword }) });
      const current = currentLocalUserRecord();
      if (!current) return Promise.reject(new Error("ログイン情報を取得できませんでした。"));
      if (String(current.password || "") !== String(currentPassword || "")) return Promise.reject(new Error("現在のパスワードが正しくありません。"));
      if (String(newPassword || "").length < 8) return Promise.reject(new Error("新しいパスワードは8文字以上で入力してください。"));
      const users = ensureLocalUsers();
      const target = users.find(item => item.id === current.id);
      target.password = String(newPassword);
      target.passwordChangeRequired = false;
      target.updated_at = nowIso();
      saveLocalUsers(users);
      saveCurrentUserSnapshot(target);
      pushAudit({ action: "change-password", loginId: target.login_id || target.loginId, role: target.role });
      return Promise.resolve({ ok: true });
    },
    finishPasswordChange() { this.clearPasswordChangeRequired(); this.clearSession(); },
    isPasswordChangeRequired: () => localStorage.getItem(PASSWORD_CHANGE_KEY) === "1",
    clearPasswordChangeRequired: () => localStorage.removeItem(PASSWORD_CHANGE_KEY),
    health: () => request("/health"),
    runtime: () => request("/runtime"),
    accessPolicy: () => usesRemote() ? request("/system/access-policy") : Promise.resolve(ensureLocalAccessPolicy()),
    updateAccessPolicy: payload => { if (usesRemote()) return request("/admin/system/access-policy", { method:"PUT", body:JSON.stringify(payload) }); requireAdminRole(); const policy = { authenticationRequired: payload?.authenticationRequired !== false, updatedAt: nowIso(), source: "local" }; saveLocalAccessPolicy(policy); pushAudit({ action: "update-access-policy", role: currentStoredUser()?.role || "unknown" }); return Promise.resolve(policy); },
    me: () => usesRemote() ? request("/auth/me") : Promise.resolve({ user: currentStoredUser() }),
    permissions: () => usesRemote() ? request("/auth/permissions") : Promise.resolve({ role:currentStoredUser()?.role || "guest", permissions:{} }),
    securityEvents: limit => request(`/auth/security-events?${new URLSearchParams({limit: limit || 50})}`),
    logoutAllSessions: () => request('/auth/logout-all', { method:'POST', body:JSON.stringify({}) }),
    organizations: () => usesRemote() ? request("/organizations") : Promise.resolve({ headquarters: window.ISSOrganization?.getHeadquarters?.() || {}, blocks: window.ISSOrganization?.getBlocks?.() || [], offices: getLocalOffices() }),
    listApplications: params => request(`/applications?${new URLSearchParams(params || {})}`),
    createApplication: payload => request("/applications", { method: "POST", body: JSON.stringify(payload) }),
    updateApplication: (id, payload) => request(`/applications/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
    deleteApplication: (id, reason = "取消・削除") => request(`/applications/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
    applicationHistory: (id, params={}) => request(`/applications/${encodeURIComponent(id)}/history?${new URLSearchParams(params)}`),
    listPhotos: params => request(`/photos?${new URLSearchParams(params || {})}`),
    uploadPhoto: formData => request("/photos", { method: "POST", body: formData }),
    updatePhoto: (id, payload) => request(`/photos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
    deletePhoto: id => request(`/photos/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listApplicationDocuments: params => request(`/application-documents?${new URLSearchParams(params || {})}`),
    uploadApplicationDocument: formData => request("/application-documents", { method:"POST", body:formData }),
    updateApplicationDocumentStatus: (id,payload) => request(`/application-documents/${encodeURIComponent(id)}/status`, { method:"PATCH", body:JSON.stringify(payload) }),
    officeSummary: () => request("/admin/office-summary"),
    accessSummary: () => request("/admin/access-summary"),
    preflight: () => request("/admin/preflight"),
    backupStatus: () => request("/admin/backup-status"),
    updateBackupSettings: payload => request("/admin/backup-settings", { method:"PUT", body:JSON.stringify(payload) }),
    recordRestoreTest: (id,payload) => request(`/admin/backups/${encodeURIComponent(id)}/restore-test`, { method:"POST", body:JSON.stringify(payload) }),
    regulationChangeSets: params => request(`/regulation-change-sets?${new URLSearchParams(params || {})}`),
    regulationChangeSetEvents: id => request(`/regulation-change-sets/${encodeURIComponent(id)}/events`),
    createRegulationSource: formData => request('/regulation-sources',{method:'POST',body:formData}),
    createRegulationDataset: formData => request('/regulation-datasets',{method:'POST',body:formData}),
    createRegulationChangeSet: payload => request('/regulation-change-sets',{method:'POST',body:JSON.stringify(payload)}),
    submitRegulationChangeSet: (id,payload) => request(`/regulation-change-sets/${encodeURIComponent(id)}/submit`,{method:'POST',body:JSON.stringify(payload)}),
    reviewRegulationChangeSet: (id,payload) => request(`/regulation-change-sets/${encodeURIComponent(id)}/review`,{method:'POST',body:JSON.stringify(payload)}),
    approveRegulationChangeSet: (id,payload) => request(`/regulation-change-sets/${encodeURIComponent(id)}/approve`,{method:'POST',body:JSON.stringify(payload)}),
    publishRegulationChangeSet: (id,payload) => request(`/regulation-change-sets/${encodeURIComponent(id)}/publish`,{method:'POST',body:JSON.stringify(payload)}),
    auditLogs: params => request(`/admin/audit-logs?${new URLSearchParams(typeof params === 'object' ? params : {limit: params || 200})}`),
    forceLogoutUser: id => usesRemote() ? request(`/admin/users/${encodeURIComponent(id)}/force-logout`, { method:'POST', body:JSON.stringify({}) }) : Promise.resolve({ ok:true }),
    localAdminUsersSnapshot: () => {
      const actor = requireAdminRole();
      let users = ensureLocalUsers().map(publicUser);
      if (actor.role === "office-admin") {
        const actorOfficeId = actor.officeId ?? actor.office_id ?? null;
        users = users.filter(user => user.role === "office-user" && (user.office_id ?? user.officeId ?? null) === actorOfficeId);
      }
      return users;
    },
    adminUsers: params => {
      if (usesRemote()) return request(`/admin/users?${new URLSearchParams(params || {})}`);
      const actor = requireAdminRole();
      const page = Math.max(1, Number(params?.page || 1));
      const pageSize = Math.max(1, Number(params?.pageSize || 25));
      const search = String(params?.search || "").trim().toLowerCase();
      const role = String(params?.role || "").trim();
      const status = String(params?.status || "").trim();
      let users = ensureLocalUsers().map(publicUser);
      if (actor.role === "office-admin") {
        const actorOfficeId = actor.officeId ?? actor.office_id ?? null;
        users = users.filter(user => user.role === "office-user" && (user.office_id ?? user.officeId ?? null) === actorOfficeId);
      }
      if (search) users = users.filter(user => [user.login_id, user.display_name, user.office_name, user.role].join(" ").toLowerCase().includes(search));
      if (role) users = users.filter(user => user.role === role);
      if (status === "active") users = users.filter(user => user.active);
      if (status === "inactive") users = users.filter(user => !user.active);
      const total = users.length;
      const pageCount = Math.max(1, Math.ceil(total / pageSize));
      const safePage = Math.min(page, pageCount);
      const start = (safePage - 1) * pageSize;
      return Promise.resolve({ page: safePage, pageCount, total, users: users.slice(start, start + pageSize) });
    },
    accountSecurityDashboard: params => request(`/admin/account-security?${new URLSearchParams(params || {})}`),
    previewAccountSecurityBaseline: () => request('/admin/account-security/baseline?preview=true'),
    applyAccountSecurityBaseline: () => request('/admin/account-security/baseline', { method:'POST' }),
    applyUserSecurityPolicy: id => request(`/admin/users/${encodeURIComponent(id)}/security-policy`, { method:'PUT', body: JSON.stringify({ applyBaseline:true }) }),
    reviewUserSecurity: id => request(`/admin/users/${encodeURIComponent(id)}/security-review`, { method:'POST' }),
    createAdminUser: payload => {
      if (usesRemote()) return request('/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      const actor = requireAdminRole();
      const role = String(payload?.role || 'office-user');
      assertCanManageTargetRole(actor, role);
      const loginId = sanitize(payload?.loginId);
      const displayName = sanitize(payload?.displayName);
      const initialPassword = String(payload?.initialPassword || '');
      if (!loginId) return Promise.reject(new Error('ログインIDを入力してください。'));
      if (!displayName) return Promise.reject(new Error('利用者名を入力してください。'));
      if (initialPassword.length < 8) return Promise.reject(new Error('初期パスワードは8文字以上で入力してください。'));
      const users = ensureLocalUsers();
      if (users.some(user => String(user.login_id || user.loginId).toLowerCase() === loginId.toLowerCase())) return Promise.reject(new Error('そのログインIDは既に使われています。'));
      const officeId = actor.role === 'office-admin' ? actor.officeId : (payload?.officeId || null);
      const record = { id:`local-user-${Date.now()}`, login_id:loginId, loginId, display_name:displayName, displayName, role, office_id: officeId, officeId, email: sanitize(payload?.email), password: initialPassword, active:true, locked_until:null, failed_attempts:0, passwordChangeRequired: payload?.passwordChangeRequired !== false, last_login_at:null, mfa_required:false };
      users.push(record);
      saveLocalUsers(users);
      pushAudit({ action: 'create-user', actor: actor.loginId || actor.login_id, target: loginId, role });
      return Promise.resolve({ user: publicUser(record) });
    },
    updateAdminUser: (id, payload) => {
      if (usesRemote()) return request(`/admin/users/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) });
      const actor = requireAdminRole();
      const users = ensureLocalUsers();
      const target = users.find(user => user.id === id);
      if (!target) return Promise.reject(new Error('対象利用者が見つかりません。'));
      const nextRole = String(payload?.role || target.role);
      assertCanManageTargetRole(actor, nextRole);
      if (actor.role === 'office-admin' && target.office_id !== actor.officeId) return Promise.reject(new Error('他事業所の利用者は変更できません。'));
      const nextLoginId = sanitize(payload?.loginId || target.login_id || target.loginId);
      if (users.some(user => user.id !== id && String(user.login_id || user.loginId).toLowerCase() === nextLoginId.toLowerCase())) return Promise.reject(new Error('そのログインIDは既に使われています。'));
      target.login_id = nextLoginId; target.loginId = nextLoginId;
      target.display_name = sanitize(payload?.displayName || target.display_name || target.displayName); target.displayName = target.display_name;
      target.role = nextRole;
      target.office_id = actor.role === 'office-admin' ? actor.officeId : (payload?.officeId ?? target.office_id ?? null);
      target.officeId = target.office_id;
      target.updated_at = nowIso();
      saveLocalUsers(users);
      if ((currentStoredUser()?.id || '') === target.id) saveCurrentUserSnapshot(target);
      pushAudit({ action: 'update-user', actor: actor.loginId || actor.login_id, target: target.login_id, role: target.role });
      return Promise.resolve({ user: publicUser(target) });
    },
    setAdminUserStatus: (id, active) => {
      if (usesRemote()) return request(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ active }) });
      const actor = requireAdminRole();
      const users = ensureLocalUsers();
      const target = users.find(user => user.id === id);
      if (!target) return Promise.reject(new Error('対象利用者が見つかりません。'));
      if (actor.role === 'office-admin' && target.office_id !== actor.officeId) return Promise.reject(new Error('他事業所の利用者は変更できません。'));
      target.active = Boolean(active);
      saveLocalUsers(users);
      if ((currentStoredUser()?.id || '') === target.id) saveCurrentUserSnapshot(target);
      return Promise.resolve({ user: publicUser(target) });
    },
    setAdminUserPassword: (id, newPassword, administratorPassword) => {
      if (usesRemote()) return request(`/admin/users/${encodeURIComponent(id)}/password`, { method: 'PUT', body: JSON.stringify({ newPassword, administratorPassword }) });
      const actor = requireAdminRole();
      const actorRecord = currentLocalUserRecord();
      if (!actorRecord || String(actorRecord.password || '') !== String(administratorPassword || '')) return Promise.reject(new Error('管理者パスワードが正しくありません。'));
      if (String(newPassword || '').length < 8) return Promise.reject(new Error('新しいパスワードは8文字以上で入力してください。'));
      const users = ensureLocalUsers();
      const target = users.find(user => user.id === id);
      if (!target) return Promise.reject(new Error('対象利用者が見つかりません。'));
      if (actor.role === 'office-admin' && target.office_id !== actor.officeId) return Promise.reject(new Error('他事業所の利用者は変更できません。'));
      target.password = String(newPassword);
      target.passwordChangeRequired = false;
      target.locked_until = null;
      target.failed_attempts = 0;
      saveLocalUsers(users);
      if ((currentStoredUser()?.id || '') === target.id) saveCurrentUserSnapshot(target);
      pushAudit({ action: 'set-password', actor: actor.loginId || actor.login_id, target: target.login_id || target.loginId });
      return Promise.resolve({ user: publicUser(target) });
    },
    unlockAdminUser: id => {
      if (usesRemote()) return request(`/admin/users/${encodeURIComponent(id)}/unlock`, { method: 'PUT', body: JSON.stringify({}) });
      const actor = requireAdminRole();
      const users = ensureLocalUsers();
      const target = users.find(user => user.id === id);
      if (!target) return Promise.reject(new Error('対象利用者が見つかりません。'));
      if (actor.role === 'office-admin' && target.office_id !== actor.officeId) return Promise.reject(new Error('他事業所の利用者は変更できません。'));
      target.locked_until = null;
      target.failed_attempts = 0;
      saveLocalUsers(users);
      return Promise.resolve({ user: publicUser(target) });
    },
    createOffice: payload => request('/admin/offices', { method: 'POST', body: JSON.stringify(payload) }),
    createValidationSampleData: () => request('/admin/validation/sample-data', { method: 'POST', body: JSON.stringify({}) }),
    validationTemplate: () => request('/admin/validation/template'),
    validationRuns: () => request('/admin/validation/runs'),
    createValidationRun: payload => request('/admin/validation/runs', { method: 'POST', body: JSON.stringify(payload) }),
    validationRun: id => request(`/admin/validation/runs/${encodeURIComponent(id)}`),
    updateValidationResult: (id, payload) => request(`/admin/validation/results/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    completeValidationRun: (id, payload) => request(`/admin/validation/runs/${encodeURIComponent(id)}/complete`, { method: 'PUT', body: JSON.stringify(payload) }),
    successionCandidates: () => request('/admin/succession/candidates'),
    successionRequests: () => request('/admin/succession/requests'),
    createSuccessionRequest: payload => request('/admin/succession/requests', { method:'POST', body:JSON.stringify(payload) }),
    executeSuccession: (id,payload) => request(`/admin/succession/requests/${encodeURIComponent(id)}/execute`, { method:'POST', body:JSON.stringify(payload) }),
    rollbackSuccession: (id,payload) => request(`/admin/succession/requests/${encodeURIComponent(id)}/rollback`, { method:'POST', body:JSON.stringify(payload) }),
    createSuccessionReview: (id,payload) => request(`/admin/succession/requests/${encodeURIComponent(id)}/reviews`, { method:'POST', body:JSON.stringify(payload) }),
    finalizeSuccession: (id,payload) => request(`/admin/succession/requests/${encodeURIComponent(id)}/finalize`, { method:'POST', body:JSON.stringify(payload) }),
    confirmFormerAdminReduction: (id,payload) => request(`/admin/succession/requests/${encodeURIComponent(id)}/former-admin-reduction-confirmation`, { method:'POST', body:JSON.stringify(payload) }),
    adminAccessReviews: () => request('/admin/governance/access-reviews'),
    createAdminAccessReview: payload => request('/admin/governance/access-reviews', { method:'POST', body:JSON.stringify(payload) }),
    emergencyRecoveryDrills: () => request('/admin/governance/emergency-recovery-drills'),
    createEmergencyRecoveryDrill: payload => request('/admin/governance/emergency-recovery-drills', { method:'POST', body:JSON.stringify(payload) }),
    governanceDashboard: () => request('/admin/governance/dashboard'),
    governanceCorrectiveActions: () => request('/admin/governance/corrective-actions'),
    createGovernanceCorrectiveAction: payload => request('/admin/governance/corrective-actions', { method:'POST', body:JSON.stringify(payload) }),
    updateGovernanceCorrectiveAction: (id,payload) => request(`/admin/governance/corrective-actions/${encodeURIComponent(id)}`, { method:'PUT', body:JSON.stringify(payload) }),
    governanceNotices: () => request('/admin/governance/notices'),
    createGovernanceNotice: payload => request('/admin/governance/notices', { method:'POST', body:JSON.stringify(payload) }),
    updateGovernanceNotice: (id,payload) => request(`/admin/governance/notices/${encodeURIComponent(id)}`, { method:'PUT', body:JSON.stringify(payload) }),
    governanceTasks: () => request('/admin/governance/tasks'),
    createGovernanceTask: payload => request('/admin/governance/tasks', { method:'POST', body:JSON.stringify(payload) }),
    completeGovernanceTask: (id,payload) => request(`/admin/governance/tasks/${encodeURIComponent(id)}/complete`, { method:'POST', body:JSON.stringify(payload) }),
    governanceReport: period => request(`/admin/governance/report?period=${encodeURIComponent(period||'current')}`),
    saveGovernanceReport: payload => request('/admin/governance/report-snapshots', { method:'POST', body:JSON.stringify(payload) }),
    recordUsageEvent: payload => request('/usage-events', { method:'POST', body:JSON.stringify(payload) }),
    userActivity: params => request(`/admin/user-activity?${new URLSearchParams(params || {})}`),
    dailyUsage: params => request(`/admin/daily-usage?${new URLSearchParams(params || {})}`),
    usagePeriod: params => request(`/admin/usage-period?${new URLSearchParams(params || {})}`),
    activityAlertCases: () => request('/admin/activity-alert-cases'),
    createActivityAlertCase: body => request('/admin/activity-alert-cases', { method: 'POST', body: JSON.stringify(body) }),
    updateActivityAlertCase: (id, body) => request(`/admin/activity-alert-cases/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    activityRetentionPolicy: () => request('/admin/activity-retention-policy'),
    activityAuditReviews: () => request('/admin/activity-audit-reviews'),
    createActivityAuditReview: payload => request('/admin/activity-audit-reviews', { method:'POST', body:JSON.stringify(payload) }),
    saveActivityRetentionPolicy: body => request('/admin/activity-retention-policy', { method: 'PUT', body: JSON.stringify(body) }),
    approveActivityAuditReview: (id, body) => request(`/admin/activity-audit-reviews/${id}/approval`, { method:'PATCH', body:JSON.stringify(body) }),
    activityMonitoringAccessLog: () => request('/admin/activity-monitoring-access-log'),
    activityRetentionPreview: () => request('/admin/activity-retention-preview'),
    saveActivityRetentionPreview: body => request('/admin/activity-retention-previews', { method:'POST', body:JSON.stringify(body) }),
    activityReportSchedules: () => request('/admin/activity-report-schedules'),
    createActivityReportSchedule: body => request('/admin/activity-report-schedules', { method:'POST', body:JSON.stringify(body) }),
    updateActivityReportSchedule: (id, body) => request(`/admin/activity-report-schedules/${id}`, { method:'PATCH', body:JSON.stringify(body) }),
    activityAuditOperationsSummary: () => request('/admin/activity-audit-operations-summary'),
    activityRetentionDisposalRequests: () => request('/admin/activity-retention-disposal-requests'),
    createActivityRetentionDisposalRequest: body => request('/admin/activity-retention-disposal-requests', { method:'POST', body:JSON.stringify(body) }),
    decideActivityRetentionDisposalRequest: (id, body) => request(`/admin/activity-retention-disposal-requests/${id}/decision`, { method:'PATCH', body:JSON.stringify(body) }),
    activityReportRuns: () => request('/admin/activity-report-runs'),
    generateActivityReportRun: body => request('/admin/activity-report-runs/generate', { method:'POST', body:JSON.stringify(body) }),
    approveActivityReportRun: (id, body) => request(`/admin/activity-report-runs/${id}/approval`, { method:'PATCH', body:JSON.stringify(body) }),
    executeActivityRetentionDisposal: (id, body) => request(`/admin/activity-retention-disposal-requests/${id}/execute`, { method:'PATCH', body:JSON.stringify(body) }),
    activityMonthlySummaries: () => request('/admin/activity-monthly-management-summaries'),
    createActivityMonthlySummary: body => request('/admin/activity-monthly-management-summaries', { method:'POST', body:JSON.stringify(body) }),
    approveActivityMonthlySummary: (id, body) => request(`/admin/activity-monthly-management-summaries/${id}/approval`, { method:'PATCH', body:JSON.stringify(body) }),
    activityReportDistributions: () => request('/admin/activity-report-distributions'),
    createActivityReportDistribution: body => request('/admin/activity-report-distributions', { method:'POST', body:JSON.stringify(body) }),
    activityAuditEvidence: () => request('/admin/activity-audit-evidence')
  };
})();

window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/api-client.js": "part503" });
