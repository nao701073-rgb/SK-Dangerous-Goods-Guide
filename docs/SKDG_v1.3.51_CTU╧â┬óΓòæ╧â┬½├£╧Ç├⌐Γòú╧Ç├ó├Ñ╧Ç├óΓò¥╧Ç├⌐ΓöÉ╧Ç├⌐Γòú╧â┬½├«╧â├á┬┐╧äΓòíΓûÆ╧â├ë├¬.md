# SKDG v1.3.51 CTU固定ステータス完全統合

## 対応内容
- `ctu-workflow-part553.js` が生成していた以下の重複UIを廃止。
  - 入力状況 `4 / 4` パネル (`part553Completion`)
  - `1 入力 / 2 算出 / 3 確認 / 4 登録` の旧進捗 (`part553Journey`)
  - 画面下部の旧「次へ」バー (`part553StickyNext`)
- `quickEntryPanel` 冒頭に残っていた旧説明文「条件を選ぶ → 必要事項を入力 → 結果を確認」を削除。
- 入力不足・確認事項・算出状態は `ctuStickyStatus` の追尾表示だけに一本化。
- 互換用CSSでも旧Part553 UIを非表示。
- 常時監視、setInterval、全画面MutationObserverは追加していない。

## 維持する機能
- 申請書・航路入力
- 写真撮影／アップロード／写真入力補助
- 固縛条件入力・詳細設定
- 参考算出・算出結果統合
- 登録済み案件の利用
- 申請番号管理への登録
