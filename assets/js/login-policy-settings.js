(()=>{
  "use strict";
  const toggle=document.getElementById("authenticationRequired");
  const status=document.getElementById("authenticationPolicyStatus");
  const save=document.getElementById("saveAuthenticationPolicy");
  if(!toggle||!status||!save||!window.ISSApi)return;

  const render=value=>{
    const required=Boolean(value);
    toggle.checked=required;
    toggle.disabled=false;
    save.disabled=false;
    status.textContent=required?"ログイン必須":"ログイン任意（閲覧専用）";
    document.documentElement.dataset.authenticationRequired=required?"true":"false";
  };

  const load=async()=>{
    status.textContent="確認中";
    toggle.disabled=true;
    save.disabled=true;
    try{
      const data=await window.ISSApi.accessPolicy();
      render(data.authenticationRequired!==false);
    }catch(error){
      render(true);
      status.textContent="取得失敗（ログイン必須として動作）";
    }
  };

  save.addEventListener("click",async()=>{
    const nextRequired=toggle.checked;
    if(!nextRequired){
      const ok=confirm("ログインを任意にすると、未ログイン利用者が危険物検索、危険物詳細、関連法令、関連資料を閲覧できます。申請番号管理や管理画面は引き続きログインが必要です。設定をOFFにしますか？");
      if(!ok){toggle.checked=true;return;}
    }
    toggle.disabled=true;
    save.disabled=true;
    save.textContent="保存中…";
    try{
      const data=await window.ISSApi.updateAccessPolicy({authenticationRequired:nextRequired});
      render(data.authenticationRequired!==false);
      status.textContent=(data.authenticationRequired!==false)?"ログイン必須（保存済み）":"ログイン任意（閲覧専用・保存済み）";
    }catch(error){
      alert(error.message||"ログイン設定を保存できませんでした。");
      await load();
    }finally{
      toggle.disabled=false;
      save.disabled=false;
      save.textContent="ログイン設定を保存";
    }
  });

  load();
})();
