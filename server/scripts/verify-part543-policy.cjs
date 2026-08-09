const fs=require('fs'),path=require('path');const root=path.resolve(__dirname,'../..');
const js=fs.readFileSync(path.join(root,'assets/js/application-intake-workflow.js'),'utf8');const html=fs.readFileSync(path.join(root,'pages/application-intake-workflow.html'),'utf8');const css=fs.readFileSync(path.join(root,'assets/css/application-intake-part543.css'),'utf8');
const checks=[
 ['個数強調','part543-critical-item'&&js.includes('個数')],
 ['1容器当たり正味質量強調',js.includes('1容器当たり正味質量')],
 ['許容容量・許容質量強調',js.includes('許容容量・許容質量')],
 ['規定量超過要確認',js.includes('規定量超過・要確認')&&js.includes('規定量を超えています。要確認')],
 ['kg/L自動換算なし',js.includes('CROSS_UNIT_NEAR_RATIO=0.20')&&!js.includes('densityInfo(')],
 ['L/kg近接時のみ容量比較要確認',js.includes("statusText:near?'容量比較 要確認':'許容容量はL基準'")&&js.includes('crossUnitNear(netPer,v)')],
 ['少量危険物30kg',js.includes('外装容器総質量上限 30 kg')&&js.includes('30 kg超過・要確認')],
 ['少量危険物4G自動性能扱いなし',fs.readFileSync(path.join(root,'docs/Part543_申請書事前審査・許容値超過警告.md'),'utf8').includes('4G表記をUN容器の性能表示とはみなさず')],
 ['4G/4GV現物確認',js.includes('現物の容器性能表示を確認')],
 ['許容値resolver接続',html.includes('application-allowance-resolver.js?v=536')],
 ['包装数量profile接続',html.includes('domestic-packing-quantity-profiles.js?v=434')],
 ['Part543 CSS接続',html.includes('application-intake-part543.css?v=543')],
 ['超過行CSS',css.includes('part543-over-limit')],
 ['編集フォーム維持',html.includes('2．取込内容を確認・修正')&&html.includes('intakeCargoBody')]
].map(([name,passed])=>({name,passed:Boolean(passed)}));const out={release:'part543',baseRelease:'part542',summary:{passed:checks.filter(x=>x.passed).length,total:checks.length},checks};console.log(JSON.stringify(out,null,2));process.exit(checks.every(x=>x.passed)?0:1);