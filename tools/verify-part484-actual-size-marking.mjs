import fs from "node:fs";
const css = fs.readFileSync(new URL("../assets/css/detail-dashboard.css", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../pages/dangerous-goods-detail.html", import.meta.url), "utf8");
const checks = [
  [css.includes("part484: 正式輸送品名・国連番号の実寸比較"), "part484 CSS marker"],
  [/font-weight:\s*800\s*!important/.test(css), "same font weight"],
  [/max-height:\s*none\s*!important/.test(css), "no fixed max height"],
  [/overflow-wrap:\s*anywhere\s*!important/.test(css), "wrap long names"],
  [html.includes("detail-dashboard.css?v=484"), "cache version 484"]
];
const failed = checks.filter(([ok]) => !ok).map(([, label]) => label);
if (failed.length) {
  console.error("part484 verification failed:", failed.join(", "));
  process.exit(1);
}
console.log("part484 actual-size marking verification passed");
