(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fire=(el,type='input')=>el?.dispatchEvent(new Event(type,{bubbles:true}));

  const SPECS={
    dry20:{label:'20FT ドライコンテナ',inside:{l:5.900,w:2.352,h:2.395},door:{w:2.340,h:2.292},source:'Hapag-Lloyd 20\' Standard',url:'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-standard.html'},
    dry40:{label:'40FT ドライコンテナ',inside:{l:12.032,w:2.352,h:2.395},door:{w:2.340,h:2.292},source:'Hapag-Lloyd 40\' Standard',url:'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-standard.html'},
    reefer20:{label:'20FT リーファーコンテナ',inside:{l:5.450,w:2.280,h:2.159},door:{w:2.290,h:2.264},source:'Hapag-Lloyd 20\' Reefer',url:'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/20-reefer.html'},
    reefer40:{label:'40FT リーファーコンテナ',inside:{l:11.599,w:2.290,h:2.425},door:{w:2.290,h:2.557},source:'Hapag-Lloyd 40\' Reefer High Cube',url:'https://www.hapag-lloyd.com/en/services-information/cargo-fleet/container/40-reefer-high-cube.html'}
  };

  // v1.3.12: automatic photo analysis only; no large analysis toolbar.
  const state={lastCanvasSignature:'',lastPrediction:null,userTouchedAngle:false,userTouchedCount:false,userTouchedLength:false,userTouchedWidth:false,userTouchedHeight:false,userTouchedReference:false,userTouchedPhotoMeasured:false,autoTimer:null};

  function num(id){return Math.max(0,Number($(id)?.value)||0)}
  function selectedSpec(){if($('quickCtu')?.value!=='container')return null;return SPECS[$('quickContainerSpec')?.value||'dry20']||SPECS.dry20}
  function selectedSpecKey(){return $('quickCtu')?.value==='container'?($('quickContainerSpec')?.value||'dry20'):''}
  function specText(s){return s?`${s.label}｜内寸 約 ${s.inside.l.toFixed(3)} × ${s.inside.w.toFixed(3)} × ${s.inside.h.toFixed(3)} m（L×W×H）`:'コンテナサイズ・種類を選択してください。'}

  function addStyleLink(){
    if(document.querySelector('link[data-v141-ctu-ai]'))return;
    const link=document.createElement('link');link.rel='stylesheet';link.href='../assets/css/v141-ctu-ai.css?v=141';link.dataset.v141CtuAi='1';document.head.append(link);
  }

  function setupContainerUi(){
    const quick=$('quickCtu');if(!quick)return;
    const quickGrid=quick.closest('.quick-grid');if(!quickGrid)return;
    const quickWrap=quick.closest('div');
    const quickLabel=quickWrap?.querySelector('label[for="quickCtu"]');if(quickLabel)quickLabel.textContent='CTU構造区分（計算用）';

    if(!$('quickContainerSpec')){
      const wrap=document.createElement('div');wrap.className='v141-container-select-wrap';wrap.innerHTML=`<label for="quickContainerSpec">コンテナサイズ・種類</label><select id="quickContainerSpec"><option value="dry20" selected>20FT ドライコンテナ</option><option value="dry40">40FT ドライコンテナ</option><option value="reefer20">20FT リーファーコンテナ</option><option value="reefer40">40FT リーファーコンテナ</option></select>`;
      quickWrap?.insertAdjacentElement('afterend',wrap);
    }

    if(!$('quickCargoLength')){
      const dims=[['quickCargoLength','貨物長さ（m）','length'],['quickCargoWidth','貨物幅（m）','width'],['quickCargoHeight','貨物高さ（m）','cargoHeight']];
      const anchor=$('quickCargoDescription')?.closest('div');
      let last=anchor;
      dims.forEach(([id,label])=>{const d=document.createElement('div');d.innerHTML=`<label for="${id}">${label}</label><input id="${id}" type="number" min="0" step="0.001" placeholder="申請書・実測・写真測定候補"><div class="hint">入力後も訂正できます。</div>`;last?.insertAdjacentElement('afterend',d);last=d;});
    }

    // v1.3.12: 大型の収納確認カードは廃止。判定はコンテナ選択欄の直下へ1行だけ表示する。

    const containerWrap=$('quickContainerSpec')?.closest('.v141-container-select-wrap');
    function syncContainerVisibility(){
      const isContainer=quick.value==='container';
      if(containerWrap)containerWrap.hidden=!isContainer;
      if(isContainer&&$('quickContainerSpec')&&!$('quickContainerSpec').value)$('quickContainerSpec').value='dry20';
    }
    quick.addEventListener('change',()=>{syncContainerVisibility();if(quick.value==='container')runFit(false);});
    syncContainerVisibility();
    const sel=$('quickContainerSpec');
    sel?.addEventListener('change',()=>{
      const s=selectedSpec();
      setAutomaticPhotoReference(s);
      const caseType=$('ctuCaseContainerType');if(caseType&&s)caseType.value=s.label;
      runFit(false);
    });

    [['quickCargoLength','length'],['quickCargoWidth','width'],['quickCargoHeight','cargoHeight']].forEach(([q,a])=>{
      $(q)?.addEventListener('input',()=>{const v=$(q).value;if($(a)){ $(a).value=v; fire($(a),'input'); fire($(a),'change'); } runFit(false);});
      $(a)?.addEventListener('input',()=>{if($(q)&&document.activeElement!==$(q))$(q).value=$(a).value;});
    });

    function syncSpecFromCase(){const t=String($('ctuCaseContainerType')?.value||'').toLowerCase();if(!t)return;let key='';if(/20/.test(t)&&/(reefer|リーファ)/.test(t))key='reefer20';else if(/40/.test(t)&&/(reefer|リーファ)/.test(t))key='reefer40';else if(/20/.test(t)&&/(dry|ドライ)/.test(t))key='dry20';else if(/40/.test(t)&&/(dry|ドライ)/.test(t))key='dry40';if(key&&$('quickContainerSpec')){$('quickContainerSpec').value=key;fire($('quickContainerSpec'),'change');}}
    $('ctuCaseContainerType')?.addEventListener('change',syncSpecFromCase);
    window.addEventListener('sk:ctu-case-applied',()=>setTimeout(syncSpecFromCase,0));

  }

  function setPhotoReference(axis){
    const s=selectedSpec(),out=$('photoStatus');if($('quickCtu')?.value!=='container'||!s){if(out)out.textContent='CTUの種類が汎用コンテナの場合だけコンテナ寸法を使用できます。';return;}
    const value=s.inside[axis],ref=$('referenceLength');if(ref){ref.value=value.toFixed(3);fire(ref,'input');}
    $('scaleMode')?.click();
    if(out){const name=axis==='w'?'内幅':axis==='h'?'内高':'内長';out.innerHTML=`${esc(s.label)}の参考${name} <strong>${value.toFixed(3)} m</strong> を基準寸法へ設定しました。写真上で対応する両端を2点指定してください。`;}
  }


  function setAutomaticPhotoReference(spec=selectedSpec(),prediction=null){
    if(!spec||$('quickCtu')?.value!=='container')return;
    const ref=$('referenceLength');
    if(ref&&!state.userTouchedReference){
      ref.value=spec.inside.w.toFixed(3);
      ref.dataset.v143AiSuggested='1';
      ref.dataset.v143ReferenceAxis='width';
      fire(ref,'input');
    }
    const measured=$('photoMeasuredLength');
    const d=prediction?.dimensionCandidates;
    if(measured&&d&&Number.isFinite(Number(d.width))&&!state.userTouchedPhotoMeasured){
      measured.value=Number(d.width).toFixed(2);
      measured.dataset.v143AiSuggested='1';
      measured.dataset.v143Axis='width';
      measured.classList.add('v141-ai-suggested');
      fire(measured,'input');
    }
  }

  function fitOrientation(s,l,w,h){
    const tries=[{name:'長さ方向そのまま',l,w},{name:'長さ・幅を90°入替え',l:w,w:l}];
    return tries.map(t=>{const inside=t.l<=s.inside.l&&t.w<=s.inside.w&&h<=s.inside.h;const door=t.w<=s.door.w&&h<=s.door.h;return {...t,h,inside,door,clear:{l:s.inside.l-t.l,w:s.inside.w-t.w,h:s.inside.h-h}}}).sort((a,b)=>Number(b.inside&&b.door)-Number(a.inside&&a.door)||Math.min(b.clear.l,b.clear.w,b.clear.h)-Math.min(a.clear.l,a.clear.w,a.clear.h))[0];
  }
  function candidatesForCargo(l,w,h){return Object.entries(SPECS).map(([key,s])=>({key,s,o:fitOrientation(s,l,w,h)})).filter(x=>x.o.inside&&x.o.door)}
  function runFit(){
    const s=selectedSpec(),l=num('quickCargoLength'),w=num('quickCargoWidth'),h=num('quickCargoHeight');
    if($('quickCtu')?.value!=='container'||!s||!(l&&w&&h))return null;
    const o=fitOrientation(s,l,w,h),alts=candidatesForCargo(l,w,h).filter(x=>x.key!==selectedSpecKey());
    return {fits:Boolean(o.inside&&o.door),insideOnly:Boolean(o.inside&&!o.door),orientation:o,alternatives:alts.map(x=>x.key)};
  }

  function compactCanvas(){
    const src=$('photoCanvas');if(!src||src.hidden||src.width<40||src.height<40)return null;
    const maxW=360,maxH=300,scale=Math.min(1,maxW/src.width,maxH/src.height),c=document.createElement('canvas');
    c.width=Math.max(120,Math.round(src.width*scale));c.height=Math.max(90,Math.round(src.height*scale));
    c.getContext('2d',{willReadFrequently:true}).drawImage(src,0,0,c.width,c.height);return c;
  }
  function canvasSignature(c){
    try{const ctx=c.getContext('2d',{willReadFrequently:true}),pts=[[.1,.1],[.5,.5],[.9,.8]],a=pts.map(([x,y])=>Array.from(ctx.getImageData(Math.floor(c.width*x),Math.floor(c.height*y),1,1).data.slice(0,3)).join('.')).join('|');return `${c.width}x${c.height}|${a}`;}catch(_){return `${c.width}x${c.height}`}
  }
  function analyzePhoto(){
    const c=compactCanvas();if(!c)return null;
    const ctx=c.getContext('2d',{willReadFrequently:true}),w=c.width,h=c.height,data=ctx.getImageData(0,0,w,h).data;
    const x0=Math.floor(w*.05),x1=Math.ceil(w*.95),y0=Math.floor(h*.35),y1=Math.ceil(h*.88);
    const dark=new Uint8Array(w*h);let brown=0,total=0,gray=0;
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?((mx-mn)/mx):0,L=.2126*r+.7152*g+.0722*b;total++;
      if(L<100&&sat<.42)dark[y*w+x]=1;
      if(r>72&&r<232&&g>38&&g<188&&b<150&&r>g*1.08&&g>b*1.05&&sat>.17)brown++;
      if(sat<.12&&L>75&&L<225)gray++;
    }
    const angles=[];
    for(let deg=-25;deg<=25;deg+=2){
      const m=Math.tan(deg*Math.PI/180),binW=3,bins=new Map();
      for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2)if(dark[y*w+x]){const k=Math.round((y-m*x)/binW);bins.set(k,(bins.get(k)||0)+1)}
      const sorted=[...bins.entries()].sort((a,b)=>b[1]-a[1]);const chosen=[];
      for(const row of sorted){if(chosen.every(p=>Math.abs(p[0]-row[0])>=5))chosen.push(row);if(chosen.length>=10)break;}
      angles.push({deg,m,binW,chosen,score:chosen.slice(0,4).reduce((s,p)=>s+p[1],0)});
    }
    angles.sort((a,b)=>b.score-a.score);const best=angles[0];
    const supports=[];
    if(best){
      for(const [k,count] of best.chosen){
        let hit=0,segments=14;const bline=k*best.binW;
        for(let s=0;s<segments;s++){
          const xa=Math.floor(x0+(x1-x0)*s/segments),xb=Math.floor(x0+(x1-x0)*(s+1)/segments);let ok=false;
          for(let x=xa;x<xb&&!ok;x++){
            const yy=Math.round(best.m*x+bline);if(yy<y0||yy>=y1)continue;
            for(let y=Math.max(y0,yy-3);y<=Math.min(y1-1,yy+3);y++){if(dark[y*w+x]){ok=true;break;}}
          }
          if(ok)hit++;
        }
        const support=hit/segments;if(support>=.65)supports.push({k,count,support});
      }
    }
    const count=Math.max(0,Math.min(8,supports.length));
    const angle=best&&count?Math.max(0,Math.min(90,Math.round(Math.abs(best.deg)*10)/10)):null;
    const thickness=[];
    if(best&&supports.length){
      for(const row of supports.slice(0,8)){
        const bline=row.k*best.binW;
        for(let sidx=1;sidx<=8;sidx++){
          const x=Math.round(x0+(x1-x0)*sidx/9),yy=Math.round(best.m*x+bline);if(yy<y0||yy>=y1)continue;
          let top=yy,bottom=yy;while(top>y0&&dark[(top-1)*w+x]&&yy-top<14)top--;while(bottom<y1-1&&dark[(bottom+1)*w+x]&&bottom-yy<14)bottom++;
          const t=bottom-top+1;if(t>1)thickness.push(t);
        }
      }
    }
    thickness.sort((a,b)=>a-b);const bandThicknessPx=thickness.length?thickness[Math.floor(thickness.length/2)]:null;
    // 細い黒色の平帯は帯鉄候補。幅広の帯状材はウェビング候補。商品名までは画像から確定しない。
    const materialCandidate=count>0&&bandThicknessPx!=null&&bandThicknessPx<=8?'steel':(count>0?'web':null);

    // 貨物外形の低確度候補。単眼写真なので確定値ではなく、選択中コンテナの既知内寸との画像比から参考寸法だけを出す。
    const cargoMask=[];const mx0=Math.floor(w*.04),mx1=Math.ceil(w*.96),my0=Math.floor(h*.18),my1=Math.ceil(h*.80);
    for(let y=my0;y<my1;y+=2)for(let x=mx0;x<mx1;x+=2){
      const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?((mx-mn)/mx):0,L=.2126*r+.7152*g+.0722*b;
      const prevY=Math.max(my0,y-3),j=(prevY*w+x)*4,pr=data[j],pg=data[j+1],pb=data[j+2],pL=.2126*pr+.7152*pg+.0722*pb;
      const brownish=r>70&&g>35&&b<160&&r>g*1.05&&g>b*.95&&sat>.13;
      const objectLike=brownish||L<92||sat>.23||Math.abs(L-pL)>46;
      // 明るいコンテナ壁の縦リブだけを拾い過ぎないよう、上端の低彩度画素は除く。
      if(objectLike && !(y<h*.30&&sat<.12&&L>105))cargoMask.push([x,y]);
    }
    let cargoBox=null,dimensionCandidates=null;
    if(cargoMask.length>80){
      const xs=cargoMask.map(v=>v[0]).sort((a,b)=>a-b),ys=cargoMask.map(v=>v[1]).sort((a,b)=>a-b),q=(a,t)=>a[Math.max(0,Math.min(a.length-1,Math.floor((a.length-1)*t)))];
      const bx0=q(xs,.04),bx1=q(xs,.96),by0=q(ys,.04),by1=q(ys,.96),bw=Math.max(1,bx1-bx0),bh=Math.max(1,by1-by0);
      const fracW=bw/Math.max(1,(mx1-mx0)),fracH=bh/Math.max(1,(my1-my0));
      if(fracW>.15&&fracH>.12){
        cargoBox={x0:bx0,y0:by0,x1:bx1,y1:by1,widthFraction:fracW,heightFraction:fracH};
        const spec=selectedSpec();
        if(spec){
          const estW=Math.max(.20,Math.min(spec.inside.w*.95,spec.inside.w*fracW*.90));
          const estH=Math.max(.20,Math.min(spec.inside.h*.92,spec.inside.h*fracH*.70));
          // 単眼写真では奥行が最も不確か。見かけの縦横比から保守的な候補を作り、コンテナ内長は上限確認だけに使う。
          const apparentDepth=Math.max(.35,Math.min(.75,(bh/bw)*1.00));
          const estL=Math.max(.30,Math.min(spec.inside.l*.60,estW*apparentDepth));
          dimensionCandidates={length:Number(estL.toFixed(2)),width:Number(estW.toFixed(2)),height:Number(estH.toFixed(2)),confidence:'low',basis:`${spec.label}の参考内寸との画像比（単眼写真）`};
        }
      }
    }
    return {count,angle,brownFrac:total?brown/total:0,grayFrac:total?gray/total:0,supports,bestAngle:best?.deg??null,bandThicknessPx,materialCandidate,cargoBox,dimensionCandidates,signature:canvasSignature(c)};
  }

  function setAiField(id,value,touchedFlag){
    const el=$(id);if(!el||value==null||!Number.isFinite(Number(value)))return;
    if(touchedFlag&&state[touchedFlag])return;
    el.value=String(value);el.dataset.v141AiSuggested='1';el.classList.add('v141-ai-suggested');fire(el,'input');
  }
  function renderPhotoPrediction(p,source='auto'){
    state.lastPrediction=p;
    const count=p?.count||0,angle=p?.angle;
    if(count>0)setAiField('visibleLashings',count,'userTouchedCount');
    if(angle!=null)setAiField('photoAngleValue',angle,'userTouchedAngle');
    const dims=p?.dimensionCandidates;
    setAutomaticPhotoReference(selectedSpec(),p);
    if(dims){
      setAiField('quickCargoLength',dims.length,'userTouchedLength');
      setAiField('quickCargoWidth',dims.width,'userTouchedWidth');
      setAiField('quickCargoHeight',dims.height,'userTouchedHeight');
      runFit(false);
    }
    const wood=p&&p.brownFrac>.055;
    // 詳細AI候補パネルはv1.3.12で廃止。結果はかんたん入力欄のAI補助表示へ渡す。
    window.SKDGPhotoAI141={prediction:p,source};
  }
  function runPhotoPrediction(source='manual'){
    const p=analyzePhoto();
    if(!p){const st=$('fieldPhotoAnalysisStatus');if(st)st.textContent='写真AI：解析できる写真がまだ読み込まれていません。';return null;}
    state.lastCanvasSignature=p.signature;renderPhotoPrediction(p,source);
    window.dispatchEvent(new CustomEvent('sk:ctu-photo-ai-requested',{detail:{source:'v141',prediction:p}}));
    return p;
  }
  function waitForPhoto(source='upload'){
    clearTimeout(state.autoTimer);let tries=0,last='';
    const tick=()=>{
      tries++;const c=compactCanvas();if(c){const sig=canvasSignature(c);if(sig&&sig!==state.lastCanvasSignature&&sig!==last){last=sig;state.autoTimer=setTimeout(()=>{const c2=compactCanvas();if(c2&&canvasSignature(c2)===sig)runPhotoPrediction(source);else tick();},180);return;}}
      if(tries<70)state.autoTimer=setTimeout(tick,180);
      else{const st=$('fieldPhotoAnalysisStatus');if(st)st.textContent='写真AI：画像の読込完了を確認できませんでした。写真を再選択するか手入力してください。';}
    };tick();
  }
  function setupPhotoAiUi(){
    const body=$('photoStatus')?.closest('.result-details__body');if(!body)return;
    ['cameraInput','photoInput','v1PhotoInput'].forEach(id=>$(id)?.addEventListener('change',()=>waitForPhoto(id)));
    $('photoStage')?.addEventListener('drop',()=>waitForPhoto('drop'));
    window.addEventListener('sk:ctu-photo-loaded',()=>waitForPhoto('photo-loaded-event'));
    $('fieldAnalyzePhoto')?.addEventListener('click',()=>setTimeout(()=>runPhotoPrediction('field-button'),0));

    const a=$('photoAngleValue'),c=$('visibleLashings');
    a?.addEventListener('input',()=>{if(a.dataset.v141AiSuggested==='1'){delete a.dataset.v141AiSuggested;return;}state.userTouchedAngle=true;a.classList.remove('v141-ai-suggested');});
    c?.addEventListener('input',()=>{if(c.dataset.v141AiSuggested==='1'){delete c.dataset.v141AiSuggested;return;}state.userTouchedCount=true;c.classList.remove('v141-ai-suggested');});
    [['quickCargoLength','userTouchedLength'],['quickCargoWidth','userTouchedWidth'],['quickCargoHeight','userTouchedHeight']].forEach(([id,flag])=>$(id)?.addEventListener('input',e=>{if($(id).dataset.v141AiSuggested==='1'){delete $(id).dataset.v141AiSuggested;return;}if(e.isTrusted!==false)state[flag]=true;$(id).classList.remove('v141-ai-suggested');}));
    $('referenceLength')?.addEventListener('input',e=>{const el=$('referenceLength');if(el?.dataset.v143AiSuggested==='1'&&!e.isTrusted){return;}if(e.isTrusted){state.userTouchedReference=true;delete el.dataset.v143AiSuggested;delete el.dataset.v143ReferenceAxis;}});
    $('photoMeasuredLength')?.addEventListener('input',e=>{const el=$('photoMeasuredLength');if(el?.dataset.v143AiSuggested==='1'&&!e.isTrusted){return;}if(e.isTrusted){state.userTouchedPhotoMeasured=true;delete el.dataset.v143AiSuggested;}});
    $('measureMode')?.addEventListener('click',()=>{const el=$('photoMeasuredLength');if(el){delete el.dataset.v143AiSuggested;delete el.dataset.v143Axis;}state.userTouchedPhotoMeasured=false;});
    $('applyCount')?.addEventListener('click',()=>setTimeout(()=>{
      const measured=$('photoMeasuredLength');if(!measured?.value)return;
      const axis=measured.dataset.v143Axis||'length';const target=axis==='width'?'quickCargoWidth':axis==='height'?'quickCargoHeight':'quickCargoLength';
      if($(target)){$(target).value=measured.value;fire($(target),'input');}
    },0));
  }

  function snapshot(){
    const s=selectedSpec(),p=state.lastPrediction;
    return {containerSpec:selectedSpecKey(),containerLabel:s?.label||'',insideDimensionsM:s?{...s.inside}:null,doorOpeningM:s?{...s.door}:null,source:s?.source||'',sourceUrl:s?.url||'',cargoDimensionsM:{length:num('quickCargoLength'),width:num('quickCargoWidth'),height:num('quickCargoHeight')},photoAi:p?{lashingCount:p.count,projectedAngleDeg:p.angle,materialCandidate:p.materialCandidate||'',bandThicknessPx:p.bandThicknessPx??null,timberSupportCandidate:p.brownFrac>.055,cargoDimensionCandidatesM:p.dimensionCandidates||null,referenceDimensionM:num('referenceLength')||null,referenceAxis:$('referenceLength')?.dataset.v143ReferenceAxis||'',photoMeasuredLengthM:num('photoMeasuredLength')||null,photoMeasuredAxis:$('photoMeasuredLength')?.dataset.v143Axis||''}:null};
  }

  function init(){addStyleLink();setupContainerUi();setupPhotoAiUi();window.SKCTUContainerReference={specs:SPECS,snapshot,runFit:()=>runFit(true),selectedSpec};}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
