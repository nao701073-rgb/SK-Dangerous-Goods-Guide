/* SKDG v1.3.92 - tied worst-direction display helper.
   Presentation/summary only. Directional force and resistance formulas are unchanged. */
(function(g){
  'use strict';
  const ORDER=['forward','rear','left','right'];
  const SHORT={forward:'前方',rear:'後方',left:'左方向',right:'右方向'};
  const round1=v=>Math.round((Number(v)||0)*10)/10;
  function labelFor(keys){
    const s=new Set(keys);
    if(s.size===4&&ORDER.every(k=>s.has(k)))return '前後・側面方向（全方向同率）';
    if(s.size===2&&s.has('forward')&&s.has('rear'))return '前後方向（前・後同率）';
    if(s.size===2&&s.has('left')&&s.has('right'))return '側面方向（左・右同率）';
    const names=ORDER.filter(k=>s.has(k)).map(k=>SHORT[k]);
    if(names.length>1)return names.join('・')+'（同率）';
    return names[0]||'－';
  }
  function summarize(results){
    const usable=(Array.isArray(results)?results:[]).filter(r=>r&&r.applicable!==false&&Number.isFinite(Number(r.margin)));
    if(!usable.length)return {label:'－',keys:[],tied:[],representative:null,margin:null};
    const minRounded=Math.min(...usable.map(r=>round1(r.margin)));
    const tied=usable.filter(r=>round1(r.margin)===minRounded).sort((a,b)=>ORDER.indexOf(a.key)-ORDER.indexOf(b.key));
    const representative=tied.reduce((best,r)=>!best||Number(r.external)>Number(best.external)?r:best,null)||tied[0];
    return {label:labelFor(tied.map(r=>r.key)),keys:tied.map(r=>r.key),tied,representative,margin:Number(representative?.margin??0),roundedMargin:minRounded};
  }
  g.SKCTUDirectionTieV1392={summarize,labelFor,round1};
})(window);
