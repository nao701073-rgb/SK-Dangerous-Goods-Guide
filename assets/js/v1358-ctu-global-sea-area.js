(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const state={routeEstimate:null,lastAppliedAt:'',manualOverride:false};
  const clean=v=>String(v??'').replace(/[\u0000\r\n]+/g,' ').replace(/[\s　]+/g,' ').trim();
  const norm=v=>clean(v).toLowerCase().replace(/(?:port|harbour|harbor|terminal|港|埠頭|ふ頭|ターミナル)/gi,'').replace(/[\s　._\-\/()（）,，・]/g,'');

  // Representative ports are used only when an exact/alias match is possible.
  // Every other port still receives a global region fallback and a safe A/B/C candidate.
  const PORTS=[
    ['横浜',['横浜','yokohama'],'eastAsia',35.45,139.64],['東京',['東京','tokyo'],'eastAsia',35.62,139.78],['川崎',['川崎','kawasaki'],'eastAsia',35.52,139.75],['名古屋',['名古屋','nagoya'],'eastAsia',35.04,136.84],['神戸',['神戸','kobe'],'eastAsia',34.68,135.20],['博多',['博多','fukuoka','hakata'],'eastAsia',33.61,130.40],
    ['釜山',['釜山','busan','pusan'],'eastAsia',35.10,129.04],['上海',['上海','shanghai'],'eastAsia',31.23,121.49],['寧波',['寧波','ningbo','zhoushan'],'eastAsia',29.87,121.55],['青島',['青島','qingdao'],'eastAsia',36.07,120.38],['天津',['天津','tianjin','xingang'],'eastAsia',39.00,117.73],['香港',['香港','hongkong','hong kong'],'eastAsia',22.30,114.17],['高雄',['高雄','kaohsiung'],'eastAsia',22.61,120.29],
    ['シンガポール',['シンガポール','singapore'],'southeastAsia',1.26,103.84],['ポートクラン',['ポートクラン','portklang','port klang','klang'],'southeastAsia',3.00,101.39],['レムチャバン',['レムチャバン','laemchabang','laem chabang'],'southeastAsia',13.08,100.88],['ホーチミン',['ホーチミン','hochiminh','ho chi minh','catlai','cat lai','saigon'],'southeastAsia',10.76,106.79],['ハイフォン',['ハイフォン','haiphong','hai phong'],'southeastAsia',20.86,106.68],['マニラ',['マニラ','manila'],'southeastAsia',14.60,120.97],['ジャカルタ',['ジャカルタ','jakarta','tanjungpriok','tanjung priok'],'southeastAsia',-6.10,106.88],
    ['チェンナイ',['チェンナイ','chennai','madras'],'southAsia',13.08,80.29],['ムンバイ',['ムンバイ','mumbai','nhavasheva','nhava sheva','jnpt'],'southAsia',18.95,72.95],['コロンボ',['コロンボ','colombo'],'southAsia',6.94,79.85],['チャットグラム',['チッタゴン','チャットグラム','chittagong','chattogram'],'southAsia',22.31,91.80],
    ['ジェベルアリ',['ジェベルアリ','jebelali','jebel ali','dubai','ドバイ'],'middleEast',25.01,55.06],['ジェッダ',['ジェッダ','jeddah'],'middleEast',21.48,39.17],['サラーラ',['サラーラ','salalah'],'middleEast',16.94,54.01],['ダンマン',['ダンマン','dammam'],'middleEast',26.43,50.10],
    ['ロッテルダム',['ロッテルダム','rotterdam'],'northEurope',51.95,4.14],['アントワープ',['アントワープ','antwerp','antwerpen'],'northEurope',51.26,4.40],['ハンブルク',['ハンブルク','hamburg'],'northEurope',53.54,9.97],['サウサンプトン',['サウサンプトン','southampton'],'northEurope',50.90,-1.40],['ルアーブル',['ルアーブル','lehavre','le havre'],'northEurope',49.49,0.11],
    ['バルセロナ',['バルセロナ','barcelona'],'mediterranean',41.35,2.17],['バレンシア',['バレンシア','valencia'],'mediterranean',39.45,-0.32],['ジェノバ',['ジェノバ','genoa','genova'],'mediterranean',44.40,8.93],['ピレウス',['ピレウス','piraeus'],'mediterranean',37.94,23.64],['イスタンブール',['イスタンブール','istanbul'],'mediterranean',41.00,28.95],['タンジェメッド',['タンジェメッド','tangermed','tanger med','tangier'],'mediterranean',35.89,-5.50],
    ['ロサンゼルス',['ロサンゼルス','losangeles','los angeles','longbeach','long beach'],'northAmericaWest',33.75,-118.22],['オークランドUS',['oakland','オークランド港'],'northAmericaWest',37.80,-122.31],['シアトル',['シアトル','seattle','tacoma','タコマ'],'northAmericaWest',47.35,-122.33],['バンクーバー',['バンクーバー','vancouver'],'northAmericaWest',49.29,-123.11],
    ['ニューヨーク',['ニューヨーク','newyork','new york','newark','ニューアーク'],'northAmericaEast',40.68,-74.04],['サバンナ',['サバンナ','savannah'],'northAmericaEast',32.08,-81.09],['ノーフォーク',['ノーフォーク','norfolk'],'northAmericaEast',36.85,-76.29],['ヒューストン',['ヒューストン','houston'],'gulfCaribbean',29.73,-95.27],['マイアミ',['マイアミ','miami'],'gulfCaribbean',25.77,-80.19],['コロン',['コロン','colon panama','manzanillo panama'],'gulfCaribbean',9.36,-79.90],
    ['サントス',['サントス','santos'],'southAmericaEast',-23.96,-46.31],['ブエノスアイレス',['ブエノスアイレス','buenosaires','buenos aires'],'southAmericaEast',-34.60,-58.37],['カヤオ',['カヤオ','callao'],'southAmericaWest',-12.05,-77.15],['バルパライソ',['バルパライソ','valparaiso'],'southAmericaWest',-33.03,-71.63],
    ['シドニー',['シドニー','sydney'],'oceaniaEast',-33.86,151.21],['メルボルン',['メルボルン','melbourne'],'oceaniaEast',-37.84,144.91],['ブリスベン',['ブリスベン','brisbane'],'oceaniaEast',-27.38,153.17],['フリーマントル',['フリーマントル','fremantle','perth','パース'],'oceaniaWest',-32.05,115.74],['オークランドNZ',['auckland','オークランドnz','オークランドニュージーランド'],'oceaniaEast',-36.84,174.78],
    ['ダーバン',['ダーバン','durban'],'southAfricaEast',-29.88,31.05],['ケープタウン',['ケープタウン','capetown','cape town'],'southAfricaWest',-33.92,18.43],['モンバサ',['モンバサ','mombasa'],'africaEast',-4.04,39.67],['ラゴス',['ラゴス','lagos'],'africaWest',6.45,3.39],['テマ',['テマ','tema'],'africaWest',5.67,0.01]
  ].map(([name,aliases,region,lat,lon])=>({name,aliases,region,lat,lon}));

  const REGION_HINTS=[
    ['eastAsia',/日本|japan|韓国|korea|中国|china|台湾|taiwan|香港|hong\s*kong|北朝鮮|dprk/i],
    ['southeastAsia',/シンガポール|singapore|マレーシア|malaysia|タイ|thailand|ベトナム|vietnam|インドネシア|indonesia|フィリピン|philippines|カンボジア|cambodia|ミャンマー|myanmar|ブルネイ|brunei/i],
    ['southAsia',/インド|india|スリランカ|sri\s*lanka|バングラデシュ|bangladesh|パキスタン|pakistan|モルディブ|maldives/i],
    ['middleEast',/uae|united\s*arab\s*emirates|アラブ首長国連邦|サウジ|saudi|オマーン|oman|カタール|qatar|バーレーン|bahrain|クウェート|kuwait|イラク|iraq|イラン|iran|イエメン|yemen/i],
    ['northEurope',/英国|イギリス|united\s*kingdom|uk|アイルランド|ireland|フランス|france|ベルギー|belgium|オランダ|netherlands|ドイツ|germany|デンマーク|denmark|ノルウェー|norway|スウェーデン|sweden|フィンランド|finland|ポーランド|poland|バルト|estonia|latvia|lithuania|iceland|アイスランド/i],
    ['mediterranean',/スペイン|spain|ポルトガル|portugal|イタリア|italy|ギリシャ|greece|トルコ|turkey|クロアチア|croatia|スロベニア|slovenia|マルタ|malta|キプロス|cyprus|イスラエル|israel|レバノン|lebanon|エジプト|egypt|モロッコ|morocco|アルジェリア|algeria|チュニジア|tunisia/i],
    ['northAmericaWest',/california|oregon|washington\s*state|british\s*columbia|アラスカ|alaska|米西岸|us\s*west|canada\s*west/i],
    ['northAmericaEast',/new\s*york|new\s*jersey|virginia|georgia\s*usa|south\s*carolina|north\s*carolina|massachusetts|quebec|nova\s*scotia|米東岸|us\s*east|canada\s*east/i],
    ['gulfCaribbean',/texas|florida|louisiana|メキシコ|mexico|パナマ|panama|カリブ|caribbean|キューバ|cuba|ドミニカ|dominican|ジャマイカ|jamaica|プエルトリコ|puerto\s*rico/i],
    ['southAmericaEast',/ブラジル|brazil|アルゼンチン|argentina|ウルグアイ|uruguay|南米東岸/i],
    ['southAmericaWest',/チリ|chile|ペルー|peru|エクアドル|ecuador|コロンビア太平洋|南米西岸/i],
    ['oceaniaEast',/オーストラリア|australia|ニュージーランド|new\s*zealand|パプアニューギニア|papua\s*new\s*guinea|フィジー|fiji|ニューカレドニア|new\s*caledonia/i],
    ['southAfricaEast',/南アフリカ|south\s*africa|モザンビーク|mozambique|マダガスカル|madagascar|モーリシャス|mauritius/i],
    ['africaEast',/ケニア|kenya|タンザニア|tanzania|ソマリア|somalia|ジブチ|djibouti|エチオピア|ethiopia/i],
    ['africaWest',/ナイジェリア|nigeria|ガーナ|ghana|コートジボワール|ivory\s*coast|senegal|セネガル|カメルーン|cameroon|アンゴラ|angola/i],
    ['arctic',/北極|arctic|スバールバル|svalbard|グリーンランド|greenland/i]
  ];

  function resolvePort(value){
    const raw=clean(value),n=norm(raw);if(!n)return null;
    let best=null;
    PORTS.forEach(p=>p.aliases.forEach(alias=>{const a=norm(alias);if(!a)return;let score=0;if(a===n)score=100;else if(n.includes(a)||a.includes(n))score=Math.min(a.length,n.length)*4;if(score>(best?.score||0))best={...p,score,confidence:score>=100?'high':'medium',matched:alias}}));
    if(best)return best;
    for(const [region,rx] of REGION_HINTS)if(rx.test(raw))return{name:raw,region,lat:null,lon:null,confidence:'low',matched:'国・地域名'};
    return{name:raw,region:'unknown',lat:null,lon:null,confidence:'low',matched:'未登録港'};
  }
  function haversineNm(a,b){if(!Number.isFinite(a?.lat)||!Number.isFinite(a?.lon)||!Number.isFinite(b?.lat)||!Number.isFinite(b?.lon))return NaN;const R=3440.065,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
  const northWinter=m=>[10,11,12,1,2,3].includes(Number(m));
  const southWinter=m=>[4,5,6,7,8,9].includes(Number(m));
  const oceanic=new Set(['northAmericaWest','northAmericaEast','gulfCaribbean','southAmericaEast','southAmericaWest','oceaniaEast','oceaniaWest','southAfricaEast','southAfricaWest','africaEast','africaWest','arctic']);
  function group(r){if(r==='oceaniaWest')return'oceania';if(r==='oceaniaEast')return'oceania';if(r==='southAfricaEast'||r==='southAfricaWest')return'southAfrica';return r}
  function routeDescription(a,b){
    const A=group(a.region),B=group(b.region),pair=[A,B].sort().join('|');
    if(A==='eastAsia'&&B==='eastAsia')return'日本近海・黄海・東シナ海等を含む東アジア域内ルート';
    if(pair==='eastAsia|southeastAsia')return'東シナ海・南シナ海を含むアジア域内ルート';
    if(pair==='southAsia|southeastAsia'||pair==='eastAsia|southAsia')return'南シナ海・マラッカ海峡・インド洋方面を含むルート';
    if(pair.includes('middleEast')&&(pair.includes('eastAsia')||pair.includes('southeastAsia')||pair.includes('southAsia')))return'マラッカ海峡・インド洋・アラビア海／ペルシャ湾方面を含むルート';
    if(pair==='eastAsia|northEurope'||pair==='eastAsia|mediterranean'||pair==='northEurope|southeastAsia'||pair==='mediterranean|southeastAsia')return'南シナ海・マラッカ海峡・インド洋・スエズ運河方面を含む長距離ルート';
    if(pair.includes('northAmericaWest')&&(pair.includes('eastAsia')||pair.includes('southeastAsia')))return'北太平洋横断ルート';
    if(pair.includes('northAmericaEast')&&pair.includes('northEurope'))return'北大西洋横断ルート';
    if(pair.includes('southAfrica'))return'喜望峰・南大西洋または南インド洋周辺を含むルート';
    if(pair.includes('oceania')&&(pair.includes('northEurope')||pair.includes('mediterranean')))return'インド洋・スエズ／喜望峰方面を含む長距離ルート';
    if(A==='oceania'&&B==='oceania')return'豪州・ニュージーランド周辺の域内ルート';
    if(pair.includes('southAmericaEast')||pair.includes('southAmericaWest'))return'南米沿岸および太平洋／大西洋外洋区間を含むルート';
    if(pair.includes('gulfCaribbean'))return'メキシコ湾・カリブ海・パナマ運河方面を含むルート';
    if(pair.includes('arctic'))return'高緯度・北極海域を含む可能性のあるルート';
    return`${a.name} → ${b.name} の一般的な海上ルート`;
  }
  function inferRoute(originText,destinationText,month){
    if(!clean(originText)||!clean(destinationText))throw new Error('船積港と陸揚港を入力してください。');
    const origin=resolvePort(originText),destination=resolvePort(destinationText),distance=haversineNm(origin,destination),A=group(origin.region),B=group(destination.region),pair=[A,B].sort().join('|');
    let area='seaB',reasons=[],confirmationRequired=false;
    const sameKnown=A===B&&A!=='unknown';
    const veryLong=Number.isFinite(distance)&&distance>=8500;
    const long=Number.isFinite(distance)&&distance>=5000;
    const highNorth=[origin,destination].some(p=>Number.isFinite(p.lat)&&p.lat>=45);
    const highSouth=[origin,destination].some(p=>Number.isFinite(p.lat)&&p.lat<=-35);
    const cape=pair.includes('southAfrica')||((pair.includes('oceania')||pair.includes('eastAsia'))&&pair.includes('southAmericaEast'));
    if(origin.region==='unknown'||destination.region==='unknown'){
      area='seaB';confirmationRequired=true;reasons.push('港・地域を一意に特定できないため海域Bを初期候補として設定');
    }else if(pair.includes('arctic')){
      area='seaC';confirmationRequired=true;reasons.push('高緯度・北極海域を含む可能性から海域Cを保守的候補として設定');
    }else if((highNorth&&northWinter(month)&&long)||(pair==='northAmericaEast|northEurope'&&northWinter(month))||(pair==='eastAsia|northAmericaWest'&&northWinter(month))){
      area='seaC';reasons.push('北太平洋／北大西洋の冬季外洋航海として海域Cを保守的に設定');
    }else if((highSouth&&southWinter(month)&&long)||cape||veryLong){
      area='seaC';reasons.push('南半球冬季・喜望峰周辺または長距離外洋航海として海域Cを保守的に設定');
    }else if(sameKnown&&Number.isFinite(distance)&&distance<=1800){
      area='seaA';reasons.push('同一地域内の比較的短い航海として海域A候補を設定');
    }else if(A==='eastAsia'&&B==='eastAsia'&&(!Number.isFinite(distance)||distance<=2500)){
      area='seaA';reasons.push('東アジア域内航海として海域A候補を設定');
    }else if((A==='mediterranean'&&B==='mediterranean')||(A==='southeastAsia'&&B==='southeastAsia')){
      area='seaA';reasons.push('閉鎖性・域内航路の比較的短い航海として海域A候補を設定');
    }else{
      area='seaB';reasons.push('一般的な国際海上輸送として海域B候補を設定');
    }
    if(!Number.isFinite(distance))confirmationRequired=true;
    const confidence=origin.confidence==='high'&&destination.confidence==='high'?'高':origin.region!=='unknown'&&destination.region!=='unknown'?'中':'低';
    return{origin,destination,month:Number(month)||null,distanceNm:Number.isFinite(distance)?Math.round(distance):null,area,areaLabel:{seaA:'海域A',seaB:'海域B',seaC:'海域C'}[area],route:routeDescription(origin,destination),confidence,reasons,confirmationRequired,coverage:'global-abc'};
  }
  function applyEstimate(estimate,{source='global-route',render=true}={}){
    if(!estimate||!['seaA','seaB','seaC'].includes(estimate.area))return null;
    const quick=$('quickTransport'),preset=$('transportPreset'),route=$('route'),box=$('routeEstimate');
    if(quick&&quick.value!==estimate.area){quick.value=estimate.area;quick.dispatchEvent(new Event('change',{bubbles:true}))}
    if(preset&&preset.value!==estimate.area){preset.value=estimate.area;preset.dispatchEvent(new Event('change',{bubbles:true}))}
    window.applyTransportPreset?.();
    if(route)route.value=`${clean($('loadingPort')?.value)} → ${clean($('dischargePort')?.value)}／${estimate.route}／推定${estimate.areaLabel}`;
    if(render&&box){
      box.hidden=false;
      const caution=estimate.confirmationRequired?'港・航路情報の確度が低いため、実際の寄港地・予定航路・季節・気象海象を確認し、必要に応じて海域を手動選択してください。':'推定結果は入力補助です。実際の寄港地・予定航路・季節・気象海象を確認し、必要に応じてより厳しい海域へ変更してください。';
      box.innerHTML=`<div class="route-estimate-head"><strong>推定結果：${estimate.areaLabel}</strong><span>推定確度 ${estimate.confidence}</span></div><p><strong>想定航路：</strong>${estimate.route}</p>${estimate.distanceNm?`<p><strong>港間の大圏距離（参考）：</strong>約 ${estimate.distanceNm.toLocaleString('ja-JP')} 海里</p>`:''}<p><strong>推定理由：</strong>${estimate.reasons.join('。')}</p><p class="route-caution">${caution}</p>`;
    }
    window.updateSummary?.();
    state.routeEstimate=estimate;state.lastAppliedAt=new Date().toISOString();
    window.dispatchEvent(new CustomEvent('sk:ctu-route-applied',{detail:{source,routeEstimate:estimate,loadingPort:clean($('loadingPort')?.value),dischargePort:clean($('dischargePort')?.value),departureMonth:Number($('departureMonth')?.value)||null}}));
    return estimate;
  }
  function inferAndApply(source='global-route'){
    const loading=clean($('loadingPort')?.value),discharge=clean($('dischargePort')?.value),month=Number($('departureMonth')?.value)||null;
    if(!loading||!discharge)return null;
    try{return applyEstimate(inferRoute(loading,discharge,month),{source})}catch(e){console.warn('[SKDG v1.3.58] global route inference:',e);return null}
  }
  function patchApi(){
    const api=window.ISSCTUExcelRoute;if(!api||api.__v1358GlobalPatched)return false;
    const oldGet=typeof api.getState==='function'?api.getState.bind(api):()=>({});
    api.inferRoute=inferRoute;api.resolvePort=resolvePort;
    api.getState=()=>{const base=oldGet()||{};return{...base,routeEstimate:state.routeEstimate||base.routeEstimate||null,globalSeaAreaCoverage:true}};
    api.__v1358GlobalPatched=true;return true;
  }
  function bind(){
    patchApi();
    const btn=$('inferSeaArea');if(btn&&!btn.dataset.v1358Global){btn.dataset.v1358Global='1';btn.addEventListener('click',()=>setTimeout(()=>inferAndApply('manual-route-button'),0))}
    ['loadingPort','dischargePort','departureMonth'].forEach(id=>{const el=$(id);if(el&&!el.dataset.v1358Global){el.dataset.v1358Global='1';el.addEventListener('change',()=>setTimeout(()=>{if(clean($('loadingPort')?.value)&&clean($('dischargePort')?.value))inferAndApply('route-field-change')},0))}});
    ['quickTransport','transportPreset'].forEach(id=>{const el=$(id);if(el&&!el.dataset.v1358ManualSea){el.dataset.v1358ManualSea='1';el.addEventListener('change',event=>{if(event.isTrusted&&['seaA','seaB','seaC'].includes(el.value))state.manualOverride=true})}});
  }
  window.addEventListener('sk:ctu-excel-imported',()=>setTimeout(()=>{patchApi();inferAndApply('excel-import')},0));
  window.addEventListener('sk:ctu-excel-route-enhanced',()=>setTimeout(()=>{patchApi();inferAndApply('excel-route-enhanced')},0));
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
  [100,400,900,1600].forEach(ms=>setTimeout(patchApi,ms));
  window.SKCTUGlobalSeaAreaV1358={inferRoute,resolvePort,inferAndApply,getState:()=>JSON.parse(JSON.stringify(state))};
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/v1358-ctu-global-sea-area.js':'v1.3.58'});
})();
