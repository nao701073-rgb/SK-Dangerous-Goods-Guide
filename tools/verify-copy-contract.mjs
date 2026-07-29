import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname);
const settings=readFileSync(resolve(root,'pages/settings.html'),'utf8');
const systemSettings=readFileSync(resolve(root,'pages/system-settings.html'),'utf8');
const references=readFileSync(resolve(root,'pages/references.html'),'utf8');
const summary=readFileSync(resolve(root,'data/imdg-inspection-guide-summary.js'),'utf8');
const both=settings+systemSettings;
const checks=[
 ['国内法令・IMDG Code表示',both.includes('国内法令・IMDG Code表示')&&!both.includes('>法令・IMDG Code表示<')],
 ['国内法令主表示',both.includes('<strong>国内法令</strong>')&&both.includes('危規則、危告示は常に主表示します。')],
 ['IMDG参照説明',both.includes('国内法令だけでは具体的内容を確認できない場合に、IMDG Codeの参照章・節・英語原文を表示します。')],
 ['6カテゴリー説明',references.includes('元資料を6カテゴリーに整理し、背景、判断の流れ、よくある見落とし、手順まで説明します。')],
 ['国内法令限定説明',references.includes('国内法令で詳細が示されていない又は確認しづらい項目に限定しています。')],
 ['AI要約抽出説明',references.includes('IMDG Code・CTU Codeのうち、適用条件、特別規定、表・図の読み方、確認方法が分かりにくい規定を抽出しています。')],
 ['元資料129ページ説明',summary.includes('元資料129ページを6分野に再構成し、概要、判断の流れ、よくある誤り、現場での確認事項を整理します。図・写真・表は、実務上重要なページを追加しています。各ページは1カードで表示し、クリックして拡大確認できます。')],
 ['AI要約注意書き',summary.includes('AI要約は理解を補助する参考情報です。実務判断では、危規則・危告示・IMDG Code最新版および所轄当局の通達を確認してください。')&&!summary.includes('所轄官庁の指示')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
console.log(JSON.stringify({status:failed.length?'failed':'passed',checked:checks.length,failed},null,2));
process.exit(failed.length?1:0);
