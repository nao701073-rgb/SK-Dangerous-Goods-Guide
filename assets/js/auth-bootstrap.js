(()=>{
  "use strict";
  const page=location.pathname.split("/").pop()||"index.html";
  const publicPages=new Set(["login.html","activate-account.html","reset-password.html","cloud-connection.html"]);
  if(publicPages.has(page)) return;
  const token=sessionStorage.getItem("iss-api-token")||localStorage.getItem("iss-api-token");
  if(token) return;
  const login=location.pathname.includes("/pages/")?"login.html":"pages/login.html";
  const next=encodeURIComponent(location.pathname+location.search+location.hash);
  location.replace(`${login}?next=${next}`);
})();
