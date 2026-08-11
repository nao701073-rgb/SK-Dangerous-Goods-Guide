(()=>{
  "use strict";
  const themeKey="iss-user-app-theme";
  const allowed=new Set(["standard","bright","calm","dark","system"]);
  let value=localStorage.getItem(themeKey)||"standard";
  if(!allowed.has(value)) value="standard";
  const resolved=value==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"standard"):value;
  document.documentElement.dataset.appTheme=resolved;
  document.documentElement.dataset.appThemePreference=value;
})();

(()=>{
  "use strict";
  const ACTIVITY_KEY="iss-last-activity";
  const TIMEOUT_KEY="iss-session-idle-minutes";
  const LOGOUT_REASON_KEY="iss-session-logout-reason";
  const SESSION_STARTED_KEY="iss-session-started-at";
  const SESSION_TOKEN_KEY="iss-session-token-fingerprint";
  const DEFAULT_MINUTES=30;
  const WARNING_MINUTES=2;
  const ALLOWED_MINUTES=new Set([15,30,60,120]);
  let logoutTimer=0;
  let warningTimer=0;
  let countdownTimer=0;
  let dialog;

  const currentToken=()=>sessionStorage.getItem("iss-api-token")||localStorage.getItem("iss-api-token")||window.ISSAuthBridge?.currentAuth?.()?.token||"";
  const hasSession=()=>Boolean(currentToken());
  const getTimeoutMinutes=()=>{
    const value=Number(localStorage.getItem(TIMEOUT_KEY)||DEFAULT_MINUTES);
    return ALLOWED_MINUTES.has(value)?value:DEFAULT_MINUTES;
  };
  const loginPath=()=>location.pathname.includes("/pages/")?"login.html":"pages/login.html";
  const clearTimers=()=>{
    clearTimeout(logoutTimer); clearTimeout(warningTimer); clearInterval(countdownTimer);
    logoutTimer=warningTimer=countdownTimer=0;
  };
  const ensureDialog=()=>{
    if(dialog) return dialog;
    const style=document.createElement("style");
    style.textContent=`
      .iss-session-dialog{width:min(92vw,430px);border:0;border-radius:14px;padding:0;box-shadow:0 24px 70px rgba(4,31,58,.32);color:#12324d}
      .iss-session-dialog::backdrop{background:rgba(5,24,42,.55);backdrop-filter:blur(3px)}
      .iss-session-dialog__body{padding:24px;background:#fff}
      .iss-session-dialog h2{margin:0 0 10px;font-size:1.15rem;color:#073b68}
      .iss-session-dialog p{margin:0 0 18px;line-height:1.7;font-size:.86rem;color:#49677f}
      .iss-session-dialog strong{color:#075ca8}
      .iss-session-dialog__actions{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .iss-session-dialog button{min-height:44px;border-radius:8px;border:1px solid #b7cadc;background:#fff;color:#075ca8;font-weight:800;cursor:pointer}
      .iss-session-dialog button[data-continue]{border-color:#075ca8;background:#075ca8;color:#fff}
      @media(max-width:480px){.iss-session-dialog__actions{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
    dialog=document.createElement("dialog");
    dialog.className="iss-session-dialog";
    dialog.setAttribute("aria-labelledby","issSessionDialogTitle");
    dialog.innerHTML=`<div class="iss-session-dialog__body"><h2 id="issSessionDialogTitle">まもなく自動ログアウトします</h2><p>一定時間操作がありません。安全のため、あと <strong id="issSessionCountdown">2:00</strong> でログアウトします。</p><div class="iss-session-dialog__actions"><button type="button" data-logout>今すぐログアウト</button><button type="button" data-continue>ログインを継続</button></div></div>`;
    document.body.appendChild(dialog);
    dialog.querySelector("[data-continue]").addEventListener("click",()=>{dialog.close();touch(true)});
    dialog.querySelector("[data-logout]").addEventListener("click",()=>logout("manual-idle-warning"));
    dialog.addEventListener("cancel",event=>{event.preventDefault();dialog.close();touch(true)});
    return dialog;
  };
  const logout=reason=>{
    clearTimers();
    try{window.ISSApi?.logout?.({keepalive:true})?.catch?.(()=>{})}catch(_e){}
    try{window.ISSApi?.clearSession?.()}catch(_e){}
    const currentSessionToken=sessionStorage.getItem("iss-api-token")||"";
    sessionStorage.removeItem("iss-api-token");
    if(currentSessionToken && localStorage.getItem("iss-api-token")===currentSessionToken) localStorage.removeItem("iss-api-token");
    localStorage.removeItem("iss-api-user");
    localStorage.removeItem("iss-password-change-required");
    sessionStorage.removeItem(ACTIVITY_KEY);
    sessionStorage.removeItem(SESSION_STARTED_KEY);
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    try{window.ISSAuthBridge?.clear?.();if(/^ISS_AUTH_BRIDGE_V[123]:/.test(String(window.name||"")))window.name="";}catch(_e){}
    sessionStorage.setItem(LOGOUT_REASON_KEY,reason||"idle-timeout");
    location.href=`${loginPath()}?timeout=1`;
  };
  const showWarning=()=>{
    if(!hasSession()) return;
    const last=Number(sessionStorage.getItem(ACTIVITY_KEY)||Date.now());
    const deadline=last+getTimeoutMinutes()*60000;
    const target=ensureDialog();
    if(!target.open) target.showModal();
    const update=()=>{
      const remaining=Math.max(0,deadline-Date.now());
      const seconds=Math.ceil(remaining/1000);
      const mins=Math.floor(seconds/60);
      const secs=String(seconds%60).padStart(2,"0");
      const output=document.getElementById("issSessionCountdown");
      if(output) output.textContent=`${mins}:${secs}`;
      if(remaining<=0) logout("idle-timeout");
    };
    update();
    clearInterval(countdownTimer);
    countdownTimer=setInterval(update,1000);
  };
  const normalizeSessionActivity=()=>{
    if(!hasSession()) return Date.now();
    const now=Date.now();
    const token=currentToken();
    const storedToken=sessionStorage.getItem(SESSION_TOKEN_KEY)||"";
    const sessionStarted=Number(sessionStorage.getItem(SESSION_STARTED_KEY)||0);
    let last=Number(sessionStorage.getItem(ACTIVITY_KEY)||0);
    const invalidLast=!Number.isFinite(last)||last<=0||last>now+60000;
    const newSession=storedToken!==token||!Number.isFinite(sessionStarted)||sessionStarted<=0;
    const predatesSession=!invalidLast&&sessionStarted>0&&last<sessionStarted;
    if(invalidLast||newSession||predatesSession){
      last=now;
      sessionStorage.setItem(ACTIVITY_KEY,String(now));
      sessionStorage.setItem(SESSION_STARTED_KEY,String(now));
      sessionStorage.setItem(SESSION_TOKEN_KEY,token);
      sessionStorage.removeItem(LOGOUT_REASON_KEY);
    }
    return last;
  };
  const schedule=()=>{
    clearTimers();
    try{window.ISSAuthBridge?.restore?.();}catch(_e){}
    if(!hasSession()) return;
    const timeoutMs=getTimeoutMinutes()*60000;
    const warningMs=Math.min(WARNING_MINUTES*60000,Math.max(30000,timeoutMs/3));
    const last=normalizeSessionActivity();
    const elapsed=Math.max(0,Date.now()-last);
    const remaining=timeoutMs-elapsed;
    if(remaining<=0){
      // A page transition is user activity. Never expire a valid session while
      // a newly opened internal page is still restoring its authentication state.
      if(typeof performance!=="undefined"&&performance.now()<15000){
        sessionStorage.setItem(ACTIVITY_KEY,String(Date.now()));
        sessionStorage.setItem(SESSION_STARTED_KEY,sessionStorage.getItem(SESSION_STARTED_KEY)||String(Date.now()));
        sessionStorage.setItem(SESSION_TOKEN_KEY,currentToken());
        schedule();
        return;
      }
      logout("idle-timeout");return;
    }
    if(remaining<=warningMs){showWarning();}
    else warningTimer=setTimeout(showWarning,remaining-warningMs);
    logoutTimer=setTimeout(()=>logout("idle-timeout"),remaining);
  };
  const touch=(force=false)=>{
    if(!hasSession()) return;
    if(dialog?.open&&!force) return;
    sessionStorage.setItem(ACTIVITY_KEY,String(Date.now()));
    if(dialog?.open) dialog.close();
    schedule();
  };
  let activityThrottle=0;
  const onActivity=()=>{
    const now=Date.now();
    if(now-activityThrottle<1000) return;
    activityThrottle=now;
    touch(false);
  };
  ["click","keydown","touchstart","pointerdown","scroll"].forEach(type=>addEventListener(type,onActivity,{passive:true}));
  addEventListener("storage",event=>{
    if([TIMEOUT_KEY,"iss-api-token"].includes(event.key)) schedule();
  });
  addEventListener("visibilitychange",()=>{if(!document.hidden)schedule()});
  addEventListener("pageshow",schedule);
  if(hasSession()) normalizeSessionActivity();
  schedule();
})();
