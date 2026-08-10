# SKDG v1.3.65 Part初期からのCTU外枠原因監査

## 遡及確認
- Part494 Core: CTU参考算出の初期実装。各機能は通常の `.panel` として独立。
- Part501: 「かんたん入力」「申請書」「写真」等のワークフロー構成を追加。
- Part551: `setupAssistCollapse()` が `#ctuExcelRoutePanel` と `#photoInputPanel` を `details.part551-assist-details` で外側から包む処理を追加。
- Part551 CSS: `details.part551-assist-details` 自体に border / border-radius / background を設定。
- 後年: Step1/2本体を独立カード化して本体にもborderを付与したため、Part551外枠と現行カード枠が二重化。
- v13: Step5の「①固縛材／②支保・あて材」を動的生成する旧処理が、現行の静的Step5構造と競合。

## v1.3.65の対処
1. `ctu-workflow-part551.js` を直接改修し、Step1/2を外側detailsで包まない。
2. 既に生成された `details.part551-assist-details` は中の実カードを残してunwrapする。
3. Part551旧3段階進捗・次へボタンを生成しない。
4. `v13-ctu.js` は現行 `#ctuStep5Panels` が存在する場合、旧 `v13ConditionCards` を生成しない。
5. `v1346` cleanupをExcel/写真双方のPart551 wrapperへ拡張。
6. 最終cleanupを追加し、遅延生成された旧wrapperも有限回除去。

計算式、航路・海域判定、Excel取込、写真処理、登録データ構造は変更していない。
