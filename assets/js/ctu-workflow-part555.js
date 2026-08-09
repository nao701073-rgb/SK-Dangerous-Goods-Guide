(function(){
'use strict';
const $=id=>document.getElementById(id);
const params=new URLSearchParams(location.search),applicationId=params.get('applicationId'),resultKey=params.get('resultKey');
const TRACK=[
 ['quickTransport','輸送条件'],['quickCtu','CTU種類'],['quickMass','貨物質量'],['quickFriction','摩擦条件'],['quickMu','摩擦係数'],['quickMethod','固縛方法'],['quickMaterial','材質'],['quickDirection','対象方向'],['quickCount','本数・個数'],['quickStrength','確認済みMSL'],['quickCargoMsl','貨物側MSL'],['quickCtuMsl','CTU側MSL'],['quickAngle','鉛直角'],['quickSupportMaterial','支保材'],['quickSupportCount','支保本数'],['quickSupportStrength','支保強度']
];
let base=null;
function val(id){const e=$(id);return e?.type==='checkbox'?Boolean(e.checked):String(e?.value??'').trim()}
function snapshot(){return Object.fromEntries(TRACK.map(([id])=>[id,val(id)]))}
function changed(){if(!base)return [];return TRACK.filter(([id])=>String(base[id]??'')!==String(val(id)??''));}
function setupContext(){const panel=$('quickEntryPanel');if(!panel||$('part555Context')||(!applicationId&&!resultKey))return;const box=document.createElement('section');box.id='part555Context';box.className='part555-context';box.setAttribute('aria-live','polite');box.innerHTML=resultKey?'<div><span>再計算モード</span><strong>登録済みの固縛条件を読み込んでいます</strong><p>変更した箇所だけ確認して再算出できます。再登録した結果は過去結果を消さず、新しい履歴として保存します。</p></div><span class="part555-context-badge">履歴を保持</span>':'<div><span>登録済み案件を使用</span><strong>申請番号管理の案件情報を利用します</strong><p>案件情報を再入力せず、固縛条件の確認から進めます。</p></div><span class="part555-context-badge">自動入力</span>';
 panel.insertAdjacentElement('afterbegin',box);
}
function setupChanges(){if(!resultKey||$('part555Changes'))return;const parent=$('part553RestoreState')?.parentElement||$('part553Completion')||$('quickEntryPanel');if(!parent)return;const box=document.createElement('div');box.id='part555Changes';box.className='part555-changes';box.hidden=true;box.innerHTML='<div class="part555-changes-head"><strong>前回から変更した項目</strong><span id="part555ChangeCount">0項目</span></div><div id="part555ChangeItems" class="part555-change-items"></div>';parent.appendChild(box);
}
function refreshChanges(){const box=$('part555Changes');if(!box||!base)return;const c=changed();box.hidden=false;$('part555ChangeCount').textContent=`${c.length}項目`;$('part555ChangeItems').innerHTML=c.length?c.map(([,label])=>`<span>${label}</span>`).join(''):'<span class="is-same">前回条件から変更はありません</span>';box.classList.toggle('is-changed',c.length>0);}
function setupRegistrationNote(){const summary=$('part554SaveSummary');if(!summary||$('part555HistoryNote'))return;const p=document.createElement('p');p.id='part555HistoryNote';p.className='part555-history-note';p.innerHTML=resultKey?'<strong>再登録時：</strong>前回結果は残し、今回の算出結果を最新版として追加保存します。':'<strong>登録時：</strong>算出条件と結果を申請番号管理の「固縛力算出」タブから後で確認できます。';summary.appendChild(p);}
function setup(){setupContext();let tries=0;const t=setInterval(()=>{tries++;setupChanges();setupRegistrationNote();if(resultKey&&window.SKCTURestoreContext){base=snapshot();refreshChanges();clearInterval(t);}else if(!resultKey&&$('part554SaveSummary')){clearInterval(t);}else if(tries>35){if(resultKey){base=snapshot();refreshChanges();}clearInterval(t);}},120);const shell=document.querySelector('.calc-shell');shell?.addEventListener('input',()=>setTimeout(refreshChanges,0));shell?.addEventListener('change',()=>setTimeout(refreshChanges,0));}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(setup,100)):setTimeout(setup,100);
})();
window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-workflow-part555.js':'part555'});
