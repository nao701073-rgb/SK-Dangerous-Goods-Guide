(()=>{
  "use strict";
  const $=id=>document.getElementById(id);
  const HISTORY_KEY="iss-overpack-print-history-v3";
  const state={records:[],pages:[],labels:[]};
  const COMBINED_RECORDS_PER_PAGE=2;
  const TEXT_ONLY_RECORDS_PER_PAGE=8;
  const PLACARDS_PER_PAGE=4;
  const esc=value=>String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const normalizeUn=value=>String(value||"").normalize("NFKC").replace(/\bUN\s*/gi,"").replace(/\D/g,"").slice(-4).padStart(4,"0");
  const parseUnInput=value=>[...new Set(String(value||"").split(/[\s,、;；]+/).map(normalizeUn).filter(x=>/^\d{4}$/.test(x)&&x!=="0000"))];
  const db=()=>Array.isArray(window.UN_DATABASE)?window.UN_DATABASE:[];
  const labelMaster=()=>Array.isArray(window.LABEL_MASTER?.labels)?window.LABEL_MASTER.labels:[];
  const findRecord=un=>db().find(row=>String(row.unNumber||"").padStart(4,"0")===un);
  const chunk=(items,size)=>Array.from({length:Math.ceil(items.length/size)},(_,index)=>items.slice(index*size,index*size+size));

  const labelByClass=classValue=>{
    const value=String(classValue||"").trim();
    if(!value||value==="-") return null;
    const exact=labelMaster().find(item=>String(item.class)===value);
    const fallback=labelMaster().find(item=>String(item.id)===`class${value}`);
    return exact||fallback||null;
  };
  const stripAnd=value=>String(value||"").split(/\s+and\s+/i)[0].trim().replace(/[;,]+$/g,"").trim();

  function splitTopLevelOr(text){
    const source=String(text||"").trim(); const parts=[]; let depth=0,start=0;
    for(let i=0;i<source.length;i++){
      const ch=source[i]; if(ch==="("||ch==="[") depth++; else if(ch===")"||ch==="]") depth=Math.max(0,depth-1);
      if(depth===0&&source.slice(i,i+4).toLowerCase()===" or "){parts.push(source.slice(start,i).trim());start=i+4;i+=3;}
    }
    parts.push(source.slice(start).trim()); return parts.filter(Boolean);
  }
  function expandCandidate(segment){
    const candidates=[];
    const outside=segment.replace(/\([^)]*\)|\[[^\]]*\]/g," ").replace(/\s+/g," ").trim();
    if(outside) candidates.push({value:stripAnd(outside),preferred:true,source:"括弧外"});
    const pattern=/\(([^)]*)\)|\[([^\]]*)\]/g; let match;
    while((match=pattern.exec(segment))){
      const inner=String(match[1]||match[2]||"").trim();
      if(!inner||/^(including|contains?|mixture|solution containing)\b/i.test(inner)) continue;
      const cleaned=stripAnd(inner); if(cleaned) candidates.push({value:cleaned,preferred:false,source:"括弧内"});
    }
    if(!candidates.length&&segment.trim()) candidates.push({value:stripAnd(segment.trim()),preferred:true,source:"原文"});
    return candidates;
  }
  function nameCandidates(name){
    const raw=String(name||"").trim(); const output=[];
    splitTopLevelOr(raw).forEach((segment,groupIndex)=>expandCandidate(segment).forEach(item=>output.push({...item,groupIndex})));
    const seen=new Set(); return output.filter(item=>item.value&&!seen.has(item.value.toUpperCase())&&seen.add(item.value.toUpperCase()));
  }
  const isNos=record=>/\bN\.O\.S\.\b/i.test(String(record?.properShippingName||""))||String(record?.specialProvisions||"").includes("274");
  function labelsForRecord(record){
    const values=[record.class];
    String(record.subsidiaryRisk||"").split(/[\s,/]+/).filter(x=>x&&x!=="-").forEach(x=>values.push(x));
    return values.map(labelByClass).filter(Boolean);
  }
  function createResolved(un,record){
    const candidates=nameCandidates(record.properShippingName);
    return {un,record,candidates,selected:candidates[0]?.value||"",technicalName:"",include:true,labels:labelsForRecord(record),nos:isNos(record)};
  }
  function resolve(){
    const uns=parseUnInput($("unInput").value); state.records=[];
    const messages=[];
    if(!uns.length) messages.push({type:"error",text:"4桁の国連番号を1件以上入力してください。"});
    uns.forEach(un=>{
      const record=findRecord(un);
      if(!record) messages.push({type:"error",text:`UN${un}は危険物データベースに見つかりません。`});
      else if(!record.properShippingName) messages.push({type:"error",text:`UN${un}には英語正式品名が登録されていません。`});
      else {
        const resolved=createResolved(un,record);
        if(!resolved.labels.length) messages.push({type:"error",text:`UN${un}には主標札を特定できる等級データがありません。`});
        state.records.push(resolved);
      }
    });
    if(state.records.some(item=>item.nos)) messages.push({type:"warning",text:"N.O.S.品名があります。技術名は必要に応じて英語で入力してください（任意）。未入力でも印刷できます。"});
    if(state.records.length) messages.push({type:"info",text:`${state.records.length}件を照合しました。英語品名の候補と標札を確認してください。`});
    renderMessages(messages); renderResults(); buildPreview();
  }
  function renderMessages(messages){$("globalMessages").innerHTML=messages.map(m=>`<div class="message message--${m.type}">${esc(m.text)}</div>`).join("");}
  function renderResults(){
    $("resultCount").textContent=`${state.records.length}件`;
    if(!state.records.length){$("resultList").innerHTML='<p class="empty-state">照合できる危険物データがありません。</p>';return;}
    $("resultList").innerHTML=state.records.map((item,index)=>{
      const record=item.record; const labelText=item.labels.map(x=>x.class||x.nameJa).join(" / ")||"未登録";
      return `<article class="result-card" data-index="${index}"><div class="result-card__head"><div><h3>UN${esc(item.un)}</h3><p>${esc(record.properShippingNameJa||"日本語名未登録（確認画面のみ）")}</p></div><span class="status-tag">データ照合済み</span></div><div class="result-card__body"><div><strong>印刷する英語品名</strong><div class="candidate-list">${item.candidates.map(candidate=>`<label class="candidate-option"><input type="radio" name="candidate-${index}" value="${esc(candidate.value)}" ${candidate.value===item.selected?'checked':''}><span>${esc(candidate.value)}<small>${candidate.preferred?'括弧外を優先':'括弧内の候補'}</small></span></label>`).join("")}</div></div><div class="record-facts"><div class="fact"><span>主・副標札</span><strong>${esc(labelText)}</strong></div><div class="fact"><span>容器等級</span><strong>${esc(record.packingGroup||"―")}</strong></div><div class="fact"><span>海洋汚染物質</span><strong>${record.marinePollutant?'該当':'非該当'}</strong></div><div class="fact"><span>少量危険物上限</span><strong>${esc(record.limitedQuantity||"―")}</strong></div></div>${item.nos?`<div class="technical-block"><label for="technical-${index}">技術名（英語・任意）</label><input id="technical-${index}" class="technical-input" data-technical-index="${index}" value="${esc(item.technicalName)}" placeholder="例：TOLUENE, XYLENE"><p class="field-help">入力した場合は、印刷時に正式品名の直後へ括弧書きで追加します。入力しない場合は正式品名のみ印刷します。</p></div>`:""}</div></article>`;
    }).join("");
    $("resultList").querySelectorAll('input[type="radio"]').forEach(input=>input.addEventListener("change",event=>{const card=event.target.closest(".result-card");state.records[Number(card.dataset.index)].selected=event.target.value;buildPreview();}));
    $("resultList").querySelectorAll("[data-technical-index]").forEach(input=>input.addEventListener("input",event=>{state.records[Number(event.target.dataset.technicalIndex)].technicalName=event.target.value.trim();buildPreview();}));
  }
  function selectedLabels(){
    // 固定順：主標札 → 副標札 → 海洋汚染物質 → 少量危険物。
    // 同一標札は最初の出現だけを残し、入力されたUN番号の順序を維持する。
    const ordered=[];
    const seen=new Set();
    const pushUnique=label=>{
      if(!label?.id || seen.has(label.id)) return;
      seen.add(label.id);
      ordered.push(label);
    };
    const included=state.records.filter(item=>item.include);
    included.forEach(item=>pushUnique(item.labels[0]));
    included.forEach(item=>item.labels.slice(1).forEach(pushUnique));
    if($("includeMarine").checked) pushUnique(labelMaster().find(item=>item.id==="marine-pollutant"));
    if($("includeLimited").checked) pushUnique(labelMaster().find(item=>item.id==="limited-quantity"));
    return ordered;
  }
  function printableName(item){const tech=item.technicalName.trim().toUpperCase();const base=String(item.selected||"").toUpperCase();return `${base}${item.nos&&tech?` (${tech})`:""}`.trim();}
  function validate(){
    const errors=[];
    if(!state.records.length) errors.push("危険物データを照合してください。");
    state.records.forEach(item=>{
      if(!item.selected) errors.push(`UN${item.un}の英語品名を選択してください。`);
      if(!item.labels.length) errors.push(`UN${item.un}の標札データがありません。`);
    });
    return errors;
  }
  function makePage(content,type,index,total){
    return `<section class="print-page ${$("cutLines").checked?'cut-lines':''}" data-page-type="${type}">${content}<footer class="print-footer"><span>オーバーパック表示用作成ツール</span><span>${index}/${total}</span></footer></section>`;
  }
  function emptyPlacardCell(){ return '<div class="placard-item placard-item--empty"><span>空き</span></div>'; }
  const originallyMonochromeLabelIds=new Set([
    "class2.3","class6.1","class6.2","class7","class8","class9","class9-lithium",
    "marine-pollutant","limited-quantity","excepted-quantity"
  ]);
  function placardGrid(labels){
    const cells=[...labels.map(label=>{
      const previewClass=originallyMonochromeLabelIds.has(String(label.id))?" placard-item--original-monochrome":"";
      return `<div class="placard-item print-item${previewClass}"><img src="../images/labels/overpack-square/${esc(label.file)}" alt="${esc(label.nameJa)}"></div>`;
    })];
    while(cells.length<PLACARDS_PER_PAGE) cells.push(emptyPlacardCell());
    return `<div class="placard-grid">${cells.join("")}</div>`;
  }
  function overpackBanner(show){
    return show?`<div class="mark-line print-item mark-line--overpack"><span class="mark-line__text">OVERPACK</span></div>`:"";
  }
  function nameCard(record){
    return `<section class="name-record print-item"><div class="name-record__un">UN${esc(record.un)}</div><div class="name-record__name">${esc(printableName(record))}</div></section>`;
  }
  function nameList(records,mode="combined"){
    if(!records.length) return `<div class="mark-panel-empty">このページに表示する国連番号・品名はありません。</div>`;
    return `<div class="name-list name-list--${mode}">${records.map(nameCard).join("")}</div>`;
  }

  function estimateWrappedLines(text, charsPerLine=22){
    const words=String(text||"").trim().split(/\s+/).filter(Boolean);
    if(!words.length) return 1;
    let lines=1;
    let used=0;
    words.forEach(word=>{
      const length=Math.max(1,word.length);
      if(used===0){
        used=Math.min(length,charsPerLine);
        if(length>charsPerLine) lines+=Math.ceil(length/charsPerLine)-1;
      }else if(used+1+length<=charsPerLine){
        used+=1+length;
      }else{
        lines+=1;
        used=Math.min(length,charsPerLine);
        if(length>charsPerLine) lines+=Math.ceil(length/charsPerLine)-1;
      }
    });
    return lines;
  }
  function estimateRecordHeightMm(record){
    const name=printableName(record);
    const nameLines=estimateWrappedLines(name,22);
    // UN番号1行 + 品名行 + 余白・枠。実寸18mm文字を前提に余裕を持たせる。
    return 31 + (nameLines*20);
  }
  function packRecordsByHeight(records,{capacityMm=250,gapMm=4,maxItems=8}={}){
    const pages=[];
    let current=[];
    let used=0;
    records.forEach(record=>{
      const height=estimateRecordHeightMm(record);
      const extra=current.length?gapMm:0;
      if(current.length && (used+extra+height>capacityMm || current.length>=maxItems)){
        pages.push(current);
        current=[];
        used=0;
      }
      current.push(record);
      used+=(used?gapMm:0)+height;
    });
    if(current.length) pages.push(current);
    return pages;
  }
  function shouldDeferRecordToNextPage(record,{showOverpack=false,onLabelPage=false}={}){
    if(!record) return false;
    const text = `UN${record.un} ${printableName(record)}`.trim();
    const length = text.length;
    const words = printableName(record).split(/\s+/).filter(Boolean).length;
    // 標札ページ下部は高さが限られるため、OVERPACKを表示する場合はUN番号・品名を次ページへ送る。
    if(onLabelPage && showOverpack) return true;
    // 標札ページで長い品名は途中で切れやすいため、まとまりごと次ページへ送る。
    if(onLabelPage && (length > 18 || words > 2)) return true;
    return false;
  }
  function buildPageContents(){
    const mode=$("layoutMode").value;
    const labels=selectedLabels();
    const records=state.records;
    const contents=[];
    const wantOverpack=$("includeOverpack").checked && (mode==="combined"||mode==="overpack"||mode==="placards"||mode==="names");
    const wantNames=$("includeNames").checked && (mode==="combined"||mode==="names");
    const firstPageSetting = $("firstPageNameCount") ? $("firstPageNameCount").value : "auto";
    const firstPageLimit = firstPageSetting === "auto" ? 1 : Math.max(0, Number(firstPageSetting || 0));

    if(mode==="overpack"){
      contents.push({type:"overpack",html:`<div class="text-only-sheet text-only-sheet--overpack">${overpackBanner(true)}</div>`});
      return contents;
    }

    if(mode==="names"){
      const capacity=wantOverpack?215:250;
      const groups=packRecordsByHeight(records,{capacityMm:capacity,maxItems:TEXT_ONLY_RECORDS_PER_PAGE});
      (groups.length?groups:[[]]).forEach((group,index)=>{
        contents.push({
          type:"names",
          html:`<div class="text-only-sheet text-only-sheet--packed">${overpackBanner(wantOverpack&&index===0)}${nameList(group,"full")}</div>`
        });
      });
      return contents;
    }

    if(mode==="placards"){
      const labelGroups=chunk(labels,PLACARDS_PER_PAGE);
      (labelGroups.length?labelGroups:[[]]).forEach((group,index)=>{
        contents.push({type:"placards",html:`<div class="placard-only-sheet">${placardGrid(group)}${overpackBanner(wantOverpack&&index===0)}</div>`});
      });
      return contents;
    }

    const labelGroups=chunk(labels,PLACARDS_PER_PAGE);
    let recordIndex=0;
    let pendingOverpack=wantOverpack;

    if(labelGroups.length){
      labelGroups.forEach((group,groupIndex)=>{
        const inlineRecords=[];
        const inlineLimit=groupIndex===0?firstPageLimit:0;
        if(wantNames && inlineLimit>0){
          for(let i=0;i<inlineLimit && recordIndex<records.length;i+=1){
            const candidate=records[recordIndex];
            if(shouldDeferRecordToNextPage(candidate,{showOverpack:false,onLabelPage:true})) break;
            inlineRecords.push(candidate);
            recordIndex+=1;
          }
        }
        // 品名を配置できた場合は品名を優先し、OVERPACKは後続ページへ送る。
        const showOverpack=pendingOverpack && inlineRecords.length===0;
        contents.push({
          type:"combined-labels",
          html:`<div class="combined-sheet combined-sheet--top-grid"><section class="combined-sheet__labels">${placardGrid(group)}</section><section class="combined-sheet__bottom">${inlineRecords.length?nameList(inlineRecords,"bottom"):''}${overpackBanner(showOverpack)}</section></div>`
        });
        if(showOverpack) pendingOverpack=false;
      });
    }

    const remaining=wantNames?records.slice(recordIndex):[];
    if(remaining.length){
      const firstCapacity=pendingOverpack?215:250;
      const firstGroups=packRecordsByHeight(remaining,{capacityMm:firstCapacity,maxItems:TEXT_ONLY_RECORDS_PER_PAGE});
      firstGroups.forEach((group,index)=>{
        const showOverpack=pendingOverpack && index===0;
        contents.push({
          type:"combined-name",
          html:`<div class="text-only-sheet text-only-sheet--packed">${index>0?'<div class="continuation-note">続き</div>':''}${nameList(group,"full")}${overpackBanner(showOverpack)}</div>`
        });
        if(showOverpack) pendingOverpack=false;
      });
    }else if(!labelGroups.length && (pendingOverpack||wantNames)){
      const groups=packRecordsByHeight(records,{capacityMm:pendingOverpack?215:250,maxItems:TEXT_ONLY_RECORDS_PER_PAGE});
      (groups.length?groups:[[]]).forEach((group,index)=>{
        const showOverpack=pendingOverpack&&index===0;
        contents.push({type:"combined-first",html:`<div class="text-only-sheet text-only-sheet--packed">${nameList(group,"full")}${overpackBanner(showOverpack)}</div>`});
        if(showOverpack) pendingOverpack=false;
      });
    }

    if(pendingOverpack){
      contents.push({type:"combined-overpack",html:`<div class="text-only-sheet text-only-sheet--overpack">${overpackBanner(true)}</div>`});
    }
    return contents;
  }
  function assessLayout(){
    const pages=[...document.querySelectorAll('.print-page')];
    const details=[];
    let ok=true;
    pages.forEach((page,idx)=>{
      page.classList.remove('print-page--overflow');
      const pageOk = page.scrollHeight <= page.clientHeight + 1 && page.scrollWidth <= page.clientWidth + 1;
      details.push({page:idx+1, ok:pageOk});
      if(!pageOk){
        ok=false;
        page.classList.add('print-page--overflow');
      }
    });
    state.layoutCheck={ok,details};
    const el=$("layoutCheck");
    if(!el) return;
    if(!pages.length){
      el.className='layout-check layout-check--neutral';
      el.textContent='プレビュー更新後に、A4収まり確認結果をここへ表示します。';
    } else if(ok){
      el.className='layout-check layout-check--ok';
      el.textContent=`A4収まり確認：このページはA4内に収まっています。対象 ${pages.length} ページすべてOKです。`;
    } else {
      const bad=details.filter(x=>!x.ok).map(x=>x.page).join('、');
      el.className='layout-check layout-check--warn';
      el.textContent=`A4収まり確認：ページ ${bad} でA4範囲からはみ出す可能性があります。表示件数や内容を調整してください。`;
    }
  }
  function buildPreview(){
    const errors=validate(); const contents=state.records.length?buildPageContents():[]; state.labels=selectedLabels();
    state.pages=contents; $("pageSummary").textContent=`${contents.length}ページ`;$("placardSummary").textContent=`標札・マーク${state.labels.length}種類`;
    $("printPreview").innerHTML=contents.length?contents.map((page,index)=>makePage(page.html,page.type,index+1,contents.length)).join(''):'<div class="preview-placeholder">照合結果を確認すると、ここにA4プレビューが表示されます。</div>';
    $("printButton").disabled=!contents.length;
    const currentMessages=[...document.querySelectorAll('#globalMessages .message')].map(x=>x.textContent);
    const newErrors=errors.filter(text=>!currentMessages.includes(text));
    if(newErrors.length) renderMessages(newErrors.map(text=>({type:'error',text})));
    assessLayout();
    fitPreview();
  }
  function fitPreview(){
    if(window.innerWidth>820) return;
    const container=$("printPreview");const width=container.clientWidth-16;
    document.querySelectorAll(".print-page").forEach(page=>{
      page.style.transform="";page.style.marginBottom="18px";
      const scale=Math.min(1,width/page.offsetWidth);
      page.style.transform=`scale(${scale})`;
      page.style.marginBottom=`${page.offsetHeight*(scale-1)+18}px`;
    });
  }
  function history(){try{return JSON.parse(localStorage.getItem(HISTORY_KEY)||"[]");}catch{return[];}}
  function saveHistory(){
    const user=window.ISSApi?.getUser?.()||window.ISSFeatureAccess?.currentUser?.()||{};
    const entry={id:`OP-${Date.now()}`,printedAt:new Date().toISOString(),user:user.displayName||user.display_name||"利用者",office:user.officeName||user.office_name||"所属未設定",uns:state.records.map(x=>x.un),names:state.records.map(printableName),labels:state.labels.map(x=>x.id),pages:state.pages.length};
    const items=history();items.unshift(entry);localStorage.setItem(HISTORY_KEY,JSON.stringify(items.slice(0,20)));renderHistory();
  }
  function renderHistory(){
    const items=history();
    $("historyList").innerHTML=items.length?items.map(item=>`<div class="history-item"><div><strong>${esc(item.uns.map(x=>`UN${x}`).join("、"))}</strong><span>${esc(item.office)}／${esc(item.user)}／${item.pages}ページ</span></div><span>${new Date(item.printedAt).toLocaleString("ja-JP")}</span></div>`).join(""):'<p class="empty-state">印刷履歴はまだありません。</p>';
  }
  function print(){
    const errors=validate();
    if(errors.length){alert(errors.join("\n"));return;}
    const layoutMessage = state.layoutCheck.ok
      ? "A4収まり確認：このページはA4内に収まっています。印刷を続行しますか？"
      : "A4収まり確認：一部のページではみ出す可能性があります。内容を確認してから印刷してください。続行しますか？";
    if(!confirm(layoutMessage)) return;
    if(!$("confirmFinal").checked){
      const proceed = confirm("印刷内容を最終確認したチェックが未選択です。このまま印刷を続けますか？");
      if(!proceed){
        $("confirmFinal").focus();
        $("confirmFinal").scrollIntoView({behavior:"smooth",block:"center"});
        return;
      }
    }
    saveHistory();window.print();
  }
  ["includeOverpack","includeNames","includeMarine","includeLimited","cutLines","confirmFinal","layoutMode","firstPageNameCount"].forEach(id=>{const element=$(id);if(element)element.addEventListener("change",buildPreview);});
  $("resolveButton").addEventListener("click",resolve);$("refreshPreview").addEventListener("click",buildPreview);$("printButton").addEventListener("click",print);
  $("clearButton").addEventListener("click",()=>{$("unInput").value="";state.records=[];renderMessages([]);renderResults();buildPreview();});
  $("loadExample").addEventListener("click",()=>{$("unInput").value="UN1170\nUN3082\nUN1760";resolve();});
  $("clearHistory").addEventListener("click",()=>{if(confirm("この端末の印刷履歴を削除しますか？")){localStorage.removeItem(HISTORY_KEY);renderHistory();}});
  window.addEventListener("resize",fitPreview);
  const initialUn=new URLSearchParams(location.search).get("un");
  if(initialUn){$("unInput").value=initialUn;resolve();}else{renderHistory();buildPreview();}
})();
