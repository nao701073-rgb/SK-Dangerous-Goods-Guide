(()=>{
  'use strict';
  const KEY='skdg.v11.userPreferences';
  const defaults={homePrimary:'dangerous',followActions:true,autoScroll:false,lightweightMode:true};
  const base=window.SKDGUserPreferences||null;
  function extraRead(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){return {...defaults}}}
  function extraSave(next){const value={...extraRead(),...next};try{localStorage.setItem(KEY,JSON.stringify(value))}catch(_){}return value}
  function read(){return {...(base?.read?.()||{}),...extraRead()}}
  function save(next={}){
    const baseFields={};
    ['textSize','largeControls','reduceMotion'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(next,k))baseFields[k]=next[k]});
    if(Object.keys(baseFields).length&&base?.save)base.save(baseFields);
    const extra={};
    ['homePrimary','followActions','autoScroll','lightweightMode'].forEach(k=>{
      if(Object.prototype.hasOwnProperty.call(next,k))extra[k]=k==='homePrimary'?next[k]:Boolean(next[k]);
    });
    const saved=Object.keys(extra).length?extraSave(extra):extraRead();
    const value={...(base?.read?.()||{}),...saved};
    apply(value);
    window.dispatchEvent(new CustomEvent('sk:user-preferences-changed',{detail:value}));
    return value;
  }
  function ensurePerformanceStyle(){
    if(document.getElementById('skdg-v134-performance-style'))return;
    const style=document.createElement('style');style.id='skdg-v134-performance-style';
    style.textContent=`
      html[data-skdg-auto-scroll="false"]{scroll-behavior:auto!important}
      html[data-skdg-lightweight="true"] *,html[data-skdg-lightweight="true"] *::before,html[data-skdg-lightweight="true"] *::after{animation-duration:.001ms!important;animation-delay:0s!important;transition-duration:.001ms!important;scroll-behavior:auto!important}
      html[data-skdg-lightweight="true"] .app-header,html[data-skdg-lightweight="true"] .panel,html[data-skdg-lightweight="true"] .intake-card{will-change:auto!important}
    `;
    document.head?.append(style);
  }
  function optimizeMedia(pref){
    if(!pref.lightweightMode)return;
    const run=()=>{
      document.querySelectorAll('img').forEach(img=>{
        if(img.closest('.app-header,.login-brand,.brand-logo'))return;
        if(!img.hasAttribute('loading'))img.loading='lazy';
        if(!img.hasAttribute('decoding'))img.decoding='async';
      });
      document.querySelectorAll('iframe').forEach(frame=>{if(!frame.hasAttribute('loading'))frame.loading='lazy'});
    };
    if('requestIdleCallback'in window)requestIdleCallback(run,{timeout:900});else setTimeout(run,80);
  }
  function apply(pref=read()){
    base?.apply?.();ensurePerformanceStyle();
    const root=document.documentElement;
    root.dataset.skdgFollowActions=Boolean(pref.followActions)?'true':'false';
    root.dataset.skdgAutoScroll=Boolean(pref.autoScroll)?'true':'false';
    root.dataset.skdgLightweight=Boolean(pref.lightweightMode)?'true':'false';
    optimizeMedia(pref);return pref;
  }
  window.SKDGUserPreferencesV11={read,save,apply};
  apply();
})();
