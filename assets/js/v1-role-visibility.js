(()=>{
'use strict';
// v1.3.34: light-weight privilege gate. No perpetual DOM observer / polling loop.
const PRIVILEGED=new Set(['safety-environment-director','safety-environment-staff','safety-environment-admin','validator']);
function userFrom(v){if(!v)return null;if(typeof v==='object'){if(v.user)return userFrom(v.user)||v.user;if(v.profile)return userFrom(v.profile)||v.profile;if(v.displayName||v.name||v.loginId||v.role)return v}return null}
function currentUser(){
 const gets=[()=>window.ISSAuthBridge?.currentAuth?.()?.user,()=>window.ISSAuthBridge?.currentAuth?.(),()=>window.ISSAuth?.getCurrentUser?.(),()=>window.SKAuth?.getCurrentUser?.(),()=>window.currentUser,()=>window.authUser];
 for(const g of gets){try{const u=userFrom(g());if(u)return u}catch(_){}}
 for(const store of [sessionStorage,localStorage]){try{for(let i=0;i<store.length;i++){const k=store.key(i)||'';if(!/auth|session|user|login|profile/i.test(k))continue;try{const u=userFrom(JSON.parse(store.getItem(k)));if(u)return u}catch(_){}}}catch(_){}}
 return null;
}
function currentRole(){const u=currentUser();return String(u?.role||u?.userRole||u?.currentRole||'').trim()}
function hide(el){if(!el)return;el.hidden=true;el.setAttribute('aria-hidden','true');el.style.setProperty('display','none','important')}
function show(el){if(!el)return;el.hidden=false;el.removeAttribute('aria-hidden');if(el.style.getPropertyValue('display')==='none')el.style.removeProperty('display')}
function gateTargets(selector,allowed){
 const done=new Set();document.querySelectorAll(selector).forEach(el=>{const t=el.closest('article,li,.nav-item,.submenu-item,.feature-card')||el;if(done.has(t))return;done.add(t);allowed?show(t):hide(t)})
}
function restricted(){const p=(location.pathname||'').toLowerCase();if(/overpack-label-tool\.html$/.test(p))return'overpack';if(/system-settings\.html$/.test(p))return'system';return''}
function redirectDenied(kind){if(window.__SK_V1334_REDIRECTING)return;window.__SK_V1334_REDIRECTING=true;try{sessionStorage.setItem('skdg.accessDeniedReason',kind==='overpack'?'オーバーパック表示用作成は権限を持つ利用者のみ使用できます。':'システム設定は権限を持つ利用者のみ使用できます。')}catch(_){}location.replace(/\/pages\//i.test(location.pathname)?'../index.html':'index.html')}
function apply(){
 const role=currentRole();if(!role)return false;const allowed=PRIVILEGED.has(role);
 gateTargets('[data-feature="overpack-label"],a[href*="overpack-label-tool.html"]',allowed);
 gateTargets('a[href*="system-settings.html"]',allowed);
 // "システム状態" remains system-administrator only.
 document.querySelectorAll('h1,h2,h3,strong,.section-title,.panel-title').forEach(el=>{if((el.textContent||'').trim()!=='システム状態')return;const b=el.closest('section,article,.panel,.info-panel,.dashboard-section,.card')||el.parentElement;(role==='safety-environment-admin')?show(b):hide(b)});
 document.documentElement.dataset.v1330PrivilegedMenu=allowed?'allowed':'denied';
 const r=restricted();if(r&&!allowed){redirectDenied(r);return true}return true;
}
function start(){apply();requestAnimationFrame(apply)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
window.addEventListener('pageshow',apply,{passive:true});
})();
