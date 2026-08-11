(() => {
  "use strict";

  const byId = id => document.getElementById(id);
  const currentPageEl = byId("currentAccessUrl");
  if (!currentPageEl) return;

  const topUrlEl = byId("systemTopUrl");
  const modeEl = byId("currentAccessMode");
  const shareabilityEl = byId("accessShareability");
  const noteEl = byId("accessUrlNote");
  const copyTopButton = byId("copySystemTopUrl");
  const copyCurrentButton = byId("copyCurrentAccessUrl");
  const openTopButton = byId("openSystemTopUrl");
  const shareButton = byId("shareCurrentAccessUrl");
  const messageEl = byId("settingsMessage");

  const currentUrl = new URL(window.location.href);
  currentUrl.hash = "";
  currentUrl.search = "";

  const getSystemTopUrl = url => {
    const top = new URL(url.href);
    top.hash = "";
    top.search = "";
    const marker = "/pages/";
    if (top.pathname.includes(marker)) {
      top.pathname = `${top.pathname.split(marker)[0]}/index.html`;
    } else if (!top.pathname.endsWith("/") && !top.pathname.endsWith("/index.html")) {
      top.pathname = top.pathname.replace(/[^/]*$/, "index.html");
    }
    return top;
  };

  const systemTopUrl = getSystemTopUrl(currentUrl);
  const currentPageUrl = currentUrl.href;
  const topUrl = systemTopUrl.href;

  const setMessage = text => {
    if (!messageEl) return;
    messageEl.textContent = text;
    clearTimeout(setMessage.timer);
    setMessage.timer = setTimeout(() => { messageEl.textContent = ""; }, 3200);
  };

  const fallbackCopy = text => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand("copy");
    area.remove();
    if (!copied) throw new Error("copy failed");
  };

  const copyText = async text => {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    fallbackCopy(text);
  };

  const localHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1"];
  let mode = "HTTPSによるWeb公開";
  let shareability = "ほかの端末へ案内可能";
  let shareable = true;
  let note = "トップURLを利用者へ案内してください。現在のページURLは、特定画面を直接開かせる場合に使用します。";

  if (currentUrl.protocol === "file:") {
    mode = "ファイル直接起動";
    shareability = "この端末内のみ";
    shareable = false;
    note = "このURLはほかの端末では開けません。共有する場合はGitHub PagesなどのHTTPS公開先を使用してください。";
  } else if (localHosts.includes(currentUrl.hostname)) {
    mode = "ローカルサーバー";
    shareability = "原則としてこの端末内のみ";
    shareable = false;
    note = "localhost等のURLは、ほかの端末では通常開けません。利用者へは公開URLを案内してください。";
  } else if (currentUrl.protocol !== "https:") {
    mode = "HTTP接続";
    shareability = "共有可能・機能制限の可能性あり";
    note = "URLは共有できますが、一部ブラウザ機能が制限される可能性があります。正式公開ではHTTPSを推奨します。";
  } else if (currentUrl.hostname.endsWith("github.io")) {
    mode = "GitHub Pages（HTTPS）";
    note = "GitHub Pagesで公開されています。利用者へ案内する際は、上段のシステムトップURLを使用してください。";
  }

  currentPageEl.textContent = currentPageUrl;
  currentPageEl.title = currentPageUrl;
  topUrlEl.textContent = topUrl;
  topUrlEl.title = topUrl;
  modeEl.textContent = mode;
  shareabilityEl.textContent = shareability;
  shareabilityEl.classList.toggle("is-warning", !shareable);
  noteEl.textContent = note;

  copyTopButton?.addEventListener("click", async () => {
    try {
      await copyText(topUrl);
      setMessage("システムのトップURLをコピーしました。");
    } catch (error) {
      console.error(error);
      setMessage("トップURLをコピーできませんでした。表示されたURLを選択してコピーしてください。");
    }
  });

  copyCurrentButton?.addEventListener("click", async () => {
    try {
      await copyText(currentPageUrl);
      setMessage("現在のページURLをコピーしました。");
    } catch (error) {
      console.error(error);
      setMessage("ページURLをコピーできませんでした。表示されたURLを選択してコピーしてください。");
    }
  });

  openTopButton?.addEventListener("click", () => {
    window.open(topUrl, "_blank", "noopener,noreferrer");
  });

  if (!navigator.share || !shareable) {
    shareButton?.setAttribute("hidden", "hidden");
  } else {
    shareButton?.addEventListener("click", async () => {
      try {
        await navigator.share({
          title: "検査・検品業務サポートシステム",
          text: "危険物情報、申請番号管理、申請書確認、固縛力参考算出、関連法令、関連資料を確認できます。",
          url: topUrl
        });
        setMessage("トップURLの共有画面を開きました。");
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setMessage("トップURLを共有できませんでした。");
        }
      }
    });
  }

  const diagnosticNetwork = byId("diagnosticNetwork");
  const diagnosticSecureContext = byId("diagnosticSecureContext");
  const diagnosticStorage = byId("diagnosticStorage");
  const diagnosticOffline = byId("diagnosticOffline");
  const diagnosticStorageQuota = byId("diagnosticStorageQuota");
  const diagnosticStoragePersistence = byId("diagnosticStoragePersistence");
  const diagnosticDisplayMode = byId("diagnosticDisplayMode");
  const diagnosticInstallability = byId("diagnosticInstallability");
  const diagnosticUpdateStatus = byId("diagnosticUpdateStatus");
  const diagnosticDataVersion = byId("diagnosticDataVersion");
  const diagnosticCacheStorage = byId("diagnosticCacheStorage");
  const diagnosticBrowser = byId("diagnosticBrowser");
  const diagnosticViewport = byId("diagnosticViewport");
  const refreshDiagnosticsButton = byId("refreshAccessDiagnostics");
  const copyDiagnosticsButton = byId("copyAccessDiagnostics");
  const downloadDiagnosticsButton = byId("downloadAccessDiagnostics");
  const requestStoragePersistenceButton = byId("requestStoragePersistence");
  const reloadApplicationButton = byId("reloadApplication");
  const installApplicationButton = byId("installApplication");
  const checkApplicationUpdateButton = byId("checkApplicationUpdate");
  let deferredInstallPrompt = null;
  const diagnosticsNote = byId("accessDiagnosticsNote");
  let latestDiagnosticsText = "";

  const setDiagnostic = (element, text, state) => {
    if (!element) return;
    element.textContent = text;
    element.classList.remove("is-ok", "is-warning", "is-error");
    if (state) element.classList.add(`is-${state}`);
  };

  const testLocalStorage = () => {
    try {
      const key = "sk-access-diagnostic";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn("localStorage diagnostic failed", error);
      return false;
    }
  };


  const formatBytes = value => {
    if (!Number.isFinite(value) || value < 0) return "確認できません";
    const units = ["B", "KB", "MB", "GB"];
    let amount = value;
    let unitIndex = 0;
    while (amount >= 1024 && unitIndex < units.length - 1) {
      amount /= 1024;
      unitIndex += 1;
    }
    return `${amount >= 100 || unitIndex === 0 ? amount.toFixed(0) : amount.toFixed(1)} ${units[unitIndex]}`;
  };

  const detectBrowser = () => {
    const ua = navigator.userAgent || "";
    if (/Edg\//.test(ua)) return "Microsoft Edge";
    if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) return "Google Chrome";
    if (/Firefox\//.test(ua)) return "Mozilla Firefox";
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return "Safari";
    return "その他のブラウザ";
  };

  const getDisplayMode = () => {
    if (window.matchMedia?.("(display-mode: standalone)").matches || navigator.standalone === true) return "アプリ表示";
    if (window.matchMedia?.("(display-mode: fullscreen)").matches) return "全画面表示";
    return "ブラウザ表示";
  };

  const runDiagnostics = async () => {
    const online = navigator.onLine;
    const secure = window.isSecureContext || currentUrl.protocol === "file:";
    const storageAvailable = testLocalStorage();
    const serviceWorkerSupported = "serviceWorker" in navigator;
    const browserName = detectBrowser();
    const displayMode = getDisplayMode();
    const viewportText = `${window.innerWidth} × ${window.innerHeight}px`;
    let quotaText = "確認できません";
    let quotaState = "warning";
    let quotaDetail = "Storage Estimate API非対応";
    if (navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        const usage = Number(estimate.usage || 0);
        const quota = Number(estimate.quota || 0);
        const percent = quota > 0 ? (usage / quota) * 100 : 0;
        quotaText = quota > 0 ? `${formatBytes(usage)} / ${formatBytes(quota)}` : formatBytes(usage);
        quotaDetail = quota > 0 ? `${percent.toFixed(1)}%使用` : "上限値を取得できません";
        quotaState = percent >= 90 ? "error" : percent >= 75 ? "warning" : "ok";
      } catch (error) {
        console.warn("storage estimate diagnostic failed", error);
      }
    }
    let persistenceText = "確認できません";
    let persistenceState = "warning";
    if (navigator.storage?.persisted) {
      try {
        const persisted = await navigator.storage.persisted();
        persistenceText = persisted ? "保護されています" : "自動整理の対象になる可能性";
        persistenceState = persisted ? "ok" : "warning";
      } catch (error) {
        console.warn("storage persistence diagnostic failed", error);
      }
    } else {
      persistenceText = "ブラウザ非対応";
    }

    let installabilityText = getDisplayMode() === "アプリ表示" ? "追加済み" : "ブラウザ判定待ち";
    let installabilityState = getDisplayMode() === "アプリ表示" ? "ok" : "warning";
    if (deferredInstallPrompt) {
      installabilityText = "追加可能";
      installabilityState = "ok";
    } else if (!("serviceWorker" in navigator) || !window.isSecureContext) {
      installabilityText = "利用条件を満たしていません";
      installabilityState = "warning";
    }

    let dataVersionText = "確認できません";
    let dataVersionState = "warning";
    try {
      const versionUrl = new URL("../VERSION.json", window.location.href);
      const response = await fetch(versionUrl.href, { cache: "no-store" });
      if (response.ok) {
        const versionInfo = await response.json();
        dataVersionText = `Part ${versionInfo.part || "-"} / ${versionInfo.version || "-"}`;
        dataVersionState = "ok";
      }
    } catch (error) {
      console.warn("version diagnostic failed", error);
    }

    let cacheStorageText = "ブラウザ非対応";
    let cacheStorageState = "warning";
    if ("caches" in window) {
      try {
        const cacheNames = await caches.keys();
        cacheStorageText = cacheNames.length ? `${cacheNames.length}件のキャッシュ` : "未作成";
        cacheStorageState = cacheNames.length ? "ok" : "warning";
      } catch (error) {
        cacheStorageText = "確認できません";
        cacheStorageState = "error";
        console.warn("cache storage diagnostic failed", error);
      }
    }

    let updateStatusText = "確認できません";
    let updateStatusState = "warning";
    let offlineText = "未対応";
    let offlineState = "warning";

    if (serviceWorkerSupported) {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (navigator.serviceWorker.controller || registration?.active) {
          offlineText = "利用可能";
          offlineState = "ok";
          if (registration?.waiting) {
            updateStatusText = "更新待ち";
            updateStatusState = "warning";
          } else if (registration?.installing) {
            updateStatusText = "更新中";
            updateStatusState = "warning";
          } else {
            updateStatusText = "最新";
            updateStatusState = "ok";
          }
        } else {
          offlineText = "準備中・未登録";
        }
      } catch (error) {
        console.warn("service worker diagnostic failed", error);
        offlineText = "確認できません";
        offlineState = "error";
      }
    }

    setDiagnostic(diagnosticNetwork, online ? "オンライン" : "オフライン", online ? "ok" : "warning");
    setDiagnostic(diagnosticSecureContext, secure ? "利用可能" : "制限の可能性", secure ? "ok" : "warning");
    setDiagnostic(diagnosticStorage, storageAvailable ? "利用可能" : "利用不可", storageAvailable ? "ok" : "error");
    setDiagnostic(diagnosticOffline, offlineText, offlineState);
    setDiagnostic(diagnosticStorageQuota, quotaText, quotaState);
    if (diagnosticStorageQuota) diagnosticStorageQuota.title = quotaDetail;
    setDiagnostic(diagnosticStoragePersistence, persistenceText, persistenceState);
    setDiagnostic(diagnosticDisplayMode, displayMode, "ok");
    setDiagnostic(diagnosticInstallability, installabilityText, installabilityState);
    setDiagnostic(diagnosticUpdateStatus, updateStatusText, updateStatusState);
    setDiagnostic(diagnosticDataVersion, dataVersionText, dataVersionState);
    setDiagnostic(diagnosticCacheStorage, cacheStorageText, cacheStorageState);
    setDiagnostic(diagnosticBrowser, browserName, "ok");
    setDiagnostic(diagnosticViewport, viewportText, "ok");

    latestDiagnosticsText = [
      "検査・検品業務サポートシステム 利用環境確認",
      `確認日時: ${new Date().toLocaleString("ja-JP")}`,
      `システムトップURL: ${topUrl}`,
      `接続方式: ${mode}`,
      `ネットワーク: ${online ? "オンライン" : "オフライン"}`,
      `安全な接続: ${secure ? "利用可能" : "制限の可能性"}`,
      `端末内保存: ${storageAvailable ? "利用可能" : "利用不可"}`,
      `オフライン機能: ${offlineText}`,
      `保存容量: ${quotaText}（${quotaDetail}）`,
      `保存保護: ${persistenceText}`,
      `表示方式: ${displayMode}`,
      `アプリ導入: ${installabilityText}`,
      `更新状態: ${updateStatusText}`,
      `データ版: ${dataVersionText}`,
      `オフライン保存: ${cacheStorageText}`,
      `ブラウザ: ${browserName}`,
      `画面サイズ: ${viewportText}`,
      `ユーザーエージェント: ${navigator.userAgent}`
    ].join("\n");

    if (diagnosticsNote) {
      diagnosticsNote.textContent = storageAvailable
        ? "利用環境の簡易確認が完了しました。表示に警告がある場合は、公開URLやブラウザ設定を確認してください。"
        : "端末内保存を利用できません。ブラウザのプライベートモードやサイトデータ設定を確認してください。";
    }
  };

  refreshDiagnosticsButton?.addEventListener("click", async () => {
    await runDiagnostics();
    setMessage("利用環境を再確認しました。");
  });

  copyDiagnosticsButton?.addEventListener("click", async () => {
    try {
      if (!latestDiagnosticsText) await runDiagnostics();
      await copyText(latestDiagnosticsText);
      setMessage("利用環境の確認結果をコピーしました。");
    } catch (error) {
      console.error(error);
      setMessage("確認結果をコピーできませんでした。");
    }
  });


  const downloadTextFile = (text, filename) => {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  downloadDiagnosticsButton?.addEventListener("click", async () => {
    try {
      if (!latestDiagnosticsText) await runDiagnostics();
      const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
      downloadTextFile(latestDiagnosticsText, `SK-Dangerous-Goods-Guide_利用環境確認_${stamp}.txt`);
      setMessage("利用環境の確認結果をテキストファイルへ保存しました。");
    } catch (error) {
      console.error(error);
      setMessage("確認結果を保存できませんでした。");
    }
  });

  if (!navigator.storage?.persist) {
    requestStoragePersistenceButton?.setAttribute("hidden", "hidden");
  } else {
    requestStoragePersistenceButton?.addEventListener("click", async () => {
      try {
        const granted = await navigator.storage.persist();
        await runDiagnostics();
        setMessage(granted
          ? "端末内データの保存保護が有効になりました。"
          : "保存保護は有効になりませんでした。ブラウザのサイト設定をご確認ください。");
      } catch (error) {
        console.error(error);
        setMessage("保存保護を設定できませんでした。");
      }
    });
  }


  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installApplicationButton?.removeAttribute("hidden");
    runDiagnostics();
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    installApplicationButton?.setAttribute("hidden", "hidden");
    setMessage("システムをアプリとして追加しました。");
    runDiagnostics();
  });

  installApplicationButton?.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      setMessage("このブラウザでは、現在アプリ追加を実行できません。");
      return;
    }
    try {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installApplicationButton.setAttribute("hidden", "hidden");
      setMessage(choice?.outcome === "accepted" ? "アプリ追加を受け付けました。" : "アプリ追加をキャンセルしました。");
      await runDiagnostics();
    } catch (error) {
      console.error(error);
      setMessage("アプリ追加を開始できませんでした。");
    }
  });

  checkApplicationUpdateButton?.addEventListener("click", async () => {
    if (!("serviceWorker" in navigator)) {
      setMessage("このブラウザはオフライン更新確認に対応していません。");
      return;
    }
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        setMessage("オフライン機能がまだ登録されていません。");
        await runDiagnostics();
        return;
      }
      await registration.update();
      await runDiagnostics();
      if (registration.waiting) {
        setMessage("新しいオフラインデータがあります。システムを再読み込みしてください。");
      } else {
        setMessage("オフラインデータは最新です。");
      }
    } catch (error) {
      console.error(error);
      setMessage("オフラインデータの更新を確認できませんでした。");
    }
  });

  reloadApplicationButton?.addEventListener("click", () => {
    setMessage("システムを再読み込みします。");
    window.setTimeout(() => window.location.reload(), 250);
  });

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(runDiagnostics, 250);
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) runDiagnostics();
  });

  window.addEventListener("online", runDiagnostics);
  window.addEventListener("offline", runDiagnostics);
  runDiagnostics();

})();
