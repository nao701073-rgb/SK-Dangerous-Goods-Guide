(()=>{
  'use strict';
  const KEY='skdg.v101.userPreferences';
  const defaults={textSize:'standard',largeControls:false,reduceMotion:false};
  function read(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){return {...defaults}}}
  function apply(pref=read()){
    const root=document.documentElement;
    root.classList.toggle('sk-user-large-text',pref.textSize==='large');
    root.classList.toggle('sk-user-large-controls',Boolean(pref.largeControls));
    root.classList.toggle('sk-user-reduce-motion',Boolean(pref.reduceMotion));
    return pref;
  }
  function save(next){const value={...read(),...next};try{localStorage.setItem(KEY,JSON.stringify(value))}catch(_){}apply(value);window.dispatchEvent(new CustomEvent('sk:user-preferences-changed',{detail:value}));return value}
  window.SKDGUserPreferences={read,save,apply};
  apply();
})();
