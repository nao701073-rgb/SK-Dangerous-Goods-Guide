# SKDG v1.3.46 写真入力連携復元

v1.3.45では、重複した旧「写真から入力する」導線を削除する際、`details` 親要素ごと削除していました。
旧レイアウトではその`details`が写真入力本体を内包する場合があるため、写真入力UIまで消える可能性がありました。

v1.3.46では以下に変更します。

- `details > summary` が旧「写真から入力する」導線であるか判定
- 内部に `#v1PhotoStep` / `#photoInputPanel` / `#photoRecognitionPanel` / 写真入力ID群が存在する場合：
  - summaryだけを除外
  - 本体ノードを親へ移動（イベント・IDを保持）
  - 空になったdetailsだけ削除
- 写真入力本体を含まない旧ショートカットだけ削除

常時DOM監視は追加しません。DOMContentLoadedとloadの各1回だけ確認します。
