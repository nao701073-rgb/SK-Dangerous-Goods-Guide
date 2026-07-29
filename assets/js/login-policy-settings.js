(()=>{
  "use strict";
  const toggle=document.getElementById("authenticationRequired");
  const status=document.getElementById("authenticationPolicyStatus");
  const save=document.getElementById("saveAuthenticationPolicy");
  if(!toggle||!status||!save||!window.ISSApi)return;
  const render=value=>{toggle.checked=Boolean(value);status.textContent=value?"ログイン必須":"ログイン任意（閲覧専用）";};
  const load=async()=>{
    status.textContent="確認中";
    try{const data=await window.ISSApi.accessPolicy();render(data.authenticationRequired!==false);}
    catch(error){render(true);status.textContent="取得失敗（ログイン必須として動作）";}
  };
  save.addEventListener("click",async()=>{
    save.disabled=true;save.textContent="保存中…";
    try{const data=await window.ISSApi.updateAccessPolicy({authenticationRequired:toggle.checked});render(data.authenticationRequired!==false);}
    catch(error){alert(error.message||"ログイン設定を保存できませんでした。");}
    finally{save.disabled=false;save.textContent="ログイン設定を保存";}
  });
  load();
})();
