(function(){
'use strict';
const $=id=>document.getElementById(id);
const appId=new URLSearchParams(location.search).get('applicationId');
function ensure(){
 const host=$('detailTabCtu'),section=host?.querySelector('.detail-section');if(!section||!appId||$('part560DetailLinkage'))return false;
 const note=document.createElement('div');note.id='part560DetailLinkage';note.className='part560-detail-linkage';note.innerHTML='<strong>この申請を登録先として自動設定します</strong><span>ここから「再計算」または「新しい算出」を開くと、申請番号を選び直さず、そのままこの案件へ登録できます。</span>';
 (section.querySelector('.detail-section-heading')||section.firstElementChild)?.insertAdjacentElement('afterend',note);return true;
}
function setup(){if(!appId)return;let n=0;const t=setInterval(()=>{n++;if(ensure()||n>40)clearInterval(t)},120)}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',setup):setup();
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-detail-part560.js':'part560'});
