(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const norm=value=>String(value||'').replace(/\s+/g,' ').trim();

  function rescueControls(container){
    if(!container)return;
    const quick=$('quickEntryPanel');
    const body=quick?.querySelector('.quick-step:last-of-type .quick-step__body')||quick?.querySelector('.quick-step__body');
    let actions=quick?.querySelector('.quick-actions');
    if(body&&!actions){actions=document.createElement('div');actions.className='quick-actions';body.prepend(actions)}
    if(actions){
      ['quickCalcBtn','toggleAdvanced'].forEach(id=>{const el=$(id);if(el&&container.contains(el))actions.appendChild(el)});
    }
    const registration=$('ctuRegistrationSection');
    const registerBtn=$('ctuRegisterSimple');
    if(registration&&registerBtn&&container.contains(registerBtn))registration.appendChild(registerBtn);
  }

  function looksLikeLegacyGuide(node){
    if(!node||node.id==='ctuStickyStatus'||node.id==='ctuUnifiedResult')return false;
    const t=norm(node.textContent);
    if(!t)return false;
    const fourStep=t.includes('条件入力')&&t.includes('算出')&&t.includes('確認')&&t.includes('登録');
    const registrationGuide=t.includes('登録先の申請番号を確認してください')&&t.includes('登録先を入力');
    const easyGuide=t.includes('かんたん操作ガイド')&&fourStep;
    return registrationGuide||easyGuide;
  }

  function removeLegacyGuides(){
    $('part551QuickProgress')?.remove();
    document.querySelectorAll('[data-p551-progress]').forEach(el=>el.closest('#part551QuickProgress')?.remove());
    const protectedSelector='#quickEntryPanel,#photoInputPanel,#photoRecognitionPanel,#v1PhotoStep,#ctuStickyStatus,#ctuUnifiedResult,#ctuRegistrationSection';
    const candidates=[...document.querySelectorAll('section,aside,div')].filter(looksLikeLegacyGuide);
    const targets=[];
    candidates.forEach(node=>{
      if(node.matches(protectedSelector))return;
      if(node.querySelector('#quickEntryPanel,#photoInputPanel,#photoRecognitionPanel,#v1PhotoStep,#ctuStickyStatus,#ctuUnifiedResult'))return;
      let best=node;
      while(best.parentElement&&best.parentElement!==document.body&&looksLikeLegacyGuide(best.parentElement)){
        const parent=best.parentElement;
        if(parent.matches(protectedSelector)||parent.querySelector('#quickEntryPanel,#photoInputPanel,#photoRecognitionPanel,#v1PhotoStep,#ctuStickyStatus,#ctuUnifiedResult'))break;
        best=parent;
      }
      targets.push(best);
    });
    [...new Set(targets)].forEach(node=>{rescueControls(node);node.remove()});
  }

  function hideObsoleteQuickHeading(){
    const heading=$('quickEntryPanel')?.querySelector(':scope > h2');
    if(!heading)return;
    const t=norm(heading.textContent);
    if(t.includes('不足項目を確認して参考算出')||/^③/.test(t)){
      heading.dataset.v1349HiddenHeading='1';
      heading.setAttribute('aria-hidden','true');
    }
  }

  function integrateResult(){
    const quickStatus=$('quickStatus');
    const step=quickStatus?.closest('.quick-step');
    const body=step?.querySelector('.quick-step__body');
    const overall=$('overall');
    const metrics=$('metrics');
    if(!body||!overall||!metrics)return;

    const head=step.querySelector('.quick-step__head');
    if(head)head.innerHTML='<span class="quick-step__num">6</span>参考算出を確認';

    let host=$('ctuUnifiedResult');
    if(!host){
      host=document.createElement('div');
      host.id='ctuUnifiedResult';
      host.setAttribute('aria-label','参考算出結果');
      quickStatus.insertAdjacentElement('afterend',host);
    }
    const oldPanel=overall.closest('section.panel');
    const note=oldPanel?.querySelector('.simple-result-note');
    const details=oldPanel?.querySelector('.result-details');
    [overall,metrics,note,details].filter(Boolean).forEach(node=>host.appendChild(node));
    if(oldPanel&&oldPanel!==step&&oldPanel.parentNode){
      const meaningful=[...oldPanel.children].filter(el=>el.tagName!=='H2'&&norm(el.textContent));
      if(!meaningful.length)oldPanel.remove();
      else{
        const title=oldPanel.querySelector(':scope > h2');
        if(title&&/算出結果/.test(norm(title.textContent)))title.remove();
        if(!norm(oldPanel.textContent))oldPanel.remove();
      }
    }
  }

  function setupFollower(){
    // v1.3.52: native CSS sticky is the single follow mechanism.
    // Remove obsolete fixed-position helper artifacts if an older cache created them.
    const status=$('ctuStickyStatus');
    if(status)status.classList.remove('ctu-is-following');
    $('ctuStickyAnchor')?.remove();
    $('ctuStickySpacer')?.remove();
  }

  function init(){
    hideObsoleteQuickHeading();
    integrateResult();
    removeLegacyGuides();
    setupFollower();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('load',()=>{integrateResult();removeLegacyGuides();},{once:true});
  [80,220,520,900].forEach(delay=>setTimeout(()=>{integrateResult();removeLegacyGuides();hideObsoleteQuickHeading()},delay));
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1349-ctu-ui-unification.js':'v1.3.52-native-sticky'});
})();
