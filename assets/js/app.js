const recentSearches=[{un:"UN1203",name:"GASOLINE",meta:"国連番号検索"},{un:"UN3082",name:"ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",meta:"品名検索"},{un:"UN1993",name:"FLAMMABLE LIQUID, N.O.S.",meta:"お気に入りから表示"}];
const inspectorName=localStorage.getItem("iss-current-user-name")||"検査員の名前";
const officeName=localStorage.getItem("iss-office-name")||"川崎事業所";
const favorites=[{un:"UN1203",name:"GASOLINE",meta:`${officeName} ${inspectorName}`},{un:"UN1993",name:"FLAMMABLE LIQUID, N.O.S.",meta:`${officeName} ${inspectorName}`},{un:"UN3082",name:"ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",meta:`${officeName} ${inspectorName}`}];
const menu=document.getElementById("sideMenu"),backdrop=document.getElementById("menuBackdrop");
function renderList(id,items){
  const target=document.getElementById(id);
  if(!target)return;
  target.innerHTML=items.map(x=>{
    const un=String(x.un||"").replace(/\D/g,"").padStart(4,"0");
    const label=`${x.un||`UN${un}`} ${x.name||""}`.trim();
    return `<li><a class="simple-list__link" href="pages/dangerous-goods-detail.html?un=${encodeURIComponent(un)}" aria-label="${label}の危険物詳細を開く"><div><strong>${label}</strong><small>${x.meta||""}</small></div><span aria-hidden="true">›</span></a></li>`;
  }).join("");
}
document.getElementById("favoritePanelTitle").textContent=`${officeName} ${inspectorName}のお気に入り`;
document.getElementById("menuToggle").addEventListener("click",()=>{menu.classList.add("open");backdrop.classList.add("visible")});
document.getElementById("menuClose").addEventListener("click",()=>{menu.classList.remove("open");backdrop.classList.remove("visible")});
backdrop.addEventListener("click",()=>{menu.classList.remove("open");backdrop.classList.remove("visible")});
document.querySelectorAll(".module-card:not(.is-disabled)").forEach(card=>{const link=card.querySelector("a[href]");if(!link)return;card.tabIndex=0;card.setAttribute("role","link");const open=()=>location.href=link.href;card.addEventListener("click",e=>{if(!e.target.closest("a"))open()});card.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();open()}})});
renderList("recentSearchList",recentSearches);renderList("favoriteList",favorites);
