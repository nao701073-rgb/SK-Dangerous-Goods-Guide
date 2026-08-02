import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const jsPath = path.join(root, 'assets/js/detail-dashboard.js');
const htmlPath = path.join(root, 'pages/dangerous-goods-detail.html');
const js = fs.readFileSync(jsPath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');

const callIndex = js.indexOf('const actualPsnCandidates = extractActualPsnCandidates(');
const declarationIndex = js.indexOf('function extractActualPsnCandidates(');
if (callIndex < 0 || declarationIndex < 0) throw new Error('正式輸送品名候補抽出処理を確認できません。');
if (!/function\s+extractActualPsnCandidates\s*\(/.test(js)) throw new Error('候補抽出処理が関数宣言になっていません。');
if (!/function\s+normalizeActualPsnCandidate\s*\(/.test(js)) throw new Error('候補正規化処理が関数宣言になっていません。');
if (!html.includes('detail-dashboard.js?v=483')) throw new Error('危険物詳細のキャッシュ番号がpart483ではありません。');
console.log('part483 dangerous-goods detail runtime verification: OK');
