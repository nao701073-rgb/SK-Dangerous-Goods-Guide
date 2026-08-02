import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('../assets/css/detail-dashboard.css', import.meta.url), 'utf8');
const js = fs.readFileSync(new URL('../assets/js/detail-dashboard.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('../pages/dangerous-goods-detail.html', import.meta.url), 'utf8');

assert.match(css, /part484: 正式輸送品名・国連番号の実寸比較/);
assert.match(css, /font-weight:\s*800\s*!important/);
assert.match(css, /part485: 包装要件の容器欄・許容容量／許容質量欄の列分離/);
assert.match(css, /\.packing-profile-table--outer \.packing-profile-col--limit \{ width: 34%; \}/);
assert.match(css, /white-space:\s*normal\s*!important/);
assert.match(css, /overflow-wrap:\s*anywhere/);
assert.match(js, /packing-profile-table--inner/);
assert.match(js, /packing-profile-table--outer/);
assert.match(js, /packing-profile-col--limit/);
assert.match(html, /detail-dashboard\.css\?v=485/);
assert.match(html, /detail-dashboard\.js\?v=485/);

console.log('part485 verification passed');
