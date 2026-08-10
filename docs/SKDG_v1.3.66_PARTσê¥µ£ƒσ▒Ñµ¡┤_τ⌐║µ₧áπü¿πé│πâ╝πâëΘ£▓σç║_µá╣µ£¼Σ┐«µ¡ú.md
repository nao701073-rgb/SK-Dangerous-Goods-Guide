# SKDG v1.3.66 PART初期履歴からの根本修正

## 原因1: Part 551由来の外側detailsラッパー
Part 551でStep1/Step2を `details.part551-assist-details` で包む処理が追加されていた。後の独立カード化・DOM移動と重なり、子要素移動後の空シェルが細い空枠として残る可能性があった。

対処:
- Part551 JSはStep1/Step2を包まない。
- 既存ラッパーはDOMからunwrapして削除。
- CSSでも `display: contents` とし、旧キャッシュが生成してもボックスを持たせない。
- Step1/Step2をmain直下の連続したcanonical要素として最終確定。

## 原因2: 報告書テンプレート内へscriptタグを誤挿入
旧修正のcleanup scriptタグが `openMslPointReport()` のテンプレートリテラル内に入り、HTML parserが外側scriptを途中終了していた。これにより後続JavaScriptが画面本文に露出し、後段cleanupの実行順も破損していた。

対処:
- 報告書テンプレート内のscriptタグを完全削除。
- cleanup scriptは実HTMLの最後、全legacy scriptの後だけに配置。
- 下部にJavaScriptソースが本文表示されない構造へ復旧。

計算ロジック、Excel取込、航路・海域推定、MSL算出ロジックは変更していない。
