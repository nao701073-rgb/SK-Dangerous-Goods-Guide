(function(){
  'use strict';

  const state={importedAt:'',fields:{},routeEstimate:null};
  let transientBuffer=null;
  let transientWorkbook=null;
  const PORTS=[
    {name:'横浜',aliases:['横浜','yokohama'],country:'JP',region:'japan',lat:35.45,lon:139.64},
    {name:'東京',aliases:['東京港','東京','tokyo'],country:'JP',region:'japan',lat:35.62,lon:139.78},
    {name:'川崎',aliases:['川崎港','川崎','kawasaki'],country:'JP',region:'japan',lat:35.52,lon:139.75},
    {name:'千葉',aliases:['千葉港','千葉','chiba'],country:'JP',region:'japan',lat:35.56,lon:140.05},
    {name:'名古屋',aliases:['名古屋港','名古屋','nagoya'],country:'JP',region:'japan',lat:35.04,lon:136.84},
    {name:'四日市',aliases:['四日市港','四日市','yokkaichi'],country:'JP',region:'japan',lat:34.96,lon:136.65},
    {name:'大阪',aliases:['大阪港','大阪','osaka'],country:'JP',region:'japan',lat:34.65,lon:135.42},
    {name:'神戸',aliases:['神戸港','神戸','kobe'],country:'JP',region:'japan',lat:34.68,lon:135.20},
    {name:'清水',aliases:['清水港','清水','shimizu'],country:'JP',region:'japan',lat:35.01,lon:138.49},
    {name:'博多',aliases:['博多港','博多','hakata','fukuoka'],country:'JP',region:'japan',lat:33.61,lon:130.40},
    {name:'門司',aliases:['門司港','門司','moji','kitakyushu'],country:'JP',region:'japan',lat:33.95,lon:130.96},
    {name:'広島',aliases:['広島港','広島','hiroshima'],country:'JP',region:'japan',lat:34.35,lon:132.46},
    {name:'呉',aliases:['呉港','呉','kure'],country:'JP',region:'japan',lat:34.24,lon:132.56},
    {name:'釜山',aliases:['釜山','busan','pusan'],country:'KR',region:'eastAsia',lat:35.10,lon:129.04},
    {name:'仁川',aliases:['仁川','incheon'],country:'KR',region:'eastAsia',lat:37.46,lon:126.62},
    {name:'上海',aliases:['上海','shanghai'],country:'CN',region:'eastAsia',lat:31.23,lon:121.49},
    {name:'寧波',aliases:['寧波','ningbo','zhoushan'],country:'CN',region:'eastAsia',lat:29.87,lon:121.55},
    {name:'青島',aliases:['青島','qingdao'],country:'CN',region:'eastAsia',lat:36.07,lon:120.38},
    {name:'天津・新港',aliases:['天津','新港','tianjin','xingang'],country:'CN',region:'eastAsia',lat:39.00,lon:117.73},
    {name:'香港',aliases:['香港','hong kong','hongkong'],country:'HK',region:'eastAsia',lat:22.30,lon:114.17},
    {name:'高雄',aliases:['高雄','kaohsiung'],country:'TW',region:'eastAsia',lat:22.61,lon:120.29},
    {name:'基隆',aliases:['基隆','keelung'],country:'TW',region:'eastAsia',lat:25.13,lon:121.74},
    {name:'シンガポール',aliases:['シンガポール','singapore'],country:'SG',region:'southeastAsia',lat:1.26,lon:103.84},
    {name:'ポートクラン',aliases:['ポートクラン','port klang','portkelang','klang'],country:'MY',region:'southeastAsia',lat:3.00,lon:101.39},
    {name:'タンジュンペラパス',aliases:['タンジュンペラパス','tanjung pelepas','ptp'],country:'MY',region:'southeastAsia',lat:1.36,lon:103.55},
    {name:'レムチャバン',aliases:['レムチャバン','laem chabang'],country:'TH',region:'southeastAsia',lat:13.08,lon:100.88},
    {name:'バンコク',aliases:['バンコク','bangkok'],country:'TH',region:'southeastAsia',lat:13.70,lon:100.57},
    {name:'ホーチミン・カトライ',aliases:['ホーチミン','カトライ','ho chi minh','cat lai','saigon'],country:'VN',region:'southeastAsia',lat:10.76,lon:106.79},
    {name:'ハイフォン',aliases:['ハイフォン','hai phong','haiphong'],country:'VN',region:'southeastAsia',lat:20.86,lon:106.68},
    {name:'ジャカルタ・タンジュンプリオク',aliases:['ジャカルタ','タンジュンプリオク','jakarta','tanjung priok'],country:'ID',region:'southeastAsia',lat:-6.10,lon:106.88},
    {name:'マニラ',aliases:['マニラ','manila'],country:'PH',region:'southeastAsia',lat:14.60,lon:120.97},
    {name:'コロンボ',aliases:['コロンボ','colombo'],country:'LK',region:'indianOcean',lat:6.94,lon:79.85},
    {name:'ジェベルアリ',aliases:['ジェベルアリ','jebel ali','dubai','ドバイ'],country:'AE',region:'middleEast',lat:25.01,lon:55.06},
    {name:'ジェッダ',aliases:['ジェッダ','jeddah'],country:'SA',region:'middleEast',lat:21.48,lon:39.17},
    {name:'サラーラ',aliases:['サラーラ','salalah'],country:'OM',region:'middleEast',lat:16.94,lon:54.01},
    {name:'ロッテルダム',aliases:['ロッテルダム','rotterdam'],country:'NL',region:'northEurope',lat:51.95,lon:4.14},
    {name:'アントワープ',aliases:['アントワープ','antwerp','antwerpen'],country:'BE',region:'northEurope',lat:51.26,lon:4.40},
    {name:'ハンブルク',aliases:['ハンブルク','hamburg'],country:'DE',region:'northEurope',lat:53.54,lon:9.97},
    {name:'ブレーマーハーフェン',aliases:['ブレーマーハーフェン','bremerhaven'],country:'DE',region:'northEurope',lat:53.55,lon:8.58},
    {name:'フェリックストウ',aliases:['フェリックストウ','felixstowe'],country:'GB',region:'northEurope',lat:51.96,lon:1.35},
    {name:'サウサンプトン',aliases:['サウサンプトン','southampton'],country:'GB',region:'northEurope',lat:50.90,lon:-1.40},
    {name:'ルアーブル',aliases:['ルアーブル','le havre','lehavre'],country:'FR',region:'northEurope',lat:49.49,lon:0.11},
    {name:'バレンシア',aliases:['バレンシア','valencia'],country:'ES',region:'mediterranean',lat:39.45,lon:-0.32},
    {name:'バルセロナ',aliases:['バルセロナ','barcelona'],country:'ES',region:'mediterranean',lat:41.35,lon:2.17},
    {name:'ジェノバ',aliases:['ジェノバ','genoa','genova'],country:'IT',region:'mediterranean',lat:44.40,lon:8.93},
    {name:'ピレウス',aliases:['ピレウス','piraeus'],country:'GR',region:'mediterranean',lat:37.94,lon:23.64},
    {name:'イスタンブール',aliases:['イスタンブール','istanbul'],country:'TR',region:'mediterranean',lat:41.00,lon:28.95},
    {name:'ロサンゼルス・ロングビーチ',aliases:['ロサンゼルス','ロングビーチ','los angeles','long beach','losangeles'],country:'US',region:'northAmericaWest',lat:33.75,lon:-118.22},
    {name:'オークランド',aliases:['オークランド港','oakland'],country:'US',region:'northAmericaWest',lat:37.80,lon:-122.31},
    {name:'シアトル・タコマ',aliases:['シアトル','タコマ','seattle','tacoma'],country:'US',region:'northAmericaWest',lat:47.35,lon:-122.33},
    {name:'バンクーバー',aliases:['バンクーバー','vancouver'],country:'CA',region:'northAmericaWest',lat:49.29,lon:-123.11},
    {name:'ニューヨーク・ニュージャージー',aliases:['ニューヨーク','ニューアーク','new york','newark','new jersey'],country:'US',region:'northAmericaEast',lat:40.68,lon:-74.04},
    {name:'サバンナ',aliases:['サバンナ','savannah'],country:'US',region:'northAmericaEast',lat:32.08,lon:-81.09},
    {name:'ノーフォーク',aliases:['ノーフォーク','norfolk'],country:'US',region:'northAmericaEast',lat:36.85,lon:-76.29},
    {name:'チャールストン',aliases:['チャールストン','charleston'],country:'US',region:'northAmericaEast',lat:32.78,lon:-79.93},
    {name:'ヒューストン',aliases:['ヒューストン','houston'],country:'US',region:'northAmericaEast',lat:29.73,lon:-95.27},
    {name:'ハリファックス',aliases:['ハリファックス','halifax'],country:'CA',region:'northAmericaEast',lat:44.65,lon:-63.57},
    {name:'モントリオール',aliases:['モントリオール','montreal'],country:'CA',region:'northAmericaEast',lat:45.50,lon:-73.55},
    {name:'シドニー',aliases:['シドニー','sydney'],country:'AU',region:'oceania',lat:-33.86,lon:151.21},
    {name:'メルボルン',aliases:['メルボルン','melbourne'],country:'AU',region:'oceania',lat:-37.84,lon:144.91},
    {name:'ブリスベン',aliases:['ブリスベン','brisbane'],country:'AU',region:'oceania',lat:-27.38,lon:153.17},
    {name:'フリーマントル',aliases:['フリーマントル','fremantle','perth'],country:'AU',region:'oceania',lat:-32.05,lon:115.74},
    {name:'オークランド（NZ）',aliases:['オークランドnz','auckland','オークランドニュージーランド'],country:'NZ',region:'oceania',lat:-36.84,lon:174.78},
    {name:'サントス',aliases:['サントス','santos'],country:'BR',region:'southAmericaEast',lat:-23.96,lon:-46.31},
    {name:'ブエノスアイレス',aliases:['ブエノスアイレス','buenos aires'],country:'AR',region:'southAmericaEast',lat:-34.60,lon:-58.37},
    {name:'カヤオ',aliases:['カヤオ','callao'],country:'PE',region:'southAmericaWest',lat:-12.05,lon:-77.15},
    {name:'バルパライソ',aliases:['バルパライソ','valparaiso'],country:'CL',region:'southAmericaWest',lat:-33.03,lon:-71.63},
    {name:'ダーバン',aliases:['ダーバン','durban'],country:'ZA',region:'southAfrica',lat:-29.88,lon:31.05},
    {name:'ケープタウン',aliases:['ケープタウン','cape town'],country:'ZA',region:'southAfrica',lat:-33.92,lon:18.43},
    {name:'モンバサ',aliases:['モンバサ','mombasa'],country:'KE',region:'africa',lat:-4.04,lon:39.67},
    {name:'タンジェメッド',aliases:['タンジェ','tanger med','tangier'],country:'MA',region:'mediterranean',lat:35.89,lon:-5.50}
  ];

  const countryHints=[
    [/日本|japan/i,'japan'],[/韓国|korea/i,'eastAsia'],[/中国|china/i,'eastAsia'],[/台湾|taiwan/i,'eastAsia'],
    [/シンガポール|singapore|マレーシア|malaysia|タイ|thailand|ベトナム|vietnam|インドネシア|indonesia|フィリピン|philippines/i,'southeastAsia'],
    [/オーストラリア|australia|ニュージーランド|new zealand/i,'oceania'],[/アメリカ|米国|usa|u\.s\.|canada|カナダ/i,'northAmerica'],
    [/オランダ|ドイツ|ベルギー|英国|イギリス|フランス|netherlands|germany|belgium|united kingdom|france/i,'northEurope'],
    [/スペイン|イタリア|ギリシャ|トルコ|spain|italy|greece|turkey/i,'mediterranean'],
    [/ブラジル|アルゼンチン|ペルー|チリ|brazil|argentina|peru|chile/i,'southAmerica'],
    [/南アフリカ|south africa/i,'southAfrica'],[/アラブ首長国連邦|サウジ|オマーン|uae|saudi|oman/i,'middleEast']
  ];

  function $(id){return document.getElementById(id)}
  function userPrefs(){try{return window.SKDGUserPreferencesV11?.read?.()||{autoScroll:false}}catch{return{autoScroll:false}}}
  function allowScroll(){return Boolean(userPrefs().autoScroll)}
  function emit(name,detail={}){try{window.dispatchEvent(new CustomEvent(name,{detail}))}catch{}}
  function setQuick(id,value){const el=$(id);if(!el||value==null||value==='')return;el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}
  function secureEraseBuffer(buffer){if(!buffer)return;try{new Uint8Array(buffer).fill(0)}catch(_e){}}
  function disposeWorkbook(workbook){
    if(!workbook)return;
    try{
      if(workbook.Sheets&&typeof workbook.Sheets==='object')Object.keys(workbook.Sheets).forEach(name=>{try{delete workbook.Sheets[name]}catch(_e){workbook.Sheets[name]=null}});
      if(Array.isArray(workbook.SheetNames))workbook.SheetNames.length=0;
    }catch(_e){}
  }
  function purgeTransientExcel(){
    disposeWorkbook(transientWorkbook);
    secureEraseBuffer(transientBuffer);
    transientWorkbook=null;
    transientBuffer=null;
    const input=$('ctuExcelFile');if(input)input.value='';
  }
  function sanitizeFields(fields){
    const f=fields||{};
    return {
      loadingPort:text(f.loadingPort),dischargePort:text(f.dischargePort),refNo:text(f.refNo),containerNo:text(f.containerNo),
      cargoName:text(f.cargoName),unNumbers:text(f.unNumbers),packageCount:Number.isFinite(f.packageCount)?f.packageCount:null,
      massT:Number.isFinite(f.massT)?f.massT:null,massKind:text(f.massKind),length:Number.isFinite(f.length)?f.length:null,
      width:Number.isFinite(f.width)?f.width:null,height:Number.isFinite(f.height)?f.height:null
    };
  }
  function text(v){return String(v??'').replace(/\u0000/g,'').replace(/[\r\n]+/g,' ').replace(/[\s　]+/g,' ').trim()}
  function key(v){return text(v).toLowerCase().replace(/[\s　:：()（）\[\]【】._\-\/]/g,'')}
  function num(v){const m=text(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/);return m?Number(m[0]):NaN}
  function esc(v){return text(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function cleanValue(v,labels){let out=text(v);for(const label of labels)out=out.replace(new RegExp('^'+label.source+'\\s*[：:]?\\s*','i'),'');return out.trim()}

  function workbookRows(workbook){
    const rows=[];
    workbook.SheetNames.forEach(sheet=>{
      const ws=workbook.Sheets[sheet];
      const matrix=window.XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false,blankrows:false});
      matrix.forEach((cells,index)=>rows.push({sheet,row:index+1,cells:cells.map(text)}));
    });
    return rows;
  }

  function rightValue(row,index){
    for(let j=index+1;j<Math.min(row.cells.length,index+6);j++){const v=text(row.cells[j]);if(v)return v}
    return '';
  }

  function findLabelValue(rows,patterns){
    for(let r=0;r<rows.length;r++){
      const row=rows[r];
      for(let c=0;c<row.cells.length;c++){
        const raw=text(row.cells[c]),normalized=key(raw);
        if(!raw)continue;
        if(patterns.some(p=>p.test(normalized)||p.test(raw))){
          const inline=raw.match(/[：:]\s*(.+)$/)?.[1];
          let value=text(inline)||rightValue(row,c);
          if(!value){
            for(let rr=r+1;rr<Math.min(rows.length,r+4);rr++){
              value=text(rows[rr].cells[c]);if(value)break;
            }
          }
          value=cleanValue(value,patterns);
          if(value&&!patterns.some(p=>p.test(key(value))))return {value,sheet:row.sheet,row:row.row,column:c+1};
        }
      }
    }
    return null;
  }

  function findColumn(cells,patterns){const keys=cells.map(key);for(let i=0;i<keys.length;i++)if(patterns.some(p=>p.test(keys[i])))return i;return -1}
  function parseCargoRows(rows){
    const result=[];
    for(const sheet of [...new Set(rows.map(r=>r.sheet))]){
      const sr=rows.filter(r=>r.sheet===sheet);let header=-1,cols=null;
      for(let i=0;i<sr.length;i++){
        const cells=sr[i].cells;
        const un=findColumn(cells,[/^国連番号$/,/^unnumber$/,/^un番号$/]);
        const target=findColumn(cells,[/^検査対象$/,/^対象$/]);
        const gross=findColumn(cells,[/^gwkg$/,/^総質量(?:kg)?$/,/^grossweight(?:kg)?$/]);
        const net=findColumn(cells,[/^nwkg$/,/^正味質量(?:kg)?$/,/^netweight(?:kg)?$/]);
        if(un>=0&&(target>=0||gross>=0||net>=0)){
          cols={un,target,gross,net,name:findColumn(cells,[/^品名$/,/^貨物名$/,/^properShippingName$/]),count:findColumn(cells,[/^個数$/,/^数量$/]),length:findColumn(cells,[/^長さ(?:m|mm)?$/,/^全長(?:m|mm)?$/]),width:findColumn(cells,[/^幅(?:m|mm)?$/,/^全幅(?:m|mm)?$/]),height:findColumn(cells,[/^高さ(?:m|mm)?$/,/^全高(?:m|mm)?$/])};header=i;break;
        }
      }
      if(header<0||!cols)continue;
      for(let i=header+1;i<sr.length;i++){
        const c=sr[i].cells;const un=text(c[cols.un]).match(/(?:UN\s*)?(\d{4})/i)?.[1];
        if(!un)continue;
        const target=cols.target>=0?text(c[cols.target]):'';
        if(target&&target!=='対象')continue;
        result.push({sheet,row:sr[i].row,un:'UN'+un,name:cols.name>=0?text(c[cols.name]):'',count:cols.count>=0?num(c[cols.count]):NaN,grossKg:cols.gross>=0?num(c[cols.gross]):NaN,netKg:cols.net>=0?num(c[cols.net]):NaN,length:cols.length>=0?dimensionMeters(c[cols.length],sr[header].cells[cols.length]):NaN,width:cols.width>=0?dimensionMeters(c[cols.width],sr[header].cells[cols.width]):NaN,height:cols.height>=0?dimensionMeters(c[cols.height],sr[header].cells[cols.height]):NaN});
      }
    }
    return result;
  }
  function dimensionMeters(value,header){const n=num(value);if(!Number.isFinite(n))return NaN;return /mm/i.test(text(header))||n>100?n/1000:n}
  function sumFinite(list,field){const values=list.map(x=>x[field]).filter(Number.isFinite);return values.length?values.reduce((a,b)=>a+b,0):NaN}
  function firstFinite(list,field){return list.map(x=>x[field]).find(Number.isFinite)}

  function extractFields(rows,cargoRows){
    const patterns={
      loadingPort:[/^船積港$/,/^積出港$/,/^積港$/,/^積地$/,/^portofloading$/,/^loadingport$/,/^pol$/],
      dischargePort:[/^陸揚港$/,/^揚港$/,/^揚地$/,/^仕向港$/,/^portofdischarge$/,/^dischargeport$/,/^pod$/],
      refNo:[/^申請番号$/,/^案件番号$/,/^受付番号$/,/^applicationnumber$/,/^referencenumber$/],
      containerNo:[/^コンテナ番号$/,/^コンテナno$/,/^containernumber$/,/^containerno$/],
      cargoName:[/^貨物名$/,/^品名$/,/^商品名$/,/^cargodescription$/,/^descriptionofgoods$/],
      grossMass:[/^貨物総質量$/,/^総質量$/,/^総重量$/,/^gwkg$/,/^grossweight$/],
      netMass:[/^正味質量$/,/^nwkg$/,/^netweight$/],
      length:[/^貨物長さ$/,/^全長$/,/^length$/],width:[/^貨物幅$/,/^全幅$/,/^width$/],height:[/^貨物高さ$/,/^全高$/,/^height$/]
    };
    const found={};Object.entries(patterns).forEach(([name,p])=>found[name]=findLabelValue(rows,p));
    let massKg=sumFinite(cargoRows,'grossKg'),massKind='検査対象行のG/W合計';
    if(!Number.isFinite(massKg)){massKg=sumFinite(cargoRows,'netKg');massKind='検査対象行のN/W合計'}
    if(!Number.isFinite(massKg)&&found.grossMass){massKg=num(found.grossMass.value);massKind='申請書の総質量'}
    if(!Number.isFinite(massKg)&&found.netMass){massKg=num(found.netMass.value);massKind='申請書の正味質量'}
    const names=[...new Set(cargoRows.map(x=>x.name||x.un).filter(Boolean))];
    const firstOrFallback=(field,entry)=>{const first=firstFinite(cargoRows,field);return Number.isFinite(first)?first:dimensionMeters(entry?.value,entry?.value)};
    const counts=cargoRows.map(x=>x.count).filter(Number.isFinite);
    return {
      loadingPort:found.loadingPort?.value||'',dischargePort:found.dischargePort?.value||'',refNo:found.refNo?.value||'',containerNo:found.containerNo?.value||'',
      cargoName:names.slice(0,5).join('／')||found.cargoName?.value||'',unNumbers:[...new Set(cargoRows.map(x=>x.un).filter(Boolean))].join('、'),packageCount:counts.length?counts.reduce((a,b)=>a+b,0):NaN,
      massT:Number.isFinite(massKg)?massKg/1000:NaN,massKind,
      length:firstOrFallback('length',found.length),width:firstOrFallback('width',found.width),height:firstOrFallback('height',found.height),
      sources:found
    };
  }

  async function readWorkbook(file){
    if(!window.XLSX)throw new Error('Excel解析ライブラリを読み込めませんでした。通信状態を確認して再度お試しください。');
    const ext=(file.name.split('.').pop()||'').toLowerCase();if(!['xls','xlsx'].includes(ext))throw new Error('Excel形式（.xls または .xlsx）を選択してください。');
    const buffer=await file.arrayBuffer();let last;
    for(const options of [{type:'array',cellText:true,cellDates:true},{type:'array',cellText:true,cellDates:true,codepage:932},{type:'array',cellText:true,cellDates:true,codepage:65001}]){
      try{return {workbook:window.XLSX.read(buffer,options),buffer}}catch(error){last=error}
    }
    secureEraseBuffer(buffer);
    throw new Error('Excel申請書を読み取れませんでした。ファイルをExcelで開き、内容を変更せず保存し直してから再度お試しください。'+(last?.message?'（'+last.message+'）':''));
  }

  function normalizePort(v){return text(v).toLowerCase().replace(/(?:港|埠頭|ふ頭|ターミナル|terminal|port)/gi,'').replace(/[\s　._\-\/()（）]/g,'')}
  function resolvePort(value){
    const raw=text(value),n=normalizePort(raw);if(!n)return null;
    let best=null;
    PORTS.forEach(p=>p.aliases.forEach(a=>{const an=normalizePort(a);if(!an)return;let score=0;if(n===an)score=100;else if(n.includes(an)||an.includes(n))score=Math.min(n.length,an.length)*4;if(score>(best?.score||0))best={...p,score,matched:a,confidence:score>=100?'high':'medium'}}));
    if(best)return best;
    for(const [rx,region] of countryHints)if(rx.test(raw))return {name:raw,region,lat:null,lon:null,confidence:'low',matched:'国・地域名'};
    return {name:raw,region:'unknown',lat:null,lon:null,confidence:'low',matched:'未登録港'};
  }
  function haversineNm(a,b){if(!Number.isFinite(a?.lat)||!Number.isFinite(b?.lat))return NaN;const R=3440.065,toRad=x=>x*Math.PI/180,dLat=toRad(b.lat-a.lat),dLon=toRad(b.lon-a.lon),q=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
  function winterNorth(month){return [10,11,12,1,2,3].includes(Number(month))}
  function group(region){if(['japan','eastAsia'].includes(region))return'eastAsia';if(['northEurope','mediterranean'].includes(region))return'europe';if(['northAmericaWest','northAmericaEast','northAmerica'].includes(region))return'northAmerica';if(['southAmericaEast','southAmericaWest','southAmerica'].includes(region))return'southAmerica';return region}
  function routeDescription(a,b){
    const pair=[group(a.region),group(b.region)].sort().join('|');
    if(a.country==='JP'&&b.country==='JP')return'日本沿岸の一般的な内航ルート';
    if(pair==='eastAsia|eastAsia')return'東シナ海・黄海・日本近海を経由する東アジア域内ルート';
    if(pair==='eastAsia|southeastAsia')return'東シナ海－南シナ海を経由するアジア域内ルート';
    if(pair==='eastAsia|northAmerica')return b.region==='northAmericaWest'||a.region==='northAmericaWest'?'北太平洋横断ルート':'北太平洋－パナマ運河方面を経由する長距離ルート';
    if(pair==='europe|northAmerica')return'北大西洋横断ルート';
    if(pair==='eastAsia|europe')return'南シナ海－マラッカ海峡－インド洋－スエズ運河－地中海を経由する一般的ルート';
    if(pair==='europe|southeastAsia')return'マラッカ海峡－インド洋－スエズ運河－地中海を経由する一般的ルート';
    if(pair.includes('oceania')&&pair.includes('europe'))return'インド洋・喜望峰またはスエズ運河方面を含む長距離ルート';
    if(pair.includes('southAfrica'))return'インド洋または南大西洋・喜望峰周辺を含むルート';
    if(pair==='eastAsia|oceania'||pair==='oceania|southeastAsia')return'西太平洋・南シナ海または珊瑚海方面を経由するルート';
    if(pair==='europe|europe')return'北海・英仏海峡・地中海等を経由する欧州域内ルート';
    return`${a.name}から${b.name}への一般的な海上ルート`;
  }
  function inferRoute(originText,destinationText,month){
    const origin=resolvePort(originText),destination=resolvePort(destinationText);if(!originText||!destinationText)throw new Error('船積港と陸揚港を入力してください。');
    const distance=haversineNm(origin,destination),ga=group(origin.region),gb=group(destination.region),pair=[ga,gb].sort().join('|');let area='seaB',reasons=[];
    if(origin.country==='JP'&&destination.country==='JP'){area='seaA';reasons.push('日本国内の沿岸航海として推定')}
    else if(ga==='eastAsia'&&gb==='eastAsia'&&(!Number.isFinite(distance)||distance<=2500)){area='seaA';reasons.push('東アジア域内の比較的短い航海として推定')}
    else if((pair==='eastAsia|northAmerica'&&winterNorth(month))||(pair==='europe|northAmerica'&&winterNorth(month))){area='seaC';reasons.push('北太平洋または北大西洋の冬季横断航海として保守的に推定')}
    else if(pair.includes('southAfrica')||(pair.includes('oceania')&&pair.includes('europe'))||(Number.isFinite(distance)&&distance>10500)){area='seaC';reasons.push('長距離外洋航海または喜望峰周辺を含む可能性から保守的に推定')}
    else if((ga===gb&&Number.isFinite(distance)&&distance<1800)||pair==='europe|europe'){area='seaA';reasons.push('同一地域内の比較的短い航海として推定')}
    else{area='seaB';reasons.push('外洋区間を含む一般的な国際航海として推定')}
    if(origin.region==='unknown'||destination.region==='unknown')reasons.push('港の位置を一意に特定できないため、海域Bを初期候補とし手動確認が必要');
    const confidence=origin.confidence==='high'&&destination.confidence==='high'?'高':origin.region!=='unknown'&&destination.region!=='unknown'?'中':'低';
    return {origin,destination,month:Number(month)||null,distanceNm:Number.isFinite(distance)?Math.round(distance):null,area,areaLabel:{seaA:'海域A',seaB:'海域B',seaC:'海域C'}[area],route:routeDescription(origin,destination),confidence,reasons};
  }

  function renderImportSummary(fields,cargoRows){
    const items=[
      ['船積港',fields.loadingPort||'未取得'],['陸揚港',fields.dischargePort||'未取得'],['貨物質量',Number.isFinite(fields.massT)?fields.massT.toLocaleString('ja-JP',{maximumFractionDigits:3})+' t（'+fields.massKind+'）':'未取得'],
      ['貨物名',fields.cargoName||'未取得'],['個数',Number.isFinite(fields.packageCount)?fields.packageCount.toLocaleString('ja-JP')+'個':'未取得'],['コンテナ番号',fields.containerNo||'未取得'],['案件番号',fields.refNo||'未取得'],['対象危険物',fields.unNumbers||'未取得']
    ];
    $('ctuExcelSummary').innerHTML=items.map(([a,b])=>`<div class="import-summary-item"><strong>${esc(a)}</strong><span>${esc(b)}</span></div>`).join('');
  }
  function applyFields(fields){
    if(fields.loadingPort)$('loadingPort').value=fields.loadingPort;if(fields.dischargePort)$('dischargePort').value=fields.dischargePort;if(fields.refNo)$('refNo').value=fields.refNo;
    if(fields.cargoName)$('cargoDescription').value=fields.cargoName;if(fields.unNumbers)$('unNumbers').value=fields.unNumbers;if(Number.isFinite(fields.packageCount))$('packageCount').value=fields.packageCount;if(fields.containerNo)$('containerNumber').value=fields.containerNo;
    if(Number.isFinite(fields.massT)&&fields.massT>0)$('mass').value=Number(fields.massT.toFixed(3));if(Number.isFinite(fields.width)&&fields.width>0)$('width').value=Number(fields.width.toFixed(3));if(Number.isFinite(fields.length)&&fields.length>0)$('length').value=Number(fields.length.toFixed(3));if(Number.isFinite(fields.height)&&fields.height>0)$('cargoHeight').value=Number(fields.height.toFixed(3));
    // v1.3.12: 案件名（任意）は新規案件で自動生成しない。貨物名は貨物名欄だけへ反映する。
    if(Number.isFinite(fields.massT)&&fields.massT>0)setQuick('quickMass',Number(fields.massT.toFixed(3)));
    if(fields.cargoName)setQuick('quickCargoDescription',fields.cargoName);
  }
  function parseWorkbook(workbook){const rows=workbookRows(workbook),cargoRows=parseCargoRows(rows),fields=extractFields(rows,cargoRows);return {rows,cargoRows,fields}}
  async function handleFile(file){
    if(!file)return;
    purgeTransientExcel();
    $('ctuExcelStatus').textContent='Excel申請書を端末内で読み込んでいます…';$('ctuExcelStatus').className='import-status';
    let parsed=null;
    try{
      const loaded=await readWorkbook(file);
      transientWorkbook=loaded.workbook;
      transientBuffer=loaded.buffer;
      parsed=parseWorkbook(transientWorkbook);
      const cargoRows=parsed.cargoRows,fields=parsed.fields;
      state.importedAt=new Date().toISOString();
      state.fields=sanitizeFields(fields);
      applyFields(fields);
      renderImportSummary(fields,cargoRows);
      $('ctuExcelResult').hidden=false;
      $('ctuExcelStatus').textContent='Excel申請書を読み込み、入力欄へ反映しました。Excel原本は保存せず、一時解析データを破棄しました。自動取得値を申請書原本で確認してください。';
      $('ctuExcelStatus').className='import-status is-ok';
      if(fields.loadingPort&&fields.dischargePort)applyRoute(true);
      emit('sk:ctu-excel-imported',{fields:state.fields,routeEstimate:state.routeEstimate||null});
    }catch(error){
      $('ctuExcelStatus').textContent=error.message||'Excel申請書を読み取れませんでした。';$('ctuExcelStatus').className='import-status is-error';
    }finally{
      if(parsed){
        if(Array.isArray(parsed.rows))parsed.rows.length=0;
        if(Array.isArray(parsed.cargoRows))parsed.cargoRows.length=0;
      }
      parsed=null;
      purgeTransientExcel();
    }
  }

  function applyRoute(silent){
    try{const estimate=inferRoute($('loadingPort').value,$('dischargePort').value,$('departureMonth').value);state.routeEstimate=estimate;$('routeEstimate').hidden=false;$('routeEstimate').innerHTML=`<div class="route-estimate-head"><strong>推定結果：${esc(estimate.areaLabel)}</strong><span>推定確度 ${esc(estimate.confidence)}</span></div><p><strong>想定航路：</strong>${esc(estimate.route)}</p>${estimate.distanceNm?`<p><strong>港間の大圏距離（参考）：</strong>約 ${estimate.distanceNm.toLocaleString('ja-JP')} 海里</p>`:''}<p><strong>推定理由：</strong>${esc(estimate.reasons.join('。'))}</p><p class="route-caution">この結果は港名と一般的な航路からの簡易推定です。実際の寄港地、船社の予定航路、季節、気象・海象、船舶のCargo Securing Manualを確認し、必要な場合はより厳しい海域を手動選択してください。</p>`;$('transportPreset').value=estimate.area;window.applyTransportPreset?.();setQuick('quickTransport',estimate.area);$('route').value=`${$('loadingPort').value} → ${$('dischargePort').value}／${estimate.route}／推定${estimate.areaLabel}`;window.updateSummary?.();if(!silent&&allowScroll())$('routeEstimate').scrollIntoView({behavior:'auto',block:'nearest'})}catch(error){if(!silent)alert(error.message||'航路を推定できませんでした。')}
  }
  function clearImportedField(id,importedValue){
    const el=$(id);if(!el)return;
    const current=text(el.value),expected=text(importedValue);
    if(!expected||current===expected)el.value='';
  }
  function clearImport(){
    const f=state.fields||{};
    clearImportedField('loadingPort',f.loadingPort);clearImportedField('dischargePort',f.dischargePort);clearImportedField('refNo',f.refNo);
    clearImportedField('cargoDescription',f.cargoName);clearImportedField('unNumbers',f.unNumbers);clearImportedField('containerNumber',f.containerNo);
    if(f.packageCount!==null&&Number($('packageCount')?.value)===Number(f.packageCount))$('packageCount').value='';
    if(f.massT!==null&&Number($('mass')?.value)===Number(Number(f.massT).toFixed(3)))$('mass').value='';
    if(f.width!==null&&Number($('width')?.value)===Number(Number(f.width).toFixed(3)))$('width').value='';
    if(f.length!==null&&Number($('length')?.value)===Number(Number(f.length).toFixed(3)))$('length').value='';
    if(f.height!==null&&Number($('cargoHeight')?.value)===Number(Number(f.height).toFixed(3)))$('cargoHeight').value='';
    state.importedAt='';state.fields={};state.routeEstimate=null;
    purgeTransientExcel();
    $('ctuExcelResult').hidden=true;$('ctuExcelSummary').innerHTML='';$('routeEstimate').hidden=true;$('routeEstimate').innerHTML='';
    $('ctuExcelStatus').textContent='取込データを消去しました。Excel原本は保存されていません。';$('ctuExcelStatus').className='import-status';emit('sk:ctu-excel-cleared');
    if(f.massT!==null&&Number($('quickMass')?.value)===Number(Number(f.massT).toFixed(3)))$('quickMass').value='';
    if(f.cargoName&&$('quickCargoDescription')?.value===f.cargoName)$('quickCargoDescription').value='';
    window.updateSummary?.();
  }
  function openFilePicker(input){
    if(!input)return;
    try{if(typeof input.showPicker==='function'){input.showPicker();return}}catch(_e){}
    try{input.click()}catch(_e){}
  }
  function init(){
    const input=$('ctuExcelFile'),drop=$('ctuExcelDropZone');if(!input||!drop)return;
    if(drop.dataset.ctuExcelImporterBound==='1')return;drop.dataset.ctuExcelImporterBound='1';
    const month=$('departureMonth');if(month&&!month.value)month.value=String(new Date().getMonth()+1);
    // The file input is visible in v1.3.3 and opens the native picker directly.
    // The surrounding drop zone is a secondary convenience path only.
    drop.addEventListener('click',e=>{if(e.target===input||e.target.closest?.('#ctuExcelFile'))return;openFilePicker(input)});
    drop.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openFilePicker(input)}});
    input.addEventListener('change',()=>handleFile(input.files&&input.files[0]));
    ['dragenter','dragover'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.add('is-dragover')}));
    ['dragleave','drop'].forEach(ev=>drop.addEventListener(ev,e=>{e.preventDefault();drop.classList.remove('is-dragover')}));
    drop.addEventListener('drop',e=>handleFile(e.dataTransfer?.files?.[0]));
    $('inferSeaArea')?.addEventListener('click',()=>applyRoute(false));$('clearCtuExcel')?.addEventListener('click',clearImport);
    ['loadingPort','dischargePort','departureMonth'].forEach(id=>$(id)?.addEventListener('change',()=>{if(text($('loadingPort')?.value)&&text($('dischargePort')?.value))applyRoute(true)}));
  }
  window.ISSCTUExcelRoute={getState:()=>JSON.parse(JSON.stringify(state)),inferRoute,resolvePort,parseWorkbook,handleFile,clearImport};
  if(document.readyState==='loading')window.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.addEventListener('pagehide',purgeTransientExcel);
  window.addEventListener('beforeunload',purgeTransientExcel);
})();
