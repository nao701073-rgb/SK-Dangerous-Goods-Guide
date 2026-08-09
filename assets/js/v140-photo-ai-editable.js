(()=>{
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const root=$('quickEntryPanel');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const state={candidates:[],lastSignature:''};

  function setValue(id,value){
    const el=$(id); if(!el||value===undefined||value===null||value==='')return false;
    el.disabled=false; if(el.hasAttribute('readonly') && id!=='mslPointNumber')el.removeAttribute('readonly');
    el.value=String(value);
    el.dispatchEvent(new Event('change',{bubbles:true}));
    el.dispatchEvent(new Event('input',{bubbles:true}));
    el.classList.add('v140-ai-applied');
    setTimeout(()=>el.classList.remove('v140-ai-applied'),1800);
    return true;
  }
  function ensureEditable(){
    if(!root)return;
    root.querySelectorAll('input,select,textarea').forEach(el=>{
      if(el.type==='file'||el.type==='hidden'||el.id==='mslPointNumber')return;
      el.disabled=false;
      el.removeAttribute('readonly');
      el.removeAttribute('aria-readonly');
    });
    root.dataset.allInputsEditable='true';
  }
  ensureEditable();
  ['sk:ctu-excel-imported','sk:ctu-ai-applied','sk:ctu-photo-applied','sk:ctu-case-applied'].forEach(n=>window.addEventListener(n,ensureEditable));

  function sourceCanvas(){
    const c=$('photoCanvas');
    if(c && !c.hidden && c.width>40 && c.height>40)return c;
    const img=$('v1PhotoPreview');
    if(img && !img.hidden && img.naturalWidth>40){
      const x=document.createElement('canvas'),max=480,scale=Math.min(1,max/img.naturalWidth,max/img.naturalHeight);
      x.width=Math.max(1,Math.round(img.naturalWidth*scale));x.height=Math.max(1,Math.round(img.naturalHeight*scale));
      x.getContext('2d',{willReadFrequently:true}).drawImage(img,0,0,x.width,x.height); return x;
    }
    return null;
  }
  function compactCanvas(src){
    const maxW=320,maxH=240,s=Math.min(1,maxW/src.width,maxH/src.height),c=document.createElement('canvas');
    c.width=Math.max(80,Math.round(src.width*s));c.height=Math.max(60,Math.round(src.height*s));
    c.getContext('2d',{willReadFrequently:true}).drawImage(src,0,0,c.width,c.height);return c;
  }
  const med=a=>{const b=[...a].sort((x,y)=>x-y);return b.length?b[Math.floor(b.length/2)]:0};
  function groups(scores,threshold,minWidth=2){
    const out=[];let st=-1;
    for(let i=0;i<=scores.length;i++){
      const on=i<scores.length&&scores[i]>=threshold;
      if(on&&st<0)st=i;
      if(!on&&st>=0){if(i-st>=minWidth)out.push([st,i-1]);st=-1;}
    }return out;
  }
  function analyzePixels(){
    const src=sourceCanvas(); if(!src)return null;
    const c=compactCanvas(src),ctx=c.getContext('2d',{willReadFrequently:true}),{data}=ctx.getImageData(0,0,c.width,c.height),w=c.width,h=c.height;
    const y0=Math.floor(h*.12),y1=Math.ceil(h*.9),x0=Math.floor(w*.06),x1=Math.ceil(w*.94);
    const rowDark=Array(h).fill(0),rowN=Array(h).fill(0),colBrown=Array(w).fill(0),colN=Array(w).fill(0);
    let brown=0,gray=0,dark=0,total=0,gradX=0,gradY=0;
    const lum=(x,y)=>{const i=(y*w+x)*4;return data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722};
    for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
      const i=(y*w+x)*4,r=data[i],g=data[i+1],b=data[i+2],mx=Math.max(r,g,b),mn=Math.min(r,g,b),sat=mx?((mx-mn)/mx):0,L=r*.2126+g*.7152+b*.0722;
      total++;rowN[y]++;colN[x]++;
      if(L<62){rowDark[y]++;dark++;}
      const isBrown=r>70&&r<230&&g>38&&g<185&&b<145&&r>g*1.08&&g>b*1.08&&sat>.18;
      if(isBrown){brown++;colBrown[x]++;}
      if(sat<.12&&L>70&&L<220)gray++;
      if(x>x0&&x<x1-1&&y>y0&&y<y1-1){gradX+=Math.abs(lum(x+1,y)-lum(x-1,y));gradY+=Math.abs(lum(x,y+1)-lum(x,y-1));}
    }
    const rowScore=rowDark.map((v,i)=>rowN[i]?v/rowN[i]:0);
    const smooth=rowScore.map((_,i)=>{let s=0,n=0;for(let k=-1;k<=1;k++)if(rowScore[i+k]!=null){s+=rowScore[i+k];n++;}return n?s/n:0});
    const base=med(smooth.slice(y0,y1)),thr=Math.max(.22,base+.10);
    let bands=groups(smooth,thr,2).filter(([a,b])=>a>y0+3&&b<y1-3&&b-a<Math.max(3,h*.07));
    // Nearby rows belonging to the same strap are merged.
    const merged=[]; for(const g of bands){const p=merged.at(-1);if(p&&g[0]-p[1]<=Math.max(3,h*.025))p[1]=g[1];else merged.push([...g]);} bands=merged;
    const lineAngles=[];
    for(const [a,b] of bands.slice(0,12)){
      const cy=(a+b)/2,pts=[];
      for(let x=x0;x<x1;x+=Math.max(3,Math.floor(w/60))){let bestY=Math.round(cy),best=999;const ry=Math.max(5,Math.floor(h*.035));for(let y=Math.max(y0,Math.round(cy-ry));y<=Math.min(y1-1,Math.round(cy+ry));y++){const L=lum(x,y);if(L<best){best=L;bestY=y}}if(best<75)pts.push([x,bestY]);}
      if(pts.length>=8){const xm=pts.reduce((s,p)=>s+p[0],0)/pts.length,ym=pts.reduce((s,p)=>s+p[1],0)/pts.length;let num=0,den=0;pts.forEach(([x,y])=>{num+=(x-xm)*(y-ym);den+=(x-xm)*(x-xm)});if(den){const slope=num/den,deg=Math.abs(Math.atan(slope)*180/Math.PI);if(deg<=80)lineAngles.push(deg)}}
    }
    const brownFrac=total?brown/total:0,grayFrac=total?gray/total:0,darkFrac=total?dark/total:0,verticality=gradY?gradX/gradY:1;
    return {w,h,bands:bands.length,angle:lineAngles.length?med(lineAngles):null,brownFrac,grayFrac,darkFrac,verticality};
  }

  function addCandidate(arr,{key,label,value,confidence='低',note='',apply}){arr.push({key,label,value,confidence,note,apply,selected:confidence!=='低'});}
  function buildCandidates(m){
    const out=[];
    if(m.bands>=1&&m.bands<=12){
      addCandidate(out,{key:'lashingType',label:'固縛材',value:'ベルト・ウェビング系候補',confidence:m.bands<=8?'中':'低',note:'写真内の連続した暗色帯を検出。チェーン・ワイヤとの最終識別は目視確認してください。',apply:()=>{
        setValue('v1LashingType','webbing');setValue('quickMaterialCategory',m.brownFrac>.07?'combined':'tensile');
        const q=$('quickMaterial');if(q){const opt=[...q.options].find(o=>/web|belt|ウェビング|ベルト|ポリエステル/i.test(o.textContent+' '+o.value));if(opt)setValue('quickMaterial',opt.value)}
      }});
      addCandidate(out,{key:'count',label:'固縛本数',value:`約 ${m.bands} 本`,confidence:m.bands<=8?'中':'低',note:'写真内の横方向に連続する暗色帯から概算。隠れている固縛材は含まれません。',apply:()=>{setValue('quickCount',m.bands);setValue('visibleLashings',m.bands);setValue('v1LashingCount',m.bands)}});
    }
    if(m.angle!=null&&m.bands){
      const a=Math.max(0,Math.min(90,Math.round(m.angle)));
      addCandidate(out,{key:'angle',label:'鉛直角',value:`約 ${a}°`,confidence:'低',note:'画像内の暗色直線の傾きからの参考推定です。透視歪みがあるため、測定機能での確認を優先してください。',apply:()=>{setValue('photoAngleValue',a);setValue('quickAngle',a)}});
    }
    if(m.brownFrac>.055){
      addCandidate(out,{key:'support',label:'支保・当て材',value:'木材あり候補',confidence:m.brownFrac>.11?'中':'低',note:`木材色に近い領域を約${Math.round(m.brownFrac*100)}%検出。`,apply:()=>{
        setValue('quickMaterialCategory',m.bands?'combined':'support');setValue('quickSupportMaterial','timber');
      }});
    }
    if(m.verticality>1.22&&m.grayFrac>.12){
      addCandidate(out,{key:'ctu',label:'CTUの種類',value:'汎用コンテナ候補',confidence:'低',note:'金属面と縦方向の反復エッジを検出。写真だけでは型式・壁強度は確定しません。',apply:()=>setValue('quickCtu','container')});
    }
    return out;
  }
  function unresolvedText(){return '写真だけでは確定しない項目：輸送海域・貨物質量・貨物名、MSL／取付点MSL、メーカー定格、表面の清浄・湿潤状態、正確な支保力。これらは申請書・刻印・仕様書・現場確認値を入力してください。';}
  function render(cands,metrics){
    let box=$('v140PhotoAiBox');
    if(!box){
      const host=$('photoRecognitionPanel')||$('photoInputPanel'); if(!host)return;
      box=document.createElement('section');box.id='v140PhotoAiBox';box.className='v140-photo-ai-box';host.append(box);
    }
    const cards=cands.length?cands.map((c,i)=>`<label class="v140-ai-card"><span><input type="checkbox" data-v140-candidate="${i}" ${c.selected?'checked':''}> <strong>${esc(c.label)}</strong></span><b>${esc(c.value)}</b><small>確度：${esc(c.confidence)}　${esc(c.note)}</small></label>`).join(''):`<div class="v140-ai-empty"><strong>写真から安全に採用できる候補を作れませんでした。</strong><br>写真の向きや明るさを変えて再撮影するか、目視で入力してください。</div>`;
    const metricText=metrics?`画像補助解析：暗色帯 ${metrics.bands}、木材色領域 ${Math.round(metrics.brownFrac*100)}%、縦エッジ比 ${metrics.verticality.toFixed(2)}`:'';
    box.innerHTML=`<div class="v140-ai-head"><div><h3>写真AI入力候補（すべて訂正可）</h3><p>写真から見える範囲だけを候補化します。候補を反映しても入力欄はロックせず、全項目を後から自由に訂正できます。</p></div><button class="btn" id="v140AnalyzeAgain" type="button">写真を再解析</button></div><div class="v140-ai-grid">${cards}</div><p class="v140-ai-unresolved">${esc(unresolvedText())}</p><p class="v140-ai-metrics">${esc(metricText)}</p><div class="v140-ai-actions"><button class="btn primary" id="v140ApplyCandidates" type="button">選択したAI候補を入力欄へ反映</button><button class="btn" id="v140SelectAllCandidates" type="button">候補をすべて選択</button></div><p class="v140-ai-status" id="v140AiStatus">反映後も、③の各入力欄を直接書き換えられます。</p>`;
    $('v140AnalyzeAgain')?.addEventListener('click',runAnalysis);
    $('v140SelectAllCandidates')?.addEventListener('click',()=>box.querySelectorAll('[data-v140-candidate]').forEach(x=>x.checked=true));
    $('v140ApplyCandidates')?.addEventListener('click',()=>{
      ensureEditable();let n=0;
      box.querySelectorAll('[data-v140-candidate]:checked').forEach(x=>{const c=state.candidates[Number(x.dataset.v140Candidate)];if(c?.apply){c.apply();n++}});
      ensureEditable();window.dispatchEvent(new CustomEvent('sk:ctu-ai-applied'));
      const st=$('v140AiStatus');if(st)st.textContent=`${n}件の候補を反映しました。すべての入力項目はこのまま訂正できます。`;
      root?.scrollIntoView?.({behavior:'smooth',block:'start'});
    });
  }
  function runAnalysis(){
    const st=$('fieldPhotoAnalysisStatus'); if(st)st.textContent='写真から固縛材・本数・角度・支保材等の候補を解析しています。';
    const work=()=>{
      const m=analyzePixels();
      if(!m){state.candidates=[];render([],null);if(st)st.textContent='解析する写真がありません。先に写真を撮影またはアップロードしてください。';return;}
      state.candidates=buildCandidates(m);render(state.candidates,m);
      if(st)st.textContent=`写真AI候補を${state.candidates.length}件作成しました。候補は確定値ではありません。選択して反映後、すべて訂正できます。`;
    };
    if('requestIdleCallback'in window)requestIdleCallback(work,{timeout:450});else setTimeout(work,30);
  }

  // Existing AI button also runs this local, lightweight photo prediction. No continuous DOM observation is used.
  $('fieldAnalyzePhoto')?.addEventListener('click',()=>setTimeout(runAnalysis,0));
  window.addEventListener('sk:ctu-photo-ai-requested',()=>setTimeout(runAnalysis,0));
  ['cameraInput','photoInput','v1PhotoInput'].forEach(id=>$(id)?.addEventListener('change',()=>setTimeout(runAnalysis,220)));

  // Make the editability explicit to the operator.
  if(root&&!$('v140EditableNotice')){
    const p=document.createElement('div');p.id='v140EditableNotice';p.className='notice info v140-editable-notice';p.innerHTML='<strong>入力後も訂正できます。</strong> 申請書取込・写真AI候補・登録済み案件から反映した値を含め、算出前後いつでも各入力欄を直接修正できます。修正後は再度「参考算出する」を押してください。';
    root.querySelector('h2')?.after(p);
  }
})();
