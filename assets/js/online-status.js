(() => {
  "use strict";
  const mode = localStorage.getItem("iss-operation-mode") || "offline";
  if (mode === "offline") return;
  const endpoint = String(localStorage.getItem("iss-server-endpoint") || "").replace(/\/$/, "");
  const queue = () => {
    try { return JSON.parse(localStorage.getItem("iss-sync-queue") || "[]"); } catch { return []; }
  };
  const pendingCount = () => queue().filter(item => ["pending", "error", "processing"].includes(item.status)).length;
  const bar = document.createElement("div");
  bar.className = "online-status-bar";
  bar.setAttribute("role", "status");
  bar.innerHTML = `<span class="online-status-dot"></span><strong></strong><span class="online-status-detail"></span><button type="button">更新</button>`;
  document.body.appendChild(bar);
  const title = bar.querySelector("strong");
  const detail = bar.querySelector(".online-status-detail");
  const dot = bar.querySelector(".online-status-dot");

  function setState(state, text, extra = "") {
    bar.dataset.state = state;
    title.textContent = text;
    detail.textContent = extra;
    dot.setAttribute("aria-label", text);
  }

  async function refresh() {
    const pending = pendingCount();
    if (!navigator.onLine) return setState("offline", "ネットワーク未接続", `同期待ち ${pending}件`);
    if (!endpoint) return setState("warning", `${mode === "online" ? "オンライン" : "ハイブリッド"}運用`, `接続先未設定・同期待ち ${pending}件`);
    setState("checking", "社内API確認中", `同期待ち ${pending}件`);
    try {
      const response = await fetch(`${endpoint}/health`, { cache: "no-store", headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(String(response.status));
      const result = await response.json();
      localStorage.setItem("iss-last-server-health", JSON.stringify({ checkedAt: new Date().toISOString(), result }));
      setState("online", "社内API接続済み", `同期待ち ${pending}件`);
    } catch {
      setState("error", "社内API接続失敗", `オフライン継続・同期待ち ${pending}件`);
    }
  }

  bar.querySelector("button").addEventListener("click", refresh);
  window.addEventListener("online", refresh);
  window.addEventListener("offline", refresh);
  refresh();
  window.setInterval(refresh, 60_000);
})();
