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
    const candidates=[...document.querySelectorAll('section,aside,div')].filter(isEasyGuide);
    // 親まで誤って消さないよう、同条件を満たす子要素を持たない最小ブロックだけを削除する。
    candidates.filter(node=>![...node.children].some(isEasyGuide)).forEach(node=>node.remove());
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
    const btn=$('ctuRegisterSimple');
    if(btn){btn.disabled=false;btn.removeAttribute('disabled');btn.removeAttribute('aria-disabled');}
    ['saveCtuResult','createAndSaveCtuResult'].forEach(id=>{const b=$(id);if(b)b.disabled=false;});
    // 後続の旧補助スクリプトがレビュー状態を参照しても登録を止めない。
    const current=window.SKCTUReview;
    if(!current || current.isComplete?.()!==true){
      window.SKCTUReview={
        isComplete:()=>true,
        getData:()=>({status:'not-required',confirmedItems:[],reviewer:'',note:'',confirmedAt:null,registrationConfirmationRequired:false,inputSources:{excel:false,photo:false,manual:true}}),
        invalidate:()=>keepRegistrationOpen()
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
    document.querySelectorAll('#ctuNextCalculation,[data-legacy-ctu-nav]').forEach(node=>node.remove());
    const msg=$('ctuRegistrationMessage');
    if(msg && norm(msg.textContent).includes('入力値・強度根拠・算出結果を確認しました'))msg.textContent='';
    keepRegistrationOpen();
  }

  // 全DOMを走査する完全クリーンアップは初期化時の1回だけ。
  // 後続スクリプトの追補にはID中心の軽量版を使い、同じ走査を重ねない。
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',cleanup,{once:true});else cleanup();
  window.addEventListener('load',lightweightCleanup,{once:true});
  setTimeout(lightweightCleanup,180);

  // 旧ワークフロー補助が入力操作後に重複ナビを再生成する場合だけ、
  // ユーザー操作1回につき最大1回の軽量クリーンアップを行う。常時DOM監視はしない。
  let cleanupTimer=0;
  const legacyUiExists=()=>Boolean(document.querySelector('#ctuNextCalculation,.ctu-review-panel,.part551-single-check,[data-legacy-ctu-nav]'));
  const scheduleCleanup=()=>{if(!legacyUiExists())return;clearTimeout(cleanupTimer);cleanupTimer=setTimeout(lightweightCleanup,80)};
  ['change','click'].forEach(type=>document.addEventListener(type,event=>{
    if(event.target?.closest?.('[data-ctu-workflow],.ctu-workflow,.part551-single-check'))scheduleCleanup();
  },true));

  // 監視対象は登録ボタン1個のdisabled属性だけ。画面全体のMutationObserverは使用しない。
  const observeButton=()=>{
    const btn=$('ctuRegisterSimple');
    if(!btn||btn.dataset.v1316Observed==='1')return;
    btn.dataset.v1316Observed='1';
    new MutationObserver(()=>{if(btn.disabled){btn.disabled=false;btn.removeAttribute('disabled');}btn.removeAttribute('aria-disabled');})
      .observe(btn,{attributes:true,attributeFilter:['disabled','aria-disabled']});
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',observeButton,{once:true});else observeButton();

  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1316-ctu-cleanup.js':'v1.3.26'});
})();
