import fs from "node:fs";
import path from "node:path";
const file=path.resolve(process.argv[2]||"../docs/Part211_データ品質監査レポート.json");
const report=JSON.parse(fs.readFileSync(file,"utf8"));
const accepted=process.argv.includes("--accept-warnings");
if(report.releaseDecision==="blocked"){console.error(`公開不可: エラー ${report.summary.errorCount}件`);process.exit(1);}
if(report.releaseDecision==="review-required"&&!accepted){console.error(`要確認: 警告 ${report.summary.warningCount}件。確認後は --accept-warnings を付けて再実行してください。`);process.exit(1);}
console.log(`公開判定: ${report.releaseDecision === "pass" ? "合格" : "警告確認済み"}`);
