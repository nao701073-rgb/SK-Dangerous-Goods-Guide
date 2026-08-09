(function(){
'use strict';
const $=id=>document.getElementById(id);
function value(id){return String($(id)?.value??'').trim()}
function positive(id){return Number($(id)?.value)>0}
function integerPositive(id){const n=Number($(id)?.value);return Number.isInteger(n)&&n>0}
function angleOk(){const n=Number($('quickAngle')?.value);return Number.isFinite(n)&&n>=0&&n<=90}
function checks(){
 const category=value('quickMaterialCategory'),method=value('quickMethod'),direct=method==='direct'&&category!=='support';
 const list=[
  {id:'quickMass',label:'貨物質量',ok:positive('quickMass')},
  {id:'quickMaterial',label:'材質',ok:Boolean(value('quickMaterial'))},
  {id:'quickCount',label:'本数・個数',ok:integerPositive('quickCount')},
  {id:'quickStrength',label:category==='support'?'確認済み支保力':'確認済みMSL／STF',ok:positive('quickStrength')}
 ];
 if(direct){
  list.push({id:'quickCargoMsl',label:'貨物側取付部MSL',ok:positive('quickCargoMsl')});
  list.push({id:'quickCtuMsl',label:'CTU側固縛点MSL',ok:positive('quickCtuMsl')});
  list.push({id:'quickAngle',label:'鉛直角',ok:angleOk()});
 }
 if(category==='combined'){
  list.push({id:'quickSupportCount',label:'支保材の個数',ok:integerPositive('quickSupportCount')});
  list.push({id:'quickSupportStrength',label:'確認済み支保力',ok:positive('quickSupportStrength')});
 }
 return list;
}
function calculated(){
 const overall=$('overall'),metrics=$('metrics');
 const text=String(overall?.textContent||'').replace(/\s+/g,' ').trim();
 return Boolean(overall)&&Boolean(metrics?.children?.length)&&!/^入力後/.test(text)&&text!=='';
}
function registerReady(){return Boolean($('ctuRegisterSimple'))&&!$('ctuRegisterSimple').disabled}
function finalChecked(){return Boolean(document.querySelector('[data-ctu-review="final"]')?.checked)}
function reviewerReady(){return Boolean(value('ctuReviewer'))}
function pointReviewReady(){const badge=String($('mslPointReviewBadge')?.textContent||'').trim();return !badge||/確認済み|対象なし|登録なし/.test(badge)}
function target(){
 const sel=$('ctuCaseApplicationSelect');
 if(sel?.value)return {kind:'existing',id:sel.value,label:sel.options?.[sel.selectedIndex]?.textContent?.trim()||'登録済み申請'};
 const year=value('ctuNewApplicationYear'),number=value('ctuNewApplicationNumber');
 if(year&&/^\d{4,5}$/.test(number))return {kind:'new',label:`${year}-${number}`};
 return {kind:'missing',label:'未指定'};
}
function registered(){return registerReady()&&finalChecked()&&/登録しました|保存しました/.test(String($('ctuRegistrationMessage')?.textContent||''))}
function state(){
 const all=checks(),missing=all.filter(x=>!x.ok),calc=calculated(),ready=registerReady(),t=target(),done=registered();
 let stage='input',title='基本条件を入力してください',detail='',action='不足項目へ';
 if(missing.length){detail=`残り ${missing.length}項目です。最初の不足項目「${missing[0].label}」を確認してください。`;}
 else if(!calc){stage='calc';title='基本条件は入力済みです';detail='「この条件で算出する」で方向別の必要抵抗力・余裕／不足を確認します。';action='算出する';}
 else if(!ready){stage='review';title='算出結果を確認してください';
   if(!pointReviewReady()){detail='取付点MSLの確認が残っています。写真・刻印・資料と入力値を照合してください。';action='取付点MSLを確認';}
   else if(!reviewerReady()){detail='確認者を入力して、算出条件と結果の最終確認を行ってください。';action='確認者を入力';}
   else if(!finalChecked()){detail='入力値・強度根拠・算出結果を確認し、登録前確認を完了してください。';action='登録前確認へ';}
   else {detail='登録前確認に未完了の項目があります。確認状況を確認してください。';action='確認状況へ';}
 }
 else if(done){stage='done';title='申請番号管理への登録が完了しました';detail='登録した固縛力算出結果は、申請詳細の「固縛力算出」タブから再確認できます。';action='登録した申請を詳細確認';}
 else {stage='register';title=t.kind==='missing'?'登録先の申請番号を確認してください':`${t.label}へ登録できます`;detail=t.kind==='missing'?'登録済み案件を選択するか、新しい申請番号を入力してください。':'確認済みの算出結果を申請番号管理へ保存します。';action=t.kind==='missing'?'登録先を入力':'申請番号管理へ登録';}
 return {all,missing,calc,ready,target:t,stage,title,detail,action};
}
function ensure(){
 const panel=$('quickEntryPanel');if(!panel||$('part559Guide'))return false;
 const guide=document.createElement('section');guide.id='part559Guide';guide.className='part559-guide';guide.setAttribute('aria-live','polite');
 guide.innerHTML='<div class="part559-guide-head"><div><span>かんたん操作ガイド</span><strong id="part559GuideTitle">確認中</strong><p id="part559GuideDetail"></p></div><span id="part559GuideBadge" class="part559-guide-badge">1 / 4</span></div><div class="part559-steps"><span data-part559-stage="input">1 条件入力</span><span data-part559-stage="calc">2 算出</span><span data-part559-stage="review">3 確認</span><span data-part559-stage="register">4 登録</span></div><div class="part559-guide-status"><span id="part559InputStatus"></span><span id="part559CalcStatus"></span><span id="part559ReviewStatus"></span><span id="part559TargetStatus"></span></div><div class="part559-guide-actions"><button type="button" id="part559Primary" class="part559-primary">次へ</button><button type="button" id="part559Advanced" class="part559-secondary">詳細設定を表示</button></div>';
 (panel.querySelector('.hint')||panel.querySelector('h2'))?.insertAdjacentElement('afterend',guide);
 $('part559Primary')?.addEventListener('click',primary);
 $('part559Advanced')?.addEventListener('click',()=>{$('toggleAdvanced')?.click();setTimeout(()=>{const open=$('toggleAdvanced')?.getAttribute('aria-expanded')==='true';$('part559Advanced').textContent=open?'詳細設定を閉じる':'詳細設定を表示';},50)});
 document.body.classList.add('part559-guide-ready');return true;
}
function focus(id){const el=$(id);if(!el)return;el.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>el.focus(),180)}
function primary(){
 const s=state();
 if(s.stage==='input'){focus(s.missing[0]?.id);return}
 if(s.stage==='calc'){$('quickCalcBtn')?.click();return}
 if(s.stage==='review'){
  if(!pointReviewReady()){($('mslPointReviewPanel')||$('mslPointReviewBadge'))?.scrollIntoView({behavior:'smooth',block:'start'});return}
  if(!reviewerReady()){focus('ctuReviewer');return}
  const final=document.querySelector('[data-ctu-review="final"]');if(!final?.checked){final?.scrollIntoView({behavior:'smooth',block:'center'});setTimeout(()=>final?.focus(),180);return}
  $('ctuReviewSection')?.scrollIntoView({behavior:'smooth',block:'start'});return;
 }
 if(s.stage==='register'){
  if(s.target.kind==='missing'){const d=$('ctuNewApplicationDetails');if(d)d.open=true;$('ctuRegistrationSection')?.scrollIntoView({behavior:'smooth',block:'start'});setTimeout(()=>focus('ctuNewApplicationNumber'),220);return}
  $('ctuRegisterSimple')?.click();return;
 }
 if(s.stage==='done'){const a=$('ctuOpenRegisteredDetail');if(a&&!a.hidden){a.click();return}$('ctuRegistrationSection')?.scrollIntoView({behavior:'smooth',block:'start'});}
}
function refresh(){
 if(!ensure())return;const s=state(),order=['input','calc','review','register'],idx=s.stage==='done'?4:Math.max(0,order.indexOf(s.stage));
 $('part559GuideTitle').textContent=s.title;$('part559GuideDetail').textContent=s.detail;$('part559Primary').textContent=s.action;
 $('part559GuideBadge').textContent=s.stage==='done'?'完了':`${Math.min(idx+1,4)} / 4`;
 document.querySelectorAll('#part559Guide [data-part559-stage]').forEach((el,i)=>{el.classList.toggle('is-done',i<idx||s.stage==='done');el.classList.toggle('is-current',i===idx&&s.stage!=='done')});
 const count=s.all.length-s.missing.length;$('part559InputStatus').textContent=`入力 ${count}/${s.all.length}`;$('part559InputStatus').className=s.missing.length?'is-review':'is-ok';
 $('part559CalcStatus').textContent=s.calc?'算出済み':'未算出';$('part559CalcStatus').className=s.calc?'is-ok':'is-wait';
 $('part559ReviewStatus').textContent=s.ready?'確認済み':'確認前';$('part559ReviewStatus').className=s.ready?'is-ok':'is-wait';
 $('part559TargetStatus').textContent=`登録先：${s.target.label}`;$('part559TargetStatus').className=s.target.kind==='missing'?'is-review':'is-ok';
 $('part559Guide').className=`part559-guide is-${s.stage}`;
}
function setup(){if(!ensure())return;const host=document.querySelector('.calc-shell');host?.addEventListener('input',()=>setTimeout(refresh,0));host?.addEventListener('change',()=>setTimeout(refresh,0));['quickCalcBtn','ctuRegisterSimple','part552CalcProceed'].forEach(id=>$(id)?.addEventListener('click',()=>setTimeout(refresh,260)));['overall','ctuReviewStatus','ctuRegistrationMessage','mslPointReviewBadge'].forEach(id=>{const el=$(id);if(el)new MutationObserver(refresh).observe(el,{childList:true,subtree:true,characterData:true,attributes:true})});const b=$('ctuRegisterSimple');if(b)new MutationObserver(refresh).observe(b,{attributes:true,attributeFilter:['disabled']});let n=0;const timer=setInterval(()=>{refresh();if(++n>25)clearInterval(timer)},140);refresh();}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,220)):setTimeout(setup,220);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part559.js':'part559'});
