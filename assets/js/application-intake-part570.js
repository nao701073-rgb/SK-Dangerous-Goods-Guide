(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  let timer=null;

  function rows(){return qa('#intakeCargoBody tr[data-cargo-index]')}
  function isHard(row){return row.classList.contains('part562-hard-issue')}
  function isHumanConfirmed(row){return row.classList.contains('part562-reviewed-warning')}
  function isPending(row){return row.classList.contains('part561-review')&&!isHard(row)&&!isHumanConfirmed(row)}
  function isIssue(row){return isHard(row)||isPending(row)}
  function unNumber(row){return String(row.querySelector('[data-cargo-field="unNumber"]')?.value||'').trim()}
  function reasons(row){return qa('.part562-reasons span',row).map(node=>String(node.textContent||'').trim()).filter(Boolean)}

  function ensureIndex(){
    const toolbar=$('part568ReviewToolbar');
    if(!toolbar||$('part570ReviewIndex'))return;
    const panel=document.createElement('section');
    panel.id='part570ReviewIndex';
    panel.className='part570-review-index';
    panel.innerHTML=`
      <div class="part570-review-index__head">
        <div><span>見落とし防止</span><strong id="part570ReviewIndexTitle">確認対象を集計中</strong><small id="part570ReviewIndexHint">要確認の危険物を番号で一覧化します。</small></div>
        <button type="button" id="part570FinalCheck">登録前の最終確認</button>
      </div>
      <div class="part570-review-index__items" id="part570ReviewIndexItems"></div>
      <p class="part570-review-index__status" id="part570ReviewIndexStatus" aria-live="polite"></p>`;
    toolbar.insertAdjacentElement('afterend',panel);
    $('part570FinalCheck')?.addEventListener('click',finalCheck);
  }

  function focusIssue(row){
    if(!row)return;
    rows().forEach(item=>item.classList.toggle('part570-index-focus',item===row));
    row.scrollIntoView?.({behavior:'smooth',block:'center'});
    const target=row.querySelector('input:not([type="hidden"]),select,textarea,button');
    setTimeout(()=>target?.focus?.({preventScroll:true}),220);
    const brief=$('part569ActiveReasonText');
    if(brief){
      const list=reasons(row),idx=Number(row.dataset.cargoIndex||0)+1,un=unNumber(row);
      brief.textContent=`No.${idx}${un?` UN${un}`:''}｜${list.slice(0,2).join('／')||'確認内容を原本と照合してください。'}${list.length>2?`（ほか${list.length-2}件）`:''}`;
      brief.className=isHard(row)?'is-hard':'is-review';
    }
  }

  function findingCount(id){
    const node=$(id);if(!node||node.hidden)return 0;
    return qa('li',node).filter(li=>{const text=String(li.textContent||'').trim();return text&&!/ありません|問題はありません|確認事項はありません/.test(text)}).length;
  }
  function globalIssues(){return {blockers:findingCount('intakeBlockers'),warnings:findingCount('intakeWarnings')}}

  function render(){
    ensureIndex();
    const panel=$('part570ReviewIndex'),check=$('intakeCheckSection');
    if(!panel||!check)return;
    panel.hidden=check.hidden;
    if(panel.hidden)return;
    const all=rows(),issues=all.filter(isIssue),hard=issues.filter(isHard),review=issues.filter(isPending),items=$('part570ReviewIndexItems'),title=$('part570ReviewIndexTitle'),hint=$('part570ReviewIndexHint');
    if(title)title.textContent=issues.length?`未確認 ${issues.length}件（修正必須 ${hard.length}／確認 ${review.length}）`:'危険物明細の要確認はありません';
    if(hint){const global=globalIssues(),total=global.blockers+global.warnings;hint.textContent=issues.length?'番号を押すと該当行へ移動します。判定状態は変更しません。':total?`危険物明細は完了しています。全体確認事項 ${total}件（修正必須 ${global.blockers}／推奨 ${global.warnings}）も表示されています。`:'登録前に照合者・確認メモを確認してください。'}
    if(items){
      if(!issues.length)items.innerHTML='<span class="part570-review-index__empty">危険物明細：確認済み</span>';
      else items.innerHTML=issues.map(row=>{const idx=Number(row.dataset.cargoIndex||0)+1,un=unNumber(row),list=reasons(row),tone=isHard(row)?'hard':'review';return `<button type="button" class="part570-review-index__item is-${tone}" data-part570-index="${row.dataset.cargoIndex||''}" title="${escapeHtml(list.join('／')||'原本と照合してください')}"><b>No.${idx}</b>${un?`<span>UN${escapeHtml(un)}</span>`:''}<small>${isHard(row)?'修正必須':'要確認'}</small></button>`}).join('');
      qa('[data-part570-index]',items).forEach(button=>button.addEventListener('click',()=>focusIssue(all.find(row=>String(row.dataset.cargoIndex)===String(button.dataset.part570Index)))));
    }
  }

  function finalCheck(){
    const status=$('part570ReviewIndexStatus'),issues=rows().filter(isIssue),reviewer=String($('intakeReviewer')?.value||'').trim(),global=globalIssues();
    if(issues.length){if(status){status.textContent=`最終確認：未確認が ${issues.length}件あります。先頭の要確認へ移動します。`;status.className='part570-review-index__status is-warning'}focusIssue(issues[0]);return}
    if(!reviewer){if(status){status.textContent='最終確認：危険物明細は完了しています。原本照合者を入力してください。';status.className='part570-review-index__status is-warning'}const input=$('intakeReviewer');input?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>input?.focus?.({preventScroll:true}),220);return}
    if(global.blockers){if(status){status.textContent=`最終確認：全体の修正必須事項が ${global.blockers}件あります。確認欄へ移動します。`;status.className='part570-review-index__status is-warning'}$('intakeBlockers')?.scrollIntoView?.({behavior:'smooth',block:'center'});return}
    if(status){status.textContent=global.warnings?`最終確認：未解決の危険物明細なし・照合者入力済みです。確認・追記推奨 ${global.warnings}件は表示されています。登録欄を確認してください。`:'最終確認：未解決の危険物明細なし・原本照合者入力済みです。登録欄を確認してください。';status.className='part570-review-index__status is-ok'}
    $('intakeRegisterSection')?.scrollIntoView?.({behavior:'smooth',block:'start'});
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function schedule(){clearTimeout(timer);timer=setTimeout(render,45)}
  document.addEventListener('input',schedule);
  document.addEventListener('change',schedule);
  const body=$('intakeCargoBody'),check=$('intakeCheckSection');
  if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  if(check)new MutationObserver(schedule).observe(check,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(render,60)):setTimeout(render,60);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part570.js':'part570'});
})();
