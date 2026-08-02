import fs from 'node:fs';
const file=new URL('../pages/ctu-securing-calculator.html',import.meta.url);
const text=fs.readFileSync(file,'utf8');
const required=[
 'CSS Code Annex 13 経験に基づく方法','CSS Code Annex 13 先進の計算方法','CSS Code Annex 13 代替の方法',
 'CSS_TABLE2','CSS_TABLE4','cssContactMaterial','cargoHeight','cssT3','cssWeatherFactor','CSS_MSL_FACTORS','CS = 最小MSL ÷ 1.5','CS = 最小MSL ÷ 1.35',
 '貨物頂部を越える固縛はCSS Code Annex 13の平衡計算では抵抗力に算入しません',
 '異なる弾性の固縛が混在','木材－木材（湿潤・乾燥） μ=0.4','鋼－鋼（湿潤） μ=0.0','風圧投影面積','波洗い投影面積'
];
const missing=required.filter(x=>!text.includes(x));
if(missing.length){console.error('Missing:',missing);process.exit(1)}
if(/固縛力参考算定/.test(text)){console.error('旧名称が残っています');process.exit(1)}
console.log('part478 CSS Annex 13 securing verification passed');
