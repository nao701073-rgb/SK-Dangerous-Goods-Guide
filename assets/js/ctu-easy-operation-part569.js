(function(){
  'use strict';
  if(document.body?.dataset?.page!=='ctu-securing-calculator')return;
  const $=id=>document.getElementById(id);
  const FACTOR={kN:1,N:.001,daN:.01,kgf:.00980665,tf:9.80665};
  const PREFIX={cargo:'quickCargoMslPhoto',ctu:'quickCtuMslPhoto'};

  function ids(role){const p=PREFIX[role];return{input:`${p}Input`,marking:`${p}Marking`,kn:`${p}Value`,apply:`${p}Apply`,save:`${p}Save`,status:`${p}Status`,source:`part569${role==='cargo'?'Cargo':'Ctu'}SourceValue`,unit:`part569${role==='cargo'?'Cargo':'Ctu'}SourceUnit`,preview:`part569${role==='cargo'?'Cargo':'Ctu'}ConvertPreview`,helper:`part569${role==='cargo'?'Cargo':'Ctu'}PhotoLink`}}
  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function roleName(role){return role==='cargo'?'貨物側':'CTU側'}
  function parseMarking(text){
    const s=String(text||'').replace(/，/g,',').replace(/．/g,'.');
    const match=s.match(/(?:MSL|WLL|LC)?\s*[:：=]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kN|daN|N|kgf|tf|t)\b/i)||s.match(/([0-9]+(?:\.[0-9]+)?)\s*(kN|daN|N|kgf|tf|t)\b/i);
    if(!match)return null;
    let unit=String(match[2]||'kN');
    if(/^t$/i.test(unit))unit='tf';
    const canonical=Object.keys(FACTOR).find(key=>key.toLowerCase()===unit.toLowerCase())||unit;
    return {value:Number(match[1]),unit:canonical};
  }
  function ensure(role){
    const x=ids(role),value=$(x.kn);if(!value||$(x.helper))return;
    const label=value.closest('label');if(!label)return;
    const box=document.createElement('div');box.id=x.helper;box.className='part569-photo-msl-link';
    box.innerHTML=`<div class="part569-photo-msl-link__title"><strong>写真の表示値 → MSL入力補助</strong><span>画像から自動確定せず、読み取った表示値を確認して換算します。</span></div><div class="part569-photo-msl-link__grid"><label>表示値<input id="${x.source}" type="number" min="0" step="0.01" placeholder="例：2000"></label><label>単位<select id="${x.unit}"><option value="kN">kN</option><option value="daN">daN</option><option value="N">N</option><option value="kgf">kgf</option><option value="tf">tf</option></select></label><button type="button" data-part569-parse="${role}">刻印文字から候補</button></div><div class="part569-photo-msl-link__result"><span id="${x.preview}">表示値を入力するとkN換算を表示します。</span><div><button type="button" data-part569-convert="${role}">kN欄へ換算</button><button type="button" class="primary-action" data-part569-apply="${role}">換算してMSLへ反映</button><button type="button" data-part569-save="${role}">反映＋案件写真登録</button></div></div>`;
    label.insertAdjacentElement('afterend',box);
    $(x.source)?.addEventListener('input',()=>updatePreview(role));
    $(x.unit)?.addEventListener('change',()=>updatePreview(role));
    document.querySelector(`[data-part569-parse="${role}"]`)?.addEventListener('click',()=>parseIntoHelper(role));
    document.querySelector(`[data-part569-convert="${role}"]`)?.addEventListener('click',()=>convertToKn(role));
    document.querySelector(`[data-part569-apply="${role}"]`)?.addEventListener('click',()=>apply(role,false));
    document.querySelector(`[data-part569-save="${role}"]`)?.addEventListener('click',()=>apply(role,true));
    $(x.input)?.addEventListener('change',()=>setTimeout(()=>photoSelected(role),180));
    $(x.apply)?.addEventListener('click',()=>setTimeout(()=>signalTarget(role),0));
  }
  function converted(role){const x=ids(role),v=Math.max(0,Number($(x.source)?.value)||0),unit=$(x.unit)?.value||'kN';return v*(FACTOR[unit]||0)}
  function updatePreview(role){const x=ids(role),v=Math.max(0,Number($(x.source)?.value)||0),unit=$(x.unit)?.value||'kN',out=$(x.preview),kn=converted(role);if(!out)return;out.innerHTML=v>0?`<strong>${v.toLocaleString('ja-JP')} ${esc(unit)} → ${kn.toFixed(3)} kN</strong><small>換算後も刻印・銘板、図面・仕様資料との照合値を優先してください。</small>`:'表示値を入力するとkN換算を表示します。'}
  function parseIntoHelper(role){const x=ids(role),mark=String($(x.marking)?.value||'').trim(),result=parseMarking(mark),status=$(x.status);if(!result){if(status)status.textContent='刻印文字から「数値＋単位」を抽出できませんでした。表示値と単位を手入力してください。';$(x.source)?.focus();return}$(x.source).value=String(result.value);$(x.unit).value=result.unit;updatePreview(role);if(status)status.textContent=`刻印文字から ${result.value} ${result.unit} を候補として取得しました。写真と資料で確認してから反映してください。`}
  function convertToKn(role){const x=ids(role),kn=converted(role),status=$(x.status);if(kn<=0){if(status)status.textContent='表示値と単位を入力してください。';$(x.source)?.focus();return false}$(x.kn).value=kn.toFixed(3);$(x.kn).dispatchEvent(new Event('input',{bubbles:true}));$(x.kn).dispatchEvent(new Event('change',{bubbles:true}));if(status)status.textContent=`${kn.toFixed(3)} kNへ換算しました。写真・資料との照合後、「MSLへ反映」を実行してください。`;return true}
  function apply(role,save){const x=ids(role),mark=String($(x.marking)?.value||'').trim(),status=$(x.status);if(!mark){if(status)status.textContent='先に写真で確認した刻印・表示、または照合した資料名を入力してください。';$(x.marking)?.focus();return}if(!convertToKn(role))return;$(x.apply)?.click();setTimeout(()=>{signalTarget(role);if(save)$(x.save)?.click()},30)}
  function signalTarget(role){const target=$(role==='cargo'?'quickCargoMsl':'quickCtuMsl');if(!target)return;target.dispatchEvent(new Event('input',{bubbles:true}));target.dispatchEvent(new Event('change',{bubbles:true}))}
  function photoSelected(role){const x=ids(role),mark=$(x.marking),helper=$(x.helper);helper?.classList.add('is-attention');setTimeout(()=>helper?.classList.remove('is-attention'),1400);mark?.scrollIntoView?.({behavior:'smooth',block:'center'});setTimeout(()=>mark?.focus?.({preventScroll:true}),220)}
  function init(){Object.keys(PREFIX).forEach(ensure)}
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',()=>setTimeout(init,60)):setTimeout(init,60);
  window.__SK_ASSET_BUILD__=Object.assign(window.__SK_ASSET_BUILD__||{}, {'assets/js/ctu-easy-operation-part569.js':'part569'});
})();
