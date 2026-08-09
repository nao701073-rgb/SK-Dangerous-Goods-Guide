(function(){
  'use strict';
  if(document.body?.dataset?.page!=='application-intake-workflow')return;
  const $=id=>document.getElementById(id);
  const qa=(sel,root=document)=>Array.from(root.querySelectorAll(sel));
  let timer=null;

  function rowReasons(row){return qa('.part562-reasons span',row).map(node=>String(node.textContent||'').trim()).filter(Boolean)}
  function unNumber(row){return String(row?.querySelector('[data-cargo-field="unNumber"]')?.value||'').trim()}
  function issueRow(row){return row?.classList.contains('part562-hard-issue')||(row?.classList.contains('part561-review')&&!row?.classList.contains('part562-reviewed-warning'))}

  function ensureBrief(){
    const progress=$('part568ReviewProgress')?.closest('.part568-review-progress');
    if(!progress||$('part569ActiveReason'))return;
    const brief=document.createElement('div');
    brief.id='part569ActiveReason';brief.className='part569-active-reason';
    brief.innerHTML='<span>現在の確認理由</span><strong id="part569ActiveReasonText">要確認行を選択すると理由を表示します。</strong>';
    progress.appendChild(brief);
  }

  function compactReasonBox(row){
    const box=row.querySelector('.part562-reasons');if(!box)return;
    const reasons=rowReasons(row),signature=reasons.join('\u241f');
    if(box.dataset.part569Signature===signature&&(reasons.length<=2||box.querySelector('.part569-reason-toggle')))return;
    box.dataset.part569Signature=signature;
    box.querySelector('.part569-reason-toggle')?.remove();
    box.classList.toggle('part569-reasons-compact',reasons.length>2);
    box.classList.remove('is-expanded');
    box.title=reasons.join('／');
    if(reasons.length<=2)return;
    const button=document.createElement('button');button.type='button';button.className='part569-reason-toggle';button.textContent=`ほか ${reasons.length-2}件`;
    button.setAttribute('aria-expanded','false');
    button.addEventListener('click',event=>{
      event.stopPropagation();
      const expanded=box.classList.toggle('is-expanded');
      button.setAttribute('aria-expanded',String(expanded));
      button.textContent=expanded?'理由をたたむ':`ほか ${reasons.length-2}件`;
    });
    box.appendChild(button);
  }

  function updateBrief(){
    ensureBrief();
    const out=$('part569ActiveReasonText');if(!out)return;
    const rows=qa('#intakeCargoBody tr[data-cargo-index]');
    const current=rows.find(row=>row.classList.contains('part568-current-issue'))||rows.find(issueRow);
    if(!current){out.textContent='危険物明細の要確認はありません。';out.className='is-ok';return}
    const reasons=rowReasons(current),un=unNumber(current),index=Number(current.dataset.cargoIndex||0)+1;
    const head=`No.${index}${un?` UN${un}`:''}`;
    const text=reasons.length?reasons.slice(0,2).join('／')+(reasons.length>2?`（ほか${reasons.length-2}件）`:''):'確認内容を原本と照合してください。';
    out.textContent=`${head}｜${text}`;
    out.className=current.classList.contains('part562-hard-issue')?'is-hard':'is-review';
  }

  function refresh(){
    qa('#intakeCargoBody tr[data-cargo-index]').forEach(compactReasonBox);
    updateBrief();
  }
  function schedule(){clearTimeout(timer);timer=setTimeout(refresh,40)}

  const body=$('intakeCargoBody');
  if(body)new MutationObserver(schedule).observe(body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
  document.addEventListener('click',event=>{if(event.target.closest('#part568PrevIssue,#part568NextIssue,#part568IssueOnlyToggle'))setTimeout(refresh,80)});
  document.addEventListener('input',schedule);
  document.addEventListener('change',schedule);
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(refresh,0)):setTimeout(refresh,0);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/application-intake-part569.js':'part569'});
})();
