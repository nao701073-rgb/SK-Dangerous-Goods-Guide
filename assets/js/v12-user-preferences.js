(()=>{
  'use strict';
  const KEY='skdg.v12.userPreferences';const defaults={autoAiFocus:true};const base=window.SKDGUserPreferencesV11||null;
  function extraRead(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch(_){return {...defaults}}}
  function extraSave(next){const value={...extraRead(),...next};try{localStorage.setItem(KEY,JSON.stringify(value))}catch(_){}return value}
  function read(){return {...(base?.read?.()||{}),...extraRead()}}
  function save(next={}){const baseFields={};['textSize','largeControls','reduceMotion','homePrimary'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(next,k))baseFields[k]=next[k]});if(Object.keys(baseFields).length&&base?.save)base.save(baseFields);const extra={};if(Object.prototype.hasOwnProperty.call(next,'autoAiFocus'))extra.autoAiFocus=Boolean(next.autoAiFocus);const saved=Object.keys(extra).length?extraSave(extra):extraRead();const value={...(base?.read?.()||{}),...saved};window.dispatchEvent(new CustomEvent('sk:user-preferences-changed',{detail:value}));return value}
  function apply(){base?.apply?.();return read()}
  window.SKDGUserPreferencesV12={read,save,apply};
})();
