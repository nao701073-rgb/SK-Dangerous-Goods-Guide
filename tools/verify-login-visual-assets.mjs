import { readFileSync, statSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const assets=[
  ['朝背景','assets/images/login-port-morning.jpg',3840,2160,700000],
  ['昼背景','assets/images/login-port-day.jpg',3840,2160,700000],
  ['夕方背景','assets/images/login-port-evening.jpg',3840,2160,700000],
  ['夜背景','assets/images/login-port-night.jpg',3840,2160,700000],
  ['正方形SKロゴ','assets/images/sk-brand-logo-square-v348.png',700,700,20000],
  ['高密度SKロゴ','assets/images/sk-brand-logo-square-2x-v357.png',1400,1400,50000]
];
function jpegSize(buffer){
  let i=2;
  while(i<buffer.length){
    if(buffer[i]!==0xff){i++;continue;}
    const marker=buffer[i+1];
    if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return {height:buffer.readUInt16BE(i+5),width:buffer.readUInt16BE(i+7)};
    if(marker===0xd8||marker===0xd9){i+=2;continue;}
    const length=buffer.readUInt16BE(i+2); if(!length) break; i+=2+length;
  }
  return null;
}
function pngSize(buffer){return buffer.toString('ascii',1,4)==='PNG'?{width:buffer.readUInt32BE(16),height:buffer.readUInt32BE(20)}:null;}
const checks=[];
for(const [name,path,minW,minH,minBytes] of assets){
  const full=resolve(root,path); const exists=existsSync(full); let size=null; let bytes=0;
  if(exists){const data=readFileSync(full);bytes=statSync(full).size;size=path.endsWith('.png')?pngSize(data):jpegSize(data);}
  checks.push([`${name}の存在`,exists]);
  checks.push([`${name}の寸法`,Boolean(size&&size.width>=minW&&size.height>=minH)]);
  checks.push([`${name}の容量`,bytes>=minBytes]);
}
const css=readFileSync(resolve(root,'assets/css/login-production.css'),'utf8');
checks.push(['時間帯別背景参照', ['morning','day','evening','night'].every(v=>css.includes(`login-port-${v}.jpg`))]);
checks.push(['中央可読性レイヤー',css.includes('Part 356: seamless port backgrounds')&&css.includes('.login-scene::before')]);
checks.push(['4K・高密度表示',css.includes('Part 357: 4K login backgrounds and high-density SK logo')&&css.includes('image-rendering: auto')]);
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status:failed.length?'failed':'passed',checked:checks.length,failed},null,2));
process.exit(failed.length?1:0);
