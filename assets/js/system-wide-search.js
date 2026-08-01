(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const form=$("globalSearchForm"), input=$("globalSearchQuery"), resultsRoot=$("globalSearchResults"), summary=$("globalSearchSummary"), counts=$("globalSearchCounts");
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm=value=>String(value??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
  const tokens=value=>norm(value).split(/[\s,、,;；]+/).filter(Boolean);
  const user=()=>window.ISSApi?.getUser?.()||window.ISSFeatureAccess?.currentUser?.()||{};
  const role=()=>String(user()?.role||"");
  const canApplications=()=>Boolean(window.ISSAccess?.permissions?.(role())?.applicationsRead || ["office-user","office-admin","safety-environment-director","safety-environment-staff","safety-environment-admin"].includes(role()));
  const canSystemSettings=()=>["office-admin","safety-environment-director","safety-environment-admin"].includes(role());
  const canAdmin=()=>role()==="safety-environment-admin";
  const canRegulationAdmin=()=>["safety-environment-director","safety-environment-staff","safety-environment-admin","validator","revision-validator"].includes(role());
  const currentScope=()=>form.querySelector('input[name="globalScope"]:checked')?.value||"all";
  const matches=(haystack, queryTokens)=>queryTokens.every(t=>norm(haystack).includes(t));
  const joined=obj=>Object.values(obj||{}).flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>typeof v!=="object").join(" ");

  function featureCatalog(){
    const items=[
      {title:"危険物検索",description:"国連番号、英語品名、日本語品名、等級、標札、容器等級、包装要件、特別規定、EmSを検索します。",keywords:"危険物 UN 国連番号 品名 標札 容器等級 包装 特別規定 EmS",url:"dangerous-goods-search.html"},
      {title:"関連法令",description:"国内法令、国際規則、版情報、改正履歴、条文を参照します。",keywords:"法令 国内法令 IMDG Code 条文 改正 版",url:"regulations.html"},
      {title:"関連資料",description:"原典PDF、参考資料、要約、検査資料を参照します。",keywords:"資料 PDF 原典 参考資料 要約",url:"references.html"},
      {title:"検索履歴",description:"過去に検索した危険物やキーワードを確認します。",keywords:"履歴 最近 検索",url:"search-history.html",roles:["office-user","office-admin","safety-environment-director","safety-environment-staff","safety-environment-admin","validator","revision-validator"]},
      {title:"ユーザー設定",description:"表示名、パスワード、個人設定を確認・変更します。",keywords:"ユーザー 設定 パスワード 表示名",url:"settings.html"},
      {title:"申請番号管理",description:"申請番号に簡易メモ、写真、添付資料を補完します。",keywords:"申請番号 メモ 写真 添付",url:"applications.html",test:canApplications},
      {title:"オーバーパック標札・品名等の表示作成",description:"必要な標札、OVERPACK、国連番号、英語品名をA4ラベルへ配置します。",keywords:"オーバーパック OVERPACK 標札 品名 国連番号 A4 ラベル",url:"overpack-label-tool.html",test:()=>window.ISSFeatureAccess?.canUseOverpack?.()},
      {title:"システム設定",description:"認証、利用者登録、CSV一括登録、データ更新、運用設定を管理します。",keywords:"システム設定 ログイン 必須 CSV 利用者 管理",url:"system-settings.html",test:canSystemSettings},
      {title:"利用者管理",description:"利用者アカウント、権限、所属、パスワードを管理します。",keywords:"利用者 アカウント 権限 所属 パスワード",url:"user-admin.html",test:()=>["office-admin","safety-environment-admin"].includes(role())},
      {title:"法令改正・データ更新管理",description:"PDF、CSV、JSON、構造化データ、差分、承認、公開を管理します。",keywords:"法令改正 データ更新 PDF CSV JSON 差分 承認 公開",url:"regulation-update-admin.html",test:canRegulationAdmin},
      {title:"構造化データ更新センター",description:"危険物、標札、包装要件、特別規定、条文リンク等を更新します。",keywords:"構造化データ 危険物 標札 包装要件 特別規定 条文リンク ひな型 CSV JSON",url:"regulation-update-admin.html",test:canRegulationAdmin},
      {title:"改正検証プレビュー",description:"本番公開前の更新候補を先行確認し、検証結果を記録します。",keywords:"改正 検証 プレビュー 更新候補 本番前",url:"revision-preview.html",roles:["revision-validator","safety-environment-director","safety-environment-staff","safety-environment-admin"]},
      {title:"国内法令・IMDG Code対照",description:"国内法令とIMDG Codeの対応関係・条文リンクを確認します。",keywords:"国内法令 IMDG Code 対照 条文リンク",url:"imdg-cross-reference.html",test:canRegulationAdmin},
      {title:"案件判定根拠スナップショット",description:"案件判定時点の法令・データ・根拠を保存して確認します。",keywords:"案件 判定 根拠 スナップショット",url:"regulation-evidence-snapshot.html",test:canRegulationAdmin},
      {title:"改善要望",description:"システムに関する改善提案や不具合を記録します。",keywords:"改善 要望 不具合 フィードバック",url:"feedback.html"},
      {title:"セキュリティ管理",description:"認証、アクセス、監査、アカウント保護を管理します。",keywords:"セキュリティ 認証 アクセス 監査",url:"security-admin.html",test:canAdmin}
    ];
    return items.filter(item=>(!item.roles||item.roles.includes(role()))&&(!item.test||item.test()));
  }

  function dangerousResults(qt){
    return (window.UN_DATABASE||[]).filter(row=>matches([row.unNumber,`UN${row.unNumber}`,row.properShippingName,row.properShippingNameJa,row.classification,row.item,row.class,row.subsidiaryRisk,row.packingGroup,row.limitedQuantity,row.smallPackingInstruction,row.largePackingInstruction,row.ibcInstruction,row.portableTankInstruction,row.specialProvisions,row.labels,row.ems,row.source].flat().join(" "),qt)).slice(0,60).map(row=>({type:"危険物",title:`UN${row.unNumber} ${row.properShippingName||""}`,description:`${row.properShippingNameJa||""}／等級 ${row.class||"―"}／容器等級 ${row.packingGroup||"―"}`,meta:`包装要件 ${row.smallPackingInstruction||"―"}・特別規定 ${Array.isArray(row.specialProvisions)?row.specialProvisions.join(" "):row.specialProvisions||"―"}`,url:`dangerous-goods-detail.html?un=${encodeURIComponent(row.unNumber)}`}));
  }
  function regulationResults(qt){
    return (window.REGULATION_REGISTRY||[]).filter(row=>matches(joined(row),qt)).slice(0,40).map(row=>({type:"法令",title:row.officialName||row.shortName||row.regulationId,description:[row.shortName,row.category,row.jurisdiction].filter(Boolean).join("／"),meta:row.status?`状態：${row.status}`:"",url:"regulations.html?query="+encodeURIComponent(row.shortName||row.officialName||"")}));
  }
  function referenceResults(qt){
    return (window.REFERENCE_DOCUMENTS||[]).filter(row=>matches(joined(row),qt)).slice(0,40).map(row=>({type:"資料",title:row.title||row.shortTitle||row.documentId,description:[row.shortTitle,row.category,row.language].filter(Boolean).join("／"),meta:Array.isArray(row.tags)?row.tags.join("・"):"",url:"references.html?query="+encodeURIComponent(row.shortTitle||row.title||"")}));
  }
  function applicationResults(qt){
    if(!canApplications()) return [];
    let apps=[]; try{apps=window.ISSStorage?.getApplications?.({scope:["safety-environment-director","safety-environment-staff","safety-environment-admin"].includes(role())?"all":undefined})||[];}catch(_e){}
    return apps.filter(row=>matches(joined(row),qt)).slice(0,40).map(row=>({type:"申請番号",title:row.applicationNumber||row.number||"申請番号未設定",description:[row.office,row.officeName,row.memo,row.notes].filter(Boolean).join("／")||"申請番号管理データ",meta:row.updatedAt?`更新：${new Date(row.updatedAt).toLocaleString("ja-JP")}`:"",url:"applications.html?query="+encodeURIComponent(row.applicationNumber||"")}));
  }
  function featureResults(qt){
    return featureCatalog().filter(row=>matches(`${row.title} ${row.description} ${row.keywords}`,qt)).map(row=>({type:"機能・設定",title:row.title,description:row.description,meta:"利用可能な機能",url:row.url}));
  }
  function search(query,scope){
    const qt=tokens(query); if(!qt.length)return [];
    const groups={dangerous:()=>dangerousResults(qt),regulations:()=>regulationResults(qt),references:()=>referenceResults(qt),applications:()=>applicationResults(qt),features:()=>featureResults(qt)};
    if(scope!=="all")return groups[scope]?.()||[];
    return Object.values(groups).flatMap(fn=>fn());
  }
  function render(items,query){
    const grouped=items.reduce((m,x)=>(m[x.type]=(m[x.type]||0)+1,m),{});
    counts.innerHTML=Object.entries(grouped).map(([k,v])=>`<span class="global-count">${esc(k)} ${v}件</span>`).join("");
    summary.textContent=items.length?`「${query}」に一致する結果を${items.length}件表示しています。`:`「${query}」に一致する情報は見つかりませんでした。`;
    if(!items.length){resultsRoot.innerHTML='<p class="global-empty">別のキーワードまたは検索対象をお試しください。</p>';return;}
    const max=100, shown=items.slice(0,max);
    resultsRoot.innerHTML=shown.map(item=>`<article class="global-result-card"><div><span class="global-type">${esc(item.type)}</span><h3>${esc(item.title)}</h3><p>${esc(item.description)}</p>${item.meta?`<small>${esc(item.meta)}</small>`:""}</div><a href="${esc(item.url)}">開く →</a></article>`).join("")+(items.length>max?`<p class="global-more">上位${max}件を表示しています。検索語を追加すると絞り込めます。</p>`:"");
  }
  function execute(){const q=input.value.trim();if(!q){input.focus();return;}const scope=currentScope();const url=new URL(location.href);url.searchParams.set("query",q);url.searchParams.set("scope",scope);history.replaceState(null,"",url);render(search(q,scope),q);}
  form.addEventListener("submit",e=>{e.preventDefault();execute();});
  form.querySelectorAll('input[name="globalScope"]').forEach(r=>r.addEventListener("change",()=>{if(input.value.trim())execute();}));
  const params=new URLSearchParams(location.search),q=params.get("query")||"",scope=params.get("scope")||"all";
  input.value=q;const radio=form.querySelector(`input[name="globalScope"][value="${CSS.escape(scope)}"]`);if(radio)radio.checked=true;
  if(q)execute();
})();
