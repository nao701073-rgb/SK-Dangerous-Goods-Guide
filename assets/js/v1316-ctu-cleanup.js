(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const norm=v=>String(v||'').replace(/\s+/g,' ').trim();

  function removeKnownRedundantPanels(){
    [
      'ctuReviewSection',
      'part580CtuWorkbench',
      'part590CtuEvidenceGate'
    ].forEach(id=>$(id)?.remove());
    document.querySelectorAll('.ctu-review-panel,.part551-single-check').forEach(node=>node.remove());
  }

  function isEasyGuide(node){
    const t=norm(node.textContent);
    return t.includes('かんたん操作ガイド') && t.includes('条件入力') && t.includes('算出') && t.includes('確認') && t.includes('登録');
  }
  function removeEasyGuide(){
    // v1.3.48: 旧4段階「かんたん操作ガイド」を最小単位で除去する。
    // 旧ガイドが既存の「算出」「詳細設定」ボタンを移動している場合は、先に本来の位置へ戻す。
    const structuralProtected='#quickEntryPanel,#photoInputPanel,#photoRecognitionPanel,#v1PhotoStep,#ctuStickyStatus';
    const labels=[...document.querySelectorAll('section,aside,div,p,span,strong,small')].filter(node=>norm(node.textContent).includes('かんたん操作ガイド'));
    const targets=new Set();
    labels.forEach(label=>{
      let node=label;
      let best=null;
      while(node&&node!==document.body){
        const t=norm(node.textContent);
        if(t.includes('かんたん操作ガイド')&&t.includes('条件入力')&&t.includes('算出')&&t.includes('確認')&&t.includes('登録')){
          if(!node.matches(structuralProtected)&&!node.querySelector(structuralProtected))best=node;
          else break;
        }
        node=node.parentElement;
      }
      if(best)targets.add(best);
    });
    [...document.querySelectorAll('section,aside,div')].filter(isEasyGuide).forEach(node=>{
      if(!node.matches(structuralProtected)&&!node.querySelector(structuralProtected))targets.add(node);
    });
    const quickActions=$('quickEntryPanel')?.querySelector('.quick-actions');
    [...targets].forEach(node=>{
      // 旧ガイドへ移されていた実ボタンを失わないよう、静的な入力欄へ戻す。
      if(quickActions){
        ['quickCalcBtn','toggleAdvanced'].forEach(id=>{const control=$(id);if(control&&node.contains(control))quickActions.appendChild(control)});
      }
      node.remove();
    });
  }

  function removeNextCalcButtons(){
    document.querySelectorAll('button,a,[role="button"]').forEach(node=>{
      const t=norm(node.textContent).replace(/\s/g,'');
      if(/^次へ[:：]算出$/.test(t))node.remove();
    });
  }

  function removeReviewPrompt(){
    const phrase='入力値・強度根拠・算出結果を確認しました';
    document.querySelectorAll('label,div,p,span,strong').forEach(node=>{
      if(!norm(node.textContent).includes(phrase))return;
      const target=node.closest('.ctu-review-checks,label,.check-row')||node;
      target.remove();
    });
    const msg=$('ctuRegistrationMessage');
    if(msg && norm(msg.textContent).includes(phrase))msg.textContent='';
  }

  function keepRegistrationOpen(){
    // v1.3.52: old confirmation gate stays retired, but registration availability is controlled
    // by the system-linked CTU progress state after an actual calculation.
    const current=window.SKCTUReview;
    if(!current || current.isComplete?.()!==true){
      window.SKCTUReview={
        isComplete:()=>true,
        getData:()=>({status:'not-required',confirmedItems:[],reviewer:'',note:'',confirmedAt:null,registrationConfirmationRequired:false,inputSources:{excel:false,photo:false,manual:true}}),
        invalidate:()=>{}
      };
    }
  }

  function cleanup(){
    removeKnownRedundantPanels();
    removeEasyGuide();
    removeNextCalcButtons();
    removeReviewPrompt();
    keepRegistrationOpen();
  }
  function lightweightCleanup(){
    removeKnownRedundantPanels();
    removeEasyGuide();
    removeNextCalcButtons();
    document.querySelectorAll('#ctuNextCalculation,[data-legacy-ctu-nav]').forEach(node=>node.remove());
    const msg=$('ctuRegistrationMessage');
    if(msg && norm(msg.textContent).includes('入力値・強度根拠・算出結果を確認しました'))msg.textContent='';
    keepRegistrationOpen();
  }

  // 全DOMを走査する完全クリーンアップは初期化時の1回だけ。
  // 後続スクリプトの追補にはID中心の軽量版を使い、同じ走査を重ねない。
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});else cleanup();
  window.addEventListener('load',lightweightCleanup,{once:true});
  // defer読み込みの旧補助UIが後から生成される場合に備え、初期表示中だけ有限回再確認する。
  // 常時監視・setIntervalは使用しない。
  [180,450,900].forEach(delay=>setTimeout(lightweightCleanup,delay));

  // 旧ワークフロー補助が入力操作後に重複ナビを再生成する場合だけ、
  // ユーザー操作1回につき最大1回の軽量クリーンアップを行う。常時DOM監視はしない。
  let cleanupTimer=0;
  const legacyUiExists=()=>Boolean(document.querySelector('#ctuNextCalculation,.ctu-review-panel,.part551-single-check,[data-legacy-ctu-nav]'));
  const scheduleCleanup=()=>{if(!legacyUiExists())return;clearTimeout(cleanupTimer);cleanupTimer=setTimeout(lightweightCleanup,80)};
  ['change','click'].forEach(type=>document.addEventListener(type,event=>{
    if(event.target?.closest?.('[data-ctu-workflow],.ctu-workflow,.part551-single-check'))scheduleCleanup();
  },true));

  // v1.3.52: registration buttons are no longer force-enabled by legacy cleanup.
  // v1348-ctu-sticky-status.js controls them from the actual calculate/register progress.


  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1316-ctu-cleanup.js':'v1.3.52'});
})();
