import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const home = readFileSync(resolve(root, 'index.html'), 'utf8');
const homeCss = readFileSync(resolve(root, 'assets/css/home-dashboard.css'), 'utf8');
const regulationPage = readFileSync(resolve(root, 'pages/regulations.html'), 'utf8');
const regulationCss = readFileSync(resolve(root, 'assets/css/regulations.css'), 'utf8');
const checks = [
  ['主要機能カードの見出し関連付け', home.includes('aria-labelledby="dangerousGoodsCardTitle"') && home.includes('aria-labelledby="applicationsCardTitle"') && home.includes('aria-labelledby="regulationsCardTitle"') && home.includes('aria-labelledby="referencesCardTitle"')],
  ['主要機能カードの説明関連付け', home.includes('aria-describedby="dangerousGoodsCardDescription"') && home.includes('aria-describedby="applicationsCardDescription"')],
  ['リンクの明確な読み上げ名', home.includes('aria-label="危険物検索・解説を開く"') && home.includes('aria-label="申請番号管理を開く"') && home.includes('aria-label="関連法令を開く"') && home.includes('aria-label="関連資料を開く"')],
  ['カード本文の折返し', homeCss.includes('.module-card__content') && homeCss.includes('overflow-wrap: anywhere')],
  ['極小画面のアイコン調整', homeCss.includes('@media (max-width: 419px)') && homeCss.includes('width: 76px') && homeCss.includes('width: 58px')],
  ['国内法令見出しは日本語のみ', regulationPage.includes('<h2>国内法令</h2>') && !regulationPage.includes('>Domestic<')],
  ['国際規則見出しは日本語のみ', regulationPage.includes('<h2>国際条約・国際規則</h2>') && !regulationPage.includes('>International<')],
  ['法令カード操作44px以上', regulationCss.includes('.regulation-source-link') && regulationCss.includes('min-height: 44px')],
  ['法令カードの長文折返し', regulationCss.includes('.regulation-identifiers') && regulationCss.includes('overflow-wrap: anywhere')],
  ['法令カードのスマホ余白', regulationCss.includes('@media (max-width: 719px)') && regulationCss.includes('padding: 18px 16px')]
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checkCount: checks.length, failed: failed.map(([name]) => name) }, null, 2));
process.exit(failed.length ? 1 : 0);
