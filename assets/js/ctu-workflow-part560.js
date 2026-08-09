(function(){
'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search), requested=params.get('applicationId');
let unlocked=false;
function esc(v){return String(v??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]))}
function option(){const s=$('ctuCaseApplicationSelect');return s&&requested?[...s.options].find(o=>o.value===requested):null}
function label(){const o=option();return String(o?.textContent||'').trim()||'申請番号管理の案件'}
function detailHref(){return `application-detail.html?applicationId=${encodeURIComponent(requested||'')}&tab=ctu`}
function ensureCaseBar(){
 const panel=$('ctuCommonCasePanel');if(!panel||!requested||$('part560CaseBar'))return false;
 const o=option();if(!o)return false;
 const bar=document.createElement('section');bar.id='part560CaseBar';bar.className='part560-case-bar';bar.innerHTML=`<div class="part560-case-main"><span>申請番号管理から開いています</span><strong id="part560CaseLabel">${esc(label())}</strong><p id="part560CaseHelp">この申請を登録先として使用します。申請番号を選び直す必要はありません。</p></div><div class="part560-case-actions"><a href="${detailHref()}" target="_blank" rel="noopener">申請詳細を確認</a><button type="button" id="part560ToggleTarget">登録先を変更</button></div>`;
 panel.querySelector('.case-section__heading')?.insertAdjacentElement('afterend',bar);
 $('part560ToggleTarget')?.addEventListener('click',toggle);
 return true;
}
function ensureRegistrationHint(){
 const target=$('ctuRegistrationTarget');if(!target||!requested||$('part560RegistrationHint'))return false;
 const p=document.createElement('div');p.id='part560RegistrationHint';p.className='part560-registration-hint';p.innerHTML='<strong>登録先の再入力は不要です</strong><span>申請番号管理から開いた案件へ、そのまま算出結果を登録します。</span>';
 target.insertAdjacentElement('afterend',p);return true;
}
function setRequested(dispatch=true){
 const s=$('ctuCaseApplicationSelect'),o=option();if(!s||!o)return false;
 if(s.value!==requested){s.value=requested;if(dispatch)s.dispatchEvent(new Event('change',{bubbles:true}));}
 const hidden=$('ctuApplicationSelect');if(hidden)hidden.value=requested;
 return true;
}
function applyLock(){
 if(!requested||unlocked||!option())return false;
 setRequested(false);document.body.classList.add('part560-application-fixed');
 const b=$('part560ToggleTarget');if(b)b.textContent='登録先を変更';
 const h=$('part560CaseHelp');if(h)h.textContent='この申請を登録先として使用します。申請番号を選び直す必要はありません。';
 const l=$('part560CaseLabel');if(l)l.textContent=label();
 const hint=$('part560RegistrationHint');if(hint)hint.hidden=false;
 return true;
}
function toggle(){
 const b=$('part560ToggleTarget'),h=$('part560CaseHelp'),hint=$('part560RegistrationHint');
 if(!unlocked){unlocked=true;document.body.classList.remove('part560-application-fixed');if(b)b.textContent='この申請に戻す';if(h)h.textContent='登録先の固定を解除しました。別の申請番号を選択できます。';if(hint)hint.hidden=true;$('ctuCaseApplicationSelect')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
 unlocked=false;setRequested(true);setTimeout(()=>{applyLock();if(b)b.textContent='登録先を変更';},80);
}
function keepFixed(){
 if(!requested||unlocked||!option())return;
 const s=$('ctuCaseApplicationSelect');if(s&&s.value!==requested){setRequested(true);}
 applyLock();
}
function setup(){
 if(!requested)return;
 let tries=0;const timer=setInterval(()=>{
   tries++;ensureCaseBar();ensureRegistrationHint();
   if(option()){applyLock();if($('part560CaseBar')&&$('part560RegistrationHint')){clearInterval(timer);}}
   if(tries>50)clearInterval(timer);
 },120);
 $('ctuRegisterSimple')?.addEventListener('click',()=>setTimeout(keepFixed,260));
 window.addEventListener('iss:applications-changed',()=>setTimeout(keepFixed,150));
 const sel=$('ctuCaseApplicationSelect');if(sel)new MutationObserver(()=>setTimeout(keepFixed,0)).observe(sel,{childList:true,subtree:true});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,220)):setTimeout(setup,220);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part560.js':'part560'});
