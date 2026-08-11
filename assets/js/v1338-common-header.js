(()=>{
'use strict';
const HOME='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 10.5 12 4l7.5 6.5v8a1 1 0 0 1-1 1h-4.25v-5.5h-4.5V19.5H5.5a1 1 0 0 1-1-1z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const CLOSE='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
const ICONS={
 home:HOME,
 search:'<svg viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m15 15 4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 applications:'<svg viewBox="0 0 24 24"><rect x="5" y="6" width="14" height="13" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9 4h6v4H9zM8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
 intake:'<svg viewBox="0 0 24 24"><path d="M6 4h8l4 4v12H6z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M14 4v4h4M9 13h6M9 17h4" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 ctu:'<svg viewBox="0 0 24 24"><path d="M4 8h16v9H4zM7 5v3M17 5v3M7 17v2M17 17v2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 law:'<svg viewBox="0 0 24 24"><path d="M12 4v15M7 7h10M8 7l-3 5h6zM16 7l-3 5h6zM8 19h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
 refs:'<svg viewBox="0 0 24 24"><path d="M5 5h6v14H5zM13 5h6v14h-6z" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 overpack:'<svg viewBox="0 0 24 24"><path d="M5 7h14v12H5zM8 4h8v3M9 11h6M12 8v6" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 history:'<svg viewBox="0 0 24 24"><path d="M5 8V5h3M5 5a8 8 0 1 1-1 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 8v5l3 2" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 feedback:'<svg viewBox="0 0 24 24"><path d="M5 5h14v10H9l-4 4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 9h8M8 12h5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
 settings:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="m12 3 1 2 2 .5 2-1 2 2-1 2 .5 2 2 1v3l-2 1-.5 2 1 2-2 2-2-1-2 .5-1 2H9l-1-2-2-.5-2 1-2-2 1-2-.5-2-2-1v-3l2-1 .5-2-1-2 2-2 2 1L8 5l1-2z" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>'
};
const PRIVILEGED=new Set(['safety-environment-director','safety-environment-staff','safety-environment-admin','validator']);
function filename(){return (location.pathname.split('/').pop()||'').toLowerCase()}
function inPages(){return /\/pages\//i.test(location.pathname||'')}
function rootHref(){return inPages()?'../index.html':'index.html'}
function pageHref(name){return inPages()?name:'pages/'+name}
function userFrom(v){if(!v)return null;if(typeof v==='object'){if(v.user)return userFrom(v.user)||v.user;if(v.profile)return userFrom(v.profile)||v.profile;if(v.displayName||v.name||v.loginId||v.role)return v}return null}
function currentUser(){
 const gets=[()=>window.ISSAuthBridge?.currentAuth?.()?.user,()=>window.ISSAuthBridge?.currentAuth?.(),()=>window.ISSAuth?.getCurrentUser?.(),()=>window.SKAuth?.getCurrentUser?.(),()=>window.currentUser,()=>window.authUser];
 for(const g of gets){try{const u=userFrom(g());if(u)return u}catch(_){}}
 for(const store of [sessionStorage,localStorage]){try{for(let i=0;i<store.length;i++){const k=store.key(i)||'';if(!/auth|session|user|login|profile/i.test(k))continue;try{const u=userFrom(JSON.parse(store.getItem(k)));if(u)return u}catch(_){}}}catch(_){}}
 return null;
}
function role(){const u=currentUser();return String(u?.role||u?.userRole||u?.currentRole||'').trim()}
function updateUser(){
 const u=currentUser();const name=String(u?.displayName||u?.name||u?.loginId||'利用者').trim()||'利用者';const initial=Array.from(name)[0]||'利';
 document.querySelectorAll('.sk-v1338-header .sk-current-user-link').forEach(a=>{
   a.href=pageHref('settings.html');a.title='ユーザー設定を開く';a.setAttribute('aria-label',name+'のユーザー設定を開く');
   const av=a.querySelector('.sk-current-user-avatar');const nm=a.querySelector('.sk-current-user-name');if(av)av.textContent=initial;if(nm)nm.textContent=name;
 });
}
function navItems(){
 const r=role();const canApps=r!=='guest';const canPriv=PRIVILEGED.has(r);
 return [
 ['home','ホーム',rootHref(),true],['search','危険物検索',pageHref('dangerous-goods-search.html'),true],
 ['applications','申請番号管理',pageHref('applications.html'),canApps],['intake','申請書取込・確認',pageHref('application-intake-workflow.html'),canApps],
 ['ctu','固縛力参考算出',pageHref('ctu-securing-calculator.html'),canApps],['law','関連法令',pageHref('regulations.html'),true],
 ['refs','関連資料',pageHref('references.html'),true],['overpack','オーバーパック表示用作成',pageHref('overpack-label-tool.html'),canPriv],
 ['history','検索履歴',pageHref('search-history.html'),true],['feedback','改善要望',pageHref('feedback.html'),true],
 ['settings','ユーザー設定',pageHref('settings.html'),true],['settings','システム設定',pageHref('system-settings.html'),canPriv]
 ].filter(x=>x[3]);
}
function activeFor(href){try{return new URL(href,location.href).pathname===location.pathname}catch(_){return false}}
function createDrawer(){
 let d=document.querySelector('.sk-v1338-drawer');if(d)return d;
 d=document.createElement('aside');d.className='sk-v1338-drawer';d.setAttribute('aria-hidden','true');
 d.innerHTML='<div class="sk-v1338-drawer__head"><strong>メニュー</strong><button type="button" class="sk-v1338-drawer__close" aria-label="メニューを閉じる">'+CLOSE+'</button></div><div class="sk-v1338-drawer__section">メインメニュー</div><nav class="sk-v1338-drawer__nav"></nav>';
 const nav=d.querySelector('nav');
 for(const [ic,label,href] of navItems()){
   const a=document.createElement('a');a.href=href;if(activeFor(href))a.setAttribute('aria-current','page');a.innerHTML='<span class="sk-v1338-drawer__icon">'+(ICONS[ic]||HOME)+'</span><span></span>';a.lastElementChild.textContent=label;nav.appendChild(a);
 }
 d.querySelector('.sk-v1338-drawer__close').addEventListener('click',closeMenu);document.body.appendChild(d);return d;
}
function openMenu(){createDrawer();if(!document.querySelector('.sk-v1338-backdrop')){const b=document.createElement('div');b.className='sk-v1338-backdrop';b.addEventListener('click',closeMenu);document.body.appendChild(b)}document.documentElement.classList.add('sk-v1338-menu-open');document.querySelector('.sk-v1338-drawer')?.setAttribute('aria-hidden','false');document.querySelector('.sk-v1338-menu-button')?.setAttribute('aria-expanded','true')}
function closeMenu(){document.documentElement.classList.remove('sk-v1338-menu-open');document.querySelector('.sk-v1338-drawer')?.setAttribute('aria-hidden','true');document.querySelector('.sk-v1338-backdrop')?.remove();document.querySelector('.sk-v1338-menu-button')?.setAttribute('aria-expanded','false')}
function init(){
 document.documentElement.classList.remove('sk-v1338-menu-open');document.body.classList.add('has-sk-v1338-header');
 updateUser();requestAnimationFrame(updateUser);setTimeout(updateUser,400);document.querySelector('.sk-v1338-menu-button')?.addEventListener('click',openMenu,{passive:true});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeMenu()});window.addEventListener('pageshow',()=>{closeMenu();updateUser()},{passive:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
