(function(){
'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),resultKey=params.get('resultKey');
const IDS=['quickTransport','quickCtu','quickMass','quickFriction','quickMu','quickMethod','quickMaterial','quickDirection','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickSupportMaterial','quickSupportCount','quickSupportStrength'];
let loaded=null;
function read(id){const e=$(id);if(!e)return null;return e.type==='checkbox'?Boolean(e.checked):String(e.value??'')}
function snapshot(){return Object.fromEntries(IDS.map(id=>[id,read(id)]))}
function same(a,b){return String(a??'')===String(b??'')}
function changeCount(){if(!loaded)return 0;return IDS.reduce((n,id)=>n+(same(loaded[id],read(id))?0:1),0)}
function setValue(id,value){const e=$(id);if(!e)return;if(e.type==='checkbox')e.checked=Boolean(value);else e.value=value??'';e.dispatchEvent(new Event('change',{bubbles:true}));e.dispatchEvent(new Event('input',{bubbles:true}));}
function restoreLoaded(){
 if(!loaded)return;
 const first=['quickTransport','quickCtu','quickMass','quickFriction','quickMethod'];
 const later=['quickMu','quickMaterial','quickDirection','quickCount','quickStrength','quickCargoMsl','quickCtuMsl','quickAngle','quickSupportMaterial','quickSupportCount','quickSupportStrength'];
 first.forEach(id=>setValue(id,loaded[id]));
 setTimeout(()=>{later.forEach(id=>setValue(id,loaded[id]));refresh();const status=$('part556RestoreStatus');if(status)status.textContent='読み込んだ前回条件へ戻しました。登録前確認は再度行ってください。';},60);
}
function ensure(){
 if(!resultKey||$('part556RestoreTools'))return;
 const changes=$('part555Changes');if(!changes)return;
 const tools=document.createElement('div');tools.id='part556RestoreTools';tools.className='part556-restore-tools';tools.innerHTML='<button type="button" id="part556RestoreLoaded">読み込んだ前回条件に戻す</button><span id="part556RestoreStatus">編集途中でも前回条件へ戻せます。</span>';
 changes.appendChild(tools);$('part556RestoreLoaded')?.addEventListener('click',restoreLoaded);
}
function refresh(){const b=$('part556RestoreLoaded');if(!b||!loaded)return;const n=changeCount();b.disabled=n===0;b.textContent=n?`前回条件に戻す（変更 ${n}項目）`:'前回条件と同じ';}
function setup(){if(!resultKey)return;let tries=0;const t=setInterval(()=>{tries++;ensure();if(window.SKCTURestoreContext&&$('part555Changes')){loaded=snapshot();ensure();refresh();clearInterval(t);}else if(tries>40){loaded=snapshot();ensure();refresh();clearInterval(t);}},120);document.querySelector('.calc-shell')?.addEventListener('input',()=>setTimeout(refresh,0));document.querySelector('.calc-shell')?.addEventListener('change',()=>setTimeout(refresh,0));}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,150)):setTimeout(setup,150);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part556.js':'part556'});
