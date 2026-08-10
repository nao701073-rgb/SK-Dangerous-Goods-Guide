# v1.3.36 申請番号管理ヘッダー初回描画固定

- `applications.html` のヘッダーへ first-paint critical CSS をインラインで追加。
- `position: sticky; top: 0; bottom: auto` をインライン `!important` で固定。
- 外部 `v1334-header-menu.css` に同一の保険ルールを追加。
- `v1334-header-menu.js` で申請番号管理のみ `history.scrollRestoration = manual` と初期 `scrollTo(0,0)` を実施。
- ヘッダーHTML自体は静的完成形のまま維持し、DOMContentLoaded後の再構築は行わない。
