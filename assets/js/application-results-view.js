(function(){
 'use strict'; const $=id=>document.getElementById(id); const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
 function render(){const select=$('linkedResultApplicationSelect'),box=$('linkedApplicationResults'); if(!select||!box)return; const rows=window.ISSApplicationResults?.get(select.value)||[]; if(!select.value){box.innerHTML='<p>申請番号を選択すると登録結果を表示します。</p>';return} if(!rows.length){box.innerHTML='<p>登録された確認・算出結果はありません。</p>';return} box.innerHTML=rows.map(r=>`<article class="application-result-card"><h3>${esc(r.title)}</h3><p><strong>${new Date(r.createdAt).toLocaleString('ja-JP')}</strong>／${esc(r.createdBy)}</p><details><summary>登録内容を表示</summary><pre>${esc(JSON.stringify(r.payload,null,2))}</pre></details></article>`).join('');}
 function init(){window.ISSApplicationResults?.fillSelect($('linkedResultApplicationSelect')); $('linkedResultApplicationSelect')?.addEventListener('change',render); window.addEventListener('iss:application-results-changed',render);}
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
