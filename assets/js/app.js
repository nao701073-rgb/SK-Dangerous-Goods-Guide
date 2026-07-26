const recentSearches=[{un:"UN1203",name:"GASOLINE",meta:"UN番号検索"},{un:"UN3082",name:"ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",meta:"品名検索"},{un:"UN1993",name:"FLAMMABLE LIQUID, N.O.S.",meta:"お気に入りから表示"}];
const favorites=[{un:"UN1203",name:"GASOLINE",meta:"川崎事業所"},{un:"UN1993",name:"FLAMMABLE LIQUID, N.O.S.",meta:"川崎事業所"},{un:"UN3082",name:"ENVIRONMENTALLY HAZARDOUS SUBSTANCE, LIQUID, N.O.S.",meta:"川崎事業所"}];
const menu=document.getElementById("sideMenu"),backdrop=document.getElementById("menuBackdrop");
function renderList(id,items){document.getElementById(id).innerHTML=items.map(x=>`<li><div><strong>${x.un} ${x.name}</strong><small>${x.meta}</small></div><span>›</span></li>`).join("")}
document.getElementById("menuToggle").addEventListener("click",()=>{menu.classList.add("open");backdrop.classList.add("visible")});
document.getElementById("menuClose").addEventListener("click",()=>{menu.classList.remove("open");backdrop.classList.remove("visible")});
backdrop.addEventListener("click",()=>{menu.classList.remove("open");backdrop.classList.remove("visible")});
renderList("recentSearchList",recentSearches);renderList("favoriteList",favorites);
