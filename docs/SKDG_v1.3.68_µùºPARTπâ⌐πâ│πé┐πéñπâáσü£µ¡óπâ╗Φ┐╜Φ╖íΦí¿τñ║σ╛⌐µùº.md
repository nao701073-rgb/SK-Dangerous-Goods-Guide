# SKDG v1.3.68

## 根本原因
累積上書き運用では、更新ZIPに含まれなくなった初期PART由来のファイルが利用者PCに残ります。CTU画面HTMLがそれらを参照し続けていたため、`v1-ctu-simple.js` が旧Step 2/4カードを実行時生成し、旧CSSが空枠・二重枠を再発生させていました。

また、追跡表示は旧 `v1348-ctu-sticky-status.css` の読込整理時に `position: sticky` がcanonical CSSへ移植されておらず、固定追従しない状態でした。

## 対処
- CTUページから初期UI CSS（v1/v1.3系）参照を停止
- `v1-ctu-simple.js`、旧DOM再配置スクリプト v1356/v1357、旧v136フローの参照を停止
- Step 4（接触面）をHTMLに静的実装し機能を維持
- 追跡表示に `position: sticky; top: var(--sk38-header-height)` を復元
- 旧PARTラッパー/空シェルをDOMから最終除去
- Step 5は単独使用時1列全幅、併用時のみ2列

固縛力計算式、Excel取込、航路推定、全海域判定、登録データ構造は変更していません。
