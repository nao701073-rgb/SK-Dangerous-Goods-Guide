(()=>{
  'use strict';
  function findRecord(arg){
    if(!arg)return null;
    if(arg.smallPackingInstruction||arg.classification||arg.properShippingNameJa)return arg;
    const no=String(arg.unNumber||arg.un||arg.unNo||'').replace(/^UN/i,'').padStart(4,'0');
    if(!no)return null;
    const pg=String(arg.packingGroup||'').toUpperCase().replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').trim();
    const rows=(window.UN_DATABASE||[]).filter(r=>String(r.unNumber||r.un||'').replace(/^UN/i,'').padStart(4,'0')===no);
    return rows.find(r=>String(r.packingGroup||'').toUpperCase().replace(/Ⅰ/g,'I').replace(/Ⅱ/g,'II').replace(/Ⅲ/g,'III').trim()===pg)||rows[0]||null;
  }
  function resolveAllowance(a={},b={}){
    const aRecord=findRecord(a),bRecord=findRecord(b);
    const record=(a?.smallPackingInstruction||a?.classification)?a:(b?.smallPackingInstruction||b?.classification)?b:(aRecord||bRecord);
    const cargo=record===a?b:a;
    if(window.ISSApplicationAllowance?.resolve&&record)return window.ISSApplicationAllowance.resolve(record,cargo||{});
    return null;
  }
  const legacy=window.SKApplicationAllowanceResolver=window.SKApplicationAllowanceResolver||{};
  if(typeof legacy.resolveAllowance!=='function')legacy.resolveAllowance=resolveAllowance;
  if(typeof legacy.resolve!=='function')legacy.resolve=resolveAllowance;
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v135-compat.js':'v1.3.5'});
})();
