(()=>{
  "use strict";
  const page=location.pathname.split("/").pop()||"index.html";
  const publicPages=new Set(["login.html","activate-account.html","reset-password.html","cloud-connection.html"]);
  const TOKEN_KEY="iss-api-token";
  const USER_KEY="iss-api-user";
  const PASSWORD_CHANGE_KEY="iss-password-change-required";
  const PREFIXES=["ISS_AUTH_BRIDGE_V3:","ISS_AUTH_BRIDGE_V2:","ISS_AUTH_BRIDGE_V1:"];
  const WRITE_PREFIX=PREFIXES[0];
  const HASH_KEY="issauth";
  const LOCAL_ACCESS_POLICY_KEY="iss-local-access-policy-v365";
  const OPTIONAL_VIEW_PAGES=new Set(["index.html","dangerous-goods-search.html","dangerous-goods-detail.html","regulations.html","references.html"]);

  const safeGet=(storage,key)=>{try{return storage.getItem(key)||"";}catch(_e){return "";}};
  const safeSet=(storage,key,value)=>{try{storage.setItem(key,value);return true;}catch(_e){return false;}};
  const safeRemove=(storage,key)=>{try{storage.removeItem(key);}catch(_e){}};
  const encode=value=>{try{return btoa(unescape(encodeURIComponent(JSON.stringify(value)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/g,"");}catch(_e){return "";}};
  const decode=value=>{try{const normalized=String(value||"").replace(/-/g,"+").replace(/_/g,"/");const padded=normalized+"=".repeat((4-normalized.length%4)%4);return JSON.parse(decodeURIComponent(escape(atob(padded))));}catch(_e){return null;}};

  const readWindowBridge=()=>{
    try{
      const raw=String(window.name||"");
      const prefix=PREFIXES.find(item=>raw.startsWith(item));
      if(!prefix)return null;
      const parsed=JSON.parse(raw.slice(prefix.length));
      return parsed&&typeof parsed==="object"?parsed:null;
    }catch(_e){return null;}
  };
  const writeWindowBridge=data=>{try{window.name=WRITE_PREFIX+JSON.stringify(data||{});}catch(_e){}};
  const storedUser=()=>{try{return JSON.parse(safeGet(localStorage,USER_KEY)||"null");}catch(_e){return null;}};
  const currentAuth=()=>{
    const bridge=readWindowBridge()||{};
    const token=safeGet(sessionStorage,TOKEN_KEY)||safeGet(localStorage,TOKEN_KEY)||String(bridge.token||"");
    const user=storedUser()||bridge.user||null;
    const passwordChangeRequired=safeGet(localStorage,PASSWORD_CHANGE_KEY)==="1"||Boolean(bridge.passwordChangeRequired);
    return {token,user,passwordChangeRequired,updatedAt:bridge.updatedAt||new Date().toISOString()};
  };
  const persistAuth=data=>{
    if(!data?.token)return false;
    const normalized={token:String(data.token),user:data.user||null,passwordChangeRequired:Boolean(data.passwordChangeRequired),updatedAt:data.updatedAt||new Date().toISOString()};
    safeSet(localStorage,TOKEN_KEY,normalized.token);
    safeSet(sessionStorage,TOKEN_KEY,normalized.token);
    if(normalized.user)safeSet(localStorage,USER_KEY,JSON.stringify(normalized.user));
    if(normalized.passwordChangeRequired)safeSet(localStorage,PASSWORD_CHANGE_KEY,"1");else safeRemove(localStorage,PASSWORD_CHANGE_KEY);
    writeWindowBridge(normalized);
    return true;
  };
  const consumeHashBridge=()=>{
    const hash=String(location.hash||"").replace(/^#/,"");
    if(!hash)return null;
    const params=new URLSearchParams(hash);
    const value=params.get(HASH_KEY);
    if(!value)return null;
    const data=decode(value);
    if(data?.token)persistAuth(data);
    params.delete(HASH_KEY);
    const nextHash=params.toString()?`#${params.toString()}`:"";
    try{history.replaceState(history.state,"",`${location.pathname}${location.search}${nextHash}`);}catch(_e){}
    return data;
  };
  const restore=()=>{
    const hashBridge=consumeHashBridge();
    if(hashBridge?.token)return hashBridge;
    const bridge=readWindowBridge();
    if(bridge?.token){persistAuth(bridge);return bridge;}
    const stored=currentAuth();
    if(stored.token){persistAuth(stored);return stored;}
    return null;
  };
  const isInternalTarget=target=>location.protocol==="file:"?target.protocol==="file:":target.origin===location.origin;
  const withAuthFragment=url=>{
    try{
      const auth=currentAuth();
      if(!auth.token)return url;
      const target=new URL(url,location.href);
      if(!isInternalTarget(target))return url;
      const params=new URLSearchParams(String(target.hash||"").replace(/^#/,""));
      params.set(HASH_KEY,encode(auth));
      target.hash=params.toString();
      return target.href;
    }catch(_e){return url;}
  };
  const navigate=url=>{location.href=withAuthFragment(url);};
  const decorateAnchor=anchor=>{
    if(!anchor||anchor.dataset.issAuthDecorated==="1"||anchor.hasAttribute("download")||anchor.target==="_blank")return;
    const href=anchor.getAttribute("href")||"";
    if(!href||href.startsWith("#")||href.startsWith("javascript:")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
    try{
      const target=new URL(href,location.href);
      if(!isInternalTarget(target))return;
      const auth=currentAuth();
      if(!auth.token)return;
      anchor.href=withAuthFragment(target.href);
      anchor.dataset.issAuthDecorated="1";
    }catch(_e){}
  };
  const decorateAll=()=>document.querySelectorAll("a[href]").forEach(decorateAnchor);
  const clear=()=>{
    safeRemove(sessionStorage,TOKEN_KEY);safeRemove(localStorage,TOKEN_KEY);safeRemove(localStorage,USER_KEY);safeRemove(localStorage,PASSWORD_CHANGE_KEY);
    try{if(PREFIXES.some(prefix=>String(window.name||"").startsWith(prefix)))window.name="";}catch(_e){}
  };

  window.ISSAuthBridge={restore,persistAuth,currentAuth,withAuthFragment,navigate,decorateAll,clear};
  restore();

  document.addEventListener("click",event=>{
    if(event.defaultPrevented||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
    const anchor=event.target.closest?.("a[href]");
    if(!anchor||anchor.hasAttribute("download")||anchor.target==="_blank")return;
    const href=anchor.getAttribute("href")||"";
    if(!href||href.startsWith("#")||href.startsWith("javascript:")||href.startsWith("mailto:")||href.startsWith("tel:"))return;
    let target;try{target=new URL(href,location.href);}catch(_e){return;}
    if(!isInternalTarget(target)||!currentAuth().token)return;
    event.preventDefault();navigate(target.href);
  },true);

  const startDecoration=()=>{
    decorateAll();
    try{new MutationObserver(()=>decorateAll()).observe(document.documentElement,{childList:true,subtree:true});}catch(_e){}
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",startDecoration,{once:true});else startDecoration();

  const localAuthenticationRequired=()=>{
    try{
      const policy=JSON.parse(safeGet(localStorage,LOCAL_ACCESS_POLICY_KEY)||"null");
      return policy?.authenticationRequired!==false;
    }catch(_e){return true;}
  };
  const optionalAnonymousViewAllowed=()=>!localAuthenticationRequired()&&OPTIONAL_VIEW_PAGES.has(page);

  if(publicPages.has(page))return;
  if(currentAuth().token)return;
  if(optionalAnonymousViewAllowed()){
    document.documentElement.dataset.authenticationRequired="false";
    document.documentElement.dataset.authenticationOptionalGuest="true";
    return;
  }
  const login=location.pathname.includes("/pages/")?"login.html":"pages/login.html";
  const next=encodeURIComponent(location.pathname+location.search+location.hash);
  location.replace(`${login}?next=${next}`);
})();
