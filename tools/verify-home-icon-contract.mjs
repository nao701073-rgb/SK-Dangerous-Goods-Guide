import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const source = readFileSync(resolve(root, 'index.html'), 'utf8');
const css = readFileSync(resolve(root, 'assets/css/home-dashboard.css'), 'utf8');
const checks = [
  ['固縛力参考算出カード', source.includes('>固縛力参考算出</h3>')],
  ['貨物固縛アイコン識別子', source.includes('data-icon="cargo-lashing"')],
  ['コンテナ内枠', source.includes('M4 19V5h16v14H4Z')],
  ['コンテナ開口部表現', source.includes('M17 5h3v3')],
  ['左右の固縛材', source.includes('M7.2 16.8 9 10.5M16.8 16.8 15 10.5')],
  ['パレット貨物', source.includes('M8.4 17h7.2v2H8.4z')],
  ['コンテナ内貨物の説明', source.includes('コンテナ内貨物の重量と固縛資材から、参考固縛力を算出します。')],
  ['将来実装カードの無効状態', source.includes('aria-disabled="true"') && source.includes('aria-describedby="cargoLashingDescription cargoLashingStatus"')],
  ['装飾SVGの支援技術除外', source.includes('aria-hidden="true" focusable="false"')],
  ['旧計算機アイコンを不使用', !source.includes('data-icon="calc"')],
  ['AI将来実装カードの無効状態', source.includes('aria-describedby="aiAnalysisDescription aiAnalysisStatus"') && source.includes('id="aiAnalysisStatus"')],
  ['主要機能SVGサイズ統一', css.includes('.module-card__icon > svg') && css.includes('width: 66px') && css.includes('height: 66px')],
  ['強制カラーモード対応', css.includes('@media (forced-colors: active)')],
  ['主要操作44px以上', css.includes('min-height: 44px')],
  ['カード下部操作の整列', css.includes('margin-top: auto')],
  ['スマートフォン操作幅', css.includes('width: 100%') && css.includes('justify-content: center')],
  ['主要SVGのフォーカス除外', source.includes('aria-hidden="true" focusable="false"')],
  ['将来実装カードの見出し関連付け', source.includes('aria-labelledby="cargoLashingTitle"') && source.includes('aria-labelledby="aiAnalysisTitle"')],
  ['将来実装カードの説明関連付け', source.includes('aria-describedby="cargoLashingDescription cargoLashingStatus"') && source.includes('aria-describedby="aiAnalysisDescription aiAnalysisStatus"')],
  ['将来実装バッジ表示', css.includes('.coming-soon::before') && css.includes('border-radius: 999px')],
  ['将来実装カードのホバー抑止', css.includes('.module-card.is-disabled:hover') && css.includes('transform: none')],
  ['動きを抑える設定', css.includes('@media (prefers-reduced-motion: reduce)')],
  ['中間幅は2列表示', css.includes('@media (max-width: 1199px)') && css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')],
  ['狭い画面は1列表示', css.includes('@media (max-width: 699px)') && css.includes('grid-template-columns: 1fr')],
  ['コンパクト画面のアイコン拡大', css.includes('width: 80px') && css.includes('width: 84px') && css.includes('width: 60px') && css.includes('width: 64px')],
  ['コンパクト画面の文字拡大', css.includes('font-size: 1.18rem') && css.includes('font-size: .98rem')],
  ['PCは3列表示を維持', css.includes('@media (min-width: 1200px)') && css.includes('grid-template-columns: repeat(3, minmax(0, 1fr))')],
  ['アイコン内イラストの占有率拡大', css.includes('Part 342: enlarge icon tiles and inner illustrations') && css.includes('width: 66px') && css.includes('width: 60px') && css.includes('width: 64px')],
  ['利用可能カードの全面操作', css.includes('Part 344: make available major-function cards easier to open') && css.includes('.text-button::after') && css.includes('inset: 0')],
  ['カードのキーボードフォーカス', css.includes(':focus-within') && css.includes('outline-offset: 3px')],
  ['タッチ端末のホバー抑止', css.includes('@media (hover: none)')],
  ['将来実装カードを全面操作から除外', css.includes('.module-card:not(.is-disabled)')]
];
const failed = checks.filter(([, ok]) => !ok);
console.log(JSON.stringify({ status: failed.length ? 'failed' : 'passed', checkCount: checks.length, failed: failed.map(([name]) => name) }, null, 2));
process.exit(failed.length ? 1 : 0);
