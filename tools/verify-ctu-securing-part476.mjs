import fs from 'node:fs';
const file=new URL('../pages/ctu-securing-calculator.html',import.meta.url);
const text=fs.readFileSync(file,'utf8');
const required=[
 '海上輸送 海域C','鉄道輸送（短時間衝撃）','CTU最大積載量 P','境界抵抗係数',
 '直接固定を含む方向では','Math.max(rigid,lash.direct)','muInfo.effective*.75',
 'r*payload*g','1.8*r.stf*mu','Math.min(...values)','追加固縛要',
 '重心の前後偏心','重心の左右偏心','CTUコード第5章・第6章および付属書7'
];
const missing=required.filter(x=>!text.includes(x));
if(missing.length){console.error('Missing:',missing);process.exit(1)}
if(/固縛力参考算定/.test(text)){console.error('旧名称が残っています');process.exit(1)}
console.log('part476 CTU securing verification passed');
