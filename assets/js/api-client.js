(() => {
  "use strict";
  const TOKEN_KEY = "iss-api-token";
  const USER_KEY = "iss-api-user";
  const normalizeBase = value => String(value || "").trim().replace(/\/$/, "");
  const endpoint = () => normalizeBase(window.ISSStorage?.getServerEndpoint?.() || localStorage.getItem("iss-server-endpoint") || "");
  const token = () => sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || "";

  async function request(path, options = {}) {
    const base = endpoint();
    if (!base) throw new Error("社内サーバー接続先が設定されていません。");
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
    getEndpoint: endpoint,
    isConfigured: () => Boolean(endpoint()),
    isAuthenticated: () => Boolean(token()),
    getUser: () => {
      try { return JSON.parse(localStorage.getItem(USER_KEY) || "null"); } catch { return null; }
    },
    clearSession() { sessionStorage.removeItem(TOKEN_KEY); localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY); },
    async startLogin(loginId, password) {
      return request("/auth/login", { method: "POST", body: JSON.stringify({ loginId, password }) });
    },
    async verifyMfa(challengeId, code) {
      return request("/auth/mfa/verify", { method: "POST", body: JSON.stringify({ challengeId, code }) });
    },
    async resendMfa(challengeId) {
      return request("/auth/mfa/resend", { method: "POST", body: JSON.stringify({ challengeId }) });
    },
    storeSession(data, remember = false) {
      if (!data?.token) throw new Error("認証トークンを取得できませんでした。");
      (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      return data.user;
    },
    async login(loginId, password, remember = false) {
      const data = await this.startLogin(loginId, password);
      if (data.mfaRequired) return data;
      this.storeSession(data, remember);
      return data.user;
    },
    activateAccount: (token, newPassword) => request("/auth/activate", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
    requestPasswordReset: loginId => request("/auth/request-password-reset", { method: "POST", body: JSON.stringify({ loginId }) }),
    resetPassword: (token, newPassword) => request("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, newPassword }) }),
    health: () => request("/health"),
    me: () => request("/auth/me"),
    organizations: () => request("/organizations"),
    listApplications: params => request(`/applications?${new URLSearchParams(params || {})}`),
    createApplication: payload => request("/applications", { method: "POST", body: JSON.stringify(payload) }),
    updateApplication: (id, payload) => request(`/applications/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
    deleteApplication: id => request(`/applications/${encodeURIComponent(id)}`, { method: "DELETE" }),
    listPhotos: params => request(`/photos?${new URLSearchParams(params || {})}`),
    uploadPhoto: formData => request("/photos", { method: "POST", body: formData }),
    updatePhoto: (id, payload) => request(`/photos/${encodeURIComponent(id)}`, { method: "PUT", body: JSON.stringify(payload) }),
    deletePhoto: id => request(`/photos/${encodeURIComponent(id)}`, { method: "DELETE" }),
    officeSummary: () => request("/admin/office-summary"),
    accessSummary: () => request("/admin/access-summary"),
    preflight: () => request("/admin/preflight"),
    auditLogs: params => request(`/admin/audit-logs?${new URLSearchParams(typeof params === 'object' ? params : {limit: params || 200})}`),
    forceLogoutUser: id => request(`/admin/users/${encodeURIComponent(id)}/force-logout`, { method:'POST', body:JSON.stringify({}) }),
    adminUsers: () => request('/admin/users'),
    createAdminUser: payload => request('/admin/users', { method: 'POST', body: JSON.stringify(payload) }),
    setAdminUserStatus: (id, active) => request(`/admin/users/${encodeURIComponent(id)}/status`, { method: 'PUT', body: JSON.stringify({ active }) }),
    setAdminUserPassword: (id, newPassword, administratorPassword) => request(`/admin/users/${encodeURIComponent(id)}/password`, { method: 'PUT', body: JSON.stringify({ newPassword, administratorPassword }) }),
    unlockAdminUser: id => request(`/admin/users/${encodeURIComponent(id)}/unlock`, { method: 'PUT', body: JSON.stringify({}) }),
    createOffice: payload => request('/admin/offices', { method: 'POST', body: JSON.stringify(payload) }),
    createValidationSampleData: () => request('/admin/validation/sample-data', { method: 'POST', body: JSON.stringify({}) }),
    validationTemplate: () => request('/admin/validation/template'),
    validationRuns: () => request('/admin/validation/runs'),
    createValidationRun: payload => request('/admin/validation/runs', { method: 'POST', body: JSON.stringify(payload) }),
    validationRun: id => request(`/admin/validation/runs/${encodeURIComponent(id)}`),
    updateValidationResult: (id, payload) => request(`/admin/validation/results/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(payload) }),
    completeValidationRun: (id, payload) => request(`/admin/validation/runs/${encodeURIComponent(id)}/complete`, { method: 'PUT', body: JSON.stringify(payload) })
  };
})();
