(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.SKCTU_CODE_RULES_V1380=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const G=9.81;
  const TRANSPORT_PRESETS={
    road:{label:'道路輸送',route:'道路輸送',v:{forward:[.8,1],rear:[.5,1],left:[.5,1],right:[.5,1]}},
    rail:{label:'鉄道輸送（通常）',route:'鉄道輸送（通常加速度）',v:{forward:[.5,1],rear:[.5,1],left:[.5,1],right:[.5,1]}},
    railShock:{label:'鉄道輸送（150ms以下の短時間衝撃）',route:'鉄道輸送（短時間衝撃）',v:{forward:[1,.7],rear:[1,.7],left:[.5,.7],right:[.5,.7]}},
    seaA:{label:'海上輸送 海域A（Hs≦8m）',route:'海上輸送 海域A',v:{forward:[.3,.5],rear:[.3,.5],left:[.5,1],right:[.5,1]}},
    seaB:{label:'海上輸送 海域B（8m＜Hs≦12m）',route:'海上輸送 海域B',v:{forward:[.3,.3],rear:[.3,.3],left:[.7,1],right:[.7,1]}},
    seaC:{label:'海上輸送 海域C（Hs＞12m）',route:'海上輸送 海域C',v:{forward:[.4,.2],rear:[.4,.2],left:[.8,1],right:[.8,1]}}
  };
  function positive(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:0}
  function directionalForce(massTonnes,c){return positive(massTonnes)*G*Math.max(0,Number(c)||0)}
  function effectiveFrictionMu(mu,hasDirect){const x=Math.max(0,Number(mu)||0);return hasDirect?x*.75:x}
  function frictionForce(massTonnes,mu,cz,hasDirect){return effectiveFrictionMu(mu,hasDirect)*Math.max(0,Number(cz)||0)*positive(massTonnes)*G}
  function wallResistance(payloadTonnes,resistanceCoefficient,capKn){let value=positive(payloadTonnes)*G*Math.max(0,Number(resistanceCoefficient)||0);const cap=positive(capKn);if(cap>0)value=Math.min(value,cap);return value}
  function weakestMsl(device,cargo,ctu){
    const values={device:positive(device),cargo:positive(cargo),ctu:positive(ctu)};
    const complete=values.device>0&&values.cargo>0&&values.ctu>0;
    if(!complete)return{complete:false,value:0,limiting:'未確定',values};
    const value=Math.min(values.device,values.cargo,values.ctu);
    let limiting='固縛材';
    if(Math.abs(values.ctu-value)<1e-9)limiting='CTU側固縛点';
    else if(Math.abs(values.cargo-value)<1e-9)limiting='貨物側取付部';
    return{complete:true,value,limiting,values};
  }
  function seaAudit(massTonnes,mu=.2){
    const out={};
    for(const key of ['seaA','seaB','seaC']){
      const p=TRANSPORT_PRESETS[key];
      out[key]={};
      for(const [dir,[c,cz]] of Object.entries(p.v))out[key][dir]={c,cz,forceKn:directionalForce(massTonnes,c),frictionKn:frictionForce(massTonnes,mu,cz,false)};
    }
    return out;
  }
  return{version:'1.3.80',G,TRANSPORT_PRESETS,directionalForce,effectiveFrictionMu,frictionForce,wallResistance,weakestMsl,seaAudit};
});
