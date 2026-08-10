# SKDG v1.3.67 CTUコード露出・旧PART空枠根本修正

## 原因
固縛力参考算出の中核JavaScriptが約11万文字のインラインscriptとしてHTMLに埋め込まれており、過去PARTのHTML差し替え履歴と組み合わさることで、ブラウザが途中のJavaScriptを本文として扱う破損が発生していた。

## 修正
- 中核JavaScriptを `assets/js/ctu-securing-calculator-core-v1367.js` へ完全外部化。
- HTML本体には外部script参照のみを残し、JavaScriptソースが本文に露出する構造を廃止。
- Part551由来の旧detailsラッパーを最終cleanupでunwrap。
- 空の旧進捗・旧カード殻を最終cleanupでDOMから除去。
- 算出式、Excel取込、航路推定、全海域判定、登録データ構造は変更しない。
