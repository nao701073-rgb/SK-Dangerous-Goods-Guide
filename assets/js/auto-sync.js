(() => {
  "use strict";
  let timer=null,running=false,rerun=false;
  const enabled=()=>["online","hybrid"].includes(localStorage.getItem("iss-operation-mode")||"offline")&&Boolean(window.ISSApi?.isConfigured?.())&&Boolean(window.ISSApi?.isAuthenticated?.());
  async function run(){
    if(!enabled()||!window.ISSSync)return;
    if(running){rerun=true;return;}
    running=true;
    try{await window.ISSSync.run();document.dispatchEvent(new CustomEvent("iss:auto-sync-completed"));}
    catch(error){console.warn("自動同期を完了できませんでした。",error);}
    finally{running=false;if(rerun){rerun=false;schedule(500);}}
  }
  function schedule(delay=1200){clearTimeout(timer);timer=setTimeout(run,delay);}
  ["iss:applications-changed","iss:application-documents-changed","iss:photos-changed"].forEach(name=>window.addEventListener(name,()=>schedule()));
  window.addEventListener("online",()=>schedule(300));
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")schedule(500);});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>schedule(800),{once:true});else schedule(800);
})();
window.__SK_ASSET_BUILD__ = Object.assign(window.__SK_ASSET_BUILD__ || {}, { "assets/js/auto-sync.js": "part503" });
