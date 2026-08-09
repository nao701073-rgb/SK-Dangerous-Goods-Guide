(function(global){
  'use strict';
  const endpoint=()=>String(global.ISSStorage?.getServerEndpoint?.()||localStorage.getItem('iss-server-endpoint')||'').replace(/\/$/,'');
  const csrf=()=>document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('iss-csrf='))?.split('=').slice(1).join('=')||'';
  async function request(path,options={}){
    if(!endpoint())throw new Error('サーバー接続先が設定されていません。');
    const headers={'Content-Type':'application/json',...(options.headers||{})};if(options.method&&options.method!=='GET')headers['X-CSRF-Token']=decodeURIComponent(csrf());
    const response=await fetch(endpoint()+path,{credentials:'include',...options,headers});const body=response.status===204?null:await response.json().catch(()=>null);if(!response.ok)throw new Error(body?.error||'サーバー処理を完了できませんでした。');return body;
  }
  global.ISSApplicationIntakeApi={
    connected:()=>Boolean(endpoint()),list:()=>request('/api/application-intake-workflows'),create:payload=>request('/api/application-intake-workflows',{method:'POST',body:JSON.stringify(payload)}),review:(id,payload)=>request(`/api/application-intake-workflows/${encodeURIComponent(id)}/review`,{method:'POST',body:JSON.stringify(payload)}),register:(id,payload)=>request(`/api/application-intake-workflows/${encodeURIComponent(id)}/register`,{method:'POST',body:JSON.stringify(payload)})
  };
})(window);
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-workflow-api.js':'part535'});
