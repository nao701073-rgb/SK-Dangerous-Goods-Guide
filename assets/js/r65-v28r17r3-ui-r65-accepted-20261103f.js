(()=>{
"use strict";
const BUILD="R65-V28R17R3R6";
const apiRoot=()=>String(localStorage.getItem("iss-server-endpoint")||"/api").replace(/\/$/,"");
const token=()=>{try{return sessionStorage.getItem("iss-api-token")||localStorage.getItem("iss-api-token")||""}catch{return ""}};
const text=v=>String(v??"").trim();
const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
const defaultAnnouncement=()=>({enabled:false,title:"",body:"",displayDate:null,updatedAt:null,updatedByName:null});
function currentUser(){try{return window.ISSApi?.getUser?.()||window.ISSAuthBridge?.currentAuth?.()?.user||JSON.parse(localStorage.getItem("iss-api-user")||"{}")||{}}catch{return {}}}
function currentRole(){return String(currentUser()?.role||"")}
function seenKey(){const u=currentUser();return "iss-announcement-last-seen:"+String(u.loginId||u.login_id||u.id||"anonymous").toLowerCase()}
function seenVersion(){try{return String(localStorage.getItem(seenKey())||"")}catch{return ""}}
function markSeen(a){if(!a?.updatedAt)return;try{localStorage.setItem(seenKey(),String(a.updatedAt))}catch{}}
function dateLabel(a){const raw=text(a?.displayDate);return raw?raw.replace(/-/g,"/"):""}
function injectStyle(){
 if(document.getElementById("r65V28R17R3Style"))return;
 const style=document.createElement("style");style.id="r65V28R17R3Style";
 style.textContent=`
 .domestic-law-fullscreen__bundle-toolbar .domestic-law-bundle-pdf-link{display:inline-flex!important;align-items:center;justify-content:center;gap:6px;flex:0 0 auto;min-width:112px;min-height:44px;padding:8px 12px;border:1px solid #0b67b2;border-radius:10px;background:#fff;color:#075ca8;text-decoration:none;font-weight:800;line-height:1.2;white-space:nowrap}
 .domestic-law-bundle-pdf-link__icon{display:block;width:20px;height:20px;flex:0 0 20px}
 .domestic-law-fullscreen__bundle-toolbar .domestic-law-bundle-pdf-link:hover,.domestic-law-fullscreen__bundle-toolbar .domestic-law-bundle-pdf-link:focus-visible{background:#eef6fd;outline:2px solid #0b67b2;outline-offset:2px}
 #homeAnnouncementsSection{margin-top:14px!important;margin-bottom:14px!important}
 #homeAnnouncementsSection .section-heading{margin-bottom:6px!important;align-items:center!important}
 #homeAnnouncementsSection .section-heading>div>p{display:none!important}
 #homeAnnouncementsSection .info-panel{margin:0!important;padding:0!important;min-height:0!important}
 #homeAnnouncementsSection .simple-list__link{display:flex;align-items:center;justify-content:space-between;gap:10px;text-decoration:none;padding:9px 12px!important;min-height:0!important}
 #homeAnnouncementsSection .simple-list__link>div{min-width:0;overflow:hidden}
 #homeAnnouncementsSection [data-system-announcement-title]{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.9rem;line-height:1.35}
 #homeAnnouncementsSection [data-system-announcement-body]{display:-webkit-box!important;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;margin-top:3px!important;font-size:.78rem;line-height:1.4;max-height:2.8em}
 #homeAnnouncementsSection [data-system-announcement-date]{display:block;margin-top:3px!important;font-size:.7rem;line-height:1.2}
 .r65-announcement-new{display:inline-flex;align-items:center;min-height:22px;padding:2px 8px;border-radius:999px;background:#eef6fd;color:#075ca8;font-size:.72rem;font-weight:800;margin-left:8px}
 #systemAnnouncementPanel textarea{width:min(100%,720px);min-height:126px;resize:vertical}
 .r65-announcement-list{display:grid;gap:12px}.r65-announcement-item{border:1px solid #d3e0eb;border-radius:12px;background:#fff;overflow:hidden}
 .r65-announcement-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid #e2eaf1;background:#f7fafc}
 .r65-announcement-head h2{margin:0;color:#073f78;font-size:1rem}.r65-announcement-date{white-space:nowrap;color:#5a7085;font-size:.78rem;font-weight:700}
 .r65-announcement-body{padding:15px 16px;color:#244a6b;line-height:1.8}.r65-announcement-body p{margin:0}
 @media(max-width:600px){.domestic-law-fullscreen__bundle-toolbar .domestic-law-bundle-pdf-link{width:100%!important;min-height:46px}.r65-announcement-head{display:block;padding:10px 11px}.r65-announcement-date{display:block;margin-top:4px}.r65-announcement-body{padding:11px;color:#244a6b;line-height:1.65}#homeAnnouncementsSection{margin-top:10px!important;margin-bottom:10px!important}#homeAnnouncementsSection .section-heading{margin-bottom:5px!important}#homeAnnouncementsSection .simple-list__link{padding:8px 10px!important;gap:8px}#homeAnnouncementsSection [data-system-announcement-title]{font-size:.86rem}#homeAnnouncementsSection [data-system-announcement-body]{font-size:.75rem;line-height:1.35;max-height:2.7em}#systemAnnouncementPanel .settings-row--layout{align-items:stretch}}
 `;
 document.head.appendChild(style);
}
async function request(path,options={}){
 const method=String(options.method||"GET").toUpperCase();
 const headers=new Headers(options.headers||{});headers.set("Accept","application/json");
 const bearer=token();if(bearer)headers.set("Authorization","Bearer "+bearer);
 if(options.body!=null&&!headers.has("Content-Type"))headers.set("Content-Type","application/json");
 if(method!=="GET"&&method!=="HEAD"&&!bearer){
   let csrf=text(sessionStorage.getItem("iss-csrf-token")||localStorage.getItem("iss-csrf-token"));
   if(!csrf){
     const cr=await fetch(apiRoot()+"/auth/csrf",{credentials:"include",headers:{Accept:"application/json"},cache:"no-store"});
     const cj=await cr.json().catch(()=>({}));if(!cr.ok)throw new Error(cj.error||("CSRF HTTP "+cr.status));
     csrf=text(cj.csrfToken);if(csrf)sessionStorage.setItem("iss-csrf-token",csrf);
   }
   if(csrf)headers.set("X-CSRF-Token",csrf);
 }
 const r=await fetch(apiRoot()+path,{...options,method,headers,credentials:"include",cache:"no-store"});
 const data=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(data.error||("HTTP "+r.status));e.status=r.status;throw e}return data;
}
async function loadAnnouncement(){const data=await request("/system/announcement");return {...defaultAnnouncement(),...(data.announcement||{}),updatedAt:data.updatedAt||null,updatedByName:data.updatedByName||null}}
function renderBadge(a){const isNew=Boolean(a.enabled&&a.updatedAt&&seenVersion()!==String(a.updatedAt));document.querySelectorAll("[data-home-notice-badge]").forEach(n=>{n.hidden=!isNew})}
function removeFrequentSection(){
 [...document.querySelectorAll("section")].forEach(section=>{
   const h=[...section.querySelectorAll("h1,h2,h3")].find(n=>text(n.textContent)==="よく使う機能");
   if(h)section.remove();
 });
}
function ensureHomeSection(){
 if(!/\/(?:index\.html)?$/.test(location.pathname))return null;
 removeFrequentSection();
 let sec=document.getElementById("homeAnnouncementsSection");
 if(!sec){
   sec=document.createElement("section");sec.className="dashboard-section";sec.id="homeAnnouncementsSection";
   sec.innerHTML=`<div class="section-heading"><div><h2>お知らせ <span class="r65-announcement-new" data-home-notice-badge hidden>NEW</span></h2><p>法令改正、システム更新、運用上の案内を確認できます。</p></div><a class="text-button" href="pages/announcements.html" aria-label="お知らせを開く">開く →</a></div><article class="info-panel"><a class="simple-list__link" href="pages/announcements.html" aria-label="お知らせを確認する"><div><strong data-system-announcement-title>お知らせを読み込んでいます</strong><small data-system-announcement-body></small><small data-system-announcement-date hidden></small><small data-system-announcement-error hidden></small></div><span aria-hidden="true">→</span></a></article>`;
 }
 // Keep the announcement immediately below the cross-system search card.
 // Do not modify the actual search form, inputs, or search handlers.
 const main=document.querySelector("main");
 if(main){
   const h=[...main.querySelectorAll("h1,h2,h3,h4")].find(n=>{
     const t=text(n.textContent);
     return t==="システム横断検索"||t==="必要な情報をまとめて検索";
   });
   if(h&&text(h.textContent)==="システム横断検索") h.textContent="必要な情報をまとめて検索";
   const search=h||main.querySelector('input[placeholder*="UN1203"],input[placeholder*="GASOLINE"]');
   let top=search;
   while(top?.parentElement && top.parentElement!==main)top=top.parentElement;
   if(top?.parentElement===main && top!==sec){
     if(top.nextElementSibling!==sec)top.insertAdjacentElement("afterend",sec);
   }else{
     const first=main.querySelector(".dashboard-section");
     if(first&&first!==sec&&first.parentElement)first.parentElement.insertBefore(sec,first);
     else if(!sec.parentElement)main.appendChild(sec);
   }
 }else if(!sec.parentElement){document.body.appendChild(sec)}
 return sec;
}
function renderHome(a){
 const sec=ensureHomeSection();if(!sec)return;
 const title=sec.querySelector("[data-system-announcement-title]"),body=sec.querySelector("[data-system-announcement-body]"),date=sec.querySelector("[data-system-announcement-date]");
 if(title)title.textContent=a.enabled?(text(a.title)||"お知らせ"):"現在お知らせはありません";
 if(body)body.textContent=a.enabled?(text(a.body).length>180?text(a.body).slice(0,180)+"…":text(a.body)):"";
 if(date){date.textContent=a.enabled?dateLabel(a):"";date.hidden=!a.enabled||!dateLabel(a)}
 sec.dataset.announcementLoaded="1";sec.dataset.announcementEnabled=a.enabled?"1":"0";renderBadge(a);
}
function renderList(a){
 const list=document.getElementById("systemAnnouncementList");if(!list)return;
 list.classList.add("r65-announcement-list");
 if(!a.enabled){list.innerHTML='<article class="r65-announcement-item"><div class="r65-announcement-body"><p>現在お知らせはありません。</p></div></article>';list.dataset.announcementLoaded="1";renderBadge(a);return}
 list.innerHTML=`<article class="r65-announcement-item"><div class="r65-announcement-head"><h2 data-rendered-announcement-title>${esc(a.title)}</h2>${dateLabel(a)?`<time class="r65-announcement-date">${esc(dateLabel(a))}</time>`:""}</div><div class="r65-announcement-body"><p data-rendered-announcement-body>${esc(a.body).replace(/\n/g,"<br>")}</p></div></article>`;
 list.dataset.announcementLoaded="1";markSeen(a);renderBadge(a);
}
function ensureSettingsPanel(){
 if(!/\/pages\/system-settings\.html$/.test(location.pathname))return null;
 if(currentRole()!=="safety-environment-admin")return null;
 let panel=document.getElementById("systemAnnouncementPanel");if(panel)return panel;
 panel=document.createElement("section");panel.className="panel";panel.id="systemAnnouncementPanel";panel.dataset.roles="safety-environment-admin";
 panel.innerHTML=`<div class="panel-heading"><h2>お知らせ</h2></div><div class="panel-body settings-list"><p class="settings-note">ここで保存した内容は中央設定に保存され、ホーム画面と「お知らせ」画面へ共通反映されます。</p><label class="settings-row settings-row--toggle"><div><strong>お知らせを表示</strong><p>OFFの場合は利用者画面に「現在お知らせはありません」と表示します。</p></div><span class="switch"><input id="systemAnnouncementEnabled" type="checkbox"><span class="switch-slider"></span></span></label><label class="settings-row settings-row--select"><div><strong>表示日</strong><p>お知らせに表示する日付です。</p></div><input id="systemAnnouncementDate" type="date"></label><label class="settings-row settings-row--select"><div><strong>件名</strong><p>ホームとお知らせ画面に表示する件名（120文字以内）です。</p></div><input id="systemAnnouncementTitle" type="text" maxlength="120" autocomplete="off"></label><label class="settings-row settings-row--layout"><div><strong>本文</strong><p>利用者へ案内する内容（2000文字以内）です。</p></div><textarea id="systemAnnouncementBody" maxlength="2000" rows="6"></textarea></label><div class="settings-row"><div><strong>最終更新</strong><p>中央設定に保存された更新日時と更新者です。</p></div><span class="fixed-setting" id="systemAnnouncementMeta">確認中</span></div><div class="settings-actions"><button class="primary-action" id="saveSystemAnnouncement" type="button">お知らせを保存</button><a class="secondary-action" href="announcements.html">表示を確認</a></div><div class="settings-message" id="systemAnnouncementMessage" aria-live="polite"></div><p class="settings-note" data-system-announcement-error hidden></p></div>`;
 const operation=[...document.querySelectorAll("section.panel")].find(s=>text(s.querySelector("h2")?.textContent)==="運用方式・オンライン連携");
 if(operation?.parentNode)operation.parentNode.insertBefore(panel,operation);else(document.querySelector("main")||document.body).appendChild(panel);
 const save=panel.querySelector("#saveSystemAnnouncement");save?.addEventListener("click",()=>saveFromEditor().catch(()=>{}));
 return panel;
}
function setEditor(a){
 const panel=ensureSettingsPanel();if(!panel)return;
 const enabled=document.getElementById("systemAnnouncementEnabled"),date=document.getElementById("systemAnnouncementDate"),title=document.getElementById("systemAnnouncementTitle"),body=document.getElementById("systemAnnouncementBody"),meta=document.getElementById("systemAnnouncementMeta");
 if(enabled)enabled.checked=Boolean(a.enabled);if(date)date.value=text(a.displayDate);if(title)title.value=text(a.title);if(body)body.value=text(a.body);
 if(meta)meta.textContent=a.updatedAt?`最終更新: ${new Date(a.updatedAt).toLocaleString("ja-JP")}${a.updatedByName?" / "+a.updatedByName:""}`:"まだ登録されていません。";
 panel.dataset.announcementLoaded="1";
}
async function saveFromEditor(){
 const msg=document.getElementById("systemAnnouncementMessage"),button=document.getElementById("saveSystemAnnouncement");
 try{
   if(button)button.disabled=true;if(msg){msg.textContent="保存中です…";msg.className="settings-message"}
   const enabled=Boolean(document.getElementById("systemAnnouncementEnabled")?.checked),displayDate=text(document.getElementById("systemAnnouncementDate")?.value),title=text(document.getElementById("systemAnnouncementTitle")?.value),body=text(document.getElementById("systemAnnouncementBody")?.value);
   if(enabled&&!title)throw new Error("表示する場合は件名を入力してください。");
   const data=await request("/admin/system/announcement",{method:"PUT",body:JSON.stringify({enabled,title,body,displayDate:displayDate||null})});
   const a={...defaultAnnouncement(),...(data.announcement||{}),updatedAt:data.updatedAt||null,updatedByName:data.updatedByName||null};setEditor(a);
   if(msg){msg.textContent="お知らせを保存しました。ホームとお知らせ画面へ反映されます。";msg.className="settings-message is-success"}return a;
 }catch(e){if(msg){msg.textContent="お知らせを保存できません: "+e.message;msg.className="settings-message is-error"}throw e}finally{if(button)button.disabled=false}
}
function replaceBackLink(){
 if(!/\/pages\/dangerous-goods-detail\.html$/.test(location.pathname))return;
 const current=document.getElementById("backToHome")||document.getElementById("backToSearch");if(!current)return;
 const a=document.createElement("a");a.id="backToHome";a.className=current.className||"back-link";a.href="../index.html";a.textContent="ホームに戻る";current.replaceWith(a);
}
const pdfIcon=()=>'<svg class="domestic-law-bundle-pdf-link__icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3.5h8l4 4V20H6z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M14 3.5v4h4M8.5 12h7M8.5 15.5h7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span>結合PDF</span>';
function decoratePdfLink(a){
 if(!a)return;
 const already=a.dataset.r65PdfDecorated==="1"
   && a.classList.contains("domestic-law-bundle-pdf-link")
   && a.target==="_blank"
   && a.rel==="noopener"
   && a.getAttribute("aria-label")==="結合PDFを新しいタブで開く"
   && a.title==="結合PDFを新しいタブで開く"
   && !!a.querySelector(".domestic-law-bundle-pdf-link__icon")
   && text(a.textContent)==="結合PDF";
 if(already)return;
 a.dataset.r65PdfDecorated="1";
 a.classList.add("domestic-law-bundle-pdf-link");
 a.target="_blank";
 a.rel="noopener";
 a.setAttribute("aria-label","結合PDFを新しいタブで開く");
 a.title="結合PDFを新しいタブで開く";
 if(!a.querySelector(".domestic-law-bundle-pdf-link__icon")||text(a.textContent)!=="結合PDF")a.innerHTML=pdfIcon();
}
function inferJudgementCriteriaBundleLink(toolbar){
 const host=toolbar.closest(".domestic-law-html-view--judgement");
 if(!host)return null;
 const entries=window.DOMESTIC_JUDGEMENT_CRITERIA_TEXTS?.entries||{};
 const strong=text(toolbar.querySelector("strong")?.textContent);
 const label=strong.replace(/^収録[：:]\s*/,"").trim();
 let matches=Object.entries(entries).filter(([key,entry])=>/^[A-Za-z0-9._-]+$/.test(key)&&text(entry?.title)===label);
 if(matches.length!==1){
   matches=Object.entries(entries).filter(([key,entry])=>{
     const title=text(entry?.title);
     return /^[A-Za-z0-9._-]+$/.test(key)&&title&&strong.includes(title);
   });
 }
 if(matches.length!==1)return null;
 const key=matches[0][0];
 const a=document.createElement("a");
 a.href="../references/excerpts/domestic-bundles/judgement-criteria/"+encodeURIComponent(key)+".pdf";
 a.dataset.r65CriteriaBundleKey=key;
 toolbar.appendChild(a);
 return a;
}
const detailTopPrototypeHeading="試作・参考表示：原典照合・承認待ち";
const detailTopPrototypeBody="整理情報には未承認の内容を含む可能性があります";
const detailTopLegacyDescription="標札、等級、副次危険性等級、包装、EmS、隔離、積載方法を一画面で確認します。";
function removeDangerousGoodsDetailTopNotices(){
 if(!/\/pages\/dangerous-goods-detail\.html$/.test(location.pathname))return;
 // R3R18D3 actual-machine DOM evidence:
 //   main.workspace > .page-heading-row > div > p
 //   main.workspace > section.regulation-approval-banner
 // Both are OUTSIDE #dangerousGoodsDetail.
 const legacy=document.querySelector("main.workspace > .page-heading-row > div > p");
 if(legacy&&text(legacy.textContent)===detailTopLegacyDescription)legacy.remove();
 document.querySelectorAll("main.workspace > section.regulation-approval-banner").forEach(banner=>{
   const heading=text(banner.querySelector("strong")?.textContent);
   const small=text(banner.querySelector("small")?.textContent);
   if(heading===detailTopPrototypeHeading&&small.startsWith(detailTopPrototypeBody))banner.remove();
 });
}
function enhanceDomesticLaw(){
 if(!/\/pages\/dangerous-goods-detail\.html$/.test(location.pathname))return;
 document.querySelectorAll(".domestic-law-fullscreen__bundle-toolbar").forEach(toolbar=>{
   toolbar.querySelectorAll("span").forEach(span=>{if(span.textContent?.includes("別画面"))span.textContent=span.textContent.replace(/別画面/g,"新しいタブ")});
   let link=[...toolbar.querySelectorAll("a")].find(a=>/\.pdf(?:$|[?#])/.test(a.getAttribute("href")||""));
   if(!link)link=inferJudgementCriteriaBundleLink(toolbar);
   const t=text(toolbar.textContent);
   if(!link&&t.includes("収録順：")&&["第8条第1項","第9条","第7条の2","第7条の3第1項・第2項","第14条の2の2"].every(x=>t.includes(x))){
     link=document.createElement("a");link.href="../references/excerpts/domestic-bundles/combined-domestic-laws.pdf";toolbar.appendChild(link);
   }
   if(link)decoratePdfLink(link);
 });
 document.querySelectorAll(".domestic-law-html-view__source-heading span").forEach(span=>{if(span.textContent?.includes("別画面"))span.textContent=span.textContent.replace(/別画面/g,"新しいタブ")});
}
async function refreshAnnouncement(){
 try{
   const a=await loadAnnouncement();renderHome(a);renderList(a);setEditor(a);
   document.querySelectorAll("[data-system-announcement-error]").forEach(n=>{n.hidden=true;n.textContent=""});
   return a;
 }catch(e){
   document.querySelectorAll("[data-system-announcement-error]").forEach(n=>{n.textContent="お知らせを取得できません: "+e.message;n.hidden=false});
   const sec=ensureHomeSection();if(sec)sec.dataset.announcementLoaded="error";
   throw e;
 }
}
function boot(){
 injectStyle();removeFrequentSection();ensureHomeSection();ensureSettingsPanel();replaceBackLink();removeDangerousGoodsDetailTopNotices();enhanceDomesticLaw();
 if(document.getElementById("homeAnnouncementsSection")||document.getElementById("systemAnnouncementList")||document.getElementById("systemAnnouncementPanel"))refreshAnnouncement().catch(()=>{});
 if(/\/pages\/dangerous-goods-detail\.html$/.test(location.pathname)){
   let domesticLawEnhanceScheduled=false;
   const observer=new MutationObserver(()=>{
     if(domesticLawEnhanceScheduled)return;
     domesticLawEnhanceScheduled=true;
     queueMicrotask(()=>{
       domesticLawEnhanceScheduled=false;
       removeDangerousGoodsDetailTopNotices();
       enhanceDomesticLaw();
     });
   });
   observer.observe(document.body,{childList:true,subtree:true});
 }
 document.documentElement.dataset.r65V28R17R3=BUILD;
}
window.SKDGSystemAnnouncement={request,load:loadAnnouncement,refresh:refreshAnnouncement,saveFromEditor};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
