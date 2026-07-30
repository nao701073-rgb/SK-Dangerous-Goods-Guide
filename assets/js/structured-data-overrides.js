(()=>{
  'use strict';
  const ACTIVE_KEY='iss-structured-data-overrides-v1';
  const PREVIEW_KEY='iss-structured-data-preview-v1';
  const REVIEW_KEY='iss-structured-data-preview-reviews-v1';
  const readJson=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
  const user=readJson('iss-api-user',null);
  const isRevisionValidator=user?.role==='revision-validator';
  const active=readJson(ACTIVE_KEY,{});
  const preview=readJson(PREVIEW_KEY,{});
  const overrides=isRevisionValidator?{...active,...preview}:active;
  const configs=[
    ['dangerous-goods-basic','UN_DATABASE','array'],
    ['label-master','LABEL_MASTER','labels'],
    ['packaging-requirements','STRUCTURED_PACKAGING_REQUIREMENTS','array'],
    ['special-provisions','STRUCTURED_SPECIAL_PROVISIONS','array'],
    ['article-links','STRUCTURED_ARTICLE_LINKS','array'],
    ['domestic-imdg-cross-reference','STRUCTURED_DOMESTIC_IMDG_CROSS_REFERENCE','array'],
    ['regulation-registry','REGULATION_REGISTRY','array'],
    ['marking-rules','STRUCTURED_MARKING_RULES','array']
  ];
  configs.forEach(([datasetId,globalName,mode])=>{
    const update=overrides[datasetId];
    if(!update||!Array.isArray(update.records)) return;
    let current;
    try{current=window[globalName]}catch{}
    const apply=base=>mode==='labels'?{...(base&&typeof base==='object'?base:{}),updatedAt:update.appliedAt||update.stagedAt||new Date().toISOString().slice(0,10),labels:update.records}:update.records;
    if(current!==undefined){window[globalName]=apply(current);return;}
    Object.defineProperty(window,globalName,{configurable:true,enumerable:true,get(){return current},set(value){current=apply(value)}});
  });
  function addPreviewBanner(){
    if(!isRevisionValidator||!Object.keys(preview).length||document.getElementById('revisionPreviewBanner')) return;
    const banner=document.createElement('aside');
    banner.id='revisionPreviewBanner';
    banner.setAttribute('role','status');
    banner.style.cssText='position:sticky;top:0;z-index:10000;padding:10px 16px;background:#fff2bf;border-bottom:2px solid #b37a00;color:#563b00;font-weight:800;text-align:center;';
    banner.innerHTML='改正検証モード：公開前の更新候補データを表示しています。通常利用者には反映されていません。 <a href="'+(location.pathname.includes('/pages/')?'revision-preview.html':'pages/revision-preview.html')+'" style="color:inherit;text-decoration:underline">検証状況を開く</a>';
    document.body.prepend(banner);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',addPreviewBanner,{once:true}); else addPreviewBanner();
  window.ISSStructuredData={
    getActive:()=>active,
    getPreview:()=>preview,
    isPreviewMode:()=>isRevisionValidator,
    getReviews:()=>readJson(REVIEW_KEY,{}),
    clear(datasetId){
      const target=isRevisionValidator?preview:active;
      if(datasetId) delete target[datasetId]; else Object.keys(target).forEach(key=>delete target[key]);
      localStorage.setItem(isRevisionValidator?PREVIEW_KEY:ACTIVE_KEY,JSON.stringify(target));
    }
  };
})();
